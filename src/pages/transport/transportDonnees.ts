/**
 * Les données de l'espace transporteur, telles que l'API les rend.
 */

export type RoleTransport = "owner" | "manager" | "agent" | "admin";

export interface EspaceTransport {
    operator: { short_id: string; name: string; mode: "bus" | "train"; status: string };
    role: RoleTransport;
    /** La gare d'un agent ; nulle pour qui gère tout le réseau. */
    station_id: number | null;
    can_manage: boolean;
    /** `boarding` : on y monte, elle a donc un écran des départs. */
    stations: { id: number; name: string; city: string; boarding: boolean }[];
}

/**
 * L'état de la vente en ligne d'un départ dans une gare — calculé par le
 * serveur, jamais ici : l'heure du poste peut être fausse.
 */
export type EtatPassage = "on_sale" | "closed" | "full" | "sales_ended" | "departed" | "cancelled";

export interface Passage {
    station_id: number;
    station_name: string;
    passes_at: string;
    sales_end_at: string;
    sold_online: number;
    closed_at: string | null;
    state: EtatPassage;
}

export interface Depart {
    id: number;
    departs_at: string;
    line: { id: number; origin: string; destination: string };
    class: { id: number; name: string };
    online_cap: number;
    prices: { one_way: number; round_trip: number };
    cancelled: boolean;
    cancel_reason: string | null;
    stations: Passage[];
}

export interface TableauDesDeparts {
    date: string;
    now: string;
    station_id: number | null;
    departures: Depart[];
    summary: { on_sale: number; closed: number; sold: number };
}

/** Une vente en ligne, pour le fil « Ventes en direct ». */
export interface Vente {
    code: string;
    paid_at: string;
    seats: number;
    trip_type: "one_way" | "round_trip";
    departs_at: string;
    class: string;
    station: string | null;
    passengers: string[];
}

/** La pièce d'identité d'un voyageur, que l'agence contrôle à la montée. */
export interface PieceIdentite {
    id_type: "cni" | "passport" | null;
    id_number: string | null;
    id_issued_at: string | null;
    id_expires_on: string | null;
}

/** « CNI 123456 · Yaoundé · exp. 31/12/2030 ». */
export function pieceLisible(p: PieceIdentite): string {
    if (!p.id_number) return "";
    const type = p.id_type === "passport" ? "Passeport" : "CNI";
    const expire = p.id_expires_on ? ` · exp. ${p.id_expires_on.split("-").reverse().join("/")}` : "";
    return `${type} ${p.id_number}${p.id_issued_at ? ` · ${p.id_issued_at}` : ""}${expire}`;
}

/** Un trajet d'un billet : l'aller, ou le retour. */
export interface TrajetBillet {
    departure_id: number;
    class: string;
    cancelled: boolean;
    boarding: { station_id: number; name: string | null; landmark: string | null; passes_at: string | null };
    alighting: { station_id: number; name: string | null; arrives_at: string | null };
}

/** Le billet tel que le voyageur le reçoit. */
export interface Billet {
    code: string;
    status: string;
    trip_type: "one_way" | "round_trip";
    seats: number;
    unit_price: number;
    /** Le montant du transporteur : le prix plein de ses billets. */
    amount: number;
    paid_at: string | null;
    operator: { name: string | null; mode: string | null };
    outbound: TrajetBillet | null;
    return: TrajetBillet | null;
    passengers: (PieceIdentite & { full_name: string; is_account_holder: boolean })[];
}

/** Les voyageurs d'un départ dans une gare. */
export interface ListeVoyageurs {
    departure_id: number;
    station_id: number;
    bookings: number;
    seats: number;
    list: {
        code: string;
        seats: number;
        trip_type: "one_way" | "round_trip";
        is_return: boolean;
        paid_at: string | null;
        payment_mode: string | null;
        /** Le prix plein des billets : les frais d'Ongo et les codes promo ne regardent pas l'agence. */
        amount: number;
        ticket: Billet;
        phone: string | null;
        holder_photo: string | null;
        passengers: (PieceIdentite & { full_name: string; is_account_holder: boolean; boarded_at: string | null })[];
    }[];
}

/** « 18 500 F ». */
export const fcfa = (montant: number): string => `${montant.toLocaleString("fr-FR").replace(/\s/g, " ")} F`;

/** « 2026-10-21 14:20 » → « 14:20 ». */
export const heureDe = (dateHeure: string): string => dateHeure.slice(11, 16);

/** La date du jour, ou de demain, dans le fuseau du poste. */
export function jourIso(decalage: number): string {
    const d = new Date();
    d.setDate(d.getDate() + decalage);
    const deux = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
}
