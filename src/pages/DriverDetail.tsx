import type React from "react";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";
import MainLayout from "./MainLayout";
import Helpers from "../functions/helpers";
import { SearchBar } from "../components/ui";
import { Avatar } from "../components/ui";
import { notifier } from "../services/notifier";
import DriverStats from "./components/DriverStats";
import Trajet from "./components/Trajet";

/** Les statuts d'une course, tels que la base les écrit, en clair et en couleur. */
const STATUTS: Record<string, { libelle: string; classe: string }> = {
    "TERMINEE": { libelle: "Terminée", classe: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
    "EN COURS": { libelle: "En cours", classe: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
    "TRANSPORTEE": { libelle: "Client à bord", classe: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
    "RESERVEE": { libelle: "Réservée", classe: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
    "EN ATTENTE": { libelle: "En attente", classe: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
    "ANNULEE": { libelle: "Annulée", classe: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
    "ANNULEE AUTO": { libelle: "Annulée (auto)", classe: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
    "NO DRIVER FOUND": { libelle: "Sans chauffeur", classe: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
    // Une proposition qu'il n'a pas prise : ce que le chauffeur en a fait.
    "MANQUEE": { libelle: "Manquée", classe: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
    "REFUSEE": { libelle: "Refusée", classe: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200" },
};

/** Ce qu'est devenue une course qu'il n'a pas prise. */
const devenir = (s: string | null) =>
    !s ? null : s === "TERMINEE" ? "prise par un autre" : s === "NO DRIVER FOUND" || s.startsWith("ANNULEE") ? "perdue" : `course ${statut(s).libelle.toLowerCase()}`;

const statut = (s: string) => STATUTS[s] ?? { libelle: s || "—", classe: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" };

const dateHeure = (iso?: string | null) =>
    iso ? new Date(iso.replace(" ", "T")).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

interface DriverDetailProps {
    onLogout?: () => void;
    theme?: 'light' | 'dark';
    toggleTheme?: () => void;
}

export default function DriverDetail({ onLogout = () => {}, theme = 'light', toggleTheme = () => {} }: DriverDetailProps) {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    // Les statistiques d'abord : c'est ce qu'on vient chercher sur un chauffeur.
    const [activeTab, setActiveTab] = useState('stats');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Les transactions du compte, chargées à l'ouverture de leur onglet.
    const [transactions, setTransactions] = useState<any | null>(null);
    const [chargementTransactions, setChargementTransactions] = useState(false);

    const Api = new ApiService();
    const helpers = new Helpers();

    const fetchData = async (url?: string) => {
        setLoading(true);
        try {
            let fetchUrl = url || `dashboard/detail/${id}`;
            
            // Append filters if it's the initial call (not from pagination link which already has them)
            if (!url) {
                const params = new URLSearchParams();
                if (searchQuery) params.append('query', searchQuery);
                if (statusFilter) params.append('status', statusFilter);
                const queryStr = params.toString();
                if (queryStr) fetchUrl += `?${queryStr}`;
            }
            
            const response = await Api.getData(fetchUrl);
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching driver details:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!loading) fetchData(); // Refetch when filter changes
    }, [statusFilter]);

    useEffect(() => {
        fetchData();
        setTransactions(null);
    }, [id]);

    const chargerTransactions = async (url?: string) => {
        setChargementTransactions(true);
        try {
            const { data: reponse } = url
                ? await Api.getDatawithPagination(url, true)
                : await Api.getData(`v3/admin/finance/accounts/${id}/transactions`);
            if (reponse.success) setTransactions(reponse.data);
        } catch (error) {
            console.error("Transactions du chauffeur :", error);
        } finally {
            setChargementTransactions(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'transactions' && transactions === null) chargerTransactions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // Le chargement plein écran seulement la première fois : un filtre ne
    // doit pas faire disparaître la page.
    if (loading && !data) return <Loading />;
    if (!data) return <div>Chauffeur non trouvé</div>;

    const { driver, stats, recent_races } = data;
    const vehicules: any[] = driver.vehicules ?? [];
    const enService = vehicules.some((v) => Number(v.is_online));

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="p-8 max-w-7xl mx-auto w-full font-display">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors font-medium"
                >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    Retour à la liste
                </button>

                {/* Profile Overview */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-primary/5 mb-8 flex flex-wrap gap-6 items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="size-24 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden border-2 border-primary">
                            <Avatar photo={driver.photo} nom={driver.nom || driver.prenom} alt="Photo du chauffeur" className="text-4xl" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                {/* Le seul état réel du chauffeur : en service ou non, selon
                                    l'interrupteur de son application (`vehicules.is_online`). */}
                                <span
                                    title={enService ? "En service" : "Hors service"}
                                    aria-label={enService ? "En service" : "Hors service"}
                                    className={`size-3 shrink-0 rounded-full ${enService ? "bg-emerald-500 ring-4 ring-emerald-500/20" : "bg-slate-300 dark:bg-slate-600"}`}
                                />
                                <h3 className="text-2xl font-bold">{helpers.capitalizeFirstLetter(driver.nom + " " + driver.prenom)}</h3>
                                <button type="button" onClick={() => notifier({ destinataires: [{ id: driver.id, nom: [driver.nom, driver.prenom].filter(Boolean).join(" ") }] })} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap">Notifier</button>
                            </div>
                            <p className="text-slate-500 text-sm">ID Chauffeur: #{driver.id} • Inscrit depuis le {new Date(driver.created_at).toLocaleDateString()}</p>
                            <div className="flex gap-4 mt-3">
                                <div className="flex items-center gap-1 text-primary text-sm font-medium">
                                    <span className="material-symbols-outlined text-lg">star</span>
                                    0.0 (0 notes)
                                </div>
                                <div className="flex items-center gap-1 text-slate-500 text-sm">
                                    <span className="material-symbols-outlined text-lg">directions_car</span>
                                    {driver.vehicules?.[0]?.modele || 'N/A'} ({driver.vehicules?.[0]?.matricule || 'N/A'})
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => {
                                if (driver.vehicules && driver.vehicules.length > 0) {
                                    const vehicle = driver.vehicules[0];
                                    sessionStorage.setItem(`vehicle_edit_${vehicle.id}`, JSON.stringify(vehicle));
                                    navigate(`/vehicles/edit/${vehicle.id}`);
                                }
                            }}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-xl">edit</span>
                            Modifier
                        </button>
                        <button className="px-4 py-2 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2">
                            <span className="material-symbols-outlined text-xl">block</span>
                            Suspendre
                        </button>
                    </div>
                </div>

                {/* Tabbed Interface */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-primary/5 overflow-hidden">
                    <div className="border-b border-primary/10 flex px-6 overflow-x-auto">
                        {([
                            ['stats', 'Statistiques'],
                            ['courses', 'Courses'],
                            ['transactions', 'Transactions'],
                            ['balance', 'Balance'],
                            ['details', 'Détails'],
                        ] as const).map(([cle, libelle]) => (
                            <button
                                key={cle}
                                onClick={() => setActiveTab(cle)}
                                className={`px-6 py-4 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === cle ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-primary'}`}
                            >
                                {libelle}
                            </button>
                        ))}
                    </div>

                    <div className="p-8">
                        {activeTab === 'details' && (
                            <div className="space-y-10">
                                {/* Lui et son véhicule, côte à côte ; la position en dessous. */}
                                {vehicules.length === 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                        <InfosPersonnelles driver={driver} />
                                        <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center text-sm text-slate-500 self-start">
                                            Aucun véhicule rattaché à ce chauffeur.
                                        </div>
                                    </div>
                                )}
                                {vehicules.map((v: any, rang: number) => (
                                    <div key={v.id} className={`space-y-10 ${rang > 0 ? 'pt-10 border-t border-primary/10' : ''}`}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                            {rang === 0 ? <InfosPersonnelles driver={driver} /> : <div className="hidden md:block" />}
                                            <FicheVehicule v={v} />
                                        </div>
                                        <PositionGps v={v} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'stats' && id && <DriverStats driverId={id} theme={theme} />}

                        {activeTab === 'courses' && (
                            <div className="space-y-6">
                                {/* Search and Filter Header */}
                                <div className="flex flex-wrap gap-4 items-center justify-between pb-2">
                                    <SearchBar
                                        value={searchQuery}
                                        onChange={setSearchQuery}
                                        onSearch={fetchData}
                                        placeholder="Rechercher par Trip ID, départ ou arrivée..."
                                        minWidth={300}
                                    />
                                    <div className="flex gap-3">
                                        <select 
                                            value={statusFilter}
                                            onChange={(e) => {
                                                setStatusFilter(e.target.value);
                                                // We'll use useEffect to trigger fetch or just do it here
                                            }}
                                            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                        >
                                            <option value="">Tous les statuts</option>
                                            <option value="TERMINEE">Terminées</option>
                                            <option value="EN_COURS">En cours ou réservées</option>
                                            <option value="EN_ATTENTE">En attente</option>
                                            <option value="ANNULEE">Annulées</option>
                                            <option value="MANQUEE">Manquées</option>
                                            <option value="REFUSEE">Refusées</option>
                                        </select>
                                        <button 
                                            onClick={() => fetchData()}
                                            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 dark:bg-primary-container dark:hover:bg-primary-container/90 transition-colors disabled:opacity-40 flex items-center gap-2"
                                        >
                                            Filtrer
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="text-xs text-slate-400 uppercase tracking-widest border-b border-primary/10">
                                            <tr>
                                                <th className="pb-3 pr-4 font-bold">Trip ID</th>
                                                <th className="pb-3 pr-4 font-bold">Date</th>
                                                <th className="pb-3 pr-4 font-bold">Client</th>
                                                <th className="pb-3 pr-4 font-bold">Trajet</th>
                                                <th className="pb-3 pr-4 font-bold">Montant</th>
                                                <th className="pb-3 font-bold text-right">Statut</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {recent_races.data.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="py-10 text-center text-slate-500">Aucune course pour ce filtre.</td>
                                                </tr>
                                            )}
                                            {recent_races.data.map((race: any) => (
                                                <tr key={race.id} className="border-t border-primary/5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                    <td className="py-4 pr-4 font-medium whitespace-nowrap">
                                                        {race.trip_id}
                                                        {race.is_delivery && <span className="ml-1.5 text-[10px] font-bold uppercase text-slate-400">Livraison</span>}
                                                    </td>
                                                    <td className="py-4 pr-4 text-slate-500 whitespace-nowrap">{race.date}</td>
                                                    <td className="py-4 pr-4 text-slate-700 dark:text-slate-300">{race.client || '—'}</td>
                                                    <td className="py-4 pr-4">
                                                        <Trajet depart={race.departure} arrivee={race.arrival} largeur="max-w-[260px]" />
                                                    </td>
                                                    {/* Une course manquée ou refusée : ce qu'elle valait, en gris. */}
                                                    <td className={`py-4 pr-4 font-bold whitespace-nowrap ${race.outcome !== null && race.outcome !== undefined ? 'text-slate-400' : ''}`}>
                                                        {race.amount.toLocaleString('fr-FR')} F
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${statut(race.status).classe}`}>
                                                            {statut(race.status).libelle}
                                                        </span>
                                                        {(race.reason || race.outcome) && (
                                                            <p className="mt-1 text-[11px] text-slate-400 whitespace-nowrap">
                                                                {[race.reason, devenir(race.outcome)].filter(Boolean).join(' · ')}
                                                            </p>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Controls */}
                                {recent_races.links && recent_races.links.length > 3 && (
                                    <div className="flex items-center justify-between pt-4 border-t border-primary/5">
                                        <p className="text-xs text-slate-500">
                                            Affichage de {recent_races.from} à {recent_races.to} sur {recent_races.total} courses
                                        </p>
                                        <div className="flex gap-2">
                                            {recent_races.links.map((link: any, idx: number) => {
                                                const isPrev = link.label.includes('Previous');
                                                const isNext = link.label.includes('Next');
                                                
                                                if (!link.url && !link.active) return null;

                                                return (
                                                    <button
                                                        key={idx}
                                                        disabled={!link.url}
                                                        onClick={() => link.url && fetchData(link.url.split('/api/')[1])}
                                                        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
 link.active 
 ? 'bg-primary text-white dark:bg-primary-container' 
 : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10 disabled:opacity-50'
 }`}
                                                    >
                                                        {isPrev ? 'Précédent' : isNext ? 'Suivant' : link.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'transactions' && (
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-sm text-slate-500">
                                        Toutes les écritures de son wallet. Seules les écritures vérifiées comptent dans le solde.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/finance/accounts/${id}`)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    >
                                        Ouvrir dans Finance
                                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                    </button>
                                </div>

                                {chargementTransactions && !transactions ? (
                                    <Loading />
                                ) : !transactions ? (
                                    <p className="py-10 text-center text-sm text-slate-500">Les transactions n'ont pas pu être chargées.</p>
                                ) : (
                                    <>
                                        <div className={`overflow-x-auto transition-opacity ${chargementTransactions ? 'opacity-60' : ''}`}>
                                            <table className="w-full text-left">
                                                <thead className="text-xs text-slate-400 uppercase tracking-widest border-b border-primary/10">
                                                    <tr>
                                                        <th className="pb-3 pr-4 font-bold">Date</th>
                                                        <th className="pb-3 pr-4 font-bold">Libellé</th>
                                                        <th className="pb-3 pr-4 font-bold">Source</th>
                                                        <th className="pb-3 pr-4 font-bold">État</th>
                                                        <th className="pb-3 font-bold text-right">Montant</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-sm">
                                                    {transactions.transactions.data.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="py-10 text-center text-slate-500">Aucune transaction sur ce compte.</td>
                                                        </tr>
                                                    )}
                                                    {transactions.transactions.data.map((t: any) => {
                                                        const sortie = t.amount < 0;
                                                        return (
                                                            <tr key={t.id} className="border-t border-primary/5">
                                                                <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">{dateHeure(t.verified_at ?? t.created_at)}</td>
                                                                <td className="py-3 pr-4 max-w-md">
                                                                    <div className="truncate text-slate-800 dark:text-slate-200">{t.description || '—'}</div>
                                                                    <div className="text-[11px] text-slate-400 truncate">{t.transaction_id}</div>
                                                                </td>
                                                                <td className="py-3 pr-4 text-slate-500">{t.provider || t.service || '—'}</td>
                                                                <td className="py-3 pr-4">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${t.counts ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                                                                        {t.counts ? 'Vérifiée' : t.status === 'pending' ? 'En attente' : t.status}
                                                                    </span>
                                                                </td>
                                                                <td className={`py-3 text-right font-bold whitespace-nowrap tabular-nums ${sortie ? 'text-red-500' : 'text-emerald-600'}`}>
                                                                    {sortie ? '−' : '+'} {Math.abs(t.amount).toLocaleString('fr-FR')} F
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {transactions.transactions.last_page > 1 && (
                                            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-primary/5">
                                                <p className="text-xs text-slate-500 tabular-nums">
                                                    {transactions.transactions.from} à {transactions.transactions.to} sur {transactions.transactions.total} transactions
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {transactions.transactions.links.map((lien: any, idx: number) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            disabled={!lien.url || lien.active}
                                                            onClick={() => lien.url && chargerTransactions(lien.url)}
                                                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${lien.active ? 'bg-primary text-white dark:bg-primary-container' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10 disabled:opacity-50'}`}
                                                        >
                                                            {lien.label.includes('Previous') ? 'Précédent' : lien.label.includes('Next') ? 'Suivant' : lien.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'balance' && (
                            <div className="space-y-6">
                                <div className="bg-primary rounded-xl p-6 text-white flex items-center justify-between max-w-md">
                                    <div>
                                        <p className="text-white/70 text-sm font-medium mb-1">Balance disponible</p>
                                        <p className="text-3xl font-bold">{stats.current_balance.toLocaleString()} FCFA</p>
                                    </div>
                                    <span className="material-symbols-outlined text-5xl opacity-50">account_balance_wallet</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                                        <p className="text-slate-500 text-xs font-medium mb-1">Courses acceptées</p>
                                        <p className="text-xl font-bold text-primary">{stats.total_races}</p>
                                    </div>
                                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                                        <p className="text-slate-500 text-xs font-medium mb-1">Courses terminées</p>
                                        <p className="text-xl font-bold text-primary">{stats.completed_races ?? '—'}</p>
                                    </div>
                                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                                        <p className="text-slate-500 text-xs font-medium mb-1">Chiffre d'affaires (terminées)</p>
                                        <p className="text-xl font-bold text-primary">{stats.total_revenue.toLocaleString()} F</p>
                                    </div>
                                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                                        <p className="text-slate-500 text-xs font-medium mb-1">Km Parcourus</p>
                                        <p className="text-xl font-bold text-primary">{stats.total_km} km</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </MainLayout>
    );
}

const Champ = ({ libelle, children, chiffres = false }: { libelle: string; children: React.ReactNode; chiffres?: boolean }) => (
    <div className="flex flex-col gap-1">
        <span className="text-slate-400 text-xs font-medium">{libelle}</span>
        <span className={`font-semibold text-slate-800 dark:text-slate-200 ${chiffres ? 'tabular-nums' : ''}`}>{children}</span>
    </div>
);

const Titre = ({ icone, children }: { icone: string; children: React.ReactNode }) => (
    <h4 className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-base">{icone}</span>
        {children}
    </h4>
);

function InfosPersonnelles({ driver }: { driver: any }) {
    return (
        <div>
            <Titre icone="person">Informations personnelles</Titre>
            <div className="grid grid-cols-2 gap-6">
                <Champ libelle="Nom complet">{[driver.nom, driver.prenom].filter(Boolean).join(' ') || '—'}</Champ>
                <Champ libelle="Téléphone" chiffres>{driver.telephone || '—'}</Champ>
                <Champ libelle="Email">{driver.email || '—'}</Champ>
                {/* La ville est celle de son véhicule : `utilisateurs` n'a pas de
                    colonne ville, aucune migration ne la crée. */}
                <Champ libelle="Ville">{(driver.vehicules ?? []).map((v: any) => v.ville).find(Boolean) || driver.ville || '—'}</Champ>
            </div>
        </div>
    );
}

function FicheVehicule({ v }: { v: any }) {
    const etat = v.statut === 'OCCUPE' ? 'en course' : v.statut === 'LIBRE' ? 'libre' : (v.statut || '—').toLowerCase();
    return (
        <div>
            <Titre icone="directions_car">Véhicule</Titre>
            <div className="grid grid-cols-2 gap-6">
                <Champ libelle="Modèle">{v.modele || '—'}</Champ>
                <Champ libelle="Plaque">{v.matricule || '—'}</Champ>
                <Champ libelle="Catégorie">{v.categorie?.libelle || '—'}</Champ>
                <Champ libelle="Peut aussi travailler en">{(v.categories_autorisees ?? []).length ? v.categories_autorisees.join(', ') : '—'}</Champ>
                <Champ libelle="Couleur">{v.color || '—'}</Champ>
                <Champ libelle="Ville">{v.ville || '—'}</Champ>
                <Champ libelle="État">{Number(v.is_online) ? 'En service' : 'Hors service'} · {etat}</Champ>
            </div>
        </div>
    );
}

/** La dernière position reçue ; rien d'inventé quand elle manque (vide, ou 0, 0). */
function PositionGps({ v }: { v: any }) {
    const lat = v.lat !== null && v.lat !== undefined && v.lat !== '' ? Number(v.lat) : null;
    const lng = v.lng !== null && v.lng !== undefined && v.lng !== '' ? Number(v.lng) : null;
    const connue = lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
    const bouton = "inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800";

    return (
        <div>
            <Titre icone="location_on">Position GPS</Titre>
            {connue ? (
                <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
                    <Champ libelle="Latitude" chiffres>{lat!.toFixed(6)}</Champ>
                    <Champ libelle="Longitude" chiffres>{lng!.toFixed(6)}</Champ>
                    <Champ libelle="Dernière position reçue">{dateHeure(v.updated_at)}</Champ>
                    <div className="flex flex-wrap gap-2">
                        <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer" className={bouton}>
                            <span className="material-symbols-outlined text-[16px]">map</span>
                            Voir sur la carte
                        </a>
                        <button type="button" onClick={() => navigator.clipboard?.writeText(`${lat}, ${lng}`)} className={bouton}>
                            <span className="material-symbols-outlined text-[16px]">content_copy</span>
                            Copier
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-slate-500">Aucune position connue pour ce véhicule.</p>
            )}
        </div>
    );
}
