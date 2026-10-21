/*
 * Les chiffres communs au tableau de bord d'un partenaire et au rapport d'un
 * de ses chauffeurs : leurs types, la période, les formats.
 *
 * À part des composants (`suivi.tsx`) : le rechargement à chaud de Vite veut
 * des fichiers qui n'exportent que des composants.
 */

export interface Totaux {
    offers: number;
    accepted: number;
    completed: number;
    cancelled_after_accept: number;
    in_progress: number;
    missed: number;
    refused: number;
    acceptance_rate: number | null;
    completion_rate: number | null;
    revenue: number;
    average_fare: number;
    driver_earnings: number;
    /** Nul pour un membre d'équipe : la commission regarde le propriétaire. */
    partner_commission: number | null;
    active_days: number;
    rating: number | null;
    ratings_count: number;
}

export interface Point {
    date: string;
    completed: number;
    missed: number;
    revenue: number;
}

export interface Alerte {
    level: "info" | "warning" | "critical";
    text: string;
}

export const PERIODES = [
    { jours: 7, libelle: "7 jours" },
    { jours: 30, libelle: "30 jours" },
    { jours: 90, libelle: "90 jours" },
    { jours: 365, libelle: "12 mois" },
];

export const TEINTES = {
    light: { fait: "#2a78d6", manque: "#eb6834", grille: "#e2e8f0", axe: "#64748b" },
    dark: { fait: "#3987e5", manque: "#d95926", grille: "#1e293b", axe: "#94a3b8" },
};

export const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** `from` / `to` pour l'API, aujourd'hui compris. */
export const bornes = (jours: number) => {
    const fin = new Date();
    const debut = new Date();
    debut.setDate(fin.getDate() - (jours - 1));

    return { from: isoLocal(debut), to: isoLocal(fin) };
};

export const francs = (n: number | null | undefined) => `${Math.round(n ?? 0).toLocaleString("fr-FR")} FCFA`;
export const nombre = (n: number | null | undefined) => Math.round(n ?? 0).toLocaleString("fr-FR");
export const pourcent = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`);

export const jourCourt = (iso: string) =>
    new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(`${iso.slice(0, 10)}T12:00:00`));

export const quand = (iso: string | null) =>
    iso
        ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(
              new Date(iso.replace(" ", "T")),
          )
        : "—";

/** L'écart avec la période précédente, en %, ou `null` sans base. */
export const ecart = (actuel: number | null | undefined, avant: number | null | undefined) =>
    avant ? Math.round((((actuel ?? 0) - avant) / avant) * 1000) / 10 : null;

/** En points, pour un taux : de 20 à 25 % font +5 points, pas +25 %. */
export const ecartPoints = (actuel: number | null, avant: number | null) =>
    actuel === null || avant === null ? null : Math.round((actuel - avant) * 10) / 10;
