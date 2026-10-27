import React, { useEffect, useRef, useState } from 'react';
import MainLayout from '../MainLayout';
import ApiService from '../../services/ApiService';
import { toast } from 'react-toastify';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { SearchBar } from '../../components/ui';

interface RentalVehiclesProps {
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const entete = "px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap";

const francs = (v: unknown) => (v == null || v === '' ? '—' : `${Number(v).toLocaleString('fr-FR')} F`);

/**
 * La flotte de location, en tableau.
 *
 * Vingt véhicules par page : chaque ligne charge une photo. La recherche part
 * au serveur, pour couvrir toute la flotte et pas seulement la page affichée.
 * `?category=` vient du bouton « Véhicules » de la page Catégories : la liste
 * l'ignorait et montrait toute la flotte.
 */
const RentalVehicles: React.FC<RentalVehiclesProps> = ({ onLogout, theme, toggleTheme }) => {
    const api = new ApiService();
    const navigate = useNavigate();
    const [parametres, setParametres] = useSearchParams();
    const categorie = parametres.get('category');

    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [pagination, setPagination] = useState<any>(null);
    const [recherche, setRecherche] = useState<string>('');
    // Le haut de la liste, où revenir en changeant de page.
    const haut = useRef<HTMLDivElement>(null);

    const premierePage = (q: string) => {
        const base = categorie ? `location/vehicule/cat/${categorie}` : 'location/vehicule/all';
        const suite = new URLSearchParams({ per_page: '20' });
        // La liste par catégorie ne cherche pas côté serveur : la recherche
        // vaut pour toute la flotte.
        if (q.trim() && !categorie) suite.set('q', q.trim());
        return `${base}?${suite.toString()}`;
    };

    const fetchVehicles = async (url: string, remonter = false) => {
        setLoading(true);
        try {
            const response = await api.getData(url);
            if (response.data.success) {
                setVehicles(response.data.data.data);
                setPagination(response.data.data);
                // Le défilement se fait dans la mise en page, pas la fenêtre :
                // on vise l'élément plutôt que `window.scrollTo`.
                if (remonter) haut.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                toast.error("Erreur lors du chargement de la flotte");
            }
        } catch (error) {
            toast.error("Erreur serveur/connexion");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Une recherche part une fois la frappe posée, pas à chaque lettre.
    useEffect(() => {
        const minuteur = setTimeout(() => fetchVehicles(premierePage(recherche)), recherche ? 350 : 0);
        return () => clearTimeout(minuteur);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recherche, categorie]);

    const nomCategorie = vehicles[0]?.categorie?.libelle;

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div ref={haut} className="px-4 md:px-8 py-6 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Véhicules de location</h1>
                        {pagination && (
                            <span className="bg-primary/10 text-primary dark:text-primary-fixed-dim px-2.5 py-1 rounded-lg text-xs font-black tabular-nums">
                                {pagination.total}
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Link
                            to="/rental-categories"
                            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[20px]">category</span>
                            Catégories
                        </Link>
                        <Link
                            to="/rental-vehicles/add"
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 dark:bg-primary-container dark:hover:bg-primary-container/90 transition-colors disabled:opacity-40 flex items-center gap-2 w-full sm:w-auto justify-center"
                        >
                            <span className="material-symbols-outlined text-[23px]">add_box</span>
                            Ajouter un véhicule
                        </Link>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {categorie ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary dark:text-blue-300 px-3 py-1.5 text-sm font-semibold">
                            Catégorie : {nomCategorie ?? `#${categorie}`}
                            <button
                                type="button"
                                aria-label="Retirer le filtre de catégorie"
                                onClick={() => setParametres({})}
                                className="material-symbols-outlined text-[18px] hover:opacity-70"
                            >
                                close
                            </button>
                        </span>
                    ) : (
                        <SearchBar
                            value={recherche}
                            onChange={setRecherche}
                            placeholder="Rechercher un modèle, une plaque, une agence…"
                            className="max-w-md flex-1 min-w-[240px]"
                        />
                    )}
                </div>
            </div>

            <div className="p-4 md:p-8 pt-0 md:pt-0">
                {loading && vehicles.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                        {Array(6).fill(0).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-5 py-3">
                                <div className="w-16 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse shrink-0" />
                                <div className="h-3 w-40 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                                <div className="h-3 flex-1 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                            </div>
                        ))}
                    </div>
                ) : vehicles.length === 0 ? (
                    <div className="py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-5xl opacity-30">no_crash</span>
                        <p className="font-bold text-slate-700 dark:text-slate-200">
                            {recherche ? `Aucun véhicule ne correspond à « ${recherche} »` : 'Aucun véhicule'}
                        </p>
                        {recherche && (
                            <button type="button" onClick={() => setRecherche('')} className="text-xs font-bold text-primary hover:underline">
                                Réinitialiser la recherche
                            </button>
                        )}
                    </div>
                ) : (
                    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-opacity ${loading ? 'opacity-60' : ''}`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[940px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className={entete}>Véhicule</th>
                                        <th className={entete}>Catégorie</th>
                                        <th className={entete}>Agence</th>
                                        <th className={entete}>Caractéristiques</th>
                                        <th className={`${entete} text-right`}>Prix / jour</th>
                                        <th className={entete}>Statut</th>
                                        <th className={`${entete} text-right`}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {vehicles.map((v: any) => {
                                        const libre = v.status === 'LIBRE';
                                        return (
                                            <tr
                                                key={v.id}
                                                onClick={() => navigate(`/rental-vehicles/edit/${v.id}`)}
                                                className="cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                                            >
                                                <td className="px-5 py-2.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-16 h-11 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center">
                                                            {v.image ? (
                                                                <img src={v.image} alt="" loading="lazy" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="material-symbols-outlined text-xl text-slate-300 dark:text-slate-600">local_taxi</span>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">{v.modele || v.libelle || 'Modèle inconnu'}</p>
                                                            <span className="mt-1 inline-block rounded border border-slate-200 dark:border-slate-700 px-1.5 text-[11px] font-bold tracking-wider text-slate-500">
                                                                {v.matricule || 'Sans plaque'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-2.5 text-sm text-slate-700 dark:text-slate-300">{v.categorie?.libelle || '—'}</td>
                                                <td className="px-5 py-2.5">
                                                    <p className="text-sm text-slate-700 dark:text-slate-300">{v.agence?.libelle || '—'}</p>
                                                    <p className="text-xs text-slate-500">{v.agence?.ville || ''}</p>
                                                </td>
                                                <td className="px-5 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">
                                                    {v.nb_place || 4} places · {Number(v.is_clim) ? 'Clim' : 'Non clim'} · {Number(v.is_auto) ? 'Auto' : 'Manuelle'}
                                                </td>
                                                <td className="px-5 py-2.5 text-right whitespace-nowrap tabular-nums">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{francs(v.montant)}</p>
                                                    {v.montant_hors_ville ? (
                                                        <p className="text-xs text-slate-500">hors ville {francs(v.montant_hors_ville)}</p>
                                                    ) : null}
                                                </td>
                                                <td className="px-5 py-2.5">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            libre
                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                                                        }`}
                                                    >
                                                        {libre ? 'Libre' : v.status === 'OCCUPE' ? 'Occupé' : v.status || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <Link
                                                        to={`/rental-vehicles/edit/${v.id}`}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">edit</span>
                                                        Modifier
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Pagination : le total toujours, les pages dès qu'il y en a plusieurs */}
                {pagination && pagination.total > 0 && (
                    <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                            {pagination.from} à {pagination.to} sur {pagination.total} véhicule{pagination.total > 1 ? 's' : ''}
                        </p>
                        {pagination.last_page > 1 && (
                            <div className="flex flex-wrap justify-end gap-1.5">
                                {pagination.links.map((link: any, i: number) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => link.url && fetchVehicles(link.url, true)}
                                        disabled={!link.url || link.active}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            link.active
                                                ? 'bg-primary text-white'
                                                : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800'
                                        } ${!link.url ? 'opacity-30 cursor-not-allowed' : ''}`}
                                        dangerouslySetInnerHTML={{ __html: link.label.includes('Previous') ? '‹ Précédent' : link.label.includes('Next') ? 'Suivant ›' : link.label }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default RentalVehicles;
