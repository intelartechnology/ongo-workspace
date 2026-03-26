import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MainLayout from '../MainLayout';
import ApiService from '../../services/ApiService';
import { toast } from 'react-toastify';

interface RentalDetailProps {
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const RentalDetail: React.FC<RentalDetailProps> = ({ onLogout, theme, toggleTheme }) => {
    const api = new ApiService();
    const { id } = useParams();
    const navigate = useNavigate();
    const [location, setLocation] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [processing, setProcessing] = useState<boolean>(false);

    useEffect(() => {
        fetchDetail();
    }, [id]);

    const fetchDetail = async () => {
        setLoading(true);
        try {
            const response = await api.getData(`location/reservation/detail/${id}`);
            if (response.data.success) {
                setLocation(response.data.data);
            } else {
                toast.error("Détails non trouvés");
                navigate('/rentals');
            }
        } catch (error) {
            toast.error("Erreur serveur");
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (status: string) => {
        if (!window.confirm(`Confirmer le passage au statut: ${status} ?`)) return;
        setProcessing(true);
        try {
            // Logic based on existing LocationController::traiter or changeLocationStatus
            const response = await api.postData('location/reservation/traiter', {
                location_id: id,
                status: status,
                montant: location.montant,
                id_agence: location.id_agence
            });
            if (response.data.success) {
                toast.success("Statut mis à jour");
                fetchDetail();
            }
        } catch (error) {
            toast.error("Erreur de mise à jour");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}><div className="p-8 text-center font-black animate-pulse">Chargement des détails...</div></MainLayout>;
    if (!location) return null;

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="bg-white dark:bg-slate-900 px-4 md:px-8 py-6 border-b border-slate-200 dark:border-slate-800 font-manrope">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                    <Link className="hover:text-primary transition-colors" to="/dashboard">Tableau de bord</Link>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                    <Link className="hover:text-primary transition-colors" to="/rentals">Location</Link>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold">Détail Réservation #{id}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#00327d] dark:text-white uppercase leading-none font-headline">Fiche de Location</h2>
                    <div className="flex gap-2">
                         <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm ${
                            location.status === 'EN ATTENTE' ? 'bg-amber-100 text-amber-700' : 
                            location.status === 'CONFIRMEE' ? 'bg-blue-100 text-blue-700' :
                            'bg-emerald-100 text-emerald-700'
                        }`}>
                            {location.status}
                        </span>
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-8">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 flex flex-col gap-8">
                        {/* Summary Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm flex flex-col gap-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div>
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                                        <span className="size-2 rounded-full bg-primary"></span>
                                        Informations Client
                                    </h3>
                                    <div className="flex items-center gap-5">
                                        <div className="size-16 rounded-2xl bg-[#00327d]/5 dark:bg-slate-800 flex items-center justify-center text-[#00327d] dark:text-primary-container text-2xl font-black">
                                            {location.client?.nom?.[0]}{location.client?.prenom?.[0]}
                                        </div>
                                        <div className="flex flex-col gap-1 font-manrope">
                                            <p className="text-xl font-black text-slate-900 dark:text-white leading-none uppercase tracking-tight">{location.client?.nom} {location.client?.prenom}</p>
                                            <p className="text-sm font-bold text-slate-500">{location.client?.email}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="material-symbols-outlined text-primary text-sm">phone_android</span>
                                                <span className="text-xs font-black text-primary tracking-widest leading-none">{location.client?.telephone}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[#00327d] dark:text-primary-container mb-4">Détails financiers</h3>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-500">Montant Total</span>
                                            <span className="text-lg font-black text-[#00327d] dark:text-primary-container">{location.montant?.toLocaleString()} XAF</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-500">Statut Paiement</span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${location.is_paid ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {location.is_paid ? 'Paiement Confirmé' : 'Non payé'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-100 dark:border-slate-800" />

                            <div>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                                    <span className="size-2 rounded-full bg-primary"></span>
                                    Période de Location
                                </h3>
                                <div className="grid grid-cols-2 gap-8 ring-1 ring-slate-100 dark:ring-slate-800 rounded-2xl p-6 bg-slate-50/30">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Date de Début</p>
                                        <p className="text-lg font-black text-slate-900 dark:text-white leading-none mt-1">{location.date_solicitation}</p>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">{location.heure_solicitation || '--:--'}</p>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Date de Retour</p>
                                        <p className="text-lg font-black text-slate-900 dark:text-white leading-none mt-1">{location.date_retour}</p>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">{location.heure_retour || '--:--'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Vehicle Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm font-manrope">
                            <div className="p-8 pb-0">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                    <span className="size-2 rounded-full bg-primary"></span>
                                    Véhicule Loué
                                </h3>
                            </div>
                            <div className="p-8 flex items-start gap-8 flex-wrap md:flex-nowrap">
                                <div className="w-full md:w-64 aspect-video rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-inner">
                                    {location.vehicule?.image ? (
                                        <img src={location.vehicule.image} alt={location.vehicule.modele} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400 opacity-20">
                                            <span className="material-symbols-outlined text-6xl">directions_car</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col gap-4">
                                    <div>
                                        <h4 className="text-2xl font-black text-[#00327d] dark:text-primary-container leading-none uppercase tracking-tighter">{location.vehicule?.modele}</h4>
                                        <p className="text-sm font-black text-slate-400 mt-2 tracking-widest uppercase">{location.vehicule?.matricule || 'SANS PLAQUE'}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Catégorie</p>
                                            <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">{location.vehicule?.categorie?.libelle || 'Standard'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Agence</p>
                                            <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">{location.agence?.libelle || 'Ongo'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions Sidebar */}
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm flex flex-col gap-6 font-manrope">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white mb-2">Actions Administrateur</h3>
                            
                            {location.status === 'EN ATTENTE' && (
                                <button 
                                    onClick={() => updateStatus('CONFIRMEE')}
                                    disabled={processing}
                                    className="w-full py-4 rounded-2xl bg-[#00327d] hover:bg-[#00327d]/95 text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-900/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {processing ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-[18px]">verified</span>}
                                    Confirmer la Demande
                                </button>
                            )}

                            {location.status === 'CONFIRMEE' && (
                                <button 
                                    onClick={() => updateStatus('EN COURS')}
                                    disabled={processing}
                                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-emerald-900/10 transition-all flex items-center justify-center gap-2"
                                >
                                    {processing ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-[18px]">play_circle</span>}
                                    Passer "En Cours"
                                </button>
                            )}

                            <button 
                                onClick={() => updateStatus('ANNULEE')}
                                disabled={processing}
                                className="w-full py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-rose-500 font-black uppercase tracking-widest text-[11px] border border-slate-200 dark:border-slate-700 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">cancel</span>
                                Annuler la Location
                            </button>

                            <hr className="border-slate-100 dark:border-slate-800" />

                            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                                <p className="text-[10px] font-bold text-primary leading-relaxed text-center">
                                    Une notification sera envoyée au client lors de tout changement de statut.
                                </p>
                            </div>
                        </div>

                        <Link 
                            to="/rentals"
                            className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
                        >
                            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                            Retour à la liste
                        </Link>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default RentalDetail;
