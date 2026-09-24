import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";
import { apercu, envoyerSiBesoin, galerieMarchand } from "../../services/images";
import ImageField from "../components/ImageField";
import OptionGroupsEditor, { type GroupeEdite, problemeDuGroupe, versApi } from "./OptionGroupsEditor";
import IngredientsInput from "./IngredientsInput";
import ProductPreview from "./ProductPreview";

/**
 * Le catalogue, côté marchand.
 *
 * On l'ouvre rarement, assis, pour construire sa carte — à l'opposé du poste
 * de commande. C'est pourquoi les deux sont séparés.
 *
 * La fonction la plus utilisée n'est pas la création d'un plat mais sa **mise
 * en sommeil** : « épuisé ce soir » revient tout seul demain. Sans elle, les
 * catalogues finissent avec la moitié des lignes éteintes depuis des mois.
 */

interface Option {
    id: number;
    name: string;
    extra_price: number;
}

interface GroupeOption {
    id: number;
    name: string;
    is_required: boolean;
    min_choices: number;
    max_choices: number;
    options: Option[];
}

interface Produit {
    id: number;
    public_id: string;
    name: string;
    description: string | null;
    ingredients: string[] | null;
    image: string | null;
    tags?: Cuisine[];
    price: number;
    compare_at_price: number | null;
    bundle_qty?: number | null;
    bundle_price?: number | null;
    size_value: number | null;
    size_unit: string | null;
    unit_price: number | null;
    unit_price_unit: string | null;
    is_available: boolean;
    unavailable_until: string | null;
    is_orderable: boolean;
    is_popular: boolean;
    option_groups: GroupeOption[];
}

interface Cuisine {
    id: number;
    slug?: string;
    name: string;
    image?: string | null;
}

interface Categorie {
    id: number;
    name: string;
    image?: string | null;
    parent_id?: number | null;
    children?: Categorie[];
}

/** « Épicerie » et « epicerie » se valent : on compare sans accents ni casse. */
const sansAccents = (texte: string) => texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

interface Rayon {
    id: number;
    name: string;
    parent_id: number | null;
    category_id?: number | null;
    image?: string | null;
    tags?: Cuisine[];
    children: Rayon[];
    products: Produit[];
}

interface Menu {
    id: number;
    name: string;
    is_default: boolean;
    hours: { weekday: number; starts_at: string; ends_at: string }[];
}

interface CatalogProps {
    merchantId: string;
    storeId: number;
    storeType: string;
}

const francs = (montant: number) => `${(montant ?? 0).toLocaleString("fr-FR")} F`;

export default function Catalog({ merchantId, storeId, storeType }: CatalogProps) {
    const [menus, setMenus] = useState<Menu[]>([]);
    const [rayons, setRayons] = useState<Rayon[]>([]);

    // Les catégories d'Ongo, auxquelles on associe ses rayons.
    const [categories, setCategories] = useState<Categorie[]>([]);

    /** La création d'un rayon en cours : ce qui est tapé, et sous quel rayon. */
    const [creation, setCreation] = useState<{ nom: string; parent: number | null } | null>(null);

    /** Les cuisines d'Ongo : Pizza, Grillades, Libanais… */
    const [cuisines, setCuisines] = useState<Cuisine[]>([]);
    const [chargement, setChargement] = useState<boolean>(true);
    const [edition, setEdition] = useState<Partial<Produit> & { section_id?: number } | null>(null);
    const [televersement, setTeleversement] = useState<boolean>(false);

    // La photo choisie, envoyée seulement à l'enregistrement du produit.
    const [photo, setPhoto] = useState<File | null>(null);

    useEffect(() => setPhoto(null), [edition === null, edition?.id]);

    const api = new ApiService();
    const base = `v3/merchant/${merchantId}/stores/${storeId}/catalog`;

    // Un commerce parle de rayons, un restaurant de sections de menu.
    const commerce = ["supermarket", "convenience", "pharmacy"].includes(storeType);
    const motRayon = commerce ? "rayon" : "section";

    const charger = async () => {
        setChargement(true);

        try {
            const { data } = await api.getData(base);

            if (data.success) {
                setMenus(data.data.menus ?? []);
                setRayons(data.data.sections ?? []);
                setCategories(data.data.categories ?? []);
                setCuisines(data.data.cuisines ?? []);
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Catalogue illisible", text: String(erreur) });
        }

        setChargement(false);
    };

    useEffect(() => {
        charger();
    }, [storeId]);

    const envoyer = async (chemin: string, corps: Record<string, unknown>, succes: string) => {
        try {
            const { data } = await api.postData(`${base}/${chemin}`, corps);

            if (data.success) {
                await charger();
                Swal.fire({ icon: "success", title: succes, timer: 1200, showConfirmButton: false });

                return true;
            }

            // La raison exacte, champ par champ : « Suppléments : 3 choix pour
            // 1 option » apprend au marchand quoi corriger.
            const details = data.data && typeof data.data === "object" ? Object.values(data.data).flat().join("\n") : "";
            Swal.fire({ icon: "error", title: data.message || "Refusé", text: details });
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Enregistrement impossible", text: String(erreur) });
        }

        return false;
    };

    /**
     * L'image d'un rayon : la tuile de la page magasin (« Chips », « Hygiène »).
     * Choisie dans la galerie ou sur l'ordinateur, enregistrée aussitôt.
     */
    const changerImageRayon = async (rayon: Rayon, adresse: string, fichier: File | null) => {
        try {
            const image = await envoyerSiBesoin(fichier, adresse || null, galerieMarchand(merchantId));

            await envoyer("sections", { section_id: rayon.id, name: rayon.name, parent_id: rayon.parent_id, image }, "Image du rayon enregistrée");
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Image non envoyée", text: String((erreur as Error).message ?? erreur) });
        }
    };

    const creerRayon = (parent?: number) => setCreation({ nom: "", parent: parent ?? null });

    /**
     * Les catégories d'Ongo proposées pendant la saisie.
     *
     * Pour un rayon : les catégories ; pour un sous-rayon : les
     * sous-catégories de la catégorie du rayon parent, à défaut toutes.
     * Celles déjà utilisées dans cette boutique ne sont plus proposées.
     */
    const suggestions = (() => {
        if (!creation) return [] as Categorie[];

        // Un restaurant range ses rubriques par cuisine, pas par catégorie.
        if (!commerce) {
            const tape = sansAccents(creation.nom);
            const prises = new Set(rayons.flatMap((r) => (r.tags ?? []).map((c) => c.id)));

            return cuisines
                .filter((c) => !prises.has(c.id) && (tape === "" || sansAccents(c.name).includes(tape)))
                .slice(0, 8) as Categorie[];
        }

        const parent = creation.parent ? rayons.find((r) => r.id === creation.parent) : null;
        const source = parent
            ? categories.find((c) => c.id === parent.category_id)?.children ?? categories.flatMap((c) => c.children ?? [])
            : categories;

        const prises = new Set(
            rayons.flatMap((r) => [r.category_id, ...(r.children ?? []).map((sous) => sous.category_id)]).filter(Boolean)
        );
        const tape = sansAccents(creation.nom);

        return source.filter((c) => !prises.has(c.id) && (tape === "" || sansAccents(c.name).includes(tape))).slice(0, 8);
    })();

    /** Un rayon tout fait : le nom et la catégorie d'Ongo d'un coup. */
    const creerDepuisCategorie = async (c: Categorie) => {
        const parent = creation?.parent ?? null;

        setCreation(null);

        // Un commerce range son rayon dans une catégorie ; un restaurant
        // étiquette sa rubrique d'une cuisine.
        await envoyer(
            "sections",
            commerce
                ? { name: c.name, parent_id: parent, category_id: c.id }
                : { name: c.name, parent_id: parent, tags: [c.id] },
            `${motRayon} créé`
        );
    };

    /** Son propre rayon ; Ongo propose ensuite la catégorie la plus proche. */
    const creerSonRayon = async () => {
        if (!creation?.nom.trim()) return;

        const nom = creation.nom.trim();
        const parent = creation.parent;

        setCreation(null);

        const ok = await envoyer("sections", { name: nom, parent_id: parent }, `${motRayon} créé`);

        if (!ok) return;

        if (!commerce) return;

        // La catégorie la plus proche du nom saisi, s'il y en a une.
        const toutes = categories.flatMap((c) => [c, ...(c.children ?? [])]);
        const proche = toutes.find((c) => sansAccents(c.name) === sansAccents(nom)) ?? toutes.find((c) => sansAccents(nom).includes(sansAccents(c.name)));

        if (!proche) return;

        const reponse = await Swal.fire({
            icon: "question",
            title: `Ranger « ${nom} » dans « ${proche.name} » ?`,
            text: "Vos articles apparaîtront alors dans les pages Ongo de cette catégorie, en plus de votre boutique.",
            showCancelButton: true,
            confirmButtonText: "Oui, ranger",
            cancelButtonText: "Non merci",
        });

        if (!reponse.isConfirmed) return;

        const cree = (await api.getData(base))?.data?.data?.sections?.find?.((r: Rayon) => r.name === nom);

        if (cree) await envoyer("sections", { section_id: cree.id, name: nom, parent_id: parent, category_id: proche.id }, "Catégorie enregistrée");
    };

    const creerMenu = async () => {
        const choix = await Swal.fire({
            title: "Nouveau menu",
            html:
                `<input id="nom" class="swal2-input" placeholder="Midi, Petit-déjeuner…">` +
                `<input id="debut" class="swal2-input" placeholder="11:30" value="11:30">` +
                `<input id="fin" class="swal2-input" placeholder="14:00" value="14:00">` +
                `<p style="font-size:13px;color:#64748b;margin-top:8px">Laissez les heures vides pour un menu disponible toute la journée.</p>`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: "Créer",
            cancelButtonText: "Annuler",
            preConfirm: () => ({
                nom: (document.getElementById("nom") as HTMLInputElement)?.value,
                debut: (document.getElementById("debut") as HTMLInputElement)?.value,
                fin: (document.getElementById("fin") as HTMLInputElement)?.value,
            }),
        });

        if (!choix.isConfirmed || !choix.value?.nom) return;

        const { nom, debut, fin } = choix.value;

        // Une plage vaut pour les sept jours : un restaurant qui ferme le lundi
        // le dit par ses horaires de boutique, pas par son menu.
        const hours = debut && fin
            ? [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, starts_at: debut, ends_at: fin }))
            : [];

        await envoyer("menus", { name: nom, hours, is_default: menus.length === 0 }, "Menu créé");
    };

    /**
     * La photo du produit.
     *
     * Ce n'est pas un ornement : une plateforme de livraison se vend par
     * l'image. Sur les écrans de Yango, le texte n'occupe qu'un cinquième de
     * chaque carte, et un catalogue sans photos ressemble à un annuaire.
     */
    const enregistrerProduit = async () => {
        if (!edition?.name || !edition?.price) {
            Swal.fire({ icon: "info", title: "Il manque l'essentiel", text: "Le nom et le prix sont requis." });

            return;
        }

        // Un groupe incomplet est dit ici, avant l'envoi : le serveur le
        // refuserait de toute façon, avec moins de contexte.
        const groupes = (edition.option_groups ?? []) as unknown as GroupeEdite[];
        const probleme = groupes.map((g) => ({ g, p: problemeDuGroupe(g) })).find((x) => x.p !== null);

        if (probleme) {
            Swal.fire({ icon: "info", title: "Options incomplètes", text: `${probleme.g.name || "Un groupe"} : ${probleme.p}` });

            return;
        }

        // La photo part maintenant : un produit annulé n'a rien envoyé.
        let image: string | null;

        setTeleversement(true);

        try {
            image = await envoyerSiBesoin(photo, edition.image ?? null, galerieMarchand(merchantId));
        } catch (erreur) {
            setTeleversement(false);
            Swal.fire({ icon: "error", title: "Photo non envoyée", text: String((erreur as Error).message ?? erreur) });

            return;
        }

        setTeleversement(false);

        const ok = await envoyer("products", {
            product_id: edition.id,
            section_id: edition.section_id,
            name: edition.name,
            description: edition.description,
            ingredients: edition.ingredients ?? [],
            tags: (edition.tags ?? []).map((c) => c.id),
            image,
            price: Number(edition.price),
            compare_at_price: edition.compare_at_price ? Number(edition.compare_at_price) : null,
            bundle_qty: edition.bundle_qty ? Number(edition.bundle_qty) : null,
            bundle_price: edition.bundle_price ? Number(edition.bundle_price) : null,
            size_value: edition.size_value ? Number(edition.size_value) : null,
            size_unit: edition.size_unit || null,
            is_popular: edition.is_popular ?? false,
            // L'état voulu des options, identifiants compris : le serveur met à
            // jour ce qui existe au lieu de le recréer.
            option_groups: versApi(groupes),
        }, edition.id ? "Produit modifié" : "Produit créé");

        if (ok) setEdition(null);
    };

    const changerDisponibilite = async (produit: Produit) => {
        const choix = await Swal.fire({
            title: produit.name,
            input: "select",
            inputOptions: {
                available: "Disponible",
                today: "Épuisé aujourd'hui — revient demain",
                tomorrow: "Épuisé jusqu'à demain soir",
                forever: "Retiré de la carte",
            },
            inputValue: produit.is_orderable ? "available" : "forever",
            showCancelButton: true,
            confirmButtonText: "Enregistrer",
            cancelButtonText: "Annuler",
        });

        if (!choix.isConfirmed) return;

        await envoyer("availability", { product_id: produit.id, until: choix.value }, "Disponibilité enregistrée");
    };

    if (chargement) {
        return <p className="text-slate-500">Chargement du catalogue…</p>;
    }

    /**
     * Les cuisines d'une rubrique ou d'un plat : trois au plus.
     *
     * Une rubrique « Nos pizzas » étiquetée Pizza fait remonter le restaurant
     * quand un client tape « Pizza », et ses plats apparaissent dans la page
     * de cette cuisine. Un plat hérite des cuisines de sa rubrique.
     */
    const selecteurCuisines = (choisies: Cuisine[], onChange: (c: Cuisine[]) => void) => (
        <div className="flex flex-wrap items-center gap-2">
            {choisies.map((c) => (
                <button
                    key={c.id}
                    type="button"
                    onClick={() => onChange(choisies.filter((x) => x.id !== c.id))}
                    className="px-3 py-1 rounded-full text-xs bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    title="Retirer"
                >
                    {c.name} ✕
                </button>
            ))}
            {choisies.length < 3 && cuisines.length > 0 && (
                <select
                    className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300"
                    value=""
                    onChange={(e) => {
                        const choisie = cuisines.find((c) => c.id === Number(e.target.value));

                        if (choisie) onChange([...choisies, choisie]);
                    }}
                >
                    <option value="">+ Cuisine</option>
                    {cuisines
                        .filter((c) => !choisies.some((x) => x.id === c.id))
                        .map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                </select>
            )}
        </div>
    );

    /** Une ligne produit : photo, nom, prix, disponibilité, modifier. `sectionId` : son rayon ou sous-rayon. */
    const ligneProduit = (produit: Produit, sectionId: number) => (
                                        <div key={produit.public_id} className="p-4 flex items-center gap-4">
                                            <div className="h-14 w-14 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center">
                                                {produit.image ? (
                                                    <img src={produit.image} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="text-[10px] text-slate-400">photo</span>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className={`font-medium text-slate-900 dark:text-white ${!produit.is_orderable ? "opacity-50" : ""}`}>
                                                    {produit.name}
                                                    {produit.is_popular && <span className="ml-2 text-xs text-emerald-600">populaire</span>}
                                                </p>

                                                {produit.description && (
                                                    <p className="text-sm text-slate-500 truncate">{produit.description}</p>
                                                )}

                                                {produit.unit_price && (
                                                    <p className="text-xs text-slate-400">
                                                        {francs(produit.unit_price)} / {produit.unit_price_unit}
                                                    </p>
                                                )}

                                                {(produit.option_groups ?? []).length > 0 && (
                                                    <p className="text-xs text-slate-400">
                                                        {produit.option_groups.length} groupe{produit.option_groups.length > 1 ? "s" : ""} d'options
                                                    </p>
                                                )}
                                            </div>

                                            <div className="text-right shrink-0">
                                                <p className="font-semibold text-slate-900 dark:text-white">{francs(produit.price)}</p>
                                                {produit.compare_at_price && (
                                                    <p className="text-xs text-slate-400 line-through">{francs(produit.compare_at_price)}</p>
                                                )}
                                            </div>

                                            <div className="flex gap-2 shrink-0">
                                                <button
                                                    onClick={() => changerDisponibilite(produit)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                                                        produit.is_orderable
                                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                                    }`}
                                                >
                                                    {produit.is_orderable ? "disponible" : "épuisé"}
                                                </button>

                                                <button
                                                    onClick={() => setEdition({ ...produit, section_id: sectionId })}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                                >
                                                    modifier
                                                </button>
                                            </div>
                                        </div>
    );

    const listeProduits = (produits: Produit[], sectionId: number) => (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
            {produits.length === 0 ? <p className="p-4 text-sm text-slate-400">Aucun produit</p> : produits.map((produit) => ligneProduit(produit, sectionId))}
        </div>
    );

    /** Où ranger un produit : les rayons, et leurs sous-rayons en retrait. */
    const emplacements = rayons.flatMap((r) => [
        { id: r.id, nom: r.name },
        ...(r.children ?? []).map((sous) => ({ id: sous.id, nom: `${r.name} › ${sous.name}` })),
    ]);

    return (
        <div>
            <div className="flex flex-wrap gap-3 mb-8">
                <button
                    onClick={() => creerRayon()}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                >
                    Nouveau {motRayon}
                </button>

                {!commerce && (
                    <button
                        onClick={creerMenu}
                        className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    >
                        Nouveau menu
                    </button>
                )}
            </div>

            {menus.length > 0 && (
                <section className="mb-8">
                    <h3 className="text-sm font-bold uppercase text-slate-500 mb-3">Menus</h3>

                    <div className="flex flex-wrap gap-3">
                        {menus.map((menu) => (
                            <div key={menu.id} className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                <p className="font-medium text-slate-900 dark:text-white">
                                    {menu.name}
                                    {menu.is_default && <span className="ml-2 text-xs text-slate-500">par défaut</span>}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {menu.hours.length === 0
                                        ? "toute la journée"
                                        : `${menu.hours[0].starts_at.slice(0, 5)} – ${menu.hours[0].ends_at.slice(0, 5)}`}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {edition && (
                <section className="mb-8 p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                        {edition.id ? "Modifier le produit" : "Nouveau produit"}
                    </h3>

                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8">
                    <div>

                    {!commerce && (
                        <div className="mb-4">
                            <span className="text-xs font-semibold uppercase text-slate-500">Cuisines du plat</span>
                            <div className="mt-1">
                                {selecteurCuisines(edition.tags ?? [], (tags) => setEdition({ ...edition, tags }))}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                Facultatif : le plat hérite déjà des cuisines de sa rubrique. À préciser pour un plat à part (« Pizza fruits de mer »).
                            </p>
                        </div>
                    )}

                    <label className="block mb-4 max-w-md">
                        <span className="text-xs font-semibold uppercase text-slate-500">{commerce ? "Rayon / sous-rayon" : "Section"}</span>
                        <select
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            value={edition.section_id ?? ""}
                            onChange={(e) => setEdition({ ...edition, section_id: Number(e.target.value) })}
                        >
                            {emplacements.map((em) => (
                                <option key={em.id} value={em.id}>{em.nom}</option>
                            ))}
                        </select>
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { cle: "name", libelle: "Nom", exemple: "Poulet DG" },
                            { cle: "price", libelle: "Prix (F)", exemple: "3500" },
                            { cle: "compare_at_price", libelle: "Prix barré (F)", exemple: "laisser vide si pas de promo" },
                            { cle: "description", libelle: "Description", exemple: "Poulet, plantain, légumes" },
                            { cle: "size_value", libelle: "Contenance", exemple: "500" },
                            { cle: "size_unit", libelle: "Unité", exemple: "g, kg, ml, l" },
                            // « 2 pour 2 830 F » : l'offre en lot, affichée sous le prix.
                            { cle: "bundle_qty", libelle: "Offre en lot : quantité", exemple: "2 (laisser vide si pas de lot)" },
                            { cle: "bundle_price", libelle: "Prix du lot (F)", exemple: "2830" },
                        ].map((champ) => (
                            <label key={champ.cle} className="block">
                                <span className="text-xs font-semibold uppercase text-slate-500">{champ.libelle}</span>
                                <input
                                    value={String((edition as Record<string, unknown>)[champ.cle] ?? "")}
                                    onChange={(e) => setEdition({ ...edition, [champ.cle]: e.target.value })}
                                    placeholder={champ.exemple}
                                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                />
                            </label>
                        ))}
                    </div>

                    <div className="mt-5">
                        <ImageField
                            label="Photo"
                            hint="Un plat sans photo se vend beaucoup moins. Cadrez l'assiette de près, en lumière du jour."
                            adresse={edition.image ?? ""}
                            fichier={photo}
                            galerie={galerieMarchand(merchantId)}
                            disabled={televersement}
                            forme="aspect-square"
                            onChange={(image, fichier) => {
                                setEdition({ ...edition, image: image || null });
                                setPhoto(fichier);
                            }}
                        />
                    </div>

                    <p className="text-xs text-slate-500 mt-3">
                        La contenance sert au prix au kilo affiché aux clients. Elle ne concerne que les commerces.
                    </p>

                    <div className="mt-5">
                        <span className="text-xs font-semibold uppercase text-slate-500">Ingrédients</span>
                        <IngredientsInput
                            merchantId={merchantId}
                            valeur={edition.ingredients ?? []}
                            onChange={(ingredients) => setEdition({ ...edition, ingredients })}
                        />
                    </div>

                    <OptionGroupsEditor
                        groupes={(edition.option_groups ?? []) as unknown as GroupeEdite[]}
                        onChange={(groupes) => setEdition({ ...edition, option_groups: groupes as unknown as Produit["option_groups"] })}
                    />
                    </div>

                    <ProductPreview
                        name={edition.name ?? ""}
                        description={edition.description ?? null}
                        ingredients={edition.ingredients ?? []}
                        image={apercu(photo, edition.image) || null}
                        price={Number(edition.price) || 0}
                        compareAtPrice={edition.compare_at_price ? Number(edition.compare_at_price) : null}
                        sizeValue={edition.size_value ? Number(edition.size_value) : null}
                        sizeUnit={edition.size_unit ?? null}
                        groupes={(edition.option_groups ?? []) as unknown as GroupeEdite[]}
                    />
                    </div>

                    <div className="mt-5 flex gap-3">
                        <button
                            onClick={enregistrerProduit}
                            disabled={televersement}
                            className="px-5 py-2.5 rounded-lg text-sm font-medium bg-slate-900 text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"
                        >
                            {televersement ? "Envoi de la photo…" : "Enregistrer"}
                        </button>

                        <button
                            onClick={() => setEdition(null)}
                            className="px-5 py-2.5 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                        >
                            Annuler
                        </button>
                    </div>
                </section>
            )}

            {rayons.length === 0 ? (
                <p className="text-slate-500 text-sm">
                    Aucun {motRayon} pour l'instant. Commencez par en créer un, puis ajoutez-y vos produits.
                </p>
            ) : (
                <div className="space-y-8">
                    {creation && (
                        <div className="p-5 rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                                {creation.parent ? `Nouveau sous-${motRayon}` : `Nouveau ${motRayon}`}
                            </p>
                            <p className="text-xs text-slate-500 mb-3">
                                {commerce
                                    ? "Choisissez une catégorie d'Ongo — vos articles apparaîtront aussi dans ses pages — ou créez le vôtre."
                                    : "Choisissez une cuisine — vos plats apparaîtront aussi dans sa page — ou créez votre propre rubrique."}
                            </p>
                            <input
                                autoFocus
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                value={creation.nom}
                                placeholder={commerce ? "Boissons, Primeur, Alcool…" : "Entrées, Plats, Desserts…"}
                                onChange={(e) => setCreation({ ...creation, nom: e.target.value })}
                                onKeyDown={(e) => e.key === "Enter" && creerSonRayon()}
                            />

                            {suggestions.length > 0 && (
                                <div className="mt-3">
                                    <p className="text-xs font-semibold uppercase text-slate-500 mb-2">{commerce ? "Catégories Ongo" : "Cuisines Ongo"}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {suggestions.map((c) => (
                                            <button
                                                key={c.id}
                                                onClick={() => creerDepuisCategorie(c)}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200"
                                            >
                                                {c.image && <img src={c.image} alt="" className="w-5 h-5 rounded object-cover" />}
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-4">
                                <button onClick={() => setCreation(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300">
                                    Annuler
                                </button>
                                <button
                                    onClick={creerSonRayon}
                                    disabled={!creation.nom.trim()}
                                    className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 dark:bg-white dark:text-slate-900"
                                >
                                    Créer « {creation.nom.trim() || "…"} »
                                </button>
                            </div>
                        </div>
                    )}

                    {rayons.map((rayon) => (
                        <section key={rayon.id}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-semibold text-slate-900 dark:text-white">{rayon.name}</h3>
                                    {/* Associé à une catégorie d'Ongo, ce rayon apparaît aussi dans ses pages
                                        « Boissons », « Viande et volaille »… de toutes les boutiques. */}
                                    {commerce && (
                                        <div className="scale-90 origin-left">
                                            <ImageField
                                                label="Tuile"
                                                hint="Détourée, sur fond clair"
                                                adresse={rayon.image ?? ""}
                                                fichier={null}
                                                galerie={galerieMarchand(merchantId)}
                                                forme="aspect-square"
                                                onChange={(adresse, fichier) => changerImageRayon(rayon, adresse, fichier)}
                                            />
                                        </div>
                                    )}
                                    {!commerce &&
                                        selecteurCuisines(rayon.tags ?? [], (choisies) =>
                                            envoyer(
                                                "sections",
                                                { section_id: rayon.id, name: rayon.name, parent_id: rayon.parent_id, tags: choisies.map((c) => c.id) },
                                                "Cuisines enregistrées"
                                            )
                                        )}
                                    {categories.length > 0 && (
                                        <select
                                            title="Catégorie Ongo"
                                            className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300"
                                            value={rayon.category_id ?? ""}
                                            onChange={(e) =>
                                                envoyer(
                                                    "sections",
                                                    { section_id: rayon.id, name: rayon.name, parent_id: rayon.parent_id, category_id: e.target.value ? Number(e.target.value) : null },
                                                    "Catégorie enregistrée"
                                                )
                                            }
                                        >
                                            <option value="">Catégorie Ongo : aucune</option>
                                            {categories.map((c) => (
                                                <option key={c.id} value={c.id}>Catégorie Ongo : {c.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    {commerce && (
                                        <button
                                            onClick={() => creerRayon(rayon.id)}
                                            className="text-sm text-slate-600 dark:text-slate-300 underline"
                                        >
                                            sous-{motRayon}
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setEdition({ section_id: rayon.id })}
                                        className="text-sm text-slate-900 dark:text-white font-medium underline"
                                    >
                                        ajouter un produit
                                    </button>
                                </div>
                            </div>

                            {/* Les produits posés sur le rayon lui-même. Sans sous-rayon, c'est tout le rayon. */}
                            {((rayon.products ?? []).length > 0 || (rayon.children ?? []).length === 0) && listeProduits(rayon.products ?? [], rayon.id)}

                            {/* Les sous-rayons : chacun ses produits, sa catégorie Ongo, son ajout. */}
                            {(rayon.children ?? []).map((sous) => (
                                <div key={sous.id} className="mt-4 ml-4 pl-4 border-l-2 border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{sous.name}</h4>
                                            {categories.length > 0 && (
                                                <select
                                                    title="Catégorie Ongo"
                                                    className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300"
                                                    value={sous.category_id ?? ""}
                                                    onChange={(e) =>
                                                        envoyer(
                                                            "sections",
                                                            { section_id: sous.id, name: sous.name, parent_id: sous.parent_id, category_id: e.target.value ? Number(e.target.value) : null },
                                                            "Catégorie enregistrée"
                                                        )
                                                    }
                                                >
                                                    <option value="">Catégorie Ongo : aucune</option>
                                                    {categories.map((c) => (
                                                        <option key={c.id} value={c.id}>Catégorie Ongo : {c.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                        <button onClick={() => setEdition({ section_id: sous.id })} className="text-sm text-slate-900 dark:text-white font-medium underline">
                                            ajouter un produit
                                        </button>
                                    </div>
                                    {listeProduits(sous.products ?? [], sous.id)}
                                </div>
                            ))}
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}
