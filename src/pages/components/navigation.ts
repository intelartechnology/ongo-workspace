import {
    ArrowLeftRight,
    Banknote,
    Bike,
    Bus,
    CalendarDays,
    Car,
    CarFront,
    CarTaxiFront,
    ChartLine,
    CreditCard,
    GalleryHorizontal,
    Gift,
    Rocket,
    Gavel,
    Globe,
    HandCoins,
    Handshake,
    HeartHandshake,
    Images,
    KeyRound,
    Landmark,
    LayoutDashboard,
    LayoutGrid,
    Link2,
    ListFilter,
    Megaphone,
    PiggyBank,
    Route,
    Rows3,
    Shapes,
    ShoppingBag,
    SlidersHorizontal,
    Sparkles,
    Soup,
    Store,
    Tag,
    UserCheck,
    UserCog,
    UserRound,
    UserSearch,
    Users,
    UsersRound,
    UtensilsCrossed,
    Wallet,
    type LucideIcon,
} from 'lucide-react';

export interface Entree {
    icon: LucideIcon;
    label: string;
    path: string;
    badge?: 'reviews';
}

export interface Groupe {
    cle: string;
    titre: string;
    icon: LucideIcon;
    entrees: Entree[];
}

/**
 * Les familles du back-office.
 *
 * Elles suivent les métiers, pas l'histoire du code. « Plateforme » comptait
 * dix-sept lignes — la moitié du menu — où tout Ongo Eat était à plat ;
 * « Pilotage » était un titre sans rien dessous ; et « Location » figurait
 * deux fois, dans deux groupes, vers la même page.
 *
 * Hors « Ongo Eat », qui est un module entier, aucun groupe ne dépasse
 * quatre entrées. Et tous se replient : ce qui compte n'est pas leur taille,
 * c'est qu'on n'en voie qu'un à la fois.
 */
export const GROUPES: Groupe[] = [
    {
        /*
         * Les courses en tete, le covoiturage juste apres.
         *
         * Ongo Eat ouvrait la barre parce qu'il est le dernier arrive et le
         * plus fourni — quinze entrees contre quatre. Mais ce n'est pas ce
         * qu'on surveille le plus : les courses tournent toute la journee, et
         * c'est par elles qu'on entre. L'ordre suit l'usage, pas l'anciennete
         * ni le nombre de pages.
         */
        cle: 'courses',
        titre: 'Courses et flotte',
        icon: CarTaxiFront,
        entrees: [
            { icon: Car, label: 'Courses', path: '/courses' },
            { icon: UserRound, label: 'Chauffeurs', path: '/drivers' },
            { icon: CarFront, label: 'Véhicules', path: '/vehicles' },
            { icon: UserSearch, label: 'Demandes', path: '/requests' },
            { icon: Gift, label: 'Bonus chauffeurs', path: '/driver-bonuses' },
            { icon: Rocket, label: 'Boosts', path: '/boosts' },
        ],
    },
    {
        cle: 'covoiturage',
        titre: 'Covoiturage',
        icon: Route,
        entrees: [
            { icon: Users, label: 'Activité', path: '/carpool' },
            { icon: UserCheck, label: 'Covoitureurs', path: '/carpoolers' },
            { icon: ArrowLeftRight, label: 'Remboursements', path: '/carpool-refunds' },
            // Les billets de bus et de train : les agences et compagnies, et leur espace.
            { icon: Bus, label: 'Transporteurs (bus, train)', path: '/transport-operators' },
            { icon: Tag, label: 'Codes promo transport', path: '/transport-promo-codes' },
        ],
    },
    {
        /*
         * Tout Ongo Eat au meme endroit.
         *
         * C'etait eclate en trois familles — le module, la vitrine, le
         * catalogue —, ce qui obligeait a se demander laquelle porte les
         * codes promo avant de les chercher. Un seul groupe, replie par
         * defaut : on l'ouvre quand on travaille sur Eat, et on ne le voit
         * pas le reste du temps.
         *
         * L'ordre suit l'usage, du quotidien au rarement touche.
         */
        cle: 'eat',
        titre: 'Ongo Eat',
        icon: UtensilsCrossed,
        entrees: [
            { icon: UtensilsCrossed, label: 'Tableau de bord', path: '/eat' },
            { icon: ShoppingBag, label: 'Boutiques', path: '/eat-stores' },
            { icon: Store, label: 'Marchands', path: '/merchants' },
            // La régie : ce qu'un marchand propose et qui attend une décision.
            // Sans cette entrée, une campagne dort dans une liste que personne
            // n'ouvre — et derrière, c'est quelqu'un qui a payé et qui attend.
            { icon: Megaphone, label: 'Sponsorings', path: '/eat-sponsorships', badge: 'reviews' },
            // A qui les mises en avant s'adressent. Juste apres les
            // sponsorings : c'est en composant une operation qu'on decouvre
            // qu'on voudrait viser ceux qui aiment les grillades.
            { icon: UsersRound, label: 'Audiences', path: '/eat-audiences' },
            { icon: Banknote, label: 'Reversements', path: '/eat-payouts' },
            // La tresorerie : le livre d'Ongo, qu'aucun ecran ne lisait. Le
            // tableau de bord recalcule ; ici on lit ce qui est ecrit.
            { icon: Landmark, label: 'Trésorerie', path: '/eat-treasury' },
            // Qui livre pour Ongo : la liste que la repartition consultait sans
            // que personne ne puisse l'ecrire.
            { icon: Bike, label: 'Livreurs', path: '/eat-couriers' },
            { icon: Tag, label: 'Codes promo', path: '/eat-promo-codes' },
            // La mosaique se regle a trois endroits ; elle se lit ici.
            { icon: LayoutGrid, label: 'Mosaïque', path: '/eat-mosaic' },
            { icon: Rows3, label: 'Rubriques', path: '/eat-sections' },
            { icon: GalleryHorizontal, label: 'Bannières', path: '/eat-banners' },
            { icon: Link2, label: 'Pages de redirection', path: '/eat-redirects' },
            { icon: Shapes, label: 'Catégories', path: '/eat-categories' },
            { icon: Soup, label: 'Cuisines', path: '/eat-tags' },
            { icon: ListFilter, label: 'Filtres', path: '/eat-filters' },
            { icon: Globe, label: 'Zones de service', path: '/eat-service-areas' },
            { icon: CreditCard, label: 'Moyens de paiement', path: '/eat-payment-methods' },
            { icon: Images, label: 'Galerie', path: '/eat-gallery' },
        ],
    },
    {
        cle: 'location',
        titre: 'Location',
        icon: KeyRound,
        entrees: [
            { icon: CalendarDays, label: 'Réservations', path: '/rentals' },
            { icon: CarFront, label: 'Véhicules', path: '/rental-vehicles' },
            { icon: Shapes, label: 'Catégories', path: '/rental-categories' },
        ],
    },
    {
        cle: 'comptes',
        titre: 'Comptes',
        icon: UserCog,
        entrees: [
            { icon: UsersRound, label: 'Utilisateurs', path: '/users' },
            // Avertir, bloquer, rendre un compte : un seul endroit, à côté de
            // la liste des utilisateurs, là où on vient les chercher.
            { icon: Gavel, label: 'Modération', path: '/moderation' },
            { icon: Handshake, label: 'Partenaires', path: '/partners' },
            { icon: ChartLine, label: 'Activité partenaires', path: '/partners/activity' },
            { icon: HeartHandshake, label: 'Contributeurs', path: '/contributors' },
        ],
    },
    {
        cle: 'finance',
        titre: 'Finance',
        icon: Wallet,
        entrees: [
            { icon: Banknote, label: 'Transactions', path: '/transactions' },
            // Les soldes, d'un signe ou de l'autre : qui doit a Ongo, qui a de
            // l'argent chez elle. Chaque ligne ouvre l'historique du compte.
            { icon: HandCoins, label: 'Dettes chauffeurs / clients', path: '/finance/debts' },
            { icon: PiggyBank, label: 'Comptes approvisionnés', path: '/finance/credits' },
        ],
    },
];

/** Le tableau de bord et les réglages : hors famille, en tête et en pied du menu. */
export const ACCUEIL: Entree = { icon: LayoutDashboard, label: 'Tableau de bord', path: '/dashboard' };

/** L'assistant de pilotage : il lit l'activité, prépare des rapports et des envois, ne modifie rien. */
export const ASSISTANT: Entree = { icon: Sparkles, label: 'Assistant', path: '/assistant' };
export const REGLAGES: Entree = { icon: SlidersHorizontal, label: 'Réglages', path: '/settings' };

/**
 * La page ouverte, et sa famille.
 *
 * Une fiche (`/courses/42`) n'a pas d'entrée à elle : elle prend celle de la
 * liste dont elle sort, la plus longue qui la préfixe — sans quoi
 * `/partners/activity` se ferait passer pour `/partners`.
 */
export const trouverPage = (chemin: string): { entree: Entree; groupe?: Groupe } | undefined => {
    const candidats = [
        { entree: ACCUEIL },
        { entree: ASSISTANT },
        { entree: REGLAGES },
        ...GROUPES.flatMap((groupe) => groupe.entrees.map((entree) => ({ entree, groupe }))),
    ];

    return candidats
        .filter(({ entree }) => chemin === entree.path || chemin.startsWith(`${entree.path}/`))
        .sort((x, y) => y.entree.path.length - x.entree.path.length)[0];
};
