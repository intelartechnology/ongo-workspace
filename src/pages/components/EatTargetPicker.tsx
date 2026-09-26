import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ApiService from "../../services/ApiService";

/**
 * Où mène une bannière ou une tuile — un seul sélecteur pour tout
 * l'accueil Ongo Eat.
 *
 *   store   → une boutique            (valeur : son id)
 *   section → le rayon d'une boutique (valeur : « idBoutique:idRayon »)
 *   tag     → une cuisine             (valeur : son slug)
 *   offers  → les restaurants qui font des offres
 *   page    → une page de redirection (valeur : son id)
 *   promo   → le ticket d'un code     (valeur : le code)
 *   aisle   → un même rayon partout   (valeur : son nom, « Boissons »)
 *   category→ une catégorie d'Ongo    (valeur : son slug)
 *   dishes  → les plats d'une cuisine  (valeur : le slug de la cuisine)
 */

export type TargetType = "" | "store" | "section" | "tag" | "offers" | "page" | "promo" | "aisle" | "category" | "dishes";

export interface TargetOptions {
    stores: { id: number; name: string }[];
    tags: { slug: string; name: string }[];
    campaigns: { id: number; title: string; is_active: boolean }[];
    promo_codes: { id: number; code: string; funded_by: string }[];
    categories?: { slug: string; name: string }[];
    /** Les noms de rayons déjà utilisés, et combien de rayons les portent. */
    aisles?: { name: string; stores: number }[];
}

interface Props {
    type: TargetType;
    value: string;
    options: TargetOptions;
    onChange: (type: TargetType, value: string) => void;
    // Types proposés : une tuile ne mène pas à un ticket, par exemple.
    allowed?: TargetType[];
    // Une page ne se propose pas elle-même.
    excludeCampaignId?: number | null;
}

const champ = "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white";

const LIBELLES: Record<TargetType, string> = {
    store: "Une boutique",
    section: "Le rayon d'une boutique",
    tag: "Une cuisine",
    offers: "Les restaurants avec offres",
    page: "Une page de redirection",
    promo: "Le ticket d'un code promo",
    aisle: "Un même rayon, toutes boutiques",
    category: "Une catégorie Ongo, toutes boutiques",
    dishes: "Les plats d'une cuisine, tous restaurants",
    "": "Nulle part",
};

export const decrireCible = (type: string | null, value: string | null, options: TargetOptions): string => {
    switch (type) {
        case "store":
            return `Boutique : ${options.stores.find((s) => String(s.id) === value)?.name ?? "introuvable ou inactive"}`;
        case "section": {
            const [boutique] = (value ?? "").split(":");
            return `Rayon de ${options.stores.find((s) => String(s.id) === boutique)?.name ?? "?"}`;
        }
        case "tag":
            return `Cuisine : ${options.tags.find((t) => t.slug === value)?.name ?? value}`;
        case "offers":
            return "Restaurants avec offres";
        case "page":
            return `Page : ${options.campaigns.find((c) => String(c.id) === value)?.title ?? "introuvable"}`;
        case "promo":
            return `Ticket du code ${value}`;
        case "aisle":
            return `Rayons « ${value} » de toutes les boutiques`;
        case "category":
            return `Catégorie « ${options.categories?.find((c) => c.slug === value)?.name ?? value} »`;
        case "dishes":
            return `Les plats « ${options.tags.find((t) => t.slug === value)?.name ?? value} » de tous les restaurants`;
    }

    return "Aucune destination";
};

export default function EatTargetPicker({ type, value, options, onChange, allowed, excludeCampaignId }: Props) {
    const [rayons, setRayons] = useState<{ id: number; name: string; parent_id: number | null }[]>([]);
    const [boutiqueDuRayon, rayon] = type === "section" ? value.split(":") : ["", ""];

    // Les rayons se chargent à la demande, pour la boutique choisie.
    useEffect(() => {
        if (type !== "section" || !boutiqueDuRayon) {
            setRayons([]);
            return;
        }

        new ApiService()
            .getData("v3/admin/eat/banners/sections", { store_id: boutiqueDuRayon })
            .then(({ data }) => setRayons(data.success ? data.data ?? [] : []))
            .catch(() => setRayons([]));
    }, [type, boutiqueDuRayon]);

    const types = allowed ?? (Object.keys(LIBELLES) as TargetType[]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label>
                <span className="text-xs font-semibold uppercase text-slate-500">Mène vers</span>
                <select className={champ} value={type} onChange={(e) => onChange(e.target.value as TargetType, "")}>
                    {types.map((t) => (
                        <option key={t} value={t}>{LIBELLES[t]}</option>
                    ))}
                </select>
            </label>

            {(type === "store" || type === "section") && (
                <label>
                    <span className="text-xs font-semibold uppercase text-slate-500">Boutique</span>
                    <select
                        className={champ}
                        value={type === "section" ? boutiqueDuRayon : value}
                        onChange={(e) => onChange(type, type === "section" ? `${e.target.value}:` : e.target.value)}
                    >
                        <option value="">Choisir…</option>
                        {options.stores.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </label>
            )}

            {type === "section" && boutiqueDuRayon && (
                <label className="md:col-start-2">
                    <span className="text-xs font-semibold uppercase text-slate-500">Rayon</span>
                    <select className={champ} value={rayon} onChange={(e) => onChange(type, `${boutiqueDuRayon}:${e.target.value}`)}>
                        <option value="">Choisir…</option>
                        {rayons.map((r) => (
                            <option key={r.id} value={r.id}>{r.parent_id ? `— ${r.name}` : r.name}</option>
                        ))}
                    </select>
                    {rayons.length === 0 && <span className="text-xs text-slate-400">Aucun rayon dans cette boutique.</span>}
                </label>
            )}

            {(type === "tag" || type === "dishes") && (
                <label>
                    <span className="text-xs font-semibold uppercase text-slate-500">Cuisine</span>
                    <select className={champ} value={value} onChange={(e) => onChange(type, e.target.value)}>
                        <option value="">Choisir…</option>
                        {options.tags.map((t) => (
                            <option key={t.slug} value={t.slug}>{t.name}</option>
                        ))}
                    </select>
                </label>
            )}

            {type === "page" && (
                <label>
                    <span className="text-xs font-semibold uppercase text-slate-500">Page</span>
                    <select className={champ} value={value} onChange={(e) => onChange(type, e.target.value)}>
                        <option value="">Choisir…</option>
                        {options.campaigns
                            .filter((c) => c.id !== excludeCampaignId)
                            .map((c) => (
                                <option key={c.id} value={c.id}>{c.title}{c.is_active ? "" : " (retirée)"}</option>
                            ))}
                    </select>
                    {options.campaigns.filter((c) => c.id !== excludeCampaignId).length === 0 && (
                        <span className="text-xs text-amber-700">
                            Aucune page de redirection pour l'instant.{" "}
                            <Link to="/eat-redirects" className="underline font-medium">Créer une page</Link>, puis revenez la choisir ici.
                        </span>
                    )}
                </label>
            )}

            {type === "aisle" && (
                <label>
                    <span className="text-xs font-semibold uppercase text-slate-500">Nom du rayon</span>
                    <input className={champ} list="eat-noms-rayons" value={value} placeholder="Boissons" onChange={(e) => onChange(type, e.target.value)} />
                    <datalist id="eat-noms-rayons">
                        {(options.aisles ?? []).map((a) => (
                            <option key={a.name} value={a.name}>{`${a.stores} rayon(s)`}</option>
                        ))}
                    </datalist>
                    <span className="text-xs text-slate-400">Sans accents ni majuscules : « boissons » retrouve aussi « BOISSONS ».</span>
                </label>
            )}

            {type === "category" && (
                <label>
                    <span className="text-xs font-semibold uppercase text-slate-500">Catégorie</span>
                    <select className={champ} value={value} onChange={(e) => onChange(type, e.target.value)}>
                        <option value="">Choisir…</option>
                        {(options.categories ?? []).map((c) => (
                            <option key={c.slug} value={c.slug}>{c.name}</option>
                        ))}
                    </select>
                    {(options.categories ?? []).length === 0 && (
                        <span className="text-xs text-amber-700">
                            Aucune catégorie. <Link to="/eat-categories" className="underline font-medium">Créer une catégorie</Link>, puis associez-y des rayons.
                        </span>
                    )}
                </label>
            )}

            {type === "promo" && (
                <label>
                    <span className="text-xs font-semibold uppercase text-slate-500">Code</span>
                    <select className={champ} value={value} onChange={(e) => onChange(type, e.target.value)}>
                        <option value="">Choisir…</option>
                        {options.promo_codes.map((c) => (
                            <option key={c.id} value={c.code}>{c.code}{c.funded_by === "merchant" ? " (marchand)" : ""}</option>
                        ))}
                    </select>
                    {options.promo_codes.length === 0 && (
                        <span className="text-xs text-amber-700">
                            Aucun code promo actif. <Link to="/eat-promo-codes" className="underline font-medium">Créer un code</Link>.
                        </span>
                    )}
                </label>
            )}
        </div>
    );
}

/** La destination est-elle complète ? */
export const cibleComplete = (type: TargetType, value: string) => {
    if (type === "" || type === "offers") return true;
    if (type === "section") return /^\d+:\d+$/.test(value);
    return value !== "";
};
