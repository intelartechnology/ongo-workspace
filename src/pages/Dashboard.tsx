import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ApiService from '../services/ApiService';
import Helpers from '../functions/helpers';
import MainLayout from './MainLayout';
import Trajet from './components/Trajet';
import Pilotage from './components/Pilotage';

interface DashboardProps {
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

/** Ce que le serveur rend pour une page de courses. */
interface Page {
    data: any[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

const PAGE_VIDE: Page = {
    data: [], current_page: 1, last_page: 1, from: null, to: null,
    total: 0, prev_page_url: null, next_page_url: null,
};

/**
 * Le tableau de bord.
 *
 * **Des panneaux, et non une page de boîtes.** Chaque bloc porte un titre, une
 * action à droite quand il en a une, puis des lignes séparées par un filet :
 * le libellé à gauche en gris, la valeur à droite en encre pleine. C'est la
 * forme qui se lit le plus vite quand on cherche un fait précis, et c'est ce
 * que font les consoles d'hébergement dont s'inspire ce dessin.
 *
 * **Deux mensonges retirés au passage**, qui étaient écrits en dur dans la page
 * précédente :
 *
 *   - les variations des cartes de chiffres (« +12 % », « −2 % ») n'étaient
 *     calculées nulle part. Un chiffre inventé présenté comme mesuré est pire
 *     que pas de chiffre ;
 *   - la pagination annonçait « 1 à 2 sur 248 » quoi qu'il arrive, et ses
 *     boutons ne menaient nulle part. Elle est désormais celle du serveur.
 */
const Dashboard: React.FC<DashboardProps> = ({ onLogout, theme, toggleTheme }) => {
    const navigate = useNavigate();
    const [page, setPage] = useState<Page>(PAGE_VIDE);
    const [loading, setLoading] = useState(false);

    const api = new ApiService();
    const helpers = new Helpers();

    const fetchCourses = async (url = 'course/liste-course', isPag = false) => {
        setLoading(true);
        try {
            const response = await api.getDatawithPagination(url, isPag);
            if (response.data.success) setPage({ ...PAGE_VIDE, ...response.data.data });
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    const handleLogout = () => {
        onLogout();
        navigate('/login');
    };

    const lignes = page.data.filter((item: any) => item?.courses != null);

    /** L'état d'une course, dit par une pastille. */
    const pastille = (texte: string, ton: 'vert' | 'rouge' | 'ambre' | 'gris') => {
        const tons = {
            vert: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
            rouge: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
            ambre: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
            gris: 'bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300',
        };

        return (
            <span className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-bold ${tons[ton]}`}>
                {texte}
            </span>
        );
    };

    return (
        <MainLayout onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="w-full overflow-x-hidden px-4 py-6 md:px-8 md:py-8">
                {/*
                  * Le titre au gabarit des autres écrans.
                  *
                  * Il faisait 32 à 38 pixels, avec un fil d'Ariane au-dessus ;
                  * les autres pages s'en tiennent à 24, et la barre du haut dit
                  * déjà où l'on est. Passer d'un écran à l'autre faisait sauter
                  * le titre de taille.
                  */}
                <header className="mb-8">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Tableau de bord</h1>
                    <p className="text-sm text-slate-500 mt-1">Ce qu'Ongo gagne, les demandes qu'elle perd, et à quel moment.</p>
                </header>

                {/* Les chiffres de décision : période, comparaison, entonnoir,
                    grille horaire. Les cinq cumuls d'avant en avaient deux
                    faux — « Encaissé » comptait des courses, pas des francs. */}
                <div className="mb-10">
                    <Pilotage theme={theme} />
                </div>

                {/* Le panneau des courses. */}
                {/* Le titre de section sort de la carte, comme sur les consoles
                    qui alignent plusieurs blocs : il annonce ce qui suit au lieu
                    d'être enfermé dans une barre d'en-tête. */}
                <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                        <h2 className="text-[20px] font-bold tracking-[-0.02em] text-slate-900 dark:text-white">
                            Dernières courses
                        </h2>
                        <p className="mt-1 text-[14px] text-slate-500 dark:text-slate-400">
                            Livraisons comprises — elles mobilisent les mêmes chauffeurs.
                        </p>
                    </div>
                    <Link
                        to="/courses"
                        className="shrink-0 text-[15px] font-semibold text-slate-900 underline-offset-4 hover:underline dark:text-white"
                    >
                        Tout voir
                    </Link>
                </div>

                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">

                    {/* Sur petit écran : une ligne par course, en pile. Un tableau
                        de huit colonnes ne tient pas, et le faire défiler
                        horizontalement est le meilleur moyen de n'en lire aucune. */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 lg:hidden">
                        {lignes.map((item: any, i: number) => (
                            <div key={i} className="space-y-3 px-5 py-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                            {item.courses.client?.nom} {item.courses.client?.prenom}
                                        </p>
                                        <p className="truncate font-mono text-[11px] text-slate-500">
                                            {item.courses.client?.telephone}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                        {item.est_livraison && pastille('Livraison', 'ambre')}
                                        {pastille(item.courses.statut, item.courses.statut === 'Annulée' ? 'rouge' : 'vert')}
                                    </div>
                                </div>

                                <Trajet depart={item.courses.lieu_depart} arrivee={item.courses.lieu_arrive} largeur="" />

                                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[13px] dark:border-slate-800">
                                    <span className="text-slate-500">
                                        {item.chauffeurs ? `${item.chauffeurs.nom ?? ''} ${item.chauffeurs.prenom ?? ''}`.trim() : 'Aucun chauffeur'}
                                    </span>
                                    <span className="font-bold text-slate-900 dark:text-white">{item.courses.montant} FCFA</span>
                                </div>
                            </div>
                        ))}

                        {lignes.length === 0 && (
                            <p className="px-5 py-10 text-center text-sm text-slate-500">
                                {loading ? 'Chargement…' : 'Aucune course'}
                            </p>
                        )}
                    </div>

                    {/* Sur grand écran : le tableau, en filets fins. */}
                    <div className="hidden lg:block">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800">
                                    {['Client', 'Chauffeur', 'Trajet', 'Quand', 'Montant', 'État'].map((titre) => (
                                        <th
                                            key={titre}
                                            className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                                        >
                                            {titre}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {lignes.map((item: any, i: number) => (
                                    <tr key={i} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                {item.courses.client?.nom} {item.courses.client?.prenom}
                                            </p>
                                            <p className="font-mono text-[11px] text-slate-500">{item.courses.client?.telephone}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.chauffeurs ? (
                                                <>
                                                    <p className="text-sm text-slate-900 dark:text-white">
                                                        {item.chauffeurs.nom} {item.chauffeurs.prenom}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500">
                                                        {item.chauffeurs.vehicules?.[0]?.modele}
                                                        {item.courses.categorie_vehicule?.libelle && ` · ${item.courses.categorie_vehicule.libelle}`}
                                                    </p>
                                                </>
                                            ) : (
                                                /* Dit, et non laissé vide : une cellule blanche se lit comme
                                                   une donnée manquante, alors que c'est un fait — personne
                                                   n'a pris cette course. */
                                                <span className="text-[13px] italic text-slate-400">Aucun</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Trajet depart={item.courses.lieu_depart} arrivee={item.courses.lieu_arrive} />
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <p className="text-[13px] text-slate-900 dark:text-white">{helpers.formaatDate(item.courses.date_depart)}</p>
                                            <p className="text-[11px] text-slate-500">{item.courses.heure_depart}</p>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                                            {item.courses.montant} FCFA
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex flex-col items-start gap-1">
                                                {item.est_livraison && pastille('Livraison', 'ambre')}
                                                {pastille(item.courses.statut, item.courses.statut === 'Annulée' ? 'rouge' : 'vert')}
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {lignes.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                                            {loading ? 'Chargement…' : 'Aucune course'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* La pagination du serveur, et non trois nombres écrits en dur. */}
                    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row md:px-6">
                        <p className="text-[13px] text-slate-500">
                            {page.total > 0 ? (
                                <>
                                    <span className="font-semibold text-slate-900 dark:text-white">{page.from}</span>
                                    {' à '}
                                    <span className="font-semibold text-slate-900 dark:text-white">{page.to}</span>
                                    {' sur '}
                                    <span className="font-semibold text-slate-900 dark:text-white">{page.total}</span>
                                    {' courses'}
                                </>
                            ) : (
                                'Aucune course'
                            )}
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => page.prev_page_url && fetchCourses(page.prev_page_url, true)}
                                disabled={!page.prev_page_url || loading}
                                className="rounded-full bg-slate-100 px-4 py-2 text-[14px] font-semibold text-slate-900 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                            >
                                Précédent
                            </button>
                            <span className="text-[13px] text-slate-500">
                                Page <span className="font-semibold text-slate-900 dark:text-white">{page.current_page}</span> sur {page.last_page}
                            </span>
                            <button
                                onClick={() => page.next_page_url && fetchCourses(page.next_page_url, true)}
                                disabled={!page.next_page_url || loading}
                                className="rounded-full bg-slate-100 px-4 py-2 text-[14px] font-semibold text-slate-900 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                            >
                                Suivant
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </MainLayout>
    );
};

export default Dashboard;
