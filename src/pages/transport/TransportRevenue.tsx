import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ArrowDownLeft, ArrowUpRight, RotateCcw, Wallet } from "lucide-react";
import ApiService from "../../services/ApiService";
import Loading from "../../components/Loading";

/**
 * L'argent de l'agence : le prix de chaque billet arrive sur son portefeuille
 * dès la confirmation, et elle le retire vers son mobile money quand elle veut.
 *
 * Un remboursement est repris sur ce solde. S'il passe en négatif — l'agence
 * avait déjà retiré —, il se comble avec les ventes suivantes, et le retrait
 * attend.
 */

interface Mouvement { kind: "sale" | "refund" | "withdrawal"; amount: number; label: string; created_at: string }
interface Portefeuille {
    balance: number;
    can_withdraw: boolean;
    payout_account: string | null;
    payout_holder: string;
    operators: { code: number; name: string }[];
    month: { sales: number; refunds: number; withdrawals: number };
    movements: Mouvement[];
}

const francs = (n: number) => `${(n ?? 0).toLocaleString("fr-FR")} F`;

const NATURE: Record<Mouvement["kind"], { libelle: string; icone: typeof Wallet; couleur: string }> = {
    sale: { libelle: "Vente", icone: ArrowDownLeft, couleur: "text-emerald-600" },
    refund: { libelle: "Remboursement", icone: RotateCcw, couleur: "text-amber-600" },
    withdrawal: { libelle: "Retrait", icone: ArrowUpRight, couleur: "text-slate-500" },
};

export default function TransportRevenue({ operatorId }: { operatorId: string }) {
    const base = `v3/transport/${operatorId}`;
    const [p, setP] = useState<Portefeuille | null>(null);
    const [numero, setNumero] = useState("");
    const [titulaire, setTitulaire] = useState("");
    const [montant, setMontant] = useState("");
    const [operateur, setOperateur] = useState<number | null>(null);
    const [envoi, setEnvoi] = useState(false);

    const charger = async () => {
        try {
            const { data } = await new ApiService().getData(`${base}/wallet`);
            if (data.success) {
                setP(data.data);
                setNumero(data.data.payout_account ?? "");
                setTitulaire(data.data.payout_holder ?? "");
                setOperateur((o) => o ?? data.data.operators?.[0]?.code ?? null);
            } else toast.error(data.message || "Portefeuille illisible");
        } catch {
            toast.error("Connexion au serveur impossible");
        }
    };

    useEffect(() => { charger(); }, [operatorId]); // eslint-disable-line react-hooks/exhaustive-deps

    const enregistrerNumero = async (e: React.FormEvent) => {
        e.preventDefault();
        const { data } = await new ApiService().postData(`${base}/wallet/payout`, { payout_account: numero, payout_holder: titulaire });
        if (data.success) { toast.success(data.message); charger(); } else toast.error(data.message);
    };

    const retirer = async (e: React.FormEvent) => {
        e.preventDefault();
        const somme = Number(montant.replace(/\s/g, ""));
        if (!somme || !p) return;
        if (!window.confirm(`Retirer ${francs(somme)} vers ${p.payout_account} ?`)) return;
        setEnvoi(true);
        try {
            const { data } = await new ApiService().postData(`${base}/wallet/withdraw`, { amount: somme, operator: operateur });
            if (data.success) { toast.success(data.message || "Retrait envoyé"); setMontant(""); charger(); } else toast.error(data.message || "Retrait refusé");
        } catch {
            toast.error("Connexion au serveur impossible");
        } finally {
            setEnvoi(false);
        }
    };

    if (!p) return <Loading />;

    const negatif = p.balance < 0;

    return (
        <div className="grid gap-4 lg:grid-cols-[1fr_380px] items-start">
            <div className="flex flex-col gap-4 min-w-0">
                <div className="grid gap-3 sm:grid-cols-4">
                    <div className="sm:col-span-4 lg:col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Solde</p>
                        <p className={`text-2xl font-black tabular-nums ${negatif ? "text-red-600" : "text-slate-900 dark:text-white"}`}>{francs(p.balance)}</p>
                    </div>
                    {([["Ventes du mois", p.month.sales], ["Remboursé ce mois", p.month.refunds], ["Retiré ce mois", p.month.withdrawals]] as const).map(([l, v]) => (
                        <div key={l} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{l}</p>
                            <p className="text-xl font-bold tabular-nums">{francs(v)}</p>
                        </div>
                    ))}
                </div>

                {negatif && (
                    <p className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
                        Solde négatif : des remboursements ont été repris après votre dernier retrait. Il se comble avec vos prochaines ventes ; le retrait attend jusque-là.
                    </p>
                )}

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 font-bold text-sm">Mouvements</p>
                    {p.movements.length === 0 ? (
                        <p className="p-8 text-center text-sm text-slate-500">Aucun mouvement. Le prix de chaque billet vendu en ligne arrivera ici.</p>
                    ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                            {p.movements.map((m, i) => {
                                const n = NATURE[m.kind];
                                return (
                                    <li key={i} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                                        <n.icone className={`size-4 shrink-0 ${n.couleur}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="truncate">{m.label}</p>
                                            <p className="text-xs text-slate-400">{n.libelle} · {new Date(m.created_at.replace(" ", "T")).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                        <span className={`font-semibold tabular-nums whitespace-nowrap ${m.amount >= 0 ? "text-emerald-600" : "text-slate-700 dark:text-slate-300"}`}>
                                            {m.amount >= 0 ? "+" : "−"}{francs(Math.abs(m.amount))}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {p.can_withdraw ? (
                    <>
                        <form onSubmit={retirer} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
                            <p className="font-bold">Retirer vers votre mobile money</p>
                            {!p.payout_account ? (
                                <p className="text-sm text-slate-500">Indiquez d'abord votre numéro de mobile money ci-dessous.</p>
                            ) : (
                                <>
                                    <p className="text-sm text-slate-500">Vers <strong className="text-slate-800 dark:text-slate-200">{p.payout_account}</strong> · {p.payout_holder}</p>
                                    <div className="flex gap-2">
                                        {p.operators.map((o) => (
                                            <button type="button" key={o.code} onClick={() => setOperateur(o.code)} className={`flex-1 h-10 rounded-lg border text-sm font-semibold ${operateur === o.code ? "border-primary bg-primary/5 text-primary" : "border-slate-200 dark:border-slate-700"}`}>{o.name}</button>
                                        ))}
                                    </div>
                                    <input inputMode="numeric" value={montant} onChange={(e) => setMontant(e.target.value.replace(/[^\d\s]/g, ""))} placeholder="Montant" className="h-11 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                                    <button type="submit" disabled={envoi || negatif || !montant} className="h-11 rounded-lg bg-primary text-white font-bold dark:bg-primary-container disabled:opacity-40">{envoi ? "Envoi…" : "Retirer"}</button>
                                </>
                            )}
                        </form>
                        <form onSubmit={enregistrerNumero} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
                            <p className="font-bold">Votre mobile money</p>
                            <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="6XX XX XX XX" className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                            <input value={titulaire} onChange={(e) => setTitulaire(e.target.value)} placeholder="Nom du titulaire" className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
                            <button type="submit" className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-semibold">Enregistrer</button>
                        </form>
                    </>
                ) : (
                    <p className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-500">Seul le propriétaire de l'agence retire l'argent et choisit le mobile money.</p>
                )}
            </div>
        </div>
    );
}
