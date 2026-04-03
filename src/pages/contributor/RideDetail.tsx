import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ContributorLayout from '../../components/contributor/ContributorLayout';
import ApiService from '../../services/ApiService';

interface ContributorRideDetailProps {
    onLogout: () => void;
    user: any;
}

const ContributorRideDetail: React.FC<ContributorRideDetailProps> = ({ onLogout, user }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [ride, setRide] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const api = new ApiService();

    useEffect(() => {
        const fetchRide = async () => {
            try {
                const res = await api.getData(
                    `utilisateur/get-contributor-course-detail/${id}?user_id=${user.id}`
                );
                if (res.data.success) {
                    setRide(res.data.data);
                }
            } catch (error) {
                console.error('Error fetching ride detail:', error);
            } finally {
                setLoading(false);
            }
        };
        if (user?.id && id) fetchRide();
    }, [user?.id, id]);

    const statusBadge = (statut: string) => {
        if (statut === 'TERMINEE') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
        if (statut === 'ANNULEE') return 'bg-red-100 text-red-700 border border-red-200';
        if (statut === 'EN COURS') return 'bg-blue-100 text-blue-700 border border-blue-200';
        return 'bg-amber-100 text-amber-700 border border-amber-200';
    };

    const montant = Number(ride?.montant || ride?.paiement?.montant || 0);
    const part = montant * 0.8;

    const attribution = ride?.attributions?.[0];
    const driver = attribution?.chauffeurs;
    const vehicle = driver?.vehicules?.[0];

    if (loading) {
        return (
            <ContributorLayout user={user} onLogout={onLogout}>
                <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
                    <div className="h-8 bg-slate-100 rounded w-1/3"/>
                    <div className="h-64 bg-slate-100 rounded-2xl"/>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="h-48 bg-slate-100 rounded-2xl"/>
                        <div className="h-48 bg-slate-100 rounded-2xl"/>
                    </div>
                </div>
            </ContributorLayout>
        );
    }

    if (!ride) {
        return (
            <ContributorLayout user={user} onLogout={onLogout}>
                <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                    <span className="material-symbols-outlined text-6xl mb-4">search_off</span>
                    <p className="text-lg font-semibold text-slate-400">Course introuvable</p>
                    <button onClick={() => navigate('/contributor/rides')} className="mt-4 text-emerald-600 text-sm font-bold hover:underline">
                        ← Retour à la liste
                    </button>
                </div>
            </ContributorLayout>
        );
    }

    return (
        <ContributorLayout user={user} onLogout={onLogout}>
            {/* Back + Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate('/contributor/rides')}
                    className="flex items-center gap-1 text-sm text-slate-400 hover:text-emerald-700 font-medium transition-colors mb-4"
                >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    Retour aux courses
                </button>
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-3xl font-extrabold text-emerald-800 tracking-tight">
                            Course #{ride.id}
                        </h2>
                        <p className="text-slate-500 mt-1">
                            {ride.created_at
                                ? new Date(ride.created_at).toLocaleDateString('fr-FR', {
                                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                                  })
                                : '—'}
                        </p>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${statusBadge(ride.statut)}`}>
                        {ride.statut}
                    </span>
                </div>
            </div>

            <div className="max-w-5xl space-y-6">
                {/* Financial Summary — Hero Card */}
                <div className="bg-gradient-to-r from-emerald-800 to-emerald-600 rounded-2xl p-8 text-white shadow-xl">
                    <div className="grid grid-cols-3 gap-8">
                        <div>
                            <p className="text-emerald-200 text-xs font-bold uppercase tracking-wider mb-2">Montant Total</p>
                            <p className="text-4xl font-extrabold">
                                {montant > 0 ? montant.toLocaleString('fr-FR') : '—'}
                                {montant > 0 && <span className="text-xl font-bold opacity-70 ml-2">FCFA</span>}
                            </p>
                        </div>
                        
                        <div className="border-l border-white/20 pl-8">
                            <p className="text-emerald-200 text-xs font-bold uppercase tracking-wider mb-2">Type de Paiement</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="material-symbols-outlined text-2xl">
                                    {ride.transaction_type === 'CASH' ? 'payments' : 'credit_card'}
                                </span>
                                <p className="text-xl font-bold">{ride.transaction_type || '—'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Route + Client + Vehicle in 3 cols */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Route */}
                    <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">route</span>
                            Itinéraire
                        </h4>
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center gap-1 py-1 flex-shrink-0">
                                <div className="w-3 h-3 rounded-full border-2 border-emerald-600"/>
                                <div className="w-px flex-1 bg-slate-200 min-h-[40px]"/>
                                <div className="w-3 h-3 rounded-full bg-emerald-600"/>
                            </div>
                            <div className="flex flex-col gap-5">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Départ</p>
                                    <p className="text-sm font-semibold text-slate-700 leading-tight mt-0.5">{ride.lieu_depart || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Arrivée</p>
                                    <p className="text-sm font-semibold text-slate-700 leading-tight mt-0.5">{ride.lieu_arrive || '—'}</p>
                                </div>
                            </div>
                        </div>
                        {ride.distance && (
                            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 text-slate-500 text-sm font-semibold">
                                <span className="material-symbols-outlined text-base text-slate-400">straighten</span>
                                {ride.distance} km
                            </div>
                        )}
                        {ride.ville && (
                            <div className="mt-2 flex items-center gap-2 text-slate-400 text-xs font-medium">
                                <span className="material-symbols-outlined text-sm">location_on</span>
                                {ride.ville}
                            </div>
                        )}
                    </div>

                    {/* Client */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">person</span>
                            Client
                        </h4>
                        {ride.client ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 text-slate-400 border border-slate-200">
                                        {ride.client.photo ? (
                                            <img src={ride.client.photo} className="w-full h-full object-cover" alt="Client"/>
                                        ) : (
                                            <span className="material-symbols-outlined text-3xl">person</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-base font-bold text-slate-800">
                                            {ride.client.nom} {ride.client.prenom}
                                        </p>
                                        {ride.client.telephone && (
                                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                                <span className="material-symbols-outlined" style={{fontSize:'13px'}}>phone</span>
                                                {ride.client.telephone}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-300 flex flex-col items-center py-6">
                                <span className="material-symbols-outlined text-3xl">person_off</span>
                                <p className="text-xs mt-2">Client inconnu</p>
                            </div>
                        )}
                    </div>

                    {/* Driver & Vehicle */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">local_taxi</span>
                            Chauffeur & Véhicule
                        </h4>
                        {driver ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold overflow-hidden flex-shrink-0">
                                        {driver.photo ? (
                                            <img src={driver.photo} className="w-full h-full object-cover" alt="Driver"/>
                                        ) : (
                                            (driver.nom?.[0] || '?')
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{driver.nom} {driver.prenom}</p>
                                        {driver.telephone && (
                                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                <span className="material-symbols-outlined" style={{fontSize:'12px'}}>phone</span>
                                                {driver.telephone}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {vehicle && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-400 font-semibold uppercase">Matricule</span>
                                            <span className="text-sm font-bold text-slate-800">{vehicle.matricule}</span>
                                        </div>
                                        {vehicle.modele && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-slate-400 font-semibold uppercase">Modèle</span>
                                                <span className="text-sm font-medium text-slate-600">{vehicle.modele}</span>
                                            </div>
                                        )}
                                        {vehicle.color && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-slate-400 font-semibold uppercase">Couleur</span>
                                                <span className="text-sm font-medium text-slate-600 capitalize">{vehicle.color}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-slate-300 flex flex-col items-center py-6">
                                <span className="material-symbols-outlined text-3xl">person_off</span>
                                <p className="text-xs mt-2">Chauffeur inconnu</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Ride Meta Info */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">info</span>
                        Informations supplémentaires
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { label: 'Code Course', value: ride.code || '—', icon: 'tag' },
                            { label: 'Type', value: ride.type || '—', icon: 'category' },
                            {
                                label: 'Date Départ',
                                value: ride.date_depart
                                    ? new Date(ride.date_depart).toLocaleDateString('fr-FR')
                                    : '—',
                                icon: 'calendar_today'
                            },
                            { label: 'Heure Départ', value: ride.heure_depart || '—', icon: 'schedule' },
                        ].map((item) => (
                            <div key={item.label} className="bg-slate-50 rounded-xl p-4">
                                <div className="flex items-center gap-1.5 text-slate-400 mb-2">
                                    <span className="material-symbols-outlined text-sm">{item.icon}</span>
                                    <p className="text-[10px] font-bold uppercase tracking-wider">{item.label}</p>
                                </div>
                                <p className="text-sm font-bold text-slate-700">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </ContributorLayout>
    );
};

export default ContributorRideDetail;
