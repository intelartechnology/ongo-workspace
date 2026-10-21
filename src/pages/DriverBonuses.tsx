import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";
import { StatCard } from "../components/ui";
import { AlertTriangle, Gift, Target, Trophy, UsersRound, Wallet } from "lucide-react";

/**
 * Les bonus des chauffeurs : qui a activé un objectif, qui l'a atteint, et ce
 * qui lui a été versé.
 *
 * L'écran sert d'abord à l'audit. Chaque inscription montre les écritures de
 * paiement qui s'y rattachent, et le serveur nomme ce qui cloche — un objectif
 * atteint sans versement, un versement en double — pour qu'on n'ait pas à le
 * déduire en croisant deux pages.
 */

interface Versement {
    transaction_id: string;
    amount: number;
    status: string;
    verified_at: string | null;
    created_at: string | null;
}

interface Inscription {
    id: number;
    user_id: number;
    nom: string | null;
    prenom: string | null;
    telephone: string | null;
    bonus_title: string | null;
    goal_rides: number;
    reward_amount: number;
    current_progress: number;
    status: "active" | "completed" | "expired" | string;
    started_at: string | null;
    expires_at: string | null;
    completed_at: string | null;
    payouts: Versement[];
    paid_amount: number;
    anomaly: string | null;
}

interface Resume {
    subscribed: number;
    drivers: number;
    active: number;
    completed: number;
    expired: number;
    paid_total: number;
    anomalies: number;
}

interface LienPagination {
    url: string | null;
    label: string;
    active: boolean;
}

interface DriverBonusesProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const ETATS = [
    { valeur: "", libelle: "Toutes" },
    { valeur: "active", libelle: "En cours" },
    { valeur: "completed", libelle: "Atteints" },
    { valeur: "expired", libelle: "Expirés" },
    { valeur: "anomalies", libelle: "Anomalies" },
];

const STATUT: Record<string, { libelle: string; classe: string }> = {
    active: { libelle: "En cours", classe: "bg-sky-50 text-sky-700 border-sky-200" },
    completed: { libelle: "Atteint", classe: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    expired: { libelle: "Expiré", classe: "bg-slate-100 text-slate-600 border-slate-200" },
};

export default function DriverBonuses({ onLogout, theme, toggleTheme }: DriverBonusesProps) {
    const [lignes, setLignes] = useState<Inscription[]>([]);
    const [resume, setResume] = useState<Resume | null>(null);
    const [pagination, setPagination] = useState<LienPagination[]>([]);
    const [chargement, setChargement] = useState<boolean>(true);

    const [etat, setEtat] = useState<string>("");
    const [recherche, setRecherche] = useState<string>("");

    const api = new ApiService();

    const charger = async (url?: string) => {
        setChargement(true);

        try {
            const { data } = url
                ? await api.getDatawithPagination(url, true)
                : await api.getData("v3/admin/bonuses", { ...(etat ? { etat } : {}), ...(recherche ? { q: recherche } : {}) });

            if (data.success) {
                setResume(data.data?.summary ?? null);
                setLignes(data.data?.page?.data ?? []);
                setPagination(data.data?.page?.links ?? []);
            } else {
                Swal.fire({ icon: "warning", title: "Erreur", text: data.message });
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Serveur injoignable", text: String(erreur) });
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => {
        charger();
    }, [etat]);

    const montant = (valeur: number) => `${Number(valeur).toLocaleString("fr-FR")} F`;

    const date = (valeur: string | null) =>
        valeur
            ? new Date(valeur).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })
            : "—";

    const chauffeur = (l: Inscription) => `${l.prenom ?? ""} ${l.nom ?? ""}`.trim() || `#${l.user_id}`;

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header>
                <div className="px-8 py-6 max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Bonus chauffeurs</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Les objectifs activés, leur progression, et les versements qui s'y rattachent. Les anomalies sont signalées en rouge.
                    </p>
                </div>
            </header>

            <div className="p-8 max-w-7xl mx-auto space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    <StatCard label="Inscriptions" value={resume ? resume.subscribed.toLocaleString("fr-FR") : "—"} icon={Gift} />
                    <StatCard label="Chauffeurs" value={resume ? resume.drivers.toLocaleString("fr-FR") : "—"} icon={UsersRound} />
                    <StatCard label="En cours" value={resume ? resume.active.toLocaleString("fr-FR") : "—"} icon={Target} />
                    <StatCard label="Atteints" value={resume ? resume.completed.toLocaleString("fr-FR") : "—"} icon={Trophy} />
                    <StatCard label="Versé" value={resume ? montant(resume.paid_total) : "—"} icon={Wallet} />
                    <StatCard
                        label="Anomalies"
                        value={resume ? resume.anomalies.toLocaleString("fr-FR") : "—"}
                        icon={AlertTriangle}
                        alert={(resume?.anomalies ?? 0) > 0}
                    />
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[260px]">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Nom, téléphone ou objectif…"
                            value={recherche}
                            onChange={(e) => setRecherche(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") charger();
                            }}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {ETATS.map((item) => (
                            <button
                                key={item.valeur || "toutes"}
                                onClick={() => setEtat(item.valeur)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                    etat === item.valeur
                                        ? item.valeur === "anomalies"
                                            ? "bg-red-600 text-white border-red-600"
                                            : "bg-primary text-white border-primary dark:bg-primary-container"
                                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                {item.libelle}
                                {item.valeur === "anomalies" && (resume?.anomalies ?? 0) > 0 ? ` (${resume!.anomalies})` : ""}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        {chargement ? (
                            <Loading />
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-slate-800">
                                        {["Chauffeur", "Objectif", "Progression", "Période", "État", "Versement"].map((titre) => (
                                            <th
                                                key={titre}
                                                className={`px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider ${titre === "Versement" ? "text-right" : ""}`}
                                            >
                                                {titre}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {lignes.length > 0 ? (
                                        lignes.map((l) => {
                                            const statut = STATUT[l.status] ?? { libelle: l.status, classe: "bg-slate-100 text-slate-600 border-slate-200" };
                                            const part = l.goal_rides > 0 ? Math.min(1, l.current_progress / l.goal_rides) : 0;

                                            return (
                                                <tr
                                                    key={l.id}
                                                    className={`align-top transition-colors ${l.anomaly ? "bg-red-50/60 dark:bg-red-500/5" : "hover:bg-slate-50 dark:hover:bg-primary/5"}`}
                                                >
                                                    <td className="px-6 py-4 text-sm">
                                                        <div className="font-semibold">{chauffeur(l)}</div>
                                                        <div className="text-xs text-slate-500">{l.telephone ?? ""}</div>
                                                        <div className="text-[11px] text-slate-400 mt-0.5">Inscription #{l.id}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm">
                                                        <div className="font-semibold">{l.bonus_title ?? "Objectif supprimé"}</div>
                                                        <div className="text-xs text-slate-500">
                                                            {l.goal_rides} courses · {montant(l.reward_amount)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm min-w-[160px]">
                                                        <div className="font-semibold">
                                                            {l.current_progress} / {l.goal_rides}
                                                        </div>
                                                        <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${part >= 1 ? "bg-emerald-500" : "bg-primary"}`}
                                                                style={{ width: `${part * 100}%` }}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                                                        <div>Début : {date(l.started_at)}</div>
                                                        <div>Fin : {date(l.expires_at)}</div>
                                                        {l.completed_at && <div className="text-emerald-700">Atteint : {date(l.completed_at)}</div>}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm">
                                                        <span className={`px-2 py-1 rounded-lg border text-[11px] font-bold ${statut.classe}`}>{statut.libelle}</span>
                                                        {l.anomaly && (
                                                            <div className="mt-2 flex items-center gap-1 text-xs font-bold text-red-600">
                                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                                {l.anomaly}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-right">
                                                        {l.payouts.length === 0 ? (
                                                            <span className="text-slate-400">—</span>
                                                        ) : (
                                                            l.payouts.map((v) => (
                                                                <div key={v.transaction_id} className="mb-1 last:mb-0">
                                                                    <div className="font-bold text-emerald-600 whitespace-nowrap">+ {montant(v.amount)}</div>
                                                                    <div className="text-[11px] text-slate-500 whitespace-nowrap">
                                                                        {date(v.verified_at ?? v.created_at)} · {v.status === "verified" ? "vérifié" : v.status}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400 font-mono">{v.transaction_id}</div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                                                Aucune inscription pour ce filtre.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {pagination.length > 3 && (
                        <div className="flex flex-wrap items-center justify-center gap-1 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                            {pagination.map((lien, index) => (
                                <button
                                    key={index}
                                    disabled={!lien.url}
                                    onClick={() => lien.url && charger(lien.url)}
                                    className={`min-w-9 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                        lien.active
                                            ? "bg-primary text-white border-primary"
                                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 disabled:opacity-40"
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: lien.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
