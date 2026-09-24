import ApiService from "./ApiService";

/**
 * Les images des formulaires : choisies dans la galerie, ou sur
 * l'ordinateur — et alors envoyées à l'enregistrement, dans la galerie.
 *
 * Choisir un fichier ne l'envoie pas : on montre un aperçu local, et l'envoi
 * se fait quand on clique sur « Enregistrer », juste avant la sauvegarde.
 * Un formulaire annulé n'a donc rien envoyé pour rien.
 */

/** La galerie d'Ongo : toutes les images. */
export const GALERIE_ONGO = "v3/admin/eat/media";

/** La galerie d'un marchand : les siennes. */
export const galerieMarchand = (merchantId: string) => `v3/merchant/${merchantId}/media`;

const apercus = new WeakMap<File, string>();

/** L'image à afficher : le fichier choisi s'il y en a un, sinon l'adresse déjà enregistrée. */
export const apercu = (fichier: File | null | undefined, adresse?: string | null): string => {
    if (!fichier) return adresse ?? "";

    let lien = apercus.get(fichier);

    if (!lien) {
        lien = URL.createObjectURL(fichier);
        apercus.set(fichier, lien);
    }

    return lien;
};

/**
 * Envoyer le fichier dans la galerie s'il y en a un et rendre son adresse ;
 * sans fichier, rendre l'adresse déjà choisie. Lève une erreur lisible si
 * l'envoi échoue.
 */
export const envoyerSiBesoin = async (
    fichier: File | null | undefined,
    adresse: string | null = null,
    galerie: string = GALERIE_ONGO,
    // Ongo retouche la fiche d'un marchand : l'image va dans la galerie de ce marchand.
    merchantId: number | null = null,
): Promise<string | null> => {
    if (!fichier) return adresse;

    const formulaire = new FormData();
    formulaire.append("file", fichier);
    if (merchantId) formulaire.append("merchant_id", String(merchantId));

    const { data } = await new ApiService().postData(`${galerie}/upload`, formulaire);

    if (!data?.success) throw new Error(data?.message || "L'image n'a pas pu être envoyée");

    return data.data.url as string;
};
