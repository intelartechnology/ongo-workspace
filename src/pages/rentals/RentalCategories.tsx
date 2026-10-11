import React, { useEffect, useMemo, useState } from 'react';
import MainLayout from '../MainLayout';
import ApiService from '../../services/ApiService';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { SearchBar, Button } from '../../components/ui';
import RentalCategoryModal from './RentalCategoryModal';

interface RentalCategoriesProps {
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const isDisplayableImage = (value: string) => /^(https?:\/\/|data:image\/|\/)/.test(value || '');

const entete = "px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest";

const RentalCategories: React.FC<RentalCategoriesProps> = ({ onLogout, theme, toggleTheme }) => {
    const api = new ApiService();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [search, setSearch] = useState<string>('');
    const [categoryToDelete, setCategoryToDelete] = useState<any | null>(null);
    const [deleting, setDeleting] = useState<boolean>(false);
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    // `null` ouvre le formulaire vierge ; une ligne l'ouvre en modification.
    const [categoryToEdit, setCategoryToEdit] = useState<any | null>(null);

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

                    <Button
                        variant="primary"
                        icon="add"
                        className="shrink-0"
                        onClick={() => { setCategoryToEdit(null); setModalOpen(true); }}
                    >
                        Nouvelle catégorie
                    </Button>
                </div>

                {/* Recherche */}
                <SearchBar
                    value={search}
                    onChange={setSearch}
                    placeholder="Rechercher une catégorie..."
                    className="max-w-md flex-none"
                />
            </div>

            {/* Contenu */}
            <div className="p-4 md:p-8">
                {loading ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                        {Array(6).fill(0).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                                <div className="size-11 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse shrink-0"></div>
                                <div className="h-3 w-40 rounded bg-slate-100 dark:bg-slate-800 animate-pulse"></div>
                                <div className="h-3 flex-1 rounded bg-slate-100 dark:bg-slate-800 animate-pulse"></div>
                                <div className="h-8 w-28 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse"></div>
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
                        <Button
                            variant="primary"
                            icon="add"
                            className="mt-2"
                            onClick={() => { setCategoryToEdit(null); setModalOpen(true); }}
                        >
                            Créer une catégorie
                        </Button>
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
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[720px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className={entete}>Catégorie</th>
                                        <th className={entete}>Description</th>
                                        <th className={`${entete} text-right`}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredCategories.map((cat: any) => (
                                        <tr key={cat.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    {/* La vignette remplace le visuel pleine largeur des
                                                        cartes : elle suffit à reconnaître la gamme. */}
                                                    <div className="size-11 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center">
                                                        {isDisplayableImage(cat.img) ? (
                                                            <img src={cat.img} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-xl text-primary/40">directions_car</span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{cat.libelle}</span>
                                                        <span className="text-[11px] text-slate-400 font-mono leading-tight">#{cat.id}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400 max-w-md">
                                                <span className="line-clamp-2">{cat.description || "Aucune description fournie."}</span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex gap-1.5 justify-end">
                                                    <Link to={`/rental-vehicles?category=${cat.id}`} title="Voir les véhicules">
                                                        <Button type="button" size="sm" icon="local_taxi">Véhicules</Button>
                                                    </Link>
                                                    <Button
                                                        size="sm"
                                                        icon="edit"
                                                        onClick={() => { setCategoryToEdit(cat); setModalOpen(true); }}
                                                    >
                                                        Modifier
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        icon="delete"
                                                        aria-label={`Supprimer ${cat.libelle}`}
                                                        className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600"
                                                        onClick={() => setCategoryToDelete(cat)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <RentalCategoryModal
                open={modalOpen}
                category={categoryToEdit}
                onClose={() => setModalOpen(false)}
                onSaved={fetchCategories}
            />

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
