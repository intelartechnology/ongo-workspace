import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import ImageField from "./components/ImageField";
import { envoyerSiBesoin } from "../services/images";

/**
 * Les catégories communes d'Ongo : « Viande et volaille », « Boissons »,
 * « Fournitures scolaires »…
 *
 * Chaque marchand nomme ses rayons comme il veut, puis les associe à une de
 * ces catégories dans son catalogue. Une tuile ou une bannière « Une
 * catégorie Ongo » montre alors ces rayons dans toutes les boutiques.
 */

interface Categorie {
    id: number;
    slug: string;
    name: string;
    image: string | null;
    parent_id: number | null;
    is_active: boolean;
    sections_count: number;
    stores_count: number;
    children?: Categorie[];
}

interface EatCategoriesProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const champ = "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white";

export default function EatCategories({ onLogout, theme, toggleTheme }: EatCategoriesProps) {
    const [categories, setCategories] = useState<Categorie[]>([]);
    const [form, setForm] = useState<{ id: number | null; name: string; image: string; parent_id: number | null } | null>(null);
    const [fichier, setFichier] = useState<File | null>(null);
    const [envoi, setEnvoi] = useState(false);

    const api = new ApiService();

    const charger = async () => {
        try {
            const { data } = await api.getData("v3/admin/eat/categories");
            if (data.success) setCategories(data.data ?? []);
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Catégories illisibles", text: String(erreur) });
        }
    };

    useEffect(() => {
        charger();
    }, []);

    useEffect(() => setFichier(null), [form === null, form?.id]);

    const echec = (data: { success: boolean; message: string }) => {
        if (data.success) return false;
        Swal.fire({ icon: "error", title: data.message });
        return true;
    };

    const enregistrer = async () => {
        if (!form) return;

        setEnvoi(true);

        try {
            const image = await envoyerSiBesoin(fichier, form.image || null);
            const { data } = await api.postData("v3/admin/eat/categories", { ...form, image });

            setEnvoi(false);

            if (echec(data)) return;
        } catch (erreur) {
            setEnvoi(false);
            Swal.fire({ icon: "error", title: "Image non envoyée", text: String((erreur as Error).message ?? erreur) });
            return;
        }

        setForm(null);
        charger();
    };

    /** Monter ou descendre, au sein de son niveau. */
    const deplacer = async (c: Categorie, rang: number, sens: -1 | 1) => {
        const voisines = c.parent_id ? categories.find((p) => p.id === c.parent_id)?.children ?? [] : categories;
        const cible = rang + sens;

        if (cible < 0 || cible >= voisines.length) return;

        const ordre = [...voisines];
        [ordre[rang], ordre[cible]] = [ordre[cible], ordre[rang]];

        const { data } = await api.postData("v3/admin/eat/categories/reorder", { ids: ordre.map((x) => x.id) });
        if (!echec(data)) charger();
    };

    const basculer = async (c: Categorie) => {
        const { data } = await api.postData("v3/admin/eat/categories/toggle", { id: c.id, is_active: !c.is_active });
        if (!echec(data)) charger();
    };

    const supprimer = async (c: Categorie) => {
        const reponse = await Swal.fire({
            icon: "question",
            title: `Supprimer « ${c.name} » ?`,
            text: c.sections_count ? `${c.sections_count} rayon(s) ne seront plus associés à une catégorie.` : undefined,
            showCancelButton: true,
            confirmButtonText: "Supprimer",
            cancelButtonText: "Annuler",
        });

        if (!reponse.isConfirmed) return;

        const { data } = await api.postData("v3/admin/eat/categories/delete", { id: c.id });
        if (!echec(data)) charger();
    };

    /** Une catégorie ou une sous-catégorie : image, nom, rayons rattachés, actions. */
    const ligne = (c: Categorie, rang: number, total: number, sous = false) => (
        <div key={c.id} className={`flex items-center gap-4 ${c.is_active ? "" : "opacity-50"}`}>
            <div className="flex flex-col">
                <button onClick={() => deplacer(c, rang, -1)} disabled={rang === 0} className="disabled:opacity-20">
                    <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                </button>
                <button onClick={() => deplacer(c, rang, 1)} disabled={rang === total - 1} className="disabled:opacity-20">
                    <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                </button>
            </div>
            <div className={`${sous ? "w-10 h-10" : "w-12 h-12"} rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0`}>
                {c.image && <img src={c.image} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1">
                <p className={`${sous ? "text-sm" : "font-semibold"} text-slate-900 dark:text-white`}>{c.name}</p>
                <p className="text-xs text-slate-500">
                    <span className="font-mono">{c.slug}</span> ·{" "}
                    {c.sections_count ? `${c.sections_count} rayon(s) dans ${c.stores_count} boutique(s)` : <span className="text-amber-700">aucun rayon rattaché</span>}
                </p>
            </div>
            <button onClick={() => setForm({ id: c.id, name: c.name, image: c.image ?? "", parent_id: c.parent_id })} className="text-sm text-slate-600 dark:text-slate-300">
                Modifier
            </button>
            <button onClick={() => basculer(c)} className="text-sm text-slate-900 dark:text-white">{c.is_active ? "Masquer" : "Afficher"}</button>
            <button onClick={() => supprimer(c)} className="text-sm text-rose-600">Supprimer</button>
        </div>
    );

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-8 py-6 max-w-7xl mx-auto flex items-start justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Catégories</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Communes à toutes les boutiques. Les marchands y associent leurs rayons dans leur catalogue ; une tuile « Une catégorie Ongo » les montre tous.
                        </p>
                    </div>
                    {!form && (
                        <button onClick={() => setForm({ id: null, name: "", image: "", parent_id: null })} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium dark:bg-white dark:text-slate-900">
                            Nouvelle catégorie
                        </button>
                    )}
                </div>
            </header>

            <main className="px-8 py-8 max-w-7xl mx-auto space-y-6">
                {form && (
                    <div className="p-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
                        <label>
                            <span className="text-xs font-semibold uppercase text-slate-500">
                                {form.parent_id ? `Sous-catégorie de « ${categories.find((c) => c.id === form.parent_id)?.name ?? ""} »` : "Nom"}
                            </span>
                            <input className={champ} value={form.name} maxLength={80} placeholder={form.parent_id ? "Jus, Sodas, Eaux…" : "Viande et volaille"} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </label>
                        <ImageField
                            label="Image (facultative)"
                            hint="Pour les listes du workspace."
                            adresse={form.image}
                            fichier={fichier}
                            owner="ongo"
                            disabled={envoi}
                            forme="aspect-square"
                            onChange={(image, choisi) => {
                                setForm({ ...form, image });
                                setFichier(choisi);
                            }}
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300">Annuler</button>
                            <button onClick={enregistrer} disabled={!form.name.trim() || envoi} className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 dark:bg-white dark:text-slate-900">
                                {envoi ? "Envoi…" : "Enregistrer"}
                            </button>
                        </div>
                    </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                    {categories.length === 0 && <p className="p-6 text-slate-500">Aucune catégorie : « Viande et volaille », « Boissons », « Produits d'épicerie »…</p>}
                    {categories.map((c, rang) => (
                        <div key={c.id} className="p-4">
                            {ligne(c, rang, categories.length)}

                            {/* Ses sous-catégories : « Boissons › Jus, Sodas… » */}
                            <div className="mt-3 ml-8 pl-4 border-l-2 border-slate-200 dark:border-slate-800 space-y-3">
                                {(c.children ?? []).map((sous, i) => ligne(sous, i, (c.children ?? []).length, true))}
                                <button
                                    onClick={() => setForm({ id: null, name: "", image: "", parent_id: c.id })}
                                    className="text-sm text-slate-600 dark:text-slate-300 underline"
                                >
                                    + Sous-catégorie
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-slate-400">
                    Une page « Boissons » montre aussi les rayons rangés dans ses sous-catégories. Les images sont celles de la galerie ; elles servent d'icônes dans l'application.
                </p>
            </main>
        </MainLayout>
    );
}
