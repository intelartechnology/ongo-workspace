import { Fragment, useEffect, useState } from "react";
import type { AxiosResponse } from "axios";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { CalendarClock, Gift, Trophy, UsersRound } from "lucide-react";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";
import { Button, Input, StatCard, cx } from "../components/ui";
import CompetitionLeaderboard from "./components/CompetitionLeaderboard";

/**
 * Les concours entre chauffeurs : les préparer, les annoncer, suivre le classement.
 *
 * Un concours naît en brouillon, invisible des chauffeurs. L'annonce le rend
 * visible — tout de suite ou à l'heure choisie — et déclenche les
 * notifications. Chaque course terminée rapporte des points selon le barème ;
 * 48 h après la fin, le classement se fige et les lots s'attribuent par rang.
 * Le back-office valide alors chaque gagnant, marque son lot remis, puis
 * clôture le concours, qui disparaît de l'application.
 */

interface Lot {
    id?: number;
    rank_from: number;
    rank_to: number;
    label: string;
    /** Facultatif : les points qu'il faut au moins pour gagner ce lot. */
    min_points: number | null;
    estimated_value: number;
}

type Bareme = {
    per_ride: number;
    per_km: number;
    km_cap: number;
    approach_per_km: number;
    approach_free_m: number;
    approach_cap: number;
    min_fare: number;
    min_distance_m: number;
    same_client_daily_cap: number;
    rating: Record<"5" | "4" | "3" | "2" | "1" | "none", number>;
};

interface Concours {
    id: number;
    title: string;
    description: string | null;
    rules: string | null;
    video_url: string | null;
    prize_instructions: string | null;
    status: "draft" | "announced" | "running" | "frozen" | "closed" | "cancelled";
    announced_at: string | null;
    starts_at: string;
    ends_at: string;
    registration_open: boolean;
    max_participants: number | null;
    participants_count: number;
    scoring: Bareme | null;
    prizes: Lot[];
}

interface Inscrit {
    id: number;
    driver_id: number;
    joined_at: string;
    nom: string | null;
    prenom: string | null;
    telephone: string | null;
}

interface Formulaire {
    title: string;
    description: string;
    rules: string;
    video_url: string;
    prize_instructions: string;
    starts_at: string;
    ends_at: string;
    max_participants: string;
    scoring: Bareme;
    lots: Lot[];
}

interface CompetitionsProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const STATUTS: Record<Concours["status"], { libelle: string; classe: string }> = {
    draft: { libelle: "Brouillon", classe: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
    announced: { libelle: "Annoncé", classe: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
    running: { libelle: "En cours", classe: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
    frozen: { libelle: "Résultats figés", classe: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
    closed: { libelle: "Clos", classe: "bg-slate-100 text-slate-500 dark:bg-slate-800" },
    cancelled: { libelle: "Annulé", classe: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400" },
};

/** Les champs du barème, dans l'ordre où on les lit. */
const CHAMPS_BAREME: { cle: Exclude<keyof Bareme, "rating">; libelle: string; aide: string }[] = [
    { cle: "per_ride", libelle: "Points par course", aide: "Pour toute course terminée" },
    { cle: "per_km", libelle: "Points par km", aide: "Distance du trajet" },
    { cle: "km_cap", libelle: "Km comptés au plus", aide: "Une course longue ne décide pas de tout" },
    { cle: "approach_per_km", libelle: "Points par km de prise en charge", aide: "Au-delà de la distance gratuite" },
    { cle: "approach_free_m", libelle: "Prise en charge gratuite (m)", aide: "En deçà, rien de plus" },
    { cle: "approach_cap", libelle: "Bonus de prise en charge maximal", aide: "En points" },
    { cle: "min_fare", libelle: "Montant minimum (F)", aide: "En dessous, la course ne compte pas" },
    { cle: "min_distance_m", libelle: "Distance minimum (m)", aide: "En dessous, la course ne compte pas" },
    { cle: "same_client_daily_cap", libelle: "Courses par client et par jour", aide: "Au-delà, les moins bonnes ne comptent pas" },
];

const NOTES: { cle: keyof Bareme["rating"]; libelle: string }[] = [
    { cle: "5", libelle: "★★★★★" },
    { cle: "4", libelle: "★★★★" },
    { cle: "3", libelle: "★★★" },
    { cle: "2", libelle: "★★" },
    { cle: "1", libelle: "★" },
    { cle: "none", libelle: "Sans note" },
];

const date = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

const francs = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F`;

/** Une date du serveur, pour un champ `datetime-local` : à l'heure du navigateur. */
const versChamp = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const deux = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}T${deux(d.getHours())}:${deux(d.getMinutes())}`;
};

const budgetDe = (lots: Lot[]) => lots.reduce((n, l) => n + (Number(l.estimated_value) || 0) * Math.max(0, l.rank_to - l.rank_from + 1), 0);

const champTexte =
    "w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40";

export default function Competitions({ onLogout, theme, toggleTheme }: CompetitionsProps) {
    const [concours, setConcours] = useState<Concours[] | null>(null);
    const [baremeParDefaut, setBaremeParDefaut] = useState<Bareme | null>(null);
    const [edition, setEdition] = useState<{ id: number | null; figé: boolean; champs: Formulaire } | null>(null);
    const [enregistrement, setEnregistrement] = useState(false);
    const [panneau, setPanneau] = useState<{ id: number; vue: "inscrits" | "classement"; inscrits: Inscrit[] | null } | null>(null);

    const api = new ApiService();

    const charger = async () => {
        try {
            const { data } = await api.getData("v3/admin/competitions");
            if (data?.success) {
                setConcours(data.data.competitions);
                setBaremeParDefaut(data.data.default_scoring);
            } else toast.error(data?.message ?? "Concours indisponibles.");
        } catch {
            toast.error("Le serveur ne répond pas.");
        }
    };

    useEffect(() => {
        charger();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** Une action du serveur, puis la liste relue. Rend la réponse en cas de succès. */
    const agir = async (appel: Promise<AxiosResponse>, silence = false) => {
        try {
            const { data } = await appel;
            if (data?.success) {
                if (!silence) toast.success(data.message);
                await charger();
                return data;
            }
            toast.error(data?.message ?? "Action refusée.");
        } catch (erreur) {
            const message = (erreur as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(message ?? "Le serveur ne répond pas.");
        }
        return null;
    };

    const nouveau = () => {
        if (!baremeParDefaut) return;
        setEdition({
            id: null,
            figé: false,
            champs: {
                title: "", description: "", rules: "", video_url: "", prize_instructions: "", starts_at: "", ends_at: "", max_participants: "",
                scoring: structuredClone(baremeParDefaut),
                lots: [{ rank_from: 1, rank_to: 1, label: "", min_points: null, estimated_value: 0 }],
            },
        });
    };

    const modifier = (c: Concours) =>
        baremeParDefaut &&
        setEdition({
            id: c.id,
            figé: c.status === "frozen",
            champs: {
                title: c.title,
                description: c.description ?? "",
                rules: c.rules ?? "",
                video_url: c.video_url ?? "",
                prize_instructions: c.prize_instructions ?? "",
                starts_at: versChamp(c.starts_at),
                ends_at: versChamp(c.ends_at),
                max_participants: c.max_participants === null ? "" : String(c.max_participants),
                scoring: { ...structuredClone(baremeParDefaut), ...(c.scoring ?? {}), rating: { ...baremeParDefaut.rating, ...(c.scoring?.rating ?? {}) } },
                lots: c.prizes.map((p) => ({ rank_from: p.rank_from, rank_to: p.rank_to, label: p.label, min_points: p.min_points ?? null, estimated_value: p.estimated_value })),
            },
        });

    const enregistrer = async () => {
        if (!edition) return;
        const c = edition.champs;
        const corps: Record<string, unknown> = {
            title: c.title,
            description: c.description || null,
            rules: c.rules || null,
            video_url: c.video_url.trim() || null,
            prize_instructions: c.prize_instructions || null,
            starts_at: c.starts_at,
            ends_at: c.ends_at,
            max_participants: c.max_participants === "" ? null : Number(c.max_participants),
        };
        if (!edition.figé) corps.scoring = c.scoring;

        setEnregistrement(true);
        const reponse = await agir(edition.id === null ? api.postData("v3/admin/competitions", corps) : api.updateData(`v3/admin/competitions/${edition.id}`, corps), true);

        // Les lots, d'un bloc, une fois le concours enregistré.
        const id = edition.id ?? reponse?.data?.id;
        let lotsOk = true;
        if (reponse && id && !edition.figé) {
            const lots = c.lots.filter((l) => l.label.trim() !== "");
            lotsOk = (await agir(api.updateData(`v3/admin/competitions/${id}/prizes`, { prizes: lots }), true)) !== null;
        }
        setEnregistrement(false);

        if (reponse && lotsOk) {
            toast.success("Concours enregistré");
            setEdition(null);
        }
    };

    const annoncer = async (c: Concours) => {
        const { isConfirmed, value } = await Swal.fire({
            title: "Annoncer le concours",
            html: `Il deviendra visible des chauffeurs, et tous les chauffeurs actifs seront prévenus.<br><br>Laissez vide pour l'annoncer tout de suite, ou choisissez quand :`,
            input: "datetime-local",
            showCancelButton: true,
            confirmButtonText: "Annoncer",
            cancelButtonText: "Annuler",
        });
        if (isConfirmed) agir(api.postData(`v3/admin/competitions/${c.id}/announce`, value ? { announced_at: value } : {}));
    };

    const cloturer = async (c: Concours) => {
        const { isConfirmed } = await Swal.fire({
            title: "Clôturer ce concours ?",
            text: "Il disparaît de l'application des chauffeurs. À faire une fois les lots remis.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Clôturer",
            cancelButtonText: "Pas encore",
        });
        if (isConfirmed) agir(api.postData(`v3/admin/competitions/${c.id}/close`, {}));
    };

    const annuler = async (c: Concours) => {
        const { isConfirmed } = await Swal.fire({
            title: "Annuler ce concours ?",
            text: "Il disparaît pour les chauffeurs, et les inscrits sont prévenus. Un concours annulé ne se rouvre pas.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Annuler le concours",
            cancelButtonText: "Garder",
        });
        if (isConfirmed) agir(api.postData(`v3/admin/competitions/${c.id}/cancel`, {}));
    };

    const ouvrir = async (c: Concours, vue: "inscrits" | "classement") => {
        if (panneau?.id === c.id && panneau.vue === vue) return setPanneau(null);
        setPanneau({ id: c.id, vue, inscrits: null });
        if (vue !== "inscrits") return;
        try {
            const { data } = await api.getData(`v3/admin/competitions/${c.id}/participants`);
            setPanneau({ id: c.id, vue, inscrits: data?.success ? data.data : [] });
        } catch {
            setPanneau({ id: c.id, vue, inscrits: [] });
        }
    };

    const champ = (cle: Exclude<keyof Formulaire, "scoring" | "lots">, valeur: string) => edition && setEdition({ ...edition, champs: { ...edition.champs, [cle]: valeur } });

    const bareme = (cle: Exclude<keyof Bareme, "rating">, valeur: string) =>
        edition && setEdition({ ...edition, champs: { ...edition.champs, scoring: { ...edition.champs.scoring, [cle]: Number(valeur) } } });

    const note = (cle: keyof Bareme["rating"], valeur: string) =>
        edition && setEdition({ ...edition, champs: { ...edition.champs, scoring: { ...edition.champs.scoring, rating: { ...edition.champs.scoring.rating, [cle]: Number(valeur) } } } });

    const lot = (i: number, cle: keyof Lot, valeur: string) =>
        edition &&
        setEdition({
            ...edition,
            // Un minimum vide : pas de minimum.
            champs: {
                ...edition.champs,
                lots: edition.champs.lots.map((l, j) => (j === i ? { ...l, [cle]: cle === "label" ? valeur : cle === "min_points" ? (valeur.trim() === "" ? null : Number(valeur)) : Number(valeur) } : l)),
            },
        });

    const ajouterLot = () => {
        if (!edition) return;
        const dernier = edition.champs.lots[edition.champs.lots.length - 1];
        const suivant = dernier ? dernier.rank_to + 1 : 1;
        setEdition({ ...edition, champs: { ...edition.champs, lots: [...edition.champs.lots, { rank_from: suivant, rank_to: suivant, label: "", min_points: null, estimated_value: 0 }] } });
    };

    const retirerLot = (i: number) => edition && setEdition({ ...edition, champs: { ...edition.champs, lots: edition.champs.lots.filter((_, j) => j !== i) } });

    const actifs = concours?.filter((c) => c.status === "announced" || c.status === "running" || c.status === "frozen") ?? [];

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header>
                <div className="px-8 py-6 max-w-7xl mx-auto flex items-end justify-between gap-6 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Concours</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Les concours entre chauffeurs : annoncés avec un compte à rebours, classés aux points, avec des lots remis par Ongo.
                        </p>
                    </div>
                    <Button variant="primary" icon="add" onClick={nouveau} disabled={!baremeParDefaut}>
                        Nouveau concours
                    </Button>
                </div>
            </header>

            <div className="px-8 py-8 max-w-7xl mx-auto space-y-8">
                {!concours ? (
                    <Loading />
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatCard label="Visibles des chauffeurs" value={String(actifs.length)} icon={Trophy} />
                            <StatCard label="Inscrits en ce moment" value={actifs.reduce((n, c) => n + c.participants_count, 0).toLocaleString("fr-FR")} icon={UsersRound} />
                            <StatCard label="Budget des lots en jeu" value={francs(actifs.reduce((n, c) => n + budgetDe(c.prizes), 0))} icon={Gift} />
                            <StatCard label="Brouillons" value={String(concours.filter((c) => c.status === "draft").length)} icon={CalendarClock} />
                        </div>

                        {edition && (
                            <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-6">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{edition.id === null ? "Nouveau concours" : "Modifier le concours"}</h2>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 md:col-span-2">
                                        Titre
                                        <Input id="concours-titre" className="mt-1" value={edition.champs.title} onChange={(e) => champ("title", e.target.value)} placeholder="Le chauffeur du mois" />
                                    </label>
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Début
                                        <Input id="concours-debut" type="datetime-local" className="mt-1" value={edition.champs.starts_at} onChange={(e) => champ("starts_at", e.target.value)} />
                                    </label>
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Fin
                                        <Input id="concours-fin" type="datetime-local" className="mt-1" value={edition.champs.ends_at} onChange={(e) => champ("ends_at", e.target.value)} />
                                    </label>
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Nombre de places
                                        <Input id="concours-places" type="number" min={1} className="mt-1" value={edition.champs.max_participants} onChange={(e) => champ("max_participants", e.target.value)} placeholder="Vide : sans limite" />
                                    </label>
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Retrait des lots
                                        <Input id="concours-retrait" className="mt-1" value={edition.champs.prize_instructions} onChange={(e) => champ("prize_instructions", e.target.value)} placeholder="À retirer à l'agence d'Akwa, pièce d'identité" />
                                    </label>
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 md:col-span-2">
                                        Vidéo de présentation (lien, facultatif)
                                        <Input id="concours-video" type="url" className="mt-1" value={edition.champs.video_url} onChange={(e) => champ("video_url", e.target.value)} placeholder="https://youtu.be/…" />
                                    </label>
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 md:col-span-2">
                                        Description
                                        <textarea id="concours-description" rows={2} className={cx(champTexte, "mt-1")} value={edition.champs.description} onChange={(e) => champ("description", e.target.value)} />
                                    </label>
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 md:col-span-2">
                                        Règlement
                                        <textarea id="concours-reglement" rows={4} className={cx(champTexte, "mt-1")} value={edition.champs.rules} onChange={(e) => champ("rules", e.target.value)} placeholder="Ce que le chauffeur lit avant de s'inscrire." />
                                    </label>
                                </div>

                                {edition.figé ? (
                                    <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-800/50">Le classement est figé : le barème et les lots ne changent plus.</p>
                                ) : (
                                    <>
                                        <div className="space-y-3">
                                            <div className="flex items-end justify-between gap-3">
                                                <div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white">Lots</h3>
                                                    <p className="text-xs text-slate-500">Un rang ou une tranche de rangs par lot. Un chauffeur sans point ne gagne rien ; un lot peut aussi demander un minimum de points.</p>
                                                </div>
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Budget estimé : {francs(budgetDe(edition.champs.lots))}</span>
                                            </div>
                                            {edition.champs.lots.map((l, i) => (
                                                <div key={i} className="grid grid-cols-[80px_80px_1fr_120px_140px_auto] items-end gap-2">
                                                    <label className="text-xs text-slate-500">
                                                        Du rang
                                                        <Input id={`lot-de-${i}`} type="number" min={1} size="sm" className="mt-1" value={String(l.rank_from)} onChange={(e) => lot(i, "rank_from", e.target.value)} />
                                                    </label>
                                                    <label className="text-xs text-slate-500">
                                                        Au rang
                                                        <Input id={`lot-a-${i}`} type="number" min={1} size="sm" className="mt-1" value={String(l.rank_to)} onChange={(e) => lot(i, "rank_to", e.target.value)} />
                                                    </label>
                                                    <label className="text-xs text-slate-500">
                                                        Lot
                                                        <Input id={`lot-libelle-${i}`} size="sm" className="mt-1" value={l.label} onChange={(e) => lot(i, "label", e.target.value)} placeholder="Bon carburant 20 000 F" />
                                                    </label>
                                                    <label className="text-xs text-slate-500" title="Facultatif. Sous ce minimum, le chauffeur ne gagne pas ce lot, même bien classé ; le lot ne passe pas au suivant.">
                                                        Points min.
                                                        <Input id={`lot-min-${i}`} type="number" min={1} size="sm" className="mt-1" value={l.min_points === null ? "" : String(l.min_points)} onChange={(e) => lot(i, "min_points", e.target.value)} placeholder="Aucun" />
                                                    </label>
                                                    <label className="text-xs text-slate-500">
                                                        Valeur estimée (F)
                                                        <Input id={`lot-valeur-${i}`} type="number" min={0} size="sm" className="mt-1" value={String(l.estimated_value)} onChange={(e) => lot(i, "estimated_value", e.target.value)} />
                                                    </label>
                                                    <Button size="sm" variant="ghost" onClick={() => retirerLot(i)}>
                                                        Retirer
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button size="sm" onClick={ajouterLot}>
                                                Ajouter un lot
                                            </Button>
                                        </div>

                                        <details className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                                            <summary className="cursor-pointer font-bold text-slate-900 dark:text-white">Barème des points</summary>
                                            <p className="mt-2 text-xs text-slate-500">
                                                Une course rapporte la base, plus des points par km, plus un bonus de prise en charge lointaine ; le tout multiplié par le coefficient de la note du client.
                                            </p>
                                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                {CHAMPS_BAREME.map((b) => (
                                                    <label key={b.cle} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                        {b.libelle}
                                                        <Input id={`bareme-${b.cle}`} type="number" min={0} step="any" size="sm" className="mt-1" value={String(edition.champs.scoring[b.cle])} onChange={(e) => bareme(b.cle, e.target.value)} />
                                                        <span className="mt-0.5 block font-normal text-slate-400">{b.aide}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <h4 className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Coefficient selon la note</h4>
                                            <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-6">
                                                {NOTES.map((n) => (
                                                    <label key={n.cle} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                        {n.libelle}
                                                        <Input id={`note-${n.cle}`} type="number" min={0} max={5} step="0.05" size="sm" className="mt-1" value={String(edition.champs.scoring.rating[n.cle])} onChange={(e) => note(n.cle, e.target.value)} />
                                                    </label>
                                                ))}
                                            </div>
                                        </details>
                                    </>
                                )}

                                <p className="text-xs text-slate-500">Les heures sont celles de votre navigateur. Une fois le concours lancé, son début ne change plus.</p>
                                <div className="flex gap-3">
                                    <Button variant="primary" loading={enregistrement} onClick={enregistrer}>
                                        Enregistrer
                                    </Button>
                                    <Button variant="ghost" onClick={() => setEdition(null)}>
                                        Fermer
                                    </Button>
                                </div>
                            </section>
                        )}

                        <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-x-auto">
                            {concours.length === 0 ? (
                                <p className="p-10 text-center text-sm text-slate-500">Aucun concours pour l'instant. Créez-en un : il restera en brouillon jusqu'à son annonce.</p>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                                        <tr className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            <th className="px-4 py-3">Concours</th>
                                            <th className="px-4 py-3">Statut</th>
                                            <th className="px-4 py-3">Début</th>
                                            <th className="px-4 py-3">Fin</th>
                                            <th className="px-4 py-3 text-right">Inscrits</th>
                                            <th className="px-4 py-3">Inscriptions</th>
                                            <th className="px-4 py-3" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {concours.map((c) => {
                                            // Fini mais pas encore figé : toujours visible, les dernières notes arrivent.
                                            const fini = c.status === "running" && new Date(c.ends_at) <= new Date();
                                            const statut = fini ? { libelle: "Terminé · résultats dans 48 h", classe: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400" } : STATUTS[c.status];
                                            const modifiable = c.status === "draft" || c.status === "announced" || c.status === "running";
                                            const cloturable = c.status === "frozen" || fini;
                                            return (
                                                <Fragment key={c.id}>
                                                    <tr>
                                                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                                                            {c.title}
                                                            {c.prizes.length > 0 && <span className="block text-xs font-normal text-slate-500">{c.prizes.length} lot(s) · {francs(budgetDe(c.prizes))}</span>}
                                                            {c.status === "announced" && c.announced_at && new Date(c.announced_at) > new Date() && (
                                                                <span className="block text-xs font-normal text-amber-700 dark:text-amber-400">Annonce prévue le {date(c.announced_at)}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={cx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold", statut.classe)}>{statut.libelle}</span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">{date(c.starts_at)}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap">{date(c.ends_at)}</td>
                                                        <td className="px-4 py-3 text-right tabular-nums">
                                                            {c.participants_count}
                                                            {c.max_participants !== null && <span className="text-slate-400"> / {c.max_participants}</span>}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {(c.status === "announced" || c.status === "running") && !fini ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => agir(api.postData(`v3/admin/competitions/${c.id}/registration`, { open: !c.registration_open }))}
                                                                    className={cx("text-xs font-bold underline-offset-2 hover:underline", c.registration_open ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}
                                                                >
                                                                    {c.registration_open ? "Ouvertes · fermer" : "Closes · rouvrir"}
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs text-slate-500">{c.status === "draft" ? (c.registration_open ? "Ouvertes" : "Closes") : "—"}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-wrap justify-end gap-2">
                                                                {c.status !== "draft" && c.status !== "cancelled" && (
                                                                    <Button size="sm" variant={c.status === "frozen" ? "primary" : "ghost"} onClick={() => ouvrir(c, "classement")}>
                                                                        {panneau?.id === c.id && panneau.vue === "classement" ? "Masquer" : "Classement"}
                                                                    </Button>
                                                                )}
                                                                {c.status !== "draft" && (
                                                                    <Button size="sm" variant="ghost" onClick={() => ouvrir(c, "inscrits")}>
                                                                        {panneau?.id === c.id && panneau.vue === "inscrits" ? "Masquer" : "Inscrits"}
                                                                    </Button>
                                                                )}
                                                                {(modifiable || c.status === "frozen") && (
                                                                    <Button size="sm" onClick={() => modifier(c)}>
                                                                        Modifier
                                                                    </Button>
                                                                )}
                                                                {c.status === "draft" && (
                                                                    <Button size="sm" variant="primary" onClick={() => annoncer(c)}>
                                                                        Annoncer
                                                                    </Button>
                                                                )}
                                                                {cloturable && (
                                                                    <Button size="sm" onClick={() => cloturer(c)}>
                                                                        Clôturer
                                                                    </Button>
                                                                )}
                                                                {(c.status === "draft" || c.status === "announced") && (
                                                                    <Button size="sm" variant="ghost" onClick={() => annuler(c)}>
                                                                        Annuler
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {panneau?.id === c.id && (
                                                        <tr>
                                                            <td colSpan={7} className="bg-slate-50 px-4 py-4 dark:bg-slate-800/40">
                                                                {panneau.vue === "classement" ? (
                                                                    <CompetitionLeaderboard competitionId={c.id} lots={c.prizes.filter((p): p is Lot & { id: number } => p.id !== undefined)} />
                                                                ) : panneau.inscrits === null ? (
                                                                    <Loading />
                                                                ) : panneau.inscrits.length === 0 ? (
                                                                    <p className="text-sm text-slate-500">Personne n'est encore inscrit.</p>
                                                                ) : (
                                                                    <ol className="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
                                                                        {panneau.inscrits.map((i, rang) => (
                                                                            <li key={i.id} className="flex justify-between gap-3">
                                                                                <span>
                                                                                    <span className="tabular-nums text-slate-400">{rang + 1}. </span>
                                                                                    {[i.prenom, i.nom].filter(Boolean).join(" ") || `Chauffeur ${i.driver_id}`}
                                                                                    {i.telephone && <span className="text-slate-400"> · {i.telephone}</span>}
                                                                                </span>
                                                                                <span className="whitespace-nowrap text-xs text-slate-500">{date(i.joined_at)}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ol>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </section>
                    </>
                )}
            </div>
        </MainLayout>
    );
}
