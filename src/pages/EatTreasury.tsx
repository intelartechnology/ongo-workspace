import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";

/**
 * La trésorerie d'Ongo Eat.
 *
 * Le tableau de bord **recalcule** la commission depuis les commandes, au taux
 * du jour. Les écritures, elles, sont figées à la livraison. C'est exactement
 * ce que le service de revenus a été écrit pour éviter — « un taux modifié en
 * novembre réécrivait ce qu'on avait gagné en octobre » — et aucun écran ne le
 * montrait : Ongo avait un livre que personne ne lisait.
 *
 * Trois chiffres côte à côte, et ce qui est dehors :
 *
 *   — **le livre** : la somme des lignes figées ;
 *   — **le compte** : ce qui est réellement porté au portefeuille d'Ongo ;
 *   — **dehors** : ce qu'on doit aux marchands, ce que les livreurs doivent.
 *
 * Un écart entre les deux premiers dénonce une écriture manquée — celles que
 * le serveur journalise sans lever, pour ne pas défaire une livraison.
 */

interface Livreur {
    user_id: number;
    nom: string;
    telephone: string | null;
    debt: number;
    ceiling: number;
    listed: boolean;
}

interface Tresorerie {
    period: { from: string; to: string };
    book: {
        orders: number;
        basket_commission: number;
        service_fees: number;
        delivery_commission: number;
        platform_discounts: number;
        total: number;
        not_credited: number;
    };
    wallet: { total: number };
    merchants: {
        to_pay_closed: number;
        to_collect_closed: number;
        to_pay_running: number;
        to_collect_running: number;
    };
    couriers: { debt: number; count: number; list: Livreur[] };
}

interface EatTreasuryProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const francs = (montant: number) => `${(montant ?? 0).toLocaleString("fr-FR")} F`;

const moisCourant = () => {
    const aujourdHui = new Date();

    return {
        du: new Date(aujourdHui.getFullYear(), aujourdHui.getMonth(), 1).toISOString().slice(0, 10),
        au: aujourdHui.toISOString().slice(0, 10),
    };
};

export default function EatTreasury({ onLogout, theme, toggleTheme }: EatTreasuryProps) {
    const [tresorerie, setTresorerie] = useState<Tresorerie | null>(null);
    const [bornes, setBornes] = useState(moisCourant());
    const [chargement, setChargement] = useState(true);

    const api = new ApiService();

    const charger = async () => {
        setChargement(true);

        try {
            const { data } = await api.getData("v3/admin/eat/treasury", { from: bornes.du, to: bornes.au });

            if (data.success) setTresorerie(data.data);
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Trésorerie illisible", text: String(erreur) });
        }

        setChargement(false);
    };

    useEffect(() => {
        charger();
    }, [bornes.du, bornes.au]);

    const carte = (titre: string, valeur: string, note?: string, alerte?: boolean) => (
        <div
            className={`p-5 rounded-xl border ${
                alerte
                    ? "border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            }`}
        >
            <p className="text-sm text-slate-500">{titre}</p>
            <p className={`text-2xl font-bold mt-1 ${alerte ? "text-rose-700 dark:text-rose-300" : "text-slate-900 dark:text-white"}`}>
                {valeur}
            </p>
            {note && <p className="text-xs text-slate-500 mt-1">{note}</p>}
        </div>
    );

    const ecart = tresorerie ? tresorerie.book.total - tresorerie.wallet.total : 0;

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-8 py-6 max-w-7xl mx-auto flex items-end justify-between gap-6 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Trésorerie</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Ce que dit le livre, ce qui est porté au compte, et ce qui est dehors.
                        </p>
                    </div>

                    <div className="flex items-end gap-3">
                        <label className="text-xs text-slate-500">
                            Du
                            <input
                                type="date"
                                value={bornes.du}
                                onChange={(e) => setBornes({ ...bornes, du: e.target.value })}
                                className="block mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm text-slate-900 dark:text-white"
                            />
                        </label>
                        <label className="text-xs text-slate-500">
                            Au
                            <input
                                type="date"
                                value={bornes.au}
                                onChange={(e) => setBornes({ ...bornes, au: e.target.value })}
                                className="block mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm text-slate-900 dark:text-white"
                            />
                        </label>
                    </div>
                </div>
            </header>

            <div className="px-8 py-8 max-w-7xl mx-auto space-y-10">
                {chargement || !tresorerie ? (
                    <Loading />
                ) : (
                    <>
                        <section>
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Ce qu'Ongo a gagné</h3>
                            <p className="text-sm text-slate-500 mb-4">
                                {tresorerie.book.orders} commande{tresorerie.book.orders > 1 ? "s" : ""} livrée
                                {tresorerie.book.orders > 1 ? "s" : ""} sur la période. Chiffres figés à la livraison :
                                un changement de taux ne les réécrit pas.
                            </p>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {carte("Commission sur les paniers", francs(tresorerie.book.basket_commission))}
                                {carte("Frais de service", francs(tresorerie.book.service_fees), "Ongo les garde en entier")}
                                {carte(
                                    "Commission de livraison",
                                    francs(tresorerie.book.delivery_commission),
                                    "hors livreurs des marchands"
                                )}
                                {carte(
                                    "Total du livre",
                                    francs(tresorerie.book.total),
                                    tresorerie.book.platform_discounts > 0
                                        ? `dont ${francs(tresorerie.book.platform_discounts)} de remises offertes, déduites`
                                        : undefined
                                )}
                            </div>

                            {/*
                                L'écart est la seule information que personne
                                n'avait : deux chiffres qui devraient tomber
                                pareil, et rien pour le vérifier.
                            */}
                            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {carte(
                                    "Porté au compte d'Ongo",
                                    francs(tresorerie.wallet.total),
                                    "les écritures réelles du portefeuille"
                                )}
                                {carte(
                                    "Écart livre / compte",
                                    ecart === 0 ? "aucun" : francs(ecart),
                                    ecart === 0
                                        ? "les deux chiffres se répondent"
                                        : "une écriture a échoué : elle est journalisée côté serveur",
                                    ecart !== 0
                                )}
                            </div>

                            {tresorerie.book.not_credited > 0 && (
                                <p className="text-sm text-rose-700 dark:text-rose-300 mt-3">
                                    {tresorerie.book.not_credited} commande
                                    {tresorerie.book.not_credited > 1 ? "s" : ""} dont la part d'Ongo n'a pas été portée.
                                </p>
                            )}
                        </section>

                        <section>
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Ce qui est dehors</h3>
                            <p className="text-sm text-slate-500 mb-4">
                                Ongo doit son net au marchand dès la remise, et se retourne ensuite vers le livreur qui
                                a encaissé. Entre les deux, c'est de la trésorerie avancée.
                            </p>

                            {/*
                                Les deux sens ne se compensent pas.
                                Un marchand qui doit 2 000 F diminuait ce qu'Ongo
                                semblait devoir aux autres : deux marchands, l'un
                                à +7 600 et l'autre à −2 000, affichaient 5 600.
                                Ce sont deux mouvements différents, qui ne tombent
                                ni au même moment ni par le même chemin.
                            */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {carte(
                                    "À verser — relevés clos",
                                    francs(tresorerie.merchants.to_pay_closed),
                                    "figés, en attente de virement"
                                )}
                                {carte(
                                    "À verser — en cours",
                                    francs(tresorerie.merchants.to_pay_running),
                                    "pas encore clôturé"
                                )}
                                {carte(
                                    "À encaisser des marchands",
                                    francs(tresorerie.merchants.to_collect_closed + tresorerie.merchants.to_collect_running),
                                    "espèces prises au comptoir ou par leurs livreurs",
                                    tresorerie.merchants.to_collect_closed + tresorerie.merchants.to_collect_running > 0
                                )}
                                {carte(
                                    "Espèces chez les livreurs",
                                    francs(tresorerie.couriers.debt),
                                    `${tresorerie.couriers.count} livreur${tresorerie.couriers.count > 1 ? "s" : ""} concerné${
                                        tresorerie.couriers.count > 1 ? "s" : ""
                                    }`,
                                    tresorerie.couriers.debt > 0
                                )}
                            </div>
                        </section>

                        {tresorerie.couriers.list.length > 0 && (
                            <section>
                                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Qui doit quoi</h3>

                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="text-slate-500 bg-slate-50 dark:bg-slate-800/40">
                                            <tr>
                                                <th className="text-left px-5 py-3 font-semibold">Livreur</th>
                                                <th className="text-left px-5 py-3 font-semibold">Statut</th>
                                                <th className="text-right px-5 py-3 font-semibold">Doit</th>
                                                <th className="text-right px-5 py-3 font-semibold">Plafond</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {tresorerie.couriers.list.map((livreur) => (
                                                <tr key={livreur.user_id}>
                                                    <td className="px-5 py-3 text-slate-900 dark:text-white">
                                                        {livreur.nom || "—"}
                                                        <span className="block text-xs text-slate-500">{livreur.telephone ?? "—"}</span>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span
                                                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                                livreur.listed
                                                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                                                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                                            }`}
                                                        >
                                                            {livreur.listed ? "Livreur Ongo Eat" : "Chauffeur non inscrit"}
                                                        </span>
                                                    </td>
                                                    <td
                                                        className={`px-5 py-3 text-right font-semibold ${
                                                            livreur.debt >= livreur.ceiling
                                                                ? "text-rose-700 dark:text-rose-300"
                                                                : "text-slate-900 dark:text-white"
                                                        }`}
                                                    >
                                                        {francs(livreur.debt)}
                                                    </td>
                                                    <td className="px-5 py-3 text-right text-slate-500">{francs(livreur.ceiling)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <p className="text-xs text-slate-500 mt-3">
                                    Au plafond, plus aucune commande en espèces ne lui est proposée — les commandes
                                    payées en ligne continuent. Les deux plafonds se règlent dans « Réglages ».
                                </p>
                            </section>
                        )}
                    </>
                )}
            </div>
        </MainLayout>
    );
}
