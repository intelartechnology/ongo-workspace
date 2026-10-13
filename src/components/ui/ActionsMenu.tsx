import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cx } from "./tokens";

export interface ActionItem {
    label: string;
    /** Le nom d'un glyphe Material Symbols. */
    icon?: string;
    onClick: () => void;
    /** Teinte l'entrée en rouge, pour une action destructrice. */
    danger?: boolean;
    disabled?: boolean;
    /** Trace un trait au-dessus de l'entrée, pour séparer deux groupes. */
    separatorBefore?: boolean;
}

interface ActionsMenuProps {
    items: ActionItem[];
    /** Infobulle du bouton déclencheur. */
    title?: string;
    align?: "left" | "right";
}

const LARGEUR = 208;
const MARGE = 8;

/**
 * Le menu « … » des lignes de tableau.
 *
 * Le menu est posé dans un portail, en `position: fixed`, et non sous son
 * bouton. Un menu en absolu reste prisonnier du contexte d'empilement de sa
 * cellule — et les cellules d'action sont souvent `sticky`, ce qui en crée
 * un : les lignes suivantes se peignent alors par-dessus, quel que soit le
 * z-index du menu. Le conteneur de table étant par ailleurs en
 * `overflow-x-auto`, il l'aurait aussi rogné. Le portail échappe aux deux.
 *
 * En contrepartie la position doit être recalculée : le menu se ferme au
 * défilement et au redimensionnement plutôt que de suivre une ancre devenue
 * fausse.
 */
const ActionsMenu: React.FC<ActionsMenuProps> = ({ items, title = "Actions", align = "right" }) => {
    const [ouvert, setOuvert] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const boutonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!ouvert || !boutonRef.current) return;
        const r = boutonRef.current.getBoundingClientRect();
        const hauteur = menuRef.current?.offsetHeight ?? 0;
        // Sous le bouton par défaut ; au-dessus s'il déborderait du bas.
        const basDispo = window.innerHeight - r.bottom;
        const versLeHaut = hauteur > 0 && basDispo < hauteur + MARGE && r.top > hauteur + MARGE;

        setPos({
            top: versLeHaut ? r.top - hauteur - 4 : r.bottom + 4,
            left: align === "right"
                ? Math.max(MARGE, r.right - LARGEUR)
                : Math.min(r.left, window.innerWidth - LARGEUR - MARGE),
        });
    }, [ouvert, align, items.length]);

    useEffect(() => {
        if (!ouvert) return;

        const auClic = (e: MouseEvent) => {
            const cible = e.target as Node;
            if (menuRef.current?.contains(cible) || boutonRef.current?.contains(cible)) return;
            setOuvert(false);
        };
        const auClavier = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOuvert(false);
        };
        // En capture : un défilement dans le conteneur de table ne remonte pas
        // jusqu'à `window` autrement, et le menu resterait sur place.
        const auDefilement = () => setOuvert(false);

        document.addEventListener("mousedown", auClic);
        document.addEventListener("keydown", auClavier);
        window.addEventListener("scroll", auDefilement, true);
        window.addEventListener("resize", auDefilement);
        return () => {
            document.removeEventListener("mousedown", auClic);
            document.removeEventListener("keydown", auClavier);
            window.removeEventListener("scroll", auDefilement, true);
            window.removeEventListener("resize", auDefilement);
        };
    }, [ouvert]);

    const visibles = items.filter(Boolean);

    return (
        <>
            <button
                ref={boutonRef}
                type="button"
                title={title}
                aria-haspopup="menu"
                aria-expanded={ouvert}
                onClick={() => setOuvert((v) => !v)}
                className={cx(
                    "p-1.5 rounded-lg text-slate-500 transition-colors",
                    "hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary",
                    ouvert && "bg-slate-100 dark:bg-slate-800 text-primary",
                )}
            >
                <span className="material-symbols-outlined text-[20px] align-middle">more_vert</span>
            </button>

            {ouvert && createPortal(
                <div
                    ref={menuRef}
                    role="menu"
                    style={{
                        position: "fixed",
                        width: LARGEUR,
                        // Tant que la hauteur n'est pas mesurée, le menu est
                        // monté hors écran : le poser à 0,0 le ferait sauter.
                        top: pos?.top ?? -9999,
                        left: pos?.left ?? -9999,
                        visibility: pos ? "visible" : "hidden",
                    }}
                    className="z-[100] py-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                >
                    {visibles.map((item, i) => (
                        <React.Fragment key={i}>
                            {item.separatorBefore && i > 0 && (
                                <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                            )}
                            <button
                                type="button"
                                role="menuitem"
                                disabled={item.disabled}
                                onClick={() => {
                                    setOuvert(false);
                                    item.onClick();
                                }}
                                className={cx(
                                    "w-full px-4 py-2.5 text-left text-sm font-medium flex items-center gap-3 transition-colors",
                                    "disabled:opacity-40 disabled:cursor-not-allowed",
                                    item.danger
                                        ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50",
                                )}
                            >
                                {item.icon && (
                                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                                )}
                                {item.label}
                            </button>
                        </React.Fragment>
                    ))}
                </div>,
                document.body,
            )}
        </>
    );
};

export default ActionsMenu;
