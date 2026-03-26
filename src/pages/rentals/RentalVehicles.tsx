import React, { useEffect, useState } from 'react';
import MainLayout from '../MainLayout';
import ApiService from '../../services/ApiService';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

interface RentalVehiclesProps {
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const RentalVehicles: React.FC<RentalVehiclesProps> = ({ onLogout, theme, toggleTheme }) => {
    const api = new ApiService();
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [pagination, setPagination] = useState<any>(null);

    const fetchVehicles = async (url: string = "location/vehicule/all") => {
        setLoading(true);
        try {
            const response = await api.getData(url);
            if (response.data.success) {
                setVehicles(response.data.data.data);
                setPagination(response.data.data);
            } else {
                toast.error("Erreur lors du chargement de la flotte");
            }
        } catch (error) {
            toast.error("Erreur serveur/connexion");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVehicles();
    }, []);

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="bg-white dark:bg-slate-900 px-4 md:px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-500 font-manrope">
                    <Link className="hover:text-primary transition-colors" to="/dashboard">Tableau de bord</Link>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                    <Link className="hover:text-primary transition-colors" to="/rentals">Location</Link>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold">Flotte Location</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#00327d] dark:text-white uppercase leading-none font-headline">Gestion de la Flotte</h2>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Link 
                            to="/rental-categories"
                            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[20px]">category</span>
                            Catégories
                        </Link>
                        <Link 
                            to="/rental-vehicles/add"
                            className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-primary/20 w-full sm:w-auto justify-center"
                        >
                            <span className="material-symbols-outlined text-[23px]">add_box</span>
                            Ajouter un véhicule
                        </Link>
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {loading ? (
                        Array(8).fill(0).map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 h-80 animate-pulse"></div>
                        ))
                    ) : vehicles.length === 0 ? (
                        <div className="col-span-full py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400">
                             <span className="material-symbols-outlined text-6xl block mb-4 opacity-20">no_crash</span>
                             <p className="font-bold text-lg uppercase tracking-widest">Aucun véhicule disponible</p>
                        </div>
                    ) : (
                        vehicles.map((v: any) => (
                            <div key={v.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group">
                                <div className="aspect-[4/3] bg-slate-50 dark:bg-slate-800/50 relative overflow-hidden">
                                    {v.image ? (
                                        <img src={v.image} alt={v.modele} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center opacity-10">
                                            <span className="material-symbols-outlined text-8xl">local_taxi</span>
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3 flex gap-2">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                                            v.status === 'LIBRE' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                                        }`}>
                                            {v.status}
                                        </span>
                                        <span className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-[#00327d] dark:text-primary-container shadow-sm border border-slate-200 dark:border-slate-700">
                                            {v.categorie?.libelle || 'Standard'}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-3 right-3 flex gap-1">
                                         <Link 
                                            to={`/rental-vehicles/edit/${v.id}`}
                                            className="size-8 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-slate-600 hover:text-primary transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                        </Link>
                                    </div>
                                </div>
                                <div className="p-5 flex flex-col gap-4 flex-1">
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <h3 className="font-black text-slate-900 dark:text-white text-lg tracking-tight uppercase leading-none">{v.modele || 'Modèle Inconnu'}</h3>
                                            <p className="text-[10px] text-primary font-black mt-2 uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded inline-block">
                                                {v.matricule || 'SANS PLAQUE'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">A partir de</p>
                                            <p className="font-black text-[#00327d] dark:text-primary-container text-lg leading-none mt-1">
                                                {v.montant?.toLocaleString()} <span className="text-[10px] opacity-60">XAF</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 dark:border-slate-800">
                                        <div className="text-center">
                                            <span className="material-symbols-outlined text-slate-400 text-[18px]">group</span>
                                            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-1">{v.nb_place || 4} Places</p>
                                        </div>
                                        <div className="text-center">
                                            <span className={`material-symbols-outlined ${v.is_clim ? 'text-blue-400 animate-pulse' : 'text-slate-300'} text-[18px]`}>ac_unit</span>
                                            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-1">{v.is_clim ? 'Climatisé' : 'Non-Clim'}</p>
                                        </div>
                                        <div className="text-center">
                                            <span className="material-symbols-outlined text-slate-400 text-[18px]">settings</span>
                                            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-1">{v.is_auto ? 'Auto' : 'Manuel'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 mt-auto">
                                        <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                            <span className="material-symbols-outlined text-xl">corporate_fare</span>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">Agence / Propriétaire</p>
                                            <p className="text-xs font-black text-slate-700 dark:text-slate-300 truncate">{v.agence?.libelle || 'Ongo Fleet'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                {/* Pagination (if applicable) */}
                {pagination && pagination.last_page > 1 && (
                    <div className="mt-8 flex justify-end gap-1.5">
                        {pagination.links.map((link: any, i: number) => (
                            <button
                                key={i}
                                onClick={() => link.url && fetchVehicles(link.url)}
                                disabled={!link.url || link.active}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                    link.active
                                        ? 'bg-[#00327d] text-white shadow-lg'
                                        : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800'
                                } ${!link.url ? 'opacity-30 cursor-not-allowed' : ''}`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default RentalVehicles;
