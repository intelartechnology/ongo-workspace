import React, { useEffect, useMemo, useState } from 'react';
import MainLayout from '../MainLayout';
import ApiService from '../../services/ApiService';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

interface RentalCategoriesProps {
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const isDisplayableImage = (value: string) => /^(https?:\/\/|data:image\/|\/)/.test(value || '');

const RentalCategories: React.FC<RentalCategoriesProps> = ({ onLogout, theme, toggleTheme }) => {
    const api = new ApiService();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [search, setSearch] = useState<string>('');
    const [categoryToDelete, setCategoryToDelete] = useState<any | null>(null);
    const [deleting, setDeleting] = useState<boolean>(false);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const response = await api.getData("location/category/all");
            if (response.data.success) {
                setCategories(response.data.data || []);
            } else {
                toast.error(response.data.message || "Erreur lors du chargement des catégories");
            }
        } catch (error) {
            toast.error("Erreur serveur/connexion");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!categoryToDelete) return;
        setDeleting(true);
        try {
            const response = await api.postData(`location/category/delete/${categoryToDelete.id}`, {});
            if (response.data.success) {
                toast.success(`Catégorie « ${categoryToDelete.libelle} » supprimée`);
                setCategoryToDelete(null);
                fetchCategories();
            } else {
                toast.error(response.data.message || "Suppression impossible");
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Erreur lors de la suppression");
        } finally {
            setDeleting(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    // Fermeture de la modale au clavier
    useEffect(() => {
        if (!categoryToDelete) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !deleting) setCategoryToDelete(null);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [categoryToDelete, deleting]);

    const filteredCategories = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return categories;
        return categories.filter((cat: any) =>
            `${cat.libelle || ''} ${cat.description || ''}`.toLowerCase().includes(term)
        );
    }, [categories, search]);

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            {/* En-tête */}
            <div className="bg-white dark:bg-slate-900 px-4 md:px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-5">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Link className="hover:text-primary transition-colors" to="/dashboard">Tableau de bord</Link>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                    <Link className="hover:text-primary transition-colors" to="/rentals">Location</Link>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold">Catégories</span>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#00327d] dark:text-white uppercase leading-none font-headline">
                                Catégories de Location
                            </h2>
                            {!loading && (
                                <span className="bg-primary/10 text-primary dark:text-primary-fixed-dim px-2.5 py-1 rounded-lg text-xs font-black tabular-nums">
                                    {categories.length}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl">
                            Regroupez vos véhicules de location par gamme (Berline, SUV, Utilitaire…).
                            Chaque véhicule doit être rattaché à une catégorie.
                        </p>
                    </div>

                    <Link
                        to="/rental-categories/add"
                        className="bg-primary hover:bg-primary/90 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-primary/20 justify-center shrink-0"
                    >
                        <span className="material-symbols-outlined text-[22px]">add</span>
                        Nouvelle catégorie
                    </Link>
                </div>

                {/* Recherche */}
                <div className="relative max-w-md">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] pointer-events-none">search</span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher une catégorie..."
                        className="w-full pl-11 pr-11 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-primary focus:bg-white dark:focus:bg-slate-800 outline-none transition-all text-sm font-semibold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 placeholder:font-normal"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            aria-label="Effacer la recherche"
                            className="absolute right-3 top-1/2 -translate-y-1/2 size-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Contenu */}
            <div className="p-4 md:p-8">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array(8).fill(0).map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <div className="aspect-[16/10] bg-slate-100 dark:bg-slate-800 animate-pulse"></div>
                                <div className="p-5 flex flex-col gap-3">
                                    <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800 animate-pulse"></div>
                                    <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse"></div>
                                    <div className="h-9 w-full rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse mt-2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : categories.length === 0 ? (
                    /* Aucune catégorie du tout */
                    <div className="py-16 px-6 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-4">
                        <div className="size-20 rounded-3xl bg-primary/5 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-5xl">category</span>
                        </div>
                        <div className="flex flex-col gap-1.5 max-w-sm">
                            <p className="font-black text-lg uppercase tracking-tight text-slate-800 dark:text-slate-100">Aucune catégorie</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Créez votre première catégorie pour pouvoir y rattacher des véhicules de location.
                            </p>
                        </div>
                        <Link
                            to="/rental-categories/add"
                            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-primary/20 mt-2"
                        >
                            <span className="material-symbols-outlined text-[22px]">add</span>
                            Créer une catégorie
                        </Link>
                    </div>
                ) : filteredCategories.length === 0 ? (
                    /* Recherche sans résultat */
                    <div className="py-16 px-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-4">
                        <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700">search_off</span>
                        <div className="flex flex-col gap-1.5">
                            <p className="font-black text-base uppercase tracking-tight text-slate-800 dark:text-slate-100">Aucun résultat</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Aucune catégorie ne correspond à «&nbsp;{search}&nbsp;».
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="text-xs font-black uppercase tracking-widest text-primary hover:underline mt-1"
                        >
                            Réinitialiser la recherche
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCategories.map((cat: any) => (
                            <div
                                key={cat.id}
                                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                            >
                                {/* Visuel */}
                                <div className="aspect-[16/10] bg-slate-100 dark:bg-slate-800/60 relative overflow-hidden">
                                    {isDisplayableImage(cat.img) ? (
                                        <img
                                            src={cat.img}
                                            alt={cat.libelle}
                                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                                            <span className="material-symbols-outlined text-6xl text-primary/30">directions_car</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-900/85 to-transparent"></div>
                                    <div className="absolute inset-x-0 bottom-0 p-4">
                                        <h3 className="font-black text-white text-lg tracking-tight uppercase leading-tight line-clamp-1 drop-shadow">
                                            {cat.libelle}
                                        </h3>
                                    </div>
                                    <span className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-[#00327d] dark:text-primary-fixed-dim shadow-sm">
                                        #{cat.id}
                                    </span>
                                </div>

                                {/* Corps */}
                                <div className="p-5 flex flex-col gap-4 flex-1">
                                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed flex-1">
                                        {cat.description || "Aucune description fournie."}
                                    </p>

                                    <Link
                                        to={`/rental-vehicles?category=${cat.id}`}
                                        className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-primary hover:text-white text-slate-600 dark:text-slate-300 transition-all group/link"
                                    >
                                        <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
                                            <span className="material-symbols-outlined text-[18px]">local_taxi</span>
                                            Voir les véhicules
                                        </span>
                                        <span className="material-symbols-outlined text-[18px] group-hover/link:translate-x-0.5 transition-transform">chevron_right</span>
                                    </Link>

                                    {/* Actions toujours visibles */}
                                    <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <Link
                                            to={`/rental-categories/edit/${cat.id}`}
                                            title="Modifier la catégorie"
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary/5 dark:bg-primary/15 text-primary dark:text-primary-fixed-dim hover:bg-primary hover:text-white transition-all text-[11px] font-black uppercase tracking-widest"
                                        >
                                            <span className="material-symbols-outlined text-[17px]">edit</span>
                                            Modifier
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => setCategoryToDelete(cat)}
                                            title="Supprimer la catégorie"
                                            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all text-[11px] font-black uppercase tracking-widest"
                                        >
                                            <span className="material-symbols-outlined text-[17px]">delete</span>
                                            Supprimer
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Confirmation de suppression */}
            {categoryToDelete && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
                    onClick={() => !deleting && setCategoryToDelete(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-7 flex flex-col gap-5"
                    >
                        <div className="flex items-start gap-4">
                            <div className="size-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-rose-500 text-2xl">delete</span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase leading-tight font-headline">
                                    Supprimer cette catégorie ?
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                    «&nbsp;<span className="font-bold text-slate-700 dark:text-slate-200">{categoryToDelete.libelle}</span>&nbsp;»
                                    sera définitivement supprimée.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            <span className="material-symbols-outlined text-[20px] shrink-0">info</span>
                            <p className="text-xs font-semibold leading-relaxed">
                                La suppression est refusée si des véhicules sont encore rattachés à cette catégorie.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setCategoryToDelete(null)}
                                disabled={deleting}
                                className="flex-1 px-5 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-all text-xs"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="flex-1 px-5 py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-widest shadow-lg shadow-rose-500/25 disabled:opacity-50 transition-all text-xs flex items-center justify-center gap-2"
                            >
                                {deleting && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                                {deleting ? 'Suppression…' : 'Supprimer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};

export default RentalCategories;
