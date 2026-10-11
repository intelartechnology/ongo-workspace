import React from "react";
import { champBase, champTaille, cx, type Taille } from "./tokens";

interface SearchBarProps {
    value: string;
    onChange: (valeur: string) => void;
    /** Déclenché à la touche Entrée et au clic sur la loupe. */
    onSearch?: () => void;
    placeholder?: string;
    size?: Taille;
    /** Largeur minimale avant repli, pour les barres d'outils qui s'enroulent. */
    minWidth?: number;
    className?: string;
    autoFocus?: boolean;
}

/**
 * La barre de recherche des listes du tableau de bord.
 *
 * Les neuf écrans de liste en portaient chacun une copie, avec des hauteurs,
 * des fonds et des largeurs minimales différents ; une seule proposait
 * d'effacer la saisie. Ce composant retient cette croix — sans elle, vider un
 * filtre obligeait à sélectionner le texte à la main — et l'offre partout.
 */
const SearchBar: React.FC<SearchBarProps> = ({
    value,
    onChange,
    onSearch,
    placeholder = "Rechercher...",
    size = "md",
    minWidth = 260,
    className,
    autoFocus,
}) => (
    <div className={cx("relative flex-1", className)} style={{ minWidth }}>
        <button
            type="button"
            onClick={onSearch}
            // Sans `onSearch`, la loupe n'est qu'un repère : la retirer du
            // parcours clavier évite une tabulation sur une cible inerte.
            tabIndex={onSearch ? 0 : -1}
            aria-label="Lancer la recherche"
            aria-hidden={onSearch ? undefined : true}
            className={cx(
                "material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400",
                onSearch ? "hover:text-primary transition-colors" : "pointer-events-none",
            )}
        >
            search
        </button>

        <input
            type="text"
            value={value}
            autoFocus={autoFocus}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === "Enter" && onSearch) onSearch();
            }}
            className={cx(champBase, champTaille[size], "pl-10", value ? "pr-10" : "pr-4")}
        />

        {value && (
            <button
                type="button"
                aria-label="Effacer la recherche"
                onClick={() => {
                    onChange("");
                    // Effacer, c'est vouloir la liste complète : on la
                    // redemande, sinon l'écran garde les résultats filtrés.
                    onSearch?.();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 size-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
                <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
        )}
    </div>
);

export default SearchBar;
