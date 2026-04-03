import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiService from '../../services/ApiService';

const VehicleReportPrintPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const api = new ApiService();

    useEffect(() => {
        const fetchReportData = async () => {
            try {
                // Reuse vehicle detail endpoint
                const res = await api.getData(`utilisateur/get-contributor-vehicle-details/${id}?per_page=all`);
                if (res.data.success) {
                    setData(res.data.data);
                }
            } catch (error) {
                console.error("Error fetching report data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchReportData();
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-10 text-center font-bold text-[#00327d] animate-pulse">Génération du rapport...</div>;
    if (!data) return <div className="p-10 text-center text-red-500 font-bold">Données du véhicule introuvables.</div>;

    const vehicle = data.vehicle || data.fleet?.vehicle;
    const history = (data.courses?.data || data.courses || []).filter((c: any) => c.courses?.statut === 'TERMINEE');

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-10 font-sans print:p-0 print:bg-white transition-all">
            {/* Action Bar (Hidden on Print) */}
            <div className="max-w-[21cm] mx-auto mb-8 flex justify-between items-center print:hidden bg-white p-4 rounded-xl shadow-lg border border-slate-200">
                <button 
                    onClick={() => navigate(-1)} 
                    className="flex items-center gap-2 text-slate-600 font-bold hover:text-[#00327d] transition-colors"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                    Retour
                </button>
                <button 
                    onClick={handlePrint}
                    className="bg-[#00327d] text-white px-6 py-2.5 rounded-full flex items-center gap-2 font-black shadow-lg hover:bg-[#0047ab] active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined">print</span>
                    Imprimer le Rapport
                </button>
            </div>

            {/* A4 Sheet */}
            <div className="max-w-[21cm] mx-auto bg-white shadow-2xl p-[1.5cm] min-h-[29.7cm] border border-slate-100 print:shadow-none print:border-none print:p-0 relative overflow-hidden">
                
                {/* Header Decor */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#00327d] via-[#00a3ff] to-[#00327d]"></div>

                {/* Header: Brand & Info */}
                <div className="flex justify-between items-start mb-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-[#00327d] text-white p-2.5 rounded-xl font-black text-2xl shadow-md rotate-3 group-hover:rotate-0 transition-transform">ON</div>
                            <div>
                                <h1 className="text-2xl font-black text-[#00327d] tracking-tighter uppercase italic">ON GO 237</h1>
                                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Gestion de Flotte Premium</p>
                            </div>
                        </div>
                        <div className="pt-4 border-l-4 border-[#00327d] pl-4">
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Rapport de Performance</h2>
                            <p className="text-sm font-bold text-slate-500 italic">Généré le {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="inline-block p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <div className="text-[10px] font-black text-slate-400 uppercase mb-1">ID Rapport</div>
                           <p className="text-sm font-black text-[#00327d]">#{id?.substring(0,8).toUpperCase()}-{Math.random().toString(36).substring(7).toUpperCase()}</p>
                        </div>
                    </div>
                </div>

                {/* Top Section: Vehicle & Chauffeur Summary */}
                <div className="grid grid-cols-2 gap-8 mb-12">
                    {/* Vehicle Identity */}
                    <div className="bg-[#f8fafc] p-6 rounded-3xl border border-slate-100 relative">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">Informations Véhicule</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                <span className="text-xs font-bold text-slate-500">Matricule</span>
                                <span className="text-sm font-black text-[#00327d]">{vehicle?.matricule}</span>
                            </div>
                            <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                <span className="text-xs font-bold text-slate-500">Marque / Modèle</span>
                                <span className="text-sm font-black text-slate-800">{vehicle?.marque} {vehicle?.modele}</span>
                            </div>
                            <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                <span className="text-xs font-bold text-slate-500">Catégorie</span>
                                <span className="text-sm font-black text-slate-800">{vehicle?.categorie?.libelle}</span>
                            </div>
                            <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                <span className="text-xs font-bold text-slate-500">Couleur</span>
                                <span className="text-sm font-black text-slate-800">{vehicle?.color}</span>
                            </div>
                        </div>
                    </div>

                    {/* Driver Profile */}
                    <div className="bg-[#f0f4ff] p-6 rounded-3xl border border-[#00327d]/5 relative">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-[#00327d]/10 pb-2">Profil Chauffeur</h3>
                         <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-white shadow-md overflow-hidden">
                                {vehicle?.chauffeur?.photo ? (
                                    <img src={vehicle.chauffeur.photo} alt="Chauffeur" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <span className="material-symbols-outlined text-4xl">person</span>
                                    </div>
                                )}
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-slate-800 tracking-tight leading-tight">{vehicle?.chauffeur?.nom} {vehicle?.chauffeur?.prenom}</h4>
                                <p className="text-xs font-bold text-[#00327d] opacity-70">Chauffeur Assigné</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">Téléphone</span>
                                <span className="text-sm font-black text-slate-700">{vehicle?.chauffeur?.telephone}</span>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-[#00327d]/5">
                                <span className="text-xs font-bold text-slate-500">Solde Actuel</span>
                                <span className="text-xl font-black text-[#00327d]">{vehicle?.chauffeur?.balance?.toLocaleString()} FCFA</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mid Section: Statistics Breakdown */}
                <div className="grid grid-cols-4 gap-4 mb-12">
                   {[
                       { label: 'Courses Totales', val: history.length, icon: 'route', scheme: 'blue' },
                       { label: 'Terminées', val: history.filter((c:any)=>c.courses?.statut === 'TERMINEE').length, icon: 'check_circle', scheme: 'emerald' },
                       { label: 'Annulées', val: history.filter((c:any)=>c.courses?.statut === 'ANNULEE').length, icon: 'cancel', scheme: 'rose' },
                       { label: 'Revenu Est.', val: history.filter((c:any)=>c.courses?.statut === 'TERMINEE').reduce((acc:number, curr:any)=> acc + (Number(curr.courses?.montant) || 0), 0).toLocaleString() + ' F', icon: 'payments', scheme: 'indigo' },
                   ].map((stat, i) => (
                    <div key={i} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm text-center">
                        <span className={`material-symbols-outlined text-${stat.scheme}-500 text-xl mb-1`}>{stat.icon}</span>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">{stat.label}</p>
                        <p className={`text-sm font-black text-slate-800`}>{stat.val}</p>
                    </div>
                   ))}
                </div>

                {/* Bottom Section: Recent Activity Table */}
                <div className="mb-12">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                         <span className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center scale-75">
                             <span className="material-symbols-outlined text-sm">history</span>
                         </span>
                         Historique Récent des Courses
                    </h3>
                    <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-800 text-white">
                                <tr>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Date / ID</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-center">Statut</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Trajet (Départ / Arrivée)</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-right">Montant</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map((course: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="text-[10px] font-black text-slate-800">{new Date(course.created_at).toLocaleDateString('fr-FR')}</p>
                                            <p className="text-[9px] text-slate-400 font-mono">#{String(course.id).substring(0, 8)}</p>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                                                course.courses?.statut === 'TERMINEE' ? 'bg-emerald-100 text-emerald-700' :
                                                course.courses?.statut === 'ANNULEE' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {course.courses?.statut}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-0.5">
                                                <p className="text-[10px] font-bold text-slate-700 truncate max-w-[200px]">
                                                    <span className="text-[#00327d] pr-1">●</span> {course.courses?.lieu_depart}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 truncate max-w-[200px]">
                                                    <span className="text-[#00327d] pr-1">↳</span> {course.courses?.lieu_arrive}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <p className="text-xs font-black text-[#00327d]">{course.courses?.montant?.toLocaleString()} F</p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer: Disclaimer and Signature Area */}
                <div className="mt-auto pt-10 border-t border-dashed border-slate-200">
                    <div className="flex justify-between items-end">
                        <div className="max-w-[400px]">
                            <p className="text-[9px] font-bold text-slate-400 italic">Ce document constitue un rapport officiel généré automatiquement par la plateforme ON GO. Les montants affichés correspondent aux revenus globaux générés par les courses.</p>
                            <p className="text-[8px] font-black text-slate-300 mt-2">© 2026 ON GO 237 - TOUS DROITS RÉSERVÉS</p>
                        </div>
                        <div className="text-center w-[200px]">
                            <div className="h-12 border-b border-slate-300 mb-2"></div>
                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Cachet & Signature</p>
                        </div>
                    </div>
                </div>

                {/* Page Number (Print only) */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-300 tracking-widest hidden print:block">
                    PAGE 1 SUR 1
                </div>

            </div>
        </div>
    );
};

export default VehicleReportPrintPage;
