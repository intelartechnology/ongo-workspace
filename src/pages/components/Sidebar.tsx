import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ChevronUp, LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import ApiService from '../../services/ApiService';
import { ACCUEIL, ANNONCES, GROUPES, REGLAGES, type Entree } from './navigation';
import { useHylana } from '../assistant/HylanaContext';
import { basculerMenu, setSurvolMenu, useMenuReduit, useSurvolMenu } from './menuReduit';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    user: any;
    onLogout: () => void;
}

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
     * La pastille d'une entrée : teintée et cerclée plutôt que pleine.
     *
     * Un disque orange plein criait plus fort que le libellé qu'il annotait.
     * Teintée, elle se voit sans voler la ligne.
     */
    const pastille = (nombre: number) => (
        <span className="ml-auto min-w-[22px] px-1.5 py-px rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-semibold text-center tabular-nums">
            {nombre}
        </span>
    );

    /** Les entrées de premier niveau — tableau de bord, réglages : une icône nue, un libellé. */
    const lien = (item: Entree) => {
        const actif = location.pathname === item.path;

        return (
            <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-[14px] transition-colors ${
                    actif
                        ? 'bg-slate-100 dark:bg-slate-800/70 text-primary dark:text-primary-fixed-dim font-semibold'
                        : 'text-slate-800 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
            >
                <item.icon className="size-[19px] shrink-0" strokeWidth={actif ? 2.25 : 1.75} />
                <span className="truncate">{item.label}</span>
            </Link>
        );
    };

    /*
     * Une entrée sous un titre de famille : pas d'icône, un point sur le rail.
     *
     * Un disque par ligne faisait trente pictogrammes à la file, qui se
     * valaient tous ; c'est le titre du groupe qui porte l'icône, une fois. Le
     * point, posé sur le rail, dit l'appartenance — et c'est lui, avec le
     * libellé, qui prend la couleur sur la page ouverte.
     */
    const sousLien = (item: Entree) => {
        const actif = location.pathname === item.path;

        return (
            <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`relative flex items-center gap-2 pl-10 pr-2.5 py-[7px] rounded-lg text-[14px] transition-colors ${
                    actif
                        ? 'bg-slate-100 dark:bg-slate-800/70 text-primary dark:text-primary-fixed-dim font-semibold'
                        : 'text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
                <span
                    className={`absolute left-[17px] top-1/2 -translate-y-1/2 size-[7px] rounded-full ring-2 ring-white dark:ring-slate-900 ${
                        actif ? 'bg-primary dark:bg-primary-fixed-dim' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                />
                <span className="truncate">{item.label}</span>

                {/* La pastille ne s'affiche qu'avec un nombre : « 0 à relire »
                    attirerait l'œil pour rien, tous les jours. */}
                {item.badge === 'reviews' && aRelire > 0 && pastille(aRelire)}
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

    // La première lettre du nom, comme sur tous les avatars sans photo.
    const initiale = (user?.nom || user?.prenom || 'O').trim().charAt(0).toUpperCase();

    /*
     * Hylana ouverte en grand : le menu se réduit à une colonne d'icônes.
     *
     * Comme l'agent de Hostinger, l'assistant prend la place et le menu reste
     * à portée : un clic sur une famille ferme Hylana et ouvre sa première page.
     */
    const hylana = useHylana();
    const navigate = useNavigate();
    // Réduit au choix de l'utilisateur, ou imposé par Hylana ouverte en grand.
    const choisi = useMenuReduit();
    const impose = Boolean(hylana?.ouverte && hylana.mode === 'grand');
    const reduit = choisi || impose;

    /*
     * Réduit, le menu se déplie au survol et pousse la page comme un menu
     * ouvert, puis se replie quand la souris s'en va. Un court délai évite qu'il
     * s'ouvre au simple passage vers le bord de l'écran.
     */
    const survol = useSurvolMenu();
    const setSurvol = setSurvolMenu;
    const minuteur = useRef<number | undefined>(undefined);
    const entrer = () => {
        window.clearTimeout(minuteur.current);
        minuteur.current = window.setTimeout(() => setSurvol(true), 150);
    };
    const sortir = () => {
        window.clearTimeout(minuteur.current);
        minuteur.current = window.setTimeout(() => setSurvol(false), 200);
    };
    useEffect(() => () => {
        window.clearTimeout(minuteur.current);
        setSurvolMenu(false);
    }, []);
    useEffect(() => {
        if (!reduit) setSurvol(false);
    }, [reduit]);
    const deplie = reduit && survol;

    const COURTS: Record<string, string> = { courses: 'Courses', covoiturage: 'Covoit.', eat: 'Eat', location: 'Location', comptes: 'Comptes', finance: 'Finance' };
    const rail = [
        { cle: 'accueil', icone: ACCUEIL.icon, libelle: 'Accueil', chemin: ACCUEIL.path, actif: location.pathname === ACCUEIL.path },
        ...GROUPES.map((g) => ({ cle: g.cle, icone: g.icon, libelle: COURTS[g.cle] ?? g.titre, chemin: g.entrees[0]?.path ?? '/', actif: groupeCourant === g.cle })),
        { cle: 'annonces', icone: ANNONCES.icon, libelle: 'Annonces', chemin: ANNONCES.path, actif: location.pathname === ANNONCES.path },
        { cle: 'reglages', icone: REGLAGES.icon, libelle: 'Réglages', chemin: REGLAGES.path, actif: location.pathname === REGLAGES.path },
    ];

    return (
        <>
            {reduit && (
                <nav aria-label="Menu réduit" onMouseEnter={entrer} onMouseLeave={sortir} className="hidden lg:flex fixed inset-y-0 left-0 z-[60] w-20 flex-col items-center gap-1 border-r border-slate-200 bg-white pt-3 dark:border-slate-800 dark:bg-slate-900">
                    <img src="/logo.png" alt="Ongo 237" className="mb-3 h-7 w-auto object-contain" />
                    {rail.map((r) => (
                        <button
                            key={r.cle}
                            type="button"
                            title={r.libelle}
                            onClick={() => {
                                hylana?.fermer();
                                navigate(r.chemin);
                            }}
                            className={`flex w-[68px] flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors ${
                                r.actif ? 'bg-slate-100 text-primary dark:bg-slate-800/70 dark:text-primary-fixed-dim' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
                            }`}
                        >
                            <r.icone className="size-5" strokeWidth={r.actif ? 2.25 : 1.75} />
                            <span className="truncate">{r.libelle}</span>
                        </button>
                    ))}
                </nav>
            )}

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
                    ${reduit && !deplie ? 'lg:hidden' : ''}
                    ${deplie ? 'lg:z-[70]' : ''}
                `}
                onMouseEnter={deplie ? entrer : undefined}
                onMouseLeave={deplie ? sortir : undefined}
                onClick={(e) => {
                    // Déplié au survol par-dessus Hylana : choisir une page la ferme.
                    if (deplie && (e.target as HTMLElement).closest('a')) {
                        if (impose) hylana?.fermer();
                        setSurvol(false);
                    }
                }}
            >
                <div className="px-3 pt-4 pb-3 flex items-center gap-2">
                    {/* L'identité dans une carte : elle se détache du menu qu'elle coiffe. */}
                    <div className="flex-1 min-w-0 flex items-center gap-3 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                        <div className="size-9 shrink-0 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 grid place-items-center">
                            <img src="/logo.png" alt="Ongo 237" className="h-6 w-auto object-contain" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-[14px] font-bold tracking-tight text-slate-900 dark:text-white leading-none truncate">
                                Ongo 237
                            </h1>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Back-office</p>
                        </div>
                    </div>

                    {/* Réduire le menu à ses icônes ; déplié au survol, le garder ouvert.
                        Avec Hylana en grand, le menu reste réduit : pas de bouton. */}
                    {!(deplie && impose) && (
                        <button
                            type="button"
                            onClick={basculerMenu}
                            title={deplie ? 'Garder le menu ouvert' : 'Réduire le menu'}
                            aria-label={deplie ? 'Garder le menu ouvert' : 'Réduire le menu'}
                            className="hidden lg:grid size-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                            {deplie ? <PanelLeftOpen className="size-[18px]" strokeWidth={1.75} /> : <PanelLeftClose className="size-[18px]" strokeWidth={1.75} />}
                        </button>
                    )}

                    <button
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <nav
                    ref={colonne}
                    onScroll={(evenement) => {
                        positionDuMenu = evenement.currentTarget.scrollTop;
                    }}
                    className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto custom-scrollbar"
                >
                    {lien(ACCUEIL)}

                    <div className="h-2" />

                    {GROUPES.map((groupe) => {
                        const deplie = ouverts.includes(groupe.cle);

                        return (
                            <div key={groupe.cle}>
                                <button
                                    onClick={() => basculer(groupe.cle)}
                                    /*
                                     * Le titre de famille, en retrait.
                                     *
                                     * Gris et sans graisse, il annonce sans concurrencer
                                     * les entrées : c'est elles qu'on vient chercher. Son
                                     * icône est la seule du groupe, et elle désigne à
                                     * elle seule toute la famille.
                                     */
                                    className="w-full flex items-center gap-3 px-2.5 py-2 mt-3 rounded-lg text-[14px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                    <groupe.icon className="size-[19px] shrink-0" strokeWidth={1.75} />
                                    <span className="truncate">{groupe.titre}</span>
                                    <ChevronUp
                                        className={`size-4 ml-auto transition-transform ${deplie ? '' : 'rotate-180'}`}
                                        strokeWidth={2}
                                    />
                                </button>

                                {/* Le rail : il tient ensemble les entrées d'une même famille,
                                    aligné sous l'icône du titre. Sans lui, un groupe ouvert se
                                    confond avec la suite du menu dès qu'on l'a fait défiler. */}
                                {deplie && (
                                    <div className="relative space-y-0.5 pt-0.5 pb-1 before:absolute before:left-[20px] before:top-1 before:bottom-3 before:w-px before:bg-slate-200 dark:before:bg-slate-700">
                                        {groupe.entrees.map((entree) => sousLien(entree))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <div className="h-4" />

                    {/* Ce qui vaut pour toute la plateforme : ni Eat, ni courses. */}
                    {lien(ANNONCES)}
                    {lien(REGLAGES)}
                </nav>

                <div className="p-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        {/* Les initiales : une photo codée en dur montrait le
                            même visage à tout le monde. */}
                        <div className="size-8 shrink-0 rounded-full bg-primary/10 text-primary dark:bg-primary-fixed-dim/15 dark:text-primary-fixed-dim ring-2 ring-white dark:ring-slate-900 grid place-items-center text-[12px] font-bold">
                            {initiale}
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
                            className="size-8 grid place-items-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
                        >
                            <LogOut className="size-[18px]" strokeWidth={1.75} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
