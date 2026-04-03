import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ApiService from '../../services/ApiService';

interface PartnerCoursesPrintPageProps {
    user: any;
}

const PartnerCoursesPrintPage: React.FC<PartnerCoursesPrintPageProps> = ({ user }) => {
    const [searchParams] = useSearchParams();
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const api = new ApiService();

    useEffect(() => {
        const fetchAllCourses = async () => {
            if (!user?.id) return;
            setLoading(true);
            try {
                // Fetch ALL completed courses for the partner
                const response = await api.getData(`utilisateur/get-partner-courses?user_id=${user.id}&statut=TERMINEE&per_page=all`);
                if (response.data.success) {
                    // response.data.data is the array directly when per_page=all (see backend change)
                    setCourses(response.data.data);
                }
            } catch (error) {
                console.error("Error fetching report data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllCourses();
    }, [user?.id]);

    const totalAmount = courses.reduce((sum, c) => sum + (c.courses?.montant || 0), 0);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-[#00327d]">
                <div className="w-12 h-12 border-4 border-[#00327d] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-bold animate-pulse">Génération du rapport en cours...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-10 font-sans print:p-0 print:bg-white transition-all">
            {/* Print Button Overlay */}
            <div className="max-w-4xl mx-auto mb-6 print:hidden flex justify-between items-center">
                <button 
                    onClick={() => window.history.back()}
                    className="flex items-center gap-2 text-slate-500 hover:text-[#00327d] font-semibold transition-colors"
                >
                    <span className="material-symbols-outlined text-xl">arrow_back</span>
                    Retour
                </button>
                <button 
                    onClick={() => window.print()}
                    className="bg-[#00327d] text-white px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                    <span className="material-symbols-outlined">print</span>
                    Imprimer le Rapport
                </button>
            </div>

            {/* Report Container */}
            <div className="max-w-4xl mx-auto bg-white shadow-2xl print:shadow-none border border-slate-100 print:border-none rounded-3xl print:rounded-none overflow-hidden p-8 sm:p-12">
                
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-100 pb-10 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-[#00327d] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                                <span className="material-symbols-outlined text-white text-3xl">analytics</span>
                            </div>
                            <h1 className="text-3xl font-black text-[#00327d] tracking-tighter uppercase">Rapport de Flotte</h1>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-700">Partenaire: <span className="text-[#00327d]">{user?.nom}</span></p>
                            <p className="text-xs font-medium text-slate-400">Généré le: {new Date().toLocaleString('fr-FR')}</p>
                            <p className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-2">HISTORIQUE COMPLET - COURSES TERMINÉES</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black text-[#00327d]">ONGO 237</p>
                        <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Premium Logistics</p>
                    </div>
                </div>

                {/* Summary Tiles */}
                <div className="grid grid-cols-2 gap-6 mb-12">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Courses</p>
                        <p className="text-3xl font-black text-[#00327d]">{courses.length}</p>
                    </div>
                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Chiffre d'Affaires</p>
                        <p className="text-3xl font-black text-blue-900">{totalAmount.toLocaleString()} <span className="text-sm">FCFA</span></p>
                    </div>
                </div>

                {/* Main Table */}
                <div className="overflow-hidden rounded-2xl border border-slate-100">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Date & ID</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Client</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Trajet</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Véhicule / Chauffeur</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Montant</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {courses.map((attr: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-4">
                                        <p className="text-[11px] font-black text-slate-800">{new Date(attr.created_at).toLocaleDateString('fr-FR')}</p>
                                        <p className="text-[9px] text-slate-400 font-mono">#{String(attr.courses?.id || attr.id).substring(0, 8)}</p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="text-[11px] font-bold text-slate-700">{attr.courses?.client?.nom || 'N/A'}</p>
                                        <p className="text-[9px] text-slate-400">{attr.courses?.client?.telephone}</p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] font-medium text-slate-600 truncate max-w-[150px]">
                                                <span className="text-blue-500 mr-1 text-[8px]">●</span> {attr.courses?.lieu_depart}
                                            </p>
                                            <p className="text-[9px] font-medium text-slate-600 truncate max-w-[150px]">
                                                <span className="text-slate-400 mr-1 text-[8px]">●</span> {attr.courses?.lieu_arrive}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="text-[11px] font-black text-slate-800">{attr.chauffeurs?.vehicules?.[0]?.matricule || 'Sans Véhicule'}</p>
                                        <p className="text-[9px] text-slate-500">{attr.chauffeurs?.nom} {attr.chauffeurs?.prenom}</p>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <p className="text-[12px] font-black text-[#00327d]">{attr.courses?.montant?.toLocaleString()} <span className="text-[8px]">XAF</span></p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-8 border-t border-slate-100 text-center">
                    <p className="text-[10px] text-slate-300 font-medium tracking-widest uppercase mb-1">Document Officiel Onyo 237</p>
                    <p className="text-[9px] text-slate-400 italic">Ce rapport constitue une synthèse de l'activité de votre flotte de véhicules sur la plateforme.</p>
                </div>
            </div>
            
            <style>
                {`
                @media print {
                    body { background: white; margin: 0; padding: 0; }
                    .print\\:hidden { display: none !important; }
                    @page { margin: 1cm; }
                }
                `}
            </style>
        </div>
    );
};

export default PartnerCoursesPrintPage;
