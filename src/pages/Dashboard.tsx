import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ApiService from '../services/ApiService';
import Helpers from '../functions/helpers';
import MainLayout from './MainLayout';

interface DashboardProps {
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout, theme, toggleTheme }) => {
    const navigate = useNavigate();
    const [stat, setStat] = useState<any>({ client: 0, chauffeur: 0, commande: 0, vehicule: 0, paiement: 0 });
    const [utilisateur, setUtilisateur] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const api = new ApiService();
    const helpers = new Helpers();

    const fetchStats = async () => {
        try {
            const response = await api.getData('stat');
            if (response.data.success) {
                setStat(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    const fetchCourses = async (url = "course/liste-course", isPag = false) => {
        setLoading(true);
        try {
            const response = await api.getDatawithPagination(url, isPag);
            if (response.data.success) {
                setUtilisateur(response.data.data.data);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchCourses();
    }, []);

    const handleLogout = () => {
        onLogout();
        navigate('/login');
    };

    return (
        <MainLayout onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme}>
            {/* Content Area */}
            <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 w-full overflow-x-hidden">
                {/* Metric Cards */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
                    {[
                        { label: 'Clients', value: stat.client, trend: '12%', up: true, icon: 'person', color: 'text-primary', bg: 'bg-blue-50 dark:bg-blue-900/30' },
                        { label: 'Chauffeurs', value: stat.chauffeur, trend: '5%', up: true, icon: 'sports_motorsports', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/30' },
                        { label: 'Commandes', value: stat.commande, trend: '2%', up: false, icon: 'assignment', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/30' },
                        { label: 'Véhicules', value: stat.vehicule, trend: '8%', up: true, icon: 'directions_car', color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/30' },
                        { label: 'Paiements', value: `${stat.paiement} FCFA`, trend: '15%', up: true, icon: 'account_balance_wallet', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
                    ].map((card) => (
                        <div key={card.label} className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className={`${card.bg} p-2 md:p-2.5 rounded-lg ${card.color}`}>
                                    <span className="material-symbols-outlined text-xl md:text-2xl">{card.icon}</span>
                                </div>
                                <div className={`${card.up ? 'text-emerald-500' : 'text-red-500'} flex items-center gap-1 text-[10px] md:text-xs font-bold whitespace-nowrap`}>
                                    <span className="material-symbols-outlined text-xs md:text-sm">{card.up ? 'trending_up' : 'trending_down'}</span>
                                    {card.trend}
                                </div>
                            </div>
                            <div className="mt-4">
                                <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{card.label}</p>
                                <h3 className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white mt-1 truncate">{card.value}</h3>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Main Content: Course List (Card view on mobile, Table on desktop) */}
                <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-4">
                    <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Liste des courses</h2>
                            <p className="text-xs md:text-sm text-slate-500">Détails des trajets récents</p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                <span className="material-symbols-outlined text-lg">filter_list</span>
                                <span className="hidden xs:inline">Filtrer</span>
                            </button>
                            <button className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
                                <span className="material-symbols-outlined text-lg">file_download</span>
                                <span className="hidden xs:inline">Exporter</span>
                            </button>
                        </div>
                    </div>

                    {/* Mobile & Tablet Card View (Zero Horizontal Scroll) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 lg:hidden bg-slate-50/30 dark:bg-slate-800/20">
                        {utilisateur.length > 0 ? (
                            utilisateur.map((item: any, i: number) => {
                                if (item.courses != null) {
                                    return (
                                        <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/30 transition-all space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                        <span className="material-symbols-outlined">person</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{item.chauffeurs.nom} {item.chauffeurs.prenom}</p>
                                                        <p className="text-[11px] text-slate-500 font-mono">{item.chauffeurs.telephone}</p>
                                                    </div>
                                                </div>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.courses.statut === 'Annulée' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    }`}>
                                                    {item.courses.statut}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-xs py-2 border-y border-slate-50 dark:border-slate-800/50">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-400 uppercase text-[9px] font-bold">Véhicule</span>
                                                    <span className="font-semibold">{item.chauffeurs.vehicules[0]?.modele} <span className="text-[10px] text-primary">({item.courses.categorie_vehicule.libelle})</span></span>
                                                </div>
                                                <div className="flex flex-col text-right">
                                                    <span className="text-slate-400 uppercase text-[9px] font-bold">Montant</span>
                                                    <span className="font-bold text-primary">{item.courses.montant} FCFA</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="size-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
                                                    <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{item.courses.lieu_depart}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="size-2 rounded-full bg-red-500 flex-shrink-0"></span>
                                                    <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{item.courses.lieu_arrive}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2">
                                                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                                                    <span>{helpers.formaatDate(item.courses.date_depart)}, {item.courses.heure_depart}</span>
                                                </div>
                                                <button className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                                                    Détails
                                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })
                        ) : (
                            <div className="p-10 text-center text-slate-500 col-span-full">
                                {loading ? "Chargement..." : "Aucune courses"}
                            </div>
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block w-full overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Chauffeur</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Client</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Véhicule</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Trajet</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date & Heure</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Montant</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Statut</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {utilisateur.length > 0 ? (
                                    utilisateur.map((item: any, i: number) => {
                                        if (item.courses != null) {
                                            return (
                                                <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                                                <span className="material-symbols-outlined text-lg">person</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-semibold text-slate-900 dark:text-white">{item.chauffeurs.nom} {item.chauffeurs.prenom}</span>
                                                                <span className="text-xs text-slate-500 font-mono">{item.chauffeurs.telephone}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="size-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary">
                                                                <span className="material-symbols-outlined text-lg">account_circle</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-semibold text-slate-900 dark:text-white">{item.courses.client.nom} {item.courses.client.prenom}</span>
                                                                <span className="text-xs text-slate-500 font-mono">{item.courses.client.telephone}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-slate-900 dark:text-white">{item.chauffeurs.vehicules[0]?.modele}</span>
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold uppercase w-fit mt-1">{item.courses.categorie_vehicule.libelle}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1 max-w-[200px]">
                                                            <div className="flex items-center gap-2">
                                                                <span className="size-1.5 rounded-full bg-emerald-500"></span>
                                                                <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{item.courses.lieu_depart}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="size-1.5 rounded-full bg-red-500"></span>
                                                                <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{item.courses.lieu_arrive}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-slate-900 dark:text-white">{helpers.formaatDate(item.courses.date_depart)}</span>
                                                            <span className="text-xs text-slate-500">{item.courses.heure_depart}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
                                                        {item.courses.montant} FCFA
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.courses.statut === 'Annulée' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                            }`}>
                                                            {item.courses.statut}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-colors">
                                                            <span className="material-symbols-outlined text-[20px]">visibility</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        }
                                        return null;
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                                            {loading ? "Chargement..." : "Aucune courses"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-4 md:px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-slate-500">Affichage de <span className="font-medium text-slate-900 dark:text-white">1</span> à <span className="font-medium text-slate-900 dark:text-white">2</span> sur <span className="font-medium text-slate-900 dark:text-white">248</span> courses</p>
                        <div className="flex items-center gap-1 md:gap-2">
                            <button className="p-1 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed">Précédent</button>
                            <button className="p-1 px-3 bg-primary text-white rounded-lg text-xs md:text-sm font-medium">1</button>
                            <button className="p-1 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:text-sm hover:bg-slate-50 dark:hover:bg-slate-800">2</button>
                            <button className="p-1 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:text-sm hover:bg-slate-50 dark:hover:bg-slate-800">Suivant</button>
                        </div>
                    </div>
                </section>
            </div>
        </MainLayout>
    );
};

export default Dashboard;
