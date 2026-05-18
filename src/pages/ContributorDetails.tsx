import  { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ApiService from "../services/ApiService";
import MainLayout from "./MainLayout";
import Loading from "../components/Loading";
import { toast } from "react-toastify";

interface ContributorDetailsProps {
    onLogout?: () => void;
    theme?: "light" | "dark";
    toggleTheme?: () => void;
}

export default function ContributorDetails({ onLogout = () => {}, theme = "light", toggleTheme = () => {} }: ContributorDetailsProps) {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const Api = new ApiService();
    
    const [contributor, setContributor] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showAssociateModal, setShowAssociateModal] = useState(false);
    
    // Modal State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
    const [associating, setAssociating] = useState(false);

    useEffect(() => {
        fetchContributorDetails();
    }, [id]);

    const fetchContributorDetails = async () => {
        setLoading(true);
        try {
            const { data } = await Api.getData(`utilisateur/details-contributor/${id}`);
            if (data.success) {
                setContributor(data.data);
            } else {
                toast.error(data.message || "Erreur lors du chargement du contributeur");
            }
        } catch (error) {
            toast.error("Impossible de récupérer les détails");
        } finally {
            setLoading(false);
        }
    };

    const handleSearchVehicle = async () => {
        if (!searchQuery.trim()) return;
        setSearchLoading(true);
        try {
            const { data } = await Api.getDatawithPagination(`utilisateur/search-vehicle-contributor?q=${encodeURIComponent(searchQuery)}`, false);
            if (data.success) {
                setSearchResults(data.data.data || data.data);
            }
        } catch (error) {
            toast.error("Erreur lors de la recherche des véhicules");
        } finally {
            setSearchLoading(false);
        }
    };

    const handleAssociate = async () => {
        if (!selectedVehicle) return;
        setAssociating(true);
        try {
            const formData = new FormData();
            formData.append("user_id", id!);
            formData.append("vehicle_id", selectedVehicle.id);
            
            const { data } = await Api.postData("utilisateur/add-contributor", formData);
            if (data.success) {
                toast.success("Véhicule associé avec succès");
                setShowAssociateModal(false);
                setSelectedVehicle(null);
                setSearchQuery("");
                setSearchResults([]);
                fetchContributorDetails(); // Refresh details
            } else {
                toast.error(data.message || "Erreur lors de l'association");
            }
        } catch (error) {
            toast.error("Impossible d'associer le véhicule");
        } finally {
            setAssociating(false);
        }
    };

    if (loading) {
        return (
            <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
                <div className="flex h-[80vh] items-center justify-center">
                    <Loading />
                </div>
            </MainLayout>
        );
    }

    if (!contributor) {
        return (
            <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
                <div className="p-8 text-center text-slate-500">
                    Contributeur introuvable
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 pb-12">
                {/* Header Profile Section */}
                <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-8 flex flex-col md:flex-row gap-6 md:items-center justify-between shadow-sm sticky top-0 z-10">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <span className="material-symbols-outlined text-slate-500">arrow_back</span>
                        </button>
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20 text-white font-black text-2xl uppercase">
                            {contributor.nom?.charAt(0)}
                        </div>
                        <div>
                            <nav className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                <span>Contributeur</span>
                                <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                                <span className="text-primary">Profil Détail</span>
                            </nav>
                            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{contributor.nom} {contributor.prenom}</h2>
                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
                                <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">call</span> {contributor.telephone || "Non renseigné"}</span>
                                <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">mail</span> {contributor.email || "Non renseigné"}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setShowAssociateModal(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-full font-bold text-sm shadow-xl shadow-primary/25 transition-all outline-none">
                        <span className="material-symbols-outlined">add_circle</span>
                        Associer un Véhicule
                    </button>
                </header>

                {/* Dashboard Content */}
                <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
                    
                    {/* Stats summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
                            <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-orange-500 text-2xl">directions_car</span>
                            </div>
                            <div>
                                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">Total Véhicules</p>
                                <p className="text-3xl font-black text-slate-800 dark:text-white">{contributor.vehicles?.length || 0}</p>
                            </div>
                        </div>
                        {/* More stats could go here */}
                    </div>

                    {/* Vehicles Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">airport_shuttle</span>
                                Flotte du Contributeur
                            </h3>
                        </div>

                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-8 py-5 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Photo</th>
                                        <th className="px-6 py-5 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Mnémonique</th>
                                        <th className="px-6 py-5 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Détails Techniques</th>
                                        <th className="px-6 py-5 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Chauffeur Assigné</th>
                                        <th className="px-8 py-5 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Statut</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {(contributor.vehicles || []).length > 0 ? (
                                        contributor.vehicles.map((v: any, index: number) => (
                                            <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                                <td className="px-8 py-4">
                                                    <div className="w-16 h-12 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 overflow-hidden flex items-center justify-center">
                                                        {v.image ? (
                                                            <img src={v.image} alt={v.matricule} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-slate-300">directions_car</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-slate-800 dark:text-white uppercase">{v.matricule}</p>
                                                    <p className="text-xs font-medium text-primary bg-primary/10 inline-block px-2 py-0.5 rounded mt-1">{v.categorie?.libelle || "STANDARD"}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{v.modele || "Non défini"}</p>
                                                    <div className="flex flex-wrap items-center gap-3 mt-1.5 opacity-80">
                                                        {v.is_auto && <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">settings</span> Auto</span>}
                                                        {v.is_clim && <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">ac_unit</span> Clim</span>}
                                                        <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">reduce_capacity</span> {v.nb_place || 4} pl.</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {v.chauffeur ? (
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs uppercase">
                                                                {v.chauffeur.nom?.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-1">{v.chauffeur.nom} {v.chauffeur.prenom}</p>
                                                                <p className="text-[11px] font-medium text-slate-400">{v.chauffeur.telephone}</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-medium text-slate-400 italic">Aucun chauffeur</span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                                                        v.statut === 'LIBRE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                                        v.statut === 'OCCUPE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                                                        'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                                                    }`}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                        {v.statut || "INACTIF"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-16 text-center">
                                                <div className="flex flex-col items-center justify-center opacity-50">
                                                    <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">car_crash</span>
                                                    <p className="text-slate-500 font-medium">Ce contributeur n'a aucun véhicule associé.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Associate Vehicle Modal */}
                {showAssociateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-In">
                            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/30">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Associer un Véhicule</h3>
                                    <p className="text-sm font-medium text-slate-500 mt-1">Recherchez dans la flotte OnGo</p>
                                </div>
                                <button onClick={() => setShowAssociateModal(false)} className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors shadow-sm">
                                    <span className="material-symbols-outlined text-lg">close</span>
                                </button>
                            </div>
                            
                            <div className="p-8 overflow-y-auto flex-1">
                                <div className="space-y-6">
                                    <div className="relative">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Recherche (Matricule)</label>
                                        <div className="flex items-center gap-3">
                                            <div className="relative flex-1">
                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                                <input 
                                                    type="text" 
                                                    placeholder="Entrez le matricule du véhicule..." 
                                                    value={searchQuery}
                                                    onChange={e => setSearchQuery(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleSearchVehicle()}
                                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-medium text-slate-700 dark:text-slate-200"
                                                />
                                            </div>
                                            <button 
                                                onClick={handleSearchVehicle}
                                                disabled={searchLoading}
                                                className="h-[52px] px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors shrink-0 flex items-center justify-center">
                                                {searchLoading ? <Loading /> : "Chercher"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Search Results */}
                                    {searchResults.length > 0 && (
                                        <div className="space-y-3 pt-2">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Résultats de la recherche</p>
                                            <div className="max-h-64 overflow-y-auto pr-2 space-y-2 no-scrollbar">
                                                {searchResults.map(v => (
                                                    <div 
                                                        key={v.id} 
                                                        onClick={() => setSelectedVehicle(v)}
                                                        className={`p-4 rounded-xl border flex flex-col sm:flex-row gap-4 items-center cursor-pointer transition-all ${selectedVehicle?.id === v.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'}`}>
                                                        <div className="w-16 h-12 rounded bg-slate-100 flex items-center justify-center shrink-0">
                                                            {v.image ? <img src={v.image} className="w-full h-full object-cover rounded" /> : <span className="material-symbols-outlined text-slate-400">airport_shuttle</span>}
                                                        </div>
                                                        <div className="flex-1 text-center sm:text-left">
                                                            <p className="font-bold text-slate-800 dark:text-white uppercase">{v.matricule}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <p className="text-xs text-slate-500">{v.modele}</p>
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{v.categorie?.libelle || "Catégorie"}</span>
                                                            </div>
                                                            
                                                            {v.chauffeur && (
                                                                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                                                                    <div className="flex items-center justify-between gap-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="material-symbols-outlined text-[14px] text-slate-400">person</span>
                                                                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                                                                {v.chauffeur.nom} {v.chauffeur.prenom}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex flex-col items-end">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Solde</span>
                                                                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                                                                {new Intl.NumberFormat('fr-FR').format(v.chauffeur.balance || 0)} XAF
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="shrink-0">
                                                            <span className={`material-symbols-outlined transition-colors ${selectedVehicle?.id === v.id ? 'text-primary' : 'text-slate-200 dark:text-slate-700'}`}>check_circle</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {searchResults.length === 0 && searchQuery && !searchLoading && (
                                        <p className="text-center text-slate-500 text-sm py-4 italic">Aucun véhicule trouvé correspondant.</p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-end gap-3">
                                <button onClick={() => setShowAssociateModal(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 dark:text-slate-300 transition-colors">
                                    Annuler
                                </button>
                                <button 
                                    onClick={handleAssociate}
                                    disabled={!selectedVehicle || associating}
                                    className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-md shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                    {associating ? <Loading /> : "Confirmer l'Association"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
