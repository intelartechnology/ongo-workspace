import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PartnerLayout from '../../components/partner/PartnerLayout';
import ApiService from '../../services/ApiService';

interface PartnerCoursesProps {
    onLogout: () => void;
    user: any;
}

const PartnerCourses: React.FC<PartnerCoursesProps> = ({ onLogout, user }) => {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<any>(null);
    
    // Filter State
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [filters, setFilters] = useState({
        statut: 'ALL',
        startDate: '',
        endDate: ''
    });
    const api = new ApiService();
    const navigate = useNavigate();

    const fetchCourses = async (url?: string) => {
        setLoading(true);
        try {
            let targetUrl = url;
            
            if (!targetUrl) {
                const params = new URLSearchParams();
                params.append('user_id', user.id);
                if (filters.statut !== 'ALL') params.append('statut', filters.statut);
                if (filters.startDate) params.append('start_date', filters.startDate);
                if (filters.endDate) params.append('end_date', filters.endDate);
                
                targetUrl = `utilisateur/get-partner-courses?${params.toString()}`;
            }

            const response = await api.getData(targetUrl);
            if (response.data.success) {
                setCourses(response.data.data.data);
                setPagination(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching partner courses:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) {
            fetchCourses();
        }
    }, [user?.id]);

    const handlePageChange = (url: string) => {
        if (url) {
            // Preservation of filters during pagination
            const urlObj = new URL(url, window.location.origin);
            const page = urlObj.searchParams.get('page');
            
            const params = new URLSearchParams();
            params.append('user_id', user.id);
            if (page) params.append('page', page);
            if (filters.statut !== 'ALL') params.append('statut', filters.statut);
            if (filters.startDate) params.append('start_date', filters.startDate);
            if (filters.endDate) params.append('end_date', filters.endDate);
            
            fetchCourses(`utilisateur/get-partner-courses?${params.toString()}`);
        }
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetFilters = () => {
        const reseted = { statut: 'ALL', startDate: '', endDate: '' };
        setFilters(reseted);
        // We need to fetch with reseted values immediately
        const params = new URLSearchParams();
        params.append('user_id', user.id);
        fetchCourses(`utilisateur/get-partner-courses?${params.toString()}`);
    };

    const applyFilters = () => {
        fetchCourses();
    };

    return (
        <PartnerLayout user={user} onLogout={onLogout}>
            {/* Header Section */}
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-extrabold text-[#00327d] tracking-tight mb-1">Fleet Courses</h2>
                    <p className="text-[#434653] font-medium">History of all trips made by your fleet.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsFilterVisible(!isFilterVisible)}
                        className={`px-6 py-3 rounded-full flex items-center gap-2 font-semibold text-sm shadow-sm transition-all ${
                            isFilterVisible 
                            ? 'bg-[#00327d] text-white' 
                            : 'bg-white text-[#00327d] border border-[#00327d]/20 hover:bg-slate-50'
                        }`}
                    >
                        <span className="material-symbols-outlined text-lg">
                            {isFilterVisible ? 'close' : 'filter_list'}
                        </span>
                        {isFilterVisible ? 'Close Filters' : 'Filter'}
                    </button>
                    <button 
                        onClick={() => navigate('/partner/courses-report')}
                        className="bg-gradient-to-br from-[#00327d] to-[#0047ab] text-white px-6 py-3 rounded-full flex items-center gap-2 font-semibold text-sm shadow-lg hover:opacity-90 transition-opacity active:scale-95"
                    >
                        <span className="material-symbols-outlined text-lg">print</span>
                        Print History
                    </button>
                </div>
            </div>

            {/* Filter Panel */}
            {isFilterVisible && (
                <div className="mb-6 bg-white p-6 rounded-xl shadow-sm border border-[#00327d]/10 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                        <div>
                            <label className="block text-xs font-bold text-[#434653] uppercase mb-2 ml-1">Course Status</label>
                            <select 
                                name="statut"
                                value={filters.statut}
                                onChange={handleFilterChange}
                                className="w-full bg-slate-50 border-none rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#00327d]/20 transition-shadow"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="TERMINEE">Completed</option>
                                <option value="ANNULEE">Canceled</option>
                                <option value="EN COURS">In Progress</option>
                                <option value="CONFIRMEE">Confirmed</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#434653] uppercase mb-2 ml-1">Start Date</label>
                            <input 
                                type="date" 
                                name="startDate"
                                value={filters.startDate}
                                onChange={handleFilterChange}
                                className="w-full bg-slate-50 border-none rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#00327d]/20 transition-shadow"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#434653] uppercase mb-2 ml-1">End Date</label>
                            <input 
                                type="date" 
                                name="endDate"
                                value={filters.endDate}
                                onChange={handleFilterChange}
                                className="w-full bg-slate-50 border-none rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#00327d]/20 transition-shadow"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={applyFilters}
                                className="flex-1 bg-[#00327d] text-white py-2.5 rounded-lg font-bold text-sm hover:bg-[#0047ab] transition-colors shadow-md shadow-blue-900/10"
                            >
                                Apply
                            </button>
                            <button 
                                onClick={resetFilters}
                                className="px-4 bg-slate-100 text-[#434653] py-2.5 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">restart_alt</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Courses Table/List */}
            <div className="bg-white rounded-xl shadow-sm border border-[#c3c6d5]/15 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-[#c3c6d5]/15">
                                <th className="px-6 py-4 text-xs font-bold text-[#434653] uppercase tracking-wider">Date & ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#434653] uppercase tracking-wider">Client</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#434653] uppercase tracking-wider">Route</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#434653] uppercase tracking-wider">Vehicle / Driver</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#434653] uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-[#434653] uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#c3c6d5]/10">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-8 h-16 bg-slate-50/50"></td>
                                    </tr>
                                ))
                            ) : courses.length > 0 ? (
                                courses.map((attr: any) => (
                                    <tr 
                                        key={attr.id} 
                                        className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/partner/courses/${attr.courses?.id}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-[#191b22]">#{attr.courses?.id}</p>
                                            <p className="text-[10px] text-[#434653] font-medium">{new Date(attr.created_at).toLocaleDateString()}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[#434653] overflow-hidden">
                                                    {attr.courses?.client?.photo ? (
                                                        <img src={attr.courses.client.photo} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-sm">person</span>
                                                    )}
                                                </div>
                                                <span className="text-sm font-medium text-[#191b22]">{attr.courses?.client?.nom}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 max-w-[200px]">
                                                <p className="text-xs font-medium truncate" title={attr.courses?.lieu_depart}>
                                                    <span className="text-[#00327d] mr-1">●</span> {attr.courses?.lieu_depart}
                                                </p>
                                                <p className="text-xs font-medium truncate" title={attr.courses?.lieu_arrive}>
                                                    <span className="text-[#00327d] mr-1">○</span> {attr.courses?.lieu_arrive}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-[#191b22]">{attr.chauffeurs?.vehicules?.[0]?.matricule || 'N/A'}</p>
                                            <p className="text-[10px] text-[#434653]">{attr.chauffeurs?.nom} {attr.chauffeurs?.prenom}</p>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-[#00327d] text-sm">
                                            {attr.courses?.montant} FCFA
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                attr.courses?.statut === 'TERMINEE' 
                                                ? 'bg-emerald-100 text-emerald-700' 
                                                : attr.courses?.statut === 'ANNULEE' 
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {attr.courses?.statut}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                                        <span className="material-symbols-outlined text-4xl mb-4 block">history_toggle_off</span>
                                        No courses found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination && pagination.last_page > 1 && (
                    <div className="px-6 py-4 bg-slate-50 flex items-center justify-between border-t border-[#c3c6d5]/15">
                        <span className="text-xs font-medium text-[#434653]">
                            Showing {pagination.from} to {pagination.to} of {pagination.total} trips
                        </span>
                        <div className="flex gap-2">
                            {pagination.links.map((link: any, i: number) => (
                                <button
                                    key={i}
                                    onClick={() => handlePageChange(link.url)}
                                    disabled={!link.url}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                                        link.active 
                                        ? 'bg-[#00327d] text-white' 
                                        : 'bg-white text-[#434653] hover:bg-slate-100 border border-[#c3c6d5]/20'
                                    } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
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

export default PartnerCourses;
