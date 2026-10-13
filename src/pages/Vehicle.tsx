import React, { useEffect, useState } from 'react';
import MainLayout from './MainLayout';
import ApiService from '../services/ApiService';
import moment from 'moment';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import { SearchBar, Select, Button, ActionsMenu, type ActionItem } from "../components/ui";
import { chargerCategories, estLivraison, type CategorieVehicule } from "../services/categories";
import VehicleEditModal from "./components/VehicleEditModal";

interface VehicleProps {
    onLogout?: () => void;
    theme?: 'light' | 'dark';
    toggleTheme?: () => void;
}

const entete = "px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest";

const Vehicle: React.FC<VehicleProps> = ({ onLogout = () => { }, theme = 'light', toggleTheme = () => { } }) => {
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [paginationnext, setPaginationNext] = useState<string | null>(null);
    const [paginationprev, setPaginationPrev] = useState<string | null>(null);
    const [pagination, setPagination] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filtreStatut, setFiltreStatut] = useState<string>('');
    const [filtreCategorie, setFiltreCategorie] = useState<string>('');
    const [catalogue, setCatalogue] = useState<CategorieVehicule[]>([]);
    /** Le véhicule en cours d'édition, ou `null` si la modale est fermée. */
    const [enEdition, setEnEdition] = useState<number | null>(null);

    const Api = React.useMemo(() => new ApiService(), []);

    const getAllVehicles = async (url: string, isPag: boolean, search: string = '') => {
        setLoading(true);
        try {
            const searchParam = search ? `&search=${search}` : '';
            const { data } = await Api.getDatawithPagination(`${url}${searchParam}`, isPag);
            if (data.success) {
                setVehicles(data.data.data);
                setPaginationNext(data.data.next_page_url);
                setPaginationPrev(data.data.prev_page_url);
                setPagination(data.data.links);
            } else {
                // Handle error, e.g., show a toast or alert
                console.error("Failed to fetch vehicles:", data.message);
            }
        } catch (error) {
            console.error("API call failed:", error);
            // Handle network errors or other exceptions
        } finally {
            setLoading(false);
        }
    };





    /**
     * Activer ou désactiver un véhicule.
     *
     * La fonction ne faisait qu'un `console.log` : le bouton « Activer »
     * n'avait aucun effet, en silence. L'endpoint écrit désormais aussi le
     * document de suivi, et rend `tracking_enabled` — un véhicule activé mais
     * non suivi reste invisible sur la carte, ce qu'il faut dire.
     */
    const toggleActivate = async (vehicle: any) => {
        const actif = vehicle.statut !== 'INACTIF';

        const confirmation = await Swal.fire({
            icon: 'question',
            title: actif ? 'Désactiver ce véhicule ?' : 'Activer ce véhicule ?',
            text: actif
                ? `${vehicle.matricule} ne recevra plus de courses et sortira du suivi temps réel.`
                : `${vehicle.matricule} pourra recevoir des courses et sera inscrit au suivi.`,
            showCancelButton: true,
            confirmButtonText: actif ? 'Désactiver' : 'Activer',
            cancelButtonText: 'Annuler',
        });

        if (!confirmation.isConfirmed) return;

        try {
            const { data } = await Api.postData('v2/vehicule/activate-or-desactivate-cab', { vehicule_id: vehicle.id });

            if (!data.success) { toast.error(data.message || 'Action refusée'); return; }

            if (!actif && data.data?.tracking_enabled === false) {
                toast.warn("Véhicule activé, mais non inscrit au suivi : il n'apparaîtra pas sur la carte.");
            } else {
                toast.success(data.message);
            }

            getAllVehicles("vehicule/liste-vehicule-dash", false, searchTerm);
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Connexion au serveur impossible');
        }
    };

    /**
     * Reclasser un véhicule, et fermer le classement.
     *
     * Le partenaire déclare la gamme de son véhicule ; Ongo contrôle. Une
     * fois reclassé, le partenaire ne peut plus y revenir — sans quoi le
     * contrôle n'aurait servi à rien.
     */
    const reclasser = async (vehicle: any) => {
        const actuelle = vehicle.categorie?.id;

        const options = catalogue
            .map((c) => `<option value="${c.id}" ${c.id === actuelle ? 'selected' : ''}>${c.libelle}${estLivraison(c) ? ' — livraison' : ''}</option>`)
            .join('');

        const saisie = await Swal.fire({
            title: `Reclasser ${vehicle.matricule}`,
            html:
                `<p style="font-size:13px;color:#64748b;text-align:left;margin-bottom:10px">` +
                `Gamme actuelle : <b>${vehicle.categorie?.libelle ?? '—'}</b></p>` +
                `<select id="cat" class="swal2-input">${options}</select>` +
                `<p style="font-size:12px;color:#b45309;text-align:left;margin-top:10px">` +
                `Après reclassement, le partenaire ne pourra plus modifier cette gamme lui-même. ` +
                `Les équivalences devenues impossibles seront retirées.</p>`,
            showCancelButton: true,
            confirmButtonText: 'Reclasser',
            cancelButtonText: 'Annuler',
            preConfirm: () => (document.getElementById('cat') as HTMLSelectElement)?.value,
        });

        if (!saisie.isConfirmed || !saisie.value) return;

        try {
            const { data } = await Api.postData(`dashboard/vehicles/${vehicle.id}/reclass`, {
                categorie_id: Number(saisie.value),
            });

            if (data.success) {
                // Le message porte les sous-gammes retirées : on le relaie tel
                // quel plutôt que d'annoncer un succès qui tairait l'effet.
                toast.success(data.message);
                getAllVehicles("vehicule/liste-vehicule-dash", false, searchTerm);
            } else {
                toast.error(data.message || 'Reclassement refusé');
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Connexion au serveur impossible');
        }
    };

    // « Modifier » reste un bouton visible : c'est l'action courante. Le menu
    // ne porte que ce qui s'utilise rarement et se décide.
    const actionsVehicule = (vehicle: any): ActionItem[] => [
        { label: 'Modifier', icon: 'edit', onClick: () => setEnEdition(vehicle.id) },
        // Raccourci : la modale contient aussi le classement, mais ouvrir
        // directement dessus evite de chercher la section.
        { label: 'Reclasser la gamme', icon: 'workspace_premium', onClick: () => reclasser(vehicle) },
        {
            label: vehicle.statut === 'INACTIF' ? 'Activer' : 'Désactiver',
            icon: vehicle.statut === 'INACTIF' ? 'check_circle' : 'block',
            danger: vehicle.statut !== 'INACTIF',
            separatorBefore: true,
            onClick: () => toggleActivate(vehicle),
        },
    ];

    const ExtrackTime = (timestamp: string) => {
        return moment(timestamp).format("HH:mm");
    };

    // Les catégories viennent des véhicules déjà chargés : les lister coûtait
    // sinon un appel de plus pour une information que la page tient déjà.
    const categories = React.useMemo(
        () => [...new Set(vehicles.map((v) => v.categorie?.libelle).filter(Boolean))].sort(),
        [vehicles],
    );

    // Statut et catégorie se filtrent sur la page courante — l'API ne prend
    // que `search`. Le compteur plus bas dit sur quoi porte le tri, pour que
    // l'écart avec le total paginé ne passe pas pour une perte de données.
    const visibles = React.useMemo(
        () => vehicles.filter((v) =>
            (!filtreStatut || v.statut === filtreStatut) &&
            (!filtreCategorie || v.categorie?.libelle === filtreCategorie)),
        [vehicles, filtreStatut, filtreCategorie],
    );

    useEffect(() => {
        getAllVehicles("vehicule/liste-vehicule-dash", false, searchTerm);
    }, [searchTerm]);

    useEffect(() => { chargerCategories().then(setCatalogue); }, []);
    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
                {/* Header */}
                <header className="px-6 py-4">
                    <div className="max-w-[1400px] mx-auto flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mr-auto">
                            Véhicules
                            <span className="ml-2 text-xs font-bold text-slate-400 align-middle">{visibles.length}</span>
                        </h2>

                        <SearchBar
                            size="sm"
                            value={searchTerm}
                            onChange={setSearchTerm}
                            placeholder="Rechercher un véhicule..."
                            minWidth={220}
                            className="flex-none"
                        />
                        <Select size="sm" value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}>
                            <option value="">Tout statut</option>
                            <option value="LIBRE">Libre</option>
                            <option value="OCCUPÉ">Occupé</option>
                            <option value="INACTIVER">Inactivé</option>
                        </Select>
                        <Select size="sm" value={filtreCategorie} onChange={(e) => setFiltreCategorie(e.target.value)}>
                            <option value="">Toute catégorie</option>
                            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                        </Select>
                        {(filtreStatut || filtreCategorie) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                icon="filter_alt_off"
                                onClick={() => { setFiltreStatut(''); setFiltreCategorie(''); }}
                            >
                                Réinitialiser
                            </Button>
                        )}
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                    {/* Modernized Table Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className={entete}>Véhicule</th>
                                        <th className={entete}>Catégorie</th>
                                        <th className={entete}>Chauffeur</th>
                                        <th className={entete}>Statut</th>
                                        <th className={entete}>Mise à jour</th>
                                        <th className={`${entete} text-right`}>Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-6 text-sm text-slate-500 dark:text-slate-400">
                                                Chargement des véhicules...
                                            </td>
                                        </tr>
                                    ) : visibles.length > 0 ? (
                                        visibles.map((vehicle) => (
                                            <tr key={vehicle.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                {/* Matricule et modèle tiennent dans une cellule : ils
                                                    désignent le même objet et se lisent ensemble. */}
                                                <td className="px-4 py-2.5">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{vehicle.matricule}</span>
                                                        <span className="text-[11px] text-slate-500 leading-tight">
                                                            {vehicle.modele}{vehicle.color ? ` · ${vehicle.color}` : ''} · #{vehicle.id}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <div className="flex flex-col items-start gap-1">
                                                        <div className="flex items-center gap-1">
                                                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-primary/10 text-primary">
                                                                {vehicle.categorie?.libelle || '—'}
                                                            </span>
                                                            {/* Reclassé par Ongo : le partenaire ne peut plus y
                                                                revenir, et l'admin doit savoir que c'est déjà tranché. */}
                                                            {vehicle.categorie_locked_at && (
                                                                <span
                                                                    title={`Reclassé le ${new Date(vehicle.categorie_locked_at).toLocaleDateString('fr-FR')}`}
                                                                    className="material-symbols-outlined text-[14px] text-slate-400"
                                                                >
                                                                    lock
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Les gammes acceptées en plus. Sans elles, un véhicule
                                                            ECO recevant une course PREMIUM n'avait aucune
                                                            explication à l'écran. */}
                                                        {(vehicle.subCategories ?? []).length > 0 && (
                                                            <span className="text-[10px] text-slate-500 leading-tight">
                                                                + {(vehicle.subCategories ?? [])
                                                                    .map((sc: any) => sc.category?.libelle)
                                                                    .filter(Boolean)
                                                                    .join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    {vehicle.chauffeur ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{vehicle.chauffeur.nom} {vehicle.chauffeur.prenom}</span>
                                                            <span className="text-[11px] text-slate-500 font-mono leading-tight">{vehicle.chauffeur.telephone}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">Non affecté</span>
                                                    )}
                                                </td>
                                                {/* « En service » doublait la colonne voisine d'une
                                                    seconde pastille : c'est devenu un point sur le statut. */}
                                                <td className="px-4 py-2.5">
                                                    <span
                                                        title={vehicle.is_online ? 'En service' : 'Hors service'}
                                                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${vehicle.statut === 'LIBRE' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : vehicle.statut === 'OCCUPÉ' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400'}`}
                                                    >
                                                        <span className={`w-1.5 h-1.5 rounded-full ${vehicle.is_online ? 'bg-current' : 'bg-current opacity-25'}`}></span>
                                                        {vehicle.statut}
                                                    </span>
                                                </td>
                                                {/* Les trois lignes de date tenaient autant de place que
                                                    le reste de la ligne ; le détail passe en infobulle. */}
                                                <td
                                                    className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap"
                                                    title={`${moment(vehicle.updated_at).format("MMMM DD, YYYY")} à ${ExtrackTime(vehicle.updated_at)}`}
                                                >
                                                    {moment(vehicle.updated_at).fromNow()}
                                                </td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <div className="flex gap-1.5 justify-end">
                                                        <ActionsMenu items={actionsVehicule(vehicle)} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="text-center py-10 text-sm text-slate-500 dark:text-slate-400">
                                                {filtreStatut || filtreCategorie
                                                    ? "Aucun véhicule ne correspond à ces filtres sur cette page."
                                                    : "Aucun véhicule trouvé."}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                {visibles.length} sur {vehicles.length} affichés
                                {filtreStatut || filtreCategorie ? " (filtre sur cette page)" : ""}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    className="p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-400 hover:text-primary transition-colors disabled:opacity-50"
                                    onClick={() => paginationprev && getAllVehicles(paginationprev, true)}
                                    disabled={!paginationprev}
                                >
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                                {pagination.map((link: any, index: number) => (
                                    link.url ? (
                                        <button
                                            key={index}
                                            className={`px-3 py-1 border border-slate-200 dark:border-slate-700 rounded text-sm font-medium ${link.active ? 'bg-primary text-white dark:bg-primary-container' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                            onClick={() => getAllVehicles(link.url, true)}
                                        >
                                            {link.label}
                                        </button>
                                    ) : (
                                        <span key={index} className="px-3 py-1 text-sm font-medium text-slate-400">{link.label}</span>
                                    )
                                ))}
                                <button
                                    className="p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-400 hover:text-primary transition-colors disabled:opacity-50"
                                    onClick={() => paginationnext && getAllVehicles(paginationnext, true)}
                                    disabled={!paginationnext}
                                >
                                    <span className="material-symbols-outlined">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <VehicleEditModal
                vehicleId={enEdition}
                onClose={() => setEnEdition(null)}
                onSaved={() => getAllVehicles("vehicule/liste-vehicule-dash", false, searchTerm)}
            />
        </MainLayout>
    );
};

export default Vehicle;
