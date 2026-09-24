import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";

/**
 * Ce que cette boutique accepte à la caisse.
 *
 * Tout est coché à l'ouverture : on ne demande pas à un restaurateur de
 * choisir avant d'avoir vendu quoi que ce soit. Il décoche ensuite ce qui ne
 * lui convient pas — et un client ne voit jamais un moyen refusé ici.
 *
 * La liste vient d'Ongo : un moyen fermé par la plateforme ne s'affiche plus,
 * même s'il était accepté.
 */

interface Moyen {
    id: number;
    code: string;
    title: string;
    description: string | null;
}

interface Props {
    merchantId: string;
    storeId: number;
    canEdit: boolean;
}

export default function PaymentMethods({ merchantId, storeId, canEdit }: Props) {
    const [moyens, setMoyens] = useState<Moyen[]>([]);
    const [acceptes, setAcceptes] = useState<string[]>([]);
    const [envoi, setEnvoi] = useState(false);

    const api = new ApiService();
    const base = `v3/merchant/${merchantId}/stores/${storeId}/payment-methods`;

    const charger = async () => {
        try {
            const { data } = await api.getData(base);

            if (data.success) {
                setMoyens(data.data?.methods ?? []);
                setAcceptes(data.data?.accepted ?? []);
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Moyens illisibles", text: String(erreur) });
        }
    };

    useEffect(() => {
        charger();
    }, [storeId]);

    const basculer = (code: string) => {
        setAcceptes((avant) => (avant.includes(code) ? avant.filter((c) => c !== code) : [...avant, code]));
    };

    const enregistrer = async () => {
        setEnvoi(true);

        const { data } = await api.postData(base, { methods: acceptes });

        setEnvoi(false);

        if (!data.success) {
            Swal.fire({ icon: "error", title: data.message });
            return;
        }

        Swal.fire({ icon: "success", title: data.message, timer: 1200, showConfirmButton: false });
        charger();
    };

    return (
        <div className="p-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Moyens de paiement acceptés</h2>
            <p className="text-sm text-slate-500 mt-1 mb-5">
                Vos clients ne verront à la caisse que ce qui est coché ici. Gardez-en au moins un.
            </p>

            <div className="space-y-3">
                {moyens.map((m) => {
                    const retenu = acceptes.includes(m.code);

                    return (
                        <label
                            key={m.id}
                            className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer ${
                                retenu
                                    ? "border-slate-900 dark:border-white"
                                    : "border-slate-200 dark:border-slate-800"
                            } ${canEdit ? "" : "opacity-60 cursor-default"}`}
                        >
                            <input
                                type="checkbox"
                                className="mt-1"
                                checked={retenu}
                                disabled={!canEdit}
                                onChange={() => basculer(m.code)}
                            />
                            <span>
                                <span className="block font-medium text-slate-900 dark:text-white">{m.title}</span>
                                {m.description && <span className="block text-sm text-slate-500">{m.description}</span>}
                            </span>
                        </label>
                    );
                })}
            </div>

            {canEdit && (
                <div className="flex justify-end mt-6">
                    <button
                        onClick={enregistrer}
                        disabled={envoi || acceptes.length === 0}
                        className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 dark:bg-white dark:text-slate-900"
                    >
                        {envoi ? "Enregistrement…" : "Enregistrer"}
                    </button>
                </div>
            )}
        </div>
    );
}
