/**
 * Les options d'un plat : « Combo frites boissons », « Doubler la viande ? ».
 *
 * Un groupe réunit des options ; le client en coche entre un minimum et un
 * maximum. Obligatoire, il ne peut pas ajouter le plat sans choisir — c'est
 * ce qui garantit à la cuisine une pizza avec sa taille.
 *
 * Les identifiants existants voyagent avec chaque groupe et chaque option :
 * le serveur les met à jour au lieu de les recréer, et un client qui a déjà
 * ce plat au panier garde ses choix.
 */

export interface OptionEditee {
    id?: number;
    name: string;
    extra_price: number | string;
}

export interface GroupeEdite {
    id?: number;
    name: string;
    is_required: boolean;
    min_choices?: number;
    max_choices: number | string;
    options: OptionEditee[];
}

interface OptionGroupsEditorProps {
    groupes: GroupeEdite[];
    onChange: (groupes: GroupeEdite[]) => void;
}

const champ = "px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm";

const deplacer = <T,>(liste: T[], de: number, vers: number): T[] => {
    if (vers < 0 || vers >= liste.length) return liste;

    const copie = [...liste];
    const [element] = copie.splice(de, 1);
    copie.splice(vers, 0, element);

    return copie;
};

/** Ce qui empêcherait le client de remplir le groupe — dit avant l'envoi. */
export const problemeDuGroupe = (groupe: GroupeEdite): string | null => {
    const maximum = Number(groupe.max_choices) || 0;

    if (!groupe.name.trim()) return "Donnez un nom au groupe";
    if (groupe.options.length === 0) return "Ajoutez au moins une option";
    if (groupe.options.some((o) => !o.name.trim())) return "Chaque option a besoin d'un nom";
    if (maximum < 1) return "Au moins 1 choix possible";
    if (maximum > groupe.options.length) return `${maximum} choix possibles pour ${groupe.options.length} option(s)`;

    return null;
};

/** Le groupe tel que l'API l'attend. */
export const versApi = (groupes: GroupeEdite[]) =>
    groupes.map((g) => ({
        id: g.id ?? null,
        name: g.name.trim(),
        is_required: g.is_required,
        min_choices: g.is_required ? 1 : 0,
        max_choices: Number(g.max_choices) || 1,
        options: g.options.map((o) => ({ id: o.id ?? null, name: o.name.trim(), extra_price: Number(o.extra_price) || 0 })),
    }));

export default function OptionGroupsEditor({ groupes, onChange }: OptionGroupsEditorProps) {
    const modifierGroupe = (rang: number, changes: Partial<GroupeEdite>) =>
        onChange(groupes.map((g, i) => (i === rang ? { ...g, ...changes } : g)));

    const modifierOption = (rang: number, ordre: number, changes: Partial<OptionEditee>) =>
        modifierGroupe(rang, { options: groupes[rang].options.map((o, i) => (i === ordre ? { ...o, ...changes } : o)) });

    const ajouterGroupe = () =>
        onChange([...groupes, { name: "", is_required: false, max_choices: 1, options: [{ name: "", extra_price: "" }] }]);

    return (
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Options</p>
                    <p className="text-xs text-slate-400">Combos, tailles, sauces, suppléments… Le supplément s'ajoute au prix du plat.</p>
                </div>
                <button onClick={ajouterGroupe} className="text-sm font-medium text-slate-900 dark:text-white">
                    + Ajouter un groupe
                </button>
            </div>

            <div className="space-y-4">
                {groupes.map((groupe, rang) => {
                    const probleme = problemeDuGroupe(groupe);

                    return (
                        <div key={groupe.id ?? `nouveau-${rang}`} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <input
                                    className={`${champ} flex-1 min-w-[200px]`}
                                    value={groupe.name}
                                    placeholder="Combo frites boissons"
                                    onChange={(e) => modifierGroupe(rang, { name: e.target.value })}
                                />

                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                                    <input
                                        type="checkbox"
                                        checked={groupe.is_required}
                                        onChange={(e) => modifierGroupe(rang, { is_required: e.target.checked })}
                                    />
                                    Obligatoire
                                </label>

                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                                    Jusqu'à
                                    <input
                                        className={`${champ} w-16`}
                                        value={groupe.max_choices}
                                        inputMode="numeric"
                                        onChange={(e) => modifierGroupe(rang, { max_choices: e.target.value })}
                                    />
                                    choix
                                </label>

                                <div className="flex gap-1 text-slate-500">
                                    <button title="Monter" onClick={() => onChange(deplacer(groupes, rang, rang - 1))} className="px-2">↑</button>
                                    <button title="Descendre" onClick={() => onChange(deplacer(groupes, rang, rang + 1))} className="px-2">↓</button>
                                    <button title="Retirer le groupe" onClick={() => onChange(groupes.filter((_, i) => i !== rang))} className="px-2 text-red-600">
                                        Retirer
                                    </button>
                                </div>
                            </div>

                            <div className="mt-3 space-y-2">
                                {groupe.options.map((option, ordre) => (
                                    <div key={option.id ?? `option-${ordre}`} className="flex items-center gap-3">
                                        <span className={`h-5 w-5 shrink-0 bg-slate-100 dark:bg-slate-800 ${Number(groupe.max_choices) === 1 ? "rounded-full" : "rounded-md"}`} />
                                        <input
                                            className={`${champ} flex-1`}
                                            value={option.name}
                                            placeholder="Combo frites + Coca"
                                            onChange={(e) => modifierOption(rang, ordre, { name: e.target.value })}
                                        />
                                        <span className="text-sm text-slate-500">+</span>
                                        <input
                                            className={`${champ} w-24`}
                                            value={option.extra_price}
                                            placeholder="0"
                                            inputMode="numeric"
                                            onChange={(e) => modifierOption(rang, ordre, { extra_price: e.target.value })}
                                        />
                                        <span className="text-sm text-slate-500">F</span>
                                        <div className="flex gap-1 text-slate-500">
                                            <button onClick={() => modifierGroupe(rang, { options: deplacer(groupe.options, ordre, ordre - 1) })} className="px-1">↑</button>
                                            <button onClick={() => modifierGroupe(rang, { options: deplacer(groupe.options, ordre, ordre + 1) })} className="px-1">↓</button>
                                            <button
                                                onClick={() => modifierGroupe(rang, { options: groupe.options.filter((_, i) => i !== ordre) })}
                                                className="px-1 text-red-600"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={() => modifierGroupe(rang, { options: [...groupe.options, { name: "", extra_price: "" }] })}
                                    className="text-sm text-slate-600 dark:text-slate-300 ml-8"
                                >
                                    + Ajouter une option
                                </button>
                            </div>

                            <p className={`text-xs mt-3 ${probleme ? "text-red-600" : "text-slate-400"}`}>
                                {probleme ??
                                    `Le client ${groupe.is_required ? "doit choisir" : "peut choisir"} ${
                                        Number(groupe.max_choices) > 1 ? `jusqu'à ${groupe.max_choices} options` : "une option"
                                    }.`}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
