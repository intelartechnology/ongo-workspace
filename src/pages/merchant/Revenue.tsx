import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";

/**
 * Ce qu'Ongo doit au marchand.
 *
 * L'écran qu'il ouvre tous les jours après son poste de commande. Deux choses,
 * dans cet ordre : **ce qui court** depuis la dernière clôture — c'est ce qu'il
 * vient chercher — puis ses relevés passés avec leur date de règlement.
 *
 * Le détail commande par commande n'est pas un luxe : c'est la seule façon
 * qu'un marchand accorde sa confiance à un chiffre.
 */

interface EnCours {
    orders_count: number;
    gross: number;
    commission: number;
    delivery_kept: number;
    discounts: number;
    refunds: number;
    net: number;
    since: string | null;
}

interface Releve {
    public_id: string;
    short_id: string;
    period_start: string;
    period_end: string;
    orders_count: number;
    gross: number;
    commission: number;
    delivery_kept: number;
    refunds: number;
    net: number;
    commission_rate: number | null;
    status: "open" | "closed" | "paid";
    paid_at: string | null;
    payment_reference: string | null;
}

interface Ligne {
    id: number;
    basket: number;
    commission: number;
    delivery_kept: number;
    refund: number;
    net: number;
    settled_at: string | null;
    order: {
        code: string;
        delivered_at: string | null;
        dining_mode: string;
        promo_code: string | null;
        discount_total: number;
        discount_paid_by: "merchant" | "platform" | null;
    } | null;
}

interface RevenueProps {
    merchantId: string;
}

const francs = (montant: number) => `${(montant ?? 0).toLocaleString("fr-FR")} F`;

const jour = (valeur: string | null) =>
    valeur ? new Date(valeur).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function Revenue({ merchantId }: RevenueProps) {
    const [enCours, setEnCours] = useState<EnCours | null>(null);
    const [releves, setReleves] = useState<Releve[]>([]);
    const [ouvert, setOuvert] = useState<string | null>(null);
    const [lignes, setLignes] = useState<Ligne[]>([]);
    const [chargement, setChargement] = useState<boolean>(true);

    const api = new ApiService();

    const charger = async () => {
        setChargement(true);

        try {
            const { data } = await api.getData(`v3/merchant/${merchantId}/revenue`);

            if (data.success) {
                setEnCours(data.data.running);
                setReleves(data.data.statements ?? []);
            } else {
                Swal.fire({ icon: "info", title: "Non accessible", text: data.message });
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Revenus illisibles", text: String(erreur) });
        }

        setChargement(false);
    };

    useEffect(() => {
        charger();
    }, [merchantId]);

    const ouvrir = async (releve: Releve) => {
        if (ouvert === releve.short_id) {
            setOuvert(null);

            return;
        }

        setOuvert(releve.short_id);
        setLignes([]);

        try {
            const { data } = await api.getData(`v3/merchant/${merchantId}/revenue/${releve.short_id}`);

            if (data.success) setLignes(data.data.entries ?? []);
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Détail illisible", text: String(erreur) });
        }
    };

    const carte = (titre: string, valeur: string, legende?: string) => (
        <div className="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase text-slate-500">{titre}</p>
            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{valeur}</p>
            {legende && <p className="text-xs text-slate-500 mt-1">{legende}</p>}
        </div>
    );

    if (chargement) return <p className="text-slate-500">Chargement…</p>;

    return (
        <div>
            {enCours && (
                <section className="mb-10">
                    <h3 className="font-semibold text-slate-900 dark:text-white">En cours</h3>
                    <p className="text-sm text-slate-500 mt-1 mb-4">
                        Depuis la dernière clôture{enCours.since ? ` — ${jour(enCours.since)}` : ""}. Ces montants
                        bougent encore.
                    </p>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {carte("À percevoir", francs(enCours.net), `${enCours.orders_count} commande${enCours.orders_count > 1 ? "s" : ""}`)}
                        {carte("Ventes", francs(enCours.gross), "paniers livrés, remises déduites")}
                        {carte("Commission Ongo", francs(enCours.commission))}
                        {carte("Vos livraisons", francs(enCours.delivery_kept), "assurées par vos livreurs")}
                    </div>

                    {(enCours.refunds > 0 || enCours.discounts > 0) && (
                        <p className="text-sm text-slate-500 mt-3">
                            Dont {francs(enCours.discounts)} de remises que vous avez offertes
                            {enCours.refunds > 0 ? ` et ${francs(enCours.refunds)} remboursés aux clients` : ""}.
                        </p>
                    )}
                </section>
            )}

            <section>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Relevés</h3>

                {releves.length === 0 ? (
                    <p className="text-sm text-slate-500">
                        Aucun relevé clos pour l'instant. Le premier arrivera à la fin de la période en cours.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {releves.map((releve) => (
                            <div
                                key={releve.public_id}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
                            >
                                <button
                                    onClick={() => ouvrir(releve)}
                                    className="w-full p-5 flex items-center gap-4 text-left"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 dark:text-white">
                                            {jour(releve.period_start)} – {jour(releve.period_end)}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            {releve.orders_count} commande{releve.orders_count > 1 ? "s" : ""}
                                            {releve.commission_rate !== null ? ` · commission ${releve.commission_rate} %` : ""}
                                        </p>
                                    </div>

                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${
                                        releve.status === "paid"
                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                    }`}>
                                        {releve.status === "paid" ? `Réglé le ${jour(releve.paid_at)}` : "En attente de règlement"}
                                    </span>

                                    <span className="font-semibold text-slate-900 dark:text-white shrink-0">
                                        {francs(releve.net)}
                                    </span>
                                </button>

                                {ouvert === releve.short_id && (
                                    <div className="border-t border-slate-200 dark:border-slate-800">
                                        <div className="px-5 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm bg-slate-50 dark:bg-slate-800/40">
                                            <p className="text-slate-500">Ventes <span className="block font-medium text-slate-900 dark:text-white">{francs(releve.gross)}</span></p>
                                            <p className="text-slate-500">Commission <span className="block font-medium text-slate-900 dark:text-white">− {francs(releve.commission)}</span></p>
                                            <p className="text-slate-500">Vos livraisons <span className="block font-medium text-slate-900 dark:text-white">+ {francs(releve.delivery_kept)}</span></p>
                                            <p className="text-slate-500">Remboursements <span className="block font-medium text-slate-900 dark:text-white">− {francs(releve.refunds)}</span></p>
                                        </div>

                                        {releve.payment_reference && (
                                            <p className="px-5 py-2 text-xs text-slate-500">
                                                Référence du versement : {releve.payment_reference}
                                            </p>
                                        )}

                                        {lignes.length === 0 ? (
                                            <p className="p-5 text-sm text-slate-400">Chargement du détail…</p>
                                        ) : (
                                            <table className="w-full text-sm">
                                                <thead className="text-slate-500">
                                                    <tr>
                                                        <th className="text-left px-5 py-2 font-semibold">Commande</th>
                                                        <th className="text-right px-5 py-2 font-semibold">Panier</th>
                                                        <th className="text-right px-5 py-2 font-semibold">Commission</th>
                                                        <th className="text-right px-5 py-2 font-semibold">Net</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                                    {lignes.map((ligne) => (
                                                        <tr key={ligne.id}>
                                                            <td className="px-5 py-2 font-mono text-slate-900 dark:text-white">
                                                                {ligne.order?.code ?? "—"}
                                                                {ligne.order?.promo_code && (
                                                                    <span className="block text-xs font-sans text-slate-500">
                                                                        code {ligne.order.promo_code} · −{francs(ligne.order.discount_total)} ·{" "}
                                                                        {ligne.order.discount_paid_by === "platform" ? "payé par Ongo" : "à votre charge"}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-5 py-2 text-right text-slate-600 dark:text-slate-300">{francs(ligne.basket)}</td>
                                                            <td className="px-5 py-2 text-right text-slate-600 dark:text-slate-300">− {francs(ligne.commission)}</td>
                                                            <td className="px-5 py-2 text-right font-medium text-slate-900 dark:text-white">{francs(ligne.net)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
