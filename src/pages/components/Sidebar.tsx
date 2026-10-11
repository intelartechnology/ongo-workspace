import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
            { icon: 'query_stats', label: 'Activité partenaires', path: '/partners/activity' },
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

/*
 * Où en était le défilement du menu.
 *
 * Le menu est rendu par **chaque page** : changer d'écran le détruit et le
 * recrée, et son défilement repart donc du haut. Avec une trentaine d'entrées,
 * celui qui travaillait en bas de la colonne devait redescendre après chaque
 * clic.
 *
 * Gardée hors du composant, cette position survit au démontage sans passer par
 * le stockage du navigateur : c'est un nombre, le temps d'une session, et il
 * n'a aucune raison d'être relu demain.
 *
 * Le vrai remède serait de hisser la mise en page dans le routeur, pour que le
 * menu ne soit monté qu'une fois. Cela touche la soixantaine de routes de
 * `App.tsx` — à faire, mais pas au détour d'une correction de défilement.
 */
let positionDuMenu = 0;

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

    /*
     * Entrer dans un groupe l'ouvre — une fois.
     *
     * Il etait **force** ouvert tant qu'on y etait : le replier ne produisait
     * rien, et le chevron tournait sur un groupe qui ne bougeait pas. On
     * l'ouvre donc en y arrivant, et le toucher reprend la main ensuite.
     *
     * Rejouer cet effet a chaque page du meme groupe le rouvrirait : la cle ne
     * change pas tant qu'on reste dedans, donc l'effet ne se rejoue pas.
     */
    useEffect(() => {
        if (!groupeCourant) return;

        setOuverts((precedent) => (precedent.includes(groupeCourant) ? precedent : [...precedent, groupeCourant]));
    }, [groupeCourant]);

    const basculer = (cle: string) =>
        setOuverts((precedent) => (precedent.includes(cle) ? precedent.filter((c) => c !== cle) : [...precedent, cle]));

    /**
     * Une entree du menu.
     *
     * [sousMenu] la rapetisse d'un cran : sous un titre de famille, elle est
     * deja designee par le rail et par le titre, et un disque de la meme taille
     * que celui des entrees de premier niveau mettait les deux rangs au meme
     * plan.
     */
    const lien = (item: Entree, sousMenu = false) => {
        const actif = location.pathname === item.path;

        return (
            <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                /*
                 * Lisible au repos, distinguee par le relief.
                 *
                 * Les entrees inactives etaient en gris moyen : a treize pixels
                 * et demi, cela se lit comme du flou, et il fallait chercher
                 * chaque ligne au lieu de la parcourir. Les consoles qui font
                 * cela bien gardent **toutes** les entrees en pleine encre et
                 * ne distinguent l'active que par une pastille blanche posee en
                 * relief sur le fond.
                 */
                className={`flex items-center gap-3 px-2.5 ${sousMenu ? 'py-1.5 text-[14px]' : 'py-2 text-[15px]'} rounded-2xl transition-all ${
                    actif
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                        : 'text-slate-800 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
                {/*
                  * L'icone dans un disque, devant chaque entree.
                  *
                  * Posee nue sur le fond gris du menu, elle se confondait avec
                  * lui : a vingt et un pixels et sans contour, un pictogramme
                  * gris sur gris ne se distingue qu'en le cherchant. Le disque
                  * lui donne un fond a elle, et la colonne de disques devient
                  * un repere qu'on balaie du regard sans lire les libelles.
                  *
                  * Plein et colore sur l'entree ouverte, clair sinon : c'est le
                  * seul endroit du menu ou la couleur travaille.
                  */}
                <span
                    className={`flex ${sousMenu ? 'size-7' : 'size-8'} shrink-0 items-center justify-center rounded-full transition-colors ${
                        actif
                            ? 'bg-primary text-white'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                >
                    <span
                        className={`material-symbols-outlined ${sousMenu ? 'text-[15px]' : 'text-[18px]'}`}
                        style={{ fontVariationSettings: actif ? "'FILL' 1" : "'FILL' 0" }}
                    >
                        {item.icon}
                    </span>
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

    /*
     * Reposée avant la première image, et non après.
     *
     * `useEffect` s'exécute une fois l'écran peint : on verrait le menu en haut
     * puis sauter à sa place. `useLayoutEffect` le repose avant que rien ne
     * s'affiche.
     */
    const colonne = useRef<HTMLElement | null>(null);

    useLayoutEffect(() => {
        if (colonne.current) colonne.current.scrollTop = positionDuMenu;
    }, []);

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
                    w-[272px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800
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

                <nav
                    ref={colonne}
                    onScroll={(evenement) => {
                        positionDuMenu = evenement.currentTarget.scrollTop;
                    }}
                    className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto custom-scrollbar"
                >
                    {lien({ icon: 'grid_view', label: 'Tableau de bord', path: '/dashboard' })}

                    <div className="h-2" />

                    {GROUPES.map((groupe) => {
                        const deplie = ouverts.includes(groupe.cle);

                        return (
                            <div key={groupe.cle}>
                                <button
                                    onClick={() => basculer(groupe.cle)}
                                    /*
                                     * Le titre de famille se voit.
                                     *
                                     * En gris moyen et plus petit que les entrees, il passait
                                     * pour une legende : on cherchait « Covoiturage » parmi
                                     * des lignes qui criaient toutes plus fort que lui. Or
                                     * c'est lui qui structure la colonne — il doit se lire le
                                     * premier, et c'est par lui qu'on plie et deplie.
                                     *
                                     * En casse normale malgre tout : les petites capitales
                                     * grasses faisaient une etiquette administrative.
                                     */
                                    className="w-full flex items-center gap-2 px-2.5 py-2.5 mt-3 rounded-lg text-[15px] font-bold tracking-[-0.01em] text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                    <span className="truncate">{groupe.titre}</span>
                                    <span
                                        className={`material-symbols-outlined text-[20px] ml-auto text-slate-500 dark:text-slate-400 transition-transform ${deplie ? 'rotate-180' : ''}`}
                                    >
                                        expand_more
                                    </span>
                                </button>

                                {/* Le rail : il tient ensemble les entrees d'une meme famille.
                                    Sans lui, un groupe ouvert se confond avec la suite du menu
                                    des qu'on l'a fait defiler sous son titre. */}
                                {deplie && (
                                    <div className="ml-[22px] border-l border-slate-300/70 dark:border-slate-700 pl-2 space-y-0.5 pb-1">
                                        {groupe.entrees.map((entree) => lien(entree, true))}
                                    </div>
                                )}
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
