import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";
import AudienceBuilder from "./components/AudienceBuilder";
import type { Audience, Critere, Sources } from "./components/AudienceBuilder";

/**
 * À qui les mises en avant s'adressent.
 *
 * Une audience est nommée et réutilisable : « Amateurs de grillades de Douala »
 * sert à dix opérations, et la redéfinir dix fois c'est la définir dix fois
 * différemment. Elle se compose de critères adossés aux commandes — les plats
 * commandés, les rayons, les cuisines, la ville, la dépense, le panier en cours.
 *
 * Les audiences d'Ongo — sans marchand — sont offertes à tous ; celles d'un
 * marchand ne sont visibles que de lui, sans quoi il pourrait déduire la
 * clientèle d'un concurrent en comparant les portées.
 */

interface Props {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const LIBELLES: Record<string, string> = {
    any: "est l'un de",
    none: "n'est aucun de",
    gte: "au moins",
    lte: "au plus",
};

export default function EatAudiences({ onLogout, theme, toggleTheme }: Props) {
    const [audiences, setAudiences] = useState<Audience[]>([]);
    const [criteres, setCriteres] = useState<Record<string, Critere>>({});
    const [operateurs, setOperateurs] = useState<Record<string, string>>(LIBELLES);
    const [sources, setSources] = useState<Sources | null>(null);
    const [chargement, setChargement] = useState(true);
    const [ouverte, setOuverte] = useState<Audience | null | "nouvelle">(null);

    const api = new ApiService();

    const charger = async () => {
        setChargement(true);

        try {
            const { data } = await api.getData("v3/admin/eat/audiences");

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
    }, []);

    const basculer = async (audience: Audience) => {
        const { data } = await api.postData("v3/admin/eat/audiences/toggle", { id: audience.id });

        if (!data.success) return Swal.fire({ icon: "error", title: data.message });

        charger();
    };

    const supprimer = async (audience: Audience) => {
        const accord = await Swal.fire({
            icon: "warning",
            title: `Supprimer « ${audience.name} » ?`,
            text: "Une audience en usage ne se supprime pas : désactivez-la plutôt.",
            showCancelButton: true,
            confirmButtonText: "Supprimer",
            cancelButtonText: "Annuler",
        });

        if (!accord.isConfirmed) return;

        const { data } = await api.postData("v3/admin/eat/audiences/delete", { id: audience.id });

        if (!data.success) return Swal.fire({ icon: "error", title: "Refusé", text: data.message });

        charger();
    };

    const estimer = async (audience: Audience) => {
        const { data } = await api.postData("v3/admin/eat/audiences/reach", { id: audience.id });

        if (!data.success) return Swal.fire({ icon: "error", title: data.message });

        charger();
    };

    /** Une règle, dite en français : c'est ce qu'on relit six mois après. */
    const lire = (audience: Audience) =>
        audience.rules
            .map((regle) => {
                const critere = criteres[regle.type];
                const quoi = critere?.label ?? regle.type;
                const comment = operateurs[regle.op] ?? regle.op;

                if (regle.values) {
                    return `${quoi} ${comment} ${regle.values.length} valeur${regle.values.length > 1 ? "s" : ""}`;
                }

                return `${quoi} ${comment} ${regle.value}`;
            })
            .join(audience.match_mode === "all" ? " · et " : " · ou ");

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-8 py-6 max-w-7xl mx-auto flex items-start justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Audiences</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            À qui les bannières, les tuiles et les sponsorings s'adressent. Lues sur les commandes :
                            les plats commandés, les cuisines, la ville, la dépense, le panier en cours.
                        </p>
                    </div>

                    {ouverte === null && (
                        <button
                            onClick={() => setOuverte("nouvelle")}
                            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium dark:bg-white dark:text-slate-900 shrink-0"
                        >
                            Nouvelle audience
                        </button>
                    )}
                </div>
            </header>

            <main className="px-8 py-8 max-w-7xl mx-auto space-y-6">
                {ouverte !== null && sources && (
                    <AudienceBuilder
                        criteres={criteres}
                        operateurs={operateurs}
                        sources={sources}
                        audience={ouverte === "nouvelle" ? null : ouverte}
                        onClose={() => setOuverte(null)}
                        onSaved={() => {
                            setOuverte(null);
                            charger();
                        }}
                    />
                )}

                {chargement ? (
                    <Loading />
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
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{audience.name}</h3>

                                            {!audience.is_active && (
                                                <span className="px-2 py-0.5 rounded-full text-xs bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                    désactivée
                                                </span>
                                            )}

                                            {audience.merchant_name && (
                                                <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                                    {audience.merchant_name}
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
                                            {audience.used_by > 0 ? ` · utilisée par ${audience.used_by} opération(s)` : " · pas encore utilisée"}
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-2 shrink-0">
                                        <button
                                            onClick={() => setOuverte(audience)}
                                            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                                        >
                                            Modifier
                                        </button>

                                        <button
                                            onClick={() => estimer(audience)}
                                            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                                        >
                                            Estimer
                                        </button>

                                        <button
                                            onClick={() => basculer(audience)}
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
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </MainLayout>
    );
}
