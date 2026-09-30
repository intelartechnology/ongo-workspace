import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";
import AudienceBuilder from "../components/AudienceBuilder";
import type { Audience, Critere, Sources } from "../components/AudienceBuilder";

/**
 * À qui le marchand s'adresse quand il se met en avant.
 *
 * Le même composeur que chez Ongo, avec les mêmes critères — mais son horizon :
 * ses boutiques, ses rayons, ses plats. Les cuisines et les villes restent
 * communes, ce sont des faits publics que n'importe quel client voit dans
 * l'application. Le catalogue d'un concurrent, non : le serveur le refuse, la
 * liste n'est pas seule à le garder.
 *
 * Les audiences d'Ongo apparaissent ici en lecture : il peut s'en servir pour
 * viser, pas les modifier — elles servent à d'autres.
 *
 * La portée est un **nombre de personnes**, jamais une liste de noms. Ongo ne
 * vend pas ses clients.
 */

interface Props {
    merchantId: string;
    canEdit: boolean;
}

const LIBELLES: Record<string, string> = {
    any: "est l'un de",
    none: "n'est aucun de",
    gte: "au moins",
    lte: "au plus",
};

export default function Audiences({ merchantId, canEdit }: Props) {
    const [audiences, setAudiences] = useState<Audience[]>([]);
    const [criteres, setCriteres] = useState<Record<string, Critere>>({});
    const [operateurs, setOperateurs] = useState<Record<string, string>>(LIBELLES);
    const [sources, setSources] = useState<Sources | null>(null);
    const [chargement, setChargement] = useState(true);
    const [ouverte, setOuverte] = useState<Audience | null | "nouvelle">(null);

    const api = new ApiService();
    const base = `v3/merchant/${merchantId}/audiences`;

    const charger = async () => {
        setChargement(true);

        try {
            const { data } = await api.getData(base);

            if (data.success) {
                setAudiences(data.data.audiences ?? []);
                setCriteres(data.data.criteria ?? {});
                setOperateurs(data.data.operators ?? LIBELLES);
                setSources(data.data.sources ?? null);
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Audiences illisibles", text: String(erreur) });
        }

        setChargement(false);
    };

    useEffect(() => {
        charger();
    }, [merchantId]);

    const agir = async (chemin: string, corps: Record<string, unknown>) => {
        const { data } = await api.postData(`${base}/${chemin}`, corps);

        if (!data.success) return Swal.fire({ icon: "error", title: "Refusé", text: data.message });

        charger();
    };

    const supprimer = async (audience: Audience) => {
        const accord = await Swal.fire({
            icon: "warning",
            title: `Supprimer « ${audience.name} » ?`,
            text: "Une audience utilisée par une opération ne se supprime pas : désactivez-la plutôt.",
            showCancelButton: true,
            confirmButtonText: "Supprimer",
            cancelButtonText: "Annuler",
        });

        if (accord.isConfirmed) agir("delete", { id: audience.id });
    };

    /** Une règle, dite en français : c'est ce qu'on relit six mois après. */
    const lire = (audience: Audience) =>
        audience.rules
            .map((regle) => {
                const quoi = criteres[regle.type]?.label ?? regle.type;
                const comment = operateurs[regle.op] ?? regle.op;

                return regle.values
                    ? `${quoi} ${comment} ${regle.values.length} valeur${regle.values.length > 1 ? "s" : ""}`
                    : `${quoi} ${comment} ${regle.value}`;
            })
            .join(audience.match_mode === "all" ? " · et " : " · ou ");

    return (
        <div>
            <div className="flex items-start justify-between gap-6 mb-6">
                <p className="text-sm text-slate-500">
                    À qui vos bannières et vos mises en avant s'adressent. Lues sur les commandes : les plats
                    commandés, les cuisines, la ville, le panier laissé en route. La portée est un nombre de
                    personnes — jamais une liste de noms.
                </p>

                {canEdit && ouverte === null && (
                    <button
                        onClick={() => setOuverte("nouvelle")}
                        className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium dark:bg-white dark:text-slate-900 shrink-0"
                    >
                        Nouvelle audience
                    </button>
                )}
            </div>

            {ouverte !== null && sources && (
                <div className="mb-6">
                    <AudienceBuilder
                        criteres={criteres}
                        operateurs={operateurs}
                        sources={sources}
                        base={base}
                        audience={ouverte === "nouvelle" ? null : ouverte}
                        onClose={() => setOuverte(null)}
                        onSaved={() => {
                            setOuverte(null);
                            charger();
                        }}
                    />
                </div>
            )}

            {chargement ? (
                <p className="text-sm text-slate-500">Chargement…</p>
            ) : audiences.length === 0 ? (
                <p className="text-sm text-slate-500">
                    Aucune audience. Sans elles, une mise en avant s'adresse à l'un des quatre profils —
                    nouveau, fidèle, à reconquérir, ou tout le monde.
                </p>
            ) : (
                <div className="space-y-3">
                    {audiences.map((audience) => (
                        <div
                            key={audience.id}
                            className="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">{audience.name}</h3>

                                        {audience.editable === false && (
                                            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                proposée par Ongo
                                            </span>
                                        )}

                                        {!audience.is_active && (
                                            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                                désactivée
                                            </span>
                                        )}
                                    </div>

                                    {audience.description && (
                                        <p className="text-sm text-slate-500 mt-0.5">{audience.description}</p>
                                    )}

                                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{lire(audience)}</p>

                                    <p className="text-xs text-slate-400 mt-2">
                                        {audience.reach === null
                                            ? "Portée non estimée"
                                            : `Portée estimée : ${audience.reach.toLocaleString("fr-FR")} personnes`}
                                        {audience.used_by > 0 ? ` · utilisée par ${audience.used_by} opération(s)` : ""}
                                    </p>
                                </div>

                                {canEdit && (
                                    <div className="flex flex-col gap-2 shrink-0">
                                        {audience.editable !== false && (
                                            <button
                                                onClick={() => setOuverte(audience)}
                                                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                                            >
                                                Modifier
                                            </button>
                                        )}

                                        <button
                                            onClick={() => agir("reach", { id: audience.id })}
                                            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                                        >
                                            Estimer
                                        </button>

                                        {audience.editable !== false && (
                                            <>
                                                <button
                                                    onClick={() => agir("toggle", { id: audience.id })}
                                                    className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                                                >
                                                    {audience.is_active ? "Désactiver" : "Activer"}
                                                </button>

                                                {audience.used_by === 0 && (
                                                    <button
                                                        onClick={() => supprimer(audience)}
                                                        className="px-3 py-1.5 rounded-lg text-sm font-medium border border-rose-300 text-rose-600 dark:border-rose-900 dark:text-rose-400"
                                                    >
                                                        Supprimer
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
