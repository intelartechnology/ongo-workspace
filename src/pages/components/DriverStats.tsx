import { useEffect, useState } from "react";
import { Banknote, CalendarCheck, CircleCheck, CircleX, Coins, Hand, HandCoins, Star, TriangleAlert, Wallet } from "lucide-react";
import ApiService from "../../services/ApiService";
import Loading from "../../components/Loading";
import { StatCard, cx } from "../../components/ui";
import { CourbeActivite, Entonnoir, HeuresManquees, ListeAlertes, Panneau, SelecteurPeriode } from "../partner/space/suivi";
import { type Alerte, type Point, type Totaux, bornes, ecart, ecartPoints, francs, nombre, pourcent } from "../partner/space/suiviDonnees";

interface Statistiques {
    totals: Totaux;
    previous_totals: Totaux;
    series: Point[];
    missed_by_hour: number[];
    alerts: Alerte[];
    balance: number;
    partner: { id: number; name: string } | null;
}

/**
 * Les statistiques d'un chauffeur, pour l'administration.
 *
 * Les mêmes chiffres et les mêmes blocs que le rapport que voit son
 * partenaire (`PartnerDriverReport`), pour n'importe quel chauffeur. La
 * commission n'apparaît que pour un chauffeur de flotte.
 */
export default function DriverStats({ driverId, theme }: { driverId: string; theme: "light" | "dark" }) {
    const [jours, setJours] = useState(30);
    const [stats, setStats] = useState<Statistiques | null>(null);
    const [reponse, setReponse] = useState<{ cle: string; erreur: string | null } | null>(null);
    const cle = `${driverId}-${jours}`;
    const chargement = reponse?.cle !== cle;

    useEffect(() => {
        let abandonnee = false;
        new ApiService()
            .getData(`v3/admin/drivers/${driverId}/stats`, bornes(jours))
            .then(({ data }) => {
                if (abandonnee) return;
                if (data?.success) setStats(data.data);
                setReponse({ cle: `${driverId}-${jours}`, erreur: data?.success ? null : (data?.message ?? "Statistiques indisponibles.") });
            })
            .catch(() => !abandonnee && setReponse({ cle: `${driverId}-${jours}`, erreur: "Le serveur ne répond pas." }));

        return () => {
            abandonnee = true;
        };
    }, [driverId, jours]);

    if (!stats) {
        return reponse?.erreur ? <p className="text-sm text-rose-700">{reponse.erreur}</p> : <Loading />;
    }

    const { totals: t, previous_totals: p } = stats;

    return (
        <div className={cx("space-y-6 transition-opacity", chargement && "opacity-60")}>
            <div className="flex flex-wrap items-center gap-3">
                <SelecteurPeriode jours={jours} onChange={setJours} />
                <p className="text-[13px] text-slate-500">
                    {stats.partner ? `Chauffeur de la flotte ${stats.partner.name}` : "Chauffeur indépendant"} · comparé à la période précédente
                </p>
            </div>

            {stats.alerts.length > 0 && (
                <Panneau titre="Ce qui demande une décision">
                    <ListeAlertes alertes={stats.alerts} />
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
                <StatCard label="Courses manquées" value={nombre(t.missed)} icon={TriangleAlert} alert={t.missed > t.accepted && t.missed > 0} note={`${nombre(t.refused)} refusées`} />
                <StatCard label="Annulées après acceptation" value={nombre(t.cancelled_after_accept)} icon={CircleX} alert={t.cancelled_after_accept >= 3} note={`Taux d'aboutissement ${pourcent(t.completion_rate)}`} />
                <StatCard label="Gains du chauffeur" value={francs(t.driver_earnings)} icon={Coins} note="Sa part des courses terminées" />
                {stats.partner && <StatCard label="Commission du partenaire" value={francs(t.partner_commission)} icon={HandCoins} delta={{ value: ecart(t.partner_commission, p.partner_commission) }} />}
                <StatCard
                    label="Solde de son compte"
                    value={francs(stats.balance)}
                    icon={Wallet}
                    alert={stats.balance < 0}
                    note={stats.balance < 0 ? "Espèces encaissées dues à Ongo" : "Ce qu'Ongo lui doit"}
                />
                <StatCard label="Note des clients" value={t.rating === null ? "—" : `${t.rating.toLocaleString("fr-FR")} / 5`} icon={Star} note={t.ratings_count ? `${t.ratings_count} avis` : "Aucun avis sur la période"} />
                <StatCard label="Jours d'activité" value={nombre(t.active_days)} icon={CalendarCheck} note="Jours avec au moins une course acceptée" />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <Panneau titre="Son activité" sousTitre="Courses terminées et manquées, sur la période." className="xl:col-span-2">
                    <CourbeActivite serie={stats.series} theme={theme} />
                </Panneau>
                <Panneau titre="De la proposition à la course">
                    <Entonnoir t={t} theme={theme} />
                </Panneau>
            </div>

            <Panneau titre="Quand il manque des courses" sousTitre="Par heure de la proposition : les créneaux où il n'est pas disponible.">
                <HeuresManquees heures={stats.missed_by_hour} theme={theme} />
            </Panneau>
        </div>
    );
}
