import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";
import MainLayout from "./MainLayout";
import { notifier } from "../services/notifier";

interface ContributorsProps {
    onLogout?: () => void;
    theme?: "light" | "dark";
    toggleTheme?: () => void;
}

/** Une ligne de la liste : une personne, et ce que font ses véhicules. */
interface Contributeur {
    id: number;
    nom: string | null;
    prenom: string | null;
    telephone: string | null;
    email: string | null;
    vehicles: number;
    online_now: number;
    completed: number;
    volume: number;
    last_activity_at: string | null;
}

interface Lien {
    url: string | null;
    label: string;
    active: boolean;
}

interface Page {
    data: Contributeur[];
    links: Lien[];
    from: number | null;
    to: number | null;
    total: number;
    current_page: number;
    last_page: number;
}

const ADRESSE = "v3/admin/contributors";

const derniereFois = (iso: string | null) => {
    if (!iso) return "Jamais";
    const quand = new Date(iso.replace(" ", "T"));
    const jours = Math.floor((Date.now() - quand.getTime()) / 86_400_000);
    if (jours <= 0) return "Aujourd'hui";
    if (jours === 1) return "Hier";
    if (jours < 30) return `Il y a ${jours} jours`;
    return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(quand);
};

/**
 * Les contributeurs : les comptes rattachés à des véhicules de la flotte.
 *
 * La page affichait une ligne par rattachement — le même nom quatorze fois —
 * et lisait `item.user`, que l'API ne renvoyait pas : la liste sortait vide.
 * Elle montre désormais une ligne par personne, avec ce que ses chauffeurs
 * ont fait ces trente derniers jours ; la fiche détaille véhicule par véhicule.
 */
export default function Contributors({ onLogout = () => {}, theme = "light", toggleTheme = () => {} }: ContributorsProps) {
    const [page, setPage] = useState<Page | null>(null);
    const [chargement, setChargement] = useState(true);
    const [recherche, setRecherche] = useState("");
    const navigate = useNavigate();

    const charger = async (adresse: string) => {
        setChargement(true);
        try {
            const { data } = await new ApiService().getData(adresse);
            if (data.success) setPage(data.data.page);
            else toast.error(data.message || "Erreur lors du chargement");
        } catch {
            toast.error("Connexion au serveur impossible");
        } finally {
            setChargement(false);
        }
    };

    const chercher = () => charger(recherche.trim() ? `${ADRESSE}?q=${encodeURIComponent(recherche.trim())}` : ADRESSE);

    useEffect(() => {
        charger(ADRESSE);
    }, []);

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header>
                <div className="px-8 py-6 max-w-7xl mx-auto flex items-start justify-between gap-6 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Contributeurs</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Les comptes rattachés à des véhicules de la flotte, et l'activité des chauffeurs qui les conduisent.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate("/contributors/add")}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 dark:bg-primary-container dark:hover:bg-primary-container/90 transition-colors shrink-0"
                    >
                        Rattacher un véhicule
                    </button>
                </div>
            </header>

            <main className="px-8 pb-8 max-w-7xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <input
                        value={recherche}
                        onChange={(evenement) => setRecherche(evenement.target.value)}
                        onKeyDown={(evenement) => evenement.key === "Enter" && chercher()}
                        placeholder="Chercher un contributeur — nom, téléphone, email, puis Entrée"
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                    {page && (
                        <p className="text-sm text-slate-500 whitespace-nowrap tabular-nums">
                            {page.from || 0}–{page.to || 0} sur {page.total}
                        </p>
                    )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                    {chargement && !page ? (
                        <Loading />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[860px]">
                                <thead className="text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-800/40 text-left">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold">Contributeur</th>
                                        <th className="px-5 py-3 font-semibold text-right">Véhicules</th>
                                        <th className="px-5 py-3 font-semibold text-right">En ligne</th>
                                        <th className="px-5 py-3 font-semibold text-right">Courses · 30 j</th>
                                        <th className="px-5 py-3 font-semibold text-right">Volume · 30 j</th>
                                        <th className="px-5 py-3 font-semibold">Dernière activité</th>
                                        <th className="px-5 py-3" />
                                    </tr>
                                </thead>
                                <tbody className={`divide-y divide-slate-200 dark:divide-slate-800 ${chargement ? "opacity-60" : ""}`}>
                                    {page && page.data.length > 0 ? (
                                        page.data.map((c) => (
                                            <tr
                                                key={c.id}
                                                onClick={() => navigate(`/contributors/${c.id}`)}
                                                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                            >
                                                <td className="px-5 py-3">
                                                    <p className="font-semibold text-slate-900 dark:text-white">
                                                        {[c.nom, c.prenom].filter(Boolean).join(" ") || `Compte #${c.id}`}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{c.telephone || c.email || "—"}</p>
                                                </td>
                                                <td className="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{c.vehicles}</td>
                                                <td className="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                                                    {c.online_now}
                                                    <span className="text-slate-400"> / {c.vehicles}</span>
                                                </td>
                                                <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-900 dark:text-white">{c.completed}</td>
                                                <td className="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                    {c.volume.toLocaleString("fr-FR")} <span className="text-xs text-slate-500">FCFA</span>
                                                </td>
                                                <td className="px-5 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{derniereFois(c.last_activity_at)}</td>
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); notifier({ destinataires: [{ id: c.id, nom: [c.nom, c.prenom].filter(Boolean).join(" ") }] }); }} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap">Notifier</button>
                                                        <span className="text-xs font-medium text-primary dark:text-primary-fixed-dim whitespace-nowrap">Voir l'activité →</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                                                Aucun contributeur trouvé.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {page && page.last_page > 1 && (
                        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                            <p className="text-xs text-slate-500">
                                Page {page.current_page} sur {page.last_page}
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {page.links.map((lien, index) => (
                                    <button
                                        key={index}
                                        disabled={!lien.url || lien.active}
                                        onClick={() => lien.url && charger(lien.url)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                                            lien.active
                                                ? "bg-primary text-white dark:bg-primary-container"
                                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        } ${!lien.url ? "opacity-40 cursor-not-allowed" : ""}`}
                                        dangerouslySetInnerHTML={{
                                            __html: lien.label.replace("Previous", "Précédent").replace("Next", "Suivant"),
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </MainLayout>
    );
}
