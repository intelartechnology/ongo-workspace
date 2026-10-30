import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { ArrowLeft, ReceiptText, Wallet } from "lucide-react";
import ApiService from "../services/ApiService";
import MainLayout from "./MainLayout";
import Loading from "../components/Loading";
import { StatCard, ActionsMenu, cx, type ActionItem } from "../components/ui";
import { notifier } from "../services/notifier";
import { confirmerParNumero } from "../services/confirmerParNumero";

interface Props {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

interface Transaction {
    id: number;
    transaction_id: string;
    amount: number;
    status: string;
    provider: string | null;
    service: string | null;
    description: string | null;
    created_at: string;
    /** Vérifiée : elle fait le solde. Les autres s'affichent, sans compter. */
    counts: boolean;
    /** La dernière correction faite par l'administration, s'il y en a une. */
    correction?: { action: string; motif: string; le: string } | null;
    /** Dévalidée par un administrateur : elle peut être revalidée. */
    revalidable?: boolean;
    /** Moitié d'un transfert entre comptes : l'autre moitié suit. */
    transfert?: boolean;
}

/** Les mêmes gestes, et les mêmes mots, que la liste des transactions. */
const ACTIONS = {
    devalider: {
        titre: "Dévalider la transaction ?",
        texte: "Elle redevient « en attente » et sort du solde du compte. Elle pourra être revalidée.",
        bouton: "Dévalider",
        couleur: "#d97706",
    },
    annuler: {
        titre: "Annuler la transaction ?",
        texte: "Elle passe « annulée », définitivement, et sort du solde du compte. Elle n'est pas supprimée : elle reste visible.",
        bouton: "Annuler la transaction",
        couleur: "#dc2626",
    },
    revalider: {
        titre: "Revalider la transaction ?",
        texte: "Elle retrouve son état vérifié et sa date de validation d'origine, et compte de nouveau dans le solde.",
        bouton: "Revalider",
        couleur: "#10377b",
    },
} as const;

interface Donnees {
    /** Le compte connecté peut-il corriger ? Sinon, l'écran ne propose rien. */
    peut_corriger?: boolean;
    account: { id: number; nom: string | null; prenom: string | null; telephone: string | null; email: string | null; role_id: number; balance: number };
    transactions: {
        data: Transaction[];
        links: { url: string | null; label: string; active: boolean }[];
        total: number;
        last_page: number;
        from: number | null;
        to: number | null;
    };
}

const ROLES: Record<number, string> = { 1: "Client", 2: "Chauffeur", 4: "Administrateur" };

const STATUTS: Record<string, { texte: string; ton: string }> = {
    verified: { texte: "Vérifiée", ton: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
    pending: { texte: "En attente", ton: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
    canceled: { texte: "Annulée", ton: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
    // L'orthographe qu'écrit l'annulation par l'administration.
    cancelled: { texte: "Annulée", ton: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" },
};

const quand = (iso: string) =>
    new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(
        new Date(iso.replace(" ", "T")),
    );

/** L'historique des transactions d'un compte, et le solde qu'elles font. */
export default function FinanceAccount({ onLogout, theme, toggleTheme }: Props) {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [donnees, setDonnees] = useState<Donnees | null>(null);
    const [introuvable, setIntrouvable] = useState(false);
    const [chargement, setChargement] = useState(true);
    // La page affichée : une correction la relit, sans revenir à la première.
    const [page, setPage] = useState<string | undefined>(undefined);

    const charger = useCallback(
        async (adresse?: string) => {
            setChargement(true);
            setPage(adresse);
            try {
                const { data } = await new ApiService().getData(adresse ?? `v3/admin/finance/accounts/${id}/transactions`);
                if (data.success) setDonnees(data.data);
                else setIntrouvable(true);
            } catch {
                toast.error("Impossible de charger l'historique");
            } finally {
                setChargement(false);
            }
        },
        [id],
    );

    useEffect(() => {
        charger();
    }, [charger]);

    /**
     * Corriger une écriture du compte : dévalider, annuler ou revalider.
     *
     * La même porte que la liste des transactions — le serveur applique les
     * mêmes règles et tient le même journal. Le motif est obligatoire : c'est la
     * seule explication, plus tard, d'un solde qui a bougé.
     */
    const corriger = async (tr: Transaction, action: keyof typeof ACTIONS) => {
        const a = ACTIONS[action];
        const montant = `${tr.amount < 0 ? "−" : "+"} ${Math.abs(tr.amount).toLocaleString("fr-FR")} F`;
        const { value: motif, isConfirmed } = await Swal.fire({
            title: a.titre,
            html: `<b>${montant}</b> · ${tr.description ?? ""}<br><br>${a.texte}${tr.transfert ? "<br><br><b>C'est un transfert entre deux comptes : l'autre écriture sera corrigée aussi.</b>" : ""}`,
            input: "textarea",
            inputLabel: "Motif (obligatoire)",
            inputPlaceholder: "Ex. Retrait annulé par Dohone resté débité, paiement en double…",
            inputValidator: (v) => (!v || v.trim().length < 5 ? "Indiquez un motif d'au moins 5 caractères" : undefined),
            icon: action === "revalider" ? "question" : "warning",
            showCancelButton: true,
            confirmButtonText: a.bouton,
            cancelButtonText: "Fermer",
            confirmButtonColor: a.couleur,
        });
        if (!isConfirmed || !motif) return;

        // Une annulation se confirme par le numéro de la transaction.
        const confirmation = action === "annuler" ? await confirmerParNumero(tr.transaction_id) : undefined;
        if (confirmation === null) return;

        try {
            const { data } = await new ApiService().postData(`v3/admin/transactions/${tr.transaction_id}/correction`, { action, motif: String(motif).trim(), ...(confirmation ? { confirmation } : {}) });
            if (data.success) {
                toast.success(data.message);
                charger(page);
            } else {
                toast.error(data.message || "Correction refusée");
            }
        } catch (err) {
            const reponse = (err as { response?: { data?: { message?: string } } })?.response;
            toast.error(reponse?.data?.message || "Connexion au serveur impossible");
        }
    };

    const actions = (tr: Transaction): ActionItem[] => {
        if (!donnees?.peut_corriger) return [];

        const annulee = tr.status === "cancelled" || tr.status === "canceled";

        return [
            ...(tr.status === "verified" ? [{ label: "Dévalider", icon: "undo", onClick: () => corriger(tr, "devalider") }] : []),
            ...(tr.revalidable ? [{ label: "Revalider", icon: "task_alt", onClick: () => corriger(tr, "revalider") }] : []),
            ...(!annulee ? [{ label: "Annuler la transaction", icon: "block", danger: true, onClick: () => corriger(tr, "annuler") }] : []),
        ];
    };

    if (introuvable) {
        return (
            <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
                <div className="p-8 text-center text-slate-500">Compte introuvable.</div>
            </MainLayout>
        );
    }

    if (!donnees) {
        return (
            <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
                <div className="flex h-[60vh] items-center justify-center">
                    <Loading />
                </div>
            </MainLayout>
        );
    }

    const { account: a, transactions: t } = donnees;

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header>
                <div className="px-8 py-6 max-w-7xl mx-auto flex items-start gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        title="Retour"
                        className="mt-1 size-9 grid place-items-center rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        <ArrowLeft className="size-4" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {[a.nom, a.prenom].filter(Boolean).join(" ") || `Compte #${a.id}`}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">{[ROLES[a.role_id], a.telephone, a.email].filter(Boolean).join(" · ")}</p>
                    </div>
                    <div className="ml-auto shrink-0">
                        <button type="button" onClick={() => notifier({ destinataires: [{ id: a.id, nom: [a.nom, a.prenom].filter(Boolean).join(" ") }] })} className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Notifier</button>
                    </div>
                </div>
            </header>

            <main className="px-8 pb-8 max-w-7xl mx-auto space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <StatCard
                        label="Solde du compte"
                        value={`${a.balance.toLocaleString("fr-FR")} FCFA`}
                        icon={Wallet}
                        alert={a.balance < 0}
                        note={a.balance < 0 ? "Doit à Ongo" : a.balance > 0 ? "Détenu par Ongo pour ce compte" : "À zéro"}
                    />
                    <StatCard label="Transactions" value={t.total.toLocaleString("fr-FR")} icon={ReceiptText} note="Toutes, en attente comprises" />
                </div>

                <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className={cx("w-full text-sm min-w-[760px]", chargement && "opacity-60")}>
                            <thead className="text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-800/40 text-left">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">Date</th>
                                    <th className="px-5 py-3 font-semibold">Libellé</th>
                                    <th className="px-5 py-3 font-semibold">Service</th>
                                    <th className="px-5 py-3 font-semibold text-right">Montant</th>
                                    <th className="px-5 py-3 font-semibold">État</th>
                                    {donnees.peut_corriger && <th className="px-5 py-3 font-semibold text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {t.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={donnees.peut_corriger ? 6 : 5} className="px-5 py-12 text-center text-slate-500">Aucune transaction.</td>
                                    </tr>
                                ) : (
                                    t.data.map((tr) => (
                                        <tr key={tr.id} className={tr.counts ? "" : "opacity-60"}>
                                            <td className="px-5 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{quand(tr.created_at)}</td>
                                            <td className="px-5 py-3 text-slate-800 dark:text-slate-200">
                                                <p className="max-w-[380px] truncate">{tr.description || "—"}</p>
                                                <p className="text-xs text-slate-500 font-mono">{tr.provider ?? ""}</p>
                                            </td>
                                            <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{tr.service ?? "—"}</td>
                                            <td
                                                className={cx(
                                                    "px-5 py-3 text-right tabular-nums font-semibold whitespace-nowrap",
                                                    tr.amount < 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400",
                                                )}
                                            >
                                                {tr.amount > 0 ? "+" : ""}
                                                {tr.amount.toLocaleString("fr-FR")} <span className="text-xs font-normal text-slate-500">FCFA</span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={cx("px-2 py-0.5 rounded-full text-xs font-medium", STATUTS[tr.status]?.ton ?? STATUTS.canceled.ton)}>
                                                    {STATUTS[tr.status]?.texte ?? tr.status}
                                                </span>
                                                {/* Pourquoi elle a bougé : la dernière correction et son motif. */}
                                                {tr.correction && (
                                                    <p className="mt-1 text-[11px] text-slate-400 max-w-[200px] truncate" title={tr.correction.motif}>
                                                        {tr.correction.action === "devalider" ? "Dévalidée" : tr.correction.action === "annuler" ? "Annulée" : "Revalidée"} : {tr.correction.motif}
                                                    </p>
                                                )}
                                            </td>
                                            {donnees.peut_corriger && (
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex justify-end">
                                                        {actions(tr).length > 0 && <ActionsMenu items={actions(tr)} />}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {t.last_page > 1 && (
                        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                            <p className="text-xs text-slate-500">
                                {t.from}–{t.to} sur {t.total}
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {t.links.map((lien, i) => (
                                    <button
                                        key={i}
                                        disabled={!lien.url || lien.active}
                                        onClick={() => lien.url && charger(lien.url)}
                                        className={cx(
                                            "px-3 py-1.5 rounded-md text-xs font-medium",
                                            lien.active ? "bg-primary text-white dark:bg-primary-container" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
                                            !lien.url && "opacity-40 cursor-not-allowed",
                                        )}
                                        dangerouslySetInnerHTML={{ __html: lien.label.replace("Previous", "Précédent").replace("Next", "Suivant") }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                <p className="text-[12px] text-slate-500">Seules les transactions vérifiées font le solde ; les autres apparaissent grisées.</p>
            </main>
        </MainLayout>
    );
}
