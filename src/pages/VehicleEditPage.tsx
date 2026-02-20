import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import {
    doc,
  updateDoc,
} from "firebase/firestore/lite";
import { db } from "./../services/firebase";
interface VehicleEditPageProps {
    onLogout?: () => void;
    theme?: "light" | "dark";
    toggleTheme?: () => void;
}

export default function VehicleEditPage({
    onLogout = () => { },
    theme = "light",
    toggleTheme = () => { },
}: VehicleEditPageProps) {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const Api = new ApiService();

    const [vehicle, setVehicle] = useState<any>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [categorySup, setCategorySup] = useState<any>(null);
    const [loadingCat, setLoadingCat] = useState(true);
    const [loadingSupCat, setLoadingSupCat] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submittingSup, setSubmittingSup] = useState(false);

    /* ── react-hook-form for main info ── */
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<any>();

    /* ── react-hook-form for secondary category ── */
    const {
        register: registerSup,
        handleSubmit: handleSubmitSup,
        formState: { errors: errorsSup },
    } = useForm<any>();

    const notify = (message: string, type: "success" | "error") => {
        type === "success" ? toast.success(`✅ ${message}`) : toast.error(`❌ ${message}`);
    };

    /* ── Load vehicle from sessionStorage ── */
    useEffect(() => {
        const stored = sessionStorage.getItem(`vehicle_edit_${id}`);
        if (stored) {
            try {
                const data = JSON.parse(stored);
                setVehicle(data);
                reset({
                    matricule: data.matricule,
                    color: data.color,
                    ville: data.ville,
                    categorie: data.categorie_id,
                });
            } catch {
                console.error("Failed to parse vehicle data");
            }
        }
    }, [id]);

    /* ── Load categories from API ── */
    useEffect(() => {
        Api.getData("categorie-vehicule/liste")
            .then(({ data }) => {
                if (data.success) setCategories(data.data);
            })
            .catch(console.error)
            .finally(() => setLoadingCat(false));

        if (id) {
            Api.postData("categorie-vehicule/liste-sup", { vehicule_id: Number(id) })
                .then(({ data }) => {
                    if (data.success) setCategorySup(data.data);
                })
                .catch(console.error)
                .finally(() => setLoadingSupCat(false));
        }
    }, [id]);

    /* ── Submit main vehicle info ── */
    const onSubmit = async (formData: any) => {
        if (!vehicle) return;
        setSubmitting(true);
        try {
            const docRef = doc(
                db,
                "vehicules",
                vehicle.id.toString() /*data.id*/
            );
            const payload = {
                matricule: formData.matricule,
                color: formData.color,
                ville: formData.ville,
                vehicule_id: vehicle.id,
                chauffeur_id: vehicle.chauffeur_id,
                categorie_id: Number(formData.categorie),
            };
             await updateDoc(docRef, {
                categorie_id: Number(formData.categorie),
                matricule: formData.matricule,
      });
            console.log("Document written with ID: ", docRef.id);
            if (docRef.id === null) {
                console.log(docRef.id);

                notify(
                    "Une erreur c'est produite lors de la creation de la categorie",
                    "error"
                );
            } else {
                const { data } = await Api.postData("vehicule/modifier", payload);
                if (data.success) {
                    notify("Véhicule modifié avec succès", "success");
                    setTimeout(() => navigate("/vehicles"), 1200);
                } else {
                    notify(data.message || "Une erreur s'est produite", "error");
                }
            }

        } catch {
            notify("Erreur de connexion au serveur", "error");
        } finally {
            setSubmitting(false);
        }
    };

    /* ── Submit secondary category ── */
    const onSubmitSup = async (formData: any) => {
        if (!vehicle) return;
        setSubmittingSup(true);
        try {
            const payload = {
                vehicule_id: vehicle.id,
                categorie_id: Number(formData.categoriesup),
            };
            const { data } = await Api.postData("categorie-vehicule/addsup", payload);
            if (data.success) {
                notify("Catégorie secondaire ajoutée", "success");
                setCategorySup({ category_id: Number(formData.categoriesup) });
            } else {
                notify(data.message || "Une erreur s'est produite", "error");
            }
        } catch {
            notify("Erreur de connexion au serveur", "error");
        } finally {
            setSubmittingSup(false);
        }
    };

    /* ── Delete secondary category ── */
    const onDeleteSup = async () => {
        if (!vehicle) return;
        setSubmittingSup(true);
        try {
            const { data } = await Api.postData("categorie-vehicule/destroysup", {
                vehicule_id: vehicle.id,
            });
            if (data.success) {
                notify("Catégorie secondaire supprimée", "success");
                setCategorySup(null);
            } else {
                notify(data.message || "Erreur lors de la suppression", "error");
            }
        } catch {
            notify("Erreur de connexion au serveur", "error");
        } finally {
            setSubmittingSup(false);
        }
    };

    const categoryLabel = (id: number) => {
        if (id === 1) return "ECO";
        if (id === 2) return "PREMIUM";
        if (id === 3) return "BUSINESS";
        return id;
    };

    /* ── Available secondary categories (exclude primary + current sup) ── */
    const availableSupCategories = categories.filter(
        (c) =>
            c.id !== vehicle?.categorie_id &&
            (categorySup === null || c.id !== categorySup?.category_id)
    );

    if (!vehicle) {
        return (
            <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
                <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                    <span className="material-symbols-outlined text-5xl text-slate-300">search_off</span>
                    <p className="text-slate-500 font-medium">Données du véhicule introuvables.</p>
                    <button
                        onClick={() => navigate("/vehicles")}
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold"
                    >
                        Retour aux véhicules
                    </button>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display">
                {/* Header */}
                <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                    <nav className="flex items-center gap-2 text-sm text-slate-500">
                        <button onClick={() => navigate("/dashboard")} className="hover:underline">
                            Tableau de bord
                        </button>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        <button onClick={() => navigate("/vehicles")} className="hover:underline">
                            Véhicules
                        </button>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        <span className="text-slate-900 dark:text-slate-100 font-medium">Mise à jour</span>
                    </nav>
                </header>

                {/* Content */}
                <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
                    {/* Title */}
                    <div className="flex flex-col gap-1">
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            Mise à jour du véhicule
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400">
                            Modifier les spécifications techniques et les catégories opérationnelles.
                        </p>
                    </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* ── Left: Main Info ── */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">info</span>
                                    Information du véhicule
                                </h3>
                            </div>
                            <div className="p-8">
                                {loadingCat ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="size-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Matricule */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                    Matricule
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm py-2.5 px-3"
                                                    {...register("matricule", { required: "Matricule obligatoire" })}
                                                />
                                                {errors.matricule && (
                                                    <p className="text-xs text-red-500">{errors.matricule.message as string}</p>
                                                )}
                                            </div>

                                            {/* Couleur */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                    Couleur du véhicule
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Ex: Blanc"
                                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm py-2.5 px-3"
                                                    {...register("color")}
                                                />
                                            </div>

                                            {/* Ville */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                    Ville
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm py-2.5 px-3"
                                                    {...register("ville")}
                                                />
                                            </div>

                                            {/* Catégorie principale */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                    Catégorie du véhicule
                                                </label>
                                                <select
                                                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm py-2.5 px-3"
                                                    {...register("categorie", { required: "Catégorie obligatoire" })}
                                                >
                                                    {categories.map((cat) => (
                                                        <option key={cat.id} value={cat.id}>
                                                            {cat.libelle}
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors.categorie && (
                                                    <p className="text-xs text-red-500">{errors.categorie.message as string}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Current category info */}
                                        <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg flex items-center gap-3">
                                            <span className="material-symbols-outlined text-primary">stars</span>
                                            <p className="text-sm font-medium text-primary">
                                                Catégorie principale :{" "}
                                                <span className="font-bold">
                                                    {vehicle.categorie?.libelle || "—"}
                                                </span>
                                            </p>
                                        </div>

                                        {/* Secondary category (read-only display) */}
                                        {categorySup && (
                                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="material-symbols-outlined text-slate-400">category</span>
                                                    <span className="text-slate-600 dark:text-slate-400">
                                                        Catégorie secondaire :{" "}
                                                        <span className="font-bold text-slate-900 dark:text-white">
                                                            {categoryLabel(categorySup.category_id)}
                                                        </span>
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={onDeleteSup}
                                                    disabled={submittingSup}
                                                    className="px-3 py-1 bg-red-100 text-red-600 rounded text-xs font-bold hover:bg-red-200 transition-all"
                                                >
                                                    Supprimer
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-end gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => navigate("/vehicles")}
                                                className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                            >
                                                Fermer
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className="px-6 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary/90 shadow-md shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-70"
                                            >
                                                {submitting && (
                                                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                )}
                                                Enregistrer
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>

                        {/* ── Right: Secondary Category ── */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">category</span>
                                    Catégorie secondaire
                                </h3>
                            </div>
                            <div className="p-8">
                                {loadingSupCat ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="size-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmitSup(onSubmitSup)} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                Nom de la catégorie
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <span className="material-symbols-outlined text-slate-400 text-[20px]">
                                                        category
                                                    </span>
                                                </div>
                                                <select
                                                    className="w-full pl-10 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm py-2.5 pr-3 appearance-none"
                                                    {...registerSup("categoriesup", { required: "Catégorie obligatoire" })}
                                                >
                                                    {availableSupCategories.length === 0 ? (
                                                        <option value="">Aucune catégorie disponible</option>
                                                    ) : (
                                                        availableSupCategories.map((cat) => (
                                                            <option key={cat.id} value={cat.id}>
                                                                {cat.libelle}
                                                            </option>
                                                        ))
                                                    )}
                                                </select>
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                    <span className="material-symbols-outlined text-slate-400">expand_more</span>
                                                </div>
                                            </div>
                                            {errorsSup.categoriesup && (
                                                <p className="text-xs text-red-500">
                                                    {errorsSup.categoriesup.message as string}
                                                </p>
                                            )}
                                        </div>

                                        {/* Placeholder when no secondary category */}
                                        {!categorySup && (
                                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center gap-2 min-h-[120px]">
                                                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-4xl">
                                                    inventory_2
                                                </span>
                                                <p className="text-xs text-slate-400 max-w-[200px]">
                                                    Sélectionnez une catégorie secondaire pour ce véhicule.
                                                </p>
                                            </div>
                                        )}

                                        {categorySup && (
                                            <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg flex items-center gap-3">
                                                <span className="material-symbols-outlined text-primary">check_circle</span>
                                                <p className="text-sm font-medium text-primary">
                                                    Catégorie secondaire actuelle :{" "}
                                                    <span className="font-bold">
                                                        {categoryLabel(categorySup.category_id)}
                                                    </span>
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-end gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => navigate("/vehicles")}
                                                className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                            >
                                                Fermer
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={submittingSup || availableSupCategories.length === 0}
                                                className="px-6 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary/90 shadow-md shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-70"
                                            >
                                                {submittingSup && (
                                                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                )}
                                                Enregistrer
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Map preview strip */}
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 h-48 relative group">
                        <div className="absolute inset-0 bg-slate-900/40 z-[1] flex items-center justify-center">
                            <div className="text-center">
                                <h4 className="text-white font-bold text-xl drop-shadow-md">Localisation Actuelle</h4>
                                <p className="text-white/80 text-sm">{vehicle.ville || "Yaoundé, Cameroun"}</p>
                            </div>
                        </div>
                        <div className="w-full h-full bg-gradient-to-br from-primary/60 to-slate-800 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white/20 text-[120px]">map</span>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
