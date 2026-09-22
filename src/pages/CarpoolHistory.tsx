import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";

/**
 * L'activité du covoiturage, en trois registres.
 *
 * Ce que les conducteurs publient, ce que les passagers demandent, et les
 * places retenues. Rien de tout cela n'était visible ailleurs que dans la base :
 * l'exploitation ne pouvait ni constater l'activité du service, ni retrouver un
 * trajet dont un client se plaignait.
 *
 * Lecture seule. Ce qui se décide — autoriser un covoitureur, arbitrer un
 * remboursement — a son propre écran.
 */

interface LienPagination {
    url: string | null;
    label: string;
    active: boolean;
}

type Onglet = "trips" | "requests" | "subscriptions";

interface CarpoolHistoryProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const ONGLETS: { cle: Onglet; libelle: string; icone: string }[] = [
    { cle: "trips", libelle: "Trajets publiés", icone: "directions_car" },
    { cle: "requests", libelle: "Demandes", icone: "hail" },
    { cle: "subscriptions", libelle: "Réservations", icone: "confirmation_number" },
];

/** Les filtres de chaque registre : ils ne se ressemblent pas. */
const FILTRES: Record<Onglet, { valeur: string; libelle: string }[]> = {
    trips: [
        { valeur: "", libelle: "Tous" },
        { valeur: "a_venir", libelle: "À venir" },
        { valeur: "passes", libelle: "Passés" },
        { valeur: "annules", libelle: "Annulés" },
    ],
    requests: [
        { valeur: "", libelle: "Toutes" },
        { valeur: "OUVERTE", libelle: "Ouvertes" },
        { valeur: "POURVUE", libelle: "Pourvues" },
        { valeur: "ANNULEE", libelle: "Annulées" },
    ],
    subscriptions: [
        { valeur: "", libelle: "Toutes" },
        { valeur: "payees", libelle: "Payées" },
        { valeur: "impayees", libelle: "Impayées" },
        { valeur: "soldees", libelle: "Soldées" },
        { valeur: "annulees", libelle: "Annulées" },
    ],
};

export default function CarpoolHistory({ onLogout, theme, toggleTheme }: CarpoolHistoryProps) {
    const [onglet, setOnglet] = useState<Onglet>("trips");
    const [filtre, setFiltre] = useState<string>("");
    const [recherche, setRecherche] = useState<string>("");
    const [lignes, setLignes] = useState<any[]>([]);
    const [pagination, setPagination] = useState<LienPagination[]>([]);
    const [chargement, setChargement] = useState<boolean>(true);

    const api = new ApiService();

    const charger = async (vue: Onglet, statut: string, q: string, url?: string) => {
        setChargement(true);

        try {
            // Une page suivante arrive en URL absolue : on la suit telle quelle
            // plutôt que de reconstruire ses paramètres.
            const { data } = url
                ? await api.getDatawithPagination(url, true)
                : await api.getData(`v3/admin/carpool/${vue}`, {
                      ...(statut ? { statut } : {}),
                      ...(q ? { q } : {}),
                  });

            if (data.success) {
                setLignes(data.data?.data ?? []);
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

    useEffect(() => {
        setFiltre("");
        setRecherche("");
        charger(onglet, "", "");
    }, [onglet]);

    const date = (valeur: string | null | undefined, heure?: string | null) => {
        if (!valeur) return "—";

        const jour = new Date(valeur).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

        return heure ? `${jour} · ${String(heure).slice(0, 5)}` : jour;
    };

    const montant = (valeur: number | null | undefined) =>
        valeur === null || valeur === undefined ? "—" : `${Number(valeur).toLocaleString("fr-FR")} F`;

    const pastille = (texte: string, ton: "vert" | "rouge" | "ambre" | "gris") => {
        const tons = {
            vert: "bg-emerald-50 text-emerald-700 border-emerald-200",
            rouge: "bg-red-50 text-red-600 border-red-200",
            ambre: "bg-amber-50 text-amber-700 border-amber-200",
            gris: "bg-slate-50 text-slate-600 border-slate-200",
        };

        return <span className={`px-2 py-1 rounded-lg border text-[11px] font-bold ${tons[ton]}`}>{texte}</span>;
    };

    /** Les colonnes, propres à chaque registre. */
    const entetes: Record<Onglet, string[]> = {
        trips: ["ID", "Trajet", "Départ", "Conducteur", "Places", "Prix", "État"],
        requests: ["ID", "Trajet", "Départ", "Passager", "Places", "Prix", "État"],
        subscriptions: ["ID", "Trajet", "Départ", "Passager", "Places", "Montant", "État"],
    };

    const ligneTrajet = (t: any) => (
        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
            <td className="px-6 py-4 text-sm font-semibold text-slate-400">#{t.id}</td>
            <td className="px-6 py-4 text-sm font-bold">{t.lieu_depart} → {t.lieu_arrive}</td>
            <td className="px-6 py-4 text-sm">{date(t.date_depart, t.heure_depart)}</td>
            <td className="px-6 py-4 text-sm">
                {t.vehicule?.chauffeur ? `${t.vehicule.chauffeur.prenom ?? ""} ${t.vehicule.chauffeur.nom ?? ""}` : "—"}
                <div className="text-xs text-slate-500">{t.vehicule?.matricule ?? ""}</div>
            </td>
            <td className="px-6 py-4 text-sm">
                {t.nbre_place - (t.nbre_place_restant ?? 0)} / {t.nbre_place}
            </td>
            <td className="px-6 py-4 text-sm font-semibold">{montant(t.prix)}</td>
            <td className="px-6 py-4">
                {t.canceled_at
                    ? pastille("Annulé", "rouge")
                    : t.suspended_at
                    ? pastille("Suspendu", "ambre")
                    : pastille("En ligne", "vert")}
            </td>
        </tr>
    );

    const ligneDemande = (d: any) => (
        <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
            <td className="px-6 py-4 text-sm font-semibold text-slate-400">#{d.id}</td>
            <td className="px-6 py-4 text-sm font-bold">{d.lieu_depart} → {d.lieu_arrive}</td>
            <td className="px-6 py-4 text-sm">{date(d.date_depart, d.heure_depart)}</td>
            <td className="px-6 py-4 text-sm">
                {d.requester ? `${d.requester.prenom ?? ""} ${d.requester.nom ?? ""}` : "—"}
                <div className="text-xs text-slate-500">
                    {d.offers?.length ? `${d.offers.length} proposition(s)` : "aucune proposition"}
                </div>
            </td>
            <td className="px-6 py-4 text-sm">{d.nbre_place}</td>
            <td className="px-6 py-4 text-sm font-semibold">{montant(d.prix)}</td>
            <td className="px-6 py-4">
                {d.statut === "POURVUE"
                    ? pastille("Pourvue", "vert")
                    : d.statut === "ANNULEE"
                    ? pastille("Annulée", "rouge")
                    : d.statut === "OUVERTE"
                    ? pastille("Ouverte", "ambre")
                    : pastille(d.statut ?? "—", "gris")}
            </td>
        </tr>
    );

    const lignePlace = (p: any) => (
        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
            <td className="px-6 py-4 text-sm font-semibold text-slate-400">#{p.id}</td>
            <td className="px-6 py-4 text-sm font-bold">
                {p.carsharing ? `${p.carsharing.lieu_depart} → ${p.carsharing.lieu_arrive}` : "—"}
            </td>
            <td className="px-6 py-4 text-sm">{date(p.carsharing?.date_depart, p.carsharing?.heure_depart)}</td>
            <td className="px-6 py-4 text-sm">
                {p.passagers?.[0] ? `${p.passagers[0].prenom ?? ""} ${p.passagers[0].nom ?? ""}` : `#${p.subscriber_id}`}
            </td>
            <td className="px-6 py-4 text-sm">{p.nbre_place}</td>
            <td className="px-6 py-4 text-sm font-semibold">{montant(p.subscription_amount)}</td>
            <td className="px-6 py-4">
                <div className="flex flex-wrap items-center gap-1">
                    {p.canceled_at
                        ? pastille("Annulée", "rouge")
                        : p.is_paid
                        ? pastille("Payée", "vert")
                        : pastille("Impayée", "ambre")}
                    {p.settle_at && pastille(p.settle_mode === "CASH" ? "Soldée espèces" : "Soldée", "gris")}
                </div>
            </td>
        </tr>
    );

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-8 py-6 max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Covoiturage</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Les trajets publiés, les demandes des passagers et les places retenues.
                    </p>
                </div>
            </header>

            <div className="p-8 max-w-7xl mx-auto space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                    {ONGLETS.map((item) => (
                        <button
                            key={item.cle}
                            onClick={() => setOnglet(item.cle)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                                onglet === item.cle
                                    ? "bg-[#137fec] text-white border-[#137fec]"
                                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                            }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">{item.icone}</span>
                            {item.libelle}
                        </button>
                    ))}
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
                    {onglet !== "subscriptions" && (
                        <div className="relative flex-1 min-w-[260px]">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input
                                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Rechercher un lieu de départ ou d'arrivée…"
                                value={recherche}
                                onChange={(e) => setRecherche(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === "Enter") charger(onglet, filtre, recherche);
                                }}
                            />
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                        {FILTRES[onglet].map((item) => (
                            <button
                                key={item.valeur || "tous"}
                                onClick={() => {
                                    setFiltre(item.valeur);
                                    charger(onglet, item.valeur, recherche);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                    filtre === item.valeur
                                        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                {item.libelle}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        {chargement ? (
                            <Loading />
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-slate-800">
                                        {entetes[onglet].map((titre) => (
                                            <th key={titre} className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                {titre}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {lignes.length > 0 ? (
                                        lignes.map((ligne) =>
                                            onglet === "trips"
                                                ? ligneTrajet(ligne)
                                                : onglet === "requests"
                                                ? ligneDemande(ligne)
                                                : lignePlace(ligne)
                                        )
                                    ) : (
                                        <tr>
                                            <td colSpan={entetes[onglet].length} className="px-6 py-12 text-center text-sm text-slate-500">
                                                Rien à afficher pour ce filtre.
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
                                    onClick={() => lien.url && charger(onglet, filtre, recherche, lien.url)}
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
