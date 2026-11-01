import { useReglages } from "./useReglages";

/**
 * Des réglages de la plateforme, posés là où ils servent.
 *
 * Le même mécanisme que l'écran Réglages — `v3/admin/settings`, les bornes du
 * serveur, son refus répété tel quel —, mais pour une page qui a ses propres
 * listes à côté : la majoration des prix règle ses interrupteurs à côté de ses
 * créneaux, au lieu de renvoyer vers un autre écran.
 *
 * Seuls les types simples sont gérés ici — interrupteur, nombre, texte. Les
 * images et les couleurs restent à l'écran Réglages.
 */

type Etat = ReturnType<typeof useReglages>;

interface BlocReglagesProps {
    reglages: Etat;
    /** Les clés à montrer, dans l'ordre où elles arrivent du serveur. */
    cles: RegExp;
}

/** Une liste de réglages, une ligne chacun : libellé et explication à gauche, saisie à droite. */
export default function BlocReglages({ reglages, cles }: BlocReglagesProps) {
    const { lignes, brouillon, setBrouillon, enregistrer, enregistrement } = reglages;
    const visibles = lignes.filter((l) => cles.test(l.cle));

    if (visibles.length === 0) return null;

    const champ = "px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white";
    const poser = (cle: string, valeur: string) => setBrouillon((precedent) => ({ ...precedent, [cle]: valeur }));

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
            {visibles.map((ligne) => {
                const modifie = brouillon[ligne.cle] !== undefined && brouillon[ligne.cle] !== ligne.valeur;

                return (
                    <div key={ligne.cle} className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{ligne.libelle}</p>
                            {ligne.description && <p className="text-[13px] text-slate-500 mt-0.5">{ligne.description}</p>}
                        </div>

                        <div className="flex items-start gap-3 shrink-0">
                            <div className="text-right">
                                {ligne.type === "interrupteur" ? (
                                    // Deux états, pas un nombre à taper : 1 allume, 0 éteint.
                                    <select value={brouillon[ligne.cle] === "1" ? "1" : "0"} onChange={(e) => poser(ligne.cle, e.target.value)} className={`${champ} w-36`}>
                                        <option value="1">Activé</option>
                                        <option value="0">Désactivé</option>
                                    </select>
                                ) : ligne.type === "texte" ? (
                                    <textarea rows={3} maxLength={255} value={brouillon[ligne.cle] ?? ""} onChange={(e) => poser(ligne.cle, e.target.value)} className={`${champ} w-72 max-w-full text-left`} />
                                ) : (
                                    <input type="number" value={brouillon[ligne.cle] ?? ""} onChange={(e) => poser(ligne.cle, e.target.value)} className={`${champ} w-24 text-right`} />
                                )}

                                {ligne.type !== "interrupteur" && (ligne.minimum !== null || ligne.maximum !== null) && (
                                    <p className="text-xs text-slate-400 mt-1">
                                        entre {Number(ligne.minimum)} et {Number(ligne.maximum)}
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={() => enregistrer(ligne)}
                                disabled={!modifie || enregistrement === ligne.cle}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
                            >
                                {enregistrement === ligne.cle ? "…" : "Enregistrer"}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
