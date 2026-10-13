import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";

/**
 * Les livraisons : qui part, qui attend, qui n'a personne.
 *
 * Le poste de commande sert la cuisine — accepter, préparer, déclarer prêt. Il
 * n'est pas fait pour la personne qui, à côté, s'occupe des départs : elle y
 * cherche ses livraisons parmi quatre colonnes où les trois quarts ne la
 * concernent pas, et rien n'y est rangé par ce qui l'intéresse — **est-ce que
 * quelqu'un vient chercher cette commande ?**
 *
 * Cet écran ne montre que les livraisons, et les range dans cet ordre-là.
 *
 * Aucune route nouvelle : la même file que le comptoir, lue autrement. Ce qui
 * change est le tri et ce qu'on met en avant.
 */

interface Ligne {
    name: string;
    quantity: number;
}

interface Commande {
    id: number;
    public_id: string;
    code: string;
    status: string;
    dining_mode: string;
    total: number;
    created_at: string;
    promised_at: string | null;
    delivery_address: string | null;
    courier_id: number | null;

    /**
     * Où en est la recherche : « merchant » chez les livreurs de l'enseigne,
     * « platform » chez ceux d'Ongo, **nul** quand la livraison est sortie de
     * la répartition — un livreur l'a rendue, personne ne viendra sans un
     * geste.
     */
    dispatch_stage: string | null;
    items: Ligne[];
    customer: { nom: string | null; telephone: string | null } | null;
}

interface File {
    store: { id: number; name: string };
    preparing: Commande[];
    ready: Commande[];
    handed: Commande[];
}

/** Un livreur de l'enseigne, tel que `couriers` le rend. */
interface Livreur {
    user_id: number;
    is_active: boolean;
    removed_at: string | null;
    nom: string | null;
    prenom: string | null;
    telephone: string | null;
    matricule: string | null;
}

interface DispatchProps {
    merchantId: string;
    storeId: number;
}

/** Depuis combien de minutes, arrondi à la minute. */
const minutesDepuis = (quand: string): number => Math.max(0, Math.floor((Date.now() - new Date(quand).getTime()) / 60000));

export default function Dispatch({ merchantId, storeId }: DispatchProps) {
    const [file, setFile] = useState<File | null>(null);
    const [livreurs, setLivreurs] = useState<Livreur[]>([]);
    const [chargement, setChargement] = useState<boolean>(true);

    const api = new ApiService();
    const base = `v3/merchant/${merchantId}/stores/${storeId}`;

    const charger = async (silencieux = false) => {
        if (!silencieux) setChargement(true);

        try {
            const { data } = await api.getData(`${base}/orders`);

            if (data.success) setFile(data.data);
        } catch (erreur) {
            if (!silencieux) Swal.fire({ icon: "warning", title: "File illisible", text: String(erreur) });
        }

        setChargement(false);
    };

    /**
     * Les livreurs de l'enseigne, pour l'attribution à la main.
     *
     * Une fois à l'ouverture : la liste ne change pas pendant un service, et la
     * recharger toutes les dix secondes avec la file serait un appel pour rien.
     */
    const chargerLivreurs = async () => {
        try {
            const { data } = await api.getData(`v3/merchant/${merchantId}/couriers`);

            if (data.success) setLivreurs((data.data ?? []) as Livreur[]);
        } catch {
            // Sans la liste, le bouton d'attribution ne paraît pas : la
            // répartition automatique reste, elle, entière.
        }
    };

    useEffect(() => {
        charger();
        chargerLivreurs();

        // Même rythme que le comptoir : une recherche de livreur se joue en
        // dizaines de secondes, et personne n'actualise une page à la main.
        const rythme = setInterval(() => charger(true), 10000);

        return () => clearInterval(rythme);
    }, [storeId]);

    const agir = async (chemin: string, corps: Record<string, unknown>, succes?: string) => {
        try {
            const { data } = await api.postData(`${base}/${chemin}`, corps);

            if (data.success) {
                await charger(true);

                if (succes) Swal.fire({ icon: "success", title: succes, timer: 1200, showConfirmButton: false });
            } else {
                Swal.fire({ icon: "error", title: "Refusé", text: data.message });
            }
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Action impossible", text: String(erreur) });
        }
    };

    const remettre = async (commande: Commande) => {
        const choix = await Swal.fire({
            title: `Remettre ${commande.code}`,
            text: "Saisissez le code présenté par le livreur.",
            input: "text",
            inputPlaceholder: "Code à 6 caractères",
            showCancelButton: true,
            confirmButtonText: "Remettre",
            cancelButtonText: "Annuler",
        });

        if (!choix.isConfirmed) return;

        await agir("orders/handover", { order_id: commande.id, code: choix.value }, "Commande remise");
    };

    /**
     * Confier la livraison à l'un de ses livreurs.
     *
     * La répartition automatique sollicite les livreurs joignables l'un après
     * l'autre, et suppose qu'ils sont en ligne, repérés et disponibles. Un
     * restaurant qui a ses motos devant la porte n'a pas à attendre cela : il
     * sait qui part.
     *
     * Ce n'est **pas** la remise : celle-ci dit que le sac quitte le comptoir,
     * et son code dit lequel des cinq sacs sur l'étagère. Deux gestes, deux
     * moments.
     */
    const confier = async (commande: Commande) => {
        const actifs = livreurs.filter((l) => l.is_active && l.removed_at === null);

        if (actifs.length === 0) {
            Swal.fire({
                icon: "info",
                title: "Aucun livreur",
                text: "Ajoutez vos livreurs depuis l'onglet « Livreurs » pour pouvoir les désigner.",
            });

            return;
        }

        const choix = await Swal.fire({
            title: `Confier ${commande.code}`,
            input: "select",
            inputOptions: Object.fromEntries(
                actifs.map((l) => [
                    String(l.user_id),
                    `${[l.prenom, l.nom].filter(Boolean).join(" ") || "Livreur"}${l.matricule ? ` · ${l.matricule}` : ""}`,
                ]),
            ),
            inputPlaceholder: "Choisissez un livreur",
            showCancelButton: true,
            confirmButtonText: "Confier",
            cancelButtonText: "Annuler",
        });

        if (!choix.isConfirmed || !choix.value) return;

        await agir("orders/assign-courier", { order_id: commande.id, courier_id: Number(choix.value) }, "Livreur désigné");
    };

    /**
     * Clore une livraison partie par les moyens du restaurant.
     *
     * Sans livreur Ongo, personne ne peut la marquer livrée : seule
     * l'application du livreur sait le faire, et il n'y en a pas. Elle resterait
     * « en route » pour toujours, sans la moindre écriture comptable.
     *
     * **Le code du client**, celui-là même que le livreur exige à la porte :
     * c'est lui qui le détient, et c'est la seule preuve que la commande est
     * arrivée. Sans lui, on solderait ses livraisons depuis son comptoir.
     */
    const confirmer = async (commande: Commande) => {
        const choix = await Swal.fire({
            title: `Livraison de ${commande.code}`,
            text: "Saisissez le code que le client vous communique.",
            input: "text",
            inputPlaceholder: "Code à 6 caractères",
            showCancelButton: true,
            confirmButtonText: "Confirmer",
            cancelButtonText: "Annuler",
        });

        if (!choix.isConfirmed) return;

        await agir("orders/confirm-delivery", { order_id: commande.id, code: choix.value }, "Livraison confirmée");
    };

    /**
     * Ce qui doit partir.
     *
     * Les prêtes, bien sûr — mais aussi celles qu'on prépare encore et dont la
     * course a été rendue : personne ne vient les chercher, et l'apprendre au
     * moment où le plat sort est trop tard. Le livreur doit partir **avant**
     * que le plat ne soit prêt.
     */
    const aFairePartir = (f: File): Commande[] => {
        const livraisons = (liste: Commande[]) => liste.filter((c) => c.dining_mode === "delivery");

        return [
            ...livraisons(f.preparing).filter((c) => c.courier_id === null && c.dispatch_stage === null),
            ...livraisons(f.ready),
        ];
    };

    const parties = (f: File): Commande[] => f.handed.filter((c) => c.dining_mode === "delivery");

    /** L'état du livreur, en clair, et le geste qui va avec. */
    const livreur = (commande: Commande) => {
        if (commande.courier_id !== null) {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Livreur en route
                </span>
            );
        }

        if (commande.dispatch_stage === null) {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Aucun livreur — la course a été rendue
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                Recherche en cours{commande.dispatch_stage === "merchant" ? " parmi les vôtres" : ""}…
            </span>
        );
    };

    const carte = (commande: Commande, enRoute: boolean) => {
        const attente = minutesDepuis(commande.created_at);

        /*
         * L'attente passe en rouge au-delà d'un quart d'heure.
         *
         * Ce n'est pas le délai promis au client — c'est le temps depuis la
         * commande, le seul que cette personne puisse comparer d'un coup d'œil
         * entre deux cartes.
         */
        const tarde = attente >= 15 && !enRoute;

        return (
            <div
                key={commande.public_id}
                className={`p-4 rounded-xl border ${
                    tarde
                        ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                        : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                }`}
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{commande.code}</p>
                        <p className="text-xs text-slate-500">
                            {commande.customer?.nom ?? "Client"} · {commande.total} F
                        </p>
                    </div>

                    <span className={`text-xs font-semibold ${tarde ? "text-amber-700 dark:text-amber-300" : "text-slate-400"}`}>
                        {attente} min
                    </span>
                </div>

                {commande.delivery_address && (
                    <p className="mt-2 text-xs text-slate-500 line-clamp-2">{commande.delivery_address}</p>
                )}

                <p className="mt-2 text-xs text-slate-500">
                    {commande.items.map((l) => `${l.quantity}× ${l.name}`).join(" · ")}
                </p>

                <div className="mt-3">{livreur(commande)}</div>

                <div className="mt-3 flex flex-wrap gap-2">
                    {commande.courier_id === null && commande.dispatch_stage === null && (
                        <button
                            onClick={() => agir("orders/dispatch", { order_id: commande.id }, "Recherche d'un livreur lancée")}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white"
                        >
                            Chercher un livreur
                        </button>
                    )}

                    {/* Tant que personne n'est désigné, qu'une recherche soit en
                        cours ou non : le restaurant peut toujours trancher
                        lui-même plutôt que d'attendre qu'un livreur réponde. */}
                    {commande.courier_id === null && (
                        <button
                            onClick={() => confier(commande)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200"
                        >
                            Confier à un livreur
                        </button>
                    )}

                    {commande.status === "ready" && (
                        <button
                            onClick={() => remettre(commande)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white dark:bg-slate-100"
                        >
                            Remettre
                        </button>
                    )}

                    {/* Partie sans livreur Ongo : c'est au restaurant de dire
                        qu'elle est arrivée. Avec un livreur, c'est à lui, dans
                        son écran — le règlement de sa course en dépend. */}
                    {commande.status === "picked_up" && commande.courier_id === null && (
                        <button
                            onClick={() => confirmer(commande)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white"
                        >
                            Confirmer la livraison
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const section = (titre: string, commandes: Commande[], vide: string, enRoute: boolean) => (
        <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {titre}
                <span className="ml-2 text-slate-400 font-normal">{commandes.length}</span>
            </h3>

            {commandes.length === 0 ? (
                <p className="text-xs text-slate-400">{vide}</p>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{commandes.map((c) => carte(c, enRoute))}</div>
            )}
        </section>
    );

    if (chargement) return <p className="text-slate-500">Chargement…</p>;

    if (!file) return <p className="text-slate-500">File indisponible.</p>;

    return (
        <div className="space-y-8">
            {section(
                "À faire partir",
                aFairePartir(file),
                "Rien n'attend de livreur.",
                false,
            )}

            {section(
                "Parties",
                parties(file),
                "Aucune livraison en route.",
                true,
            )}
        </div>
    );
}
