import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";

/**
 * Les annulations tardives à arbitrer.
 *
 * Une place payée puis annulée hors délai met une somme en suspens : elle
 * revient au passager, au conducteur parti avec un siège vide, ou reste à la
 * plateforme. L'API tranchait déjà, mais personne n'avait d'écran pour décider
 * — les dossiers s'accumulaient sans que l'argent bouge.
 *
 * La décision est **irréversible** : chaque bouton demande confirmation, et le
 * dossier se ferme une fois pour toutes.
 */

interface Dossier {
    id: number;
    car_sharing_id: number;
    subscriber_id: number;
    nbre_place: number | null;
    subscription_amount: number | null;
    canceled_at: string | null;
    cancel_reason: string | null;
    client?: { id: number; nom: string | null; prenom: string | null; telephone: string | null } | null;
    carsharing?: {
        id: number;
        lieu_depart: string | null;
        lieu_arrive: string | null;
        date_depart: string | null;
        heure_depart: string | null;
    } | null;
}

interface CarpoolRefundsProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

type Decision = "client" | "conducteur" | "plateforme";

const DECISIONS: { cle: Decision; libelle: string; explication: string; classe: string }[] = [
    {
        cle: "client",
        libelle: "Rembourser",
        explication: "La somme retourne au passager, comme si le délai avait été respecté.",
        classe: "bg-emerald-500 text-white hover:bg-emerald-600",
    },
    {
        cle: "conducteur",
        libelle: "Au conducteur",
        explication: "La somme lui revient : il est parti avec un siège vide.",
        classe: "bg-[#137fec] text-white hover:bg-blue-600",
    },
    {
        cle: "plateforme",
        libelle: "À la plateforme",
        explication: "Rien ne bouge, Ongo conserve la somme.",
        classe: "border border-slate-300 text-slate-600 hover:bg-slate-50",
    },
];

export default function CarpoolRefunds({ onLogout, theme, toggleTheme }: CarpoolRefundsProps) {
    const [dossiers, setDossiers] = useState<Dossier[]>([]);
    const [chargement, setChargement] = useState<boolean>(true);

    const api = new ApiService();

    const charger = async () => {
        setChargement(true);

        try {
            const { data } = await api.getData("v3/carsharing/refunds/pending");

            if (data.success) {
                setDossiers(data.data?.data ?? []);
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
    }, []);

    const trancher = async (dossier: Dossier, decision: Decision) => {
        const choix = DECISIONS.find((d) => d.cle === decision)!;

        const confirmation = await Swal.fire({
            icon: "warning",
            title: choix.libelle + " ?",
            html: `${choix.explication}<br/><br/><b>${montant(dossier.subscription_amount)}</b> — dossier #${dossier.id}.<br/>Cette décision est définitive.`,
            showCancelButton: true,
            confirmButtonText: "Confirmer",
            cancelButtonText: "Annuler",
        });

        if (!confirmation.isConfirmed) return;

        try {
            const { data } = await api.postData("v3/carsharing/refunds/decide", {
                subscription_id: dossier.id,
                decision,
            });

            if (data.success) {
                Swal.fire({ icon: "success", title: "Dossier tranché", text: data.message, timer: 2000, showConfirmButton: false });
                charger();

                return;
            }

            Swal.fire({ icon: "error", title: "Refusé", text: data.message });
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Serveur injoignable", text: String(erreur) });
        }
    };

    const montant = (valeur: number | null | undefined) =>
        valeur === null || valeur === undefined ? "—" : `${Number(valeur).toLocaleString("fr-FR")} F`;

    const date = (valeur: string | null | undefined, heure?: string | null) => {
        if (!valeur) return "—";

        const jour = new Date(valeur).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

        return heure ? `${jour} · ${String(heure).slice(0, 5)}` : jour;
    };

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-8 py-6 max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Remboursements</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Places payées puis annulées hors délai. Trois issues, et la décision est définitive.
                    </p>
                </div>
            </header>

            <div className="p-8 max-w-7xl mx-auto space-y-4">
                {chargement ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <Loading />
                    </div>
                ) : dossiers.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-6 py-16 text-center">
                        <span className="material-symbols-outlined text-4xl text-slate-300">task_alt</span>
                        <p className="text-sm text-slate-500 mt-3">Aucune annulation en attente d'arbitrage.</p>
                    </div>
                ) : (
                    dossiers.map((dossier) => (
                        <div
                            key={dossier.id}
                            className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold text-slate-400">#{dossier.id}</span>
                                        <span className="text-lg font-bold text-slate-900 dark:text-white">
                                            {dossier.carsharing
                                                ? `${dossier.carsharing.lieu_depart} → ${dossier.carsharing.lieu_arrive}`
                                                : "Trajet supprimé"}
                                        </span>
                                    </div>
                                    <div className="text-sm text-slate-500 mt-1">
                                        Départ {date(dossier.carsharing?.date_depart, dossier.carsharing?.heure_depart)} ·
                                        {" "}Annulée le {date(dossier.canceled_at)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {montant(dossier.subscription_amount)}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {dossier.nbre_place ?? 1} place{(dossier.nbre_place ?? 1) > 1 ? "s" : ""}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl bg-slate-50 dark:bg-white/5 px-4 py-3">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Passager</div>
                                    <div className="text-sm font-semibold mt-1">
                                        {dossier.client
                                            ? `${dossier.client.prenom ?? ""} ${dossier.client.nom ?? ""}`
                                            : `#${dossier.subscriber_id}`}
                                    </div>
                                    <div className="text-xs text-slate-500">{dossier.client?.telephone ?? ""}</div>
                                </div>
                                <div className="rounded-xl bg-slate-50 dark:bg-white/5 px-4 py-3">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Motif de l'annulation</div>
                                    <div className="text-sm mt-1">{dossier.cancel_reason || "Non précisé"}</div>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-wrap items-center gap-2">
                                {DECISIONS.map((choix) => (
                                    <button
                                        key={choix.cle}
                                        onClick={() => trancher(dossier, choix.cle)}
                                        title={choix.explication}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${choix.classe}`}
                                    >
                                        {choix.libelle}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </MainLayout>
    );
}
