import { useEffect, useState } from "react";
import { CalendarDays, CalendarRange, Clock } from "lucide-react";
import ApiService from "../../services/ApiService";
import Loading from "../../components/Loading";
import { StatCard, cx } from "../../components/ui";
import { Panneau } from "../partner/space/suivi";
import { duree } from "../../functions/temps";

interface Periode {
    id: number;
    started_at: string;
    last_seen_at: string;
    ended_at: string | null;
    end_reason: string | null;
    secondes: number;
    ouverte: boolean;
}

interface TempsEnService {
    totaux: { aujourdhui: number; sept_jours: number; trente_jours: number };
    jours: { date: string; secondes: number }[];
    periodes: Periode[];
}

/** Comment une période s'est terminée, dit au back-office. */
const FINS: Record<string, string> = {
    driver: "Hors service par lui-même",
    admin: "Mis hors service par l'administration",
    logout: "Déconnexion",
    inactivity: "Inactivité",
    gap: "Plus de signe de vie",
};

const heure = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Le temps en service d'un chauffeur : de sa mise en service à son dernier
 * signe de vie. Un silence de plus de dix minutes clôt la période, et ce
 * silence n'est compté nulle part.
 */
export default function DriverService({ driverId }: { driverId: string }) {
    const [donnees, setDonnees] = useState<TempsEnService | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);

    useEffect(() => {
        let abandonnee = false;
        new ApiService()
            .getData(`v3/admin/drivers/${driverId}/sessions`)
            .then(({ data }) => {
                if (abandonnee) return;
                if (data?.success) setDonnees(data.data);
                else setErreur(data?.message ?? "Temps en service indisponible.");
            })
            .catch(() => !abandonnee && setErreur("Le serveur ne répond pas."));

        return () => {
            abandonnee = true;
        };
    }, [driverId]);

    if (!donnees) {
        return erreur ? <p className="text-sm text-rose-700">{erreur}</p> : <Loading />;
    }

    const { totaux, jours, periodes } = donnees;
    const plusLong = Math.max(3600, ...jours.map((j) => j.secondes));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Aujourd'hui" value={duree(totaux.aujourdhui)} icon={Clock} />
                <StatCard label="7 derniers jours" value={duree(totaux.sept_jours)} icon={CalendarDays} note={`${duree(totaux.sept_jours / 7)} par jour en moyenne`} />
                <StatCard label="30 derniers jours" value={duree(totaux.trente_jours)} icon={CalendarRange} note={`${duree(totaux.trente_jours / 30)} par jour en moyenne`} />
            </div>

            <Panneau titre="Heures en service par jour" sousTitre="Les 30 derniers jours. Une période à cheval sur minuit compte pour les deux jours.">
                <div className="flex h-40 items-end gap-1" role="img" aria-label="Heures en service par jour sur 30 jours">
                    {jours.map((j) => (
                        <div key={j.date} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${new Date(j.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} : ${duree(j.secondes)}`}>
                            <div
                                className={cx("w-full rounded-t", j.secondes > 0 ? "bg-primary" : "bg-slate-100 dark:bg-slate-800")}
                                style={{ height: `${Math.max(2, (j.secondes / plusLong) * 100)}%` }}
                            />
                        </div>
                    ))}
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                    <span>{new Date(jours[0].date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                    <span>Max {duree(plusLong)}</span>
                    <span>Aujourd'hui</span>
                </div>
            </Panneau>

            <Panneau titre="Périodes en service" sousTitre="Les 50 plus récentes.">
                {periodes.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune période enregistrée. Elles commencent à sa prochaine mise en service.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    <th className="py-2 pr-4">Début</th>
                                    <th className="py-2 pr-4">Dernier signe</th>
                                    <th className="py-2 pr-4 text-right">Durée</th>
                                    <th className="py-2">Fin</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {periodes.map((p) => (
                                    <tr key={p.id}>
                                        <td className="py-2 pr-4 whitespace-nowrap">{heure(p.started_at)}</td>
                                        <td className="py-2 pr-4 whitespace-nowrap">{heure(p.last_seen_at)}</td>
                                        <td className="py-2 pr-4 text-right tabular-nums font-semibold">{duree(p.secondes)}</td>
                                        <td className="py-2">
                                            {p.ouverte ? (
                                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">En service</span>
                                            ) : (
                                                <span className="text-slate-600 dark:text-slate-400">{FINS[p.end_reason ?? ""] ?? "En attente de clôture"}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panneau>
        </div>
    );
}
