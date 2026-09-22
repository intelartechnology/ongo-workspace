import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";

/**
 * Les reversements aux marchands.
 *
 * Deux gestes distincts, et c'est voulu : **clore** fige ce qu'on doit,
 * **régler** dit qu'on l'a payé. Entre les deux, un relevé se relit, se
 * conteste et se corrige. Après, il ne bouge plus.
 *
 * Un marchand qui attend son argent sans savoir combien ni quand est un
 * marchand qui part. Cet écran existe pour que la réponse soit immédiate.
 */

interface Releve {
    public_id: string;
    short_id: string;
    period_start: string;
    period_end: string;
    orders_count: number;
    gross: number;
    commission: number;
    net: number;
    status: "open" | "closed" | "paid";
    paid_at: string | null;
    payment_reference: string | null;
    merchant: { name: string; public_id: string } | null;
}

interface EatPayoutsProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const francs = (montant: number) => `${(montant ?? 0).toLocaleString("fr-FR")} F`;

const jour = (valeur: string | null) =>
    valeur ? new Date(valeur).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function EatPayouts({ onLogout, theme, toggleTheme }: EatPayoutsProps) {
    const [releves, setReleves] = useState<Releve[]>([]);
    const [statut, setStatut] = useState<string>("closed");
    const [chargement, setChargement] = useState<boolean>(true);

    const api = new ApiService();

    const charger = async () => {
        setChargement(true);

        try {
            const { data } = await api.getData("v3/admin/eat/statements", { status: statut || undefined });

            if (data.success) setReleves(data.data?.data ?? []);
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Relevés illisibles", text: String(erreur) });
        }

        setChargement(false);
    };

    useEffect(() => {
        charger();
    }, [statut]);

    /** Clore une période pour tous les marchands actifs. */
    const clore = async () => {
        const aujourdHui = new Date();
        const debutDuMois = new Date(aujourdHui.getFullYear(), aujourdHui.getMonth(), 1);

        const choix = await Swal.fire({
            title: "Clôturer une période",
            html:
                `<input id="du" type="date" class="swal2-input" value="${debutDuMois.toISOString().slice(0, 10)}">` +
                `<input id="au" type="date" class="swal2-input" value="${aujourdHui.toISOString().slice(0, 10)}">` +
                `<p style="font-size:13px;color:#64748b;margin-top:8px">Fige ce qu'Ongo doit à chaque marchand actif. Rejouable : une seconde clôture ramasse les commandes arrivées entre-temps.</p>`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: "Clôturer",
            cancelButtonText: "Annuler",
            preConfirm: () => ({
                du: (document.getElementById("du") as HTMLInputElement)?.value,
                au: (document.getElementById("au") as HTMLInputElement)?.value,
            }),
        });

        if (!choix.isConfirmed || !choix.value?.du || !choix.value?.au) return;

        try {
            const { data } = await api.postData("v3/admin/eat/statements/close", {
                from: choix.value.du,
                to: choix.value.au,
            });

            if (data.success) {
                await charger();
                Swal.fire({ icon: "success", title: data.message, timer: 1800, showConfirmButton: false });
            } else {
                Swal.fire({ icon: "error", title: "Refusé", text: data.message });
            }
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Clôture impossible", text: String(erreur) });
        }
    };

    const regler = async (releve: Releve) => {
        const choix = await Swal.fire({
            title: `Régler ${releve.merchant?.name ?? "ce marchand"} ?`,
            text: `${francs(releve.net)} — indiquez la référence du versement.`,
            input: "text",
            inputPlaceholder: "Ex. OM-240921-8842",
            showCancelButton: true,
            confirmButtonText: "Marquer réglé",
            cancelButtonText: "Annuler",
        });

        if (!choix.isConfirmed) return;

        try {
            const { data } = await api.postData("v3/admin/eat/statements/pay", {
                statement_id: releve.short_id,
                reference: choix.value,
            });

            if (data.success) await charger();
            else Swal.fire({ icon: "error", title: "Refusé", text: data.message });
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Action impossible", text: String(erreur) });
        }
    };

    const total = releves
        .filter((r) => r.status === "closed")
        .reduce((somme, r) => somme + (r.net ?? 0), 0);

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-8 py-6 max-w-7xl mx-auto flex items-start justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Reversements</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Clôturer fige ce qu'on doit. Régler dit qu'on l'a payé.
                        </p>
                    </div>

                    <button
                        onClick={clore}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 shrink-0"
                    >
                        Clôturer une période
                    </button>
                </div>
            </header>

            <div className="px-8 py-8 max-w-7xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    {[
                        { cle: "closed", libelle: "À régler" },
                        { cle: "paid", libelle: "Réglés" },
                        { cle: "", libelle: "Tous" },
                    ].map(({ cle, libelle }) => (
                        <button
                            key={cle || "tous"}
                            onClick={() => setStatut(cle)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                statut === cle
                                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                    : "border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300"
                            }`}
                        >
                            {libelle}
                        </button>
                    ))}

                    {statut === "closed" && total > 0 && (
                        <span className="ml-auto text-sm text-slate-500">
                            Total à verser : <span className="font-semibold text-slate-900 dark:text-white">{francs(total)}</span>
                        </span>
                    )}
                </div>

                {chargement ? (
                    <Loading />
                ) : releves.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun relevé.</p>
                ) : (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
                        {releves.map((releve) => (
                            <div key={releve.public_id} className="p-5 flex items-center gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-900 dark:text-white truncate">
                                        {releve.merchant?.name ?? "—"}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {jour(releve.period_start)} – {jour(releve.period_end)} · {releve.orders_count} commande
                                        {releve.orders_count > 1 ? "s" : ""} · commission {francs(releve.commission)}
                                    </p>
                                    {releve.payment_reference && (
                                        <p className="text-xs text-slate-400 mt-1">Réf. {releve.payment_reference}</p>
                                    )}
                                </div>

                                <span className="font-semibold text-slate-900 dark:text-white shrink-0">
                                    {francs(releve.net)}
                                </span>

                                {releve.status === "paid" ? (
                                    <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 shrink-0">
                                        Réglé le {jour(releve.paid_at)}
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => regler(releve)}
                                        className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 shrink-0"
                                    >
                                        Marquer réglé
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
