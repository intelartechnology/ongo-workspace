import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import { notifier } from "../services/notifier";
import Loading from "../components/Loading";

/**
 * Ongo Eat vu d'Ongo.
 *
 * Trois questions, dans cet ordre : est-ce que ça tourne ce matin, où est-ce
 * que ça coince, et combien ça rapporte. Le reste est du détail.
 *
 * Le chiffre à regarder en premier n'est pas le chiffre d'affaires mais le
 * **taux d'échec** — refus et annulations. Une plateforme de livraison meurt
 * de ses commandes refusées bien avant de mourir de ses marges.
 */

interface Stats {
    period: { from: string; to: string };
    orders: {
        total: number; delivered: number; live: number;
        rejected: number; canceled: number; failure_rate: number;
    };
    money: {
        revenue: number; items: number; delivery_fees: number;
        service_fees: number; tips: number; refunded: number; commission: number;
        discounts?: { merchant: number; platform: number };
    };
    delays: { acceptance_minutes: number | null; total_minutes: number | null };
}

interface Commande {
    id: number;
    public_id: string;
    code: string;
    status: string;
    dining_mode: string;
    total: number;
    created_at: string;
    store: { name: string; type: string } | null;
    user_id: number | null;
    courier_id: number | null;
    customer: { nom: string | null; telephone: string | null } | null;
    paid_at?: string | null;
    refunded_amount?: number;
    courier: { nom: string | null; telephone: string | null } | null;
}

interface LigneMarchand {
    merchant_id: number;
    name: string;
    orders: number;
    delivered: number;
    rejected: number;
    revenue: number;
    rejection_rate: number;
}

interface EatDashboardProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const STATUTS: Record<string, { texte: string; classe: string }> = {
    pending: { texte: "En attente", classe: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
    accepted: { texte: "Acceptée", classe: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300" },
    preparing: { texte: "En préparation", classe: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300" },
    ready: { texte: "Prête", classe: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300" },
    picked_up: { texte: "En route", classe: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300" },
    delivered: { texte: "Livrée", classe: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
    rejected: { texte: "Refusée", classe: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
    canceled: { texte: "Annulée", classe: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

const francs = (montant: number) => `${(montant ?? 0).toLocaleString("fr-FR")} F`;

export default function EatDashboard({ onLogout, theme, toggleTheme }: EatDashboardProps) {
    const [stats, setStats] = useState<Stats | null>(null);
    const [commandes, setCommandes] = useState<Commande[]>([]);
    const [marchands, setMarchands] = useState<LigneMarchand[]>([]);
    const [chargement, setChargement] = useState<boolean>(true);

    const [depuis, setDepuis] = useState<string>("");
    const [jusqua, setJusqua] = useState<string>("");
    const [statut, setStatut] = useState<string>("");
    const [recherche, setRecherche] = useState<string>("");

    const api = new ApiService();

    const filtres = () => ({
        from: depuis || undefined,
        to: jusqua || undefined,
        status: statut || undefined,
        q: recherche.trim() || undefined,
    });

    /**
     * Annuler une commande qui ne peut plus aboutir.
     *
     * Un motif, puis le montant à rendre : les deux dans la même fenêtre,
     * parce qu'on décide des deux en même temps — annuler sans rendre
     * l'argent d'un client qui a payé n'a pas de sens.
     */
    const annuler = async (commande: Commande) => {
        const reponse = await Swal.fire({
            icon: "warning",
            title: `Annuler la commande ${commande.code} ?`,
            html: `<p class="text-sm text-left">Le client et le marchand seront prévenus.</p>`,
            input: "text",
            inputLabel: "Pourquoi ? Le client le lira.",
            inputPlaceholder: "Livreur introuvable, boutique injoignable…",
            showCancelButton: true,
            confirmButtonText: "Annuler la commande",
            cancelButtonText: "Retour",
            inputValidator: (valeur) => (valeur.trim() === "" ? "Dites pourquoi" : null),
        });

        if (!reponse.isConfirmed) return;

        const motif = String(reponse.value ?? "");
        let montant = 0;
        let payeur = "platform";

        if (commande.paid_at) {
            const rendu = await demanderLeMontant(commande, "Rendre au client");

            if (rendu === null) return;

            montant = rendu.montant;
            payeur = rendu.payeur;
        }

        const { data } = await api.postData("v3/admin/eat/orders/cancel", {
            id: commande.id,
            reason: motif,
            refund_amount: montant,
            refund_paid_by: payeur,
        });

        if (!data.success) {
            Swal.fire({ icon: "error", title: data.message });

            return;
        }

        Swal.fire({ icon: "success", title: data.message, timer: 1600, showConfirmButton: false });
        charger();
    };

    /** Rembourser sans annuler : le geste d'après-vente. */
    const rembourser = async (commande: Commande) => {
        const rendu = await demanderLeMontant(commande, "Rembourser");

        if (rendu === null || rendu.montant <= 0) return;

        const motif = await Swal.fire({
            icon: "question",
            title: "Pourquoi ?",
            input: "text",
            inputPlaceholder: "Plat manquant, retard, geste commercial…",
            showCancelButton: true,
            confirmButtonText: "Rembourser",
            cancelButtonText: "Retour",
            inputValidator: (valeur) => (valeur.trim() === "" ? "Dites pourquoi" : null),
        });

        if (!motif.isConfirmed) return;

        const { data } = await api.postData("v3/admin/eat/orders/refund", {
            id: commande.id,
            amount: rendu.montant,
            paid_by: rendu.payeur,
            note: String(motif.value ?? ""),
        });

        if (!data.success) {
            Swal.fire({ icon: "error", title: data.message });

            return;
        }

        Swal.fire({ icon: "success", title: data.message, timer: 1600, showConfirmButton: false });
        charger();
    };

    /**
     * Combien rendre, et qui le paie.
     *
     * « Qui paie » n'est pas un détail : tout remboursement était jusqu'ici
     * retenu au marchand, même quand Ongo offrait. Il a cuisiné et livré —
     * lui retenir de l'argent pour une décision qui n'est pas la sienne
     * serait lui faire payer notre geste.
     */
    const demanderLeMontant = async (
        commande: Commande,
        titre: string,
    ): Promise<{ montant: number; payeur: string } | null> => {
        const reste = commande.total - (commande.refunded_amount ?? 0);

        const reponse = await Swal.fire({
            title: `${titre} — jusqu'à ${francs(reste)}`,
            html: `
                <input id="montant" type="number" class="swal2-input" placeholder="Montant en F" value="${reste}" />
                <select id="payeur" class="swal2-input">
                    <option value="platform">À la charge d'Ongo</option>
                    <option value="merchant">À la charge du marchand</option>
                </select>
            `,
            showCancelButton: true,
            confirmButtonText: "Valider",
            cancelButtonText: "Retour",
            preConfirm: () => {
                const montant = Number((document.getElementById("montant") as HTMLInputElement)?.value ?? 0);
                const payeur = (document.getElementById("payeur") as HTMLSelectElement)?.value ?? "platform";

                if (!Number.isFinite(montant) || montant < 0 || montant > reste) {
                    Swal.showValidationMessage(`Entre 0 et ${reste} F`);

                    return false;
                }

                return { montant, payeur };
            },
        });

        return reponse.isConfirmed ? (reponse.value as { montant: number; payeur: string }) : null;
    };

    const charger = async () => {
        setChargement(true);

        try {
            const [chiffres, journal, classement] = await Promise.all([
                api.getData("v3/admin/eat/stats", filtres()),
                api.getData("v3/admin/eat/orders", filtres()),
                api.getData("v3/admin/eat/merchants", filtres()),
            ]);

            if (chiffres.data.success) setStats(chiffres.data.data);
            if (journal.data.success) setCommandes(journal.data.data?.data ?? []);
            if (classement.data.success) setMarchands(classement.data.data ?? []);
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Tableau de bord illisible", text: String(erreur) });
        }

        setChargement(false);
    };

    useEffect(() => {
        const minuteur = setTimeout(charger, 300);

        return () => clearTimeout(minuteur);
    }, [depuis, jusqua, statut, recherche]);

    /** Un chiffre, avec ce qu'il veut dire dessous. */
    const carte = (titre: string, valeur: string, legende?: string, alerte?: boolean) => (
        <div className={`p-5 rounded-xl border ${
            alerte
                ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        }`}>
            <p className="text-xs font-semibold uppercase text-slate-500">{titre}</p>
            <p className={`text-2xl font-bold mt-1 ${alerte ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
                {valeur}
            </p>
            {legende && <p className="text-xs text-slate-500 mt-1">{legende}</p>}
        </div>
    );

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-8 py-6 max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Ongo Eat</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Commandes, livraisons et encaissements. Trente derniers jours par défaut.
                    </p>
                </div>
            </header>

            <div className="px-8 py-8 max-w-7xl mx-auto">
                <section className="mb-8 flex flex-wrap items-end gap-3">
                    <label className="block">
                        <span className="text-xs font-semibold uppercase text-slate-500">Du</span>
                        <input
                            type="date"
                            value={depuis}
                            onChange={(e) => setDepuis(e.target.value)}
                            className="mt-1 block px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                    </label>

                    <label className="block">
                        <span className="text-xs font-semibold uppercase text-slate-500">Au</span>
                        <input
                            type="date"
                            value={jusqua}
                            onChange={(e) => setJusqua(e.target.value)}
                            className="mt-1 block px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                    </label>

                    <label className="block">
                        <span className="text-xs font-semibold uppercase text-slate-500">Statut</span>
                        <select
                            value={statut}
                            onChange={(e) => setStatut(e.target.value)}
                            className="mt-1 block px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                            <option value="">Tous</option>
                            {Object.entries(STATUTS).map(([valeur, { texte }]) => (
                                <option key={valeur} value={valeur}>{texte}</option>
                            ))}
                        </select>
                    </label>

                    <label className="block flex-1 min-w-[200px]">
                        <span className="text-xs font-semibold uppercase text-slate-500">Numéro de commande</span>
                        <input
                            value={recherche}
                            onChange={(e) => setRecherche(e.target.value)}
                            placeholder="Ex. K7M2PQ"
                            className="mt-1 block w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                    </label>
                </section>

                {chargement || !stats ? (
                    <Loading />
                ) : (
                    <>
                        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {carte("Commandes", String(stats.orders.total), `${stats.orders.delivered} livrées`)}
                            {carte("En cours", String(stats.orders.live), "à préparer ou en route")}
                            {carte(
                                "Taux d'échec",
                                `${stats.orders.failure_rate} %`,
                                `${stats.orders.rejected} refusées · ${stats.orders.canceled} annulées`,
                                stats.orders.failure_rate >= 15
                            )}
                            {carte("Commission Ongo", francs(stats.money.commission), "panier + frais de service")}
                        </section>

                        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                            {carte("Chiffre livré", francs(stats.money.revenue))}
                            {carte("Articles", francs(stats.money.items))}
                            {carte("Frais de livraison", francs(stats.money.delivery_fees), "reviennent au livreur")}
                            {carte("Remboursé", francs(stats.money.refunded), undefined, stats.money.refunded > 0)}
                            {carte("Codes promo Ongo", francs(stats.money.discounts?.platform ?? 0), "payés par Ongo")}
                            {carte("Codes promo marchands", francs(stats.money.discounts?.merchant ?? 0), "payés par les marchands")}
                        </section>

                        <section className="grid grid-cols-2 gap-4 mb-10">
                            {carte(
                                "Délai d'acceptation",
                                stats.delays.acceptance_minutes === null ? "—" : `${stats.delays.acceptance_minutes} min`,
                                "du paiement à la réponse du marchand"
                            )}
                            {carte(
                                "Délai total",
                                stats.delays.total_minutes === null ? "—" : `${stats.delays.total_minutes} min`,
                                "de la commande à la livraison"
                            )}
                        </section>

                        {marchands.length > 0 && (
                            <section className="mb-10">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Marchands</h2>
                                <p className="text-sm text-slate-500 mb-4">
                                    Un marchand qui refuse une commande sur trois coûte plus cher qu'il ne rapporte.
                                </p>

                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                                            <tr>
                                                <th className="text-left px-5 py-3 font-semibold">Marchand</th>
                                                <th className="text-right px-5 py-3 font-semibold">Commandes</th>
                                                <th className="text-right px-5 py-3 font-semibold">Livrées</th>
                                                <th className="text-right px-5 py-3 font-semibold">Refus</th>
                                                <th className="text-right px-5 py-3 font-semibold">Chiffre</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {marchands.map((ligne) => (
                                                <tr key={ligne.merchant_id}>
                                                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{ligne.name}</td>
                                                    <td className="px-5 py-3 text-right text-slate-600 dark:text-slate-300">{ligne.orders}</td>
                                                    <td className="px-5 py-3 text-right text-slate-600 dark:text-slate-300">{ligne.delivered}</td>
                                                    <td className={`px-5 py-3 text-right font-medium ${
                                                        ligne.rejection_rate >= 20 ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-300"
                                                    }`}>
                                                        {ligne.rejection_rate} %
                                                    </td>
                                                    <td className="px-5 py-3 text-right font-medium text-slate-900 dark:text-white">{francs(ligne.revenue)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        <section>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Commandes</h2>

                            {commandes.length === 0 ? (
                                <p className="text-sm text-slate-500">Aucune commande sur cette période.</p>
                            ) : (
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
                                    {commandes.map((commande) => (
                                        <div key={commande.public_id} className="p-4 flex items-center gap-4">
                                            <span className="font-mono text-sm font-bold text-slate-900 dark:text-white w-20">{commande.code}</span>

                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUTS[commande.status]?.classe}`}>
                                                {STATUTS[commande.status]?.texte ?? commande.status}
                                            </span>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                    {commande.store?.name ?? "—"}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate">
                                                    {commande.customer?.nom ?? "—"}
                                                    {commande.courier?.nom ? ` · livreur ${commande.courier.nom}` : ""}
                                                    {commande.dining_mode === "pickup" ? " · à emporter" : ""}
                                                </p>
                                            </div>

                                            <span className="text-sm font-semibold text-slate-900 dark:text-white shrink-0">
                                                {francs(commande.total)}
                                            </span>

                                            <div className="flex gap-1 shrink-0">
                                                {/* Le recours : passé l'annulation du client et le
                                                    refus du marchand, plus personne ne pouvait
                                                    fermer une commande ni rendre l'argent. */}
                                                {!["canceled", "rejected"].includes(commande.status) && (
                                                    <button
                                                        title="Annuler cette commande"
                                                        onClick={() => annuler(commande)}
                                                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">cancel</span>
                                                        Annuler
                                                    </button>
                                                )}

                                                {commande.paid_at && (commande.refunded_amount ?? 0) < commande.total && (
                                                    <button
                                                        title="Rembourser tout ou partie"
                                                        onClick={() => rembourser(commande)}
                                                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">currency_exchange</span>
                                                        Rembourser
                                                    </button>
                                                )}

                                                <button
                                                    title="Notifier le client"
                                                    onClick={() =>
                                                        notifier({
                                                            destinataires: [{ id: commande.user_id, nom: commande.customer?.nom }],
                                                            titre: `Votre commande ${commande.code}`,
                                                            sujet: { type: "Order", id: commande.id },
                                                        })
                                                    }
                                                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">notifications</span>
                                                    Client
                                                </button>
                                                {commande.courier_id && (
                                                    <button
                                                        title="Notifier le livreur"
                                                        onClick={() =>
                                                            notifier({
                                                                destinataires: [{ id: commande.courier_id, nom: commande.courier?.nom }],
                                                                titre: `Livraison ${commande.code}`,
                                                            })
                                                        }
                                                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">notifications</span>
                                                        Livreur
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>
        </MainLayout>
    );
}
