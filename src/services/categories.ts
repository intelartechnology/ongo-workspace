import ApiService from "./ApiService";

export interface CategorieVehicule {
    id: number;
    libelle: string;
    /** Le niveau de gamme : 1 ECO, 2 PREMIUM, 3 BUSINESS. Nul hors gamme. */
    niveau?: number | null;
    /**
     * Catégorie de livraison — MOTO, TRICYCLE, FOURGON.
     *
     * Ces véhicules ne transportent pas de passagers : un partenaire qui en
     * choisit une n'aura aucune course de taxi, et l'apprendrait autrement
     * après avoir attendu en vain. L'API rend `0`/`1`, pas un booléen.
     */
    is_delivery?: number | boolean | null;
}

/** Vrai pour MOTO, TRICYCLE, FOURGON. */
export const estLivraison = (c?: CategorieVehicule | null): boolean =>
    Boolean(c && (c.is_delivery === 1 || c.is_delivery === true));

let cache: CategorieVehicule[] | null = null;

/**
 * Les catégories de véhicule, telles que l'API les connaît.
 *
 * Elles étaient écrites en dur dans les formulaires — et **fausses** : le
 * code posait `2 = BUSINESS` alors que 2 est PREMIUM, si bien qu'un véhicule
 * annoncé business était enregistré premium. MOTO, TRICYCLE et FOURGON
 * étaient par ailleurs absents de la liste.
 *
 * Mises en cache pour la durée de la page : elles changent rarement, et
 * chaque formulaire les demanderait sinon à l'ouverture.
 */
export async function chargerCategories(): Promise<CategorieVehicule[]> {
    if (cache) return cache;

    try {
        const { data } = await new ApiService().getData("categorie-vehicule/categories");
        cache = data?.success ? (data.data ?? []) : [];
    } catch {
        // Une liste vide vaut mieux qu'un écran bloqué : le champ reste
        // visible, simplement sans option.
        cache = [];
    }

    return cache!;
}
