import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";

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
    image: string | null;
    price: number;
    compare_at_price: number | null;
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

interface Rayon {
    id: number;
    name: string;
    parent_id: number | null;
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

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export default function Catalog({ merchantId, storeId, storeType }: CatalogProps) {
    const [menus, setMenus] = useState<Menu[]>([]);
    const [rayons, setRayons] = useState<Rayon[]>([]);
    const [chargement, setChargement] = useState<boolean>(true);
    const [edition, setEdition] = useState<Partial<Produit> & { section_id?: number } | null>(null);
    const [televersement, setTeleversement] = useState<boolean>(false);

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

            Swal.fire({ icon: "error", title: "Refusé", text: data.message });
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Enregistrement impossible", text: String(erreur) });
        }

        return false;
    };

    const creerRayon = async (parent?: number) => {
        const choix = await Swal.fire({
            title: parent ? `Nouveau sous-${motRayon}` : `Nouveau ${motRayon}`,
            input: "text",
            inputPlaceholder: commerce ? "Boissons, Primeur, Alcool…" : "Entrées, Plats, Boissons…",
            showCancelButton: true,
            confirmButtonText: "Créer",
            cancelButtonText: "Annuler",
        });

        if (!choix.isConfirmed || !choix.value) return;

        await envoyer("sections", { name: choix.value, parent_id: parent }, `${motRayon} créé`);
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
    const televerser = async (fichier: File) => {
        setTeleversement(true);

        try {
            const { data } = await api.uploadImage(fichier);

            if (data.success) {
                setEdition((precedent) => (precedent === null ? precedent : { ...precedent, image: data.data }));
            } else {
                Swal.fire({ icon: "error", title: "Image refusée", text: data.message });
            }
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Envoi impossible", text: String(erreur) });
        }

        setTeleversement(false);
    };

    const enregistrerProduit = async () => {
        if (!edition?.name || !edition?.price) {
            Swal.fire({ icon: "info", title: "Il manque l'essentiel", text: "Le nom et le prix sont requis." });

            return;
        }

        const ok = await envoyer("products", {
            product_id: edition.id,
            section_id: edition.section_id,
            name: edition.name,
            description: edition.description,
            image: edition.image ?? null,
            price: Number(edition.price),
            compare_at_price: edition.compare_at_price ? Number(edition.compare_at_price) : null,
            size_value: edition.size_value ? Number(edition.size_value) : null,
            size_unit: edition.size_unit || null,
            is_popular: edition.is_popular ?? false,
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { cle: "name", libelle: "Nom", exemple: "Poulet DG" },
                            { cle: "price", libelle: "Prix (F)", exemple: "3500" },
                            { cle: "compare_at_price", libelle: "Prix barré (F)", exemple: "laisser vide si pas de promo" },
                            { cle: "description", libelle: "Description", exemple: "Poulet, plantain, légumes" },
                            { cle: "size_value", libelle: "Contenance", exemple: "500" },
                            { cle: "size_unit", libelle: "Unité", exemple: "g, kg, ml, l" },
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

                    <div className="mt-5 flex items-center gap-4">
                        <div className="h-24 w-24 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            {edition.image ? (
                                <img src={edition.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-xs text-slate-400">Sans photo</span>
                            )}
                        </div>

                        <div>
                            <label className="inline-block px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer">
                                {televersement ? "Envoi…" : edition.image ? "Changer la photo" : "Ajouter une photo"}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(evenement) => {
                                        const fichier = evenement.target.files?.[0];

                                        if (fichier) televerser(fichier);
                                    }}
                                />
                            </label>

                            <p className="text-xs text-slate-500 mt-2 max-w-sm">
                                Un plat sans photo se vend beaucoup moins. Cadrez l'assiette de près, en lumière du jour.
                            </p>
                        </div>
                    </div>

                    <p className="text-xs text-slate-500 mt-3">
                        La contenance sert au prix au kilo affiché aux clients. Elle ne concerne que les commerces.
                    </p>

                    <div className="mt-5 flex gap-3">
                        <button
                            onClick={enregistrerProduit}
                            className="px-5 py-2.5 rounded-lg text-sm font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                        >
                            Enregistrer
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
                    {rayons.map((rayon) => (
                        <section key={rayon.id}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-slate-900 dark:text-white">{rayon.name}</h3>

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

                            {(rayon.children ?? []).length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {rayon.children.map((sous) => (
                                        <span key={sous.id} className="px-3 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                            {sous.name}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
                                {(rayon.products ?? []).length === 0 ? (
                                    <p className="p-4 text-sm text-slate-400">Aucun produit</p>
                                ) : (
                                    rayon.products.map((produit) => (
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
                                                    onClick={() => setEdition({ ...produit, section_id: rayon.id })}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                                >
                                                    modifier
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}
