import Swal from "sweetalert2";
import ApiService from "./ApiService";

/**
 * Écrire à un utilisateur depuis le workspace.
 *
 * Une seule fenêtre pour tous les écrans — courses, locations, covoiturage,
 * commandes, utilisateurs : titre, message, envoi. La notification part sur
 * le téléphone et reste dans la liste de l'utilisateur, rattachée à ce dont
 * elle parle quand on le précise.
 */

export interface Destinataire {
    id: number | null | undefined;
    nom?: string | null;
}

interface Options {
    destinataires: Destinataire[];
    /** Pré-rempli, modifiable : « Votre course #1234 ». */
    titre?: string;
    /** Ce dont parle le message : `Course`, `Location`, `CarSharing`, `Order`… */
    sujet?: { type: string; id: number | null | undefined };
}

const echapper = (texte: string) =>
    texte.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export async function notifier({ destinataires, titre = "", sujet }: Options): Promise<void> {
    const valides = destinataires.filter((d): d is { id: number; nom?: string | null } => typeof d.id === "number" && d.id > 0);

    if (valides.length === 0) {
        await Swal.fire({ icon: "info", title: "Aucun destinataire", text: "Cette ligne n'a pas d'utilisateur à prévenir." });

        return;
    }

    const noms = valides.map((d) => d.nom?.trim() || `#${d.id}`).join(", ");

    const { value, isConfirmed } = await Swal.fire({
        title: "Envoyer une notification",
        html: `
            <p style="font-size:14px;color:#64748b;margin-bottom:12px">À : <b>${echapper(noms)}</b></p>
            <input id="notif-titre" class="swal2-input" style="width:100%;margin:0 0 10px" maxlength="80"
                   placeholder="Titre" value="${echapper(titre)}">
            <textarea id="notif-message" class="swal2-textarea" style="width:100%;margin:0" maxlength="400" rows="4"
                      placeholder="Votre message"></textarea>
            <p style="font-size:12px;color:#94a3b8;margin-top:8px">Visible sur son téléphone et dans ses notifications Ongo.</p>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: "Envoyer",
        cancelButtonText: "Annuler",
        preConfirm: () => {
            const t = (document.getElementById("notif-titre") as HTMLInputElement).value.trim();
            const m = (document.getElementById("notif-message") as HTMLTextAreaElement).value.trim();

            if (!t || !m) {
                Swal.showValidationMessage("Le titre et le message sont requis");

                return false;
            }

            return { title: t, message: m };
        },
    });

    if (!isConfirmed || !value) return;

    try {
        const { data } = await new ApiService().postData("v3/admin/notifications/send", {
            user_ids: valides.map((d) => d.id),
            title: value.title,
            message: value.message,
            subject_type: sujet?.id ? sujet.type : null,
            subject_id: sujet?.id ?? null,
        });

        if (!data.success) {
            const details = data.data && typeof data.data === "object" ? Object.values(data.data).flat().join("\n") : "";
            await Swal.fire({ icon: "error", title: data.message, text: details });

            return;
        }

        // Sans appareil enregistré, le push ne part pas : on le dit, pour que
        // le support sache qu'il faut peut-être appeler.
        const horsLigne = (data.data?.recipients ?? 0) - (data.data?.pushed ?? 0);

        await Swal.fire({
            icon: "success",
            title: data.message,
            text: horsLigne > 0 ? `${horsLigne} destinataire(s) sans téléphone enregistré : le message l'attendra dans l'application.` : undefined,
            timer: horsLigne > 0 ? undefined : 1600,
            showConfirmButton: horsLigne > 0,
        });
    } catch (erreur) {
        await Swal.fire({ icon: "warning", title: "Envoi impossible", text: String(erreur) });
    }
}
