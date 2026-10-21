/** Ce que l'API de l'assistant renvoie. Les blocs suivent `App\Services\Assistant\Resultat`. */

export type Unite = 'nombre' | 'FCFA' | '%';

export interface ElementIndicateur {
    mesure: string;
    libelle: string;
    valeur: number;
    unite: Unite;
    avant?: number;
    variation?: number | null;
}

export interface Point {
    x: string;
    y: number;
}

export interface Serie {
    nom: string;
    mesure?: string;
    unite: Unite;
    points: Point[];
}

export interface Colonne {
    cle: string;
    libelle: string;
    type?: 'nombre' | 'FCFA' | 'telephone' | null;
}

export type Bloc =
    | { type: 'indicateurs'; titre: string; periode: string; comparaison?: string | null; elements: ElementIndicateur[] }
    | { type: 'graphique'; titre: string; periode?: string; forme: 'ligne' | 'barres'; unite: Unite | null; pas?: string; series: Serie[] }
    | { type: 'tableau'; titre: string; periode?: string; total?: number; colonnes: Colonne[]; lignes: Record<string, unknown>[] }
    | { type: 'entonnoir'; titre: string; periode: string; etapes: { libelle: string; valeur: number; taux_depuis_debut: number; taux_depuis_precedente: number | null }[]; pertes: { libelle: string; valeur: number }[] }
    | { type: 'cohortes'; titre: string; periode: string; mois: string[]; lignes: { cohorte: string; taille: number; taux: number[] }[] }
    | BlocEnvoi;

export interface BlocEnvoi {
    type: 'envoi';
    id: number;
    canal: 'notification' | 'email';
    titre: string;
    message: string;
    audience: string | null;
    nombre: number;
    statut: 'en_attente' | 'en_cours' | 'envoye' | 'annule';
    envoyes?: number;
    echecs?: number;
}

export interface AppelOutil {
    outil: string;
    libelle: string;
    parametres: Record<string, unknown>;
    erreur: string | null;
}

export interface Message {
    id: number;
    role: 'user' | 'assistant' | 'erreur';
    texte: string | null;
    blocs: Bloc[];
    outils: AppelOutil[];
    cout_usd: number;
    cree_le: string | null;
}

export interface ConversationResume {
    id: number;
    titre: string | null;
    cout_usd: number;
    modifiee_le: string | null;
}

export interface Usage {
    modele: string;
    questions_aujourdhui: number;
    questions_par_jour: number;
    cout_du_mois_usd: number;
    destinataires_restants: number;
    configure: boolean;
}
