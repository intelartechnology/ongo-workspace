import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, CornerDownLeft, Menu, Moon, Search, Sparkles, Sun } from 'lucide-react';
import { useHylana } from '../assistant/HylanaContext';
import { ACCUEIL, ASSISTANT, GROUPES, REGLAGES, trouverPage, type Entree } from './navigation';

interface HeaderProps {
    onToggleSidebar: () => void;
    onToggleTheme: () => void;
    theme: 'light' | 'dark';
}

/** Toutes les pages du menu, avec la famille qui les range. */
const PAGES: { entree: Entree; famille?: string }[] = [
    { entree: ACCUEIL },
    { entree: ASSISTANT },
    ...GROUPES.flatMap((groupe) => groupe.entrees.map((entree) => ({ entree, famille: groupe.titre }))),
    { entree: REGLAGES },
];

/** « Réservations » se trouve en tapant « reservation » : ni accent ni casse. */
const normaliser = (texte: string) =>
    texte
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onToggleTheme, theme }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const hylana = useHylana();

    /*
     * Le titre suit la page.
     *
     * Il disait « Tableau de bord » partout, jusque sur la fiche d'un
     * chauffeur. Sans fil d'Ariane au-dessus : le menu montre déjà la famille
     * ouverte.
     */
    const courante = trouverPage(location.pathname);

    // La date du jour : elle était écrite en dur, « 12 Octobre 2023 ».
    const aujourdhui = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(
        new Date(),
    );

    /*
     * La recherche mène à une page.
     *
     * Le champ ne faisait rien. Avec une quarantaine d'écrans répartis en six
     * familles, ce qu'on cherche le plus souvent, c'est l'écran lui-même : on
     * tape « promo », on arrive sur les codes promo, sans ouvrir Ongo Eat.
     */
    const [requete, setRequete] = useState('');
    const [ouvert, setOuvert] = useState(false);
    const [selection, setSelection] = useState(0);
    const champ = useRef<HTMLInputElement | null>(null);

    const resultats = useMemo(() => {
        const cherche = normaliser(requete.trim());
        if (!cherche) return [];

        return PAGES.filter(
            ({ entree, famille }) =>
                normaliser(entree.label).includes(cherche) || normaliser(famille ?? '').includes(cherche),
        ).slice(0, 8);
    }, [requete]);

    // ⌘K / Ctrl+K, comme partout ailleurs.
    useEffect(() => {
        const raccourci = (evenement: KeyboardEvent) => {
            if ((evenement.metaKey || evenement.ctrlKey) && evenement.key.toLowerCase() === 'k') {
                evenement.preventDefault();
                champ.current?.focus();
            }
        };

        window.addEventListener('keydown', raccourci);
        return () => window.removeEventListener('keydown', raccourci);
    }, []);

    const aller = (entree: Entree) => {
        navigate(entree.path);
        setRequete('');
        setOuvert(false);
        champ.current?.blur();
    };

    const auClavier = (evenement: React.KeyboardEvent<HTMLInputElement>) => {
        if (evenement.key === 'ArrowDown') {
            evenement.preventDefault();
            setSelection((i) => Math.min(i + 1, resultats.length - 1));
        } else if (evenement.key === 'ArrowUp') {
            evenement.preventDefault();
            setSelection((i) => Math.max(i - 1, 0));
        } else if (evenement.key === 'Enter' && resultats[selection]) {
            aller(resultats[selection].entree);
        } else if (evenement.key === 'Escape') {
            setRequete('');
            champ.current?.blur();
        }
    };

    const bouton =
        'size-9 grid place-items-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors';

    return (
        <header className="h-16 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 px-4 md:px-8 sticky top-0 z-40 transition-colors duration-300">
            <button onClick={onToggleSidebar} className={`lg:hidden -ml-1 ${bouton}`} title="Menu">
                <Menu className="size-5" />
            </button>

            <div className="min-w-0 flex-1">
                <h2 className="text-base md:text-[17px] font-bold tracking-tight text-slate-900 dark:text-white truncate leading-tight">
                    {courante?.entree.label ?? 'Ongo 237'}
                </h2>
            </div>

            <div className="hidden xl:flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 font-medium">
                <CalendarDays className="size-4" strokeWidth={1.75} />
                <span className="whitespace-nowrap first-letter:uppercase">{aujourdhui}</span>
            </div>

            <div className="relative hidden sm:block">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                    ref={champ}
                    value={requete}
                    onChange={(evenement) => {
                        setRequete(evenement.target.value);
                        setSelection(0);
                        setOuvert(true);
                    }}
                    onFocus={() => setOuvert(true)}
                    // Assez tard pour qu'un clic sur un résultat passe avant.
                    onBlur={() => setTimeout(() => setOuvert(false), 120)}
                    onKeyDown={auClavier}
                    placeholder="Aller à une page…"
                    type="text"
                    className="w-44 md:w-56 lg:w-72 h-9 pl-9 pr-12 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-primary dark:focus:border-primary-fixed-dim focus:ring-2 focus:ring-primary/15 transition-all"
                />
                <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px] font-semibold text-slate-400 pointer-events-none">
                    ⌘K
                </kbd>

                {ouvert && requete.trim() !== '' && (
                    <div className="absolute right-0 top-full mt-2 w-full min-w-[280px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5">
                        {resultats.length === 0 ? (
                            <p className="px-3 py-2.5 text-sm text-slate-500">Aucune page ne correspond.</p>
                        ) : (
                            resultats.map(({ entree, famille }, index) => (
                                <button
                                    key={entree.path}
                                    // `onMouseDown` : avant que le champ ne perde le focus.
                                    onMouseDown={(evenement) => {
                                        evenement.preventDefault();
                                        aller(entree);
                                    }}
                                    onMouseEnter={() => setSelection(index)}
                                    className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left text-sm ${
 index === selection
 ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
 : 'text-slate-700 dark:text-slate-300'
 }`}
                                >
                                    <entree.icon className="size-4 shrink-0 text-slate-400" strokeWidth={1.75} />
                                    <span className="truncate font-medium">{entree.label}</span>
                                    {famille && <span className="ml-auto text-[12px] text-slate-400 truncate">{famille}</span>}
                                    {index === selection && <CornerDownLeft className="size-3.5 shrink-0 text-slate-400" />}
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/*
              * La cloche est partie : elle n'ouvrait rien, et sa pastille rouge
              * annonçait du nouveau à chaque visite.
              */}
            {/* Hylana, comme le bouton « Agent » de Hostinger : une pastille et son nom.
                Sur téléphone, la pastille seule. ⌘J ou Ctrl+J l'ouvre aussi. */}
            {hylana && (
                <button
                    type="button"
                    onClick={() => hylana.basculer()}
                    title="Hylana, l'assistante de pilotage (⌘J)"
                    aria-pressed={hylana.ouverte}
                    className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full border bg-white pl-1 pr-1 text-[13.5px] font-bold text-slate-900 transition-colors hover:bg-slate-50 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800 sm:pr-3.5 ${
                        hylana.ouverte ? 'border-[#3d5fd9] ring-[3px] ring-[#eceffd] dark:ring-[#1c2a4d]' : 'border-slate-200 dark:border-slate-700'
                    }`}
                >
                    <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-[#10377b] to-[#3d5fd9] text-white">
                        <Sparkles className="size-[15px]" strokeWidth={2} />
                    </span>
                    <span className="hidden sm:inline">Hylana</span>
                </button>
            )}

            <button
                onClick={onToggleTheme}
                className={bouton}
                title={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
            >
                {theme === 'light' ? <Moon className="size-[18px]" strokeWidth={1.75} /> : <Sun className="size-[18px]" strokeWidth={1.75} />}
            </button>
        </header>
    );
};

export default Header;
