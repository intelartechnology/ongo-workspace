import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Plus, Trash2 } from "lucide-react";
import ApiService from "../../services/ApiService";
import Loading from "../../components/Loading";

/**
 * Les remboursements : les conditions de l'agence, et les demandes
 * d'annulation de ses voyageurs.
 *
 * Avec des conditions, le voyageur qui annule dans les délais est remboursé
 * tout seul, le montant étant repris sur le portefeuille de l'agence. Sans
 * conditions, chaque annulation arrive ici comme une demande à accepter ou à
 * refuser. Les frais de service d'Ongo ne sont jamais rendus.
 */

interface Palier { hours: string; percent: string }
interface Demande {
    code: string;
    seats: number;
    amount: number;
    requested_at: string | null;
    request_note: string | null;
    passengers: { full_name: string }[];
    outbound: { class: string; boarding: { name: string; passes_at: string } } | null;
}

const francs = (n: number) => `${(n ?? 0).toLocaleString("fr-FR")} F`;

export default function TransportRefunds({ operatorId }: { operatorId: string }) {
    const base = `v3/transport/${operatorId}`;
    const [paliers, setPaliers] = useState<Palier[] | null>(null);
    const [demandes, setDemandes] = useState<Demande[]>([]);
    const [pourcents, setPourcents] = useState<Record<string, string>>({});

    const charger = async () => {
        try {
            const [c, d] = await Promise.all([new ApiService().getData(`${base}/refund-policy`), new ApiService().getData(`${base}/cancel-requests`)]);
            if (c.data.success) setPaliers(c.data.data.tiers.map((t: { hours: number; percent: number }) => ({ hours: String(t.hours), percent: String(t.percent) })));
            if (d.data.success) setDemandes(d.data.data);
        } catch {
            toast.error("Connexion au serveur impossible");
        }
    };

    useEffect(() => { charger(); }, [operatorId]); // eslint-disable-line react-hooks/exhaustive-deps

    const enregistrer = async (liste: Palier[]) => {
        const { data } = await new ApiService().postData(`${base}/refund-policy`, { tiers: liste.map((p) => ({ hours: Number(p.hours), percent: Number(p.percent) })) });
        if (data.success) { toast.success(data.message); charger(); } else toast.error(data.message);
    };

    const trancher = async (d: Demande, accepter: boolean) => {
        const pourcent = Number(pourcents[d.code] ?? "100");
        const note = accepter ? null : window.prompt("Motif du refus (le voyageur le verra)") ;
        if (!accepter && note === null) return;
        const { data } = await new ApiService().postData(`${base}/cancel-requests/${d.code}/${accepter ? "accept" : "refuse"}`, accepter ? { percent: pourcent } : { note });
        if (data.success) { toast.success(data.message); charger(); } else toast.error(data.message);
    };

    if (!paliers) return <Loading />;

    const changer = (i: number, cle: keyof Palier, v: string) => setPaliers((l) => (l ?? []).map((p, j) => (j === i ? { ...p, [cle]: v.replace(/[^\d]/g, "") } : p)));

    return (
        <div className="grid gap-4 lg:grid-cols-2 items-start">
            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4">
                <div>
                    <p className="font-bold">Conditions de remboursement</p>
                    <p className="text-sm text-slate-500 mt-1">
                        Le voyageur qui annule dans les délais est remboursé automatiquement, sur votre portefeuille. Passé le dernier palier, le billet n'est plus remboursable. Les frais de service d'Ongo ne sont jamais rendus.
                    </p>
                </div>

                {paliers.length === 0 ? (
                    <p className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-sm text-amber-800 dark:text-amber-300">
                        Aucune condition : chaque annulation vous est envoyée comme une demande, à accepter ou à refuser ci-contre.
                    </p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {paliers.map((p, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                <span className="text-slate-500 w-20">{i === 0 ? "Plus de" : "De"}</span>
                                <input value={p.hours} onChange={(e) => changer(i, "hours", e.target.value)} inputMode="numeric" className="w-16 h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center" />
                                <span className="text-slate-500">h avant le départ :</span>
                                <input value={p.percent} onChange={(e) => changer(i, "percent", e.target.value)} inputMode="numeric" className="w-16 h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center" />
                                <span className="text-slate-500">% remboursé</span>
                                <button onClick={() => setPaliers(paliers.filter((_, j) => j !== i))} aria-label="Retirer ce palier" className="ml-auto text-slate-400 hover:text-red-600"><Trash2 className="size-4" /></button>
                            </div>
                        ))}
                        <p className="text-xs text-slate-400">Moins que le dernier délai : rien n'est remboursé.</p>
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    {paliers.length < 3 && (
                        <button onClick={() => setPaliers([...paliers, { hours: paliers.length === 0 ? "24" : "2", percent: paliers.length === 0 ? "100" : "50" }])} className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-semibold flex items-center gap-1.5">
                            <Plus className="size-4" /> Ajouter un palier
                        </button>
                    )}
                    <button onClick={() => enregistrer(paliers)} className="ml-auto h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold dark:bg-primary-container">Enregistrer</button>
                </div>
            </section>

            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <p className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 font-bold">Demandes d'annulation <span className="text-slate-400 font-medium">({demandes.length})</span></p>
                {demandes.length === 0 ? (
                    <p className="p-8 text-center text-sm text-slate-500">Aucune demande en attente.</p>
                ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                        {demandes.map((d) => (
                            <li key={d.code} className="p-4 flex flex-col gap-2">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-semibold">{d.code} · {d.passengers.map((v) => v.full_name).join(", ")}</p>
                                        <p className="text-xs text-slate-500">{d.outbound ? `${d.outbound.class} · ${d.outbound.boarding.name} · ${d.outbound.boarding.passes_at}` : ""} · demandé le {d.requested_at}</p>
                                        {d.request_note && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">« {d.request_note} »</p>}
                                    </div>
                                    <p className="font-bold whitespace-nowrap">{francs(d.amount)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input value={pourcents[d.code] ?? "100"} onChange={(e) => setPourcents((p) => ({ ...p, [d.code]: e.target.value.replace(/[^\d]/g, "") }))} inputMode="numeric" className="w-16 h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center text-sm" />
                                    <span className="text-sm text-slate-500">% remboursé</span>
                                    <button onClick={() => trancher(d, false)} className="ml-auto h-9 px-3 rounded-lg border border-red-200 dark:border-red-900 text-red-600 text-sm font-semibold">Refuser</button>
                                    <button onClick={() => trancher(d, true)} className="h-9 px-3 rounded-lg bg-primary text-white text-sm font-bold dark:bg-primary-container">Accepter</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
