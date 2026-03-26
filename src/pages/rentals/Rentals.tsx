import React, { useEffect, useState } from 'react';
import MainLayout from '../MainLayout';
import ApiService from '../../services/ApiService';
import { toast } from 'react-toastify';
import { Link, useNavigate } from 'react-router-dom';

interface RentalsProps {
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const Rentals: React.FC<RentalsProps> = ({ onLogout, theme, toggleTheme }) => {
    const api = new ApiService();
    const navigate = useNavigate();
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [pagination, setPagination] = useState<any>([]);

    const fetchLocations = async (url: string = "location/reservation/all") => {
        setLoading(true);
        try {
            const response = await api.getData(url);
            if (response.data.success) {
                setLocations(response.data.data.data);
                setPagination(response.data.data.links);
            } else {
                toast.error("Erreur lors du chargement des locations");
            }
        } catch (error) {
            toast.error("Erreur serveur/connexion");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocations();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'EN ATTENTE': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            case 'CONFIRMEE': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'EN COURS': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'TERMINEE': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
            case 'ANNULEE': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="bg-white dark:bg-slate-900 px-4 md:px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-500 font-manrope">
                    <Link className="hover:text-primary transition-colors" to="/dashboard">Tableau de bord</Link>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold">Location de Véhicules</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#00327d] dark:text-white uppercase leading-none font-headline">Réservations de Location</h2>
                    <div className="flex gap-2">
                        <Link 
                            to="/rental-vehicles"
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[20px]">directions_car</span>
                            Gérer la flotte
                        </Link>
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-8">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500">Client</th>
                                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500">Véhicule</th>
                                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500">Période</th>
                                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500">Montant</th>
                                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-manrope">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={6} className="px-6 py-10 h-20 bg-slate-50/10"></td>
                                        </tr>
                                    ))
                                ) : locations.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                                            <span className="material-symbols-outlined text-6xl block mb-4 opacity-20">event_busy</span>
                                            <p className="font-bold text-lg">Aucune réservation trouvée</p>
                                        </td>
                                    </tr>
                                ) : (
                                    locations.map((loc: any) => (
                                        <tr 
                                            key={loc.id} 
                                            onClick={() => navigate(`/rentals/${loc.id}`)}
                                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                        {loc.client?.nom?.[0]}{loc.client?.prenom?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white capitalize leading-none">
                                                            {loc.client?.nom} {loc.client?.prenom}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tight">{loc.client?.telephone}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                                                        {loc.vehicule?.modele || 'N/A'}
                                                    </p>
                                                    <p className="text-[10px] text-primary font-black mt-1 uppercase tracking-widest">
                                                        {loc.vehicule?.matricule || 'Sans plaque'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-300">
                                                        <span className="material-symbols-outlined text-sm text-emerald-500">event_available</span>
                                                        {loc.date_solicitation}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-400 mt-1">
                                                        <span className="material-symbols-outlined text-sm text-rose-400">event_busy</span>
                                                        {loc.date_retour}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-black text-sm text-[#00327d] dark:text-primary-container">
                                                    {loc.montant?.toLocaleString()} <span className="text-[10px] opacity-60">XAF</span>
                                                </div>
                                                <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${loc.is_paid ? 'text-emerald-500' : 'text-rose-400'}`}>
                                                    {loc.is_paid ? 'Payé' : 'Non payé'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusColor(loc.status)}`}>
                                                    <span className={`size-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]`}></span>
                                                    {loc.status}
                                                </span>
                                            </td>
                                      
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    {pagination && pagination.length > 3 && (
                        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
                            <div className="flex gap-1.5">
                                {pagination.map((link: any, i: number) => (
                                    <button
                                        key={i}
                                        onClick={() => link.url && fetchLocations(link.url)}
                                        disabled={!link.url || link.active}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-tighter transition-all ${
                                            link.active
                                                ? 'bg-[#00327d] text-white shadow-md'
                                                : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                                        } ${!link.url ? 'opacity-30 cursor-not-allowed' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default Rentals;
