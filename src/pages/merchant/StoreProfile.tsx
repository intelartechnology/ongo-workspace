import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";
import StoreProfileForm from "../components/StoreProfileForm";
import type { Cuisine, Fiche } from "../components/StoreProfileForm";

/**
 * La fiche de la boutique, réglée par le marchand : logo, bannière,
 * description, adresse, temps de préparation, cuisines.
 *
 * Le nom et le type restent à Ongo : ils figurent sur les reversements et
 * décident de la présentation en menu ou en rayons.
 */

interface StoreProfileProps {
    merchantId: string;
    storeId: number;
    canEdit: boolean;
}

export default function StoreProfile({ merchantId, storeId, canEdit }: StoreProfileProps) {
    const [fiche, setFiche] = useState<Fiche | null>(null);
    const [cuisines, setCuisines] = useState<Cuisine[]>([]);

    const base = `v3/merchant/${merchantId}/stores/${storeId}/profile`;

    useEffect(() => {
        setFiche(null);

        new ApiService()
            .getData(base)
            .then(({ data }) => {
                if (!data.success) return Swal.fire({ icon: "error", title: data.message });

                setFiche(data.data.store);
                setCuisines(data.data.tags ?? []);
            })
            .catch((erreur) => Swal.fire({ icon: "warning", title: "Fiche illisible", text: String(erreur) }));
    }, [base]);

    const enregistrer = async (champs: Record<string, unknown>) => {
        const { data } = await new ApiService().postData(base, champs);

        if (!data.success) {
            Swal.fire({ icon: "error", title: data.message });
            return false;
        }

        setFiche(data.data);
        Swal.fire({ icon: "success", title: data.message, timer: 1200, showConfirmButton: false });

        return true;
    };

    if (!fiche) return <p className="text-slate-500">Chargement…</p>;

    return (
        <section>
            {!canEdit && <p className="text-sm text-amber-700 mb-4">Seuls le propriétaire et le gérant modifient la fiche.</p>}
            <StoreProfileForm key={fiche.id} fiche={fiche} cuisines={cuisines} onSave={enregistrer} readOnly={!canEdit} />
        </section>
    );
}
