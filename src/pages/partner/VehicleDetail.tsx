import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PartnerLayout from '../../components/partner/PartnerLayout';
import ApiService from '../../services/ApiService';

interface VehicleDetailProps {
    onLogout: () => void;
    user: any;
}

const VehicleDetail: React.FC<VehicleDetailProps> = ({ onLogout, user }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [fleet, setFleet] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('chauffeur');
    const [coursePagination, setCoursePagination] = useState<any>(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const api = new ApiService();

    const fetchDetail = async (page: number = 1) => {
        if (page === 1) setLoading(true);
        try {
            let url = `utilisateur/get-partner-vehicle-details/${id}?user_id=${user.id}&page=${page}`;
            if (filterStatus) url += `&status=${filterStatus}`;
            if (filterStartDate) url += `&start_date=${filterStartDate}`;
            if (filterEndDate) url += `&end_date=${filterEndDate}`;
            
            const response = await api.getData(url);
            if (response.data.success) {
                setFleet(response.data.data.fleet);
                if (response.data.data.courses) {
                    setCourses(response.data.data.courses.data || []);
                    setCoursePagination(response.data.data.courses);
                }
            }
        } catch (error) {
            console.error("Error fetching vehicle details:", error);
        } finally {
            setLoading(false);
        }
    };

    const resetFilters = () => {
        setFilterStatus('');
        setFilterStartDate('');
        setFilterEndDate('');
        fetchDetail(1);
    };

    const handlePageChange = (url: string | null) => {
        if (!url) return;
        const page = new URL(url).searchParams.get('page');
        if (page) fetchDetail(parseInt(page));
    };

    useEffect(() => {
        if (id && user?.id) {
            fetchDetail();
        }
    }, [id, user?.id]);

    if (loading) {
        return (
            <PartnerLayout user={user} onLogout={onLogout}>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </PartnerLayout>
        );
    }

    if (!fleet) {
        return (
            <PartnerLayout user={user} onLogout={onLogout}>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
                    <span className="material-symbols-outlined text-6xl mb-4">error</span>
                    <h2 className="text-xl font-bold">Vehicule non trouvé</h2>
                    <Link to="/partner/vehicles" className="mt-4 px-6 py-2 bg-primary text-white rounded-full font-bold">
                        Retour à la flotte
                    </Link>
                </div>
            </PartnerLayout>
        );
    }

    const v = fleet.vehicle;
    const d = v?.chauffeur;

    return (
        <PartnerLayout user={user} onLogout={onLogout}>
            <div className="max-w-6xl mx-auto font-body">
                {/* Breakcrumbs & Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-slate-400 text-xs mb-3 font-bold uppercase tracking-widest">
                            <Link to="/partner/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
                            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                            <Link to="/partner/vehicles" className="hover:text-primary transition-colors">Vehicles</Link>
                            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                            <span className="text-primary">{v?.matricule}</span>
                        </div>
                        <h2 className="text-4xl font-black text-[#00327d] tracking-tight uppercase leading-none">
                            {v?.modele || 'Unknown Vehicle'}
                        </h2>
                        <div className="mt-3 flex items-center gap-3">
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/10">
                                {v?.matricule}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                v?.statut === 'OCCUPE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                                {v?.statut}
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <Link 
                            to={`/partner/vehicle-report/${id}`}
                            className="px-6 py-2.5 rounded-full bg-primary text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                        >
                            <span className="material-symbols-outlined text-lg">print</span>
                            Rapport
                        </Link>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex gap-1 mb-8 p-1 bg-slate-100 rounded-2xl w-fit">
                    {['chauffeur', 'course', 'vehicle', 'category'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                activeTab === tab 
                                ? 'bg-white shadow-sm text-primary font-black' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content Sections */}
                <div className="w-full">
                    <div className="w-full">
                        <div className="bg-white rounded-3xl p-8 shadow-sm ring-1 ring-black/5 min-h-[400px]">
                            {activeTab === 'chauffeur' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="flex items-center gap-8 mb-10">
                                        <div className="w-32 h-32 rounded-3xl bg-blue-50 flex items-center justify-center text-primary text-4xl font-black shadow-inner">
                                            {d?.photo ? (
                                                <img src={d.photo} alt="" className="w-full h-full object-cover rounded-3xl" />
                                            ) : (
                                                <>{d?.nom?.[0]}{d?.prenom?.[0]}</>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-black text-[#00327d]">{d?.nom} {d?.prenom}</h3>
                                            <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-[11px] bg-slate-50 inline-block px-4 py-1.5 rounded-full border border-slate-100">
                                                Active Fleet Driver
                                            </p>
                                            <div className="flex flex-wrap gap-8 mt-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shadow-sm">
                                                        <span className="material-symbols-outlined text-lg">call</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Phone</p>
                                                        <p className="font-bold text-slate-700">{d?.telephone}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shadow-sm">
                                                        <span className="material-symbols-outlined text-lg">mail</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Email</p>
                                                        <p className="font-bold text-slate-700">{d?.email || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                                        <div className="bg-primary/5 rounded-3xl p-8 border border-primary/10">
                                            <p className="text-primary/60 text-[10px] font-black uppercase tracking-widest mb-2">Driver Wallet Balance</p>
                                            <p className="text-4xl font-black text-primary">
                                                {d?.balance?.toLocaleString()} <span className="text-base font-bold opacity-60">XAF</span>
                                            </p>
                                            <button className="mt-6 w-full py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                                                Manage Transactions
                                            </button>
                                        </div>
                                        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex flex-col justify-between">
                                            <div>
                                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Performance Score</p>
                                                <div className="flex items-center gap-1 text-amber-500">
                                                    {Array(5).fill(0).map((_, i) => (
                                                        <span key={i} className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold leading-relaxed mt-4">Based on the last 50 rides completed with excellence.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'course' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                                        <h3 className="text-xl font-black text-[#00327d] flex items-center gap-2">
                                            Ride History
                                        </h3>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Total Results: {coursePagination?.total || 0}
                                        </div>
                                    </div>

                                    {/* Filter Bar */}
                                    <div className="flex flex-wrap gap-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-sm">
                                        <div className="flex-1 min-w-[200px]">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2 ml-1">Statut</label>
                                            <select 
                                                value={filterStatus}
                                                onChange={(e) => setFilterStatus(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black text-slate-700 focus:ring-4 focus:ring-primary/5 outline-none transition-all appearance-none"
                                            >
                                                <option value="">Tous les statuts</option>
                                                <option value="TERMINEE">Terminée</option>
                                                <option value="ANNULEE">Annulée</option>
                                                <option value="EN_COURS">En cours</option>
                                            </select>
                                        </div>
                                        <div className="flex-1 min-w-[150px]">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2 ml-1">Début</label>
                                            <input 
                                                type="date"
                                                value={filterStartDate}
                                                onChange={(e) => setFilterStartDate(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black text-slate-700 focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-[150px]">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2 ml-1">Fin</label>
                                            <input 
                                                type="date"
                                                value={filterEndDate}
                                                onChange={(e) => setFilterEndDate(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black text-slate-700 focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <button 
                                                onClick={() => fetchDetail(1)}
                                                className="px-8 py-3 bg-[#00327d] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-blue-900/20 flex items-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-sm">filter_list</span>
                                                Filtrer
                                            </button>
                                            <button 
                                                onClick={resetFilters}
                                                className="px-4 py-3 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-sm">restart_alt</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {courses.length > 0 ? (
                                            courses.map((attr: any) => (
                                                <div key={attr.id} className="p-6 bg-white rounded-[2rem] flex flex-col md:flex-row justify-between items-start md:items-center border border-slate-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all group gap-6">
                                                    <div className="flex items-center gap-5 flex-1">
                                                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                                            <span className="material-symbols-outlined text-2xl">route</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Trip #{attr.courses?.id}</p>
                                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                                                                    attr.courses?.statut === 'TERMINEE' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                                                }`}>{attr.courses?.statut}</span>
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold group-hover:text-primary transition-colors">
                                                                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                                                    {new Date(attr.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium truncate italic max-w-md">
                                                                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                                                                    {attr.courses?.lieu_depart} → {attr.courses?.lieu_arrive}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-slate-50">
                                                        <div className="text-right">
                                                            <p className="text-lg font-black text-primary leading-none">{attr.courses?.montant?.toLocaleString()} <span className="text-[10px] opacity-60 text-slate-400 font-bold ml-1">XAF</span></p>
                                                        </div>
                                                        <Link 
                                                            to={`/partner/courses/${attr.courses?.id}`}
                                                            className="px-6 py-2.5 bg-slate-50 text-slate-600 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all flex items-center gap-2 border border-slate-100"
                                                        >
                                                            Détails
                                                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                                        </Link>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-24 text-center text-slate-300">
                                                <span className="material-symbols-outlined text-7xl mb-4 opacity-20">history</span>
                                                <p className="text-lg font-bold">No recent history found</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Pagination */}
                                    {coursePagination && coursePagination.last_page > 1 && (
                                        <div className="flex justify-between items-center mt-10 px-6 py-4 bg-slate-50 rounded-2xl border border-slate-100 font-body">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                Page {coursePagination.current_page} of {coursePagination.last_page}
                                            </span>
                                            <div className="flex gap-2">
                                                {coursePagination.links.map((link: any, index: number) => (
                                                    <button
                                                        key={index}
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                        onClick={() => handlePageChange(link.url)}
                                                        disabled={!link.url || link.active}
                                                        className={`px-4 py-2 rounded-xl font-black transition-all text-[9px] uppercase tracking-widest ${
                                                            link.active 
                                                            ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                                            : 'bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-slate-200 disabled:opacity-30'
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'vehicle' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                        <div className="space-y-8">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Make & Model</label>
                                                <p className="text-2xl font-black text-[#00327d]">{v?.modele}</p>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">License Plate</label>
                                                <p className="text-2xl font-black text-primary font-mono tracking-widest mt-1 px-4 py-2 bg-primary/5 border border-primary/10 rounded-xl inline-block">{v?.matricule}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vehicle Color</label>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: v?.color }}></div>
                                                        <p className="font-bold text-slate-700">{v?.color || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Year</label>
                                                    <p className="font-bold text-slate-700">2023</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 rounded-3xl p-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 min-h-[300px] group hover:border-primary/20 transition-all">
                                            {v?.image ? (
                                                <img src={v.image} alt="" className="w-full h-full object-contain" />
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-7xl text-slate-200 group-hover:text-primary/20 transition-colors">local_taxi</span>
                                                    <p className="text-[10px] font-black uppercase text-slate-300 mt-4 tracking-widest">No vehicle photo available</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'category' && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="bg-[#00327d] rounded-3xl p-10 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                        <div className="flex items-center gap-6 mb-12">
                                            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white">
                                                <span className="material-symbols-outlined text-5xl">verified</span>
                                            </div>
                                            <div>
                                                <h4 className="text-3xl font-black uppercase tracking-tight">{v?.categorie?.libelle}</h4>
                                                <p className="text-blue-200 font-bold text-xs uppercase tracking-widest mt-1 opacity-60">Verified Service Class</p>
                                            </div>
                                        </div>
                                        

                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                  
                </div>
            </div>
        </PartnerLayout>
    );
};

export default VehicleDetail;
