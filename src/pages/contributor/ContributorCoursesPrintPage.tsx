import React, { useState, useEffect } from 'react';
import ApiService from '../../services/ApiService';

interface ContributorCoursesPrintPageProps {
    user: any;
}

const ContributorCoursesPrintPage: React.FC<ContributorCoursesPrintPageProps> = ({ user }) => {
    
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const api = new ApiService();

    useEffect(() => {
        const fetchAllCourses = async () => {
            if (!user?.id) return;
            setLoading(true);
            try {
                // Fetch ALL completed courses for the contributor
                const response = await api.getData(`utilisateur/get-contributor-courses?user_id=${user.id}&statut=TERMINEE&per_page=all`);
                if (response.data.success) {
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-emerald-700">
                <div className="w-12 h-12 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin mb-4"></div>
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
                    className="flex items-center gap-2 text-slate-500 hover:text-emerald-700 font-semibold transition-colors"
                >
                    <span className="material-symbols-outlined text-xl">arrow_back</span>
                    Retour
                </button>
                <button 
                    onClick={() => window.print()}
                    className="bg-emerald-700 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                    <span className="material-symbols-outlined">print</span>
                    Imprimer le Rapport
                </button>
            </div>

            {/* Report Container */}
            <div className="max-w-5xl mx-auto bg-white shadow-2xl print:shadow-none border border-slate-100 print:border-none rounded-3xl print:rounded-none overflow-hidden p-8 sm:p-12">
                
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-100 pb-10 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-emerald-700 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
                                <span className="material-symbols-outlined text-white text-3xl">analytics</span>
                            </div>
                            <h1 className="text-3xl font-black text-emerald-800 tracking-tighter uppercase">Rapport de Flotte / Contributeur</h1>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-700">Contributeur: <span className="text-emerald-700">{user?.nom}</span></p>
                            <p className="text-xs font-medium text-slate-400">Généré le: {new Date().toLocaleString('fr-FR')}</p>
                            <p className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-2">HISTORIQUE COMPLET - COURSES TERMINÉES</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black text-emerald-800">ONGO 237</p>
                        <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">-</p>
                    </div>
                </div>

                {/* Summary Tiles */}
                <div className="grid grid-cols-3 gap-6 mb-12">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Courses</p>
                        <p className="text-3xl font-black text-slate-800">{courses.length}</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Montant Global</p>
                        <p className="text-3xl font-black text-slate-800">{totalAmount.toLocaleString()} <span className="text-sm">FCFA</span></p>
                    </div>
                   
                </div>

                {/* Main Table */}
                <div className="overflow-hidden rounded-2xl border border-slate-100">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Date & ID</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Trajet</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Véhicule / Chauffeur</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Montant Global</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {courses.map((attr: any, i: number) => {
                                const montant = Number(attr.courses?.montant || 0);
                            
                                return (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-4">
                                            <p className="text-[11px] font-black text-slate-800">{new Date(attr.created_at).toLocaleDateString('fr-FR')}</p>
                                            <p className="text-[9px] text-slate-400 font-mono">#{String(attr.courses?.id || attr.id).substring(0, 8)}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="space-y-0.5">
                                                <p className="text-[9px] font-medium text-slate-600 truncate max-w-[150px]">
                                                    <span className="text-emerald-500 mr-1 text-[8px]">●</span> {attr.courses?.lieu_depart}
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
                                            <p className="text-[12px] font-bold text-slate-800">{montant.toLocaleString()} <span className="text-[8px]">XAF</span></p>
                                        </td>
                                 
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-8 border-t border-slate-100 text-center">
                    <p className="text-[10px] text-slate-300 font-medium tracking-widest uppercase mb-1">Document Officiel Onyo 237</p>
                    <p className="text-[9px] text-slate-400 italic">Ce rapport constitue une synthèse de l'activité de vos véhicules sur la plateforme en tant que contributeur.</p>
                </div>
            </div>
            
            <style>
                {`
                @media print {
                    body { background: white; margin: 0; padding: 0; }
                    .print\\:hidden { display: none !important; }
                    @page { margin: 1cm; max-width: 100%; }
                }
                `}
            </style>
        </div>
    );
};

export default ContributorCoursesPrintPage;
