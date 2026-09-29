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
    service_fees: number;

    /**
     * Ce qui a déjà été versé au restaurant, livraison par livraison.
     *
     * Une commande payée en ligne, Ongo l'a déjà encaissée : le restaurant est
     * crédité à la remise. Le relevé ne paie donc que `net − advanced` — payer
     * le net paierait deux fois.
     */
    advanced: number;

    status: "open" | "closed" | "paid";
    due_at: string | null;
    paid_at: string | null;
    payment_reference: string | null;
    paid_method: "momo" | "bank" | "wallet" | null;
    paid_account: string | null;
    merchant: { name: string; public_id: string } | null;

    /**
     * Le restaurant que ce relevé solde.
     *
     * C'est lui l'unité : son compte détient sa caisse, ses coordonnées de
     * versement sont les siennes, sa dette lui appartient. Deux restaurants
     * d'une même enseigne ne se compensent pas.
     */
    store: {
        id: number;
        name: string;
        user_id: number | null;
        payout_method: "momo" | "bank" | "wallet" | null;
        payout_account: string | null;
        payout_holder: string | null;
        payout_bank: string | null;
    } | null;
}

/** Ce qu'un canal s'appelle, pour qui n'a pas le code sous les yeux. */
/** Le portefeuille en tête : c'est le défaut, les deux autres sont des ajouts. */
const CANAUX: Record<string, string> = {
    wallet: "Portefeuille Ongo",
    momo: "Mobile money",
    bank: "Virement bancaire",
};

/**
 * Un relevé négatif n'est pas un versement : c'est un encaissement.
 *
 * Le marchand a pris des espèces à la place d'Ongo — au comptoir, ou par son
 * propre livreur — et c'est lui qui doit. L'écran proposait « Marquer réglé »
 * sur « -2 000 F », c'est-à-dire de payer quelqu'un qui doit.
 */
const aVerser = (releve: Releve) => releve.net - (releve.advanced ?? 0);

/**
 * Un relevé négatif n'est pas un versement : c'est un encaissement.
 *
 * Le sens se juge sur ce qui **reste** : une période entièrement avancée ne se
 * verse plus, et une commande avancée puis remboursée à la charge du marchand
 * se retourne en dette.
 */
const aEncaisser = (releve: Releve) => aVerser(releve) < 0;

/** Ce que la ligne montre : toujours une somme positive, avec son sens. */
const montant = (releve: Releve) => {
    const reste = aVerser(releve);

    if (reste < 0) return `${francs(-reste)} à encaisser`;
    if (reste === 0 && (releve.advanced ?? 0) > 0) return "déjà versé";

    return francs(reste);
};

/** En retard : clos, échéance passée. */
const enRetard = (releve: Releve) =>
    releve.status === "closed" && releve.due_at !== null && new Date(releve.due_at) < new Date();

/**
 * Ce qu'Ongo doit à un restaurant, en continu.
 *
 * Le montant dû est écrit à chaque livraison : clôturer une période n'était
 * qu'une étape de plus avant de payer — et si personne ne clôturait, personne
 * n'était payé et rien ne paraissait en retard.
 */
interface ADuire {
    store_id: number;
    store_name: string;
    merchant_name: string | null;
    has_account: boolean;
    orders_count: number;
    net: number;
    advanced: number;
    due: number;
    since: string | null;
    due_at: string | null;
    late: boolean;
    payout_method: "momo" | "bank" | "wallet" | null;
    payout_account: string | null;
    payout_holder: string | null;
    payout_bank: string | null;
}

interface EatPayoutsProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

/** `NaN` n'est ni nul ni indéfini : un écran d'argent ne doit pas l'imprimer. */
const francs = (montant: number) => `${(Number.isFinite(montant) ? montant : 0).toLocaleString("fr-FR")} F`;

const jour = (valeur: string | null) =>
    valeur ? new Date(valeur).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function EatPayouts({ onLogout, theme, toggleTheme }: EatPayoutsProps) {
    const [aRegler, setARegler] = useState<ADuire[]>([]);
    const [attente, setAttente] = useState({ total: 0, page: 1, to_pay: 0, to_collect: 0, late: 0 });
    const [cherche, setCherche] = useState("");
    const [page, setPage] = useState(1);
    const [retardSeul, setRetardSeul] = useState(false);
    const [actualise, setActualise] = useState<Date | null>(null);
    const [releves, setReleves] = useState<Releve[]>([]);
    const [statut, setStatut] = useState<string>("closed");
    const [chargement, setChargement] = useState<boolean>(true);

    const api = new ApiService();

    const charger = async () => {
        setChargement(true);

        try {
            const { data } = await api.getData("v3/admin/eat/statements", { status: statut || undefined });

            if (data.success) setReleves(data.data?.data ?? []);

            const du = await api.getData("v3/admin/eat/statements/pending", {
                q: cherche.trim() || undefined,
                page,
                late: retardSeul ? 1 : undefined,
            });

            if (du.data.success) {
                setARegler(du.data.data?.stores ?? []);
                setAttente({
                    total: du.data.data?.total ?? 0,
                    page: du.data.data?.page ?? 1,
                    to_pay: du.data.data?.totals?.to_pay ?? 0,
                    to_collect: du.data.data?.totals?.to_collect ?? 0,
                    late: du.data.data?.totals?.late ?? 0,
                });
                setActualise(new Date());
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Relevés illisibles", text: String(erreur) });
        }

        setChargement(false);
    };

    useEffect(() => {
        charger();
    }, [statut, page, retardSeul]);

    // Une frappe ne déclenche pas une requête : on attend que la main s'arrête.
    useEffect(() => {
        const minuteur = setTimeout(() => {
            setPage(1);
            charger();
        }, 350);

        return () => clearTimeout(minuteur);
    }, [cherche]);

    /** Clore une période pour tous les marchands actifs. */
    /**
     * Régler un restaurant en un geste.
     *
     * La clôture devient un **effet** du règlement : elle couvre exactement les
     * livraisons non encore réglées, et le relevé reste la trace. Il fallait
     * avant clôturer une période, puis la payer.
     */
    const reglerLeDu = async (ligne: ADuire) => {
        // Le restaurant doit : on récupère, on ne verse pas.
        if (ligne.due < 0) {
            const recu = await Swal.fire({
                title: `Récupérer ${francs(-ligne.due)} ?`,
                html: `<p style="font-size:14px">${ligne.store_name} a encaissé cette somme à la place d'Ongo.</p>`,
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: "Prélever sur sa caisse",
                denyButtonText: "Il a viré",
                cancelButtonText: "Annuler",
            });

            if (recu.isDismissed) return;

            // Le montant affiché part avec la demande : s'il a changé entre le
            // chargement et le clic — une livraison qui s'achève —, le serveur
            // refuse et rend le nouveau.
            let corps: Record<string, string | number> = { store_id: ligne.store_id, expected: ligne.due };

            if (recu.isConfirmed) {
                corps.method = "wallet";
            } else {
                const reference = await Swal.fire({
                    title: "Référence de son versement",
                    input: "text",
                    inputPlaceholder: "Ex. OM-RECU-77",
                    inputValidator: (v) => (v && v.trim() !== "" ? null : "La référence est obligatoire"),
                    showCancelButton: true,
                    confirmButtonText: "Marquer encaissé",
                    cancelButtonText: "Annuler",
                });

                if (!reference.isConfirmed) return;

                corps = { ...corps, method: "momo", reference: reference.value };
            }

            await envoyerLeReglement(corps);

            return;
        }

        const canal = ligne.payout_method ?? "wallet";

        if (canal === "wallet") {
            const confirmation = await Swal.fire({
                icon: "question",
                title: `Verser ${francs(ligne.due)} ?`,
                html:
                    `<p style="font-size:14px">Sur la caisse de ${ligne.store_name}.</p>` +
                    (ligne.has_account
                        ? ""
                        : `<p style="font-size:13px;color:#b91c1c;margin-top:8px">Ce restaurant n'a pas encore de compte : ouvrez-le dans « Boutiques ».</p>`),
                showCancelButton: true,
                confirmButtonText: "Verser",
                cancelButtonText: "Annuler",
            });

            if (!confirmation.isConfirmed) return;

            await envoyerLeReglement({ store_id: ligne.store_id, method: "wallet", expected: ligne.due });

            return;
        }

        const choix = await Swal.fire({
            title: `Régler ${ligne.store_name} ?`,
            html:
                `<p style="font-size:14px">${francs(ligne.due)} par ${CANAUX[canal]?.toLowerCase()}</p>` +
                `<p style="font-size:13px;color:#64748b;margin-top:4px">${ligne.payout_account ?? "—"}` +
                (ligne.payout_bank ? ` · ${ligne.payout_bank}` : "") +
                (ligne.payout_holder ? `<br>${ligne.payout_holder}` : "") +
                `</p>`,
            input: "text",
            inputLabel: "Référence du versement",
            inputPlaceholder: "Ex. OM-240921-8842",
            inputValidator: (v) => (v && v.trim() !== "" ? null : "La référence est obligatoire"),
            showCancelButton: true,
            confirmButtonText: "Marquer réglé",
            cancelButtonText: "Annuler",
        });

        if (!choix.isConfirmed) return;

        await envoyerLeReglement({
            store_id: ligne.store_id,
            method: canal,
            reference: choix.value,
            expected: ligne.due,
        });
    };

    /**
     * Clôturer une période, pour en produire le relevé.
     *
     * Ça ne déplace pas d'argent et ça ne cache pas ce qui est dû : « À régler
     * maintenant » lit aussi les relevés clos non réglés. C'était le contraire
     * jusqu'ici — clôturer faisait disparaître le montant de cet écran.
     */
    const clore = async () => {
        const aujourdHui = new Date();
        const debutDuMois = new Date(aujourdHui.getFullYear(), aujourdHui.getMonth(), 1);

        const choix = await Swal.fire({
            title: "Clôturer une période",
            html:
                `<input id="du" type="date" class="swal2-input" value="${debutDuMois.toISOString().slice(0, 10)}">` +
                `<input id="au" type="date" class="swal2-input" value="${aujourdHui.toISOString().slice(0, 10)}">` +
                `<p style="font-size:13px;color:#64748b;margin-top:8px">Produit le relevé de la période pour chaque restaurant actif. ` +
                `Aucun argent ne bouge, et ce qui est dû reste affiché au-dessus.</p>`,
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

            if (!data.success) {
                Swal.fire({ icon: "error", title: "Clôture refusée", text: data.message });
                return;
            }

            Swal.fire({ icon: "success", title: data.message, timer: 1800, showConfirmButton: false });
            await charger();
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Clôture impossible", text: String(erreur) });
        }
    };

    const envoyerLeReglement = async (corps: Record<string, string | number>) => {
        try {
            const { data } = await api.postData("v3/admin/eat/statements/settle", corps);

            if (!data.success) {
                // Le montant a bougé : on le dit, et on recharge pour montrer le
                // vrai. Ce n'est pas une erreur, c'est une livraison de plus.
                const perime = typeof data.data?.due === "number";

                Swal.fire({
                    icon: perime ? "info" : "error",
                    title: perime ? "Le montant a changé" : "Refusé",
                    text: data.message,
                });

                if (perime) await charger();

                return;
            }

            Swal.fire({ icon: "success", title: data.message, timer: 1800, showConfirmButton: false });
            await charger();
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Action impossible", text: String(erreur) });
        }
    };



    /**
     * Régler, par le canal que le marchand a choisi.
     *
     * **Portefeuille** : rien à saisir. L'écriture est la preuve, et sa
     * référence est l'identifiant de la transaction — le serveur la récupère.
     *
     * **Mobile money ou banque** : le virement est extérieur, et la référence
     * est la seule trace. Elle est exigée ici comme elle l'est au serveur : la
     * demander après l'avoir laissée vide serait une seconde occasion de se
     * tromper.
     */
    const regler = async (releve: Releve) => {
        /*
         * Le marchand doit : on encaisse, et la référence enregistre ce qu'il a
         * versé. Aucun compte à connaître — l'argent ne va pas chez lui —, donc
         * rien n'exige qu'il ait déclaré où être payé.
         */
        if (aEncaisser(releve)) {
            /*
             * Deux façons de récupérer : un virement de sa part, dont on note la
             * référence, ou un prélèvement sur le portefeuille du propriétaire.
             *
             * Le second évite le virement sortant : la dette change de place et
             * se lit là où il peut la régler, comme pour un livreur. Son solde
             * part en négatif, et c'est exact — l'argent est déjà dans sa caisse.
             */
            const voie = await Swal.fire({
                title: `Récupérer ${francs(-aVerser(releve))} ?`,
                html: `<p style="font-size:14px">${releve.store?.name ?? "Ce restaurant"} a encaissé cette somme à la place d'Ongo.</p>`,
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: "Prélever sur son portefeuille",
                denyButtonText: "Il a viré",
                cancelButtonText: "Annuler",
            });

            if (voie.isDismissed) return;

            let corps: Record<string, string>;

            if (voie.isConfirmed) {
                corps = { statement_id: releve.short_id, method: "wallet" };
            } else {
                const recu = await Swal.fire({
                    title: "Référence de son versement",
                    input: "text",
                    inputPlaceholder: "Ex. OM-RECU-77",
                    inputValidator: (valeur) => (valeur && valeur.trim() !== "" ? null : "La référence est obligatoire"),
                    showCancelButton: true,
                    confirmButtonText: "Marquer encaissé",
                    cancelButtonText: "Annuler",
                });

                if (!recu.isConfirmed) return;

                corps = { statement_id: releve.short_id, method: "momo", reference: recu.value };
            }

            try {
                const { data } = await api.postData("v3/admin/eat/statements/pay", corps);

                if (data.success) await charger();
                else Swal.fire({ icon: "error", title: "Refusé", text: data.message });
            } catch (erreur) {
                Swal.fire({ icon: "error", title: "Action impossible", text: String(erreur) });
            }

            return;
        }

        // Le portefeuille est le defaut : il n'y a pas de marchand qu'on ne
        // puisse pas payer.
        const canal = releve.store?.payout_method ?? "wallet";

        let reference: string | undefined;

        if (canal === "wallet") {
            const confirmation = await Swal.fire({
                icon: "question",
                title: `Verser ${francs(aVerser(releve))} ?`,
                text: `Sur le portefeuille de ${releve.store?.name}. Le propriétaire pourra les retirer depuis son espace.`,
                showCancelButton: true,
                confirmButtonText: "Verser",
                cancelButtonText: "Annuler",
            });

            if (!confirmation.isConfirmed) return;
        } else {
            const choix = await Swal.fire({
                title: `Régler ${releve.store?.name ?? "ce restaurant"} ?`,
                html:
                    `<p style="font-size:14px">${francs(aVerser(releve))} par ${CANAUX[canal]?.toLowerCase()}</p>` +
                    `<p style="font-size:13px;color:#64748b;margin-top:4px">${releve.store?.payout_account ?? "—"}` +
                    (releve.store?.payout_bank ? ` · ${releve.store.payout_bank}` : "") +
                    (releve.store?.payout_holder ? `<br>${releve.store.payout_holder}` : "") +
                    `</p>`,
                input: "text",
                inputLabel: "Référence du versement",
                inputPlaceholder: "Ex. OM-240921-8842",
                inputValidator: (valeur) =>
                    valeur && valeur.trim() !== "" ? null : "La référence est obligatoire",
                showCancelButton: true,
                confirmButtonText: "Marquer réglé",
                cancelButtonText: "Annuler",
            });

            if (!choix.isConfirmed) return;

            reference = choix.value;
        }

        try {
            const { data } = await api.postData("v3/admin/eat/statements/pay", {
                statement_id: releve.short_id,
                method: canal,
                ...(reference === undefined ? {} : { reference }),
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
                            Le montant dû est à jour en permanence. Le versement, lui, reste périodique : l'échéance
                            dit quand il est attendu.
                        </p>
                    </div>

                    <button
                        onClick={clore}
                        className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300 shrink-0"
                        title="Produit le relevé de la période. Aucun argent ne bouge."
                    >
                        Clôturer une période
                    </button>

                </div>
            </header>

            <div className="px-8 py-8 max-w-7xl mx-auto">
                {/*
                    Ce qu'on doit maintenant, sans avoir rien clôturé.
                    Le montant dû est écrit à chaque livraison : clôturer une
                    période n'était qu'une étape de plus avant de payer — et si
                    personne ne clôturait, personne n'était payé et rien ne
                    paraissait en retard.
                */}
                <section className="mb-10">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">À régler maintenant</h3>
                    {/*
                        Deux choses à ne pas confondre, et la première formulation
                        les mélangeait : le **calcul** est continu, le **versement**
                        reste périodique. « En un geste » ne parle que des deux
                        clics devenus un — clôturer, puis payer.
                    */}
                    <p className="text-sm text-slate-500 mb-4">
                        Recalculé à chaque livraison, sans rien clôturer. Payez quand l'échéance arrive : « Régler »
                        fige le relevé et verse en une fois, là où il fallait deux gestes.
                    </p>

                    {/*
                        Les totaux d'abord, la page ensuite.
                        À mille restaurants, la question n'est pas « qui est sur cet
                        écran » mais « combien reste-t-il, et combien sont en
                        retard ». Ces trois chiffres portent sur l'ensemble, jamais
                        sur la page affichée.
                    */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                        <div className="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                            <p className="text-xs text-slate-500">À verser</p>
                            <p className="text-xl font-bold mt-1 text-slate-900 dark:text-white">{francs(attente.to_pay)}</p>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                            <p className="text-xs text-slate-500">À encaisser</p>
                            <p className="text-xl font-bold mt-1 text-slate-900 dark:text-white">{francs(attente.to_collect)}</p>
                        </div>
                        {/*
                            Un chiffre sur lequel on clique.
                            « En retard : 12 » sans moyen de les voir oblige à
                            chercher les douze dans la liste. Le compte reste
                            celui de l'ensemble même quand le filtre est actif :
                            sinon filtrer ferait disparaître le chiffre qui a
                            motivé le clic.
                        */}
                        <button
                            onClick={() => {
                                setPage(1);
                                setRetardSeul((actif) => !actif);
                            }}
                            disabled={attente.late === 0 && !retardSeul}
                            className={`p-4 rounded-xl border text-left transition ${
                                retardSeul
                                    ? "border-rose-500 bg-rose-100 dark:border-rose-500 dark:bg-rose-950/60"
                                    : attente.late > 0
                                      ? "border-rose-300 bg-rose-50 hover:border-rose-400 dark:border-rose-900 dark:bg-rose-950/30"
                                      : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                            } ${attente.late === 0 && !retardSeul ? "cursor-default" : ""}`}
                        >
                            <p className="text-xs text-slate-500">
                                En retard{retardSeul ? " · affichés" : attente.late > 0 ? " · voir" : ""}
                            </p>
                            <p
                                className={`text-xl font-bold mt-1 ${
                                    attente.late > 0 ? "text-rose-700 dark:text-rose-300" : "text-slate-900 dark:text-white"
                                }`}
                            >
                                {attente.late}
                            </p>
                        </button>
                        <div className="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                            <p className="text-xs text-slate-500">Restaurants concernés</p>
                            <p className="text-xl font-bold mt-1 text-slate-900 dark:text-white">{attente.total}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <input
                            value={cherche}
                            onChange={(e) => setCherche(e.target.value)}
                            placeholder="Chercher un restaurant ou une enseigne"
                            className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm text-slate-900 dark:text-white"
                        />

                        <button
                            onClick={charger}
                            className="px-3 py-2 rounded-lg text-sm border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300"
                        >
                            Actualiser
                        </button>

                        {actualise && (
                            <span className="text-xs text-slate-400">
                                à jour à {actualise.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                        )}
                    </div>

                    {retardSeul && (
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                                Retards seulement
                            </span>
                            <button
                                onClick={() => {
                                    setPage(1);
                                    setRetardSeul(false);
                                }}
                                className="text-xs text-slate-600 dark:text-slate-300 underline"
                            >
                                Tout afficher
                            </button>
                        </div>
                    )}

                    {aRegler.length === 0 ? (
                        <p className="text-sm text-slate-500">
                            {retardSeul
                                ? "Aucun retard : tout est dans les délais."
                                : cherche.trim() !== ""
                                  ? "Aucun restaurant ne correspond à cette recherche."
                                  : "Rien en attente : toutes les livraisons sont réglées."}
                        </p>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
                            {aRegler.map((ligne) => (
                                <div
                                    key={ligne.store_id}
                                    className={`p-5 flex items-center gap-4 flex-wrap ${
                                        ligne.late ? "bg-rose-50 dark:bg-rose-950/20" : ""
                                    }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 dark:text-white truncate">
                                            {ligne.store_name}
                                            {ligne.due > 0 && (
                                                <span className="ml-2 text-xs font-normal text-slate-500">
                                                    {CANAUX[ligne.payout_method ?? "wallet"]}
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            {ligne.merchant_name ? `${ligne.merchant_name} · ` : ""}
                                            {ligne.orders_count} commande{ligne.orders_count > 1 ? "s" : ""}
                                            {ligne.advanced > 0 ? ` · ${francs(ligne.advanced)} déjà versés` : ""}
                                        </p>

                                        {ligne.due_at && (
                                            <p
                                                className={`text-xs mt-1 ${
                                                    ligne.late
                                                        ? "text-rose-700 dark:text-rose-300 font-medium"
                                                        : "text-slate-400"
                                                }`}
                                            >
                                                {ligne.late ? "En retard depuis le" : "À régler avant le"} {jour(ligne.due_at)}
                                            </p>
                                        )}
                                    </div>

                                    <span
                                        className={`font-semibold shrink-0 ${
                                            ligne.due < 0
                                                ? "text-amber-700 dark:text-amber-300"
                                                : "text-slate-900 dark:text-white"
                                        }`}
                                    >
                                        {ligne.due < 0 ? `${francs(-ligne.due)} à encaisser` : francs(ligne.due)}
                                    </span>

                                    <button
                                        onClick={() => reglerLeDu(ligne)}
                                        className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 shrink-0"
                                    >
                                        {ligne.due < 0 ? "Récupérer" : ligne.due === 0 ? "Solder" : "Régler"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    {attente.total > aRegler.length && (
                        <div className="flex items-center justify-between mt-4">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={attente.page <= 1}
                                className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                            >
                                Précédent
                            </button>

                            <span className="text-xs text-slate-500">
                                {aRegler.length} sur {attente.total}
                            </span>

                            <button
                                onClick={() => setPage((p) => p + 1)}
                                disabled={attente.page * 25 >= attente.total}
                                className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                            >
                                Suivant
                            </button>
                        </div>
                    )}
                </section>

                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Relevés</h3>
                <p className="text-sm text-slate-500 mb-4">
                    La trace de chaque règlement, avec sa référence et son détail. Un relevé clos mais pas encore réglé
                    reste compté au-dessus : clôturer ne cache rien.
                </p>

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
                            <div
                                key={releve.public_id}
                                className={`p-5 flex items-center gap-4 ${
                                    enRetard(releve) ? "bg-rose-50 dark:bg-rose-950/20" : ""
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-900 dark:text-white truncate">
                                        {releve.store?.name ?? releve.merchant?.name ?? "—"}
                                        {/*
                                            Le canal est sur la ligne : « Marquer réglé » ne fait pas la
                                            même chose selon le cas, et on doit le savoir avant d'appuyer.
                                        */}
                                        {releve.status !== "paid" && !aEncaisser(releve) && (
                                            <span className="ml-2 text-xs font-normal text-slate-500">
                                                {CANAUX[releve.store?.payout_method ?? "wallet"]}
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {releve.merchant?.name ? `${releve.merchant.name} · ` : ""}
                                        {jour(releve.period_start)} – {jour(releve.period_end)} · {releve.orders_count} commande
                                        {releve.orders_count > 1 ? "s" : ""} · commission {francs(releve.commission)}
                                    </p>

                                    {/* L'échéance, et le retard s'il y en a : c'est ce qui dit dans
                                        quel ordre payer. */}
                                    {releve.status === "closed" && releve.due_at && (
                                        <p
                                            className={`text-xs mt-1 ${
                                                enRetard(releve)
                                                    ? "text-rose-700 dark:text-rose-300 font-medium"
                                                    : "text-slate-400"
                                            }`}
                                        >
                                            {enRetard(releve) ? "En retard depuis le" : "À régler avant le"} {jour(releve.due_at)}
                                        </p>
                                    )}

                                    {(releve.advanced ?? 0) > 0 && (
                                        <p className="text-xs text-slate-400 mt-1">
                                            {francs(releve.advanced)} déjà versés à la livraison des commandes payées en ligne
                                        </p>
                                    )}

                                    {releve.payment_reference && (
                                        <p className="text-xs text-slate-400 mt-1">
                                            Réf. {releve.payment_reference}
                                            {releve.paid_method ? ` · ${CANAUX[releve.paid_method]}` : ""}
                                            {releve.paid_account ? ` · ${releve.paid_account}` : ""}
                                        </p>
                                    )}
                                </div>

                                <span
                                    className={`font-semibold shrink-0 ${
                                        aEncaisser(releve) ? "text-amber-700 dark:text-amber-300" : "text-slate-900 dark:text-white"
                                    }`}
                                >
                                    {montant(releve)}
                                </span>

                                {releve.status === "paid" ? (
                                    <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 shrink-0">
                                        {aEncaisser(releve) ? "Encaissé le" : "Réglé le"} {jour(releve.paid_at)}
                                    </span>
                                ) : aVerser(releve) === 0 ? (
                                    <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                                        Rien à verser
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => regler(releve)}
                                        className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 shrink-0"
                                    >
                                        {aEncaisser(releve)
                                            ? "Récupérer"
                                            : (releve.store?.payout_method ?? "wallet") === "wallet"
                                              ? "Verser"
                                              : "Marquer réglé"}
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
