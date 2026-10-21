import { useSyncExternalStore } from 'react';

/**
 * Le menu de gauche réduit à sa colonne d'icônes, au choix de l'utilisateur.
 *
 * Chaque page monte sa propre mise en page : l'état vit donc ici, hors des
 * composants, et le navigateur le garde d'une visite à l'autre.
 */

const CLE = 'ongo.menu.reduit';

let reduit = (() => {
    try {
        return localStorage.getItem(CLE) === '1';
    } catch {
        return false;
    }
})();

const abonnes = new Set<() => void>();

export const basculerMenu = () => {
    reduit = !reduit;
    try {
        localStorage.setItem(CLE, reduit ? '1' : '0');
    } catch {
        // Le choix vaudra pour cette visite.
    }
    abonnes.forEach((f) => f());
};

export const useMenuReduit = (): boolean =>
    useSyncExternalStore(
        (f) => {
            abonnes.add(f);
            return () => abonnes.delete(f);
        },
        () => reduit,
    );

/*
 * Le menu réduit déplié au survol : il pousse la page comme un menu ouvert,
 * et la mise en page comme le panneau de Hylana doivent le savoir.
 */
let survol = false;
const abonnesSurvol = new Set<() => void>();

export const setSurvolMenu = (valeur: boolean) => {
    if (survol === valeur) return;
    survol = valeur;
    abonnesSurvol.forEach((f) => f());
};

export const useSurvolMenu = (): boolean =>
    useSyncExternalStore(
        (f) => {
            abonnesSurvol.add(f);
            return () => abonnesSurvol.delete(f);
        },
        () => survol,
    );
