import type { Unite } from './types';

const entier = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

export const formater = (valeur: unknown, unite?: Unite | string | null): string => {
    if (valeur === null || valeur === undefined || valeur === '') return '—';
    const n = typeof valeur === 'number' ? valeur : Number(valeur);
    if (Number.isNaN(n)) return String(valeur);
    if (unite === '%') return `${decimal.format(n)} %`;
    if (unite === 'FCFA') return `${entier.format(n)} F`;
    return entier.format(n);
};

/** « 12,4 k » sur un axe : la valeur entière se lit dans l'infobulle. */
export const formaterCourt = (n: number, unite?: Unite | null): string => {
    if (unite === '%') return `${decimal.format(n)} %`;
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `${decimal.format(n / 1_000_000)} M`;
    if (abs >= 1_000) return `${decimal.format(n / 1_000)} k`;
    return entier.format(n);
};

/** Une cellule de CSV : guillemets doublés, et entourée si besoin. */
const cellule = (v: unknown) => {
    const texte = v === null || v === undefined ? '' : String(v);
    return /[";\n]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
};

/**
 * Un CSV au point-virgule, avec BOM : Excel l'ouvre en français sans
 * mélanger les colonnes ni les accents.
 */
export const telechargerCsv = (nom: string, entetes: string[], lignes: unknown[][]) => {
    const contenu = '﻿' + [entetes, ...lignes].map((l) => l.map(cellule).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([contenu], { type: 'text/csv;charset=utf-8' }));
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `${nom.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase() || 'export'}.csv`;
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
