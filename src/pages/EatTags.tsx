import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";

/**
 * Les cuisines de « Laissez-vous tenter » : un nom, une image, un ordre.
 *
 * Une cuisine se masque plutôt qu'elle ne se supprime : filtres, bannières
 * et rubriques peuvent la désigner. Les boutiques choisissent les leurs dans
 * leur fiche.
 */

interface Cuisine {
    id: number;
    slug: string;
    name: string;
    image: string | null;
    is_active: boolean;
    stores_count: number;
}

interface EatTagsProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const champ = "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white";

export default function EatTags({ onLogout, theme, toggleTheme }: EatTagsProps) {
    const [cuisines, setCuisines] = useState<Cuisine[]>([]);
    const [form, setForm] = useState<{ id: number | null; name: string; image: string } | null>(null);
    const [envoi, setEnvoi] = useState(false);

    const api = new ApiService();

    const charger = async () => {
        try {
            const { data } = await api.getData("v3/admin/eat/tags");
            if (data.success) setCuisines(data.data ?? []);
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Cuisines illisibles", text: String(erreur) });
        }
    };

    useEffect(() => {
        charger();
    }, []);

    const echec = (data: { success: boolean; message: string }) => {
        if (data.success) return false;
        Swal.fire({ icon: "error", title: data.message });
        return true;
    };

    const televerser = async (fichier: File) => {
        setEnvoi(true);

        try {
            const { data } = await api.uploadImage(fichier);
            if (data.success) setForm((f) => (f === null ? f : { ...f, image: data.data }));
            else Swal.fire({ icon: "error", title: "Image refusée", text: data.message });
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Envoi impossible", text: String(erreur) });
        }

        setEnvoi(false);
    };

    const enregistrer = async () => {
        if (!form) return;

        const { data } = await api.postData("v3/admin/eat/tags", form);

        if (echec(data)) return;

        setForm(null);
        charger();
    };

    const deplacer = async (rang: number, sens: -1 | 1) => {
        const cible = rang + sens;
        if (cible < 0 || cible >= cuisines.length) return;

        const ordre = [...cuisines];
        [ordre[rang], ordre[cible]] = [ordre[cible], ordre[rang]];
        setCuisines(ordre);

        const { data } = await api.postData("v3/admin/eat/tags/reorder", { ids: ordre.map((c) => c.id) });
        if (!echec(data)) charger();
    };

    const basculer = async (c: Cuisine) => {
        const { data } = await api.postData("v3/admin/eat/tags/toggle", { id: c.id, is_active: !c.is_active });
        if (!echec(data)) charger();
    };

    const supprimer = async (c: Cuisine) => {
        const reponse = await Swal.fire({
            icon: "question",
            title: `Supprimer « ${c.name} » ?`,
            text: c.stores_count ? `${c.stores_count} boutique(s) la perdront.` : undefined,
            showCancelButton: true,
            confirmButtonText: "Supprimer",
            cancelButtonText: "Annuler",
        });

        if (!reponse.isConfirmed) return;

        const { data } = await api.postData("v3/admin/eat/tags/delete", { id: c.id });
        if (!echec(data)) charger();
    };

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-8 py-6 max-w-7xl mx-auto flex items-start justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Cuisines</h1>
                        <p className="text-sm text-slate-500 mt-1">La rangée « Laissez-vous tenter ». Image carrée, le plat détouré sur fond blanc.</p>
                    </div>
                    {!form && (
                        <button onClick={() => setForm({ id: null, name: "", image: "" })} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium dark:bg-white dark:text-slate-900">
                            Nouvelle cuisine
                        </button>
                    )}
                </div>
            </header>

            <main className="px-8 py-8 max-w-7xl mx-auto space-y-6">
                {/* La rangée, comme dans l'application. */}
                <div className="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white mb-3">Laissez-vous tenter</p>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                        {cuisines.filter((c) => c.is_active).map((c) => (
                            <div key={c.id} className="w-20 shrink-0 text-center">
                                <div className="w-16 h-16 mx-auto rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">{c.image && <img src={c.image} alt="" className="w-full h-full object-cover" />}</div>
                                <p className="text-xs font-bold mt-1 truncate text-slate-900 dark:text-white">{c.name}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {form && (
                    <div className="p-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
                        <label>
                            <span className="text-xs font-semibold uppercase text-slate-500">Nom</span>
                            <input className={champ} value={form.name} maxLength={60} placeholder="Ivoirien" onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </label>
                        <label>
                            <span className="text-xs font-semibold uppercase text-slate-500">Image</span>
                            <input type="file" accept="image/*" className="block mt-1 text-sm" disabled={envoi} onChange={(e) => e.target.files?.[0] && televerser(e.target.files[0])} />
                        </label>
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">{form.image && <img src={form.image} alt="" className="w-full h-full object-cover" />}</div>
                            <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300">Annuler</button>
                            <button onClick={enregistrer} disabled={!form.name.trim() || envoi} className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 dark:bg-white dark:text-slate-900">
                                Enregistrer
                            </button>
                        </div>
                    </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                    {cuisines.map((c, rang) => (
                        <div key={c.id} className={`p-4 flex items-center gap-4 ${c.is_active ? "" : "opacity-50"}`}>
                            <div className="flex flex-col">
                                <button onClick={() => deplacer(rang, -1)} disabled={rang === 0} className="disabled:opacity-20"><span className="material-symbols-outlined text-[18px]">arrow_upward</span></button>
                                <button onClick={() => deplacer(rang, 1)} disabled={rang === cuisines.length - 1} className="disabled:opacity-20"><span className="material-symbols-outlined text-[18px]">arrow_downward</span></button>
                            </div>
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">{c.image && <img src={c.image} alt="" className="w-full h-full object-cover" />}</div>
                            <div className="flex-1">
                                <p className="font-semibold text-slate-900 dark:text-white">{c.name}</p>
                                <p className="text-xs text-slate-500"><span className="font-mono">{c.slug}</span> · {c.stores_count} boutique(s)</p>
                            </div>
                            <button onClick={() => setForm({ id: c.id, name: c.name, image: c.image ?? "" })} className="text-sm text-slate-600 dark:text-slate-300">Modifier</button>
                            <button onClick={() => basculer(c)} className="text-sm text-slate-900 dark:text-white">{c.is_active ? "Masquer" : "Afficher"}</button>
                            <button onClick={() => supprimer(c)} className="text-sm text-rose-600">Supprimer</button>
                        </div>
                    ))}
                </div>
            </main>
        </MainLayout>
    );
}
