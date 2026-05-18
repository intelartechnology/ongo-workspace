import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PartnerLayout from '../../components/partner/PartnerLayout';
import ApiService from '../../services/ApiService';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Cell
} from 'recharts';

interface PartnerDashboardProps {
    onLogout: () => void;
    user: any;
}

const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ onLogout, user }) => {
    const [partnerDetails, setPartnerDetails] = useState<any>(null);
    const [partnerStats, setPartnerStats] = useState<any>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<string>('weekly');
    const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
    const api = new ApiService();

    const fetchStats = async (period: string) => {
        setIsLoadingStats(true);
        try {
            const statsRes = await api.getData(`utilisateur/get-partner-stats?user_id=${user.id}&period=${period}`);
            if (statsRes.data.success) {
                setPartnerStats(statsRes.data.data);
            }
        } catch (error) {
            console.error("Error fetching partner stats:", error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const detailsRes = await api.getData(`utilisateur/partner-detail?user_id=${user.id}`);
                if (detailsRes.data.success) {
                    setPartnerDetails(detailsRes.data.data);
                }
            } catch (error) {
                console.error("Error fetching partner details:", error);
            }
        };

        if (user?.id) {
            fetchDetails();
            fetchStats(selectedPeriod);
        }
    }, [user?.id]);

    useEffect(() => {
        if (user?.id) {
            fetchStats(selectedPeriod);
        }
    }, [selectedPeriod]);

    const totalVehicles = partnerDetails?.myfleets?.length || 0;
    const activeVehicles = partnerDetails?.myfleets?.filter((f: any) => f.vehicle?.statut === 'OCCUPE').length || 0;
    const latestCourse = partnerStats?.latest_course;

    // Transform data for Recharts
    const chartData = (partnerStats?.chart_data || []).map((val: number, i: number) => ({
        name: partnerStats?.labels?.[i] || '',
        value: val
    }));

    const balanceData = (partnerStats?.balance_chart || []).map((item: any) => ({
        name: item.driver,
        value: item.balance,
        matricule: item.matricule
    }));

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#191b22] px-4 py-3 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-md">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-sm font-black text-white">
                        {payload[0].value?.toLocaleString()} <span className="text-[10px] opacity-50">FCFA</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    const periods = [
        { id: 'daily', label: 'Daily' },
        { id: 'weekly', label: 'Weekly' },
        { id: 'monthly', label: 'Monthly' },
        { id: 'yearly', label: 'Yearly' },
    ];

    return (
        <PartnerLayout user={user} onLogout={onLogout}>
            {/* Header Section */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-[#00327d] tracking-tight mb-1">Partner Dashboard</h2>
                    <p className="text-[#434653] font-medium text-sm">Welcome back, {user?.nom}. Performance overview for your fleet.</p>
                </div>
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-[#c3c6d5]/15">
                   {periods.map(p => (
                       <button 
                        key={p.id}
                        onClick={() => setSelectedPeriod(p.id)}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${selectedPeriod === p.id ? 'bg-[#00327d] text-white shadow-md' : 'text-[#434653] hover:bg-[#f3f3fc]'}`}
                       >
                           {p.label}
                       </button>
                   ))}
                </div>
            </div>

            {/* Bento Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                {/* Large Metric: Balance */}
                <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-[#c3c6d5]/15 flex flex-col justify-between group hover:border-[#00327d]/30 transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[#434653] font-semibold text-[10px] uppercase tracking-widest mb-1 opacity-70">Total Revenue</p>
                            <h3 className="text-4xl font-black text-[#00327d]">
                                {partnerStats?.total_revenue?.toLocaleString() || '0'} <span className="text-lg font-bold opacity-30">FCFA</span>
                            </h3>
                        </div>
                        <div className="bg-[#0047ab]/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-[#00327d] text-3xl">payments</span>
                        </div>
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-emerald-600 text-[11px] font-bold bg-emerald-50 w-fit px-3 py-1 rounded-full">
                        <span className="material-symbols-outlined text-sm">trending_up</span>
                        <span>Update in real-time</span>
                    </div>
                </div>

                {/* Metric: Courses */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#c3c6d5]/15 hover:border-[#00327d]/30 transition-colors">
                    <div className="bg-[#dae2ff] w-12 h-12 flex items-center justify-center rounded-2xl mb-4">
                        <span className="material-symbols-outlined text-[#4e5e85] text-2xl">route</span>
                    </div>
                    <p className="text-[#434653] font-semibold text-[10px] uppercase tracking-widest mb-1 opacity-70">Total Courses</p>
                    <h3 className="text-3xl font-black text-[#191b22]">{partnerStats?.total_courses || 0}</h3>
                    <div className="mt-4 h-1.5 w-full bg-[#f3f3fc] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#4e5e85] to-[#00327d] w-3/4 rounded-full"></div>
                    </div>
                </div>

                {/* Metric: Vehicles */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#c3c6d5]/15 hover:border-[#00327d]/30 transition-colors">
                    <div className="bg-[#ffdbcf] w-12 h-12 flex items-center justify-center rounded-2xl mb-4">
                        <span className="material-symbols-outlined text-[#651f00] text-2xl">local_taxi</span>
                    </div>
                    <p className="text-[#434653] font-semibold text-[10px] uppercase tracking-widest mb-1 opacity-70">Fleet Size</p>
                    <h3 className="text-3xl font-black text-[#191b22]">{totalVehicles}</h3>
                    <p className="mt-4 text-[10px] font-bold text-[#434653] bg-[#f3f3fc] px-2 py-1 rounded-md w-fit">
                        {totalVehicles > 0 ? Math.round((activeVehicles/totalVehicles)*100) : 0}% Active right now
                    </p>
                </div>
            </div>

            {/* Charts & Details Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Earnings Chart Card */}
                <div className="lg:col-span-2">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#c3c6d5]/15 min-h-[420px] relative overflow-hidden">
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <h4 className="text-xl font-black text-[#191b22] tracking-tight capitalize">{selectedPeriod} Earnings</h4>
                                <p className="text-sm text-[#434653] font-medium opacity-70">Income distribution over the selected interval</p>
                            </div>
                            <div className="bg-[#f3f3fc] p-2 rounded-lg">
                                <span className="material-symbols-outlined text-[#00327d] text-xl">analytics</span>
                            </div>
                        </div>

                        {isLoadingStats ? (
                            <div className="h-64 flex items-center justify-center">
                                <div className="w-10 h-10 border-4 border-[#00327d]/20 border-t-[#00327d] rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00327d" stopOpacity={1}/>
                                                <stop offset="95%" stopColor="#00a3ff" stopOpacity={0.8}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#c3c6d5" opacity={0.1} />
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#434653', fontSize: 10, fontWeight: 900 }}
                                            dy={10}
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fill: '#434653', fontSize: 10, fontWeight: 900 }}
                                        />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f3fc', radius: 8 }} />
                                        <Bar 
                                            dataKey="value" 
                                            fill="url(#colorValue)" 
                                            radius={[6, 6, 0, 0]} 
                                            barSize={selectedPeriod === 'daily' ? 15 : undefined}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* Latest Course Column */}
                <div className="lg:col-span-1">
                    <div className="bg-white h-full p-8 rounded-2xl shadow-sm border border-[#c3c6d5]/15">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-xl font-black text-[#191b22] tracking-tight">Latest Course</h4>
                            <Link className="text-[#00327d] text-xs font-black hover:underline px-3 py-1 bg-[#f3f3fc] rounded-lg" to="/partner/courses">View All</Link>
                        </div>
                        {latestCourse ? (
                            <div className="bg-[#f3f3fc]/50 border border-[#c3c6d5]/10 p-5 rounded-2xl relative">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-[#c3c6d5]/20 shadow-sm overflow-hidden p-0.5">
                                        {latestCourse.courses.client?.photo ? (
                                            <img alt="Client" className="w-full h-full object-cover rounded-xl" src={latestCourse.courses.client.photo} />
                                        ) : (
                                            <div className="bg-[#dae2ff] w-full h-full flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[#00327d]">person</span>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-[#434653] uppercase opacity-50">Customer</p>
                                        <p className="text-base font-black text-[#191b22]">{latestCourse.courses.client?.nom} {latestCourse.courses.client?.prenom}</p>
                                    </div>
                                </div>
                                <div className="space-y-4 mb-6 relative">
                                    <div className="absolute left-1 top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#00327d] to-[#c3c6d5] border-dashed"></div>
                                    <div className="pl-6 relative">
                                        <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-white border-2 border-[#00327d]"></div>
                                        <p className="text-[9px] font-black text-[#434653] uppercase opacity-50">Origin</p>
                                        <p className="text-xs font-bold text-[#191b22] truncate">{latestCourse.courses.lieu_depart}</p>
                                    </div>
                                    <div className="pl-6 relative">
                                        <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-[#00327d]"></div>
                                        <p className="text-[9px] font-black text-[#434653] uppercase opacity-50">Destination</p>
                                        <p className="text-xs font-bold text-[#191b22] truncate">{latestCourse.courses.lieu_arrive}</p>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-[#c3c6d5]/20 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-black text-[#434653] uppercase opacity-50">Earning</p>
                                        <p className="text-lg font-black text-[#00327d]">{(latestCourse.courses.montant * 0.8).toLocaleString()} FCFA</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${latestCourse.courses.statut === 'TERMINEE' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {latestCourse.courses.statut}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-[#f3f3fc]/30 rounded-2xl border border-dashed border-[#c3c6d5]">
                                <span className="material-symbols-outlined text-4xl mb-2 opacity-20">history</span>
                                <p className="text-xs font-bold opacity-40 uppercase tracking-widest">No recent data</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Second Chart: Fleet Driver Balances */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#c3c6d5]/15">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h4 className="text-xl font-black text-[#191b22] tracking-tight">Driver Balances Overview</h4>
                        <p className="text-sm text-[#434653] font-medium opacity-70">Current wallet status across all active drivers</p>
                    </div>
                    <div className="bg-[#ffdbcf] p-2 rounded-lg">
                        <span className="material-symbols-outlined text-[#651f00] text-xl">account_balance</span>
                    </div>
                </div>

                <div className="h-80 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                            data={balanceData} 
                            layout="vertical" 
                            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#c3c6d5" opacity={0.1} />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                axisLine={false} 
                                tickLine={false}
                                tick={{ fill: '#191b22', fontSize: 10, fontWeight: 900 }}
                                width={100}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f3fc', radius: 8 }} />
                            <Bar 
                                dataKey="value" 
                                fill="#00327d" 
                                radius={[0, 4, 4, 0]}
                                barSize={20}
                            >
                                {balanceData.map((_: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#00327d' : '#00a3ff'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    
                    {(!partnerStats?.balance_chart || partnerStats.balance_chart.length === 0) && (
                        <div className="py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest opacity-30">
                            No active drivers found in fleet
                        </div>
                    )}
                </div>
            </div>
        </PartnerLayout>
    );
};

export default PartnerDashboard;
