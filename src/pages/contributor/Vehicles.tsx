import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ContributorLayout from '../../components/contributor/ContributorLayout';
import ApiService from '../../services/ApiService';

interface ContributorVehiclesProps {
    onLogout: () => void;
    user: any;
}

const ContributorVehicles: React.FC<ContributorVehiclesProps> = ({ onLogout, user }) => {
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<any>(null);
    const api = new ApiService();

    const fetchVehicles = async (url = `utilisateur/get-contributor-vehicles?user_id=${user.id}`) => {
        setLoading(true);
        try {
            const res = await api.getData(url);
            if (res.data.success) {
                setVehicles(res.data.data.data);
                setPagination(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching contributor vehicles:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) fetchVehicles();
    }, [user?.id]);

    const handlePageChange = (url: string) => {
        if (url) {
            const pageParam = url.split('?')[1];
            fetchVehicles(`utilisateur/get-contributor-vehicles?user_id=${user.id}&${pageParam}`);
        }
    };

    const statusBadge = (statut: string) => {
        const map: Record<string, string> = {
            LIBRE: 'bg-emerald-100 text-emerald-700',
            OCCUPE: 'bg-blue-100 text-blue-700',
            INACTIF: 'bg-slate-100 text-slate-500',
        };
        return map[statut] || 'bg-amber-100 text-amber-700';
    };

    const statusDot = (statut: string) => {
        const map: Record<string, string> = {
            LIBRE: 'bg-emerald-500',
            OCCUPE: 'bg-blue-500',
            INACTIF: 'bg-slate-400',
        };
        return map[statut] || 'bg-amber-400';
    };

    return (
        <ContributorLayout user={user} onLogout={onLogout}>
            {/* Header */}
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-extrabold text-emerald-800 tracking-tight mb-1">Mes Véhicules</h2>
                    <p className="text-slate-500 font-medium">
                        Détail et performance de chaque véhicule sous votre contribution.
                    </p>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"/>Libre
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"/>Occupé
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"/>Inactif
                    </span>
                </div>
            </div>

            {/* Vehicle Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-black text-slate-400 tracking-widest uppercase">Véhicule</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 tracking-widest uppercase">Matricule</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 tracking-widest uppercase">Chauffeur</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 tracking-widest uppercase">Catégorie</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 tracking-widest uppercase">Statut</th>
                                <th className="px-6 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse bg-white">
                                        <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-32"></div></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-16"></div></td>
                                        <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-16"></div></td>
                                        <td className="px-6 py-5"></td>
                                    </tr>
                                ))
                            ) : vehicles.length > 0 ? (
                                vehicles.map((v: any) => (
                                    <tr key={v.vehicle_id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 text-emerald-600">
                                                    <span className="material-symbols-outlined text-xl">local_taxi</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 leading-none">{v.modele || 'N/A'}</p>
                                                    <p className="text-xs text-slate-400 font-semibold uppercase mt-1">{v.color || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 font-mono text-sm font-bold text-emerald-700">
                                            {v.matricule || '---'}
                                        </td>
                                        <td className="px-6 py-5">
                                            {v.driver ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold overflow-hidden">
                                                        {v.driver.photo ? (
                                                            <img src={v.driver.photo} className="w-full h-full object-cover" alt="Driver"/>
                                                        ) : (
                                                            (v.driver.nom?.[0] || '?')
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-bold text-slate-700 block leading-tight">{v.driver.nom} {v.driver.prenom}</span>
                                                        {v.driver.telephone && <span className="text-[10px] text-slate-400 font-semibold inline-block mt-0.5">{v.driver.telephone}</span>}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs italic text-slate-400">Non assigné</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-sm font-bold text-slate-700">
                                            {v.categorie?.libelle || v.categorie?.name || 'Standard'}
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                v.statut === 'OCCUPE' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${v.statut === 'OCCUPE' ? 'bg-blue-600' : 'bg-emerald-600'}`}></span>
                                                {v.statut || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <Link 
                                                to={`/contributor/vehicles/${v.vehicle_id}`}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 rounded-lg text-xs font-bold transition-all shadow-sm"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">visibility</span>
                                                Détails
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-300">
                                        <span className="material-symbols-outlined text-6xl mb-4 block opacity-20">garage</span>
                                        <p className="text-lg font-semibold text-slate-400">Aucun véhicule trouvé</p>
                                        <p className="text-sm">Aucune contribution enregistrée pour votre compte.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {pagination && pagination.last_page > 1 && (
                <div className="mt-8 px-6 py-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">
                        Affichage {pagination.from}–{pagination.to} sur {pagination.total} véhicules
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
        </ContributorLayout>
    );
};

export default ContributorVehicles;
