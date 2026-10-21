import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Banknote, Car, CircleCheck, Hand, HandCoins, TriangleAlert, UserRoundX, Wifi } from "lucide-react";
import ApiService from "../../../services/ApiService";
import Loading from "../../../components/Loading";
import { Avatar, StatCard, cx } from "../../../components/ui";
import { ilYA } from "../../../functions/temps";
import { CourbeActivite, Entonnoir, HeuresManquees, ListeAlertes, Panneau, SelecteurPeriode } from "./suivi";
import { type Alerte, type Point, type Totaux, bornes, ecart, ecartPoints, francs, nombre, pourcent } from "./suiviDonnees";

interface Ligne extends Totaux {
    driver_id: number;
    nom: string | null;
    prenom: string | null;
    telephone: string | null;
    photo: string | null;
    vehicle: string | null;
    is_online: boolean;
    last_activity_at: string | null;
    balance: number | null;
    alerts: Alerte[];
}

interface Donnees {
    totals: Totaux;
    previous_totals: Totaux;
    series: Point[];
    missed_by_hour: number[];
    fleet: { drivers: number; active_drivers: number; online_now: number; vehicles: number; vehicles_without_driver: number; idle_drivers: number };
    drivers: Ligne[];
    is_owner: boolean;
}

interface Props {
    partnerId: string;
    theme: "light" | "dark";
}

/**
 * Le tableau de bord d'un propriétaire de flotte.
 *
 * Trois questions, dans l'ordre : combien ma flotte rapporte-t-elle ? combien
 * de courses laisse-t-elle passer, et quand ? lequel de mes chauffeurs dois-je
 * appeler ? Chaque chiffre se compare à la période précédente.
 */
export default function PartnerDashboard({ partnerId, theme }: Props) {
    const navigate = useNavigate();
    const [jours, setJours] = useState(30);
    const [donnees, setDonnees] = useState<Donnees | null>(null);
    const [reponse, setReponse] = useState<{ jours: number; erreur: string | null } | null>(null);
    const chargement = reponse?.jours !== jours;

    useEffect(() => {
        let abandonnee = false;
        new ApiService()
            .getData(`v3/partner/${partnerId}/dashboard`, bornes(jours))
            .then(({ data }) => {
                if (abandonnee) return;
                if (data?.success) setDonnees(data.data);
                setReponse({ jours, erreur: data?.success ? null : (data?.message ?? "Tableau de bord indisponible.") });
            })
            .catch(() => !abandonnee && setReponse({ jours, erreur: "Le serveur ne répond pas." }));

        return () => {
            abandonnee = true;
        };
    }, [partnerId, jours]);

    if (!donnees) {
        return reponse?.erreur ? <p className="text-sm text-rose-700">{reponse.erreur}</p> : <Loading />;
    }

    const { totals: t, previous_totals: p, fleet: f, is_owner: proprietaire } = donnees;
    const aSurveiller = donnees.drivers.filter((d) => d.alerts.some((a) => a.level !== "info"));
    const ouvrir = (id: number) => navigate(`/partner/${partnerId}/chauffeurs/${id}`);

    return (
        <div className={cx("space-y-6 transition-opacity", chargement && "opacity-60")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <SelecteurPeriode jours={jours} onChange={setJours} />
                {reponse?.erreur && <p className="text-sm text-rose-700">{reponse.erreur}</p>}
            </div>

            {/* Ce que la flotte rapporte. */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Chiffre d'affaires" value={francs(t.revenue)} icon={Banknote} delta={{ value: ecart(t.revenue, p.revenue) }} note={`${nombre(t.completed)} courses terminées`} />
                {proprietaire ? (
                    <StatCard label="Votre commission" value={francs(t.partner_commission)} icon={HandCoins} delta={{ value: ecart(t.partner_commission, p.partner_commission) }} />
                ) : (
                    <StatCard label="Panier moyen" value={francs(t.average_fare)} icon={HandCoins} delta={{ value: ecart(t.average_fare, p.average_fare) }} />
                )}
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
                    note={`+ ${nombre(t.refused)} refusées · ${nombre(t.cancelled_after_accept)} annulées après acceptation`}
                />
            </div>

            {/* La flotte, maintenant. */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Chauffeurs actifs" value={`${f.active_drivers} / ${f.drivers}`} icon={CircleCheck} />
                <StatCard label="En ligne maintenant" value={f.online_now} icon={Wifi} />
                <StatCard label="Véhicules" value={f.vehicles} icon={Car} note={f.vehicles_without_driver ? `${f.vehicles_without_driver} sans chauffeur` : "Tous ont un chauffeur"} alert={f.vehicles_without_driver > 0} />
                <StatCard label="Chauffeurs sans course" value={f.idle_drivers} icon={UserRoundX} note="Aucune course acceptée sur la période" alert={f.idle_drivers > 0} />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Panneau titre="Activité de la flotte" sousTitre="Courses terminées et manquées, sur la période." className="xl:col-span-2">
                    <CourbeActivite serie={donnees.series} theme={theme} />
                </Panneau>
                <Panneau titre="De la proposition à la course" sousTitre="Chaque course proposée à vos chauffeurs.">
                    <Entonnoir t={t} theme={theme} />
                </Panneau>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Panneau titre="Quand les courses sont manquées" sousTitre="Par heure de la proposition." className="xl:col-span-2">
                    <HeuresManquees heures={donnees.missed_by_hour} theme={theme} />
                </Panneau>
                <Panneau titre="À surveiller" sousTitre="Les chauffeurs qui demandent une décision.">
                    {aSurveiller.length === 0 ? (
                        <p className="text-[13px] text-emerald-700 dark:text-emerald-400">Aucun chauffeur à surveiller.</p>
                    ) : (
                        <ul className="space-y-3">
                            {aSurveiller.map((d) => (
                                <li key={d.driver_id}>
                                    <button onClick={() => ouvrir(d.driver_id)} className="mb-1.5 text-sm font-semibold text-slate-900 hover:text-primary dark:text-white dark:hover:text-primary-fixed-dim">
                                        {[d.prenom, d.nom].filter(Boolean).join(" ") || `Chauffeur #${d.driver_id}`} →
                                    </button>
                                    <ListeAlertes alertes={d.alerts.filter((a) => a.level !== "info")} />
                                </li>
                            ))}
                        </ul>
                    )}
                </Panneau>
            </div>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                    <h2 className="text-[16px] font-bold tracking-tight text-slate-900 dark:text-white">Vos chauffeurs</h2>
                    <p className="mt-1 text-[13px] text-slate-500">Du plus productif au moins productif. Cliquez sur un chauffeur pour son rapport complet.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[960px] text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/40">
                            <tr>
                                <th className="px-5 py-3 font-semibold">Chauffeur</th>
                                <th className="px-5 py-3 text-right font-semibold">Terminées</th>
                                <th className="px-5 py-3 text-right font-semibold">Chiffre d'affaires</th>
                                {proprietaire && <th className="px-5 py-3 text-right font-semibold">Commission</th>}
                                <th className="px-5 py-3 text-right font-semibold">Acceptation</th>
                                <th className="px-5 py-3 text-right font-semibold">Manquées</th>
                                {proprietaire && <th className="px-5 py-3 text-right font-semibold">Solde</th>}
                                <th className="px-5 py-3 font-semibold">Dernière activité</th>
                                <th className="px-5 py-3 font-semibold">Alertes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {donnees.drivers.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-5 py-12 text-center text-slate-500">Aucun chauffeur rattaché pour l'instant.</td>
                                </tr>
                            ) : (
                                donnees.drivers.map((d) => (
                                    <tr key={d.driver_id} onClick={() => ouvrir(d.driver_id)} className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="relative size-9 shrink-0">
                                                    <div className="size-9 overflow-hidden rounded-full">
                                                        <Avatar photo={d.photo} nom={d.nom || d.prenom} />
                                                    </div>
                                                    <span
                                                        title={d.is_online ? "En ligne" : "Hors ligne"}
                                                        className={cx("absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-white dark:ring-slate-900", d.is_online ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600")}
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate font-semibold text-slate-900 dark:text-white">{[d.prenom, d.nom].filter(Boolean).join(" ") || `#${d.driver_id}`}</p>
                                                    <p className="truncate text-xs text-slate-500">{[d.is_online ? "En ligne" : "Hors ligne", d.vehicle].filter(Boolean).join(" · ")}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900 dark:text-white">{nombre(d.completed)}</td>
                                        <td className="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">{francs(d.revenue)}</td>
                                        {proprietaire && <td className="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">{francs(d.partner_commission)}</td>}
                                        <td className={cx("px-5 py-3 text-right tabular-nums", (d.acceptance_rate ?? 100) < 50 && d.offers >= 10 ? "font-semibold text-amber-700 dark:text-amber-400" : "text-slate-700 dark:text-slate-300")}>
                                            {pourcent(d.acceptance_rate)}
                                        </td>
                                        <td className="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{nombre(d.missed)}</td>
                                        {proprietaire && (
                                            <td className={cx("px-5 py-3 text-right tabular-nums whitespace-nowrap", (d.balance ?? 0) < 0 ? "font-semibold text-rose-700 dark:text-rose-400" : "text-slate-700 dark:text-slate-300")}>
                                                {francs(d.balance)}
                                            </td>
                                        )}
                                        <td className="px-5 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">{ilYA(d.last_activity_at)}</td>
                                        <td className="px-5 py-3">
                                            {d.alerts.length === 0 ? (
                                                <span className="text-xs text-emerald-700 dark:text-emerald-400">RAS</span>
                                            ) : (
                                                <span
                                                    title={d.alerts.map((a) => a.text).join("\n")}
                                                    className={cx(
                                                        "rounded-full px-2 py-0.5 text-xs font-medium",
                                                        d.alerts.some((a) => a.level === "critical")
                                                            ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                                                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
                                                    )}
                                                >
                                                    {d.alerts.length} alerte{d.alerts.length > 1 ? "s" : ""}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
