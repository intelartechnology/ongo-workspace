import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";

/**
 * Les filtres de l'accueil Ongo Eat — la barre sous « Laissez-vous tenter »
 * et la feuille « Tous les filtres ».
 *
 * Deux sortes :
 *   - les **manuels**, créés ici : un libellé, une icône, un critère et sa
 *     valeur, éventuellement une période (« Fêtes de fin d'année ») ;
 *   - les **règles automatiques** : leur valeur se calcule à chaque ouverture
 *     (délai médian du moment, cuisine préférée du client, ce qui se mange à
 *     cette heure…). Elles se renomment, se déplacent, s'épinglent et se
 *     coupent, mais ne se suppriment pas.
 *
 * Un filtre qui ne retiendrait aucun restaurant n'est jamais montré au
 * client : la colonne « En ce moment » dit ce qu'il voit.
 */

interface Filtre {
    id: number;
    key: string;
    label: string;
    icon: string;
    source: "manual" | "auto";
    criterion: string | null;
    value: string | null;
    is_pinned: boolean;
    is_active: boolean;
    position: number;
    starts_at: string | null;
    ends_at: string | null;
    live: { label: string; count: number } | null;
}

interface Cuisine {
    slug: string;
    name: string;
}

interface EatFiltersProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const champ = "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white";

// Les noms de l'application, en symboles Material pour l'écran.
const ICONES: Record<string, string> = {
    tune: "tune",
    speed: "speed",
    schedule: "schedule",
    sparkles: "auto_awesome",
    offer: "local_offer",
    star: "star",
    new: "fiber_new",
    wallet: "account_balance_wallet",
    heart: "favorite",
    sun: "wb_sunny",
    moon: "nightlight",
    open: "storefront",
    restaurant: "restaurant",
    leaf: "eco",
    fire: "local_fire_department",
    bolt: "bolt",
};

const CRITERES: Record<string, { libelle: string; valeur?: "cuisine" | "minutes" | "note" | "francs" }> = {
    tag: { libelle: "Une cuisine (étiquette ou plat)", valeur: "cuisine" },
    max_eta: { libelle: "Délai maximum", valeur: "minutes" },
    free_delivery: { libelle: "Livraison offerte" },
    has_offer: { libelle: "Avec une offre" },
    min_rating: { libelle: "Note minimum", valeur: "note" },
    price_max: { libelle: "Un plat à moins de…", valeur: "francs" },
    is_new: { libelle: "Nouveaux (moins de 30 jours)" },
    open_now: { libelle: "Ouverts maintenant" },
    sort_rating: { libelle: "Trier par note" },
};

// Ce que calcule chaque règle automatique.
const REGLES: Record<string, string> = {
    auto_my_cuisine: "La cuisine que ce client commande le plus (commandes livrées). Absent pour un nouveau client.",
    auto_moment: "Ce qui se mange à cette heure : petit-déjeuner le matin, pâtisserie l'après-midi, grillades le soir — si la cuisine existe.",
    auto_fast: "Le délai médian des restaurants ouverts, arrondi à 5 min. Masqué si tout livre déjà sous ce délai.",
    auto_free_delivery: "Les restaurants dont la livraison est à 0 F à cette adresse.",
    auto_rating_sort: "Trie par note, les non notés en dernier.",
    auto_offers: "Les restaurants qui ont au moins un produit en promotion.",
    auto_new: "Les restaurants arrivés depuis moins de 30 jours.",
    auto_cheap: "Le premier tiers des prix pratiqués, arrondi à 500 F.",
    auto_top_rated: "Les restaurants notés 4 ou plus.",
    auto_open_now: "Les restaurants ouverts — seulement quand certains sont fermés.",
};

const vide = {
    id: null as number | null,
    source: "manual" as "manual" | "auto",
    key: "",
    label: "",
    icon: "tune",
    criterion: "tag",
    value: "",
    is_pinned: true,
    starts_at: "",
    ends_at: "",
};

export default function EatFilters({ onLogout, theme, toggleTheme }: EatFiltersProps) {
    const [filtres, setFiltres] = useState<Filtre[]>([]);
    const [cuisines, setCuisines] = useState<Cuisine[]>([]);
    const [form, setForm] = useState<typeof vide | null>(null);

    const api = new ApiService();

    const charger = async () => {
        try {
            const { data } = await api.getData("v3/admin/eat/filters");

            if (data.success) {
                setFiltres(data.data.filters ?? []);
                setCuisines(data.data.tags ?? []);
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Filtres illisibles", text: String(erreur) });
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

        const { data } = await api.postData("v3/admin/eat/filters", {
            id: form.id,
            label: form.label,
            icon: form.icon,
            criterion: form.source === "manual" ? form.criterion : null,
            value: form.value || null,
            is_pinned: form.is_pinned,
            starts_at: form.starts_at || null,
            ends_at: form.ends_at || null,
        });

        if (echec(data)) return;

        Swal.fire({ icon: "success", title: data.message, timer: 1200, showConfirmButton: false });
        setForm(null);
        charger();
    };

    const basculer = async (f: Filtre, champ: "is_active" | "is_pinned") => {
        const { data } = await api.postData("v3/admin/eat/filters/toggle", { id: f.id, [champ]: !f[champ] });

        if (!echec(data)) charger();
    };

    const deplacer = async (rang: number, sens: -1 | 1) => {
        const cible = rang + sens;

        if (cible < 0 || cible >= filtres.length) return;

        const ordre = [...filtres];
        [ordre[rang], ordre[cible]] = [ordre[cible], ordre[rang]];
        setFiltres(ordre);

        const { data } = await api.postData("v3/admin/eat/filters/reorder", { ids: ordre.map((f) => f.id) });

        if (!echec(data)) charger();
    };

    const supprimer = async (f: Filtre) => {
        const reponse = await Swal.fire({
            icon: "question",
            title: `Supprimer « ${f.label} » ?`,
            showCancelButton: true,
            confirmButtonText: "Supprimer",
            cancelButtonText: "Annuler",
        });

        if (!reponse.isConfirmed) return;

        const { data } = await api.postData("v3/admin/eat/filters/delete", { id: f.id });

        if (!echec(data)) charger();
    };

    const modifier = (f: Filtre) =>
        setForm({
            id: f.id,
            source: f.source,
            key: f.key,
            label: f.label,
            icon: f.icon,
            criterion: f.criterion ?? "tag",
            value: f.value ?? "",
            is_pinned: f.is_pinned,
            starts_at: f.starts_at ? f.starts_at.slice(0, 16) : "",
            ends_at: f.ends_at ? f.ends_at.slice(0, 16) : "",
        });

    const decrire = (f: Filtre) => {
        if (f.source === "auto") return REGLES[f.key] ?? "Règle calculée";

        const critere = CRITERES[f.criterion ?? ""];

        if (!critere) return f.criterion;

        switch (critere.valeur) {
            case "cuisine":
                return `Cuisine : ${cuisines.find((c) => c.slug === f.value)?.name ?? f.value}`;
            case "minutes":
                return `${f.value} min max`;
            case "note":
                return `Note ≥ ${f.value}`;
            case "francs":
                return `Un plat à moins de ${Number(f.value).toLocaleString("fr-FR")} F`;
        }

        return critere.libelle;
    };

    const visibles = filtres.filter((f) => f.live && f.is_pinned);
    const valeur = form ? CRITERES[form.criterion]?.valeur : undefined;
    const valide = !!form && form.label.trim() !== "" && (form.source === "auto" || !valeur || form.value.trim() !== "");

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-8 py-6 max-w-7xl mx-auto flex items-start justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Filtres de l'accueil</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            La barre sous « Laissez-vous tenter » et la feuille « Tous les filtres ». Un filtre sans résultat est masqué.
                        </p>
                    </div>
                    {!form && (
                        <button onClick={() => setForm({ ...vide })} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium dark:bg-white dark:text-slate-900">
                            Nouveau filtre
                        </button>
                    )}
                </div>
            </header>

            <main className="px-8 py-8 max-w-7xl mx-auto space-y-6">
                {/* Ce que voit un client maintenant, sans historique ni adresse. */}
                <div className="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase text-slate-500 mb-3">Dans la barre, en ce moment</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        <span className="shrink-0 w-12 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[18px]">tune</span>
                        </span>
                        {visibles.map((f) => (
                            <span key={f.id} className="shrink-0 h-10 px-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                                <span className="material-symbols-outlined text-[17px]">{ICONES[f.icon] ?? "tune"}</span>
                                {f.live?.label}
                            </span>
                        ))}
                        {visibles.length === 0 && <span className="text-sm text-slate-400 self-center">Aucun filtre épinglé n'a de résultat.</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-3">Aperçu sans client connecté : « Ma cuisine » n'apparaît qu'aux clients qui ont déjà commandé.</p>
                </div>

                {form && (
                    <div className="p-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        {form.source === "auto" && (
                            <p className="text-sm text-slate-500 mb-4">
                                <span className="font-semibold text-slate-700 dark:text-slate-200">Règle automatique.</span> {REGLES[form.key]} Dans le libellé,{" "}
                                <code className="px-1 rounded bg-slate-100 dark:bg-slate-800">{"{value}"}</code> est remplacé par la valeur calculée.
                            </p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <label className="md:col-span-2">
                                <span className="text-xs font-semibold uppercase text-slate-500">Libellé</span>
                                <input className={champ} value={form.label} maxLength={60} placeholder="Poulet braisé" onChange={(e) => setForm({ ...form, label: e.target.value })} />
                            </label>
                            {form.source === "manual" && (
                                <>
                                    <label>
                                        <span className="text-xs font-semibold uppercase text-slate-500">Critère</span>
                                        <select className={champ} value={form.criterion} onChange={(e) => setForm({ ...form, criterion: e.target.value, value: "" })}>
                                            {Object.entries(CRITERES).map(([cle, c]) => (
                                                <option key={cle} value={cle}>{c.libelle}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label>
                                        <span className="text-xs font-semibold uppercase text-slate-500">
                                            {valeur === "minutes" ? "Minutes" : valeur === "note" ? "Note (1 à 5)" : valeur === "francs" ? "Prix (F)" : "Valeur"}
                                        </span>
                                        {valeur === "cuisine" ? (
                                            <select className={champ} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })}>
                                                <option value="">Choisir…</option>
                                                {cuisines.map((c) => (
                                                    <option key={c.slug} value={c.slug}>{c.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                className={champ}
                                                value={form.value}
                                                disabled={!valeur}
                                                inputMode="decimal"
                                                placeholder={valeur ? (valeur === "minutes" ? "30" : valeur === "note" ? "4.5" : "3000") : "—"}
                                                onChange={(e) => setForm({ ...form, value: e.target.value })}
                                            />
                                        )}
                                    </label>
                                </>
                            )}
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Début</span>
                                <input type="datetime-local" className={champ} value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Fin</span>
                                <input type="datetime-local" className={champ} value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
                            </label>
                        </div>

                        <p className="text-xs font-semibold uppercase text-slate-500 mt-5 mb-2">Icône</p>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(ICONES).map(([nom, symbole]) => (
                                <button
                                    key={nom}
                                    type="button"
                                    onClick={() => setForm({ ...form, icon: nom })}
                                    className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                                        form.icon === nom
                                            ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                                            : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">{symbole}</span>
                                </button>
                            ))}
                        </div>

                        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 mt-5">
                            <input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} />
                            Épinglé dans la barre (sinon seulement dans « Tous les filtres »)
                        </label>

                        <div className="flex items-center justify-between gap-3 mt-6">
                            {/* L'aperçu de la pastille, comme dans l'application. */}
                            <span className="h-10 px-4 rounded-full bg-slate-100 dark:bg-slate-800 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                                <span className="material-symbols-outlined text-[17px]">{ICONES[form.icon] ?? "tune"}</span>
                                {form.label.replace("{value}", "…") || "Libellé"}
                            </span>
                            <div className="flex gap-3">
                                <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300">
                                    Annuler
                                </button>
                                <button
                                    onClick={enregistrer}
                                    disabled={!valide}
                                    className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 dark:bg-white dark:text-slate-900"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs uppercase text-slate-500 text-left">
                            <tr>
                                <th className="px-3 py-3 w-16">Ordre</th>
                                <th className="px-5 py-3">Filtre</th>
                                <th className="px-5 py-3">Retient</th>
                                <th className="px-5 py-3">En ce moment</th>
                                <th className="px-5 py-3">Barre</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filtres.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-6 text-center text-slate-500">Aucun filtre.</td>
                                </tr>
                            )}
                            {filtres.map((f, rang) => (
                                <tr key={f.id} className={f.is_active ? "" : "opacity-50"}>
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <button onClick={() => deplacer(rang, -1)} disabled={rang === 0} className="disabled:opacity-20" title="Monter">
                                            <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                                        </button>
                                        <button onClick={() => deplacer(rang, 1)} disabled={rang === filtres.length - 1} className="disabled:opacity-20" title="Descendre">
                                            <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                                        </button>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <span className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[18px]">{ICONES[f.icon] ?? "tune"}</span>
                                            </span>
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">{f.label}</p>
                                                <span
                                                    className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                                                        f.source === "auto" ? "bg-violet-100 text-violet-800" : "bg-sky-100 text-sky-800"
                                                    }`}
                                                >
                                                    {f.source === "auto" ? "Automatique" : "Manuel"}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-xs text-slate-500 max-w-sm">
                                        {decrire(f)}
                                        {(f.starts_at || f.ends_at) && (
                                            <p className="mt-1 text-slate-400">
                                                {f.starts_at ? `du ${new Date(f.starts_at).toLocaleDateString("fr-FR")} ` : ""}
                                                {f.ends_at ? `au ${new Date(f.ends_at).toLocaleDateString("fr-FR")}` : ""}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                        {!f.is_active ? (
                                            <span className="text-xs text-slate-400">Coupé</span>
                                        ) : f.live ? (
                                            <span className="text-slate-700 dark:text-slate-200">
                                                « {f.live.label} » · {f.live.count} restaurant{f.live.count > 1 ? "s" : ""}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-amber-700">Masqué : rien à proposer</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                        <button
                                            onClick={() => basculer(f, "is_pinned")}
                                            title={f.is_pinned ? "Retirer de la barre" : "Épingler dans la barre"}
                                            className={f.is_pinned ? "text-slate-900 dark:text-white" : "text-slate-300"}
                                        >
                                            <span className={`material-symbols-outlined text-[20px] ${f.is_pinned ? "fill-1" : ""}`}>push_pin</span>
                                        </button>
                                    </td>
                                    <td className="px-5 py-3 text-right whitespace-nowrap">
                                        <button onClick={() => modifier(f)} className="text-sm text-slate-600 dark:text-slate-300 mr-4">
                                            Modifier
                                        </button>
                                        <button onClick={() => basculer(f, "is_active")} className="text-sm text-slate-900 dark:text-white">
                                            {f.is_active ? "Couper" : "Réactiver"}
                                        </button>
                                        {f.source === "manual" && (
                                            <button onClick={() => supprimer(f)} className="text-sm text-rose-600 ml-4">
                                                Supprimer
                                            </button>
                                        )}
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
