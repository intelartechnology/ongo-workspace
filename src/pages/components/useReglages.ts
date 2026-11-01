import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";

/**
 * Les réglages d'un groupe de la plateforme, pour une page qui les pose à
 * côté de ses propres listes. Même mécanisme que l'écran Réglages :
 * `v3/admin/settings`, les bornes du serveur, son refus répété tel quel.
 */

export interface Reglage {
    cle: string;
    valeur: string;
    type: string;
    groupe: string;
    libelle: string;
    description: string | null;
    minimum: string | null;
    maximum: string | null;
}

/**
 * Les réglages d'un groupe, lus une fois pour toute la page.
 *
 * [apres] est appelé après chaque enregistrement réussi : la page relit alors
 * ce qui en dépend (l'état affiché en tête, par exemple).
 */
export function useReglages(groupe: string, apres?: () => void) {
    const [lignes, setLignes] = useState<Reglage[]>([]);
    const [brouillon, setBrouillon] = useState<Record<string, string>>({});
    const [enregistrement, setEnregistrement] = useState<string | null>(null);

    const api = new ApiService();

    const charger = async () => {
        try {
            const { data } = await api.getData("v3/admin/settings");
            if (!data.success) return;

            const recues: Reglage[] = data.data?.[groupe] ?? [];
            setLignes(recues);
            setBrouillon(Object.fromEntries(recues.map((l) => [l.cle, l.valeur])));
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Réglages illisibles", text: String(erreur) });
        }
    };

    useEffect(() => {
        charger();
    }, [groupe]);

    const enregistrer = async (ligne: Reglage) => {
        const valeur = brouillon[ligne.cle];
        if (valeur === undefined || valeur === ligne.valeur) return;

        setEnregistrement(ligne.cle);

        try {
            const { data } = await api.postData("v3/admin/settings", { cle: ligne.cle, valeur });

            if (data.success) {
                await charger();
                apres?.();
                Swal.fire({ icon: "success", title: "Enregistré", text: ligne.libelle, timer: 1400, showConfirmButton: false });
            } else {
                // Le serveur dit pourquoi il refuse ; on le répète tel quel.
                Swal.fire({ icon: "error", title: "Refusé", text: data.message });
                setBrouillon((precedent) => ({ ...precedent, [ligne.cle]: ligne.valeur }));
            }
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Enregistrement impossible", text: String(erreur) });
        }

        setEnregistrement(null);
    };

    return { lignes, brouillon, setBrouillon, enregistrer, enregistrement };
}
