import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Hylana, l'assistante de pilotage : ouverte ou non, en grand ou à côté.
 *
 * L'état vit au-dessus des routes : chaque page monte sa propre mise en page,
 * et une conversation rangée dans une page se perdait à chaque clic du menu.
 */

export type ModeHylana = 'grand' | 'cote';

interface EtatHylana {
    ouverte: boolean;
    mode: ModeHylana;
    ouvrir: (mode?: ModeHylana) => void;
    fermer: () => void;
    basculer: () => void;
    changerMode: () => void;
}

const MEMOIRE = 'ongo.hylana.mode';

const lireMode = (): ModeHylana => {
    try {
        return localStorage.getItem(MEMOIRE) === 'cote' ? 'cote' : 'grand';
    } catch {
        return 'grand';
    }
};

const Contexte = createContext<EtatHylana | null>(null);

/** `actif` : seulement pour un administrateur connecté — ailleurs, ni raccourci ni panneau. */
export const HylanaProvider: React.FC<{ children: React.ReactNode; actif: boolean }> = ({ children, actif }) => {
    const [ouverte, setOuverte] = useState(false);
    const [mode, setMode] = useState<ModeHylana>(lireMode);

    const ouvrir = useCallback((m?: ModeHylana) => {
        if (m) setMode(m);
        setOuverte(true);
    }, []);
    const fermer = useCallback(() => setOuverte(false), []);
    const basculer = useCallback(() => setOuverte((o) => !o), []);
    const changerMode = useCallback(() => {
        setMode((m) => {
            const suivant: ModeHylana = m === 'grand' ? 'cote' : 'grand';
            try {
                localStorage.setItem(MEMOIRE, suivant);
            } catch {
                /* le mode se choisira à nouveau */
            }
            return suivant;
        });
    }, []);

    // ⌘J (Ctrl+J) ouvre et ferme ; Échap ferme.
    useEffect(() => {
        if (!actif) {
            setOuverte(false);
            return;
        }
        const touche = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
                e.preventDefault();
                setOuverte((o) => !o);
            } else if (e.key === 'Escape') {
                setOuverte(false);
            }
        };
        window.addEventListener('keydown', touche);
        return () => window.removeEventListener('keydown', touche);
    }, [actif]);

    const valeur = useMemo(() => ({ ouverte: actif && ouverte, mode, ouvrir, fermer, basculer, changerMode }), [actif, ouverte, mode, ouvrir, fermer, basculer, changerMode]);

    return <Contexte.Provider value={actif ? valeur : null}>{children}</Contexte.Provider>;
};

/** Hors du fournisseur (espaces partenaire, marchand), Hylana n'existe pas. */
export const useHylana = (): EtatHylana | null => useContext(Contexte);
