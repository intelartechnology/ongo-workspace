import { useMemo, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";

/**
 * Composer une audience : à qui l'on parle, et combien de gens cela fait.
 *
 * Le ciblage d'Ongo Eat tenait dans quatre segments — nouveau, fidèle, dormant,
 * tout le monde. « Les nouveaux **et** les dormants » ne s'exprimait pas, et un
 * marchand qui voulait toucher ceux qui aiment le poulet achetait à tout le
 * monde.
 *
 * Ici chaque critère s'adosse à une donnée que le système a vraiment : les plats
 * commandés, les rayons, les cuisines, l'enseigne, la ville, la dépense, la
 * fréquence, le mode de paiement, le panier en cours. Le catalogue vient du
 * serveur — il n'est pas recopié ici : un critère que le formulaire proposerait
 * et que personne n'évalue serait un ciblage vendu et non livré.
 *
 * La portée s'estime **avant** d'acheter, et par le même évaluateur que
 * l'accueil : deux calculs finiraient par ne plus dire la même chose.
 */

export interface Critere {
    kind: "set" | "number";
    ops: string[];
    trait: string;
    label: string;
    hint: string;
    values?: string[];
}

export interface Regle {
    type: string;
    op: string;
    values?: string[];
    value?: number;
}

export interface Sources {
    profile: Record<string, string>;
    payment: Record<string, string>;
    cuisine: { slug: string; name: string }[];
    store: { id: number; name: string }[];
    merchant: { id: number; name: string }[];
    city: string[];
    section: { id: number; store_id: number; name: string }[];
    product: { id: number; store_id: number; name: string }[];
}

export interface Audience {
    id: number;
    merchant_id: number | null;
    merchant_name: string | null;
    name: string;
    description: string | null;
    match_mode: "all" | "any";
    is_active: boolean;
    reach: number | null;
    reach_at: string | null;
    rules: Regle[];
    used_by: number;

    /** Côté marchand : celles d'Ongo se lisent et se choisissent, mais ne se modifient pas. */
    editable?: boolean;
}

interface Props {
    criteres: Record<string, Critere>;
    operateurs: Record<string, string>;
    sources: Sources;
    audience: Audience | null;
    /** Le marchand, quand l'audience lui appartient. Nul : elle est à Ongo. */
    merchantId?: number | null;
    /**
     * Où poster : l'espace marchand et l'administration n'ont pas la même route.
     *
     * Le marchand compose sur `merchant/{id}/audiences`, qui borne ses critères à
     * ses boutiques et refuse le catalogue d'un concurrent — la liste affichée ne
     * serait sinon qu'une politesse.
     */
    base?: string;
    onClose: () => void;
    onSaved: () => void;
}

const champ =
    "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white";

export default function AudienceBuilder({
    criteres,
    operateurs,
    sources,
    audience,
    merchantId = null,
    base = "v3/admin/eat/audiences",
    onClose,
    onSaved,
}: Props) {
    const [nom, setNom] = useState(audience?.name ?? "");
    const [description, setDescription] = useState(audience?.description ?? "");
    const [mode, setMode] = useState<"all" | "any">(audience?.match_mode ?? "all");
    const [regles, setRegles] = useState<Regle[]>(audience?.rules ?? []);
    const [envoi, setEnvoi] = useState(false);
    const [portee, setPortee] = useState<{ reach: number; with_orders: number; without_orders: number } | null>(null);
    const [estimation, setEstimation] = useState(false);

    const api = new ApiService();

    /**
     * Les valeurs cochables d'un critère.
     *
     * Le panier se coche sur la même liste que les plats : c'est le même
     * catalogue, vu à un autre moment de la décision.
     */
    const valeursDe = (type: string): { value: string; label: string }[] => {
        const critere = criteres[type];

        if (!critere) return [];

        switch (type) {
            case "profile":
                return Object.entries(sources.profile ?? {}).map(([value, label]) => ({ value, label }));
            case "payment":
                return Object.entries(sources.payment ?? {}).map(([value, label]) => ({ value, label }));
            case "cuisine":
                return (sources.cuisine ?? []).map((c) => ({ value: c.slug, label: c.name }));
            case "store":
                return (sources.store ?? []).map((s) => ({ value: String(s.id), label: s.name }));
            case "merchant":
                return (sources.merchant ?? []).map((m) => ({ value: String(m.id), label: m.name }));
            case "city":
                return (sources.city ?? []).map((v) => ({ value: v, label: v }));
            case "section":
                return (sources.section ?? []).map((s) => ({ value: String(s.id), label: s.name }));
            case "product":
            case "cart":
                return (sources.product ?? []).map((p) => ({ value: String(p.id), label: p.name }));
            default:
                return (critere.values ?? []).map((v) => ({ value: v, label: v }));
        }
    };

    const ajouter = () => {
        const [premier] = Object.keys(criteres);

        if (!premier) return;

        setRegles([...regles, { type: premier, op: criteres[premier].ops[0], values: [] }]);
        setPortee(null);
    };

    const changer = (rang: number, modifiee: Regle) => {
        setRegles(regles.map((r, i) => (i === rang ? modifiee : r)));
        setPortee(null);
    };

    const retirer = (rang: number) => {
        setRegles(regles.filter((_, i) => i !== rang));
        setPortee(null);
    };

    /** Changer de critère remet l'opérateur et les valeurs : elles n'ont plus de sens. */
    const changerType = (rang: number, type: string) => {
        const critere = criteres[type];

        changer(rang, critere.kind === "number"
            ? { type, op: critere.ops[0], value: 1 }
            : { type, op: critere.ops[0], values: [] });
    };

    const corps = () => ({
        id: audience?.id,
        name: nom,
        description: description || null,
        match_mode: mode,
        merchant_id: merchantId,
        rules: regles,
    });

    const estimer = async () => {
        setEstimation(true);

        try {
            const { data } = await api.postData(`${base}/reach`, {
                match_mode: mode,
                rules: regles,
            });

            if (data.success) setPortee(data.data);
            else Swal.fire({ icon: "info", title: "Estimation impossible", text: data.message });
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Estimation impossible", text: String(erreur) });
        }

        setEstimation(false);
    };

    const enregistrer = async () => {
        if (nom.trim() === "") {
            Swal.fire({ icon: "info", title: "Donnez-lui un nom", text: "« Amateurs de grillades de Douala » se réutilise ; « Audience 3 » ne se relit pas." });
            return;
        }

        setEnvoi(true);

        try {
            const { data } = await api.postData(base, corps());

            if (data.success) {
                Swal.fire({ icon: "success", title: data.message, timer: 1400, showConfirmButton: false });
                onSaved();
            } else {
                Swal.fire({ icon: "error", title: "Refusé", text: data.message });
            }
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Enregistrement impossible", text: String(erreur) });
        }

        setEnvoi(false);
    };

    return (
        <div className="p-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                {audience ? "Modifier l'audience" : "Nouvelle audience"}
            </h3>
            <p className="text-sm text-slate-500 mb-5">
                Chaque critère se lit sur les commandes : ce que quelqu'un a payé pour manger dit mieux ce qu'il aime
                que ce qu'il déclarerait aimer.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                    <span className="text-xs font-semibold uppercase text-slate-500">Nom</span>
                    <input className={champ} value={nom} placeholder="Amateurs de grillades de Douala" onChange={(e) => setNom(e.target.value)} />
                </label>

                <label className="block">
                    <span className="text-xs font-semibold uppercase text-slate-500">À quoi elle sert</span>
                    <input className={champ} value={description ?? ""} placeholder="Pour les relances du week-end" onChange={(e) => setDescription(e.target.value)} />
                </label>
            </div>

            <div className="mt-5 flex items-center gap-3">
                <span className="text-xs font-semibold uppercase text-slate-500">Il faut</span>

                <select className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white" value={mode} onChange={(e) => { setMode(e.target.value as "all" | "any"); setPortee(null); }}>
                    <option value="all">tous les critères — on resserre</option>
                    <option value="any">au moins un critère — on élargit</option>
                </select>
            </div>

            <div className="mt-4 space-y-3">
                {regles.length === 0 && (
                    <p className="text-sm text-slate-500">
                        Aucun critère : l'audience parlerait à tout le monde. Ajoutez-en un.
                    </p>
                )}

                {regles.map((regle, rang) => (
                    <LigneRegle
                        key={rang}
                        regle={regle}
                        critere={criteres[regle.type]}
                        criteres={criteres}
                        operateurs={operateurs}
                        valeurs={valeursDe(regle.type)}
                        onType={(type) => changerType(rang, type)}
                        onChange={(modifiee) => changer(rang, modifiee)}
                        onRetirer={() => retirer(rang)}
                    />
                ))}
            </div>

            <button onClick={ajouter} className="mt-4 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                + Ajouter un critère
            </button>

            {/* La portée, avant d'acheter. */}
            <div className="mt-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Portée estimée</p>

                        {portee ? (
                            <>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">
                                    {portee.reach.toLocaleString("fr-FR")} <span className="text-sm font-medium text-slate-500">personnes</span>
                                </p>
                                <p className="text-xs text-slate-500">
                                    {portee.with_orders.toLocaleString("fr-FR")} ont déjà commandé ·{" "}
                                    {portee.without_orders.toLocaleString("fr-FR")} n'ont jamais commandé
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-slate-500">Calculée sur les commandes réelles, par le même code que l'accueil.</p>
                        )}
                    </div>

                    <button
                        onClick={estimer}
                        disabled={estimation || regles.length === 0}
                        className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 shrink-0"
                    >
                        {estimation ? "Calcul…" : "Estimer"}
                    </button>
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300">
                    Annuler
                </button>

                <button
                    onClick={enregistrer}
                    disabled={envoi}
                    className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 dark:bg-white dark:text-slate-900"
                >
                    {envoi ? "Enregistrement…" : "Enregistrer l'audience"}
                </button>
            </div>
        </div>
    );
}

/**
 * Une ligne de critère : quoi, comment, et quelles valeurs.
 *
 * Les listes longues — mille plats — se filtrent : cocher dans une liste de
 * mille sans chercher, personne ne le fait.
 */
function LigneRegle({
    regle,
    critere,
    criteres,
    operateurs,
    valeurs,
    onType,
    onChange,
    onRetirer,
}: {
    regle: Regle;
    critere?: Critere;
    criteres: Record<string, Critere>;
    operateurs: Record<string, string>;
    valeurs: { value: string; label: string }[];
    onType: (type: string) => void;
    onChange: (regle: Regle) => void;
    onRetirer: () => void;
}) {
    const [recherche, setRecherche] = useState("");

    const choisies = regle.values ?? [];

    const visibles = useMemo(() => {
        const terme = recherche.trim().toLowerCase();
        const liste = terme === "" ? valeurs : valeurs.filter((v) => v.label.toLowerCase().includes(terme));

        // Trente suffisent à l'écran : le filtre est là pour le reste.
        return liste.slice(0, 30);
    }, [recherche, valeurs]);

    const basculer = (valeur: string) =>
        onChange({
            ...regle,
            values: choisies.includes(valeur) ? choisies.filter((v) => v !== valeur) : [...choisies, valeur],
        });

    return (
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
                <select
                    className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                    value={regle.type}
                    onChange={(e) => onType(e.target.value)}
                >
                    {Object.entries(criteres).map(([cle, c]) => (
                        <option key={cle} value={cle}>{c.label}</option>
                    ))}
                </select>

                <select
                    className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                    value={regle.op}
                    onChange={(e) => onChange({ ...regle, op: e.target.value })}
                >
                    {(critere?.ops ?? []).map((op) => (
                        <option key={op} value={op}>{operateurs[op] ?? op}</option>
                    ))}
                </select>

                {critere?.kind === "number" && (
                    <input
                        className="w-32 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                        inputMode="numeric"
                        value={String(regle.value ?? "")}
                        onChange={(e) => onChange({ ...regle, value: Number(e.target.value) || 0 })}
                    />
                )}

                <button onClick={onRetirer} className="ml-auto text-xs text-rose-600 dark:text-rose-400 underline">
                    Retirer
                </button>
            </div>

            {critere && <p className="text-xs text-slate-400 mt-1">{critere.hint}</p>}

            {critere?.kind === "set" && (
                <div className="mt-2">
                    {choisies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {choisies.map((valeur) => (
                                <button
                                    key={valeur}
                                    onClick={() => basculer(valeur)}
                                    className="px-2 py-1 rounded-full text-xs bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                >
                                    {valeurs.find((v) => v.value === valeur)?.label ?? valeur} ×
                                </button>
                            ))}
                        </div>
                    )}

                    {valeurs.length > 12 && (
                        <input
                            className="w-full mb-2 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                            value={recherche}
                            placeholder="Chercher…"
                            onChange={(e) => setRecherche(e.target.value)}
                        />
                    )}

                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                        {visibles
                            .filter((v) => !choisies.includes(v.value))
                            .map((v) => (
                                <button
                                    key={v.value}
                                    onClick={() => basculer(v.value)}
                                    className="px-2 py-1 rounded-full text-xs border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                                >
                                    {v.label}
                                </button>
                            ))}
                    </div>

                    {choisies.length === 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Sans valeur, ce critère ne dit rien et sera refusé.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
