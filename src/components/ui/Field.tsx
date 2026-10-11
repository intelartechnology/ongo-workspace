import React from "react";
import { champBase, champTaille, cx, type Taille } from "./tokens";

type AvecTaille = { size?: Taille };

/** Le champ texte de référence. */
export const Input: React.FC<
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & AvecTaille
> = ({ size = "md", className, ...rest }) => (
    <input {...rest} className={cx(champBase, champTaille[size], className)} />
);

/**
 * La liste déroulante.
 *
 * `appearance-none` retire la flèche native, qui ne suivait pas le thème
 * sombre ; celle dessinée ici la remplace, d'où la réserve à droite.
 */
export const Select: React.FC<
    Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & AvecTaille
> = ({ size = "md", className, children, ...rest }) => (
    <div className="relative">
        <select
            {...rest}
            className={cx(
                champBase,
                champTaille[size],
                "pr-10 appearance-none cursor-pointer",
                className,
            )}
        >
            {children}
        </select>
        <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[20px] text-slate-400 pointer-events-none">
            expand_more
        </span>
    </div>
);

interface DateFieldProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
    size?: Taille;
    /** Le granularité demandée ; `date` par défaut. */
    mode?: "date" | "datetime-local" | "time" | "month";
    /** Un intitulé court posé au-dessus du champ. */
    label?: string;
}

/**
 * Le champ date, heure ou période.
 *
 * Les zones de calendrier étaient les plus disparates du lot : bordures
 * grises en dur, fonds blancs en thème sombre, hauteurs qui ne tombaient pas
 * sur celle des champs voisins. Elles passent ici par le même gabarit que le
 * reste, et `color-scheme` fait suivre le sélecteur natif du navigateur au
 * thème — sans quoi il restait blanc sur fond sombre.
 */
export const DateField: React.FC<DateFieldProps> = ({
    size = "md",
    mode = "date",
    label,
    className,
    ...rest
}) => {
    const champ = (
        <input
            {...rest}
            type={mode}
            className={cx(
                champBase,
                champTaille[size],
                "[color-scheme:light] dark:[color-scheme:dark]",
                className,
            )}
        />
    );

    if (!label) return champ;

    return (
        <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {label}
            </span>
            {champ}
        </label>
    );
};
