import { useEffect, useState } from "react";
import ApiService from "../services/ApiService";
import Swal from "sweetalert2";
import { ToastContainer, toast } from "react-toastify";
import Helpers from "../functions/helpers";
import Loading from "../components/Loading";
import MainLayout from "./MainLayout";
import { useNavigate } from 'react-router-dom';

interface DriversProps {
    onLogout?: () => void;
    theme?: 'light' | 'dark';
    toggleTheme?: () => void;
}

export default function Drivers({ onLogout = () => {}, theme = 'light', toggleTheme = () => {} }: DriversProps) {
    const [utilisateur, setutilisateur] = useState<any>([]);
    const [inputValue, setInputValue] = useState<string>("");
    const [pagination, setpagination] = useState<any>([]);
    const [load, setLoad] = useState<boolean>(true);
    const [meta, setMeta] = useState<any>(null); // To store pagination meta data
   const navigate = useNavigate();

    const Api = new ApiService();
    const _helpersInstance = new Helpers();

    const notify = (title: string, type: string) => {
        if (type === "success") {
            toast.success("🦄 " + title);
        } else if (type === "error") {
            toast.error("🦄 " + title);
        }
    };

    const getAllutilisateur = async (url: string, isPag: boolean) => {
        setLoad(true);
        try {
            const { data } = await Api.getDatawithPagination(url, isPag);
            if (data.success) {
                console.log("data.data.data --------------------------------");
                console.log(data);
                setLoad(false);
                setutilisateur(data.data.data);
                setpagination(data.data.links);
                // Store meta data if available (assuming standard Laravel pagination structure)
                setMeta({
                    current_page: data.data.current_page,
                    from: data.data.from,
                    to: data.data.to,
                    total: data.data.total,
                    last_page: data.data.last_page
                });
            } else {
                handleDAta("Erreur", data.message, "warning");
                setLoad(false);
            }
        } catch (err: any) {
            setLoad(false);
            handleDAta(
                "Connexion au serveur impossible",
                "Verifier votre connexion internet",
                "warning"
            );
        }
    };

    const toggleActivate = async (id: any) => {
        var formData = {
            car_id: id,
        };
        try {
            const { data } = await Api.postData("utilisateur/toggle-river", formData);
            if (data.success) {
                notify("Chauffeur activé avec succès", "success");
                getAllutilisateur("liste-chauffeurs", false);
            } else {
                handleDAta("Erreur", data.message, "warning");
            }
        } catch (err: any) {
            handleDAta("Connexion au serveur impossible ", err, "warning");
        }
    };

    const handleDAta = (title: string, text: string, iconText: any) => {
        Swal.fire({
            showCancelButton: false,
            showConfirmButton: true,
            icon: iconText,
            title: title,
            text: text,
        });
    };

    const handleaction = (data: any) => {
        if (
            window.confirm(
                "Êtes-vous certain(e) de vouloir procéder à l'activation de ce véhicule ?"
            )
        ) {
            toggleActivate(data);
        }
    };

    const getFilter = async (val: string, url: string, isPag: boolean) => {
        setLoad(true);
        if (val === "" || url === "") {
            getAllutilisateur("liste-chauffeurs", false);
            return;
        }

        try {
            const { data } = await Api.getDatawithPagination(url + "/" + val, isPag);
            if (data.success) {
                setutilisateur(data.data.data);
                setpagination(data.data.links);
                setMeta({
                    current_page: data.data.current_page,
                    from: data.data.from,
                    to: data.data.to,
                    total: data.data.total,
                    last_page: data.data.last_page
                });
                setLoad(false);
            } else {
                handleDAta("Erreur", data.message, "warning");
                setLoad(false);
            }
        } catch (err: any) {
            handleDAta("Connexion au serveur impossible", err, "warning");
            setLoad(false);
        }
    };

    useEffect(() => {
        getAllutilisateur("liste-chauffeurs", false);
    }, []);

    // Calculate stats based on current data (or placeholders if not available globally)
    const totalChauffeurs = meta?.total || utilisateur.length;
    const chauffeursLibres = utilisateur.filter((u: any) => u.vehicules?.[0]?.statut === "LIBRE").length; // This is only for current page, but better than nothing
    // For Solde Cumulé, we sum up balance of current page
    const soldeCumule = utilisateur.reduce((acc: number, curr: any) => acc + (curr.balance || 0), 0);

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
                <ToastContainer />
                
                {/* Header */}
            <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between sticky top-0 z-10">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gestion des Chauffeurs</h2>
                    <p className="text-sm text-slate-500">Gérez et suivez l'activité de vos chauffeurs en temps réel.</p>
                </div>
                <button onClick={() => navigate('/add-driver')} className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined">add</span>
                    Ajouter un chauffeur
                </button>
            </header>

            {/* Main Workspace */}
            <div className="p-8 space-y-6">
                {/* Filters & Search */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[300px] relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input 
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary transition-all outline-none" 
                            placeholder="Rechercher par Numéro de téléphone" 
                            type="text"
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    getFilter(inputValue, "utilisateur/filtre-driver", false);
                                }
                            }}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button 
                            className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-sm font-medium flex items-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            onClick={() => getFilter(inputValue, "utilisateur/filtre-driver", false)}
                        >
                            <span className="material-symbols-outlined text-sm">filter_list</span>
                            Rechercher
                        </button>
                        <button className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-sm font-medium flex items-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                            <span className="material-symbols-outlined text-sm">download</span>
                            Exporter
                        </button>
                    </div>
                </div>

                {/* Drivers Table Container */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        {load ? (
                            <Loading />
                        ) : (
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Chauffeur</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Véhicule</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Téléphone</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ville</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Détails Véhicule</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Solde</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {utilisateur.length > 0 ? (
                                        utilisateur.map((item: any) => {
                                            const vehicule = item.vehicules && item.vehicules.length > 0 ? item.vehicules[0] : null;
                                            if (!vehicule) return null; // Skip if no vehicle, based on Chauffeur.tsx logic

                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                                    <td className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">{item.id}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden">
                                                                {item.photo ? (
                                                                    <img className="w-full h-full object-cover" src={item.photo} alt={`Photo de profil de ${item.nom}`} />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500">
                                                                        <span className="material-symbols-outlined">person</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-800 dark:text-white">
                                                                    {_helpersInstance.capitalizeFirstLetter(item.nom + " " + item.prenom)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="w-12 h-8 rounded bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700">
                                                            {vehicule.image ? (
                                                                <img className="w-full h-full object-cover" src={vehicule.image} alt="Véhicule" />
                                                            ) : (
                                                                <span className="material-symbols-outlined text-slate-400">directions_car</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">{item.telephone}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{vehicule.ville}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm">
                                                            <p className="font-medium text-slate-800 dark:text-white">{vehicule.modele}</p>
                                                            <p className="text-[11px] text-slate-500 font-bold uppercase">{vehicule.matricule}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {vehicule.statut === "LIBRE" ? (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                                LIBRE
                                                            </span>
                                                        ) : vehicule.statut === "INACTIF" ? (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
                                                                INACTIF
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                                                                OCCUPÉ
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm font-bold text-slate-800 dark:text-white">{item.balance ? item.balance.toFixed(2) : "0.00"} XAF</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {vehicule.statut === "INACTIF" && (
                                                                <button 
                                                                    onClick={() => handleaction(vehicule.id)}
                                                                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                                                                >
                                                                    Activer
                                                                </button>
                                                            )}
                                                            <a href={"#/driver-detail/" + item.id} className="text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">
                                                                Détail
                                                            </a>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                                <div className="flex flex-col items-center gap-3">
                                                    <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
                                                    <p>Aucun chauffeur trouvé</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                    
                    {/* Pagination */}
                    {utilisateur.length > 0 && pagination.length > 0 && (
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                            <p className="text-xs text-slate-500 font-medium">
                                {meta ? `Affichage de ${meta.from || 0} à ${meta.to || 0} sur ${meta.total || 0} chauffeurs` : "Pagination"}
                            </p>
                            <div className="flex gap-1 overflow-x-auto max-w-[500px]">
                                {pagination.map((item: any, index: number) => {
                                    // Skip first and last if they are just "Previous" and "Next" text buttons without clear visual indication in UI design, 

                                    // We will use standard rendering but style them
                                    
                                    const label = item.label.replace('&laquo; Previous', 'chevron_left').replace('Next &raquo;', 'chevron_right').replace('chevron_left', '<').replace('chevron_right', '>');
                                    
                                    // Handle Previous/Next icons
                                    if (item.label.includes('Previous') || item.label.includes('&laquo;')) {
                                         return (
                                            <button 
                                                key={index}
                                                onClick={() => item.url && getAllutilisateur(item.url, true)}
                                                disabled={!item.url}
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors ${!item.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <span className="material-symbols-outlined text-lg">chevron_left</span>
                                            </button>
                                         );
                                    }
                                    if (item.label.includes('Next') || item.label.includes('&raquo;')) {
                                        return (
                                           <button 
                                               key={index}
                                               onClick={() => item.url && getAllutilisateur(item.url, true)}
                                               disabled={!item.url}
                                               className={`w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors ${!item.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                           >
                                               <span className="material-symbols-outlined text-lg">chevron_right</span>
                                           </button>
                                        );
                                   }

                                    return (
                                        <button 
                                            key={index}
                                            onClick={() => item.url && getAllutilisateur(item.url, true)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg border ${item.active ? 'bg-primary text-white border-primary' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'} text-xs font-medium transition-colors`}
                                        >
                                            <span dangerouslySetInnerHTML={{ __html: label }}></span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Dashboard Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 text-xs font-bold uppercase">Total Chauffeurs</span>
                            <span className="material-symbols-outlined text-primary">groups</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold">{meta?.total || totalChauffeurs}</h3>
                            <span className="text-xs text-emerald-500 font-bold">+12%</span>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 text-xs font-bold uppercase">Chauffeurs Libres</span>
                            <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold">{chauffeursLibres}</h3>
                            <span className="text-xs text-slate-400 font-medium">{meta?.total ? Math.round((chauffeursLibres / meta.total) * 100) : 0}% total</span>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 text-xs font-bold uppercase">Solde Cumulé</span>
                            <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold">{soldeCumule.toLocaleString()}</h3>
                            <span className="text-xs text-slate-400 font-medium font-bold">XAF</span>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </MainLayout>
    );
}
