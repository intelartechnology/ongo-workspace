import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import EatTargetPicker, { cibleComplete, decrireCible } from "./components/EatTargetPicker";
import type { TargetOptions, TargetType } from "./components/EatTargetPicker";

/**
 * Les bannières de l'accueil Ongo Eat, en deux emplacements :
 *
 *   - **Entrée** : le carrousel en haut, une bannière par page, qui avance
 *     seule. C'est là que vivent les tickets de code promo.
 *   - **Meilleurs deals** : la rangée sous « Laissez-vous tenter », cartes larges
 *     et carrées mêlées.
 *
 * Le graphiste fait le visuel en entier — texte, dégradé, logo. Ici on ne
 * choisit que l'image, son format, où elle mène et quand elle s'affiche.
 */

type Placement = "hero" | "deals";

interface Banniere {
    id: number;
    placement: Placement;
    title: string;
    image: string;
    format: "wide" | "square";
    promo_code: string | null;
    target_type: TargetType | null;
    target_value: string | null;
    starts_at: string | null;
    ends_at: string | null;
    is_active: boolean;
}

interface EatBannersProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const champ = "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white";

const EMPLACEMENTS: Record<Placement, { titre: string; aide: string }> = {
    hero: { titre: "Entrée", aide: "Le carrousel en haut de l'accueil. Format large 1240 × 600 px." },
    deals: { titre: "Meilleurs deals", aide: "La rangée sous « Laissez-vous tenter ». Large 1240 × 600 px ou carré 600 × 600 px." },
};

const vide = (placement: Placement) => ({
    id: null as number | null,
    placement,
    title: "",
    image: "",
    format: "wide" as "wide" | "square",
    promo_code: "",
    target_type: (placement === "hero" ? "promo" : "store") as TargetType,
    target_value: "",
    starts_at: "",
    ends_at: "",
});

// La carte telle qu'elle apparaîtra : même hauteur pour toutes.
function Carte({ image, format, h = 150 }: { image: string; format: "wide" | "square"; h?: number }) {
    return (
        <div className="shrink-0 rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800" style={{ height: h, width: format === "square" ? h : h * 2.06 }}>
            {image && <img src={image} alt="" className="w-full h-full object-cover" />}
        </div>
    );
}

export default function EatBanners({ onLogout, theme, toggleTheme }: EatBannersProps) {
    const [emplacement, setEmplacement] = useState<Placement>("hero");
    const [bannieres, setBannieres] = useState<Banniere[]>([]);
    const [options, setOptions] = useState<TargetOptions>({ stores: [], tags: [], campaigns: [], promo_codes: [] });
    const [form, setForm] = useState<ReturnType<typeof vide> | null>(null);
    const [envoi, setEnvoi] = useState(false);

    const api = new ApiService();

    const charger = async () => {
        try {
            const { data } = await api.getData("v3/admin/eat/banners");

            if (data.success) {
                setBannieres(data.data.banners ?? []);
                setOptions({
                    stores: data.data.stores ?? [],
                    tags: data.data.tags ?? [],
                    campaigns: data.data.campaigns ?? [],
                    promo_codes: data.data.promo_codes ?? [],
                });
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Bannières illisibles", text: String(erreur) });
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

            if (data.success) {
                setForm((f) => (f === null ? f : { ...f, image: data.data }));
            } else {
                Swal.fire({ icon: "error", title: "Image refusée", text: data.message });
            }
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Envoi impossible", text: String(erreur) });
        }

        setEnvoi(false);
    };

    const enregistrer = async () => {
        if (!form) return;

        const { data } = await api.postData("v3/admin/eat/banners", {
            id: form.id,
            placement: form.placement,
            title: form.title,
            image: form.image,
            // L'entrée n'a qu'un format.
            format: form.placement === "hero" ? "wide" : form.format,
            promo_code: form.promo_code || null,
            target_type: form.target_type || null,
            target_value: form.target_value || null,
            starts_at: form.starts_at || null,
            ends_at: form.ends_at || null,
        });

        if (echec(data)) return;

        Swal.fire({ icon: "success", title: data.message, timer: 1200, showConfirmButton: false });
        setForm(null);
        charger();
    };

    const basculer = async (b: Banniere) => {
        const { data } = await api.postData("v3/admin/eat/banners/toggle", { id: b.id, is_active: !b.is_active });

        if (!echec(data)) charger();
    };

    const liste = bannieres.filter((b) => (b.placement ?? "hero") === emplacement);

    const deplacer = async (rang: number, sens: -1 | 1) => {
        const cible = rang + sens;

        if (cible < 0 || cible >= liste.length) return;

        const ordre = [...liste];
        [ordre[rang], ordre[cible]] = [ordre[cible], ordre[rang]];

        const { data } = await api.postData("v3/admin/eat/banners/reorder", { ids: ordre.map((b) => b.id) });

        if (!echec(data)) charger();
    };

    const supprimer = async (b: Banniere) => {
        const reponse = await Swal.fire({
            icon: "question",
            title: `Supprimer « ${b.title} » ?`,
            showCancelButton: true,
            confirmButtonText: "Supprimer",
            cancelButtonText: "Annuler",
        });

        if (!reponse.isConfirmed) return;

        const { data } = await api.postData("v3/admin/eat/banners/delete", { id: b.id });

        if (!echec(data)) charger();
    };

    const modifier = (b: Banniere) =>
        setForm({
            id: b.id,
            placement: b.placement ?? "hero",
            title: b.title,
            image: b.image,
            format: b.format ?? "wide",
            promo_code: b.target_type === "promo" ? "" : b.promo_code ?? "",
            target_type: (b.target_type ?? "") as TargetType,
            target_value: b.target_value ?? "",
            starts_at: b.starts_at ? b.starts_at.slice(0, 16) : "",
            ends_at: b.ends_at ? b.ends_at.slice(0, 16) : "",
        });

    const enCours = (b: Banniere) =>
        b.is_active && (!b.starts_at || new Date(b.starts_at) <= new Date()) && (!b.ends_at || new Date(b.ends_at) >= new Date());

    const valide = !!form && form.title.trim() !== "" && form.image !== "" && cibleComplete(form.target_type, form.target_value);

    // L'aperçu d'une rangée, comme dans l'application.
    const Rangee = ({ elements, placement }: { elements: { image: string; format: "wide" | "square" }[]; placement: Placement }) =>
        placement === "hero" ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
                {elements.map((e, i) => (
                    <Carte key={i} image={e.image} format="wide" h={170} />
                ))}
            </div>
        ) : (
            <>
                <p className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white mb-3">Meilleurs deals</p>
                <div className="flex gap-3 overflow-x-auto pb-2">
                    {elements.map((e, i) => (
                        <Carte key={i} image={e.image} format={e.format} />
                    ))}
                </div>
            </>
        );

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-8 py-6 max-w-7xl mx-auto flex items-start justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Bannières</h1>
                        <p className="text-sm text-slate-500 mt-1">Texte, dégradé et logo sont dans l'image du graphiste. Ici : l'emplacement, la destination, la période.</p>
                    </div>
                    {!form && (
                        <button onClick={() => setForm(vide(emplacement))} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium dark:bg-white dark:text-slate-900">
                            Nouvelle bannière
                        </button>
                    )}
                </div>
            </header>

            <main className="px-8 py-8 max-w-7xl mx-auto space-y-6">
                <div className="flex gap-2">
                    {(Object.keys(EMPLACEMENTS) as Placement[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => {
                                setEmplacement(p);
                                setForm(null);
                            }}
                            className={`px-4 py-1.5 rounded-full text-sm border ${
                                emplacement === p
                                    ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                                    : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                            }`}
                        >
                            {EMPLACEMENTS[p].titre} · {bannieres.filter((b) => (b.placement ?? "hero") === p).length}
                        </button>
                    ))}
                </div>

                {/* Ce qu'un client voit maintenant à cet emplacement. */}
                <div className="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase text-slate-500 mb-3">En ce moment — {EMPLACEMENTS[emplacement].aide}</p>
                    {liste.filter(enCours).length === 0 ? (
                        <p className="text-sm text-slate-400">Rien en ce moment : l'emplacement est masqué.</p>
                    ) : (
                        <Rangee elements={liste.filter(enCours)} placement={emplacement} />
                    )}
                </div>

                {form && (
                    <div className="p-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <label>
                                        <span className="text-xs font-semibold uppercase text-slate-500">Emplacement</span>
                                        <select className={champ} value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value as Placement })}>
                                            <option value="hero">Entrée (en haut)</option>
                                            <option value="deals">Meilleurs deals</option>
                                        </select>
                                    </label>
                                    <label>
                                        <span className="text-xs font-semibold uppercase text-slate-500">Nom (pour le workspace)</span>
                                        <input className={champ} value={form.title} maxLength={120} placeholder="Code BONJOUR" onChange={(e) => setForm({ ...form, title: e.target.value })} />
                                    </label>
                                </div>

                                {form.placement === "deals" && (
                                    <div>
                                        <span className="text-xs font-semibold uppercase text-slate-500">Format</span>
                                        <div className="flex gap-2 mt-1">
                                            {([["wide", "Large · 1240 × 600"], ["square", "Carré · 600 × 600"]] as const).map(([cle, libelle]) => (
                                                <button
                                                    key={cle}
                                                    type="button"
                                                    onClick={() => setForm({ ...form, format: cle })}
                                                    className={`px-4 py-2 rounded-lg text-sm border ${
                                                        form.format === cle
                                                            ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                                                            : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                                                    }`}
                                                >
                                                    {libelle}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <label className="block">
                                    <span className="text-xs font-semibold uppercase text-slate-500">Visuel du graphiste</span>
                                    <input type="file" accept="image/*" className="block mt-1 text-sm" disabled={envoi} onChange={(e) => e.target.files?.[0] && televerser(e.target.files[0])} />
                                    {envoi && <span className="text-xs text-slate-400">Envoi…</span>}
                                </label>

                                <EatTargetPicker
                                    type={form.target_type}
                                    value={form.target_value}
                                    options={options}
                                    onChange={(target_type, target_value) => setForm({ ...form, target_type, target_value })}
                                />
                                {form.target_type === "promo" && (
                                    <p className="text-xs text-slate-400">
                                        Le toucher ouvre le ticket du code ; son texte se règle dans « Codes promo ». Le code est proposé au paiement.
                                    </p>
                                )}

                                {form.target_type !== "promo" && (
                                    <label className="block">
                                        <span className="text-xs font-semibold uppercase text-slate-500">Code promo à copier (facultatif)</span>
                                        <input className={`${champ} uppercase`} value={form.promo_code} placeholder="DIP40" onChange={(e) => setForm({ ...form, promo_code: e.target.value })} />
                                        <span className="text-xs text-slate-400">Copié par un appui long sur la carte.</span>
                                    </label>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <label>
                                        <span className="text-xs font-semibold uppercase text-slate-500">Début</span>
                                        <input type="datetime-local" className={champ} value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
                                    </label>
                                    <label>
                                        <span className="text-xs font-semibold uppercase text-slate-500">Fin</span>
                                        <input type="datetime-local" className={champ} value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
                                    </label>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Aperçu</p>
                                <div className="p-4 rounded-2xl bg-white border border-slate-200 dark:bg-slate-950 dark:border-slate-800 overflow-hidden">
                                    <Rangee elements={[{ image: form.image, format: form.format }, { image: "", format: "square" }]} placement={form.placement} />
                                </div>
                                <p className="text-xs text-slate-400 mt-2">{decrireCible(form.target_type || null, form.target_value, options)}</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300">
                                Annuler
                            </button>
                            <button
                                onClick={enregistrer}
                                disabled={!valide || envoi}
                                className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 dark:bg-white dark:text-slate-900"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs uppercase text-slate-500 text-left">
                            <tr>
                                <th className="px-3 py-3 w-16">Ordre</th>
                                <th className="px-5 py-3">Visuel</th>
                                <th className="px-5 py-3">Mène vers</th>
                                <th className="px-5 py-3">Période</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {liste.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-6 text-center text-slate-500">Aucune bannière ici.</td>
                                </tr>
                            )}
                            {liste.map((b, rang) => (
                                <tr key={b.id} className={enCours(b) ? "" : "opacity-50"}>
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <button onClick={() => deplacer(rang, -1)} disabled={rang === 0} className="disabled:opacity-20" title="Avancer">
                                            <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                                        </button>
                                        <button onClick={() => deplacer(rang, 1)} disabled={rang === liste.length - 1} className="disabled:opacity-20" title="Reculer">
                                            <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                                        </button>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <Carte image={b.image} format={b.format} h={56} />
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">{b.title}</p>
                                                <p className="text-xs text-slate-500">
                                                    {b.format === "square" ? "Carré" : "Large"}
                                                    {b.promo_code ? ` · code ${b.promo_code}` : ""}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-xs text-slate-500">{decrireCible(b.target_type, b.target_value, options)}</td>
                                    <td className="px-5 py-3 text-xs text-slate-500">
                                        {b.starts_at || b.ends_at
                                            ? `${b.starts_at ? `du ${new Date(b.starts_at).toLocaleDateString("fr-FR")} ` : ""}${b.ends_at ? `au ${new Date(b.ends_at).toLocaleDateString("fr-FR")}` : ""}`
                                            : "Permanente"}
                                    </td>
                                    <td className="px-5 py-3 text-right whitespace-nowrap">
                                        <button onClick={() => modifier(b)} className="text-sm text-slate-600 dark:text-slate-300 mr-4">
                                            Modifier
                                        </button>
                                        <button onClick={() => basculer(b)} className="text-sm text-slate-900 dark:text-white">
                                            {b.is_active ? "Masquer" : "Afficher"}
                                        </button>
                                        <button onClick={() => supprimer(b)} className="text-sm text-rose-600 ml-4">
                                            Supprimer
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </MainLayout>
    );
}
