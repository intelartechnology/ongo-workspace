import Swal from "sweetalert2";
import { toast } from "react-toastify";
import ApiService from "./ApiService";

/** Les états d'une course que le chauffeur peut avoir oublié de clore. */
export const STATUTS_EN_COURS = ["EN COURS", "TRANSPORTEE"];

export const peutEtreCloturee = (statut?: string | null) => STATUTS_EN_COURS.includes(statut ?? "");

/**
 * Clore une course que le chauffeur n'a pas close, sans attendre la clôture
 * automatique.
 *
 * Terminer règle la course comme d'habitude ; annuler ne règle rien. Dans les
 * deux cas le serveur libère le véhicule et prévient le client et le
 * chauffeur. Rend le nouveau statut, ou `null` si rien n'a été fait.
 */
export async function cloturerCourse(course: { id: number }): Promise<"TERMINEE" | "ANNULEE" | null> {
    const choix = await Swal.fire({
        title: `Clôturer la course #${course.id} ?`,
        html: "<b>Terminer et régler</b> : la fin de course habituelle, part du chauffeur et commission comprises.<br><br><b>Annuler sans régler</b> : aucun mouvement d'argent ; si le client avait payé en ligne, le support est prévenu pour le rembourser.<br><br>Dans les deux cas, le véhicule du chauffeur redevient libre et les deux sont notifiés.",
        icon: "question",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "Terminer et régler",
        denyButtonText: "Annuler sans régler",
        cancelButtonText: "Fermer",
        confirmButtonColor: "#10377b",
    });
    if (!choix.isConfirmed && !choix.isDenied) return null;

    const decision = choix.isConfirmed ? "TERMINEE" : "ANNULEE";
    try {
        const { data } = await new ApiService().postData(`v3/admin/courses/${course.id}/cloturer`, { decision });
        if (data.success) {
            toast.success(data.message);
            return decision;
        }
        toast.error(data.message || "Clôture refusée");
    } catch (e: any) {
        toast.error(e?.response?.data?.message || "Connexion au serveur impossible");
    }
    return null;
}
