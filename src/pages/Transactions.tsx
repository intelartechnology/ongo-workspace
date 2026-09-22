import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";

/**
 * Le registre financier de la plateforme.
 *
 * Toutes les écritures, quel que soit le service qui les a produites :
 * paiements de course, places de covoiturage, locations, parts reversées,
 * commissions, recharges, retraits, transferts entre comptes. Le solde de
 * chacun se déduit d'elles seules — n'en montrer qu'une partie ne permettrait
 * d'expliquer aucun solde.
 */

interface Ecriture {
    id: number;
    transaction_id: string;
    amount: number;
    status: string;
    provider: string | null;
    description: string | null;
    verified_at: string | null;
    created_at: string | null;
    owner_id: number | null;
    owner_nom: string | null;
    owner_prenom: string | null;
    owner_telephone: string | null;
}

interface LienPagination {
    url: string | null;
    label: string;
    active: boolean;
}

interface Totaux {
    entrees: number;
    sorties: number;
    net: number;
    nombre: number;
}

interface TransactionsProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const SENS = [
    { valeur: "", libelle: "Tout" },
    { valeur: "entrees", libelle: "Entrées" },
    { valeur: "sorties", libelle: "Sorties" },
];

const STATUTS = [
    { valeur: "", libelle: "Tous les états" },
    { valeur: "verified", libelle: "Vérifiées" },
    { valeur: "pending", libelle: "En attente" },
];

export default function Transactions({ onLogout, theme, toggleTheme }: TransactionsProps) {
    const [ecritures, setEcritures] = useState<Ecriture[]>([]);
    const [pagination, setPagination] = useState<LienPagination[]>([]);
    const [totaux, setTotaux] = useState<Totaux | null>(null);
    const [chargement, setChargement] = useState<boolean>(true);

    const [sens, setSens] = useState<string>("");
    const [statut, setStatut] = useState<string>("verified");
    const [recherche, setRecherche] = useState<string>("");
    const [du, setDu] = useState<string>("");
    const [au, setAu] = useState<string>("");

    const api = new ApiService();

    const criteres = () => ({
        ...(sens ? { sens } : {}),
        ...(statut ? { statut } : {}),
        ...(recherche ? { q: recherche } : {}),
        ...(du ? { du } : {}),
        ...(au ? { au } : {}),
    });

    const charger = async (url?: string) => {
        setChargement(true);

        try {
            // Une page suivante arrive en URL absolue : on la suit telle quelle
            // plutôt que de reconstruire ses paramètres.
            const { data } = url
                ? await api.getDatawithPagination(url, true)
                : await api.getData("v3/admin/transactions", criteres());

            if (data.success) {
                setEcritures(data.data?.data ?? []);
                setPagination(data.data?.links ?? []);
            } else {
                Swal.fire({ icon: "warning", title: "Erreur", text: data.message });
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Serveur injoignable", text: String(erreur) });
        } finally {
            setChargement(false);
        }
    };

    /**
     * Les totaux portent sur le filtre, non sur la page : trente lignes ne
     * disent rien d'un mois d'activité.
     */
    const chargerTotaux = async () => {
        try {
            const { data } = await api.getData("v3/admin/transactions/totals", criteres());

            if (data.success) setTotaux(data.data);
        } catch (erreur) {
            setTotaux(null);
        }
    };

    useEffect(() => {
        charger();
        chargerTotaux();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sens, statut, du, au]);

    const appliquerRecherche = () => {
        charger();
        chargerTotaux();
    };

    const montant = (valeur: number) => `${Math.abs(valeur).toLocaleString("fr-FR")} F`;

    const date = (valeur: string | null) =>
        valeur
            ? new Date(valeur).toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  year: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
              })
            : "—";

    const proprietaire = (e: Ecriture) => {
        const nom = `${e.owner_prenom ?? ""} ${e.owner_nom ?? ""}`.trim();

        if (nom) return nom;

        return e.owner_id ? `#${e.owner_id}` : "Compte inconnu";
    };

    const tuile = (titre: string, valeur: string, ton: string, icone: string) => (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{titre}</span>
                <span className={`material-symbols-outlined text-[20px] ${ton}`}>{icone}</span>
            </div>
            <div className="text-2xl font-bold mt-2 text-slate-900 dark:text-white">{valeur}</div>
        </div>
    );

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-8 py-6 max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Transactions</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Toutes les écritures de la plateforme : courses, covoiturage, locations, commissions, recharges,
                        retraits et transferts.
                    </p>
                </div>
            </header>

            <div className="p-8 max-w-7xl mx-auto space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {tuile("Entrées", totaux ? montant(totaux.entrees) : "—", "text-emerald-500", "south_west")}
                    {tuile("Sorties", totaux ? montant(totaux.sorties) : "—", "text-red-500", "north_east")}
                    {tuile("Net", totaux ? montant(totaux.net) : "—", "text-[#137fec]", "account_balance")}
                    {tuile("Écritures", totaux ? totaux.nombre.toLocaleString("fr-FR") : "—", "text-slate-400", "receipt_long")}
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[260px]">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Libellé, référence, nom ou téléphone…"
                            value={recherche}
                            onChange={(e) => setRecherche(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === "Enter") appliquerRecherche();
                            }}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {SENS.map((item) => (
                            <button
                                key={item.valeur || "tout"}
                                onClick={() => setSens(item.valeur)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                    sens === item.valeur
                                        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                {item.libelle}
                            </button>
                        ))}
                    </div>

                    <select
                        value={statut}
                        onChange={(e) => setStatut(e.target.value)}
                        className="pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm cursor-pointer"
                    >
                        {STATUTS.map((item) => (
                            <option key={item.valeur || "tous"} value={item.valeur}>
                                {item.libelle}
                            </option>
                        ))}
                    </select>

                    <input
                        type="date"
                        value={du}
                        onChange={(e) => setDu(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                    />
                    <input
                        type="date"
                        value={au}
                        onChange={(e) => setAu(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                    />
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        {chargement ? (
                            <Loading />
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-slate-800">
                                        {["Date", "Compte", "Libellé", "Source", "État", "Montant"].map((titre) => (
                                            <th
                                                key={titre}
                                                className={`px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider ${
                                                    titre === "Montant" ? "text-right" : ""
                                                }`}
                                            >
                                                {titre}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {ecritures.length > 0 ? (
                                        ecritures.map((e) => {
                                            const sortie = e.amount < 0;

                                            return (
                                                <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                                                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                                                        {date(e.verified_at ?? e.created_at)}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm">
                                                        <div className="font-semibold">{proprietaire(e)}</div>
                                                        <div className="text-xs text-slate-500">{e.owner_telephone ?? ""}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm max-w-md">
                                                        <div className="truncate">{e.description || "—"}</div>
                                                        <div className="text-[11px] text-slate-400 truncate">{e.transaction_id}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">{e.provider ?? "—"}</td>
                                                    <td className="px-6 py-4">
                                                        <span
                                                            className={`px-2 py-1 rounded-lg border text-[11px] font-bold ${
                                                                e.status === "verified"
                                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                                            }`}
                                                        >
                                                            {e.status === "verified" ? "Vérifiée" : e.status}
                                                        </span>
                                                    </td>
                                                    <td
                                                        className={`px-6 py-4 text-sm font-bold text-right whitespace-nowrap ${
                                                            sortie ? "text-red-500" : "text-emerald-600"
                                                        }`}
                                                    >
                                                        {sortie ? "−" : "+"} {montant(e.amount)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                                                Aucune écriture pour ce filtre.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {pagination.length > 3 && (
                        <div className="flex flex-wrap items-center justify-center gap-1 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                            {pagination.map((lien, index) => (
                                <button
                                    key={index}
                                    disabled={!lien.url}
                                    onClick={() => lien.url && charger(lien.url)}
                                    className={`min-w-9 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                        lien.active
                                            ? "bg-[#137fec] text-white border-[#137fec]"
                                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 disabled:opacity-40"
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: lien.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
