/**
 * Les classes de base des contrôles du tableau de bord.
 *
 * Chaque écran portait sa propre variante — `py-2` ici, `py-2.5` là,
 * `rounded-lg` d'un côté, `rounded-2xl` de l'autre, une bordure parfois
 * absente — si bien que deux pages voisines n'avaient pas la même hauteur de
 * champ. Les valeurs ci-dessous arbitrent une fois pour toutes ; les écrans
 * les composent au lieu de les réécrire.
 */

/** Le fond, la bordure et l'anneau de focus communs à tout champ saisissable. */
export const champBase =
    "w-full rounded-xl border border-slate-200 dark:border-slate-700 " +
    "bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 " +
    "placeholder:text-slate-400 outline-none transition-all " +
    "focus:ring-2 focus:ring-primary/30 focus:border-primary " +
    "disabled:opacity-60 disabled:cursor-not-allowed";

/** Les gabarits verticaux. `md` est la hauteur de référence des barres d'outils. */
export const champTaille = {
    sm: "px-3 py-2",
    md: "px-4 py-2.5",
} as const;

export type Taille = keyof typeof champTaille;

/** L'ossature partagée par tous les boutons, variante mise à part. */
export const boutonBase =
    "inline-flex items-center justify-center gap-2 rounded-xl font-bold " +
    "whitespace-nowrap transition-all outline-none " +
    "focus-visible:ring-2 focus-visible:ring-primary/40 " +
    "disabled:opacity-60 disabled:cursor-not-allowed";

export const boutonTaille = {
    sm: "px-3 py-2 text-xs",
    md: "px-5 py-2.5 text-sm",
} as const;

/**
 * `primary` porte l'action principale d'un écran — une seule par vue.
 * `secondary` sert les actions de barre d'outils (filtrer, exporter).
 * `ghost` et `danger` couvrent le reste.
 */
export const boutonVariante = {
    primary:
        "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90",
    secondary:
        "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 " +
        "border border-slate-200 dark:border-slate-700 " +
        "hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-primary",
    ghost:
        "bg-transparent text-slate-600 dark:text-slate-300 " +
        "hover:bg-slate-100 dark:hover:bg-slate-800",
    danger:
        "bg-error text-white shadow-lg shadow-error/20 hover:bg-error/90",
} as const;

export type Variante = keyof typeof boutonVariante;

/** Concatène des classes en ignorant les branches vides. */
export const cx = (...classes: (string | false | null | undefined)[]): string =>
    classes.filter(Boolean).join(" ");
