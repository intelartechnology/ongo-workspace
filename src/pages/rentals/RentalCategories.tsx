import React, { useEffect, useState } from 'react';
import MainLayout from '../MainLayout';
import ApiService from '../../services/ApiService';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

interface RentalCategoriesProps {
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const RentalCategories: React.FC<RentalCategoriesProps> = ({ onLogout, theme, toggleTheme }) => {
    const api = new ApiService();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const response = await api.getData("location/category/all");
            if (response.data.success) {
                setCategories(response.data.data);
            } else {
                toast.error("Erreur lors du chargement des catégories");
            }
        } catch (error) {
            toast.error("Erreur serveur/connexion");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const deleteCategory = async (id: number) => {
        if (!window.confirm("Voulez-vous vraiment supprimer cette catégorie ?")) return;
        try {
            const response = await api.postData(`location/category/delete/${id}`, {});
            if (response.data.success) {
                toast.success("Catégorie supprimée");
                fetchCategories();
            }
        } catch (error) {
            toast.error("Erreur lors de la suppression");
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="bg-white dark:bg-slate-900 px-4 md:px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-500 font-manrope">
                    <Link className="hover:text-primary transition-colors" to="/dashboard">Tableau de bord</Link>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                    <Link className="hover:text-primary transition-colors" to="/rentals">Location</Link>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold">Catégories</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#00327d] dark:text-white uppercase leading-none font-headline">Catégories de Location</h2>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Link 
                            to="/rental-categories/add"
                            className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-primary/20 w-full sm:w-auto justify-center"
                        >
                            <span className="material-symbols-outlined text-[23px]">add_task</span>
                            Ajouter une catégorie
                        </Link>
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {loading ? (
                        Array(6).fill(0).map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 h-64 animate-pulse"></div>
                        ))
                    ) : categories.length === 0 ? (
                        <div className="col-span-full py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-400">
                             <span className="material-symbols-outlined text-6xl block mb-4 opacity-20">category</span>
                             <p className="font-bold text-lg uppercase tracking-widest">Aucune catégorie trouvée</p>
                        </div>
                    ) : (
                        categories.map((cat: any) => (
                            <div key={cat.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group">
                                <div className="aspect-video bg-indigo-50 dark:bg-slate-800/50 relative p-6 flex flex-col justify-end">
                                    <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link 
                                            to={`/rental-categories/edit/${cat.id}`}
                                            className="size-9 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-slate-600 hover:text-primary hover:scale-110 transition-all border border-slate-100 dark:border-slate-800"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">edit_note</span>
                                        </Link>
                                        <button 
                                            onClick={() => deleteCategory(cat.id)}
                                            className="size-9 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white hover:scale-110 transition-all border border-slate-100 dark:border-slate-800"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                                        </button>
                                    </div>
                                    
                                    {cat.img ? (
                                        <img src={cat.img} alt={cat.libelle} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity" />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-5">
                                            <span className="material-symbols-outlined text-9xl">category</span>
                                        </div>
                                    )}

                                    <div className="relative z-10">
                                        <h3 className="font-black text-slate-900 dark:text-white text-xl tracking-tight uppercase leading-none">{cat.libelle}</h3>
                                        <p className="text-[10px] text-primary font-black mt-2 uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded inline-block">ID: #{cat.id}</p>
                                    </div>
                                </div>
                                <div className="p-6 flex flex-col gap-4 flex-1">
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                                        {cat.description || "Aucune description fournie pour cette catégorie de véhicule."}
                                    </p>

                                    <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-emerald-500 text-[20px]">check_circle</span>
                                            <span className="text-[11px] font-black uppercase text-slate-400 tracking-tighter">Active</span>
                                        </div>
                                        <Link 
                                            to={`/rental-vehicles?category=${cat.id}`}
                                            className="text-[10px] font-black uppercase tracking-widest text-[#00327d] bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full hover:bg-[#00327d] hover:text-white transition-all"
                                        >
                                            Voir Véhicules
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default RentalCategories;
