import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import ApiService from '../../services/ApiService';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    user: any;
    onLogout: () => void;
}

interface Entree {
    icon: string;
    label: string;
    path: string;
    badge?: 'reviews';
}

interface Groupe {
    cle: string;
    titre: string;
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
const GROUPES: Groupe[] = [
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
        entrees: [
            { icon: 'restaurant', label: 'Tableau de bord', path: '/eat' },
            { icon: 'local_mall', label: 'Boutiques', path: '/eat-stores' },
            { icon: 'storefront', label: 'Marchands', path: '/merchants' },
            // La régie : ce qu'un marchand propose et qui attend une décision.
            // Sans cette entrée, une campagne dort dans une liste que personne
            // n'ouvre — et derrière, c'est quelqu'un qui a payé et qui attend.
            { icon: 'campaign', label: 'Sponsorings', path: '/eat-sponsorships', badge: 'reviews' },
            // A qui les mises en avant s'adressent. Juste apres les
            // sponsorings : c'est en composant une operation qu'on decouvre
            // qu'on voudrait viser ceux qui aiment les grillades.
            { icon: 'group', label: 'Audiences', path: '/eat-audiences' },
            { icon: 'payments', label: 'Reversements', path: '/eat-payouts' },
            // La tresorerie : le livre d'Ongo, qu'aucun ecran ne lisait. Le
            // tableau de bord recalcule ; ici on lit ce qui est ecrit.
            { icon: 'account_balance', label: 'Trésorerie', path: '/eat-treasury' },
            // Qui livre pour Ongo : la liste que la repartition consultait sans
            // que personne ne puisse l'ecrire.
            { icon: 'two_wheeler', label: 'Livreurs', path: '/eat-couriers' },
            { icon: 'sell', label: 'Codes promo', path: '/eat-promo-codes' },
            // La mosaique se regle a trois endroits ; elle se lit ici.
            { icon: 'grid_view', label: 'Mosaïque', path: '/eat-mosaic' },
            { icon: 'view_agenda', label: 'Rubriques', path: '/eat-sections' },
            { icon: 'view_carousel', label: 'Bannières', path: '/eat-banners' },
            { icon: 'link', label: 'Pages de redirection', path: '/eat-redirects' },
            { icon: 'category', label: 'Catégories', path: '/eat-categories' },
            { icon: 'ramen_dining', label: 'Cuisines', path: '/eat-tags' },
            { icon: 'filter_list', label: 'Filtres', path: '/eat-filters' },
            { icon: 'public', label: 'Zones de service', path: '/eat-service-areas' },
            { icon: 'credit_card', label: 'Moyens de paiement', path: '/eat-payment-methods' },
            { icon: 'photo_library', label: 'Galerie', path: '/eat-gallery' },
        ],
    },
    {
        cle: 'courses',
        titre: 'Courses et flotte',
        entrees: [
            { icon: 'directions_car', label: 'Courses', path: '/courses' },
            { icon: 'person_outline', label: 'Chauffeurs', path: '/drivers' },
            { icon: 'car_rental', label: 'Véhicules', path: '/vehicles' },
            { icon: 'person_search', label: 'Demandes', path: '/requests' },
        ],
    },
    {
        cle: 'covoiturage',
        titre: 'Covoiturage',
        entrees: [
            { icon: 'groups', label: 'Activité', path: '/carpool' },
            { icon: 'how_to_reg', label: 'Covoitureurs', path: '/carpoolers' },
            { icon: 'currency_exchange', label: 'Remboursements', path: '/carpool-refunds' },
        ],
    },
    {
        cle: 'location',
        titre: 'Location',
        entrees: [
            { icon: 'calendar_month', label: 'Réservations', path: '/rentals' },
            { icon: 'directions_car_filled', label: 'Véhicules', path: '/rental-vehicles' },
            { icon: 'category', label: 'Catégories', path: '/rental-categories' },
        ],
    },
    {
        cle: 'comptes',
        titre: 'Comptes',
        entrees: [
            { icon: 'group', label: 'Utilisateurs', path: '/users' },
            // Avertir, bloquer, rendre un compte : un seul endroit, à côté de
            // la liste des utilisateurs, là où on vient les chercher.
            { icon: 'gavel', label: 'Modération', path: '/moderation' },
            { icon: 'handshake', label: 'Partenaires', path: '/partners' },
            { icon: 'volunteer_activism', label: 'Contributeurs', path: '/contributors' },
        ],
    },
    {
        cle: 'finance',
        titre: 'Finance',
        entrees: [{ icon: 'payments', label: 'Transactions', path: '/transactions' }],
    },
];

/** Ce que les groupes dépliés d'une session gardent d'une visite à l'autre. */
const MEMOIRE = 'ongo.sidebar.ouverts';

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, user, onLogout }) => {
    const location = useLocation();

    /*
     * Ce qui attend une décision, relu à chaque changement de page.
     *
     * Deux `count` sur un index : assez léger pour être demandé partout, et
     * c'est le seul moyen qu'une proposition ne dorme pas trois jours. Un
     * échec ne se signale pas — une pastille absente vaut mieux qu'une
     * fenêtre d'erreur sur un écran qui parle d'autre chose.
     */
    const [aRelire, setARelire] = useState<number>(0);

    useEffect(() => {
        new ApiService()
            .getData('v3/admin/eat/reviews/pending')
            .then(({ data }) => setARelire(data?.success ? (data.data?.total ?? 0) : 0))
            .catch(() => setARelire(0));
    }, [location.pathname]);

    /** Le groupe où se trouve la page ouverte. */
    const groupeCourant = useMemo(
        () => GROUPES.find((g) => g.entrees.some((e) => e.path === location.pathname))?.cle,
        [location.pathname],
    );

    /*
     * Les groupes se replient.
     *
     * Trente entrées dépliées font une liste qu'on balaie au lieu de la lire,
     * et la moitié demande un défilement. Repliées, il en reste huit — et
     * celle qu'on regarde est toujours ouverte.
     */
    const [ouverts, setOuverts] = useState<string[]>(() => {
        try {
            const garde = localStorage.getItem(MEMOIRE);

            return garde ? (JSON.parse(garde) as string[]) : ['eat'];
        } catch {
            return ['eat'];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(MEMOIRE, JSON.stringify(ouverts));
        } catch {
            // Un navigateur qui refuse le stockage ne doit pas casser le menu.
        }
    }, [ouverts]);

    const basculer = (cle: string) =>
        setOuverts((precedent) => (precedent.includes(cle) ? precedent.filter((c) => c !== cle) : [...precedent, cle]));

    const lien = (item: Entree) => {
        const actif = location.pathname === item.path;

        return (
            <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 pl-3 pr-2 py-2 rounded-lg text-[13.5px] transition-colors ${
                    actif
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
                <span
                    className="material-symbols-outlined text-[20px] shrink-0"
                    style={{ fontVariationSettings: actif ? "'FILL' 1" : "'FILL' 0" }}
                >
                    {item.icon}
                </span>
                <span className="truncate">{item.label}</span>

                {/* La pastille ne s'affiche qu'avec un nombre : « 0 à relire »
                    attirerait l'œil pour rien, tous les jours. */}
                {item.badge === 'reviews' && aRelire > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white">
                        {aRelire}
                    </span>
                )}
            </Link>
        );
    };

    const initiales = user ? `${user.nom?.[0] ?? ''}${user.prenom?.[0] ?? ''}`.toUpperCase() : 'O';

    return (
        <>
            {/* Le voile, sur petit écran seulement. Il reste sous le menu qu'il assombrit. */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 lg:hidden transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside
                className={`
                    w-[268px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
                    flex flex-col fixed h-full z-[60] transition-transform duration-300
                    ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                <div className="px-5 py-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <img src="/logo.png" alt="Ongo 237" className="h-9 w-auto object-contain shrink-0" />
                        <div className="min-w-0">
                            <h1 className="text-[17px] font-bold tracking-tight text-slate-900 dark:text-white leading-none truncate">
                                Ongo 237
                            </h1>
                            <p className="text-[11px] text-slate-400 mt-1 font-medium">Back-office</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {lien({ icon: 'grid_view', label: 'Tableau de bord', path: '/dashboard' })}

                    <div className="h-2" />

                    {GROUPES.map((groupe) => {
                        // Le groupe de la page ouverte se déplie, même replié à
                        // la main : on ne cache pas à quelqu'un où il se trouve.
                        const deplie = ouverts.includes(groupe.cle) || groupeCourant === groupe.cle;

                        return (
                            <div key={groupe.cle}>
                                <button
                                    onClick={() => basculer(groupe.cle)}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                >
                                    <span className="truncate">{groupe.titre}</span>
                                    <span
                                        className={`material-symbols-outlined text-[18px] ml-auto transition-transform ${deplie ? 'rotate-180' : ''}`}
                                    >
                                        expand_more
                                    </span>
                                </button>

                                {deplie && <div className="space-y-0.5 pb-1">{groupe.entrees.map(lien)}</div>}
                            </div>
                        );
                    })}

                    <div className="h-2" />

                    {/* Les réglages de la plateforme entière : ni Eat, ni courses. */}
                    {lien({ icon: 'tune', label: 'Réglages', path: '/settings' })}
                </nav>

                <div className="p-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        {/* Les initiales : une photo codée en dur montrait le
                            même visage à tout le monde. */}
                        <div className="size-9 shrink-0 rounded-full bg-primary/10 text-primary grid place-items-center text-[13px] font-bold">
                            {initiales || 'O'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                                {user ? `${user.nom ?? ''} ${user.prenom || ''}`.trim() : 'Ongo Admin'}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                                {user ? user.email : 'admin@ongo237.com'}
                            </p>
                        </div>
                        <button
                            onClick={onLogout}
                            title="Se déconnecter"
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">logout</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
