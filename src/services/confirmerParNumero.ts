import Swal from "sweetalert2";

const echapper = (texte: string) =>
    texte.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/**
 * Le numéro de la transaction, à ressaisir avant de l'annuler.
 *
 * Une annulation fait bouger un solde pour de bon : elle ne doit partir ni d'un
 * clic égaré, ni d'une mauvaise ligne dans une liste. Le serveur la refuse sans
 * ce numéro ; on le vérifie ici aussi pour le dire avant d'envoyer.
 *
 * Rend le numéro saisi, ou `null` si l'administrateur a renoncé.
 */
export async function confirmerParNumero(transactionId: string): Promise<string | null> {
    const { value, isConfirmed } = await Swal.fire({
        title: "Confirmer l'annulation",
        html: `Pour confirmer, saisissez le numéro de la transaction :<br><br><b>${echapper(transactionId)}</b>`,
        input: "text",
        inputPlaceholder: "Numéro de la transaction",
        inputAttributes: { autocomplete: "off", autocapitalize: "off", spellcheck: "false" },
        inputValidator: (v) => (v?.trim() === transactionId ? undefined : "Le numéro ne correspond pas à cette transaction"),
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Annuler la transaction",
        cancelButtonText: "Fermer",
        confirmButtonColor: "#d33",
    });

    return isConfirmed && value ? String(value).trim() : null;
}
