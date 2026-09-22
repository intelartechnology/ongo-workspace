import { useEffect, useState } from "react";
import ApiService from "../../services/ApiService";

/**
 * Où mène une bannière ou une tuile — un seul sélecteur pour tout
 * l'accueil Ongo Eat.
 *
 *   store   → une boutique            (valeur : son id)
 *   section → le rayon d'une boutique (valeur : « idBoutique:idRayon »)
 *   tag     → une cuisine             (valeur : son slug)
 *   offers  → les restaurants qui font des offres
 *   page    → une page de campagne    (valeur : son id)
 *   promo   → le ticket d'un code     (valeur : le code)
 */

export type TargetType = "" | "store" | "section" | "tag" | "offers" | "page" | "promo";

export interface TargetOptions {
    stores: { id: number; name: string }[];
    tags: { slug: string; name: string }[];
    campaigns: { id: number; title: string; is_active: boolean }[];
    promo_codes: { id: number; code: string; funded_by: string }[];
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
    page: "Une page de campagne",
    promo: "Le ticket d'un code promo",
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

            {type === "tag" && (
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
