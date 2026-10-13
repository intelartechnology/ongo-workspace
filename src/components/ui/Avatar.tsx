import { useState } from "react";
import { cx } from "./tokens";

interface AvatarProps {
    photo?: string | null;
    /** Le nom de la personne : sa première lettre remplace la photo absente. */
    nom?: string | null;
    alt?: string;
    /** Classes ajoutées à la photo comme à la lettre — taille du texte, arrondi. */
    className?: string;
}

/**
 * Une photo de profil, ou la première lettre du nom.
 *
 * Chaque écran avait son repli : une silhouette grise ici, deux initiales là,
 * une image de remplacement tirée d'un site tiers ailleurs — et sur l'espace
 * partenaire, la photo d'un inconnu codée en dur. La lettre dit au moins de qui
 * il s'agit.
 *
 * Le composant remplit son conteneur : la taille, la forme et la bordure
 * restent celles de l'écran. Une photo qui ne se charge pas — lien mort,
 * fichier supprimé — bascule aussi sur la lettre plutôt que sur une image
 * cassée.
 */
export default function Avatar({ photo, nom, alt = "", className }: AvatarProps) {
    // La photo qui a échoué : une autre adresse retente sa chance.
    const [ratee, setRatee] = useState<string | null>(null);
    const lettre = (nom ?? "").trim().charAt(0).toUpperCase() || "?";
    // Une taille par défaut, seulement si l'écran n'en donne pas : deux tailles
    // de texte se départagent par l'ordre de la feuille, pas par celui des classes.
    const taille = /(^|\s)text-(xs|sm|base|lg|\d?xl|\[)/.test(className ?? "") ? null : "text-sm";

    if (photo && photo !== ratee) {
        return <img src={photo} alt={alt} onError={() => setRatee(photo)} className={cx("w-full h-full object-cover", className)} />;
    }

    return (
        <span
            role="img"
            aria-label={alt || nom || undefined}
            className={cx(
                "w-full h-full flex items-center justify-center select-none font-bold leading-none",
                "bg-primary/10 text-primary dark:bg-primary-fixed-dim/15 dark:text-primary-fixed-dim",
                taille,
                className,
            )}
        >
            {lettre}
        </span>
    );
}
