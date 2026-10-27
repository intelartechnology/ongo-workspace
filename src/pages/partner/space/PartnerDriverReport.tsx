import { useEffect, useState } from "react";
import Trajet from "../../components/Trajet";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Banknote, CalendarCheck, CircleCheck, CircleX, Coins, Hand, HandCoins, Star, TriangleAlert, Wallet } from "lucide-react";
import ApiService from "../../../services/ApiService";
import Loading from "../../../components/Loading";
import { Avatar, StatCard, cx } from "../../../components/ui";
import { ilYA } from "../../../functions/temps";
import { notifier } from "../../../services/notifier";
import { CourbeActivite, Entonnoir, HeuresManquees, ListeAlertes, Panneau, SelecteurPeriode } from "./suivi";
import { type Alerte, type Point, type Totaux, bornes, ecart, ecartPoints, francs, nombre, pourcent, quand } from "./suiviDonnees";

interface Rapport {
    driver: {
        driver_id: number;
        nom: string | null;
        prenom: string | null;
        telephone: string | null;
        photo: string | null;
        vehicle: string | null;
        is_online: boolean;
        last_activity_at: string | null;
        member_since: string | null;
        is_active: boolean;
        balance: number | null;
    };
    totals: Totaux;
    previous_totals: Totaux;
    series: Point[];
    missed_by_hour: number[];
    alerts: Alerte[];
    courses: { id: number; date: string; status: string; amount: number; from: string | null; to: string | null; commission: number | null }[];
    missed: { date: string; reason: "late" | "no_answer" | "refused"; from: string | null; to: string | null; amount: number; outcome: string | null }[];
    is_owner: boolean;
}

interface Props {
    partnerId: string;
    driverId: string;
    theme: "light" | "dark";
}

const STATUTS: Record<string, { texte: string; ton: string }> = {
    TERMINEE: { texte: "Terminée", ton: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
    ANNULEE: { texte: "Annulée", ton: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" },
    "ANNULEE AUTO": { texte: "Annulée", ton: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" },
};

const RAISONS = {
    late: "Trop tard",
    no_answer: "Sans réponse",
    refused: "Refusée",
};

/**
 * Le rapport de suivi d'un chauffeur, pour son partenaire.
 *
 * Ce qu'il a fait, ce qu'il a laissé passer, ce qu'il rapporte — et en haut,
 * ce qui demande une décision. Les courses manquées sont listées une à une,
 * avec ce qu'elles valaient : c'est la conversation qu'on aura avec lui.
 */
export default function PartnerDriverReport({ partnerId, driverId, theme }: Props) {
    const navigate = useNavigate();
    const [jours, setJours] = useState(30);
    const [rapport, setRapport] = useState<Rapport | null>(null);
    const [reponse, setReponse] = useState<{ cle: string; erreur: string | null } | null>(null);
    const [vue, setVue] = useState<"courses" | "manquees">("courses");
    const cle = `${driverId}-${jours}`;
    const chargement = reponse?.cle !== cle;

    useEffect(() => {
        let abandonnee = false;
        new ApiService()
            .getData(`v3/partner/${partnerId}/drivers/${driverId}/report`, bornes(jours))
            .then(({ data }) => {
                if (abandonnee) return;
                if (data?.success) setRapport(data.data);
                setReponse({ cle: `${driverId}-${jours}`, erreur: data?.success ? null : (data?.message ?? "Rapport indisponible.") });
            })
            .catch(() => !abandonnee && setReponse({ cle: `${driverId}-${jours}`, erreur: "Le serveur ne répond pas." }));

        return () => {
            abandonnee = true;
        };
    }, [partnerId, driverId, jours]);

    if (!rapport) {
        return reponse?.erreur ? <p className="text-sm text-rose-700">{reponse.erreur}</p> : <Loading />;
    }

    const { driver: d, totals: t, previous_totals: p, is_owner: proprietaire } = rapport;
    const nom = [d.prenom, d.nom].filter(Boolean).join(" ") || `Chauffeur #${d.driver_id}`;
    const valeurManquee = rapport.missed.reduce((s, m) => s + m.amount, 0);

    return (
        <div className={cx("space-y-6 transition-opacity", chargement && "opacity-60")}>
            <div className="flex flex-wrap items-start gap-4">
                <button
                    onClick={() => navigate(`/partner/${partnerId}/chauffeurs`)}
                    title="Retour aux chauffeurs"
                    className="mt-1 grid size-9 place-items-center rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                    <ArrowLeft className="size-4" />
                </button>
                <div className="relative size-14 shrink-0">
                    <div className="size-14 overflow-hidden rounded-full">
                        <Avatar photo={d.photo} nom={d.nom || d.prenom} className="text-xl" />
                    </div>
                    <span className={cx("absolute bottom-0 right-0 size-3.5 rounded-full ring-2 ring-slate-50 dark:ring-background-dark", d.is_online ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600")} />
                </div>
                <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{nom}</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        <span className={d.is_online ? "font-medium text-emerald-700 dark:text-emerald-400" : ""}>{d.is_online ? "En ligne" : "Hors ligne"}</span>
                        {` · actif ${ilYA(d.last_activity_at)}`}
                        {d.vehicle ? ` · ${d.vehicle}` : " · sans véhicule"}
                        {d.telephone ? ` · ${d.telephone}` : ""}
                        {!d.is_active && " · désactivé dans votre flotte"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => notifier({ destinataires: [{ id: d.driver_id, nom }] })}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        Notifier
                    </button>
                    {d.telephone && (
                        <a href={`tel:${d.telephone}`} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 dark:bg-primary-container">
                            Appeler
                        </a>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <SelecteurPeriode jours={jours} onChange={setJours} />
                {d.member_since && <p className="text-[13px] text-slate-500">Dans votre flotte depuis le {new Date(d.member_since.replace(" ", "T")).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>}
            </div>

            {rapport.alerts.length > 0 && (
                <Panneau titre="Ce qui demande une décision">
                    <ListeAlertes alertes={rapport.alerts} />
                </Panneau>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Courses terminées" value={nombre(t.completed)} icon={CircleCheck} delta={{ value: ecart(t.completed, p.completed) }} note={`${nombre(t.active_days)} jours d'activité`} />
                <StatCard label="Chiffre d'affaires" value={francs(t.revenue)} icon={Banknote} delta={{ value: ecart(t.revenue, p.revenue) }} note={`Panier moyen ${francs(t.average_fare)}`} />
                <StatCard
                    label="Courses acceptées"
                    value={pourcent(t.acceptance_rate)}
                    icon={Hand}
                    delta={{ value: ecartPoints(t.acceptance_rate, p.acceptance_rate), unit: "pts" }}
                    note={`${nombre(t.accepted)} sur ${nombre(t.offers)} proposées`}
                />
                <StatCard
                    label="Courses manquées"
                    value={nombre(t.missed)}
                    icon={TriangleAlert}
                    alert={t.missed > t.accepted && t.missed > 0}
                    note={valeurManquee ? `Au moins ${francs(valeurManquee)} de courses laissées` : `${nombre(t.refused)} refusées`}
                />
                <StatCard label="Annulées après acceptation" value={nombre(t.cancelled_after_accept)} icon={CircleX} alert={t.cancelled_after_accept >= 3} note={`Taux d'aboutissement ${pourcent(t.completion_rate)}`} />
                <StatCard label="Gains du chauffeur" value={francs(t.driver_earnings)} icon={Coins} note="Sa part des courses terminées" />
                {proprietaire && <StatCard label="Votre commission" value={francs(t.partner_commission)} icon={HandCoins} delta={{ value: ecart(t.partner_commission, p.partner_commission) }} />}
                {proprietaire && (
                    <StatCard
                        label="Solde de son compte"
                        value={francs(d.balance)}
                        icon={Wallet}
                        alert={(d.balance ?? 0) < 0}
                        note={(d.balance ?? 0) < 0 ? "Espèces encaissées dues à Ongo" : "Ce qu'Ongo lui doit"}
                    />
                )}
                <StatCard label="Note des clients" value={t.rating === null ? "—" : `${t.rating.toLocaleString("fr-FR")} / 5`} icon={Star} note={t.ratings_count ? `${t.ratings_count} avis` : "Aucun avis sur la période"} />
                <StatCard label="Jours d'activité" value={nombre(t.active_days)} icon={CalendarCheck} note="Jours avec au moins une course acceptée" />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Panneau titre="Son activité" sousTitre="Courses terminées et manquées, sur la période." className="xl:col-span-2">
                    <CourbeActivite serie={rapport.series} theme={theme} />
                </Panneau>
                <Panneau titre="De la proposition à la course">
                    <Entonnoir t={t} theme={theme} />
                </Panneau>
            </div>

            <Panneau titre="Quand il manque des courses" sousTitre="Par heure de la proposition : les créneaux où il n'est pas disponible.">
                <HeuresManquees heures={rapport.missed_by_hour} theme={theme} />
            </Panneau>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                    <h2 className="text-[16px] font-bold tracking-tight text-slate-900 dark:text-white">Historique</h2>
                    <div role="tablist" className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
                        {([
                            // Les listes s'arrêtent aux cent plus récentes : le dire, pour
                            // ne pas faire passer « 100 » pour un total.
                            ["courses", `Ses courses (${rapport.courses.length >= 100 ? "100 plus récentes" : rapport.courses.length})`],
                            ["manquees", `Manquées et refusées (${rapport.missed.length >= 100 ? "100 plus récentes" : rapport.missed.length})`],
                        ] as const).map(([v, libelle]) => (
                            <button
                                key={v}
                                role="tab"
                                aria-selected={vue === v}
                                onClick={() => setVue(v)}
                                className={cx(
                                    "whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                                    vue === v ? "bg-primary text-white dark:bg-primary-container" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
                                )}
                            >
                                {libelle}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {vue === "courses" ? (
                        <table className="w-full min-w-[760px] text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/40">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">Date</th>
                                    <th className="px-5 py-3 font-semibold">Trajet</th>
                                    <th className="px-5 py-3 text-right font-semibold">Montant</th>
                                    {proprietaire && <th className="px-5 py-3 text-right font-semibold">Commission</th>}
                                    <th className="px-5 py-3 font-semibold">État</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {rapport.courses.length === 0 ? (
                                    <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Aucune course acceptée sur la période.</td></tr>
                                ) : rapport.courses.map((c) => (
                                    <tr key={`${c.id}-${c.date}`}>
                                        <td className="whitespace-nowrap px-5 py-3 text-slate-700 dark:text-slate-300">{quand(c.date)}</td>
                                        <td className="px-5 py-3">
                                            <Trajet depart={c.from} arrivee={c.to} largeur="max-w-[360px]" />
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-slate-900 dark:text-white">{francs(c.amount)}</td>
                                        {proprietaire && <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{c.commission === null ? "—" : francs(c.commission)}</td>}
                                        <td className="px-5 py-3">
                                            <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium", STATUTS[c.status]?.ton ?? "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300")}>
                                                {STATUTS[c.status]?.texte ?? "En cours"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full min-w-[760px] text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/40">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">Date</th>
                                    <th className="px-5 py-3 font-semibold">Raison</th>
                                    <th className="px-5 py-3 font-semibold">Trajet</th>
                                    <th className="px-5 py-3 text-right font-semibold">Valeur</th>
                                    <th className="px-5 py-3 font-semibold">La course</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {rapport.missed.length === 0 ? (
                                    <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-500">Aucune course manquée sur la période.</td></tr>
                                ) : rapport.missed.map((m, i) => (
                                    <tr key={i}>
                                        <td className="whitespace-nowrap px-5 py-3 text-slate-700 dark:text-slate-300">{quand(m.date)}</td>
                                        <td className="px-5 py-3">
                                            <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium", m.reason === "refused" ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300")}>
                                                {RAISONS[m.reason]}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <Trajet depart={m.from} arrivee={m.to} largeur="max-w-[340px]" />
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-slate-900 dark:text-white">{m.amount ? francs(m.amount) : "—"}</td>
                                        {/* Prise par un autre, ou perdue pour tout le monde. */}
                                        <td className="px-5 py-3 text-xs text-slate-600 dark:text-slate-400">
                                            {m.outcome === "TERMINEE" ? "Faite par un autre chauffeur" : m.outcome && m.outcome.startsWith("ANNULEE") ? "Perdue (annulée)" : m.outcome === "NO DRIVER FOUND" ? "Perdue (aucun chauffeur)" : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>
        </div>
    );
}
