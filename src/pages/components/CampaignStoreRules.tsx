import { useEffect, useState } from "react";
import ApiService from "../../services/ApiService";
import type { TargetOptions } from "./EatTargetPicker";

/**
 * Les boutiques d'une campagne, par critères : la liste se recalcule à
 * chaque ouverture de la page, à l'adresse du client.
 *
 * Les critères se cumulent (« commerces » ET « rayon Boissons » ET
 * « ouverts »). L'aperçu montre ce qu'ils retiennent maintenant, sans
 * adresse de client.
 */

export interface Critere {
    criterion: string;
    value: string | number | null;
}

export interface Regles {
    criteria: Critere[];
    sort: "default" | "rating" | "eta";
    limit: number;
}

export const reglesVides: Regles = { criteria: [], sort: "default", limit: 10 };

const CRITERES: Record<string, { libelle: string; valeur?: "type" | "categorie" | "rayon" | "cuisine" | "filtre" | "minutes" | "note" | "francs" }> = {
    store_type: { libelle: "Type de boutique", valeur: "type" },
    category: { libelle: "A un rayon de la catégorie Ongo", valeur: "categorie" },
    aisle: { libelle: "A un rayon nommé", valeur: "rayon" },
    tag: { libelle: "Cuisine", valeur: "cuisine" },
    filter: { libelle: "Filtre de l'accueil", valeur: "filtre" },
    max_eta: { libelle: "Délai maximum", valeur: "minutes" },
    min_rating: { libelle: "Note minimum", valeur: "note" },
    price_max: { libelle: "A un article à moins de…", valeur: "francs" },
    free_delivery: { libelle: "Livraison offerte" },
    has_offer: { libelle: "Avec des offres" },
    is_new: { libelle: "Nouvelles (moins de 30 jours)" },
    open_now: { libelle: "Ouvertes maintenant" },
};

const champ = "px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm";

interface Props {
    regles: Regles;
    onChange: (regles: Regles) => void;
    options: TargetOptions;
}

export default function CampaignStoreRules({ regles, onChange, options }: Props) {
    const [filtres, setFiltres] = useState<{ key: string; label: string }[]>([]);
    const [apercu, setApercu] = useState<{ name: string; is_open: boolean; rating: number | null }[] | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);

    const api = new ApiService();

    // Les filtres de l'accueil, pour le critère « Filtre de l'accueil ».
    useEffect(() => {
        api.getData("v3/admin/eat/filters")
            .then(({ data }) => data.success && setFiltres((data.data.filters ?? []).map((f: { key: string; label: string }) => ({ key: f.key, label: f.label }))))
            .catch(() => setFiltres([]));
    }, []);

    // L'aperçu suit les critères, sans surcharger le serveur à chaque touche.
    useEffect(() => {
        if (regles.criteria.length === 0) {
            setApercu(null);
            return;
        }

        const minuteur = setTimeout(async () => {
            try {
                const { data } = await api.postData("v3/admin/eat/campaigns/preview-stores", regles);
                setErreur(data.success ? null : data.message);
                setApercu(data.success ? data.data ?? [] : null);
            } catch (e) {
                setErreur(String(e));
            }
        }, 400);

        return () => clearTimeout(minuteur);
    }, [JSON.stringify(regles)]);

    const changer = (rang: number, modif: Partial<Critere>) => onChange({ ...regles, criteria: regles.criteria.map((c, i) => (i === rang ? { ...c, ...modif } : c)) });

    const valeur = (c: Critere, rang: number) => {
        const genre = CRITERES[c.criterion]?.valeur;
        const v = c.value == null ? "" : String(c.value);

        switch (genre) {
            case "type":
                return (
                    <select className={champ} value={v} onChange={(e) => changer(rang, { value: e.target.value })}>
                        <option value="">Choisir…</option>
                        <option value="restaurant">Restaurants</option>
                        <option value="store">Commerces (supermarchés, épiceries, pharmacies)</option>
                        <option value="supermarket">Supermarchés seulement</option>
                        <option value="pharmacy">Pharmacies seulement</option>
                    </select>
                );
            case "categorie":
                return (
                    <select className={champ} value={v} onChange={(e) => changer(rang, { value: e.target.value })}>
                        <option value="">Choisir…</option>
                        {(options.categories ?? []).map((x) => (
                            <option key={x.slug} value={x.slug}>{x.name}</option>
                        ))}
                    </select>
                );
            case "cuisine":
                return (
                    <select className={champ} value={v} onChange={(e) => changer(rang, { value: e.target.value })}>
                        <option value="">Choisir…</option>
                        {options.tags.map((x) => (
                            <option key={x.slug} value={x.slug}>{x.name}</option>
                        ))}
                    </select>
                );
            case "filtre":
                return (
                    <select className={champ} value={v} onChange={(e) => changer(rang, { value: e.target.value })}>
                        <option value="">Choisir…</option>
                        {filtres.map((x) => (
                            <option key={x.key} value={x.key}>{x.label.replace("{value}", "…")}</option>
                        ))}
                    </select>
                );
            case "rayon":
                return <input className={champ} list="eat-noms-rayons-regles" value={v} placeholder="Boissons" onChange={(e) => changer(rang, { value: e.target.value })} />;
            case "minutes":
            case "note":
            case "francs":
                return (
                    <input
                        className={`${champ} w-32`}
                        inputMode="decimal"
                        value={v}
                        placeholder={genre === "minutes" ? "30 (min)" : genre === "note" ? "4.5" : "3000 (F)"}
                        onChange={(e) => changer(rang, { value: e.target.value })}
                    />
                );
        }

        return <span className="text-xs text-slate-400">sans valeur</span>;
    };

    return (
        <div className="space-y-3">
            <datalist id="eat-noms-rayons-regles">
                {(options.aisles ?? []).map((a) => (
                    <option key={a.name} value={a.name} />
                ))}
            </datalist>

            {regles.criteria.map((c, rang) => (
                <div key={rang} className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400 w-6">{rang === 0 ? "" : "et"}</span>
                    <select className={champ} value={c.criterion} onChange={(e) => changer(rang, { criterion: e.target.value, value: null })}>
                        {Object.entries(CRITERES).map(([cle, x]) => (
                            <option key={cle} value={cle}>{x.libelle}</option>
                        ))}
                    </select>
                    {valeur(c, rang)}
                    <button type="button" onClick={() => onChange({ ...regles, criteria: regles.criteria.filter((_, i) => i !== rang) })} className="text-sm text-rose-600">
                        Retirer
                    </button>
                </div>
            ))}

            <button
                type="button"
                onClick={() => onChange({ ...regles, criteria: [...regles.criteria, { criterion: regles.criteria.length ? "open_now" : "store_type", value: null }] })}
                className="text-sm font-medium text-slate-900 dark:text-white"
            >
                + Ajouter un critère
            </button>

            <div className="flex flex-wrap items-center gap-3 pt-1">
                <label className="text-sm text-slate-600 dark:text-slate-300">
                    Trier par{" "}
                    <select className={champ} value={regles.sort} onChange={(e) => onChange({ ...regles, sort: e.target.value as Regles["sort"] })}>
                        <option value="default">Ouvertes puis plus rapides</option>
                        <option value="rating">Mieux notées</option>
                        <option value="eta">Plus rapides</option>
                    </select>
                </label>
                <label className="text-sm text-slate-600 dark:text-slate-300">
                    Au plus{" "}
                    <input className={`${champ} w-20`} inputMode="numeric" value={regles.limit} onChange={(e) => onChange({ ...regles, limit: Number(e.target.value) || 1 })} /> boutiques
                </label>
            </div>

            {regles.criteria.length > 0 && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-sm">
                    <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Retenues en ce moment</p>
                    {erreur ? (
                        <p className="text-amber-700">{erreur}</p>
                    ) : apercu === null ? (
                        <p className="text-slate-400">Calcul…</p>
                    ) : apercu.length === 0 ? (
                        <p className="text-amber-700">Aucune boutique : la page n'afficherait que ses tuiles.</p>
                    ) : (
                        <p className="text-slate-700 dark:text-slate-200">
                            {apercu.map((b) => `${b.name}${b.is_open ? "" : " (fermée)"}`).join(" · ")}
                        </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">Sans adresse de client : délais et frais varient ensuite selon l'adresse.</p>
                </div>
            )}
        </div>
    );
}
