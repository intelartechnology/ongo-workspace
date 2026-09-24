import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import { apercu, envoyerSiBesoin } from "../services/images";
import ImageField from "./components/ImageField";
import CampaignStoreRules, { reglesVides } from "./components/CampaignStoreRules";
import type { Regles } from "./components/CampaignStoreRules";
import EatTargetPicker, { cibleComplete, decrireCible } from "./components/EatTargetPicker";
import type { TargetOptions, TargetType } from "./components/EatTargetPicker";

/**
 * Les pages de campagne : « Économisez sur vos courses ».
 *
 * Un visuel d'en-tête, un titre, un texte, puis des tuiles du graphiste qui
 * mènent chacune quelque part — une boutique, un rayon, une cuisine, une
 * autre page, un ticket. Elles s'ouvrent depuis une bannière (choisir « Une
 * page de campagne » comme destination) ou depuis la tuile d'une autre page.
 *
 * Dans l'application, les tuiles se rangent par rangées de trois unités :
 * une large en vaut deux, une carrée une.
 */

interface Tuile {
    image: string;
    // Le visuel choisi, envoyé seulement à l'enregistrement.
    fichier?: File | null;
    format: "wide" | "square";
    target_type: TargetType;
    target_value: string;
}

interface Campagne {
    id: number;
    slug: string;
    title: string;
    subtitle: string | null;
    hero_image: string | null;
    background_color: string | null;
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
    store_ids: number[] | null;
    store_rules: Regles | null;
    tiles: { image: string; format: "wide" | "square"; target_type: TargetType | null; target_value: string | null }[];
}

interface EatCampaignsProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const champ = "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white";

const vide = {
    id: null as number | null,
    title: "",
    subtitle: "",
    hero_image: "",
    hero_fichier: null as File | null,
    background_color: "#6B3A1E",
    starts_at: "",
    ends_at: "",
    tiles: [] as Tuile[],
    // Les boutiques sous les tuiles ; vide : celles que les tuiles désignent.
    store_ids: [] as number[],
    // « Choisir » des boutiques, ou les retenir par critères.
    stores_mode: "manual" as "manual" | "auto",
    store_rules: reglesVides as Regles,
};

// Le même rangement que l'application : trois unités par rangée.
const ranger = (tuiles: Tuile[]) => {
    const rangees: Tuile[][] = [];
    let place = 0;

    for (const t of tuiles) {
        const prend = t.format === "square" ? 1 : 2;

        if (rangees.length === 0 || place + prend > 3) {
            rangees.push([]);
            place = 0;
        }

        rangees[rangees.length - 1].push(t);
        place += prend;
    }

    return rangees;
};

export default function EatCampaigns({ onLogout, theme, toggleTheme }: EatCampaignsProps) {
    const [campagnes, setCampagnes] = useState<Campagne[]>([]);
    const [options, setOptions] = useState<TargetOptions>({ stores: [], tags: [], campaigns: [], promo_codes: [] });
    const [form, setForm] = useState<typeof vide | null>(null);
    const [envoi, setEnvoi] = useState(false);

    const api = new ApiService();

    const charger = async () => {
        try {
            const [lesCampagnes, lesOptions] = await Promise.all([api.getData("v3/admin/eat/campaigns"), api.getData("v3/admin/eat/banners")]);

            if (lesCampagnes.data.success) setCampagnes(lesCampagnes.data.data ?? []);
            if (lesOptions.data.success) {
                const d = lesOptions.data.data;
                setOptions({ stores: d.stores ?? [], tags: d.tags ?? [], campaigns: d.campaigns ?? [], promo_codes: d.promo_codes ?? [], categories: d.categories ?? [], aisles: d.aisles ?? [] });
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Campagnes illisibles", text: String(erreur) });
        }
    };

    useEffect(() => {
        charger();
    }, []);

    const enregistrer = async () => {
        if (!form) return;

        setEnvoi(true);

        // Les images choisies partent maintenant, l'une après l'autre ; une
        // seule qui échoue arrête tout, rien n'est enregistré à moitié.
        let heroImage: string | null;
        let tuiles: { image: string; format: string; target_type: string | null; target_value: string | null }[];

        try {
            heroImage = await envoyerSiBesoin(form.hero_fichier, form.hero_image || null);
            tuiles = [];

            for (const t of form.tiles) {
                tuiles.push({
                    image: (await envoyerSiBesoin(t.fichier, t.image || null)) ?? "",
                    format: t.format,
                    target_type: t.target_type || null,
                    target_value: t.target_value || null,
                });
            }
        } catch (erreur) {
            setEnvoi(false);
            Swal.fire({ icon: "error", title: "Image non envoyée", text: String((erreur as Error).message ?? erreur) });
            return;
        }

        const { data } = await api.postData("v3/admin/eat/campaigns", {
            id: form.id,
            title: form.title,
            subtitle: form.subtitle || null,
            hero_image: heroImage,
            background_color: form.background_color || null,
            starts_at: form.starts_at || null,
            ends_at: form.ends_at || null,
            tiles: tuiles,
            store_ids: form.stores_mode === "manual" ? form.store_ids : [],
            store_rules: form.stores_mode === "auto" && form.store_rules.criteria.length ? form.store_rules : null,
        });

        setEnvoi(false);

        if (!data.success) {
            Swal.fire({ icon: "error", title: data.message });
            return;
        }

        Swal.fire({ icon: "success", title: data.message, timer: 1200, showConfirmButton: false });
        setForm(null);
        charger();
    };

    const basculer = async (c: Campagne) => {
        const { data } = await api.postData("v3/admin/eat/campaigns/toggle", { id: c.id, is_active: !c.is_active });

        if (data.success) charger();
        else Swal.fire({ icon: "error", title: data.message });
    };

    const supprimer = async (c: Campagne) => {
        const reponse = await Swal.fire({
            icon: "question",
            title: `Supprimer « ${c.title} » ?`,
            showCancelButton: true,
            confirmButtonText: "Supprimer",
            cancelButtonText: "Annuler",
        });

        if (!reponse.isConfirmed) return;

        const { data } = await api.postData("v3/admin/eat/campaigns/delete", { id: c.id });

        if (data.success) charger();
        else Swal.fire({ icon: "error", title: data.message });
    };

    const modifier = (c: Campagne) =>
        setForm({
            id: c.id,
            title: c.title,
            subtitle: c.subtitle ?? "",
            hero_image: c.hero_image ?? "",
            hero_fichier: null,
            background_color: c.background_color ?? "#6B3A1E",
            starts_at: c.starts_at ? c.starts_at.slice(0, 16) : "",
            ends_at: c.ends_at ? c.ends_at.slice(0, 16) : "",
            tiles: c.tiles.map((t) => ({ image: t.image, format: t.format, target_type: (t.target_type ?? "") as TargetType, target_value: t.target_value ?? "" })),
            store_ids: c.store_ids ?? [],
            stores_mode: c.store_rules?.criteria?.length ? "auto" : "manual",
            store_rules: c.store_rules?.criteria?.length ? c.store_rules : reglesVides,
        });

    const changerTuile = (rang: number, modif: Partial<Tuile>) =>
        setForm((f) => (f === null ? f : { ...f, tiles: f.tiles.map((t, i) => (i === rang ? { ...t, ...modif } : t)) }));

    const deplacerTuile = (rang: number, sens: -1 | 1) =>
        setForm((f) => {
            if (f === null) return f;
            const cible = rang + sens;
            if (cible < 0 || cible >= f.tiles.length) return f;
            const tiles = [...f.tiles];
            [tiles[rang], tiles[cible]] = [tiles[cible], tiles[rang]];
            return { ...f, tiles };
        });

    const enLigne = (c: Campagne) =>
        c.is_active && (!c.starts_at || new Date(c.starts_at) <= new Date()) && (!c.ends_at || new Date(c.ends_at) > new Date());

    const valide = !!form && form.title.trim() !== "" && form.tiles.every((t) => (t.image !== "" || !!t.fichier) && cibleComplete(t.target_type, t.target_value));

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-8 py-6 max-w-7xl mx-auto flex items-start justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Pages de campagne</h1>
                        <p className="text-sm text-slate-500 mt-1">Ouvertes depuis une bannière ou une tuile. Chaque tuile mène quelque part.</p>
                    </div>
                    {!form && (
                        <button onClick={() => setForm({ ...vide, tiles: [] })} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium dark:bg-white dark:text-slate-900">
                            Nouvelle page
                        </button>
                    )}
                </div>
            </header>

            <main className="px-8 py-8 max-w-7xl mx-auto space-y-6">
                {form && (
                    <div className="p-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8">
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="md:col-span-2">
                                        <span className="text-xs font-semibold uppercase text-slate-500">Titre</span>
                                        <input className={champ} value={form.title} maxLength={120} placeholder="Économisez sur vos courses" onChange={(e) => setForm({ ...form, title: e.target.value })} />
                                    </label>
                                    <label className="md:col-span-2">
                                        <span className="text-xs font-semibold uppercase text-slate-500">Texte</span>
                                        <textarea
                                            className={champ}
                                            rows={2}
                                            maxLength={300}
                                            value={form.subtitle}
                                            placeholder="Des remises allant jusqu'à 50 % sur tout ce dont vous avez besoin…"
                                            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                                        />
                                    </label>
                                    <ImageField
                                        label="Visuel d'en-tête"
                                        hint="Portrait, environ 1284 × 1500 px ; le haut reste libre pour le titre."
                                        adresse={form.hero_image}
                                        fichier={form.hero_fichier}
                                        owner="ongo"
                                        disabled={envoi}
                                        forme="aspect-[4/5]"
                                        onChange={(hero_image, hero_fichier) => setForm({ ...form, hero_image, hero_fichier })}
                                    />
                                    <label>
                                        <span className="text-xs font-semibold uppercase text-slate-500">Couleur de fond</span>
                                        <input type="color" className="block mt-1 h-10 w-20 rounded" value={form.background_color} onChange={(e) => setForm({ ...form, background_color: e.target.value })} />
                                    </label>
                                    <label>
                                        <span className="text-xs font-semibold uppercase text-slate-500">Début</span>
                                        <input type="datetime-local" className={champ} value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
                                    </label>
                                    <label>
                                        <span className="text-xs font-semibold uppercase text-slate-500">Fin</span>
                                        <input type="datetime-local" className={champ} value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
                                    </label>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-semibold uppercase text-slate-500">Tuiles · {form.tiles.length}</p>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, tiles: [...form.tiles, { image: "", format: "wide", target_type: "store", target_value: "" }] })}
                                            className="text-sm font-medium text-slate-900 dark:text-white"
                                        >
                                            + Ajouter une tuile
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {form.tiles.map((t, rang) => (
                                            <div key={rang} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex gap-4">
                                                <div className="flex flex-col items-center gap-1">
                                                    <button type="button" onClick={() => deplacerTuile(rang, -1)} disabled={rang === 0} className="disabled:opacity-20">
                                                        <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                                                    </button>
                                                    <button type="button" onClick={() => deplacerTuile(rang, 1)} disabled={rang === form.tiles.length - 1} className="disabled:opacity-20">
                                                        <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                                                    </button>
                                                </div>
                                                <div className="flex-1 space-y-3">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <ImageField
                                                            label="Visuel"
                                                            adresse={t.image}
                                                            fichier={t.fichier ?? null}
                                                            owner="ongo"
                                                            disabled={envoi}
                                                            forme={t.format === "square" ? "aspect-square" : "aspect-[2/1]"}
                                                            onChange={(image, fichier) => changerTuile(rang, { image, fichier })}
                                                        />
                                                        <select className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" value={t.format} onChange={(e) => changerTuile(rang, { format: e.target.value as "wide" | "square" })}>
                                                            <option value="wide">Large (2/3)</option>
                                                            <option value="square">Carrée (1/3)</option>
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={() => setForm({ ...form, tiles: form.tiles.filter((_, i) => i !== rang) })}
                                                            className="text-sm text-rose-600 ml-auto"
                                                        >
                                                            Retirer
                                                        </button>
                                                    </div>
                                                    <EatTargetPicker
                                                        type={t.target_type}
                                                        value={t.target_value}
                                                        options={options}
                                                        excludeCampaignId={form.id}
                                                        onChange={(target_type, target_value) => changerTuile(rang, { target_type, target_value })}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        {form.tiles.length === 0 && <p className="text-sm text-slate-400">Aucune tuile : « Viande et volaille », « Boissons »…</p>}
                                    </div>
                                </div>

                                {/* Les boutiques sous les tuiles, comme chez Yango. */}
                                <div>
                                    <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Boutiques sous les tuiles</p>
                                    <p className="text-xs text-slate-400 mb-2">
                                        Leurs cartes complètes : délai, note, livraison, favori. Sans choix ni critère : les boutiques visées par les tuiles.
                                    </p>
                                    <div className="flex gap-2 mb-3">
                                        {([["manual", `Choisir (${form.store_ids.length})`], ["auto", `Automatique (${form.store_rules.criteria.length} critère(s))`]] as const).map(([cle, libelle]) => (
                                            <button
                                                key={cle}
                                                type="button"
                                                onClick={() => setForm({ ...form, stores_mode: cle })}
                                                className={`px-3 py-1.5 rounded-full text-sm border ${
                                                    form.stores_mode === cle ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900" : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                                                }`}
                                            >
                                                {libelle}
                                            </button>
                                        ))}
                                    </div>
                                    {form.stores_mode === "auto" ? (
                                        <CampaignStoreRules regles={form.store_rules} options={options} onChange={(store_rules) => setForm({ ...form, store_rules })} />
                                    ) : (
                                    <>
                                    <select
                                        className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                                        value=""
                                        onChange={(e) => e.target.value && setForm({ ...form, store_ids: [...form.store_ids, Number(e.target.value)] })}
                                    >
                                        <option value="">+ Ajouter une boutique</option>
                                        {options.stores
                                            .filter((b) => !form.store_ids.includes(b.id))
                                            .map((b) => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                    </select>
                                    <div className="mt-2 space-y-1">
                                        {form.store_ids.map((id, rang) => (
                                            <div key={id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm">
                                                <button
                                                    type="button"
                                                    disabled={rang === 0}
                                                    className="disabled:opacity-20"
                                                    onClick={() => {
                                                        const ids = [...form.store_ids];
                                                        [ids[rang - 1], ids[rang]] = [ids[rang], ids[rang - 1]];
                                                        setForm({ ...form, store_ids: ids });
                                                    }}
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                                                </button>
                                                <span className="flex-1 text-slate-800 dark:text-slate-100">{options.stores.find((b) => b.id === id)?.name ?? `Boutique #${id} (inactive)`}</span>
                                                <button type="button" onClick={() => setForm({ ...form, store_ids: form.store_ids.filter((x) => x !== id) })} className="text-rose-600">
                                                    Retirer
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    </>
                                    )}
                                </div>
                            </div>

                            {/* L'aperçu, dans un téléphone. */}
                            <div>
                                <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Aperçu</p>
                                <div className="rounded-[36px] border-8 border-slate-900 overflow-hidden bg-white" style={{ width: 340 }}>
                                    <div className="relative" style={{ height: 380, background: form.background_color }}>
                                        {apercu(form.hero_fichier, form.hero_image) && <img src={apercu(form.hero_fichier, form.hero_image)} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                                        <div className="relative px-6 pt-16 text-center text-white">
                                            <p className="text-3xl font-black uppercase leading-none tracking-tight">{form.title || "Titre"}</p>
                                            {form.subtitle && <p className="mt-3 text-sm leading-snug">{form.subtitle}</p>}
                                        </div>
                                        <div className="absolute left-0 right-0 -bottom-px h-6 bg-white rounded-t-[24px]" />
                                    </div>
                                    <div className="px-3 pb-6 space-y-2">
                                        {ranger(form.tiles).map((rangee, i) => (
                                            <div key={i} className="flex gap-2">
                                                {rangee.map((t, j) => (
                                                    <div
                                                        key={j}
                                                        className="rounded-2xl overflow-hidden bg-slate-100"
                                                        style={{ width: t.format === "square" ? 96 : 200, height: 96 }}
                                                    >
                                                        {apercu(t.fichier, t.image) && <img src={apercu(t.fichier, t.image)} alt="" className="w-full h-full object-cover" />}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                        {form.stores_mode === "auto" && form.store_rules.criteria.length > 0 && (
                                            <p className="pt-2 text-xs text-slate-500 px-1">Boutiques selon les critères, recalculées à chaque ouverture.</p>
                                        )}
                                        {form.stores_mode === "manual" && form.store_ids.map((id) => (
                                            <div key={id} className="pt-2">
                                                <div className="h-24 rounded-2xl bg-slate-200" />
                                                <p className="text-sm font-semibold mt-1 px-1">{options.stores.find((b) => b.id === id)?.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
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
                                {envoi ? "Envoi…" : "Enregistrer"}
                            </button>
                        </div>
                    </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs uppercase text-slate-500 text-left">
                            <tr>
                                <th className="px-5 py-3">Page</th>
                                <th className="px-5 py-3">Tuiles</th>
                                <th className="px-5 py-3">Période</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {campagnes.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-5 py-6 text-center text-slate-500">Aucune page de campagne.</td>
                                </tr>
                            )}
                            {campagnes.map((c) => (
                                <tr key={c.id} className={enLigne(c) ? "" : "opacity-50"}>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ background: c.background_color ?? "#6B3A1E" }}>
                                                {c.hero_image && <img src={c.hero_image} alt="" className="w-full h-full object-cover" />}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">{c.title}</p>
                                                <p className="text-xs text-slate-500 font-mono">{c.slug}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-xs text-slate-500">
                                        {c.tiles.length} tuile{c.tiles.length > 1 ? "s" : ""}
                                        {c.tiles.slice(0, 3).map((t, i) => (
                                            <p key={i}>{decrireCible(t.target_type, t.target_value, options)}</p>
                                        ))}
                                    </td>
                                    <td className="px-5 py-3 text-xs text-slate-500">
                                        {c.starts_at || c.ends_at
                                            ? `${c.starts_at ? `du ${new Date(c.starts_at).toLocaleDateString("fr-FR")} ` : ""}${c.ends_at ? `au ${new Date(c.ends_at).toLocaleDateString("fr-FR")}` : ""}`
                                            : "Permanente"}
                                    </td>
                                    <td className="px-5 py-3 text-right whitespace-nowrap">
                                        <button onClick={() => modifier(c)} className="text-sm text-slate-600 dark:text-slate-300 mr-4">
                                            Modifier
                                        </button>
                                        <button onClick={() => basculer(c)} className="text-sm text-slate-900 dark:text-white">
                                            {c.is_active ? "Retirer" : "Remettre en ligne"}
                                        </button>
                                        <button onClick={() => supprimer(c)} className="text-sm text-rose-600 ml-4">
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
