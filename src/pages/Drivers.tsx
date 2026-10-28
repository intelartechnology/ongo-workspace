import { useEffect, useState } from "react";
import ApiService from "../services/ApiService";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import Helpers from "../functions/helpers";
import Loading from "../components/Loading";
import MainLayout from "./MainLayout";
import { useNavigate, useSearchParams } from 'react-router-dom';
import moment from 'moment';
import { SearchBar, Button, StatCard, Avatar, Select, cx } from "../components/ui";
import { CircleCheck, Car, UsersRound, ZapOff } from "lucide-react";
import { notifier } from "../services/notifier";

interface DriversProps {
    onLogout?: () => void;
    theme?: 'light' | 'dark';
    toggleTheme?: () => void;
}

interface Compteurs {
    total: number;
    en_service: number;
    en_course: number;
    decroches: number;
}

interface Page {
    data: any[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
}

const ETATS = [
    ["", "Tous"],
    ["en_service", "En service"],
    ["en_course", "En course"],
    ["hors_service", "Hors service"],
    ["decroches", "Décrochés"],
] as const;

const TRIS = [
    ["activite", "Dernière activité"],
    ["actifs", "Les plus actifs"],
    ["ca", "Chiffre d'affaires"],
    ["acceptation", "Taux d'acceptation"],
    ["solde", "Solde le plus négatif"],
    ["recents", "Nouveaux inscrits"],
] as const;

const francs = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F`;

/** L'état d'un chauffeur, lu sur son véhicule. */
const etatDe = (vehicule: any) => {
    if (vehicule.statut === "OCCUPE") return { libelle: "En course", classe: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300", point: "bg-sky-500" };
    if (Number(vehicule.is_online)) return { libelle: "En service", classe: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400", point: "bg-emerald-500 animate-pulse" };
    return { libelle: "Hors service", classe: "bg-slate-100 text-slate-500 dark:bg-slate-800", point: "bg-slate-400" };
};

export default function Drivers({ onLogout = () => {}, theme = 'light', toggleTheme = () => {} }: DriversProps) {
    const navigate = useNavigate();
    // Les filtres vivent dans l'adresse : un lien partagé ou un retour
    // arrière les retrouvent.
    const [params, setParams] = useSearchParams();
    const etat = params.get("etat") ?? "";
    const tri = params.get("tri") ?? "activite";
    const jours = params.get("jours") ?? "30";
    const ville = params.get("ville") ?? "";
    const categorie = params.get("categorie") ?? "";
    const q = params.get("q") ?? "";
    const pageCourante = params.get("page") ?? "1";

    const [recherche, setRecherche] = useState(q);
    const [page, setPage] = useState<Page | null>(null);
    const [compteurs, setCompteurs] = useState<Compteurs | null>(null);
    const [filtres, setFiltres] = useState<{ villes: string[]; categories: { id: number; libelle: string }[] }>({ villes: [], categories: [] });
    const [load, setLoad] = useState(true);
    const [rechargement, setRechargement] = useState(0);

    const Api = new ApiService();
    const _helpersInstance = new Helpers();

    /** Change un filtre et revient à la première page. */
    const filtrer = (cle: string, valeur: string) => {
        const suivant = new URLSearchParams(params);
        if (valeur) suivant.set(cle, valeur);
        else suivant.delete(cle);
        if (cle !== "page") suivant.delete("page");
        setParams(suivant);
    };

    useEffect(() => {
        let abandonnee = false;
        setLoad(true);
        new ApiService()
            .getData("v3/admin/drivers", { etat: etat || undefined, tri, jours, ville: ville || undefined, categorie: categorie || undefined, q: q || undefined, page: pageCourante })
            .then(({ data }) => {
                if (abandonnee) return;
                if (data.success) {
                    setPage(data.data.chauffeurs);
                    setCompteurs(data.data.compteurs);
                    setFiltres(data.data.filtres);
                } else {
                    toast.error(data.message || "Impossible de charger les chauffeurs");
                }
            })
            .catch(() => !abandonnee && toast.error("Connexion au serveur impossible"))
            .finally(() => !abandonnee && setLoad(false));
        return () => {
            abandonnee = true;
        };
    }, [etat, tri, jours, ville, categorie, q, pageCourante, rechargement]);

    const toggleActivate = async (id: any) => {
        try {
            const { data } = await Api.postData("utilisateur/toggle-river", { car_id: id });
            if (data.success) {
                toast.success("Chauffeur activé avec succès");
                setRechargement((n) => n + 1);
            } else {
                Swal.fire({ icon: "warning", title: "Erreur", text: data.message });
            }
        } catch (err: any) {
            Swal.fire({ icon: "warning", title: "Connexion au serveur impossible", text: String(err) });
        }
    };

    const handleaction = (id: any) => {
        if (window.confirm("Êtes-vous certain(e) de vouloir procéder à l'activation de ce véhicule ?")) {
            toggleActivate(id);
        }
    };

    const chauffeurs = page?.data ?? [];

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">

                {/* Header */}
            <header className="py-6 px-8 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gestion des Chauffeurs</h2>
                    <p className="text-sm text-slate-500">Gérez et suivez l'activité de vos chauffeurs en temps réel.</p>
                </div>
                <button onClick={() => navigate('/add-driver')} className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 dark:bg-primary-container dark:hover:bg-primary-container/90 transition-colors disabled:opacity-40 flex items-center gap-2">
                    <span className="material-symbols-outlined">add</span>
                    Ajouter un chauffeur
                </button>
            </header>

            {/* Main Workspace */}
            <div className="p-8 pt-0 space-y-6">
                {/* Les compteurs, sur toute la flotte : un clic filtre la liste. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {([
                        ["", "Chauffeurs", compteurs?.total, UsersRound, "Au volant d'un véhicule"],
                        ["en_service", "En service", compteurs?.en_service, CircleCheck, "En ligne et libres"],
                        ["en_course", "En course", compteurs?.en_course, Car, "Véhicule occupé"],
                        ["decroches", "Décrochés", compteurs?.decroches, ZapOff, "Aucune activité depuis 7 jours"],
                    ] as const).map(([cle, libelle, valeur, icone, note]) => (
                        <button key={libelle} type="button" onClick={() => filtrer("etat", cle)} className={cx("text-left rounded-xl transition-shadow", etat === cle && "ring-2 ring-primary")}>
                            <StatCard label={libelle} value={valeur === undefined ? "—" : valeur.toLocaleString("fr-FR")} icon={icone} note={note} />
                        </button>
                    ))}
                </div>

                {/* Filters & Search */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex flex-wrap gap-4 items-center">
                        <SearchBar
                            value={recherche}
                            onChange={setRecherche}
                            onSearch={() => filtrer("q", recherche.trim())}
                            placeholder="Nom ou téléphone"
                            minWidth={300}
                        />
                        <Button icon="search" onClick={() => filtrer("q", recherche.trim())}>
                            Rechercher
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 mr-1">État</span>
                        {ETATS.map(([cle, libelle]) => (
                            <button
                                key={cle}
                                type="button"
                                onClick={() => filtrer("etat", cle)}
                                className={cx(
                                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                                    etat === cle
                                        ? "bg-primary text-white border-primary dark:bg-primary-container dark:border-primary-container"
                                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
                                )}
                            >
                                {libelle}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            Ville
                            <Select size="sm" value={ville} onChange={(e) => filtrer("ville", e.target.value)}>
                                <option value="">Toutes</option>
                                {filtres.villes.map((v) => <option key={v} value={v}>{v}</option>)}
                            </Select>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            Catégorie
                            <Select size="sm" value={categorie} onChange={(e) => filtrer("categorie", e.target.value)}>
                                <option value="">Toutes</option>
                                {filtres.categories.map((c) => <option key={c.id} value={c.id}>{c.libelle}</option>)}
                            </Select>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            Trier par
                            <Select size="sm" value={tri} onChange={(e) => filtrer("tri", e.target.value === "activite" ? "" : e.target.value)}>
                                {TRIS.map(([cle, libelle]) => <option key={cle} value={cle}>{libelle}</option>)}
                            </Select>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            Période
                            <Select size="sm" value={jours} onChange={(e) => filtrer("jours", e.target.value === "30" ? "" : e.target.value)}>
                                <option value="7">7 jours</option>
                                <option value="30">30 jours</option>
                                <option value="90">90 jours</option>
                            </Select>
                        </label>
                    </div>
                </div>

                {/* Drivers Table Container */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        {load && !page ? (
                            <Loading />
                        ) : (
                            <table className={cx("w-full text-left border-collapse min-w-[1200px]", load && "opacity-60")}>
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Chauffeur</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Téléphone</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ville</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Véhicule</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">État</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Courses {jours} j</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">CA {jours} j</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acceptation</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Solde</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dernière activité</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {chauffeurs.length > 0 ? (
                                        chauffeurs.map((item: any) => {
                                            const vehicule = item.vehicules?.[0] ?? {};
                                            const e = etatDe(vehicule);
                                            const solde = Number(item.balance ?? 0);

                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                                    <td className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">{item.id}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 shrink-0 rounded-full bg-slate-100 overflow-hidden">
                                                                <Avatar photo={item?.photo} nom={item?.nom || item?.prenom} className="text-base" />
                                                            </div>
                                                            <p className="text-sm font-bold text-slate-800 dark:text-white">
                                                                {_helpersInstance.capitalizeFirstLetter([item.nom, item.prenom].filter(Boolean).join(" "))}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">{item.telephone}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{vehicule.ville || "—"}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm">
                                                            <p className="font-medium text-slate-800 dark:text-white">{vehicule.modele || "—"}</p>
                                                            <p className="text-[11px] text-slate-500 font-bold uppercase">
                                                                {[vehicule.matricule, vehicule.categorie?.libelle].filter(Boolean).join(" · ")}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col items-start gap-1">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${e.classe}`}>
                                                                <span className={`size-1.5 rounded-full ${e.point}`} />
                                                                {e.libelle}
                                                            </span>
                                                            {vehicule.statut === "INACTIF" && (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                                    Inactif
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-right tabular-nums font-semibold text-slate-800 dark:text-white">{item.courses_periode ?? 0}</td>
                                                    <td className="px-6 py-4 text-sm text-right tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">{francs(item.ca_periode ?? 0)}</td>
                                                    <td className="px-6 py-4 text-sm text-right tabular-nums text-slate-700 dark:text-slate-300">
                                                        {item.taux_acceptation === null || item.taux_acceptation === undefined ? "—" : `${item.taux_acceptation} %`}
                                                    </td>
                                                    <td className={cx("px-6 py-4 text-sm text-right tabular-nums font-bold whitespace-nowrap", solde < 0 ? "text-rose-700 dark:text-rose-400" : "text-slate-800 dark:text-white")}>
                                                        {francs(solde)}
                                                    </td>
                                                    {/* La plus récente de sa dernière position, de la dernière
                                                        course proposée et de la dernière ouverture de l'application. */}
                                                    <td
                                                        className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap"
                                                        title={item.derniere_activite ? moment(item.derniere_activite).format("DD/MM/YYYY à HH:mm") : undefined}
                                                    >
                                                        {item.derniere_activite ? moment(item.derniere_activite).fromNow() : "Jamais vu"}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {vehicule.statut === "INACTIF" && (
                                                                <button
                                                                    onClick={() => handleaction(vehicule.id)}
                                                                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                                                                >
                                                                    Activer
                                                                </button>
                                                            )}
                                                            <button type="button" onClick={() => notifier({ destinataires: [{ id: item.id, nom: [item.nom, item.prenom].filter(Boolean).join(" ") }] })} className="px-3 py-1.5 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Notifier</button>
                                                            <button
                                                                onClick={() => navigate("/driver-detail/" + item.id)}
                                                                className="text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                                                            >
                                                                Détail
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={12} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                                <div className="flex flex-col items-center gap-3">
                                                    <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
                                                    <p>Aucun chauffeur trouvé</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination */}
                    {page && page.last_page > 1 && (
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800">
                            <p className="text-xs text-slate-500 font-medium">
                                Affichage de {page.from ?? 0} à {page.to ?? 0} sur {page.total.toLocaleString("fr-FR")} chauffeurs
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    disabled={page.current_page <= 1}
                                    onClick={() => filtrer("page", String(page.current_page - 1))}
                                    className="px-3 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Précédent
                                </button>
                                {Array.from({ length: page.last_page }, (_, i) => i + 1)
                                    .filter((n) => n === 1 || n === page.last_page || Math.abs(n - page.current_page) <= 2)
                                    .map((n, i, liste) => (
                                        <span key={n} className="flex items-center gap-1">
                                            {i > 0 && n - liste[i - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
                                            <button
                                                type="button"
                                                onClick={() => filtrer("page", String(n))}
                                                className={cx(
                                                    "w-8 h-8 rounded-lg border text-xs font-medium transition-colors",
                                                    n === page.current_page
                                                        ? "bg-primary text-white dark:bg-primary-container border-primary dark:border-primary-container"
                                                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800",
                                                )}
                                            >
                                                {n}
                                            </button>
                                        </span>
                                    ))}
                                <button
                                    type="button"
                                    disabled={page.current_page >= page.last_page}
                                    onClick={() => filtrer("page", String(page.current_page + 1))}
                                    className="px-3 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Suivant
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </MainLayout>
    );
}
