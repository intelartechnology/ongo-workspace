import { Fragment, useEffect, useState } from "react";
import type { AxiosResponse } from "axios";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import ApiService from "../../services/ApiService";
import Loading from "../../components/Loading";
import { Button, cx } from "../../components/ui";

/**
 * Le classement d'un concours, pour le back-office.
 *
 * En direct pendant le concours ; figé ensuite, 48 h après la fin. Une fois
 * figé, chaque gagnant se valide ou s'écarte, et son lot se marque remis — la
 * remise elle-même se fait hors du système. Chaque ligne montre les courses
 * examinées et les alertes : de quoi vérifier avant de valider.
 */

interface Course {
    course_id: number;
    date: string;
    montant: number;
    distance_m: number | null;
    approach_m: number | null;
    rating: number | null;
    points: number;
    counted: boolean;
    reason: "minimum" | "same_client" | null;
}

interface Ligne {
    driver_id: number;
    name: string;
    telephone: string | null;
    rank: number;
    points: number;
    rides_counted: number;
    rides: Course[];
    flags: string[];
    prize: { id: number; label: string; estimated_value: number } | null;
    result_id: number | null;
    status: "pending" | "validated" | "disqualified" | null;
    reason: string | null;
    delivery_status: "pending" | "delivered" | "cancelled" | null;
    delivery_note: string | null;
    delivered_at: string | null;
}

interface Classement {
    frozen: boolean;
    budget: number;
    lignes: Ligne[];
}

interface Lot {
    id: number;
    label: string;
}

const francs = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F`;
const km = (m: number | null) => (m === null ? "—" : `${(m / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`);
const quand = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const DECISIONS = {
    pending: { libelle: "À valider", classe: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
    validated: { libelle: "Validé", classe: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
    disqualified: { libelle: "Écarté", classe: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400" },
} as const;

export default function CompetitionLeaderboard({ competitionId, lots }: { competitionId: number; lots: Lot[] }) {
    const [classement, setClassement] = useState<Classement | null>(null);
    const [ouverte, setOuverte] = useState<number | null>(null);

    const api = new ApiService();

    const charger = async () => {
        try {
            const { data } = await api.getData(`v3/admin/competitions/${competitionId}/leaderboard`);
            if (data?.success) setClassement(data.data);
            else toast.error(data?.message ?? "Classement indisponible.");
        } catch {
            toast.error("Le serveur ne répond pas.");
        }
    };

    useEffect(() => {
        charger();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [competitionId]);

    const agir = async (appel: Promise<AxiosResponse>) => {
        try {
            const { data } = await appel;
            if (data?.success) {
                toast.success(data.message);
                await charger();
                return;
            }
            toast.error(data?.message ?? "Action refusée.");
        } catch (erreur) {
            const message = (erreur as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(message ?? "Le serveur ne répond pas.");
        }
    };

    const valider = (l: Ligne) => agir(api.postData(`v3/admin/competition-results/${l.result_id}/validate`, {}));

    const ecarter = async (l: Ligne) => {
        const { isConfirmed, value } = await Swal.fire({
            title: `Écarter ${l.name} ?`,
            text: "Son lot n'est pas donné au suivant tout seul : vous pourrez l'attribuer ensuite.",
            input: "text",
            inputPlaceholder: "Le motif, par exemple : courses répétées avec un proche",
            inputValidator: (v) => (!v || v.trim().length < 3 ? "Le motif est obligatoire." : undefined),
            showCancelButton: true,
            confirmButtonText: "Écarter",
            cancelButtonText: "Annuler",
        });
        if (isConfirmed) agir(api.postData(`v3/admin/competition-results/${l.result_id}/disqualify`, { reason: value }));
    };

    const donnerUnLot = async (l: Ligne) => {
        const options: Record<string, string> = { "": "Aucun lot" };
        lots.forEach((lot) => (options[String(lot.id)] = lot.label));

        const { isConfirmed, value } = await Swal.fire({
            title: `Lot de ${l.name}`,
            text: "Il repassera par la validation.",
            input: "select",
            inputOptions: options,
            inputValue: l.prize ? String(l.prize.id) : "",
            showCancelButton: true,
            confirmButtonText: "Enregistrer",
            cancelButtonText: "Annuler",
        });
        if (isConfirmed) agir(api.postData(`v3/admin/competition-results/${l.result_id}/prize`, { prize_id: value ? Number(value) : null }));
    };

    const remettre = async (l: Ligne) => {
        const { isConfirmed, value } = await Swal.fire({
            title: `Lot remis à ${l.name}`,
            text: `${l.prize?.label ?? ""} — remis hors du système. Notez comment, pour garder une trace.`,
            input: "textarea",
            inputPlaceholder: "Lieu, date, code du bon, référence Mobile Money…",
            showCancelButton: true,
            confirmButtonText: "Marquer remis",
            cancelButtonText: "Annuler",
        });
        if (isConfirmed) agir(api.postData(`v3/admin/competition-results/${l.result_id}/deliver`, { note: value || null }));
    };

    if (!classement) return <Loading />;

    if (classement.lignes.length === 0) {
        return <p className="text-sm text-slate-500">Personne n'est encore inscrit.</p>;
    }

    return (
        <div className="space-y-3">
            <p className="text-xs text-slate-500">
                {classement.frozen ? "Classement figé : validez ou écartez chaque gagnant, puis marquez son lot remis." : "Classement en direct, recalculé à chaque ouverture."}
                {classement.budget > 0 && <> · Budget estimé des lots : {francs(classement.budget)}</>}
            </p>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                        <tr className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            <th className="py-2 pr-3">Rang</th>
                            <th className="py-2 pr-3">Chauffeur</th>
                            <th className="py-2 pr-3 text-right">Points</th>
                            <th className="py-2 pr-3 text-right">Courses</th>
                            <th className="py-2 pr-3">Lot</th>
                            {classement.frozen && <th className="py-2 pr-3">Gagnant</th>}
                            {classement.frozen && <th className="py-2 pr-3">Remise</th>}
                            <th className="py-2" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {classement.lignes.map((l) => (
                            <Fragment key={l.driver_id}>
                                <tr>
                                    <td className="py-2 pr-3 font-bold tabular-nums">{l.rank}</td>
                                    <td className="py-2 pr-3">
                                        <span className="font-semibold text-slate-900 dark:text-white">{l.name}</span>
                                        {l.telephone && <span className="text-slate-400"> · {l.telephone}</span>}
                                        {l.flags.map((f) => (
                                            <span key={f} className="block text-xs font-semibold text-amber-700 dark:text-amber-400">
                                                ⚠ {f}
                                            </span>
                                        ))}
                                        {l.status === "disqualified" && l.reason && <span className="block text-xs text-rose-700 dark:text-rose-400">Écarté : {l.reason}</span>}
                                    </td>
                                    <td className="py-2 pr-3 text-right font-bold tabular-nums">{l.points.toLocaleString("fr-FR")}</td>
                                    <td className="py-2 pr-3 text-right tabular-nums">{l.rides_counted}</td>
                                    <td className="py-2 pr-3">{l.prize?.label ?? <span className="text-slate-400">—</span>}</td>
                                    {classement.frozen && (
                                        <td className="py-2 pr-3">
                                            {l.status && <span className={cx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold", DECISIONS[l.status].classe)}>{DECISIONS[l.status].libelle}</span>}
                                        </td>
                                    )}
                                    {classement.frozen && (
                                        <td className="py-2 pr-3 text-xs">
                                            {l.delivery_status === "delivered" ? (
                                                <span className="font-semibold text-emerald-700 dark:text-emerald-400" title={l.delivery_note ?? undefined}>
                                                    Remis{l.delivered_at ? ` le ${quand(l.delivered_at)}` : ""}
                                                </span>
                                            ) : l.delivery_status === "pending" ? (
                                                <span className="font-semibold text-amber-700 dark:text-amber-400">À remettre</span>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                    )}
                                    <td className="py-2">
                                        <div className="flex flex-wrap justify-end gap-2">
                                            <Button size="sm" variant="ghost" onClick={() => setOuverte(ouverte === l.driver_id ? null : l.driver_id)}>
                                                {ouverte === l.driver_id ? "Masquer" : "Courses"}
                                            </Button>
                                            {classement.frozen && l.result_id !== null && l.delivery_status !== "delivered" && (
                                                <>
                                                    {l.prize && l.status !== "validated" && (
                                                        <Button size="sm" variant="primary" onClick={() => valider(l)}>
                                                            Valider
                                                        </Button>
                                                    )}
                                                    {l.status === "validated" && l.prize && (
                                                        <Button size="sm" variant="primary" onClick={() => remettre(l)}>
                                                            Marquer remis
                                                        </Button>
                                                    )}
                                                    {l.status !== "disqualified" && (
                                                        <Button size="sm" variant="ghost" onClick={() => ecarter(l)}>
                                                            Écarter
                                                        </Button>
                                                    )}
                                                    <Button size="sm" variant="ghost" onClick={() => donnerUnLot(l)}>
                                                        Lot…
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                {ouverte === l.driver_id && (
                                    <tr>
                                        <td colSpan={8} className="bg-white pb-3 dark:bg-slate-900">
                                            {l.rides.length === 0 ? (
                                                <p className="py-2 text-xs text-slate-500">Aucune course pendant le concours.</p>
                                            ) : (
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="text-slate-500">
                                                            <th className="py-1 pr-3 text-left">Course</th>
                                                            <th className="py-1 pr-3 text-left">Date</th>
                                                            <th className="py-1 pr-3 text-right">Montant</th>
                                                            <th className="py-1 pr-3 text-right">Trajet</th>
                                                            <th className="py-1 pr-3 text-right">Prise en charge</th>
                                                            <th className="py-1 pr-3 text-right">Note</th>
                                                            <th className="py-1 pr-3 text-right">Points</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {l.rides.map((r) => (
                                                            <tr key={r.course_id} className={cx(!r.counted && "text-slate-400 line-through")}>
                                                                <td className="py-1 pr-3">#{r.course_id}</td>
                                                                <td className="py-1 pr-3">{quand(r.date)}</td>
                                                                <td className="py-1 pr-3 text-right tabular-nums">{francs(r.montant)}</td>
                                                                <td className="py-1 pr-3 text-right tabular-nums">{km(r.distance_m)}</td>
                                                                <td className="py-1 pr-3 text-right tabular-nums">{km(r.approach_m)}</td>
                                                                <td className="py-1 pr-3 text-right">{r.rating ? `${r.rating} ★` : "—"}</td>
                                                                <td className="py-1 pr-3 text-right tabular-nums font-semibold">
                                                                    {r.counted ? r.points : r.reason === "same_client" ? "même client" : "sous le minimum"}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
