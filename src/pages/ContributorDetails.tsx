import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { ArrowLeft, Car, CircleCheck, Hand, Banknote } from "lucide-react";
import ApiService from "../services/ApiService";
import MainLayout from "./MainLayout";
import Loading from "../components/Loading";
import { StatCard, cx } from "../components/ui";
import { notifier } from "../services/notifier";

interface ContributorDetailsProps {
    onLogout?: () => void;
    theme?: "light" | "dark";
    toggleTheme?: () => void;
}

interface Activite {
    completed: number;
    volume: number;
    offers: number;
    accepted: number;
    missed: number;
    refused: number;
    acceptance_rate: number | null;
    last_activity_at: string | null;
}

interface Vehicule {
    id: number;
    matricule: string | null;
    modele: string | null;
    ville: string | null;
    statut: string | null;
    is_online: boolean;
    category: string | null;
    driver: { id: number; nom: string | null; prenom: string | null; telephone: string | null } | null;
    activity: Activite;
}

interface Fiche {
    contributor: { id: number; nom: string | null; prenom: string | null; telephone: string | null; email: string | null };
    period: { from: string; to: string };
    totals: { vehicles: number; online_now: number; completed: number; volume: number; offers: number; accepted: number; missed: number; refused: number };
    vehicles: Vehicule[];
    recent_courses: {
        id: number;
        created_at: string;
        statut: string;
        montant: number | null;
        lieu_depart: string | null;
        lieu_arrive: string | null;
        chauffeur_nom: string | null;
        chauffeur_prenom: string | null;
    }[];
}

interface VehiculeLibre {
    id: number;
    matricule: string | null;
    modele: string | null;
    ville: string | null;
    chauffeur_nom: string | null;
    chauffeur_prenom: string | null;
}

const PERIODES = [
    { jours: 7, libelle: "7 jours" },
    { jours: 30, libelle: "30 jours" },
    { jours: 90, libelle: "90 jours" },
    { jours: 365, libelle: "12 mois" },
];

const isoLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const date = (iso: string | null, avecHeure = false) =>
    iso
        ? new Intl.DateTimeFormat("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
              ...(avecHeure ? { hour: "2-digit", minute: "2-digit" } : {}),
          }).format(new Date(iso.replace(" ", "T")))
        : "—";

const nomComplet = (nom: string | null, prenom: string | null) => [nom, prenom].filter(Boolean).join(" ") || "—";

const TONS: Record<string, string> = {
    TERMINEE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    ANNULEE: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
    "ANNULEE AUTO": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    "NO DRIVER FOUND": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

/**
 * La fiche d'un contributeur : ses véhicules, et ce qu'en font leurs chauffeurs.
 *
 * Elle appelait `utilisateur/details-contributor`, qui n'a jamais existé, et
 * restait sur « Contributeur introuvable ». Elle lit désormais
 * `v3/admin/contributors/{id}`.
 *
 * L'activité se lit par le chauffeur **actuel** de chaque véhicule : les
 * courses ne gardent pas le véhicule utilisé. L'encadré du bas le rappelle.
 */
export default function ContributorDetails({ onLogout = () => {}, theme = "light", toggleTheme = () => {} }: ContributorDetailsProps) {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [jours, setJours] = useState(30);
    const [fiche, setFiche] = useState<Fiche | null>(null);
    const [introuvable, setIntrouvable] = useState(false);
    const [chargement, setChargement] = useState(true);

    const [rattacher, setRattacher] = useState(false);
    const [recherche, setRecherche] = useState("");
    const [libres, setLibres] = useState<VehiculeLibre[]>([]);
    const [envoi, setEnvoi] = useState(false);

    const charger = useCallback(async () => {
        const fin = new Date();
        const debut = new Date();
        debut.setDate(fin.getDate() - (jours - 1));

        setChargement(true);
        try {
            const { data } = await new ApiService().getData(`v3/admin/contributors/${id}`, { from: isoLocal(debut), to: isoLocal(fin) });
            if (data.success) setFiche(data.data);
            else setIntrouvable(true);
        } catch {
            toast.error("Impossible de récupérer la fiche");
        } finally {
            setChargement(false);
        }
    }, [id, jours]);

    useEffect(() => {
        charger();
    }, [charger]);

    const chercherVehicules = async () => {
        if (recherche.trim().length < 2) return;
        try {
            const { data } = await new ApiService().getData(`v3/admin/contributors/search/vehicles?q=${encodeURIComponent(recherche.trim())}`);
            if (data.success) setLibres(data.data);
        } catch {
            toast.error("Erreur lors de la recherche des véhicules");
        }
    };

    const rattacherVehicule = async (vehicule: VehiculeLibre) => {
        setEnvoi(true);
        try {
            const { data } = await new ApiService().postData("v3/admin/contributors", { user_id: Number(id), vehicle_id: vehicule.id });
            if (data.success) {
                toast.success(`${vehicule.matricule ?? "Véhicule"} rattaché`);
                setRattacher(false);
                setRecherche("");
                setLibres([]);
                charger();
            } else {
                toast.error(data.message || "Rattachement refusé");
            }
        } catch (e: unknown) {
            const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(message || "Impossible de rattacher le véhicule");
        } finally {
            setEnvoi(false);
        }
    };

    /*
     * Dissocier : un chauffeur (son véhicule), ou tous d'un coup.
     *
     * Le lien en base est contributeur ↔ véhicule ; le chauffeur suit le
     * véhicule. Rien n'est supprimé d'autre : le véhicule, son chauffeur et le
     * compte du contributeur restent dans la flotte.
     */
    const dissocier = async (vehicule: Vehicule) => {
        const chauffeur = vehicule.driver ? nomComplet(vehicule.driver.nom, vehicule.driver.prenom) : null;
        const choix = await Swal.fire({
            title: chauffeur ? `Dissocier ${chauffeur} ?` : `Dissocier ${vehicule.matricule ?? "ce véhicule"} ?`,
            text: `Le véhicule ${vehicule.matricule ?? ""} et son chauffeur ne seront plus rattachés à ce contributeur. Ils restent dans la flotte.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Dissocier",
            cancelButtonText: "Annuler",
        });
        if (!choix.isConfirmed) return;

        try {
            const { data } = await new ApiService().deleteData(`v3/admin/contributors/${id}/vehicles/${vehicule.id}`);
            if (data.success) {
                toast.success(chauffeur ? `${chauffeur} dissocié` : "Véhicule dissocié");
                // Le dernier parti, la fiche n'a plus d'objet : retour à la liste.
                if (fiche && fiche.vehicles.length <= 1) navigate("/contributors");
                else charger();
            } else {
                toast.error(data.message || "Impossible de dissocier");
            }
        } catch {
            toast.error("Impossible de dissocier le chauffeur");
        }
    };

    const dissocierTout = async () => {
        if (!fiche) return;
        const n = fiche.vehicles.length;
        const choix = await Swal.fire({
            title: `Dissocier les ${n} chauffeur${n > 1 ? "s" : ""} ?`,
            text: `${nomComplet(fiche.contributor.nom, fiche.contributor.prenom)} ne sera plus rattaché à aucun véhicule et sortira de la liste des contributeurs. Les véhicules et leurs chauffeurs restent dans la flotte.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Tout dissocier",
            cancelButtonText: "Annuler",
            confirmButtonColor: "#dc2626",
        });
        if (!choix.isConfirmed) return;

        try {
            const { data } = await new ApiService().deleteData(`v3/admin/contributors/${id}/vehicles`);
            if (data.success) {
                toast.success(data.message || "Chauffeurs dissociés");
                navigate("/contributors");
            } else {
                toast.error(data.message || "Impossible de dissocier");
            }
        } catch {
            toast.error("Impossible de dissocier les chauffeurs");
        }
    };

    if (introuvable) {
        return (
            <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
                <div className="p-8 text-center text-slate-500">Ce compte n'est rattaché à aucun véhicule.</div>
            </MainLayout>
        );
    }

    if (!fiche) {
        return (
            <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
                <div className="flex h-[60vh] items-center justify-center">
                    <Loading />
                </div>
            </MainLayout>
        );
    }

    const { contributor: c, totals: t } = fiche;
    const tauxAcceptation = t.offers ? Math.round((t.accepted / t.offers) * 1000) / 10 : null;

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header>
                <div className="px-8 py-6 max-w-7xl mx-auto flex items-start justify-between gap-6 flex-wrap">
                    <div className="flex items-start gap-4">
                        <button
                            onClick={() => navigate("/contributors")}
                            title="Retour aux contributeurs"
                            className="mt-1 size-9 grid place-items-center rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            <ArrowLeft className="size-4" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{nomComplet(c.nom, c.prenom)}</h1>
                            <p className="text-sm text-slate-500 mt-1">
                                {[c.telephone, c.email].filter(Boolean).join(" · ") || `Compte #${c.id}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => notifier({ destinataires: [{ id: c.id, nom: [c.nom, c.prenom].filter(Boolean).join(" ") }] })} className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Notifier</button>
                    <button
                        onClick={() => setRattacher(true)}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 dark:bg-primary-container dark:hover:bg-primary-container/90 transition-colors shrink-0"
                    >
                        Rattacher un véhicule
                    </button>
                    </div>
                </div>
            </header>

            <main className={cx("px-8 pb-8 max-w-7xl mx-auto space-y-6 transition-opacity", chargement && "opacity-60")}>
                <div role="radiogroup" aria-label="Période" className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
                    {PERIODES.map((p) => (
                        <button
                            key={p.jours}
                            role="radio"
                            aria-checked={p.jours === jours}
                            onClick={() => setJours(p.jours)}
                            className={cx(
                                "px-3 py-1.5 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors",
                                p.jours === jours
                                    ? "bg-primary text-white dark:bg-primary-container"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
                            )}
                        >
                            {p.libelle}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Véhicules" value={t.vehicles} icon={Car} note={`${t.online_now} en ligne maintenant`} />
                    <StatCard label="Courses terminées" value={t.completed.toLocaleString("fr-FR")} icon={CircleCheck} />
                    <StatCard label="Volume des courses" value={`${t.volume.toLocaleString("fr-FR")} FCFA`} icon={Banknote} />
                    <StatCard
                        label="Propositions acceptées"
                        value={tauxAcceptation === null ? "—" : `${tauxAcceptation.toLocaleString("fr-FR")} %`}
                        icon={Hand}
                        note={
                            t.offers
                                ? `${t.accepted} sur ${t.offers} · ${t.missed} sans réponse · ${t.refused} refusées`
                                : "Aucune course proposée sur la période"
                        }
                    />
                </div>

                <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-[16px] font-bold tracking-tight text-slate-900 dark:text-white">Activité des chauffeurs</h2>
                            <p className="mt-1 text-[13px] text-slate-500">Un véhicule par ligne, avec le chauffeur qui le conduit aujourd'hui.</p>
                        </div>
                        {fiche.vehicles.length > 1 && (
                            <button
                                onClick={dissocierTout}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/30"
                            >
                                Dissocier tous les chauffeurs
                            </button>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[980px]">
                            <thead className="text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-800/40 text-left">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">Véhicule</th>
                                    <th className="px-5 py-3 font-semibold">Chauffeur</th>
                                    <th className="px-5 py-3 font-semibold text-right">Courses</th>
                                    <th className="px-5 py-3 font-semibold text-right">Volume</th>
                                    <th className="px-5 py-3 font-semibold text-right">Propositions</th>
                                    <th className="px-5 py-3 font-semibold text-right">Acceptées</th>
                                    <th className="px-5 py-3 font-semibold">Dernière activité</th>
                                    <th className="px-5 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {fiche.vehicles.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-12 text-center text-slate-500">Aucun véhicule rattaché.</td>
                                    </tr>
                                ) : (
                                    fiche.vehicles.map((v) => (
                                        <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                            <td className="px-5 py-3">
                                                <p className="font-semibold text-slate-900 dark:text-white">{v.matricule ?? "—"}</p>
                                                <p className="text-xs text-slate-500">
                                                    {[v.modele, v.category, v.ville].filter(Boolean).join(" · ") || "—"}
                                                </p>
                                            </td>
                                            <td className="px-5 py-3">
                                                {v.driver ? (
                                                    <>
                                                        <p className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                                            {/* En ligne : un point et le mot, jamais la couleur seule. */}
                                                            <span
                                                                className={cx("size-2 rounded-full", v.is_online ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600")}
                                                                aria-hidden
                                                            />
                                                            {nomComplet(v.driver.nom, v.driver.prenom)}
                                                        </p>
                                                        <p className="text-xs text-slate-500 pl-4">
                                                            {v.is_online ? "En ligne" : "Hors ligne"}
                                                            {v.driver.telephone ? ` · ${v.driver.telephone}` : ""}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <span className="text-slate-400">Aucun chauffeur</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-900 dark:text-white">{v.activity.completed}</td>
                                            <td className="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                {v.activity.volume.toLocaleString("fr-FR")} <span className="text-xs text-slate-500">FCFA</span>
                                            </td>
                                            <td className="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{v.activity.offers}</td>
                                            <td className="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                                                {v.activity.acceptance_rate === null ? "—" : `${v.activity.acceptance_rate.toLocaleString("fr-FR")} %`}
                                            </td>
                                            <td className="px-5 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{date(v.activity.last_activity_at)}</td>
                                            <td className="px-5 py-3 text-right">
                                                {v.driver && (
                                                    <button type="button" onClick={() => notifier({ destinataires: [{ id: v.driver?.id, nom: [v.driver?.nom, v.driver?.prenom].filter(Boolean).join(" ") }] })} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap">Notifier</button>
                                                )}
                                                <button
                                                    onClick={() => dissocier(v)}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 whitespace-nowrap"
                                                >
                                                    Dissocier
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                        <h2 className="text-[16px] font-bold tracking-tight text-slate-900 dark:text-white">Dernières courses</h2>
                        <p className="mt-1 text-[13px] text-slate-500">Les vingt plus récentes de ces chauffeurs, quelle que soit la période.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[760px]">
                            <thead className="text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-800/40 text-left">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">Quand</th>
                                    <th className="px-5 py-3 font-semibold">Chauffeur</th>
                                    <th className="px-5 py-3 font-semibold">Trajet</th>
                                    <th className="px-5 py-3 font-semibold text-right">Montant</th>
                                    <th className="px-5 py-3 font-semibold">État</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {fiche.recent_courses.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-10 text-center text-slate-500">Aucune course pour ces chauffeurs.</td>
                                    </tr>
                                ) : (
                                    fiche.recent_courses.map((course) => (
                                        <tr key={course.id}>
                                            <td className="px-5 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{date(course.created_at, true)}</td>
                                            <td className="px-5 py-3 text-slate-800 dark:text-slate-200">{nomComplet(course.chauffeur_nom, course.chauffeur_prenom)}</td>
                                            <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                                                <p className="truncate max-w-[320px]">{course.lieu_depart ?? "—"}</p>
                                                <p className="truncate max-w-[320px] text-xs">→ {course.lieu_arrive ?? "—"}</p>
                                            </td>
                                            <td className="px-5 py-3 text-right tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                                                {(course.montant ?? 0).toLocaleString("fr-FR")} <span className="text-xs text-slate-500">FCFA</span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={cx("px-2 py-0.5 rounded-full text-xs font-medium", TONS[course.statut] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>
                                                    {course.statut}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <p className="text-[12px] text-slate-500 dark:text-slate-400">
                    Les courses n'enregistrent pas le véhicule utilisé : l'activité est celle du chauffeur actuel de chaque véhicule. Un
                    chauffeur qui a changé de véhicule y apporte son historique.
                </p>
            </main>

            {rattacher && (
                <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-900/50 p-4" onClick={() => setRattacher(false)}>
                    <div
                        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                        onClick={(evenement) => evenement.stopPropagation()}
                    >
                        <h2 className="text-[16px] font-bold text-slate-900 dark:text-white">Rattacher un véhicule</h2>
                        <p className="mt-1 text-[13px] text-slate-500">Seuls les véhicules sans contributeur sont proposés.</p>

                        <div className="mt-4 flex gap-2">
                            <input
                                autoFocus
                                value={recherche}
                                onChange={(evenement) => setRecherche(evenement.target.value)}
                                onKeyDown={(evenement) => evenement.key === "Enter" && chercherVehicules()}
                                placeholder="Matricule, modèle ou chauffeur"
                                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                            />
                            <button
                                onClick={chercherVehicules}
                                className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Chercher
                            </button>
                        </div>

                        <div className="mt-4 max-h-72 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
                            {libres.map((v) => (
                                <div key={v.id} className="flex items-center justify-between gap-3 py-2.5">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm text-slate-900 dark:text-white">{v.matricule ?? "—"}</p>
                                        <p className="text-xs text-slate-500 truncate">
                                            {[v.modele, v.ville, nomComplet(v.chauffeur_nom, v.chauffeur_prenom)].filter((x) => x && x !== "—").join(" · ")}
                                        </p>
                                    </div>
                                    <button
                                        disabled={envoi}
                                        onClick={() => rattacherVehicule(v)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary/90 dark:bg-primary-container disabled:opacity-40 shrink-0"
                                    >
                                        Rattacher
                                    </button>
                                </div>
                            ))}
                            {libres.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Tapez au moins deux caractères, puis Entrée.</p>}
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}
