import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { HandCoins, PiggyBank, Users } from "lucide-react";
import ApiService from "../services/ApiService";
import MainLayout from "./MainLayout";
import Loading from "../components/Loading";
import { StatCard, cx } from "../components/ui";
import { ilYA } from "../functions/temps";
import { notifier } from "../services/notifier";

interface Props {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
    /** `debt` : les comptes à découvert ; `credit` : les comptes approvisionnés. */
    sens: "debt" | "credit";
}

interface Ligne {
    id: number;
    nom: string | null;
    prenom: string | null;
    telephone: string | null;
    role_id: number;
    balance: number;
    last_movement_at: string | null;
}

interface Donnees {
    totals: { accounts: number; amount: number };
    page: {
        data: Ligne[];
        links: { url: string | null; label: string; active: boolean }[];
        from: number | null;
        to: number | null;
        total: number;
        current_page: number;
        last_page: number;
    };
}

const ROLES: Record<number, string> = { 1: "Client", 2: "Chauffeur", 4: "Administrateur" };

const FILTRES = [
    { cle: "", libelle: "Tous" },
    { cle: "drivers", libelle: "Chauffeurs" },
    { cle: "clients", libelle: "Clients" },
];

const TEXTES = {
    debt: {
        titre: "Dettes chauffeurs / clients",
        sousTitre: "Les comptes à découvert : le plus souvent des chauffeurs qui ont encaissé en espèces la part d'Ongo.",
        compte: "Comptes à découvert",
        montant: "Total dû à Ongo",
        vide: "Aucun compte à découvert.",
    },
    credit: {
        titre: "Comptes approvisionnés",
        sousTitre: "Les comptes qui ont de l'argent chez Ongo : recharges, gains des chauffeurs, remboursements.",
        compte: "Comptes approvisionnés",
        montant: "Total détenu pour eux",
        vide: "Aucun compte approvisionné.",
    },
};

/**
 * Les soldes des comptes, d'un signe ou de l'autre.
 *
 * Le solde est calculé par le serveur (`v3/admin/finance/balances`) : la somme
 * des transactions vérifiées. Les comptes d'Ongo elle-même n'y figurent pas.
 * Une ligne ouvre l'historique des transactions du compte.
 */
export default function FinanceBalances({ onLogout, theme, toggleTheme, sens }: Props) {
    const navigate = useNavigate();
    const textes = TEXTES[sens];
    const [role, setRole] = useState("");
    const [recherche, setRecherche] = useState("");
    const [cherchee, setCherchee] = useState("");
    const [donnees, setDonnees] = useState<Donnees | null>(null);
    const [chargement, setChargement] = useState(true);

    const charger = useCallback(
        async (adresse?: string) => {
            setChargement(true);
            try {
                const { data } = adresse
                    ? await new ApiService().getData(adresse)
                    : await new ApiService().getData("v3/admin/finance/balances", { sens, role: role || undefined, q: cherchee || undefined });
                if (data.success) setDonnees(data.data);
                else toast.error(data.message || "Erreur lors du chargement");
            } catch {
                toast.error("Connexion au serveur impossible");
            } finally {
                setChargement(false);
            }
        },
        [sens, role, cherchee],
    );

    useEffect(() => {
        charger();
    }, [charger]);

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header>
                <div className="px-8 py-6 max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{textes.titre}</h1>
                    <p className="text-sm text-slate-500 mt-1">{textes.sousTitre}</p>
                </div>
            </header>

            <main className="px-8 pb-8 max-w-7xl mx-auto space-y-6">
                {donnees && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <StatCard label={textes.compte} value={donnees.totals.accounts.toLocaleString("fr-FR")} icon={Users} />
                        <StatCard
                            label={textes.montant}
                            value={`${Math.abs(donnees.totals.amount).toLocaleString("fr-FR")} FCFA`}
                            icon={sens === "debt" ? HandCoins : PiggyBank}
                            alert={sens === "debt" && donnees.totals.amount < 0}
                        />
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <div role="radiogroup" aria-label="Type de compte" className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
                        {FILTRES.map((f) => (
                            <button
                                key={f.cle}
                                role="radio"
                                aria-checked={f.cle === role}
                                onClick={() => setRole(f.cle)}
                                className={cx(
                                    "px-3 py-1.5 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors",
                                    f.cle === role ? "bg-primary text-white dark:bg-primary-container" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
                                )}
                            >
                                {f.libelle}
                            </button>
                        ))}
                    </div>
                    <input
                        value={recherche}
                        onChange={(e) => setRecherche(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && setCherchee(recherche.trim())}
                        placeholder="Nom ou téléphone, puis Entrée"
                        className="flex-1 min-w-[220px] px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                    {chargement && !donnees ? (
                        <Loading />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className={cx("w-full text-sm min-w-[720px]", chargement && "opacity-60")}>
                                <thead className="text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-800/40 text-left">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold">Compte</th>
                                        <th className="px-5 py-3 font-semibold">Type</th>
                                        <th className="px-5 py-3 font-semibold text-right">Solde</th>
                                        <th className="px-5 py-3 font-semibold">Dernier mouvement</th>
                                        <th className="px-5 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {donnees && donnees.page.data.length > 0 ? (
                                        donnees.page.data.map((l) => (
                                            <tr
                                                key={l.id}
                                                onClick={() => navigate(`/finance/accounts/${l.id}`)}
                                                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                            >
                                                <td className="px-5 py-3">
                                                    <p className="font-semibold text-slate-900 dark:text-white">{[l.nom, l.prenom].filter(Boolean).join(" ") || `Compte #${l.id}`}</p>
                                                    <p className="text-xs text-slate-500">{l.telephone ?? "—"}</p>
                                                </td>
                                                <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{ROLES[l.role_id] ?? "—"}</td>
                                                <td
                                                    className={cx(
                                                        "px-5 py-3 text-right tabular-nums font-semibold whitespace-nowrap",
                                                        l.balance < 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400",
                                                    )}
                                                >
                                                    {l.balance.toLocaleString("fr-FR")} <span className="text-xs font-normal text-slate-500">FCFA</span>
                                                </td>
                                                <td className="px-5 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{ilYA(l.last_movement_at)}</td>
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); notifier({ destinataires: [{ id: l.id, nom: [l.nom, l.prenom].filter(Boolean).join(" ") }] }); }} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap">Notifier</button>
                                                        <span className="text-xs font-medium text-primary dark:text-primary-fixed-dim whitespace-nowrap">Historique →</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-5 py-12 text-center text-slate-500">{textes.vide}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {donnees && donnees.page.last_page > 1 && (
                        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                            <p className="text-xs text-slate-500">
                                {donnees.page.from}–{donnees.page.to} sur {donnees.page.total}
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {donnees.page.links.map((lien, i) => (
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
                </div>
            </main>
        </MainLayout>
    );
}
