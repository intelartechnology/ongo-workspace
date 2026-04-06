import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ContributorLayout from '../../components/contributor/ContributorLayout';
import ApiService from '../../services/ApiService';

interface ContributorRidesProps {
    onLogout: () => void;
    user: any;
}

const ContributorRides: React.FC<ContributorRidesProps> = ({ onLogout, user }) => {
    const [rides, setRides] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<any>(null);
    
    // Filters
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const api = new ApiService();
    const navigate = useNavigate();

    const fetchRides = async (url?: string) => {
        setLoading(true);
        try {
            let fetchUrl = url;
            
            if (!fetchUrl) {
                fetchUrl = `utilisateur/get-contributor-courses?user_id=${user.id}`;
                if (statusFilter !== 'ALL') fetchUrl += `&statut=${statusFilter}`;
                if (startDate) fetchUrl += `&start_date=${startDate}`;
                if (endDate) fetchUrl += `&end_date=${endDate}`;
            }

            const res = await api.getData(fetchUrl);
            if (res.data.success) {
                setRides(res.data.data.data);
                setPagination(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching rides:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) fetchRides();
    }, [user?.id, statusFilter, startDate, endDate]);

    const handlePageChange = (url: string) => {
        if (url) {
            const pageParam = url.split('?')[1];
            let fetchUrl = `utilisateur/get-contributor-courses?user_id=${user.id}&${pageParam}`;
            if (statusFilter !== 'ALL') fetchUrl += `&statut=${statusFilter}`;
            if (startDate) fetchUrl += `&start_date=${startDate}`;
            if (endDate) fetchUrl += `&end_date=${endDate}`;
            fetchRides(fetchUrl);
        }
    };

    const statusBadge = (statut: string) => {
        if (statut === 'TERMINEE') return 'bg-emerald-100 text-emerald-700';
        if (statut === 'ANNULEE') return 'bg-red-100 text-red-700';
        if (statut === 'EN COURS') return 'bg-blue-100 text-blue-700';
        return 'bg-amber-100 text-amber-700';
    };

    return (
        <ContributorLayout user={user} onLogout={onLogout}>
            {/* Header */}
            <div className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-0">
                <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-emerald-800 tracking-tight mb-1">Historique des Courses</h2>
                    <p className="text-slate-500 font-medium text-sm md:text-base">
                        Toutes les courses effectuées par vos véhicules.
                        {pagination && !loading && (
                            <span className="ml-2 text-emerald-600 font-bold block sm:inline">{pagination.total} courses au total</span>
                        )}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
                    <button 
                        onClick={() => setIsFilterVisible(!isFilterVisible)}
                        className={`w-full sm:w-auto justify-center px-6 py-3 rounded-xl sm:rounded-full flex items-center gap-2 font-semibold text-sm transition-all shadow-md ${
                            isFilterVisible 
                            ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500/20' 
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                    >
                        <span className={`material-symbols-outlined text-lg transition-transform duration-300 ${isFilterVisible ? 'rotate-180' : ''}`}>
                            filter_list
                        </span>
                        {isFilterVisible ? 'Fermer les filtres' : 'Filtrer'}
                    </button>
                    <Link 
                        to="/contributor/rides-report"
                        className="w-full sm:w-auto justify-center px-6 py-3 bg-slate-800 text-white hover:bg-slate-900 rounded-xl sm:rounded-full flex items-center gap-2 font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">print</span>
                        Imprimer
                    </Link>
                </div>
            </div>

            {/* Filters Bar */}
            {isFilterVisible && (
                <div className="mb-6 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-emerald-100/50 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 items-end">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Statut de la course</label>
                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
                            >
                                <option value="ALL">Tous les statuts</option>
                                <option value="TERMINEE">Terminée</option>
                                <option value="ANNULEE">Annulée</option>
                                <option value="EN COURS">En cours</option>
                                <option value="RECHERCHE">Recherche</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Date de début</label>
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Date de fin</label>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            />
                        </div>
                        <div>
                            <button 
                                onClick={() => {
                                    setStatusFilter('ALL');
                                    setStartDate('');
                                    setEndDate('');
                                }}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">restart_alt</span>
                                Réinitialiser
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Course</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Client</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Itinéraire</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Véhicule / Chauffeur</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Montant</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Votre part (80%)</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array(8).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-6 py-5">
                                            <div className="h-4 bg-slate-100 rounded w-full"/>
                                        </td>
                                    </tr>
                                ))
                            ) : rides.length > 0 ? (
                                rides.map((attr: any) => {
                                    const montant = Number(attr.courses?.montant || 0);
                                    const part = montant * 0.8;
                                    return (
                                        <tr
                                            key={attr.id}
                                            className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                                            onClick={() => navigate(`/contributor/rides/${attr.courses?.id}`)}
                                        >
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-slate-800">#{attr.courses?.id}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">
                                                    {attr.created_at
                                                        ? new Date(attr.created_at).toLocaleDateString('fr-FR', {
                                                            day: '2-digit', month: 'short', year: 'numeric'
                                                          })
                                                        : '—'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden flex-shrink-0">
                                                        {attr.courses?.client?.photo ? (
                                                            <img src={attr.courses.client.photo} className="w-full h-full object-cover" alt=""/>
                                                        ) : (
                                                            <span className="material-symbols-outlined text-sm">person</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-700">
                                                            {attr.courses?.client?.nom} {attr.courses?.client?.prenom}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-0.5 max-w-[200px]">
                                                    <p className="text-xs font-medium text-slate-600 truncate" title={attr.courses?.lieu_depart}>
                                                        <span className="text-emerald-600 mr-1">●</span>
                                                        {attr.courses?.lieu_depart}
                                                    </p>
                                                    <p className="text-xs font-medium text-slate-600 truncate" title={attr.courses?.lieu_arrive}>
                                                        <span className="text-slate-400 mr-1">○</span>
                                                        {attr.courses?.lieu_arrive}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-slate-800">
                                                    {attr.chauffeurs?.vehicules?.[0]?.matricule || 'N/A'}
                                                </p>
                                                <p className="text-[10px] text-slate-400">
                                                    {attr.chauffeurs?.nom} {attr.chauffeurs?.prenom}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-bold text-slate-800">
                                                    {montant > 0 ? montant.toLocaleString('fr-FR') : '—'} {montant > 0 ? 'FCFA' : ''}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-bold text-emerald-700">
                                                    {part > 0 ? part.toLocaleString('fr-FR') : '—'} {part > 0 ? 'FCFA' : ''}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusBadge(attr.courses?.statut)}`}>
                                                    {attr.courses?.statut || 'N/A'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center text-slate-300">
                                        <span className="material-symbols-outlined text-5xl mb-3 block">history_toggle_off</span>
                                        <p className="text-sm font-medium">Aucune course trouvée</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination && pagination.last_page > 1 && (
                    <div className="px-6 py-4 bg-slate-50 flex items-center justify-between border-t border-slate-100">
                        <span className="text-xs font-medium text-slate-400">
                            Affichage {pagination.from}–{pagination.to} sur {pagination.total} courses
                        </span>
                        <div className="flex gap-2">
                            {pagination.links.map((link: any, i: number) => (
                                <button
                                    key={i}
                                    onClick={() => handlePageChange(link.url)}
                                    disabled={!link.url}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                                        link.active
                                            ? 'bg-emerald-700 text-white'
                                            : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                                    } ${!link.url ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </ContributorLayout>
    );
};

export default ContributorRides;
