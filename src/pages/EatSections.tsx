import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import SectionShowcase from "./components/SectionShowcase";

/**
 * Les rubriques de l'accueil Ongo Eat : « Sélectionné pour vous »,
 * « Populaires », « Déjeuners maison »…
 *
 * Une rubrique ne contient rien : elle désigne une règle, ses paramètres,
 * sa forme et ses heures. Le contenu se calcule à chaque ouverture ; une
 * rubrique vide ne s'affiche pas. Elles se placent entre « Meilleurs deals »
 * et la grande liste des restaurants.
 */

interface Rubrique {
    id: number;
    key: string;
    title: string;
    subtitle: string | null;
    layout: "cards" | "logos" | "products";
    rule: string;
    params: Record<string, string | number> | null;
    store_type: "restaurant" | "store" | null;
    limit: number;
    is_horizontal: boolean;
    window_from: string | null;
    window_to: string | null;
    is_active: boolean;
    live_count: number;
    background_color: string | null;
    background_color_2: string | null;
    text_color: string | null;
    decor_image: string | null;
    see_all_type: string | null;
    see_all_value: string | null;
}

interface Regle {
    label: string;
    params: string[];
}

interface EatSectionsProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const champ = "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white";

const FORMES: Record<string, string> = {
    cards: "Grandes cartes",
    logos: "Pastilles (logos)",
    products: "Plats",
    tiles: "Tuiles de logos, 3 par ligne",
};

/** À qui la rubrique s'adresse. Vide : aux deux. */
const CIBLES: Record<string, string> = { "": "Restaurants et magasins", restaurant: "Restaurants seulement", store: "Magasins seulement" };

const PARAMETRES: Record<string, { libelle: string; aide: string }> = {
    days: { libelle: "Sur les … derniers jours", aide: "30" },
    slug: { libelle: "Cuisine ou catégorie", aide: "" },
    amount: { libelle: "Prix maximum (F)", aide: "3000" },
    minutes: { libelle: "Délai maximum (min)", aide: "30" },
};

/**
 * Une couleur assombrie de 55 %, comme `_assombrie` côté application.
 *
 * L'aperçu doit montrer le dégradé réel : calculé autrement, il mentirait sur
 * le rendu — et c'est précisément ce qu'on vient y vérifier.
 */
function assombrir(hex: string): string {
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return "#000000";

    const melange = (c: number) => Math.round(c * 0.45);

    const r = melange(parseInt(hex.slice(1, 3), 16));
    const v = melange(parseInt(hex.slice(3, 5), 16));
    const b = melange(parseInt(hex.slice(5, 7), 16));

    return `#${[r, v, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const vide = {
    id: null as number | null,
    title: "",
    subtitle: "",
    rule: "for_you",
    layout: "cards",
    store_type: "" as "" | "restaurant" | "store",
    limit: "10",
    window_from: "",
    window_to: "",
    params: {} as Record<string, string>,
    // L'habillage : tout est facultatif, une rubrique nue reste du texte sur
    // le fond de l'écran.
    background_color: "",
    background_color_2: "",
    text_color: "",
    decor_image: "",
    see_all_type: "",
    see_all_value: "",
};

export default function EatSections({ onLogout, theme, toggleTheme }: EatSectionsProps) {
    const [rubriques, setRubriques] = useState<Rubrique[]>([]);
    const [regles, setRegles] = useState<Record<string, Regle>>({});
    const [cuisines, setCuisines] = useState<{ slug: string; name: string }[]>([]);
    const [categoriesOngo, setCategoriesOngo] = useState<{ slug: string; name: string }[]>([]);
    const [form, setForm] = useState<typeof vide | null>(null);
    // La rubrique dont on compose la vitrine, ou nulle.
    const [vitrine, setVitrine] = useState<Rubrique | null>(null);

    const api = new ApiService();

    const charger = async () => {
        try {
            const { data } = await api.getData("v3/admin/eat/sections");

            if (data.success) {
                setRubriques(data.data.sections ?? []);
                setRegles(data.data.rules ?? {});
                setCuisines(data.data.tags ?? []);
                setCategoriesOngo(data.data.categories ?? []);
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Rubriques illisibles", text: String(erreur) });
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

    const enregistrer = async () => {
        if (!form) return;

        const { data } = await api.postData("v3/admin/eat/sections", {
            id: form.id,
            title: form.title,
            subtitle: form.subtitle || null,
            background_color: form.background_color || null,
            background_color_2: form.background_color_2 || null,
            text_color: form.text_color || null,
            decor_image: form.decor_image || null,
            see_all_type: form.see_all_type || null,
            see_all_value: form.see_all_value || null,
            rule: form.rule,
            layout: form.layout,
            store_type: form.store_type || null,
            limit: Number(form.limit),
            is_horizontal: true,
            window_from: form.window_from || null,
            window_to: form.window_to || null,
            params: form.params,
        });

        if (echec(data)) return;

        Swal.fire({ icon: "success", title: data.message, timer: 1200, showConfirmButton: false });
        setForm(null);
        charger();
    };

    const deplacer = async (rang: number, sens: -1 | 1) => {
        const cible = rang + sens;
        if (cible < 0 || cible >= rubriques.length) return;

        const ordre = [...rubriques];
        [ordre[rang], ordre[cible]] = [ordre[cible], ordre[rang]];
        setRubriques(ordre);

        const { data } = await api.postData("v3/admin/eat/sections/reorder", { ids: ordre.map((r) => r.id) });
        if (!echec(data)) charger();
    };

    const basculer = async (r: Rubrique) => {
        const { data } = await api.postData("v3/admin/eat/sections/toggle", { id: r.id, is_active: !r.is_active });
        if (!echec(data)) charger();
    };

    const supprimer = async (r: Rubrique) => {
        const reponse = await Swal.fire({ icon: "question", title: `Supprimer « ${r.title} » ?`, showCancelButton: true, confirmButtonText: "Supprimer", cancelButtonText: "Annuler" });
        if (!reponse.isConfirmed) return;

        const { data } = await api.postData("v3/admin/eat/sections/delete", { id: r.id });
        if (!echec(data)) charger();
    };

    const modifier = (r: Rubrique) =>
        setForm({
            id: r.id,
            title: r.title,
            subtitle: r.subtitle ?? "",
            background_color: r.background_color ?? "",
            background_color_2: r.background_color_2 ?? "",
            text_color: r.text_color ?? "",
            decor_image: r.decor_image ?? "",
            see_all_type: r.see_all_type ?? "",
            see_all_value: r.see_all_value ?? "",
            rule: r.rule,
            layout: r.layout,
            store_type: r.store_type ?? "",
            limit: String(r.limit),
            window_from: r.window_from ? r.window_from.slice(0, 5) : "",
            window_to: r.window_to ? r.window_to.slice(0, 5) : "",
            params: Object.fromEntries(Object.entries(r.params ?? {}).map(([k, v]) => [k, String(v)])),
        });

    const decrire = (r: Rubrique) => {
        const regle = regles[r.rule]?.label ?? r.rule;
        const p = r.params ?? {};
        const details = [
            p.days ? `${p.days} derniers jours` : null,
            p.slug ? cuisines.find((c) => c.slug === p.slug)?.name ?? String(p.slug) : null,
            p.amount ? `≤ ${Number(p.amount).toLocaleString("fr-FR")} F` : null,
            p.minutes ? `≤ ${p.minutes} min` : null,
        ].filter(Boolean);

        return details.length ? `${regle} · ${details.join(", ")}` : regle;
    };

    const parametres = form ? regles[form.rule]?.params ?? [] : [];
    const valide = !!form && form.title.trim() !== "" && parametres.every((p) => (form.params[p] ?? "") !== "") && (!form.window_from || !!form.window_to);

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-8 py-6 max-w-7xl mx-auto flex items-start justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Rubriques de l'accueil</h1>
                        <p className="text-sm text-slate-500 mt-1">Entre « Meilleurs deals » et la liste des restaurants. Le contenu se calcule ; une rubrique vide ne s'affiche pas.</p>
                    </div>
                    {!form && (
                        <button onClick={() => setForm({ ...vide, params: {} })} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium dark:bg-white dark:text-slate-900">
                            Nouvelle rubrique
                        </button>
                    )}
                </div>
            </header>

            <main className="px-8 py-8 max-w-7xl mx-auto space-y-6">
                {form && (
                    <div className="p-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <label className="md:col-span-2">
                                <span className="text-xs font-semibold uppercase text-slate-500">Titre</span>
                                <input className={champ} value={form.title} maxLength={80} placeholder="Déjeuners maison" onChange={(e) => setForm({ ...form, title: e.target.value })} />
                            </label>
                            <label className="md:col-span-2">
                                <span className="text-xs font-semibold uppercase text-slate-500">Sous-titre (facultatif)</span>
                                <input className={champ} value={form.subtitle} maxLength={160} placeholder="Pour 3 000 F max" onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
                            </label>
                            <label className="md:col-span-2">
                                <span className="text-xs font-semibold uppercase text-slate-500">Ce qu'elle montre</span>
                                <select className={champ} value={form.rule} onChange={(e) => setForm({ ...form, rule: e.target.value, params: {} })}>
                                    {Object.entries(regles).map(([cle, r]) => (
                                        <option key={cle} value={cle}>{r.label}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">S'adresse à</span>
                                <select className={champ} value={form.store_type} onChange={(e) => setForm({ ...form, store_type: e.target.value as typeof form.store_type })}>
                                    {Object.entries(CIBLES).map(([cle, libelle]) => (
                                        <option key={cle} value={cle}>{libelle}</option>
                                    ))}
                                </select>
                                <span className="text-xs text-slate-400">« Magasins seulement » : la rubrique apparaît sur l'écran Magasins.</span>
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Forme</span>
                                <select className={champ} value={form.layout} onChange={(e) => setForm({ ...form, layout: e.target.value })}>
                                    {Object.entries(FORMES).map(([cle, libelle]) => (
                                        <option key={cle} value={cle}>{libelle}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Éléments au plus</span>
                                <input className={champ} value={form.limit} inputMode="numeric" onChange={(e) => setForm({ ...form, limit: e.target.value })} />
                            </label>

                            {parametres.map((p) => (
                                <label key={p}>
                                    <span className="text-xs font-semibold uppercase text-slate-500">{PARAMETRES[p]?.libelle ?? p}</span>
                                    {p === "slug" ? (
                                        <select className={champ} value={form.params[p] ?? ""} onChange={(e) => setForm({ ...form, params: { ...form.params, [p]: e.target.value } })}>
                                            <option value="">Choisir…</option>
                                            {(form.rule === "category" ? categoriesOngo : cuisines).map((c) => (
                                                <option key={c.slug} value={c.slug}>{c.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input className={champ} inputMode="numeric" value={form.params[p] ?? ""} placeholder={PARAMETRES[p]?.aide} onChange={(e) => setForm({ ...form, params: { ...form.params, [p]: e.target.value } })} />
                                    )}
                                </label>
                            ))}

                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Visible de</span>
                                <input type="time" className={champ} value={form.window_from} onChange={(e) => setForm({ ...form, window_from: e.target.value })} />
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">à</span>
                                <input type="time" className={champ} value={form.window_to} onChange={(e) => setForm({ ...form, window_to: e.target.value })} />
                                <span className="text-xs text-slate-400">Vide : toute la journée</span>
                            </label>
                        </div>
                        {form.layout === "products" && (
                            <p className="text-xs text-slate-400 mt-3">« Plats » montre des plats des boutiques ouvertes : avec « Sous un prix », les plats sous ce prix ; avec « Avec des remises », les plats remisés.</p>
                        )}

                        {/*
                            L'habillage. Une rangée sur fond blanc se confond avec la
                            suivante ; une couleur et une illustration en font un rayon.
                            Tout est facultatif : sans couleur, la rubrique reste ce
                            qu'elle est aujourd'hui.
                        */}
                        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                            <p className="text-xs font-semibold uppercase text-slate-500 mb-3">Habillage (facultatif)</p>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <label>
                                    <span className="text-xs font-semibold uppercase text-slate-500">Fond</span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            className="h-10 w-10 shrink-0 rounded border border-slate-300 dark:border-slate-700"
                                            value={form.background_color || "#2B0B3C"}
                                            onChange={(e) => setForm({ ...form, background_color: e.target.value })}
                                        />
                                        <input
                                            className={champ}
                                            value={form.background_color}
                                            placeholder="vide : aucun"
                                            onChange={(e) => setForm({ ...form, background_color: e.target.value })}
                                        />
                                    </div>
                                </label>

                                <label>
                                    <span className="text-xs font-semibold uppercase text-slate-500">Fond (2)</span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            className="h-10 w-10 shrink-0 rounded border border-slate-300 dark:border-slate-700"
                                            value={form.background_color_2 || "#000000"}
                                            onChange={(e) => setForm({ ...form, background_color_2: e.target.value })}
                                        />
                                        <input
                                            className={champ}
                                            value={form.background_color_2}
                                            placeholder="vide : assombri"
                                            onChange={(e) => setForm({ ...form, background_color_2: e.target.value })}
                                        />
                                    </div>
                                    <span className="text-xs text-slate-400">
                                        Le bas du dégradé. Vide, on assombrit le fond — ce qui suffit sauf pour un
                                        changement de teinte, crème vers jaune par exemple.
                                    </span>
                                </label>

                                <label>
                                    <span className="text-xs font-semibold uppercase text-slate-500">Texte</span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            className="h-10 w-10 shrink-0 rounded border border-slate-300 dark:border-slate-700"
                                            value={form.text_color || "#FFFFFF"}
                                            onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                                        />
                                        <input
                                            className={champ}
                                            value={form.text_color}
                                            placeholder="vide : sombre"
                                            onChange={(e) => setForm({ ...form, text_color: e.target.value })}
                                        />
                                    </div>
                                </label>

                                <label className="md:col-span-2">
                                    <span className="text-xs font-semibold uppercase text-slate-500">Illustration</span>
                                    <input
                                        className={champ}
                                        value={form.decor_image}
                                        placeholder="https://… (PNG détouré)"
                                        onChange={(e) => setForm({ ...form, decor_image: e.target.value })}
                                    />
                                    <span className="text-xs text-slate-400">Posée en haut à droite. Décorative : elle ne mène nulle part.</span>
                                </label>

                                <label>
                                    <span className="text-xs font-semibold uppercase text-slate-500">« Tout » mène vers</span>
                                    <select
                                        className={champ}
                                        value={form.see_all_type}
                                        onChange={(e) => setForm({ ...form, see_all_type: e.target.value, see_all_value: "" })}
                                    >
                                        <option value="">Aucun bouton</option>
                                        <option value="offers">Les promotions</option>
                                        <option value="tag">Une cuisine</option>
                                        <option value="category">Une catégorie</option>
                                        <option value="page">Une campagne</option>
                                    </select>
                                </label>

                                {["tag", "category", "page"].includes(form.see_all_type) && (
                                    <label className="md:col-span-3">
                                        <span className="text-xs font-semibold uppercase text-slate-500">
                                            {form.see_all_type === "page" ? "Identifiant de la campagne" : "Slug"}
                                        </span>
                                        <input
                                            className={champ}
                                            value={form.see_all_value}
                                            placeholder={form.see_all_type === "page" ? "1" : "grillades"}
                                            onChange={(e) => setForm({ ...form, see_all_value: e.target.value })}
                                        />
                                        <span className="text-xs text-slate-400">Une destination inconnue est refusée à l'enregistrement.</span>
                                    </label>
                                )}
                            </div>

                            {/* L'aperçu : c'est là qu'on voit si le texte se lit sur le fond. */}
                            {form.background_color && (
                                <div
                                    className="mt-4 rounded-2xl p-4"
                                    style={{
                                        // Le même dégradé que l'application : en diagonale, du
                                        // coin de l'illustration vers le coin opposé.
                                        background: `linear-gradient(to bottom left, ${form.background_color}, ${
                                            form.background_color_2 || assombrir(form.background_color)
                                        })`,
                                    }}
                                >
                                    <p className="text-xl font-black uppercase tracking-tight" style={{ color: form.text_color || "#0F172A" }}>
                                        {form.title || "Titre de la rubrique"}
                                    </p>
                                    {form.subtitle && (
                                        <p className="text-xs font-bold uppercase mt-1" style={{ color: form.text_color || "#0F172A" }}>
                                            {form.subtitle}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300">Annuler</button>
                            <button onClick={enregistrer} disabled={!valide} className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 dark:bg-white dark:text-slate-900">
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
                                <th className="px-5 py-3">Rubrique</th>
                                <th className="px-5 py-3">Montre</th>
                                <th className="px-5 py-3">Heures</th>
                                <th className="px-5 py-3">En ce moment</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {rubriques.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-6 text-center text-slate-500">Aucune rubrique.</td>
                                </tr>
                            )}
                            {rubriques.map((r, rang) => (
                                <tr key={r.id} className={r.is_active ? "" : "opacity-50"}>
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <button onClick={() => deplacer(rang, -1)} disabled={rang === 0} className="disabled:opacity-20"><span className="material-symbols-outlined text-[18px]">arrow_upward</span></button>
                                        <button onClick={() => deplacer(rang, 1)} disabled={rang === rubriques.length - 1} className="disabled:opacity-20"><span className="material-symbols-outlined text-[18px]">arrow_downward</span></button>
                                    </td>
                                    <td className="px-5 py-3">
                                        <p className="font-semibold text-slate-900 dark:text-white">{r.title}</p>
                                        <p className="text-xs text-slate-500">{FORMES[r.layout] ?? r.layout}{r.subtitle ? ` · ${r.subtitle}` : ""}</p>
                                    </td>
                                    <td className="px-5 py-3 text-xs text-slate-500">
                                        {decrire(r)}
                                        {r.store_type && <p className="text-slate-400">{CIBLES[r.store_type]}</p>}
                                    </td>
                                    <td className="px-5 py-3 text-xs text-slate-500">{r.window_from ? `${r.window_from.slice(0, 5)} – ${r.window_to?.slice(0, 5)}` : "Toute la journée"}</td>
                                    <td className="px-5 py-3">
                                        {!r.is_active ? (
                                            <span className="text-xs text-slate-400">Masquée</span>
                                        ) : r.live_count > 0 ? (
                                            <span className="text-slate-700 dark:text-slate-200">{r.live_count} élément{r.live_count > 1 ? "s" : ""}</span>
                                        ) : (
                                            <span className="text-xs text-amber-700">Vide : ne s'affiche pas</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-right whitespace-nowrap">
                                        {/* La vitrine n'existe que pour la règle qui la lit :
                                            ailleurs, le contenu se calcule. */}
                                        {r.rule === "picked" && (
                                            <button onClick={() => setVitrine(vitrine?.id === r.id ? null : r)} className="text-sm text-slate-900 dark:text-white mr-4">
                                                Vitrine
                                            </button>
                                        )}
                                        <button onClick={() => modifier(r)} className="text-sm text-slate-600 dark:text-slate-300 mr-4">Modifier</button>
                                        <button onClick={() => basculer(r)} className="text-sm text-slate-900 dark:text-white">{r.is_active ? "Masquer" : "Afficher"}</button>
                                        <button onClick={() => supprimer(r)} className="text-sm text-rose-600 ml-4">Supprimer</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {vitrine && (
                    <SectionShowcase sectionId={vitrine.id} title={vitrine.title} onClose={() => setVitrine(null)} />
                )}

                <p className="text-xs text-slate-400">« En ce moment » : pour un client sans historique, sans adresse. « Sélectionné pour vous » et « Nouvelles saveurs » s'adaptent ensuite à chacun.</p>
            </main>
        </MainLayout>
    );
}
