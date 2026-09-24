import { useState } from "react";
import Swal from "sweetalert2";
import { apercu, envoyerSiBesoin, GALERIE_ONGO } from "../../services/images";
import ImageField from "./ImageField";

/**
 * La fiche d'une boutique — commune à l'espace marchand et au workspace.
 *
 * À gauche le formulaire, à droite l'en-tête tel que le client le voit :
 * bannière, logo, nom, cuisines, délai. Le temps de préparation entre dans
 * le délai annoncé (« 25–35 min ») : le régler juste évite les retards.
 */

export interface Fiche {
    id: number;
    name: string;
    description: string | null;
    logo: string | null;
    banner: string | null;
    brand_color: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    latitude: number | string | null;
    longitude: number | string | null;
    prep_minutes: number;
    tags: string[];
    rating_avg?: number | null;
}

export interface Cuisine {
    slug: string;
    name: string;
}

interface Props {
    fiche: Fiche;
    cuisines: Cuisine[];
    // Enregistrer : l'appelant sait où (espace marchand ou workspace).
    onSave: (champs: Record<string, unknown>) => Promise<boolean>;
    readOnly?: boolean;
    /** La galerie où choisir et ranger les images : celle du marchand, ou celle d'Ongo. */
    galerie?: string;
    /** Depuis le workspace : les nouvelles images vont chez ce marchand. */
    merchantId?: number | null;
}

const champ = "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60";

export default function StoreProfileForm({ fiche, cuisines, onSave, readOnly = false, galerie = GALERIE_ONGO, merchantId = null }: Props) {
    const [f, setF] = useState({
        description: fiche.description ?? "",
        logo: fiche.logo ?? "",
        banner: fiche.banner ?? "",
        brand_color: fiche.brand_color ?? "#111827",
        phone: fiche.phone ?? "",
        address: fiche.address ?? "",
        city: fiche.city ?? "",
        latitude: fiche.latitude == null ? "" : String(fiche.latitude),
        longitude: fiche.longitude == null ? "" : String(fiche.longitude),
        prep_minutes: String(fiche.prep_minutes ?? 20),
        tags: fiche.tags ?? [],
    });
    // Logo et bannière choisis, envoyés seulement à l'enregistrement.
    const [fichiers, setFichiers] = useState<{ logo: File | null; banner: File | null }>({ logo: null, banner: null });
    const [enregistrement, setEnregistrement] = useState(false);

    const basculerCuisine = (slug: string) =>
        setF((x) => ({ ...x, tags: x.tags.includes(slug) ? x.tags.filter((t) => t !== slug) : x.tags.length >= 5 ? x.tags : [...x.tags, slug] }));

    const enregistrer = async () => {
        setEnregistrement(true);

        let logo: string | null;
        let banner: string | null;

        try {
            logo = await envoyerSiBesoin(fichiers.logo, f.logo || null, galerie, merchantId);
            banner = await envoyerSiBesoin(fichiers.banner, f.banner || null, galerie, merchantId);
        } catch (erreur) {
            setEnregistrement(false);
            Swal.fire({ icon: "error", title: "Image non envoyée", text: String((erreur as Error).message ?? erreur) });
            return;
        }

        const ok = await onSave({
            ...f,
            logo,
            banner,
            prep_minutes: Number(f.prep_minutes),
            latitude: f.latitude === "" ? null : Number(f.latitude),
            longitude: f.longitude === "" ? null : Number(f.longitude),
        });

        // Enregistrées : les adresses remplacent les fichiers.
        if (ok) {
            setF((x) => ({ ...x, logo: logo ?? "", banner: banner ?? "" }));
            setFichiers({ logo: null, banner: null });
        }

        setEnregistrement(false);
    };

    const nomsCuisines = f.tags.map((t) => cuisines.find((c) => c.slug === t)?.name ?? t);
    const prep = Number(f.prep_minutes) || 20;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
            <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ImageField
                        label="Logo"
                        hint="Carré, 400 × 400 px"
                        adresse={f.logo}
                        fichier={fichiers.logo}
                        galerie={galerie}
                        owner={merchantId ? "merchants" : undefined}
                        disabled={readOnly || enregistrement}
                        forme="aspect-square"
                        onChange={(logo, choisi) => {
                            setF({ ...f, logo });
                            setFichiers({ ...fichiers, logo: choisi });
                        }}
                    />
                    <ImageField
                        label="Bannière"
                        hint="Paysage, 1200 × 600 px : vos plats, pas votre façade"
                        adresse={f.banner}
                        fichier={fichiers.banner}
                        galerie={galerie}
                        owner={merchantId ? "merchants" : undefined}
                        disabled={readOnly || enregistrement}
                        onChange={(banner, choisi) => {
                            setF({ ...f, banner });
                            setFichiers({ ...fichiers, banner: choisi });
                        }}
                    />
                    <label className="md:col-span-2">
                        <span className="text-xs font-semibold uppercase text-slate-500">Description</span>
                        <textarea className={champ} rows={2} maxLength={500} disabled={readOnly} value={f.description} placeholder="Cuisine camerounaise maison, poulet DG et ndolé tous les jours" onChange={(e) => setF({ ...f, description: e.target.value })} />
                    </label>
                    <label>
                        <span className="text-xs font-semibold uppercase text-slate-500">Temps de préparation habituel (min)</span>
                        <input className={champ} inputMode="numeric" disabled={readOnly} value={f.prep_minutes} onChange={(e) => setF({ ...f, prep_minutes: e.target.value })} />
                        <span className="text-xs text-slate-400">De la commande acceptée au sac prêt. Il s'ajoute au trajet dans le délai annoncé.</span>
                    </label>
                    <label>
                        <span className="text-xs font-semibold uppercase text-slate-500">Couleur de marque</span>
                        <input type="color" className="block mt-1 h-10 w-20 rounded" disabled={readOnly} value={f.brand_color} onChange={(e) => setF({ ...f, brand_color: e.target.value })} />
                    </label>
                    <label>
                        <span className="text-xs font-semibold uppercase text-slate-500">Téléphone</span>
                        <input className={champ} disabled={readOnly} value={f.phone} placeholder="+237 6…" onChange={(e) => setF({ ...f, phone: e.target.value })} />
                    </label>
                    <label>
                        <span className="text-xs font-semibold uppercase text-slate-500">Ville</span>
                        <input className={champ} disabled={readOnly} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
                    </label>
                    <label className="md:col-span-2">
                        <span className="text-xs font-semibold uppercase text-slate-500">Adresse</span>
                        <input className={champ} disabled={readOnly} value={f.address} placeholder="Rue Joss, face pharmacie du Centre, Akwa" onChange={(e) => setF({ ...f, address: e.target.value })} />
                    </label>
                    <label>
                        <span className="text-xs font-semibold uppercase text-slate-500">Latitude</span>
                        <input className={champ} disabled={readOnly} value={f.latitude} inputMode="decimal" onChange={(e) => setF({ ...f, latitude: e.target.value })} />
                    </label>
                    <label>
                        <span className="text-xs font-semibold uppercase text-slate-500">Longitude</span>
                        <input className={champ} disabled={readOnly} value={f.longitude} inputMode="decimal" onChange={(e) => setF({ ...f, longitude: e.target.value })} />
                        <span className="text-xs text-slate-400">Elles font les délais et les frais de livraison.</span>
                    </label>
                </div>

                <div>
                    <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Cuisines · {f.tags.length}/5</p>
                    <div className="flex flex-wrap gap-2">
                        {cuisines.map((c) => (
                            <button
                                key={c.slug}
                                type="button"
                                disabled={readOnly}
                                onClick={() => basculerCuisine(c.slug)}
                                className={`px-3 py-1.5 rounded-full text-sm border ${
                                    f.tags.includes(c.slug)
                                        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                                        : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                                }`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Vos clients vous trouvent par elles, dans « Laissez-vous tenter » et les filtres.</p>
                </div>

                {!readOnly && (
                    <div className="flex justify-end">
                        <button
                            onClick={enregistrer}
                            disabled={enregistrement}
                            className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 dark:bg-white dark:text-slate-900"
                        >
                            {enregistrement ? "Enregistrement…" : "Enregistrer la fiche"}
                        </button>
                    </div>
                )}
            </div>

            {/* L'en-tête, comme chez le client. */}
            <div>
                <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Chez le client</p>
                <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <div className="h-40 bg-slate-100 dark:bg-slate-800" style={{ background: apercu(fichiers.banner, f.banner) ? undefined : f.brand_color }}>
                        {apercu(fichiers.banner, f.banner) && <img src={apercu(fichiers.banner, f.banner)} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="px-4 pb-5 -mt-8">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border-4 border-white dark:border-slate-950 bg-slate-100">
                            {apercu(fichiers.logo, f.logo) && <img src={apercu(fichiers.logo, f.logo)} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <p className="mt-2 text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">{fiche.name}</p>
                        <p className="text-sm text-slate-500">{nomsCuisines.join(", ") || "Aucune cuisine"}</p>
                        <div className="flex gap-4 mt-3 text-sm text-slate-700 dark:text-slate-200">
                            {fiche.rating_avg ? <span>★ {Number(fiche.rating_avg).toFixed(1)}</span> : <span className="text-slate-400">Pas encore noté</span>}
                            <span>
                                ⏱ {prep + 5}–{prep + 15} min
                            </span>
                        </div>
                        {f.description && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{f.description}</p>}
                    </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">Délai indicatif pour une adresse proche ; il dépend de la distance.</p>
            </div>
        </div>
    );
}
