/**
 * Les classes de base des contrôles du tableau de bord.
 *
 * Chaque écran portait sa propre variante — `py-2` ici, `py-2.5` là,
 * `rounded-lg` d'un côté, `rounded-xl` de l'autre, une bordure parfois
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

/**
 * L'ossature partagée par tous les boutons, variante mise à part.
 *
 * La forme des écrans d'Ongo Eat : coins `rounded-lg`, graisse moyenne. Les
 * boutons en gras et aux coins de pilule faisaient de chaque action un appel,
 * et deux pages voisines ne parlaient pas la même langue. La couleur, elle,
 * reste celle de la charte.
 */
export const boutonBase =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium " +
    "whitespace-nowrap transition-colors outline-none " +
    "focus-visible:ring-2 focus-visible:ring-slate-400/50 " +
    "disabled:opacity-40 disabled:cursor-not-allowed";

export const boutonTaille = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
} as const;

/**
 * `primary` porte l'action principale d'un écran — une seule par vue : le bleu
 * ONGO de la charte (`Palette.brand` de l'application mobile), un cran plus
 * clair en mode sombre pour rester visible sur le fond.
 * `secondary` sert les actions de barre d'outils (filtrer, exporter).
 * `ghost` et `danger` couvrent le reste.
 */
export const boutonVariante = {
    primary:
        "bg-primary text-white hover:bg-primary/90 " +
        "dark:bg-primary-container dark:hover:bg-primary-container/90",
    secondary:
        "bg-white dark:bg-transparent text-slate-700 dark:text-slate-300 " +
        "border border-slate-300 dark:border-slate-700 " +
        "hover:bg-slate-50 dark:hover:bg-slate-800",
    ghost:
        "bg-transparent text-slate-600 dark:text-slate-300 " +
        "hover:bg-slate-100 dark:hover:bg-slate-800",
    danger:
        "bg-red-600 text-white hover:bg-red-700",
} as const;

export type Variante = keyof typeof boutonVariante;

/** Concatène des classes en ignorant les branches vides. */
export const cx = (...classes: (string | false | null | undefined)[]): string =>
    classes.filter(Boolean).join(" ");
