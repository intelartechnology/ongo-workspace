import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { ArrowLeft, Bike, CircleCheck, Clock, Coins, Hand, Wallet } from "lucide-react";
import ApiService from "../services/ApiService";
import MainLayout from "./MainLayout";
import Loading from "../components/Loading";
import { StatCard, cx } from "../components/ui";
import { ilYA } from "../functions/temps";
import { notifier } from "../services/notifier";

interface Props {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

interface Fiche {
    courier: {
        user_id: number;
        nom: string | null;
        prenom: string | null;
        telephone: string | null;
        matricule: string | null;
        modele: string | null;
        is_online: boolean;
        is_active: boolean;
        joined_at: string | null;
        last_activity_at: string | null;
    };
    account: {
        balance: number;
        debt: number;
        ceiling: number;
        driver_ceiling: number;
        movements: { id: number; amount: number; service: string | null; description: string | null; created_at: string }[];
    };
    period: { from: string; to: string };
    stats: {
        delivered: number;
        canceled: number;
        earnings: number;
        tips: number;
        distance_km: number;
        average_minutes: number | null;
        offers: number;
        accepted: number;
        missed: number;
        refused: number;
        acceptance_rate: number | null;
    };
    history: {
        id: number;
        code: string;
        status: string;
        created_at: string;
        picked_up_at: string | null;
        delivered_at: string | null;
        delivery_fee: number | null;
        tip: number | null;
        total: number | null;
        payment_method: string | null;
        delivery_address: string | null;
        store: string | null;
        earning: number;
    }[];
}

const PERIODES = [
    { jours: 7, libelle: "7 jours" },
    { jours: 30, libelle: "30 jours" },
    { jours: 90, libelle: "90 jours" },
    { jours: 365, libelle: "12 mois" },
];

const STATUTS: Record<string, { texte: string; ton: string }> = {
    delivered: { texte: "Livrée", ton: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
    picked_up: { texte: "En route", ton: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300" },
    ready: { texte: "Prête", ton: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    preparing: { texte: "En préparation", ton: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    canceled: { texte: "Annulée", ton: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" },
    rejected: { texte: "Refusée", ton: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" },
};

const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const francs = (n: number | null) => `${(n ?? 0).toLocaleString("fr-FR")} FCFA`;
const quand = (iso: string | null) =>
    iso
        ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(
              new Date(iso.replace(" ", "T")),
          )
        : "—";

/**
 * La fiche d'un livreur Ongo Eat : en ligne ou non, son compte, ce qu'il a
 * fait sur la période, et ses livraisons une à une.
 */
export default function EatCourierDetail({ onLogout, theme, toggleTheme }: Props) {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [jours, setJours] = useState(30);
    const [fiche, setFiche] = useState<Fiche | null>(null);
    const [introuvable, setIntrouvable] = useState(false);
    const [chargement, setChargement] = useState(true);

    const charger = useCallback(async () => {
        const fin = new Date();
        const debut = new Date();
        debut.setDate(fin.getDate() - (jours - 1));

        setChargement(true);
        try {
            const { data } = await new ApiService().getData(`v3/admin/eat/couriers/${id}`, { from: isoLocal(debut), to: isoLocal(fin) });
            if (data.success) setFiche(data.data);
            else setIntrouvable(true);
        } catch {
            toast.error("Impossible de récupérer la fiche du livreur");
        } finally {
            setChargement(false);
        }
    }, [id, jours]);

    useEffect(() => {
        charger();
    }, [charger]);

    /*
     * Retirer de la liste des livreurs Ongo Eat.
     *
     * Déplacé de la liste vers la fiche : on y voit ce qu'il doit et ce qu'il
     * vient de faire avant de décider. Il garde son compte et ses courses ;
     * seul son plafond d'espèces retombe à celui d'un chauffeur.
     */
    const retirer = async () => {
        if (!fiche) return;
        const { courier: livreur, account: compte } = fiche;
        const nomLivreur = [livreur.prenom, livreur.nom].filter(Boolean).join(" ") || "ce livreur";

        const confirmation = await Swal.fire({
            icon: "warning",
            title: `Retirer ${nomLivreur} ?`,
            html:
                `<p style="font-size:14px">Il garde son compte et ses courses. Son plafond d'espèces retombe à ${francs(compte.driver_ceiling)}.</p>` +
                (compte.debt > 0 ? `<p style="font-size:13px;color:#b91c1c;margin-top:8px">Il doit encore ${francs(compte.debt)} à Ongo.</p>` : ""),
            showCancelButton: true,
            confirmButtonText: "Retirer",
            cancelButtonText: "Annuler",
            confirmButtonColor: "#dc2626",
        });

        if (!confirmation.isConfirmed) return;

        try {
            const { data } = await new ApiService().postData("v3/admin/eat/couriers/remove", { user_id: livreur.user_id });

            if (!data.success) {
                Swal.fire({ icon: "error", title: "Non retiré", text: data.message });
                return;
            }

            toast.success(`${nomLivreur} retiré des livreurs`);
            navigate("/eat-couriers");
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Retrait impossible", text: String(erreur) });
        }
    };

    if (introuvable) {
        return (
            <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
                <div className="p-8 text-center text-slate-500">Ce compte n'est pas inscrit comme livreur Ongo Eat.</div>
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

    const { courier: c, account: compte, stats: s } = fiche;
    const nom = [c.prenom, c.nom].filter(Boolean).join(" ") || `Compte #${c.user_id}`;

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header>
                <div className="px-8 py-6 max-w-7xl mx-auto flex items-start gap-4">
                    <button
                        onClick={() => navigate("/eat-couriers")}
                        title="Retour aux livreurs"
                        className="mt-1 size-9 grid place-items-center rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        <ArrowLeft className="size-4" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{nom}</h1>
                        <p className="text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-x-2">
                            <span className="inline-flex items-center gap-1.5">
                                <span aria-hidden className={cx("size-2 rounded-full", c.is_online ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600")} />
                                <span className={c.is_online ? "font-medium text-emerald-700 dark:text-emerald-400" : ""}>
                                    {c.is_online ? "En ligne" : "Hors ligne"}
                                </span>
                            </span>
                            <span>· actif {ilYA(c.last_activity_at)}</span>
                            {c.telephone && <span>· {c.telephone}</span>}
                            {c.matricule && <span>· {[c.matricule, c.modele].filter(Boolean).join(" ")}</span>}
                            {!c.is_active && <span className="text-rose-700 dark:text-rose-400">· retiré de la liste</span>}
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => notifier({ destinataires: [{ id: c.user_id, nom }] })}
                            className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            Notifier
                        </button>
                        {c.is_active && (
                            <button
                                type="button"
                                onClick={retirer}
                                className="px-4 py-2 rounded-lg text-sm font-medium border border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/30"
                            >
                                Retirer
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className={cx("px-8 pb-8 max-w-7xl mx-auto space-y-6 transition-opacity", chargement && "opacity-60")}>
                {/* Le compte : un instantané, indépendant de la période. */}
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Solde du compte"
                        value={francs(compte.balance)}
                        icon={Wallet}
                        alert={compte.debt > 0 && compte.debt >= compte.ceiling}
                        note={compte.balance < 0 ? "Espèces gardées pour Ongo" : "Ce qu'Ongo lui doit"}
                    />
                    <StatCard label="Dette en espèces" value={francs(compte.debt)} icon={Coins} note={`Plafond ${francs(compte.ceiling)}`} />
                    <StatCard label="Livreur depuis" value={c.joined_at ? new Date(c.joined_at.replace(" ", "T")).toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) : "—"} icon={Bike} />
                </section>

                <div role="radiogroup" aria-label="Période" className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
                    {PERIODES.map((p) => (
                        <button
                            key={p.jours}
                            role="radio"
                            aria-checked={p.jours === jours}
                            onClick={() => setJours(p.jours)}
                            className={cx(
                                "px-3 py-1.5 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors",
                                p.jours === jours ? "bg-primary text-white dark:bg-primary-container" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
                            )}
                        >
                            {p.libelle}
                        </button>
                    ))}
                </div>

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Livraisons" value={s.delivered} icon={CircleCheck} note={s.canceled ? `${s.canceled} annulée${s.canceled > 1 ? "s" : ""}` : undefined} />
                    <StatCard label="Gains" value={francs(s.earnings)} icon={Coins} note={s.tips ? `+ ${francs(s.tips)} de pourboires` : undefined} />
                    <StatCard
                        label="Temps de livraison"
                        value={s.average_minutes === null ? "—" : `${s.average_minutes} min`}
                        icon={Clock}
                        note={s.distance_km ? `${s.distance_km.toLocaleString("fr-FR")} km parcourus` : "Du retrait à la remise, en moyenne"}
                    />
                    <StatCard
                        label="Propositions acceptées"
                        value={s.acceptance_rate === null ? "—" : `${s.acceptance_rate.toLocaleString("fr-FR")} %`}
                        icon={Hand}
                        note={s.offers ? `${s.accepted} sur ${s.offers} · ${s.missed} sans réponse · ${s.refused} refusées` : "Aucune livraison proposée"}
                    />
                </section>

                <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                        <h2 className="text-[16px] font-bold tracking-tight text-slate-900 dark:text-white">Historique des livraisons</h2>
                        <p className="mt-1 text-[13px] text-slate-500">Les cinquante plus récentes, quelle que soit la période.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[860px]">
                            <thead className="text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-800/40 text-left">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">Commande</th>
                                    <th className="px-5 py-3 font-semibold">Boutique</th>
                                    <th className="px-5 py-3 font-semibold">Livrée le</th>
                                    <th className="px-5 py-3 font-semibold text-right">Frais</th>
                                    <th className="px-5 py-3 font-semibold text-right">Sa part</th>
                                    <th className="px-5 py-3 font-semibold">État</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {fiche.history.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-10 text-center text-slate-500">Aucune livraison pour l'instant.</td>
                                    </tr>
                                ) : (
                                    fiche.history.map((o) => (
                                        <tr key={o.id}>
                                            <td className="px-5 py-3">
                                                <p className="font-mono font-semibold text-slate-900 dark:text-white">{o.code}</p>
                                                <p className="text-xs text-slate-500">{quand(o.created_at)}</p>
                                            </td>
                                            <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                                                <p>{o.store ?? "—"}</p>
                                                <p className="text-xs text-slate-500 truncate max-w-[260px]">{o.delivery_address ?? ""}</p>
                                            </td>
                                            <td className="px-5 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{quand(o.delivered_at)}</td>
                                            <td className="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">{francs(o.delivery_fee)}</td>
                                            <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                                {francs(o.earning)}
                                                {o.tip ? <p className="text-xs font-normal text-slate-500">+ {francs(o.tip)} pourboire</p> : null}
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={cx("px-2 py-0.5 rounded-full text-xs font-medium", STATUTS[o.status]?.ton ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300")}>
                                                    {STATUTS[o.status]?.texte ?? o.status}
                                                </span>
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
                        <h2 className="text-[16px] font-bold tracking-tight text-slate-900 dark:text-white">Mouvements du compte</h2>
                        <p className="mt-1 text-[13px] text-slate-500">Les vingt dernières écritures vérifiées, celles qui font le solde.</p>
                    </div>
                    {compte.movements.length === 0 ? (
                        <p className="px-5 py-10 text-center text-sm text-slate-500">Aucun mouvement.</p>
                    ) : (
                        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                            {compte.movements.map((m) => (
                                <li key={m.id} className="px-5 py-3 flex items-center justify-between gap-4 text-sm">
                                    <div className="min-w-0">
                                        <p className="text-slate-800 dark:text-slate-200 truncate">{m.description || m.service || "Écriture"}</p>
                                        <p className="text-xs text-slate-500">{quand(m.created_at)}</p>
                                    </div>
                                    <span className={cx("tabular-nums font-semibold whitespace-nowrap", m.amount < 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400")}>
                                        {m.amount > 0 ? "+" : ""}
                                        {francs(m.amount)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </main>
        </MainLayout>
    );
}
