import React from "react";
import { boutonBase, boutonTaille, boutonVariante, cx, type Taille, type Variante } from "./tokens";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variante;
    size?: Taille;
    /** Le nom d'un glyphe Material Symbols, posé avant le libellé. */
    icon?: string;
    /** Remplace le contenu par un indicateur d'attente et neutralise le clic. */
    loading?: boolean;
}

/**
 * Le bouton du tableau de bord.
 *
 * Les écrans décrivaient chacun leur propre bouton, d'où des ombres, des
 * rayons et des graisses qui ne concordaient pas d'une page à l'autre ; pire,
 * plusieurs portaient un bleu `#137fec` écrit en dur, étranger au `primary`
 * du thème. Ici la variante choisit l'apparence, et le thème reste seul juge
 * de la couleur.
 */
const Button: React.FC<ButtonProps> = ({
    variant = "secondary",
    size = "md",
    icon,
    loading = false,
    className,
    children,
    disabled,
    ...rest
}) => (
    <button
        {...rest}
        disabled={disabled || loading}
        className={cx(boutonBase, boutonTaille[size], boutonVariante[variant], className)}
    >
        {loading ? (
            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
        ) : (
            icon && <span className="material-symbols-outlined text-[18px]">{icon}</span>
        )}
        {children}
    </button>
);

export default Button;
