import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ApiService from "../../services/ApiService";
import { francs } from "./ticketDeCaisse";

/**
 * Les commandes de table payées en espèces, à valider quand l'argent est
 * reçu.
 *
 * Le serveur encaisse à table. Le caissier valide quand il rapporte
 * l'argent, ou le serveur valide lui-même depuis son téléphone : la même
 * liste, qui tient sur un écran de téléphone.
 */

interface Commande {
    id: number;
    code: string;
    table: string | null;
    status: string;
    total: number;
    created_at: string;
    delivered_at: string | null;
    items: { name: string; quantity: number }[];
    settled_at: string | null;
    settled_by: string | null;
    received: number | null;
}

const ETAPES: Record<string, string> = {
    pending: "en attente du restaurant",
    accepted: "acceptée",
    preparing: "en préparation",
    ready: "prête",
    delivered: "servie",
};

const heure = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "");

interface Props {
    merchantId: string;
    storeId: number;
    /** Le nombre en attente, pour la pastille du menu. */
    onCompte?: (n: number) => void;
}

export default function TablesAEncaisser({ merchantId, storeId, onCompte }: Props) {
    const base = `v3/merchant/${merchantId}/stores/${storeId}`;
    const [enAttente, setEnAttente] = useState<Commande[] | null>(null);
    const [encaissees, setEncaissees] = useState<Commande[]>([]);
    const [recus, setRecus] = useState<Record<number, string>>({});
    const [envoi, setEnvoi] = useState<number | null>(null);

    const charger = async () => {
        try {
            const { data } = await new ApiService().getData(`${base}/tables/to-settle`);
            if (data.success) {
                setEnAttente(data.data.pending);
                setEncaissees(data.data.settled);
                onCompte?.(data.data.pending.length);
            }
        } catch {
            // La liste se rechargera au prochain passage.
        }
    };

    useEffect(() => {
        charger();
        const rythme = setInterval(charger, 15000);
        return () => clearInterval(rythme);
    }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

    const valider = async (c: Commande) => {
        const saisi = (recus[c.id] ?? "").replace(/\s/g, "");
        const recu = saisi === "" ? null : Number(saisi);

        if (recu !== null && recu < c.total) {
            toast.error("La somme reçue est inférieure au total");
            return;
        }

        setEnvoi(c.id);
        try {
            const { data } = await new ApiService().postData(`${base}/tables/settle`, { order_id: c.id, amount_received: recu });
            if (data.success) {
                toast.success(`${c.table ?? "Table"} : paiement validé${data.data.change ? ` · rendre ${francs(data.data.change)}` : ""}`);
                await charger();
            } else toast.error(data.message || "Refusé");
        } catch {
            toast.error("Connexion au serveur impossible");
        } finally {
            setEnvoi(null);
        }
    };

    if (enAttente === null) return <p className="text-sm text-slate-400 py-6 text-center">Chargement…</p>;

    return (
        <div className="space-y-3">
            <p className="text-xs text-slate-500">Commandes passées depuis une table avec l'application, à payer en espèces. Validez quand l'argent est reçu.</p>

            {enAttente.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Aucune table à encaisser.</p>}

            {enAttente.map((c, rang) => {
                const saisi = (recus[c.id] ?? "").replace(/\s/g, "");
                const monnaie = saisi === "" ? null : Number(saisi) - c.total;
                return (
                    <div key={c.id} className={`rounded-2xl bg-white dark:bg-slate-900 p-4 ${rang === 0 ? "border-2 border-primary dark:border-primary-fixed-dim" : "border border-slate-200 dark:border-slate-800"}`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="font-bold text-[17px] text-slate-900 dark:text-white">{c.table ?? "Sur place"}</p>
                                <p className="text-xs text-slate-500">{c.code} · {c.status === "delivered" ? `servie à ${heure(c.delivered_at)}` : ETAPES[c.status] ?? c.status}</p>
                            </div>
                            <p className="text-[20px] font-black tabular-nums text-slate-900 dark:text-white whitespace-nowrap">{francs(c.total)}</p>
                        </div>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{c.items.map((l) => `${l.quantity} × ${l.name}`).join(" · ")}</p>
                        <label className="block mt-3 text-xs font-semibold text-slate-500" htmlFor={`recu-${c.id}`}>Somme reçue (facultatif)</label>
                        <div className="mt-1 flex items-center gap-2">
                            <input
                                id={`recu-${c.id}`}
                                inputMode="numeric"
                                value={recus[c.id] ?? ""}
                                onChange={(e) => setRecus((r) => ({ ...r, [c.id]: e.target.value.replace(/[^\d\s]/g, "") }))}
                                placeholder={String(c.total)}
                                className="flex-1 min-w-0 h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[15px] outline-none focus:border-primary"
                            />
                            {monnaie !== null && (
                                <span className={`text-sm font-semibold whitespace-nowrap ${monnaie < 0 ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"}`}>
                                    {monnaie < 0 ? `Manque ${francs(-monnaie)}` : `Rendre ${francs(monnaie)}`}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => valider(c)}
                            disabled={envoi === c.id || (monnaie !== null && monnaie < 0)}
                            className="mt-3 w-full h-12 rounded-xl bg-primary text-white font-bold dark:bg-primary-container disabled:opacity-40"
                        >
                            {envoi === c.id ? "Validation…" : "Valider le paiement"}
                        </button>
                    </div>
                );
            })}

            {encaissees.length > 0 && (
                <div className="pt-2 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Encaissées aujourd'hui</p>
                    {encaissees.map((c) => (
                        <div key={c.id} className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
                            {c.table ?? "Sur place"} · {francs(c.total)} · validée{c.settled_by ? ` par ${c.settled_by}` : ""} à {heure(c.settled_at)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
