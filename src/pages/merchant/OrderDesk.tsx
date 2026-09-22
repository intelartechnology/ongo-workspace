import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";

/**
 * Le poste de commande.
 *
 * L'écran qui sert toute la journée, debout, en cuisine, souvent sur un
 * téléphone partagé. Gros boutons, un geste par action — à l'opposé du
 * catalogue, qu'on ouvre rarement et assis.
 *
 * Il se rafraîchit tout seul : personne ne pense à appuyer sur « actualiser »
 * quand il a les mains dans la farine.
 */

interface Ligne {
    id: number;
    name: string;
    quantity: number;
    line_total: number;
    note: string | null;
    status: string;
    replaced_by_name: string | null;
    options: { name: string; extra_price: number }[] | null;
}

interface Commande {
    id: number;
    public_id: string;
    code: string;
    status: string;
    dining_mode: string;
    total: number;
    subtotal: number;
    created_at: string;
    promised_at: string | null;
    prep_minutes: number | null;
    note: string | null;
    utensils_count: number;
    recipient_phone: string | null;
    change_for: number | null;
    payment_method: string;
    delivery_address: string | null;
    items: Ligne[];
    customer: { nom: string | null; telephone: string | null } | null;
}

interface File {
    store: { id: number; name: string; prep_minutes: number };
    is_paused: boolean;
    acceptance_delay_minutes: number;
    new: Commande[];
    preparing: Commande[];
    ready: Commande[];
    handed: Commande[];
}

interface OrderDeskProps {
    merchantId: string;
    storeId: number;
}

const francs = (montant: number) => `${(montant ?? 0).toLocaleString("fr-FR")} F`;

/** Les temps proposés à l'acceptation, comme chez Uber. */
const TEMPS = [10, 15, 20, 30, 45];

const MOTIFS: Record<string, string> = {
    closed: "Nous sommes fermés",
    out_of_stock: "Produit épuisé",
    too_busy: "Trop de commandes",
    other: "Autre raison",
};

export default function OrderDesk({ merchantId, storeId }: OrderDeskProps) {
    const [file, setFile] = useState<File | null>(null);
    const [chargement, setChargement] = useState<boolean>(true);
    const [ouverte, setOuverte] = useState<string | null>(null);

    const api = new ApiService();
    const sonJoue = useRef<Set<string>>(new Set());

    const base = `v3/merchant/${merchantId}/stores/${storeId}`;

    const charger = async (silencieux = false) => {
        if (!silencieux) setChargement(true);

        try {
            const { data } = await api.getData(`${base}/orders`);

            if (data.success) {
                const recue: File = data.data;

                // Une commande nouvelle ne doit pas passer inaperçue : le
                // bandeau ne suffit pas quand on a le dos tourné.
                recue.new.forEach((commande) => {
                    if (!sonJoue.current.has(commande.public_id)) {
                        sonJoue.current.add(commande.public_id);
                        avertir();
                    }
                });

                setFile(recue);
            }
        } catch (erreur) {
            if (!silencieux) Swal.fire({ icon: "warning", title: "File illisible", text: String(erreur) });
        }

        setChargement(false);
    };

    /** Un son bref, sans dépendance : l'API audio du navigateur suffit. */
    const avertir = () => {
        try {
            const contexte = new (window.AudioContext || (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const oscillateur = contexte.createOscillator();
            const volume = contexte.createGain();

            oscillateur.connect(volume);
            volume.connect(contexte.destination);
            oscillateur.frequency.value = 880;
            volume.gain.setValueAtTime(0.2, contexte.currentTime);
            volume.gain.exponentialRampToValueAtTime(0.01, contexte.currentTime + 0.6);

            oscillateur.start();
            oscillateur.stop(contexte.currentTime + 0.6);
        } catch {
            // Un navigateur qui refuse le son ne doit pas casser la file.
        }
    };

    useEffect(() => {
        charger();

        // Toutes les dix secondes : personne n'actualise une page quand il a
        // les mains dans la farine.
        const rythme = setInterval(() => charger(true), 10000);

        return () => clearInterval(rythme);
    }, [storeId]);

    const agir = async (chemin: string, corps: Record<string, unknown>, succes?: string) => {
        try {
            const { data } = await api.postData(`${base}/${chemin}`, corps);

            if (data.success) {
                await charger(true);

                if (succes) {
                    Swal.fire({ icon: "success", title: succes, timer: 1200, showConfirmButton: false });
                }
            } else {
                Swal.fire({ icon: "error", title: "Refusé", text: data.message });
            }
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Action impossible", text: String(erreur) });
        }
    };

    const accepter = async (commande: Commande) => {
        const choix = await Swal.fire({
            title: `Commande ${commande.code}`,
            text: "Dans combien de temps sera-t-elle prête ?",
            input: "select",
            inputOptions: Object.fromEntries(TEMPS.map((minutes) => [minutes, `${minutes} minutes`])),
            inputValue: String(file?.store.prep_minutes ?? 20),
            showCancelButton: true,
            confirmButtonText: "Accepter",
            cancelButtonText: "Annuler",
        });

        if (!choix.isConfirmed) return;

        await agir("orders/accept", { order_id: commande.id, prep_minutes: Number(choix.value) }, "Commande acceptée");
    };

    const refuser = async (commande: Commande) => {
        const choix = await Swal.fire({
            title: `Refuser ${commande.code} ?`,
            text: "Le client sera remboursé. Le motif est conservé.",
            input: "select",
            inputOptions: MOTIFS,
            showCancelButton: true,
            confirmButtonText: "Refuser",
            cancelButtonText: "Garder",
            confirmButtonColor: "#dc2626",
        });

        if (!choix.isConfirmed) return;

        await agir("orders/reject", { order_id: commande.id, reason: choix.value }, "Commande refusée");
    };

    const remettre = async (commande: Commande) => {
        const choix = await Swal.fire({
            title: `Remettre ${commande.code}`,
            text: "Saisissez le code présenté par le livreur ou le client.",
            input: "text",
            inputPlaceholder: "Code à 6 caractères",
            showCancelButton: true,
            confirmButtonText: "Remettre",
            cancelButtonText: "Annuler",
        });

        if (!choix.isConfirmed) return;

        await agir("orders/handover", { order_id: commande.id, code: choix.value }, "Commande remise");
    };

    const signalerRupture = async (commande: Commande, ligne: Ligne) => {
        const choix = await Swal.fire({
            title: `${ligne.name} manque`,
            input: "select",
            inputOptions: {
                refund: "Rembourser cette ligne",
                cancel: "Annuler toute la commande",
            },
            showCancelButton: true,
            confirmButtonText: "Confirmer",
            cancelButtonText: "Retour",
        });

        if (!choix.isConfirmed) return;

        await agir(
            "orders/item-unavailable",
            { order_id: commande.id, item_id: ligne.id, action: choix.value },
            "Commande modifiée"
        );
    };

    const mettreEnPause = async () => {
        if (file?.is_paused) {
            await agir("pause", { duration: "resume" }, "Réception reprise");

            return;
        }

        const choix = await Swal.fire({
            title: "Suspendre la réception",
            text: "Vos clients ne pourront plus commander. La pause se lève toute seule.",
            input: "select",
            inputOptions: { "30m": "30 minutes", "1h": "1 heure", today: "Jusqu'à ce soir", tomorrow: "Jusqu'à demain" },
            showCancelButton: true,
            confirmButtonText: "Suspendre",
            cancelButtonText: "Annuler",
        });

        if (!choix.isConfirmed) return;

        await agir("pause", { duration: choix.value }, "Réception suspendue");
    };

    /** Depuis combien de temps elle attend. */
    const attente = (commande: Commande): string => {
        const minutes = Math.floor((Date.now() - new Date(commande.created_at).getTime()) / 60000);

        return minutes < 1 ? "à l'instant" : `${minutes} min`;
    };

    const carte = (commande: Commande, actions: React.ReactNode) => {
        const deployee = ouverte === commande.public_id;
        const urgente = commande.status === "pending"
            && (Date.now() - new Date(commande.created_at).getTime()) / 60000 >= (file?.acceptance_delay_minutes ?? 5) - 2;

        return (
            <div
                key={commande.public_id}
                className={`rounded-xl border p-4 ${
                    urgente
                        ? "border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                        : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                }`}
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">{commande.code}</p>
                        <p className="text-xs text-slate-500">
                            {attente(commande)}
                            {commande.dining_mode === "pickup" ? " · à emporter" : ""}
                            {commande.payment_method === "cash" ? " · espèces" : ""}
                        </p>
                    </div>

                    <p className="font-semibold text-slate-900 dark:text-white">{francs(commande.total)}</p>
                </div>

                <button
                    onClick={() => setOuverte(deployee ? null : commande.public_id)}
                    className="mt-3 text-sm text-slate-600 dark:text-slate-300 underline"
                >
                    {commande.items.length} article{commande.items.length > 1 ? "s" : ""}
                    {deployee ? " — replier" : " — voir"}
                </button>

                {deployee && (
                    <div className="mt-3 space-y-2">
                        {commande.items.map((ligne) => (
                            <div key={ligne.id} className="flex items-start justify-between gap-3 text-sm">
                                <div className="min-w-0">
                                    <p className={`text-slate-900 dark:text-white ${ligne.status !== "ok" ? "line-through opacity-60" : ""}`}>
                                        {ligne.quantity} × {ligne.name}
                                    </p>

                                    {(ligne.options ?? []).map((option, rang) => (
                                        <p key={rang} className="text-xs text-slate-500 ml-4">+ {option.name}</p>
                                    ))}

                                    {ligne.note && <p className="text-xs text-amber-700 dark:text-amber-400 ml-4">« {ligne.note} »</p>}
                                    {ligne.replaced_by_name && (
                                        <p className="text-xs text-sky-700 dark:text-sky-400 ml-4">remplacé par {ligne.replaced_by_name}</p>
                                    )}
                                </div>

                                {["accepted", "preparing"].includes(commande.status) && ligne.status === "ok" && (
                                    <button
                                        onClick={() => signalerRupture(commande, ligne)}
                                        className="text-xs text-red-600 dark:text-red-400 shrink-0 underline"
                                    >
                                        manque
                                    </button>
                                )}
                            </div>
                        ))}

                        {commande.utensils_count > 0 && (
                            <p className="text-xs text-slate-500">Couverts : {commande.utensils_count}</p>
                        )}

                        {commande.note && (
                            <p className="text-sm text-amber-700 dark:text-amber-400">Note : {commande.note}</p>
                        )}

                        {commande.change_for && (
                            <p className="text-sm text-emerald-700 dark:text-emerald-400">
                                Prévoir la monnaie sur {francs(commande.change_for)}
                            </p>
                        )}

                        {commande.customer && (
                            <p className="text-xs text-slate-500">
                                {commande.customer.nom} · {commande.recipient_phone ?? commande.customer.telephone}
                            </p>
                        )}
                    </div>
                )}

                <div className="mt-4 flex gap-2">{actions}</div>
            </div>
        );
    };

    const bouton = (texte: string, onClick: () => void, variante: "primaire" | "secondaire" | "danger" = "primaire") => (
        <button
            onClick={onClick}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold ${
                variante === "primaire"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : variante === "danger"
                        ? "border border-red-300 text-red-600 dark:border-red-800 dark:text-red-400"
                        : "border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300"
            }`}
        >
            {texte}
        </button>
    );

    const colonne = (titre: string, commandes: Commande[], rendu: (commande: Commande) => React.ReactNode) => (
        <div className="flex-1 min-w-[260px]">
            <h3 className="text-sm font-bold uppercase text-slate-500 mb-3">
                {titre} <span className="text-slate-400">({commandes.length})</span>
            </h3>

            <div className="space-y-3">
                {commandes.length === 0
                    ? <p className="text-sm text-slate-400">—</p>
                    : commandes.map(rendu)}
            </div>
        </div>
    );

    if (chargement || !file) {
        return <p className="text-slate-500">Chargement de la file…</p>;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-slate-500">
                    Réponse attendue en {file.acceptance_delay_minutes} min. Passé ce délai, la commande s'annule et le
                    client est remboursé.
                </p>

                <button
                    onClick={mettreEnPause}
                    className={`px-4 py-2 rounded-lg text-sm font-medium shrink-0 ${
                        file.is_paused
                            ? "bg-emerald-600 text-white"
                            : "border border-amber-400 text-amber-700 dark:text-amber-400"
                    }`}
                >
                    {file.is_paused ? "Reprendre la réception" : "Suspendre la réception"}
                </button>
            </div>

            {file.is_paused && (
                <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-300 dark:bg-amber-950/30 dark:border-amber-800">
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                        Réception suspendue. Vos clients ne peuvent pas commander.
                    </p>
                </div>
            )}

            <div className="flex flex-wrap gap-6">
                {colonne("Nouvelles", file.new, (commande) => carte(commande, (
                    <>
                        {bouton("Accepter", () => accepter(commande))}
                        {bouton("Refuser", () => refuser(commande), "danger")}
                    </>
                )))}

                {colonne("En préparation", file.preparing, (commande) => carte(commande, (
                    <>
                        {commande.status === "accepted"
                            && bouton("Commencer", () => agir("orders/advance", { order_id: commande.id, to: "preparing" }), "secondaire")}
                        {bouton("Prête", () => agir("orders/advance", { order_id: commande.id, to: "ready" }))}
                    </>
                )))}

                {colonne("Prêtes", file.ready, (commande) => carte(commande, bouton("Remettre", () => remettre(commande))))}

                {colonne("Remises", file.handed, (commande) => carte(commande, (
                    <p className="text-sm text-slate-500">En route</p>
                )))}
            </div>
        </div>
    );
}
