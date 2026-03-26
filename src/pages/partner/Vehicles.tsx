import React, { useState, useEffect } from 'react';
import PartnerLayout from '../../components/partner/PartnerLayout';
import ApiService from '../../services/ApiService';

interface PartnerVehiclesProps {
    onLogout: () => void;
    user: any;
}

const PartnerVehicles: React.FC<PartnerVehiclesProps> = ({ onLogout, user }) => {
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ total: 0, inService: 0, free: 0, balance: 0 });
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<any>(null);
    const api = new ApiService();

    const fetchVehicles = async (url = `utilisateur/get-partner-vehicles?user_id=${user.id}`) => {
        setLoading(true);
        try {
            const response = await api.getData(url);
            if (response.data.success) {
                setVehicles(response.data.data.data);
                setPagination(response.data.data);
                if (response.data.stats) {
                    setStats(response.data.stats);
                }
            }
        } catch (error) {
            console.error("Error fetching partner vehicles:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) {
            fetchVehicles();
        }
    }, [user?.id]);

    const handlePageChange = (url: string) => {
        if (url) {
            const pageParam = url.split('?')[1];
            fetchVehicles(`utilisateur/get-partner-vehicles?user_id=${user.id}&${pageParam}`);
        }
    };

    return (
        <PartnerLayout user={user} onLogout={onLogout}>
            {/* Page Header */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-3xl font-extrabold text-[#00327d] tracking-tight font-headline uppercase leading-none">Partner Vehicles</h2>
                    <p className="text-on-surface-variant mt-2 font-body font-medium">Manage your fleet, track driver status, and monitor performance.</p>
                </div>
            
            </div>

            {/* Stats/Summary Grid (Bento Style) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-surface-container-low p-6 rounded-xl flex flex-col justify-between">
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Fleet</span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-4xl font-extrabold text-primary">{stats.total}</span>
                        <span className="text-[10px] text-slate-400 font-bold tracking-tight">Vehicles</span>
                    </div>
                </div>
                <div className="bg-surface-container-low p-6 rounded-xl flex flex-col justify-between">
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">En service</span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-4xl font-extrabold text-primary">{stats.inService}</span>
                        <span className="text-[10px] text-slate-400 font-bold tracking-tight">{Math.round((stats.inService / stats.total) * 100 || 0)}% active</span>
                    </div>
                </div>
                <div className="bg-surface-container-low p-6 rounded-xl flex flex-col justify-between border-2 border-primary/5">
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Libre</span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-4xl font-extrabold text-primary">{stats.free}</span>
                        <span className="text-[10px] text-blue-500 font-bold tracking-tight">Ready to assign</span>
                    </div>
                </div>
                <div className="bg-primary text-white p-6 rounded-xl flex flex-col justify-between shadow-xl shadow-primary/10">
                    <span className="text-blue-200 text-[10px] font-black uppercase tracking-widest">Total Balance</span>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-extrabold">{stats.balance.toLocaleString()}</span>
                        <span className="text-[10px] text-blue-200 font-bold tracking-tight">XAF</span>
                    </div>
                </div>
            </div>

            {/* Filters & Table Container */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm ring-1 ring-outline-variant/10">
                {/* Modern Data Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-container-low/50 border-b border-outline-variant/10">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Vehicle</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">License Plate</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Driver</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-container font-body">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-10 h-16 bg-slate-50/50"></td>
                                    </tr>
                                ))
                            ) : vehicles.length > 0 ? (
                                vehicles.map((fleet: any) => {
                                    const v = fleet.vehicle;
                                    const d = v?.chauffeur;
                                    return (
                                        <tr key={fleet.id} className="hover:bg-surface-container-low/30 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container-low flex-shrink-0 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-primary text-2xl">local_taxi</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-on-surface leading-none">{v?.modele || 'Unknown'}</p>
                                                        <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest mt-1.5 opacity-60">
                                                            {v?.color || 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 font-mono text-xs font-black text-primary tracking-widest">
                                                {v?.matricule || '---'}
                                            </td>
                                            <td className="px-6 py-5">
                                                {d ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[10px] font-black">
                                                            {d.nom?.[0]}{d.prenom?.[0]}
                                                        </div>
                                                        <span className="text-sm font-bold text-on-surface">{d.nom} {d.prenom}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs italic text-on-surface-variant/50">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-sm font-bold text-on-surface">
                                                    {v?.categorie?.libelle || 'Standard'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    v?.statut === 'OCCUPE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${v?.statut === 'OCCUPE' ? 'bg-green-600' : 'bg-blue-600'}`}></span>
                                                    {v?.statut || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                                                    <span className="material-symbols-outlined">more_vert</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-300">
                                        <span className="material-symbols-outlined text-6xl mb-4 block opacity-20">directions_car</span>
                                        <p className="font-headline font-bold text-lg">Aucun véhicule trouvé</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer / Pagination */}
                {pagination && pagination.last_page > 1 && (
                    <div className="p-6 bg-surface-container-low/30 border-t border-surface-container flex flex-wrap gap-4 items-center justify-between">
                        <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest opacity-60">
                            Affichage {pagination.from}-{pagination.to} sur {pagination.total}
                        </div>
                        <div className="flex gap-1">
                            {pagination.links.map((link: any, i: number) => (
                                <button
                                    key={i}
                                    onClick={() => handlePageChange(link.url)}
                                    disabled={!link.url}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs transition-colors ${
                                        link.active 
                                        ? 'bg-primary text-white' 
                                        : 'bg-white text-on-surface-variant border border-outline-variant/20 hover:bg-slate-50'
                                    } ${!link.url ? 'opacity-30' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

          
        </PartnerLayout>
    );
};


export default PartnerVehicles;
