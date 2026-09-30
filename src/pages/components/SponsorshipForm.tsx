import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";
import BannerFields from "./BannerFields";
import { Carte } from "./BannerPreview";
import type { Rendu, Position } from "./BannerPreview";
import ImageField from "./ImageField";
import { envoyerSiBesoin } from "../../services/images";

/**
 * Composer un sponsoring — le même formulaire pour Ongo et pour ses marchands.
 *
 * Quatre formes : une bannière à un emplacement, l'enseigne poussée, quelques
 * articles, ou un rayon. Ce qui change d'un côté à l'autre tient en une ligne
 * — Ongo choisit le marchand, le marchand est déjà connu — et c'est la seule
 * différence que ce composant connaît.
 *
 * Deux éditeurs auraient divergé au premier champ ajouté, et le marchand
 * aurait composé autre chose que ce que l'écran de pilotage montre.
 */

export interface Banniere {
    id: number;
    title: string;
    subtitle: string | null;
    image: string;
    placement: string;
    format: "wide" | "square";
    render: Rendu;
    badge: string | null;
    background_color: string | null;
    title_color: string | null;
    subtitle_color: string | null;
    text_position: Position;
}

export interface Article {
    id: number;
    store_id: number;
    name: string;
    price: number;
    image: string | null;
}

export interface Sponsoring {
    id: number;
    kind: "banner" | "store" | "products" | "section" | "mosaic";
    title: string;
    merchant_id: number;
    merchant_name: string | null;
    store_id: number;
    store_name: string | null;
    target_value: string | null;
    target_label: string | null;
    audience: string;

    /** La cible composée, quand il en porte une. Le segment ci-dessus sinon. */
    audience_id: number | null;

    status: string;
    state: string;
    review_note: string | null;
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
    banner: Banniere | null;
    products: Article[];
    tile_image: string | null;
    tile_tint: string | null;
    tile_tint_dark: string | null;
    position: number;
    impressions: number | null;
    clicks: number | null;
}

export interface Cibles {
    merchant_id?: number;

    /**
     * Les audiences qu'on peut désigner : celles d'Ongo, et les siennes.
     *
     * Composées dans l'écran « Audiences » : ici on ne fait que les choisir. Une
     * audience se réutilise — la redéfinir à chaque opération, c'est la définir
     * différemment à chaque fois.
     */
    audience_list?: { id: number; merchant_id: number | null; name: string; reach: number | null }[];

    merchants?: { id: number; name: string }[];
    stores: { id: number; merchant_id?: number; name: string; type: string }[];
    sections: { id: number; store_id: number; name: string; parent_id?: number | null }[];
    products: Article[];
    collections: { id: number; store_id: number; title: string; products: number[] }[];
}

interface Props {
    cibles: Cibles;
    sponsoring: Sponsoring | null;
    /** Le marchand, quand il est déjà connu : l'espace marchand ne le choisit pas. */
    merchantId?: number;
    /** Où poster : l'espace marchand et l'administration n'ont pas la même route. */
    base?: string;
    /** La galerie d'images : celle d'Ongo, ou celle du marchand. */
    galerie?: string;
    owner?: "ongo" | "merchants";
    onClose: () => void;
    onSaved: () => void;
}

const champ =
    "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white";

const francs = (montant: number) => `${(montant ?? 0).toLocaleString("fr-FR")} F`;

const FORMES: { cle: Sponsoring["kind"]; libelle: string; aide: string; icone: string }[] = [
    { cle: "banner", libelle: "Une bannière", aide: "Un visuel à un emplacement de l'accueil", icone: "view_carousel" },
    { cle: "store", libelle: "L'enseigne", aide: "La boutique poussée dans une rangée", icone: "storefront" },
    { cle: "products", libelle: "Des articles", aide: "Quelques plats, avec l'enseigne en tête", icone: "restaurant" },
    { cle: "section", libelle: "Un rayon", aide: "La boutique, ouverte sur un rayon précis", icone: "category" },
    {
        cle: "mosaic",
        libelle: "Une tuile d'accueil",
        aide: "Une place dans la mosaïque, tout en haut — la surface la plus chère",
        icone: "grid_view",
    },
];

const EMPLACEMENTS: Record<string, string> = {
    hero: "Haut de l'accueil — le carrousel d'entrée, le plus visible",
    deals: "Meilleurs deals — la rangée des bons plans",
    stores: "Écran Magasins — en tête de la liste des enseignes",
};

const AUDIENCES: Record<string, string> = {
    all: "Tout le monde",
    new: "Nouveaux clients — ceux qui n'ont encore rien commandé",
    returning: "Clients fidèles — ceux qui commandent déjà",
    dormant: "Clients à reconquérir — plus rien depuis six semaines",
};

/** Les dates arrivent en ISO ; le champ du navigateur veut « 2026-09-25T18:00 ». */
const pourChamp = (valeur: string | null) => (valeur ? valeur.replace(" ", "T").slice(0, 16) : "");

const vide = {
    id: null as number | null,
    kind: "banner" as Sponsoring["kind"],
    title: "",
    merchant_id: 0,
    store_id: 0,
    audience: "all",
    audience_id: 0,
    starts_at: "",
    ends_at: "",

    image: "",
    subtitle: "",
    badge: "",
    render: "image" as Rendu,
    format: "wide" as "wide" | "square",
    background_color: "",
    title_color: "",
    subtitle_color: "",
    text_position: "top_left" as Position,
    placement: "deals",

    // Le rayon choisi, et le sous-rayon éventuel. C'est le plus précis des
    // deux qui part au serveur : il n'y a qu'une cible.
    section_id: "",
    subsection_id: "",
    product_ids: [] as number[],

    // La tuile d'accueil : sa découpe, ses deux teintes, et la case visée.
    // Les deux premières portent « Restaurants » et « Magasins » — elles ne
    // se louent pas.
    tile_image: "",
    tile_tint: "",
    tile_tint_dark: "",
    tile_position: "3",
};

export default function SponsorshipForm({
    cibles,
    sponsoring,
    merchantId,
    base = "v3/admin/eat/sponsorships",
    galerie,
    owner = "ongo",
    onClose,
    onSaved,
}: Props) {
    const [form, setForm] = useState({ ...vide, merchant_id: merchantId ?? 0 });
    const [visuel, setVisuel] = useState<File | null>(null);

    // La découpe de la tuile, quand elle vient de l'ordinateur plutôt que de
    // la galerie.
    const [decoupeFichier, setDecoupeFichier] = useState<File | null>(null);
    const [envoi, setEnvoi] = useState(false);

    const api = new ApiService();

    /**
     * Le rayon parent d'une cible, ou `null` si c'en est déjà un.
     *
     * À la relecture, on ne sait pas si la cible enregistrée est un rayon ou
     * l'un de ses sous-rayons : sans cette remontée, le second sélecteur
     * s'afficherait vide et l'on croirait la cible perdue.
     */
    const parentDe = (cible: string | null): number | null => {
        const section = cibles.sections.find((r) => String(r.id) === String(cible ?? ""));

        return section?.parent_id ?? null;
    };

    useEffect(() => {
        if (sponsoring === null) {
            setForm({ ...vide, merchant_id: merchantId ?? cibles.merchants?.[0]?.id ?? 0 });

            return;
        }

        setForm({
            ...vide,
            id: sponsoring.id,
            kind: sponsoring.kind,
            title: sponsoring.title,
            merchant_id: sponsoring.merchant_id,
            store_id: sponsoring.store_id,
            audience: sponsoring.audience ?? "all",
            audience_id: sponsoring.audience_id ?? 0,
            starts_at: pourChamp(sponsoring.starts_at),
            ends_at: pourChamp(sponsoring.ends_at),

            image: sponsoring.banner?.image ?? "",
            subtitle: sponsoring.banner?.subtitle ?? "",
            badge: sponsoring.banner?.badge ?? "",
            render: sponsoring.banner?.render ?? "image",
            format: sponsoring.banner?.format ?? "wide",
            background_color: sponsoring.banner?.background_color ?? "",
            title_color: sponsoring.banner?.title_color ?? "",
            subtitle_color: sponsoring.banner?.subtitle_color ?? "",
            text_position: sponsoring.banner?.text_position ?? "top_left",
            placement: sponsoring.banner?.placement ?? "deals",

            // À la relecture, la cible enregistrée peut être un sous-rayon :
            // on remonte à son parent pour que les deux listes se replacent.
            tile_image: sponsoring.tile_image ?? "",
            tile_tint: sponsoring.tile_tint ?? "",
            tile_tint_dark: sponsoring.tile_tint_dark ?? "",
            tile_position: String(sponsoring.position ?? 3),
            section_id: sponsoring.kind === "section" ? String(parentDe(sponsoring.target_value) ?? "") : "",
            subsection_id:
                sponsoring.kind === "section" && parentDe(sponsoring.target_value) !== null
                    ? sponsoring.target_value ?? ""
                    : "",
            product_ids: sponsoring.products.map((a) => a.id),
        });

        setVisuel(null);
        setDecoupeFichier(null);
    }, [sponsoring?.id, merchantId]);

    /** Les boutiques du marchand choisi, et d'elles seules. */
    const boutiquesDe = cibles.stores.filter(
        (b) => merchantId !== undefined || b.merchant_id === undefined || b.merchant_id === form.merchant_id,
    );

    /*
     * Les rayons de la boutique, parents puis enfants.
     *
     * Un sous-rayon se sponsorise comme un rayon — c'est la même ligne de
     * catalogue. Mais présentés à plat, « Pizzas » et « Margherita » se
     * ressemblent : on ne sait plus lequel contient l'autre, et l'on vend un
     * rayon en croyant vendre l'autre.
     */
    const rayonsDe = cibles.sections.filter((r) => r.store_id === form.store_id && !r.parent_id);

    /// Les sous-rayons du rayon choisi. Vide : le rayon n'en a pas.
    const sousRayons = cibles.sections.filter((r) => String(r.parent_id ?? "") === form.section_id);
    const articlesDe = cibles.products.filter((a) => a.store_id === form.store_id);
    const collectionsDe = cibles.collections.filter((c) => c.store_id === form.store_id);

    const enregistrer = async () => {
        if (form.title.trim() === "") {
            Swal.fire({ icon: "info", title: "Donnez un nom à l'opération" });

            return;
        }

        if (!form.store_id) {
            Swal.fire({ icon: "info", title: "Choisissez la boutique concernée" });

            return;
        }

        setEnvoi(true);

        try {
            const image =
                form.kind === "banner" ? await envoyerSiBesoin(visuel, form.image || null, galerie) : null;

            if (form.kind === "banner" && !image) {
                setEnvoi(false);
                Swal.fire({ icon: "info", title: "Donnez un visuel à la bannière" });

                return;
            }

            // La découpe suit le même chemin que le visuel d'une bannière :
            // choisie dans la galerie ou envoyée depuis l'ordinateur, mais ce
            // qu'on enregistre est toujours une adresse.
            const decoupe =
                form.kind === "mosaic" ? await envoyerSiBesoin(decoupeFichier, form.tile_image || null, galerie) : null;

            if (form.kind === "mosaic" && !decoupe) {
                setEnvoi(false);
                Swal.fire({ icon: "info", title: "Donnez la découpe de la tuile" });

                return;
            }

            const { data } = await api.postData(base, {
                ...form,
                image,
                tile_image: decoupe,
                tile_position: Number(form.tile_position),

                // Zéro veut dire « aucune audience » : c'est alors le segment
                // qui décide. L'envoyer tel quel désignerait l'audience 0.
                audience_id: form.audience_id || null,
                starts_at: form.starts_at || null,
                ends_at: form.ends_at || null,
                // Le sous-rayon l'emporte : qui a pris la peine de le
                // désigner veut qu'on y arrive directement.
                section_id: form.subsection_id || form.section_id || null,
            });

            setEnvoi(false);

            if (!data.success) {
                Swal.fire({ icon: "error", title: data.message });

                return;
            }

            Swal.fire({ icon: "success", title: data.message, timer: 1600, showConfirmButton: false });
            onSaved();
        } catch (erreur) {
            setEnvoi(false);
            Swal.fire({ icon: "error", title: "Image non envoyée", text: String((erreur as Error).message ?? erreur) });
        }
    };

    const cocher = (id: number) =>
        setForm({
            ...form,
            product_ids: form.product_ids.includes(id)
                ? form.product_ids.filter((autre) => autre !== id)
                : [...form.product_ids, id],
        });

    return (
        <div className="mt-8 p-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-5">
                {form.id ? "Modifier le sponsoring" : "Nouveau sponsoring"}
            </h3>

            {/* Le choix d'abord : le reste du formulaire en dépend. */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {FORMES.map((f) => (
                    <button
                        key={f.cle}
                        onClick={() => setForm({ ...form, kind: f.cle })}
                        className={`p-4 rounded-xl border text-left ${
                            form.kind === f.cle
                                ? "border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800"
                                : "border-slate-200 dark:border-slate-800"
                        }`}
                    >
                        <span className="material-symbols-outlined text-slate-500">{f.icone}</span>
                        <p className="font-medium text-slate-900 dark:text-white mt-1">{f.libelle}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{f.aide}</p>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                    {/* Ongo choisit le marchand ; dans son espace, il est déjà connu. */}
                    {merchantId === undefined && cibles.merchants && (
                        <label className="block">
                            <span className="text-xs font-semibold uppercase text-slate-500">Marchand</span>
                            <select
                                className={champ}
                                value={form.merchant_id || ""}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        merchant_id: Number(e.target.value),
                                        // Une boutique appartient à un marchand : changer
                                        // l'un vide l'autre.
                                        store_id: 0,
                                        section_id: "",
                                        product_ids: [],
                                    })
                                }
                            >
                                <option value="">Choisir…</option>
                                {cibles.merchants.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}

                    <label className="block">
                        <span className="text-xs font-semibold uppercase text-slate-500">Nom de l'opération</span>
                        <input
                            className={champ}
                            value={form.title}
                            maxLength={120}
                            placeholder="Le midi à 2 000 F"
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                        />
                    </label>

                    <label className="block">
                        <span className="text-xs font-semibold uppercase text-slate-500">Boutique concernée</span>
                        <select
                            className={champ}
                            value={form.store_id || ""}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    store_id: Number(e.target.value),
                                    section_id: "",
                                    subsection_id: "",
                                    product_ids: [],
                                })
                            }
                        >
                            <option value="">Choisir…</option>
                            {boutiquesDe.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    {form.kind === "banner" && (
                        <>
                            <BannerFields
                                form={form}
                                patch={(modif) => setForm({ ...form, ...modif })}
                                fichier={visuel}
                                onFichier={setVisuel}
                                owner={galerie === undefined ? owner : undefined}
                                galerie={galerie}
                                disabled={envoi}
                                labelVisuel="Visuel"
                                aideVisuel="Depuis la galerie ou l'ordinateur."
                                forme={form.format === "square" ? "aspect-square" : "aspect-[2/1]"}
                            />

                            <label className="block">
                                <span className="text-xs font-semibold uppercase text-slate-500">Emplacement</span>
                                <select
                                    className={champ}
                                    value={form.placement}
                                    onChange={(e) => setForm({ ...form, placement: e.target.value })}
                                >
                                    {Object.entries(EMPLACEMENTS).map(([cle, libelle]) => (
                                        <option key={cle} value={cle}>
                                            {libelle}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </>
                    )}

                    {form.kind === "mosaic" && (
                        <>
                            {/*
                              * L'aperçu avant le formulaire.
                              *
                              * C'est une surface minuscule et chère : voir ce qu'on achète
                              * évite de découvrir sur un téléphone qu'un nom trop long se
                              * coupe, ou qu'une découpe claire disparaît sur sa teinte.
                              */}
                            <div className="sm:col-span-2">
                                <span className="text-xs font-semibold uppercase text-slate-500">Aperçu</span>
                                <div
                                    className="mt-2 relative w-56 h-28 rounded-2xl overflow-hidden"
                                    style={{ background: form.tile_tint || "#FBE7C8" }}
                                >
                                    {form.tile_image && (
                                        <img
                                            src={form.tile_image}
                                            alt=""
                                            className="absolute object-contain"
                                            style={{ width: "62%", top: "-5%", right: "-6%" }}
                                        />
                                    )}
                                    <span className="absolute left-2 top-2 px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-wide bg-black/10 text-black/60">
                                        Sponsorisé
                                    </span>
                                    <span className="absolute left-3 bottom-3 text-base font-extrabold leading-tight text-[#14110D]">
                                        {form.title || "Le titre de la tuile"}
                                    </span>
                                </div>
                                <span className="block text-xs text-slate-400 mt-1">
                                    La mention « Sponsorisé » est toujours affichée. Une place payée qui se
                                    présenterait comme un choix d'Ongo tromperait le client.
                                </span>
                            </div>

                            <div className="sm:col-span-2">
                                <ImageField
                                    label="Découpe"
                                    hint="Posée en haut à droite, jamais recadrée — donc une image détourée, à fond transparent."
                                    adresse={form.tile_image}
                                    fichier={decoupeFichier}
                                    owner={galerie === undefined ? owner : undefined}
                                    galerie={galerie}
                                    disabled={envoi}
                                    forme="aspect-square"
                                    onChange={(tile_image, choisi) => {
                                        setForm({ ...form, tile_image });
                                        setDecoupeFichier(choisi);
                                    }}
                                />
                            </div>

                            <label className="block">
                                <span className="text-xs font-semibold uppercase text-slate-500">Teinte claire</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        className="h-10 w-10 shrink-0 rounded border border-slate-300 dark:border-slate-700"
                                        value={/^#[0-9a-fA-F]{6}$/.test(form.tile_tint) ? form.tile_tint : "#FBE7C8"}
                                        onChange={(e) => setForm({ ...form, tile_tint: e.target.value.toUpperCase() })}
                                    />
                                    <input
                                        className={champ}
                                        value={form.tile_tint}
                                        placeholder="vide : celle d'Ongo"
                                        onChange={(e) => setForm({ ...form, tile_tint: e.target.value.toUpperCase() })}
                                    />
                                </div>
                            </label>

                            <label className="block">
                                <span className="text-xs font-semibold uppercase text-slate-500">Teinte sombre</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        className="h-10 w-10 shrink-0 rounded border border-slate-300 dark:border-slate-700"
                                        value={/^#[0-9a-fA-F]{6}$/.test(form.tile_tint_dark) ? form.tile_tint_dark : "#4A2A10"}
                                        onChange={(e) => setForm({ ...form, tile_tint_dark: e.target.value.toUpperCase() })}
                                    />
                                    <input
                                        className={champ}
                                        value={form.tile_tint_dark}
                                        placeholder="vide : celle d'Ongo"
                                        onChange={(e) => setForm({ ...form, tile_tint_dark: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <span className="block text-xs text-slate-400 mt-1">
                                    Prend le relais la nuit et en mode sombre.
                                </span>
                            </label>

                            <label className="block">
                                <span className="text-xs font-semibold uppercase text-slate-500">Place</span>
                                <input
                                    type="number"
                                    min={3}
                                    max={99}
                                    className={champ}
                                    value={form.tile_position}
                                    onChange={(e) => setForm({ ...form, tile_position: e.target.value })}
                                />
                                <span className="block text-xs text-slate-400 mt-1">
                                    3 est la première libre. Les deux premières portent « Restaurants » et
                                    « Magasins » : elles ne se louent pas.
                                </span>
                            </label>
                        </>
                    )}

                    {form.kind === "section" && (
                        <label className="block">
                            <span className="text-xs font-semibold uppercase text-slate-500">Rayon mis en avant</span>
                            <p className="text-xs text-slate-400 mb-1">
                                Un sous-rayon se choisit comme un rayon : la boutique s'ouvrira dessus.
                            </p>
                            <select
                                className={champ}
                                value={form.section_id}
                                // Changer de rayon vide le sous-rayon : celui
                                // d'avant n'appartient plus à celui-ci.
                                onChange={(e) => setForm({ ...form, section_id: e.target.value, subsection_id: "" })}
                            >
                                <option value="">Choisir…</option>
                                {rayonsDe.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>

                            {/* Les sous-rayons n'apparaissent qu'une fois le
                                rayon choisi, et seulement s'il en a. */}
                            {sousRayons.length > 0 && (
                                <div className="mt-3">
                                    <span className="text-xs font-semibold uppercase text-slate-500">
                                        Sous-rayon (facultatif)
                                    </span>
                                    <p className="text-xs text-slate-400 mb-2">
                                        Aucun coché : c'est le rayon entier qui est mis en avant.
                                    </p>

                                    <div className="flex flex-wrap gap-2">
                                        {sousRayons.map((r) => (
                                            <button
                                                key={r.id}
                                                onClick={() =>
                                                    setForm({
                                                        ...form,
                                                        subsection_id:
                                                            form.subsection_id === String(r.id) ? "" : String(r.id),
                                                    })
                                                }
                                                className={`px-3 py-1.5 rounded-lg text-sm border ${
                                                    form.subsection_id === String(r.id)
                                                        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                                                        : "border-slate-300 dark:border-slate-700 dark:text-white"
                                                }`}
                                            >
                                                {r.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </label>
                    )}

                    {form.kind === "products" && (
                        <div>
                            <span className="text-xs font-semibold uppercase text-slate-500">Articles mis en avant</span>
                            <p className="text-xs text-slate-400 mb-2">
                                Vingt au plus. L'ordre des cases cochées est celui qui s'affichera.
                            </p>

                            {collectionsDe.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className="text-xs text-slate-500 self-center">Reprendre une collection :</span>
                                    {collectionsDe.map((c) => (
                                        <button
                                            key={c.id}
                                            onClick={() =>
                                                setForm({
                                                    ...form,
                                                    // Copiés, pas pointés : ce qui a été acheté ne
                                                    // change pas parce que le marchand range son
                                                    // catalogue autrement.
                                                    product_ids: c.products.filter((id) =>
                                                        cibles.products.some((a) => a.id === id),
                                                    ),
                                                })
                                            }
                                            className="px-3 py-1 rounded-lg text-xs border border-slate-300 dark:border-slate-700 dark:text-white"
                                        >
                                            {c.title}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                                {articlesDe.map((a) => (
                                    <label key={a.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={form.product_ids.includes(a.id)}
                                            onChange={() => cocher(a.id)}
                                        />
                                        <span className="flex-1 text-sm text-slate-900 dark:text-white">{a.name}</span>
                                        <span className="text-sm text-slate-500">{francs(a.price)}</span>
                                    </label>
                                ))}
                            </div>

                            <p className="text-xs text-slate-500 mt-2">
                                {form.product_ids.length} article{form.product_ids.length > 1 ? "s" : ""} sélectionné
                                {form.product_ids.length > 1 ? "s" : ""}
                            </p>
                        </div>
                    )}

                    {/*
                      * À qui. Deux façons de le dire, et la seconde ne sert que
                      * si la première est vide : une audience composée porte des
                      * critères — les plats commandés, les cuisines, la ville, le
                      * panier — là où le segment n'en porte qu'un.
                      */}
                    <label className="block">
                        <span className="text-xs font-semibold uppercase text-slate-500">À qui · audience</span>
                        <select
                            className={champ}
                            value={String(form.audience_id)}
                            onChange={(e) => setForm({ ...form, audience_id: Number(e.target.value) })}
                        >
                            <option value="0">Aucune — s'en tenir au profil ci-dessous</option>

                            {(cibles.audience_list ?? [])
                                // Celles d'Ongo, et celles du marchand composé.
                                // Le serveur le revérifie : la liste n'est
                                // qu'une politesse.
                                .filter((a) => a.merchant_id === null || a.merchant_id === form.merchant_id)
                                .map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name}
                                    {a.reach === null ? "" : ` — ${a.reach.toLocaleString("fr-FR")} personnes`}
                                </option>
                            ))}
                        </select>
                        <span className="text-xs text-slate-400">
                            Composée dans « Audiences » : ceux qui ont commandé un plat, aiment une cuisine, ou ont
                            laissé un panier.
                        </span>
                    </label>

                    <label className="block">
                        <span className="text-xs font-semibold uppercase text-slate-500">À qui · profil</span>
                        <select
                            className={champ}
                            disabled={form.audience_id !== 0}
                            value={form.audience}
                            onChange={(e) => setForm({ ...form, audience: e.target.value })}
                        >
                            {Object.entries(AUDIENCES).map(([cle, libelle]) => (
                                <option key={cle} value={cle}>
                                    {libelle}
                                </option>
                            ))}
                        </select>
                        {form.audience_id !== 0 && (
                            <span className="text-xs text-slate-400">
                                Ignoré : l'audience ci-dessus décide.
                            </span>
                        )}
                    </label>

                    <div className="grid grid-cols-2 gap-4">
                        <label className="block">
                            <span className="text-xs font-semibold uppercase text-slate-500">Début</span>
                            <input
                                type="datetime-local"
                                className={champ}
                                value={form.starts_at}
                                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                            />
                        </label>
                        <label className="block">
                            <span className="text-xs font-semibold uppercase text-slate-500">Fin</span>
                            <input
                                type="datetime-local"
                                className={champ}
                                value={form.ends_at}
                                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                            />
                        </label>
                    </div>
                </div>

                {/* L'aperçu, collant : on règle un titre en le regardant bouger. */}
                {form.kind === "banner" && (
                    <div className="lg:sticky lg:top-6 self-start space-y-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">Aperçu</p>
                        <Carte banniere={form} h={form.format === "square" ? 220 : 170} />
                        <p className="text-xs text-slate-400">
                            Ce que verra le client. Les tailles de texte sont celles de l'application : si un titre
                            déborde ici, il débordera là-bas.
                        </p>
                    </div>
                )}
            </div>

            <div className="flex gap-3 mt-6">
                <button
                    onClick={enregistrer}
                    disabled={envoi}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 disabled:opacity-50"
                >
                    {envoi ? "Envoi…" : "Enregistrer"}
                </button>
                <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg text-sm border border-slate-300 dark:border-slate-700 dark:text-white"
                >
                    Annuler
                </button>
            </div>
        </div>
    );
}
