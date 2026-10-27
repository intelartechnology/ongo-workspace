import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, ReceiptText, Wallet } from "lucide-react";
import ApiService from "../services/ApiService";
import MainLayout from "./MainLayout";
import Loading from "../components/Loading";
import { StatCard, cx } from "../components/ui";
import { notifier } from "../services/notifier";

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
}

interface Donnees {
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

    const charger = useCallback(
        async (adresse?: string) => {
            setChargement(true);
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
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {t.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-12 text-center text-slate-500">Aucune transaction.</td>
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
                                            </td>
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
