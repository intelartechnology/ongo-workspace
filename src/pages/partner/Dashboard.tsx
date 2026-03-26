import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PartnerLayout from '../../components/partner/PartnerLayout';
import ApiService from '../../services/ApiService';

interface PartnerDashboardProps {
    onLogout: () => void;
    user: any;
}

const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ onLogout, user }) => {
    const [partnerDetails, setPartnerDetails] = useState<any>(null);
    const [partnerStats, setPartnerStats] = useState<any>(null);
    const api = new ApiService();

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const [detailsRes, statsRes] = await Promise.all([
                    api.getData(`utilisateur/partner-detail?user_id=${user.id}`),
                    api.getData(`utilisateur/get-partner-stats?user_id=${user.id}`)
                ]);

                if (detailsRes.data.success) {
                    setPartnerDetails(detailsRes.data.data);
                }
                if (statsRes.data.success) {
                    setPartnerStats(statsRes.data.data);
                }
            } catch (error) {
                console.error("Error fetching partner data:", error);
            }
        };

        if (user?.id) {
            fetchAllData();
        }
    }, [user?.id]);

    const totalVehicles = partnerDetails?.myfleets?.length || 0;
    const activeVehicles = partnerDetails?.myfleets?.filter((f: any) => f.vehicle?.statut === 'OCCUPE').length || 0;
    const latestCourse = partnerStats?.latest_course;

    return (
        <PartnerLayout user={user} onLogout={onLogout}>
            {/* Header Section */}
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-extrabold text-[#00327d] tracking-tight mb-1">Partner Dashboard</h2>
                    <p className="text-[#434653] font-medium">Welcome back, {user?.nom}. Here is what's happening today.</p>
                </div>
                <button className="bg-gradient-to-br from-[#00327d] to-[#0047ab] text-white px-6 py-3 rounded-full flex items-center gap-2 font-semibold text-sm shadow-lg hover:opacity-90 transition-opacity active:scale-95">
                    <span className="material-symbols-outlined text-lg">add</span>
                    Add New Asset
                </button>
            </div>

            {/* Bento Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                {/* Large Metric: Balance */}
                <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-[#c3c6d5]/15 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[#434653] font-semibold text-xs uppercase tracking-wider mb-1">Current Balance</p>
                            <h3 className="text-4xl font-extrabold text-[#00327d]">
                                {user?.balance || '0'} <span className="text-lg font-bold opacity-70">FCFA</span>
                            </h3>
                        </div>
                        <div className="bg-[#0047ab]/10 p-3 rounded-xl">
                            <span className="material-symbols-outlined text-[#00327d] text-3xl">account_balance_wallet</span>
                        </div>
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-emerald-600 text-sm font-bold">
                        <span className="material-symbols-outlined text-sm">trending_up</span>
                        <span>Update in real-time</span>
                    </div>
                </div>

                {/* Metric: Courses */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-[#c3c6d5]/15">
                    <div className="bg-[#dae2ff] w-12 h-12 flex items-center justify-center rounded-xl mb-4">
                        <span className="material-symbols-outlined text-[#4e5e85] text-2xl">school</span>
                    </div>
                    <p className="text-[#434653] font-semibold text-xs uppercase tracking-wider mb-1">Total Courses</p>
                    <h3 className="text-3xl font-extrabold text-[#191b22]">{partnerStats?.total_courses || 0}</h3>
                    <div className="mt-4 h-1 w-full bg-[#f3f3fc] rounded-full overflow-hidden">
                        <div className="h-full bg-[#4e5e85] w-3/4 rounded-full"></div>
                    </div>
                </div>

                {/* Metric: Vehicles */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-[#c3c6d5]/15">
                    <div className="bg-[#ffdbcf] w-12 h-12 flex items-center justify-center rounded-xl mb-4">
                        <span className="material-symbols-outlined text-[#651f00] text-2xl">directions_car</span>
                    </div>
                    <p className="text-[#434653] font-semibold text-xs uppercase tracking-wider mb-1">Total Vehicles</p>
                    <h3 className="text-3xl font-extrabold text-[#191b22]">{totalVehicles}</h3>
                    <p className="mt-4 text-xs font-medium text-[#434653]">{totalVehicles > 0 ? Math.round((activeVehicles/totalVehicles)*100) : 0}% Active fleet</p>
                </div>
            </div>

            {/* Main Content Area: Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Earnings Chart */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-[#c3c6d5]/15 min-h-[400px]">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h4 className="text-xl font-bold text-[#191b22] tracking-tight">Weekly Earnings</h4>
                                <p className="text-sm text-[#434653]">Performance overview for the last 7 days</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="px-4 py-1.5 text-xs font-bold rounded-full bg-[#f3f3fc] text-[#434653]">Daily</button>
                                <button className="px-4 py-1.5 text-xs font-bold rounded-full bg-[#00327d] text-white">Weekly</button>
                            </div>
                        </div>
                        {/* Mock Chart Representation */}
                        <div className="h-64 flex items-end justify-between gap-4 px-2">
                            {(partnerStats?.chart_data || [0, 0, 0, 0, 0, 0, 0]).map((val: number, i: number) => {
                                const max = Math.max(...(partnerStats?.chart_data || [100]));
                                const h = max > 0 ? (val / max) * 100 : 0;
                                return (
                                <div key={i} className="flex flex-col items-center gap-3 w-full">
                                    <div 
                                        className={`w-full rounded-t-lg transition-colors cursor-pointer relative group ${i === new Date().getDay() - 1 ? 'bg-[#00327d]' : 'bg-[#e7e7f0] hover:bg-[#00327d]/20'}`}
                                        style={{ height: `${h || 5}%` }}
                                        title={`${val} FCFA`}
                                    ></div>
                                    <span className="text-xs font-bold text-[#434653]">
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                                    </span>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Dernière Course Section */}
                <div className="lg:col-span-1">
                    <div className="bg-white h-full p-8 rounded-xl shadow-sm border border-[#c3c6d5]/15">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-xl font-bold text-[#191b22] tracking-tight">Dernière Course</h4>
                            <Link className="text-[#00327d] text-xs font-bold hover:underline" to="/partner/courses">See all</Link>
                        </div>
                        {/* Course Detail Card */}
                        {latestCourse ? (
                        <div className="bg-[#f3f3fc] p-5 rounded-xl space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-[#c3c6d5]/10 shadow-sm overflow-hidden text-slate-400">
                                    {latestCourse.courses.client?.photo ? (
                                        <img alt="Client Avatar" className="w-full h-full object-cover" src={latestCourse.courses.client.photo} />
                                    ) : (
                                        <span className="material-symbols-outlined text-2xl">person</span>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-[#434653] uppercase tracking-tighter">Client</p>
                                    <p className="text-base font-bold text-[#191b22]">{latestCourse.courses.client?.nom} {latestCourse.courses.client?.prenom}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex flex-col items-center gap-1 py-1">
                                        <div className="w-2.5 h-2.5 rounded-full border-2 border-[#00327d]"></div>
                                        <div className="w-px h-full bg-[#c3c6d5] border-dashed"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#00327d]"></div>
                                    </div>
                                    <div className="flex flex-col gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-[#434653] uppercase">Pickup</p>
                                            <p className="text-sm font-medium text-[#191b22] truncate max-w-[150px]">{latestCourse.courses.lieu_depart}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-[#434653] uppercase">Dropoff</p>
                                            <p className="text-sm font-medium text-[#191b22] truncate max-w-[150px]">{latestCourse.courses.lieu_arrive}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-[#c3c6d5]/20 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-bold text-[#434653] uppercase">Amount</p>
                                    <p className="text-lg font-extrabold text-[#00327d]">{latestCourse.courses.montant} FCFA</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-[#434653] uppercase mb-1">Status</p>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${latestCourse.courses.statut === 'TERMINEE' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {latestCourse.courses.statut}
                                    </span>
                                </div>
                            </div>
                        </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                <span className="material-symbols-outlined text-4xl mb-2">history</span>
                                <p className="text-sm">Aucune course récente</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
          
        </PartnerLayout>
    );
};

export default PartnerDashboard;
