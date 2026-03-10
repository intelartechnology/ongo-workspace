import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";
import MainLayout from "./MainLayout";
import Helpers from "../functions/helpers";

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
    const [activeTab, setActiveTab] = useState('details');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

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
    }, [id]);

    if (loading) return <Loading />;
    if (!data) return <div>Chauffeur non trouvé</div>;

    const { driver, stats, recent_races } = data;

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="p-8 max-w-7xl mx-auto w-full font-display">
                {/* Profile Overview */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-primary/5 mb-8 flex flex-wrap gap-6 items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="size-24 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden border-2 border-primary">
                            <img 
                                alt="Driver Profile" 
                                className="w-full h-full object-cover" 
                                src={driver.photo || 'https://via.placeholder.com/150'} 
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-2xl font-bold">{helpers.capitalizeFirstLetter(driver.nom + " " + driver.prenom)}</h3>
                                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full flex items-center gap-1">
                                    <span className="size-1.5 bg-green-600 rounded-full"></span>
                                    Actif
                                </span>
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
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-primary/5 overflow-hidden">
                    <div className="border-b border-primary/10 flex px-6">
                        <button 
                            onClick={() => setActiveTab('details')}
                            className={`px-6 py-4 border-b-2 font-bold text-sm transition-colors ${activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-primary'}`}
                        >
                            Détails
                        </button>
                        <button 
                            onClick={() => setActiveTab('courses')}
                            className={`px-6 py-4 border-b-2 font-bold text-sm transition-colors ${activeTab === 'courses' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-primary'}`}
                        >
                            Courses
                        </button>
                        <button 
                            onClick={() => setActiveTab('balance')}
                            className={`px-6 py-4 border-b-2 font-bold text-sm transition-colors ${activeTab === 'balance' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-primary'}`}
                        >
                            Balance
                        </button>
                    </div>

                    <div className="p-8">
                        {activeTab === 'details' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                <div>
                                    <h4 className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-base">person</span>
                                        Informations Personnelles
                                    </h4>
                                    <div className="space-y-6">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-slate-400 text-xs font-medium">Nom Complet</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">{driver.nom} {driver.prenom}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-slate-400 text-xs font-medium">Téléphone</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">{driver.telephone}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-slate-400 text-xs font-medium">Email</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">{driver.email || 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-slate-400 text-xs font-medium">Ville</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-200">{driver.ville || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-base">verified_user</span>
                                        Statut du compte
                                    </h4>
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-primary/5">
                                            <div className="flex items-center gap-3">
                                                <span className="material-symbols-outlined text-green-500">check_circle</span>
                                                <div>
                                                    <p className="text-sm font-bold">Compte Vérifié</p>
                                                    <p className="text-[10px] text-slate-500 uppercase">Documents à jour</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'courses' && (
                            <div className="space-y-6">
                                {/* Search and Filter Header */}
                                <div className="flex flex-wrap gap-4 items-center justify-between pb-2">
                                    <div className="flex-1 min-w-[300px] relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                        <input 
                                            type="text" 
                                            placeholder="Rechercher par Trip ID, départ ou arrivée..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                        />
                                    </div>
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
                                            <option value="TERMINEE">Terminée</option>
                                            <option value="ANNULEE">Annulée</option>
                                            <option value="EN_COURS">En cours</option>
                                        </select>
                                        <button 
                                            onClick={() => fetchData()}
                                            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-all flex items-center gap-2"
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
                                                <th className="pb-3 pr-4 font-bold">Trajet</th>
                                                <th className="pb-3 pr-4 font-bold">Montant</th>
                                                <th className="pb-3 font-bold text-right">Statut</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {recent_races.data.map((race: any) => (
                                                <tr key={race.id} className="border-t border-primary/5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                    <td className="py-4 pr-4 font-medium">{race.trip_id}</td>
                                                    <td className="py-4 pr-4 text-slate-500">{race.date}</td>
                                                    <td className="py-4 pr-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-slate-400 uppercase">De:</span> {race.departure}
                                                            <span className="text-[10px] text-slate-400 uppercase mt-1">À:</span> {race.arrival}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 pr-4 font-bold">{race.amount.toLocaleString()} F</td>
                                                    <td className="py-4 text-right">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${race.status === 'TERMINEE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {race.status}
                                                        </span>
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
                                                                ? 'bg-primary text-white' 
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

                        {activeTab === 'balance' && (
                            <div className="space-y-6">
                                <div className="bg-primary rounded-xl p-6 text-white flex items-center justify-between shadow-lg shadow-primary/20 max-w-md">
                                    <div>
                                        <p className="text-white/70 text-sm font-medium mb-1">Balance disponible</p>
                                        <p className="text-3xl font-bold">{stats.current_balance.toLocaleString()} FCFA</p>
                                    </div>
                                    <span className="material-symbols-outlined text-5xl opacity-50">account_balance_wallet</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                                        <p className="text-slate-500 text-xs font-medium mb-1">Courses Total</p>
                                        <p className="text-xl font-bold text-primary">{stats.total_races}</p>
                                    </div>
                                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                                        <p className="text-slate-500 text-xs font-medium mb-1">Revenu Total</p>
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

                <button 
                    onClick={() => navigate(-1)}
                    className="mt-8 flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-medium"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                    Retour à la liste
                </button>
            </div>
        </MainLayout>
    );
}
