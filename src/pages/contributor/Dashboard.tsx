import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ContributorLayout from '../../components/contributor/ContributorLayout';
import ApiService from '../../services/ApiService';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer
} from 'recharts';
import type { TooltipProps } from 'recharts';

interface ContributorDashboardProps {
    onLogout: () => void;
    user: any;
}

const ContributorDashboard: React.FC<ContributorDashboardProps> = ({ onLogout, user }) => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const api = new ApiService();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.getData(`utilisateur/get-contributor-stats?user_id=${user.id}`);
                if (res.data.success) {
                    setStats(res.data.data);
                }
            } catch (error) {
                console.error('Error fetching contributor stats:', error);
            } finally {
                setLoading(false);
            }
        };
        if (user?.id) fetchStats();
    }, [user?.id]);

    const latestCourse = stats?.latest_course;

    const statusColor = (statut: string) => {
        if (statut === 'LIBRE') return 'bg-emerald-100 text-emerald-700';
        if (statut === 'OCCUPE') return 'bg-blue-100 text-blue-700';
        if (statut === 'INACTIF') return 'bg-slate-100 text-slate-500';
        return 'bg-amber-100 text-amber-700';
    };

    const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl border border-slate-700">
                    <p className="opacity-80 mb-1 tracking-wider uppercase">{label}</p>
                    <p className="text-emerald-400 text-sm">{payload[0].value?.toLocaleString('fr-FR')} FCFA</p>
                </div>
            );
        }
        return null;
    };

    return (
        <ContributorLayout user={user} onLogout={onLogout}>
            {/* Header */}
            <div className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-0">
                <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-emerald-800 tracking-tight mb-1">
                        Contributor Dashboard
                    </h2>
                    <p className="text-slate-500 font-medium text-sm md:text-base">
                        Bienvenue, <span className="text-slate-700 font-semibold">{user?.nom}</span>. Voici l'état de votre flotte aujourd'hui.
                    </p>
                </div>
                <Link
                    to="/contributor/rides"
                    className="w-full md:w-auto justify-center bg-gradient-to-br from-emerald-700 to-emerald-500 text-white px-6 py-3 rounded-xl md:rounded-full flex items-center gap-2 font-semibold text-sm shadow-lg hover:opacity-90 transition-opacity active:scale-95"
                >
                    <span className="material-symbols-outlined text-lg">receipt_long</span>
                    Voir les courses
                </Link>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-10">
                {/* Balance */}
                <div className="sm:col-span-2 bg-gradient-to-br from-emerald-800 to-emerald-600 p-5 md:p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-emerald-200 font-semibold text-[10px] md:text-xs uppercase tracking-wider mb-1">Solde Actuel</p>
                            {loading ? (
                                <div className="h-10 w-32 md:w-40 bg-white/20 rounded-lg animate-pulse mt-1"/>
                            ) : (
                                <h3 className="text-3xl md:text-4xl font-extrabold flex items-baseline flex-wrap">
                                    {Number(stats?.balance || user?.balance || 0).toLocaleString('fr-FR')}
                                    <span className="text-sm md:text-lg font-bold opacity-70 ml-1">FCFA</span>
                                </h3>
                            )}
                        </div>
                        <div className="hidden sm:block bg-white/15 p-3 rounded-xl">
                            <span className="material-symbols-outlined text-white text-3xl">account_balance_wallet</span>
                        </div>
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-emerald-200 text-sm font-semibold">
                        <span className="material-symbols-outlined text-sm">trending_up</span>
                        <span>Mise à jour en temps réel</span>
                    </div>
                </div>

                {/* Total Courses */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="bg-emerald-50 w-12 h-12 flex items-center justify-center rounded-xl mb-4">
                        <span className="material-symbols-outlined text-emerald-700 text-2xl">receipt_long</span>
                    </div>
                    <p className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-1">Total Courses</p>
                    {loading ? (
                        <div className="h-8 w-20 bg-slate-100 rounded animate-pulse"/>
                    ) : (
                        <h3 className="text-3xl font-extrabold text-slate-800">{stats?.total_courses || 0}</h3>
                    )}
                    <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-3/4 rounded-full"/>
                    </div>
                </div>

                {/* Total Vehicles */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="bg-blue-50 w-12 h-12 flex items-center justify-center rounded-xl mb-4">
                        <span className="material-symbols-outlined text-blue-600 text-2xl">directions_car</span>
                    </div>
                    <p className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-1">Mes Véhicules</p>
                    {loading ? (
                        <div className="h-8 w-20 bg-slate-100 rounded animate-pulse"/>
                    ) : (
                        <h3 className="text-3xl font-extrabold text-slate-800">{stats?.vehicle_count || 0}</h3>
                    )}
                    <Link to="/contributor/vehicles" className="mt-4 text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                        Voir tout <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </Link>
                </div>
            </div>

            {/* Main Content: Weekly chart + Latest ride */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-10">
                {/* Weekly Earnings */}
                <div className="lg:col-span-2 bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-slate-100 min-h-[350px] md:min-h-[400px]">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
                        <div>
                            <h4 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">Revenus Hebdomadaires</h4>
                            <p className="text-[10px] md:text-sm text-slate-400">Aperçu des 7 derniers jours</p>
                        </div>
                        <div className="sm:text-right">
                            <p className="text-[10px] md:text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Revenue</p>
                            {loading ? (
                                <div className="h-6 w-24 md:w-28 bg-slate-100 rounded animate-pulse mt-1"/>
                            ) : (
                                <p className="text-base md:text-lg font-extrabold text-emerald-700">
                                    {Number(stats?.total_revenue || 0).toLocaleString('fr-FR')} FCFA
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="h-64 px-2 mt-4">
                        {loading ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats?.chart_data || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#059669" stopOpacity={1}/>
                                            <stop offset="95%" stopColor="#34d399" stopOpacity={0.8}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                        dy={10}
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                        tickFormatter={(value) => value > 0 ? `${(value / 1000).toFixed(0)}k` : '0'}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', radius: 8 }} />
                                    <Bar 
                                        dataKey="revenue" 
                                        fill="url(#colorRevenue)" 
                                        radius={[6, 6, 0, 0]} 
                                        barSize={30}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Latest Course */}
                <div className="lg:col-span-1 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-xl font-bold text-slate-800 tracking-tight">Dernière Course</h4>
                        <Link className="text-emerald-600 text-xs font-bold hover:underline" to="/contributor/rides">
                            Voir tout
                        </Link>
                    </div>
                    {loading ? (
                        <div className="space-y-4">
                            {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse"/>)}
                        </div>
                    ) : latestCourse ? (
                        <div className="bg-slate-50 p-5 rounded-xl space-y-5">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden text-slate-400">
                                    {latestCourse.courses?.client?.photo ? (
                                        <img alt="Client" className="w-full h-full object-cover" src={latestCourse.courses.client.photo}/>
                                    ) : (
                                        <span className="material-symbols-outlined text-2xl">person</span>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Client</p>
                                    <p className="text-base font-bold text-slate-800">
                                        {latestCourse.courses?.client?.nom} {latestCourse.courses?.client?.prenom}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="flex flex-col items-center gap-1 py-1">
                                    <div className="w-2.5 h-2.5 rounded-full border-2 border-emerald-600"/>
                                    <div className="w-px h-8 bg-slate-200 border-dashed"/>
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-600"/>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Départ</p>
                                        <p className="text-sm font-medium text-slate-700 truncate max-w-[160px]">
                                            {latestCourse.courses?.lieu_depart}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Arrivée</p>
                                        <p className="text-sm font-medium text-slate-700 truncate max-w-[160px]">
                                            {latestCourse.courses?.lieu_arrive}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Montant</p>
                                    <p className="text-base md:text-lg font-extrabold text-emerald-700 break-words line-clamp-1">
                                        {latestCourse.courses?.montant || '—'} FCFA
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Statut</p>
                                    <span className={`px-2 md:px-3 py-1 rounded-full text-[9px] md:text-[10px] font-bold uppercase whitespace-nowrap ${
                                        latestCourse.courses?.statut === 'TERMINEE'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {latestCourse.courses?.statut}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-300">
                            <span className="material-symbols-outlined text-5xl mb-3">history</span>
                            <p className="text-sm font-medium">Aucune course récente</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Vehicle Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative">
                <div className="px-5 md:px-8 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                        <h4 className="text-base md:text-lg font-bold text-slate-800">Performance par Véhicule</h4>
                        <p className="text-[10px] md:text-xs text-slate-400 font-medium">Détail de chaque véhicule sous votre contribution</p>
                    </div>
                    <Link to="/contributor/vehicles" className="text-emerald-600 text-[10px] md:text-xs font-bold hover:underline flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-full shrink-0">
                        Gérer <span className="material-symbols-outlined text-[10px] md:text-xs">arrow_forward</span>
                    </Link>
                </div>
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Véhicule</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Chauffeur</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Statut</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Courses</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Revenus (80%)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-5">
                                            <div className="h-5 bg-slate-100 rounded w-full"/>
                                        </td>
                                    </tr>
                                ))
                            ) : stats?.vehicle_breakdown?.length > 0 ? (
                                stats.vehicle_breakdown.map((v: any) => (
                                    <tr key={v.vehicle_id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-slate-800">{v.matricule}</p>
                                            <p className="text-xs text-slate-400">{v.modele}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {v.driver ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold overflow-hidden">
                                                        {v.driver.photo ? (
                                                            <img src={v.driver.photo} className="w-full h-full object-cover" alt=""/>
                                                        ) : (
                                                            (v.driver.nom?.[0] || '?')
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-700">{v.driver.nom} {v.driver.prenom}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-xs italic">Non assigné</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusColor(v.statut)}`}>
                                                {v.statut}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-slate-800">{v.total_rides}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-emerald-700">
                                                {Number(v.total_revenue).toLocaleString('fr-FR')} FCFA
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-slate-300">
                                        <span className="material-symbols-outlined text-4xl mb-2 block">garage</span>
                                        <p className="text-sm">Aucun véhicule trouvé</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </ContributorLayout>
    );
};

export default ContributorDashboard;
