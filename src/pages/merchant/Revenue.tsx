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
    service_fees: number;

    /** Ce qui a déjà été versé, livraison par livraison. */
    advanced: number;

    collected: number;
    discounts: number;
    refunds: number;
    net: number;
    since: string | null;

    /** Quand Ongo doit avoir versé. */
    due_at: string | null;
    late: boolean;
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
    service_fees: number;
    advanced: number;
    refunds: number;
    collected: number;
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
    service_fee: number;
    refund: number;
    collected: number;
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

/** Ce qu'un restaurant a rapporté, dans un relevé ou depuis la clôture. */
interface ParBoutique {
    store_id: number | null;
    store_name: string | null;
    orders_count: number;
    gross: number;
    commission: number;
    delivery_kept: number;
    service_fees: number;
    collected: number;
    net: number;
}

/** Une écriture du portefeuille, telle que la route la rend. */
interface Mouvement {
    transaction_id: string;
    amount: number;
    description: string | null;
    service: string | null;
    verified_at: string | null;
    created_at: string | null;
}

interface Portefeuille {
    balance: number;
    telephone: string | null;
    mouvements: Mouvement[];
}

interface Versement {
    store_id: number;
    store_name: string;
    method: "momo" | "bank" | "wallet" | null;
    account: string | null;
    holder: string | null;
    bank: string | null;

    /** Le compte du restaurant existe-t-il ? Sans lui, rien ne peut y être versé. */
    has_account: boolean;
}

interface RevenueProps {
    merchantId: string;

    /**
     * Le restaurant choisi dans l'en-tête.
     *
     * Chacun a sa caisse, ses coordonnées et son relevé : sans lui, l'écran ne
     * saurait pas de quelle caisse il parle — et c'est exactement ce qu'il
     * faisait avant, en mélangeant les deux sans le dire.
     */
    storeId?: number | null;

    /** Le propriétaire seul indique où être payé, et retire. */
    isOwner?: boolean;
}

/** Le portefeuille en tête : c'est le défaut, les deux autres sont des ajouts. */
const CANAUX: Record<string, string> = {
    wallet: "Portefeuille Ongo",
    momo: "Mobile money",
    bank: "Virement bancaire",
};

/**
 * Un montant, toujours lisible.
 *
 * `?? 0` ne suffisait pas : une soustraction avec un champ absent donne `NaN`,
 * qui n'est ni nul ni indéfini et s'imprimait tel quel. Un écran d'argent n'a
 * pas le droit d'afficher « NaN F ».
 */
const francs = (montant: number) => `${(Number.isFinite(montant) ? montant : 0).toLocaleString("fr-FR")} F`;

/**
 * Un solde se lit dans les deux sens.
 *
 * Négatif, ce n'est pas « moins d'argent » : c'est de l'argent que le
 * marchand doit. Il a encaissé des espèces à la place d'Ongo, commission et
 * frais de service compris. « −2 000 F » le laisserait chercher ce qu'il a
 * perdu ; « 2 000 F à reverser » lui dit quoi faire.
 */
const solde = (net: number) => (net < 0 ? `${francs(-net)} à reverser` : francs(net));

const jour = (valeur: string | null) =>
    valeur ? new Date(valeur).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function Revenue({ merchantId, storeId = null, isOwner = false }: RevenueProps) {
    const [enCours, setEnCours] = useState<EnCours | null>(null);
    const [parBoutique, setParBoutique] = useState<ParBoutique[]>([]);
    const [versement, setVersement] = useState<Versement | null>(null);
    const [portefeuille, setPortefeuille] = useState<Portefeuille | null>(null);
    const [releves, setReleves] = useState<Releve[]>([]);
    const [ouvert, setOuvert] = useState<string | null>(null);
    const [lignes, setLignes] = useState<Ligne[]>([]);
    const [chargement, setChargement] = useState<boolean>(true);

    const api = new ApiService();

    const charger = async () => {
        setChargement(true);

        try {
            const { data } = await api.getData(
                `v3/merchant/${merchantId}/revenue`,
                storeId === null ? undefined : { store_id: storeId }
            );

            if (data.success) {
                setEnCours(data.data.running);
                setParBoutique(data.data.by_store ?? []);
                setVersement(data.data.payout ?? null);

                // La caisse du restaurant, et non le portefeuille personnel du
                // propriétaire : c'est toute la raison du compte par restaurant.
                setPortefeuille(data.data.wallet ?? null);
                setReleves(data.data.statements ?? []);

            } else {
                Swal.fire({ icon: "info", title: "Non accessible", text: data.message });
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Revenus illisibles", text: String(erreur) });
        }

        setChargement(false);
    };

    // Et au changement de restaurant : c'est de sa caisse qu'on parle.
    useEffect(() => {
        charger();
    }, [merchantId, storeId]);

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

    const carte = (titre: string, valeur: string, legende?: string, alerte?: boolean) => (
        <div
            className={`p-5 rounded-xl border ${
                alerte
                    ? "border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            }`}
        >
            <p className="text-xs font-semibold uppercase text-slate-500">{titre}</p>
            <p className={`text-2xl font-bold mt-1 ${alerte ? "text-rose-700 dark:text-rose-300" : "text-slate-900 dark:text-white"}`}>
                {valeur}
            </p>
            {legende && <p className={`text-xs mt-1 ${alerte ? "text-rose-700 dark:text-rose-300" : "text-slate-500"}`}>{legende}</p>}
        </div>
    );

    /**
     * Choisir où être payé.
     *
     * Le portefeuille ne demande aucun numéro : le compte Ongo du propriétaire
     * existe déjà, et il retire ensuite comme un chauffeur. Les deux autres
     * canaux sortent d'Ongo, et un numéro erroné n'est pas récupérable — d'où
     * le titulaire, qui n'est pas obligatoire mais qui évite de découvrir la
     * faute au moment du virement.
     */
    /**
     * Vider la caisse du restaurant vers son mobile money.
     *
     * La destination est celle **déclarée sur la fiche**, jamais un numéro tapé
     * au moment du clic : sinon une session compromise vide la caisse vers
     * n'importe où. Elle est donc affichée avant de demander le montant — un
     * virement mal adressé ne se rattrape pas, et le numéro sous les yeux est
     * la seule vérification possible.
     */
    const retirer = async () => {
        if (versement === null) return;

        let beneficiaire: {
            account: string;
            holder: string;
            balance: number;
            store_name: string;

            /** Les opérateurs et leurs codes, rendus par le serveur. */
            operators: { code: number; name: string }[];
        };

        try {
            const { data } = await api.postData(`v3/merchant/${merchantId}/withdraw`, {
                store_id: versement.store_id,
            });

            if (!data.success) {
                Swal.fire({ icon: "warning", title: "Retrait impossible", text: data.message });
                return;
            }

            beneficiaire = data.data;
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Retrait impossible", text: String(erreur) });
            return;
        }

        /*
         * L'opérateur se choisit au retrait, comme dans le guichet du chauffeur.
         *
         * Le numéro déclaré peut être un compte MTN comme un compte Orange :
         * le supposer envoyait le virement chez le mauvais opérateur. Les codes
         * viennent du serveur — l'écran n'a pas à connaître ceux de Dohone.
         */
        const operateurs: Record<string, string> = {};

        beneficiaire.operators.forEach((o) => {
            operateurs[String(o.code)] = o.name;
        });

        const choix = await Swal.fire({
            title: `Retirer de ${beneficiaire.store_name}`,
            html:
                `<p style="font-size:14px">Vers <b>${beneficiaire.account}</b>` +
                (beneficiaire.holder ? ` — ${beneficiaire.holder}` : "") +
                `</p>` +
                `<p style="font-size:13px;color:#64748b;margin-top:4px">Caisse disponible : ${francs(beneficiaire.balance)}</p>` +
                `<p style="font-size:12px;color:#64748b;margin-top:8px">Pour changer ce numéro, modifiez « Où vous êtes payé ».</p>`,
            input: "select",
            inputLabel: "Opérateur de ce numéro",
            inputOptions: operateurs,
            inputValidator: (valeur) => (valeur ? null : "Choisissez l'opérateur"),
            showCancelButton: true,
            confirmButtonText: "Continuer",
            cancelButtonText: "Annuler",
        });

        if (!choix.isConfirmed || !choix.value) return;

        const saisie = await Swal.fire({
            title: `Combien retirer ?`,
            html:
                `<p style="font-size:13px;color:#64748b">Vers ${beneficiaire.account} · ${
                    operateurs[String(choix.value)]
                }</p>`,
            input: "number",
            inputLabel: "Montant",
            inputValue: beneficiaire.balance,
            inputValidator: (valeur) => {
                const montant = Number(valeur);

                if (!montant || montant <= 0) return "Indiquez un montant";
                if (montant > beneficiaire.balance) return "Plus que la caisse disponible";

                return null;
            },
            showCancelButton: true,
            confirmButtonText: "Retirer",
            cancelButtonText: "Annuler",
        });

        if (!saisie.isConfirmed) return;

        try {
            const { data } = await api.postData(`v3/merchant/${merchantId}/withdraw`, {
                store_id: versement.store_id,
                amount: Number(saisie.value),
                operator: Number(choix.value),
            });

            if (!data.success) {
                Swal.fire({ icon: "error", title: "Retrait refusé", text: data.message });
                return;
            }

            Swal.fire({ icon: "success", title: "Retrait lancé", text: "L'argent part vers le mobile money du restaurant." });
            await charger();
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Retrait impossible", text: String(erreur) });
        }
    };

    const choisirVersement = async () => {
        if (versement === null) return;

        const canal = await Swal.fire({
            title: `Où payer ${versement.store_name} ?`,
            html:
                "<p style=\"font-size:13px;color:#64748b\">Le portefeuille est celui du <b>restaurant</b>, séparé de votre compte personnel. " +
                "Le numéro que vous indiquez sert aussi de destination quand vous retirez sa caisse.</p>",
            input: "select",
            inputOptions: CANAUX,
            inputValue: versement.method ?? "wallet",
            showCancelButton: true,
            confirmButtonText: "Continuer",
            cancelButtonText: "Annuler",
        });

        if (!canal.isConfirmed || !canal.value) return;

        const methode = canal.value as "momo" | "bank" | "wallet";

        let corps: Record<string, string | number> = { method: methode, store_id: versement.store_id };

        if (methode !== "wallet") {
            const saisie = await Swal.fire({
                title: methode === "momo" ? "Votre mobile money" : "Votre compte bancaire",
                html:
                    `<input id="compte" class="swal2-input" placeholder="${
                        methode === "momo" ? "+237 6…" : "Numéro de compte ou IBAN"
                    }" value="${versement.account ?? ""}">` +
                    `<input id="titulaire" class="swal2-input" placeholder="Titulaire du compte" value="${versement.holder ?? ""}">` +
                    (methode === "bank"
                        ? `<input id="banque" class="swal2-input" placeholder="Nom de la banque" value="${versement.bank ?? ""}">`
                        : ""),
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: "Enregistrer",
                cancelButtonText: "Annuler",
                preConfirm: () => ({
                    account: (document.getElementById("compte") as HTMLInputElement)?.value ?? "",
                    holder: (document.getElementById("titulaire") as HTMLInputElement)?.value ?? "",
                    banque: (document.getElementById("banque") as HTMLInputElement)?.value ?? "",
                }),
            });

            if (!saisie.isConfirmed) return;

            corps = {
                method: methode,
                store_id: versement.store_id,
                account: saisie.value.account,
                holder: saisie.value.holder,
                ...(methode === "bank" ? { bank: saisie.value.banque } : {}),
            };
        }

        try {
            const { data } = await api.postData(`v3/merchant/${merchantId}/payout`, corps);

            if (!data.success) {
                Swal.fire({ icon: "error", title: "Non enregistré", text: data.message });
                return;
            }

            setVersement(data.data);
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Enregistrement impossible", text: String(erreur) });
        }
    };

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
                        {carte(
                            // `?? 0` et non `enCours.advanced` nu : une API qui ne
                            // rend pas encore ce champ imprimait « NaN F », et un
                            // écran d'argent n'a pas le droit d'afficher cela.
                            enCours.net - (enCours.advanced ?? 0) < 0 ? "À reverser à Ongo" : "Reste à percevoir",
                            solde(enCours.net - (enCours.advanced ?? 0)),

                            /*
                                La date, et non le seul montant.
                                « À percevoir » sans échéance laissait le marchand
                                sans réponse à la seule question qui l'occupe :
                                quand ? Elle se compte depuis sa plus vieille
                                livraison non réglée, la même des deux côtés.
                            */
                            enCours.due_at
                                ? enCours.late
                                  ? `attendu depuis le ${jour(enCours.due_at)}`
                                  : `versement attendu vers le ${jour(enCours.due_at)}`
                                : `${enCours.orders_count} commande${enCours.orders_count > 1 ? "s" : ""}`,
                            enCours.late
                        )}
                        {carte("Ventes", francs(enCours.gross), "paniers livrés, remises déduites")}
                        {carte("Commission Ongo", francs(enCours.commission))}
                        {carte("Vos livraisons", francs(enCours.delivery_kept), "assurées par vos livreurs")}
                    </div>

                    {/*
                        Ce qui est déjà arrivé sur sa caisse.
                        Les commandes payées en ligne sont versées à la remise :
                        sans cette ligne, il lirait « à percevoir » sans comprendre
                        que l'essentiel est déjà chez lui.
                    */}
                    {(enCours.advanced ?? 0) > 0 && (
                        <p className="text-sm text-slate-500 mt-3">
                            Dont {francs(enCours.advanced)} déjà versés sur la caisse du restaurant, à la livraison des
                            commandes payées en ligne.
                        </p>
                    )}

                    {(enCours.refunds > 0 || enCours.discounts > 0) && (
                        <p className="text-sm text-slate-500 mt-3">
                            Dont {francs(enCours.discounts)} de remises que vous avez offertes
                            {enCours.refunds > 0 ? ` et ${francs(enCours.refunds)} remboursés aux clients` : ""}.
                        </p>
                    )}

                    {/*
                        Les espèces expliquent à elles seules un solde négatif :
                        sans cette ligne, un marchand qui doit de l'argent à
                        Ongo ne voit pas d'où ça sort.
                    */}
                    {enCours.collected > 0 && (
                        <p className="text-sm text-slate-500 mt-1">
                            Vous avez encaissé {francs(enCours.collected)} en espèces, dont{" "}
                            {francs(enCours.service_fees)} de frais de service qui reviennent à Ongo
                            {enCours.delivery_kept > 0 ? ` et ${francs(enCours.delivery_kept)} de frais de livraison` : ""}.
                            Ils se déduisent de ce qui vous revient.
                        </p>
                    )}
                </section>
            )}

            {/*
                Son portefeuille, ici et non dans l'application mobile.
                Ongo y verse par défaut, et le relevé annonçait « Réglé ·
                Portefeuille Ongo » sans que le solde soit visible nulle part sur
                cet écran : il fallait ouvrir son téléphone pour constater un
                versement annoncé ici.
            */}
            {isOwner && portefeuille !== null && (
                <section className="mb-10">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                        La caisse de {versement?.store_name ?? "ce restaurant"}
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">
                        {portefeuille.balance < 0
                            ? `Ce restaurant doit ${francs(-portefeuille.balance)} à Ongo : il a encaissé des espèces à sa place.`
                            : "Les versements d'Ongo arrivent ici. Cet argent est celui du restaurant, séparé de votre compte personnel."}
                    </p>

                    <div className="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-sm text-slate-500">{portefeuille.balance < 0 ? "Vous devez" : "Solde"}</p>
                        <p
                            className={`text-2xl font-bold mt-1 ${
                                portefeuille.balance < 0
                                    ? "text-rose-700 dark:text-rose-300"
                                    : "text-slate-900 dark:text-white"
                            }`}
                        >
                            {francs(Math.abs(portefeuille.balance))}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            Compte du restaurant · {portefeuille.telephone ?? "—"}
                        </p>

                        {portefeuille.mouvements.length > 0 && (
                            <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800">
                                {portefeuille.mouvements.map((mouvement) => (
                                    <div key={mouvement.transaction_id} className="py-2.5 flex items-baseline gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-700 dark:text-slate-200 truncate">
                                                {mouvement.description ?? "—"}
                                            </p>
                                            <p className="text-xs text-slate-400">{jour(mouvement.verified_at ?? mouvement.created_at)}</p>
                                        </div>
                                        <span
                                            className={`text-sm font-medium shrink-0 ${
                                                mouvement.amount < 0
                                                    ? "text-rose-700 dark:text-rose-300"
                                                    : "text-emerald-700 dark:text-emerald-300"
                                            }`}
                                        >
                                            {mouvement.amount < 0 ? "−" : "+"} {francs(Math.abs(mouvement.amount))}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/*
                            Le retrait ici, et non dans l'application : le
                            propriétaire est déjà authentifié et déjà reconnu
                            comme propriétaire. Lui faire quitter sa session pour
                            se reconnecter au compte du restaurant serait une
                            gêne quotidienne dès qu'il en a deux.
                        */}
                        {isOwner && portefeuille.balance > 0 && (
                            <button
                                onClick={retirer}
                                className="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                            >
                                Retirer vers le mobile money
                            </button>
                        )}
                    </div>
                </section>
            )}

            {/*
                Où Ongo verse.
                Le marchand pouvait attendre un virement sans avoir jamais donné
                de numéro de compte : rien ne le lui demandait, et un relevé
                pouvait être marqué réglé sans destinataire.
            */}
            <section className="mb-10">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                    Où {versement === null ? "vous êtes payé" : `${versement.store_name} est payé`}
                </h3>

                {/*
                    Le portefeuille du restaurant est le défaut, pas un manque à
                    combler : son compte existe, Ongo peut y verser sans rien
                    demander. Un mobile money ou une banque sont des ajouts — et
                    le numéro sert aussi de destination de retrait.
                */}
                {versement === null ? (
                    <p className="text-sm text-slate-500">
                        Choisissez un restaurant dans l'en-tête pour voir et modifier ses coordonnées : chacun a sa
                        caisse et peut être payé sur un compte différent.
                    </p>
                ) : (
                    <>
                        <p className="text-sm text-slate-500 mb-4">
                            {versement.method === "wallet" || versement.method === null
                                ? `Sur le portefeuille de ${versement.store_name}, par défaut.${
                                      versement.account
                                          ? ` Retraits vers ${versement.account}.`
                                          : " Indiquez un mobile money pour pouvoir retirer sa caisse."
                                  }`
                                : `${CANAUX[versement.method]} · ${versement.account ?? "—"}${
                                      versement.bank ? ` · ${versement.bank}` : ""
                                  }. Son portefeuille reste disponible.`}
                        </p>

                        {!versement.has_account && (
                            <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                                Ce restaurant n'a pas encore de compte : Ongo doit l'ouvrir pour qu'il puisse
                                encaisser sur un portefeuille.
                            </p>
                        )}

                        {isOwner ? (
                            <button
                                onClick={choisirVersement}
                                className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300"
                            >
                                {versement.method === "wallet" || versement.method === null
                                    ? "Ajouter un mobile money ou un compte"
                                    : "Modifier"}
                            </button>
                        ) : (
                            <p className="text-xs text-slate-400">Seul le propriétaire peut le modifier.</p>
                        )}
                    </>
                )}
            </section>

            {/*
                Par restaurant.
                L'espace a un sélecteur d'établissement dès qu'il y en a
                plusieurs, et tous les onglets s'y plient — celui-ci était le
                seul à mélanger les deux sans le dire.
            */}
            {parBoutique.length > 1 && (
                <section className="mb-10">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Par restaurant</h3>
                    <p className="text-sm text-slate-500 mb-4">
                        Depuis la dernière clôture. Le versement, lui, est unique : Ongo paie l'enseigne, pas
                        chaque adresse.
                    </p>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="text-slate-500 bg-slate-50 dark:bg-slate-800/40">
                                <tr>
                                    <th className="text-left px-5 py-3 font-semibold">Restaurant</th>
                                    <th className="text-right px-5 py-3 font-semibold">Commandes</th>
                                    <th className="text-right px-5 py-3 font-semibold">Ventes</th>
                                    <th className="text-right px-5 py-3 font-semibold">Commission</th>
                                    <th className="text-right px-5 py-3 font-semibold">Solde</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {parBoutique.map((ligne) => (
                                    <tr key={ligne.store_id ?? "sans"}>
                                        <td className="px-5 py-3 text-slate-900 dark:text-white">
                                            {ligne.store_name ?? "—"}
                                        </td>
                                        <td className="px-5 py-3 text-right text-slate-600 dark:text-slate-300">
                                            {ligne.orders_count}
                                        </td>
                                        <td className="px-5 py-3 text-right text-slate-600 dark:text-slate-300">
                                            {francs(ligne.gross)}
                                        </td>
                                        <td className="px-5 py-3 text-right text-slate-600 dark:text-slate-300">
                                            − {francs(ligne.commission)}
                                        </td>
                                        <td className="px-5 py-3 text-right font-medium text-slate-900 dark:text-white">
                                            {solde(ligne.net)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
                                        {solde(releve.net)}
                                    </span>
                                </button>

                                {ouvert === releve.short_id && (
                                    <div className="border-t border-slate-200 dark:border-slate-800">
                                        <div className="px-5 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm bg-slate-50 dark:bg-slate-800/40">
                                            <p className="text-slate-500">Ventes <span className="block font-medium text-slate-900 dark:text-white">{francs(releve.gross)}</span></p>
                                            <p className="text-slate-500">Commission <span className="block font-medium text-slate-900 dark:text-white">− {francs(releve.commission)}</span></p>
                                            <p className="text-slate-500">Vos livraisons <span className="block font-medium text-slate-900 dark:text-white">+ {francs(releve.delivery_kept)}</span></p>
                                            <p className="text-slate-500">Remboursements <span className="block font-medium text-slate-900 dark:text-white">− {francs(releve.refunds)}</span></p>
                                            <p className="text-slate-500">Frais de service <span className="block font-medium text-slate-900 dark:text-white">{francs(releve.service_fees)}</span></p>
                                            <p className="text-slate-500">Déjà versé <span className="block font-medium text-slate-900 dark:text-white">− {francs(releve.advanced ?? 0)}</span></p>
                                            <p className="text-slate-500">Encaissé en espèces <span className="block font-medium text-slate-900 dark:text-white">− {francs(releve.collected)}</span></p>
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
                                                        <th className="text-right px-5 py-2 font-semibold">Frais de service</th>
                                                        <th className="text-right px-5 py-2 font-semibold">Encaissé</th>
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
                                                            {/*
                                                                Les frais de service n'entrent pas dans son net : ils
                                                                ne sont affichés que lorsqu'il les a eus en main, en
                                                                espèces. Ailleurs, un montant en face de son nom se
                                                                lirait comme une retenue.
                                                            */}
                                                            <td className="px-5 py-2 text-right text-slate-500">
                                                                {ligne.collected > 0 && ligne.service_fee > 0 ? francs(ligne.service_fee) : "—"}
                                                            </td>
                                                            <td className="px-5 py-2 text-right text-slate-600 dark:text-slate-300">
                                                                {ligne.collected > 0 ? `− ${francs(ligne.collected)}` : "—"}
                                                            </td>
                                                            <td className="px-5 py-2 text-right font-medium text-slate-900 dark:text-white">{solde(ligne.net)}</td>
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
