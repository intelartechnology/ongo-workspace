import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import ApiService from "../../../services/ApiService";
import Loading from "../../../components/Loading";
import { Button, DateField } from "../../../components/ui";

interface Props {
    partnerId: string;
    /** Un partenariat suspendu interdit le retrait. */
    actif: boolean;
    role: string;
}

const entete = "px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500";

const francs = (v: number | null | undefined): string =>
    v == null ? "—" : `${Number(v).toLocaleString("fr-FR")} FCFA`;

const quand = (v?: string | null): string => {
    if (!v) return "—";
    const d = new Date(v);
    return Number.isNaN(d.getTime())
        ? "—"
        : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
        + " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};

const STATUTS: Record<string, { libelle: string; classe: string }> = {
    verified: { libelle: "Validée", classe: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400" },
    pending: { libelle: "En attente", classe: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400" },
    failed: { libelle: "Échouée", classe: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400" },
};

/**
 * Le portefeuille du partenaire.
 *
 * Le solde affiché est celui du **compte propriétaire** : il n'y a pas de
 * porte-monnaie propre au partenariat, et en créer un dédoublerait la vérité
 * sur une même somme.
 *
 * Seules les écritures validées entrent dans le solde — une écriture en
 * attente apparaît dans l'historique mais n'est pas encore comptée. C'est dit
 * à l'écran, faute de quoi l'écart entre la somme des lignes et le solde
 * passerait pour une erreur.
 */
const PartnerWallet: React.FC<Props> = ({ partnerId, actif, role }) => {
    const api = new ApiService();

    const [solde, setSolde] = useState<number | null>(null);
    const [titulaire, setTitulaire] = useState<any>(null);
    const [lignes, setLignes] = useState<any[]>([]);
    const [pagination, setPagination] = useState<any[]>([]);
    const [chargement, setChargement] = useState(true);
    const [erreur, setErreur] = useState<string | null>(null);
    const [du, setDu] = useState("");
    const [au, setAu] = useState("");

    const charger = async (url?: string) => {
        setChargement(true);
        setErreur(null);
        try {
            const { data } = url
                ? await api.getDatawithPagination(url, true)
                : await api.getData(`v3/partner/${partnerId}/wallet`, {
                    ...(du ? { du } : {}),
                    ...(au ? { au } : {}),
                });

            if (data.success) {
                setSolde(data.data?.solde ?? null);
                setTitulaire(data.data?.titulaire ?? null);
                setLignes(data.data?.data ?? []);
                setPagination(data.data?.links ?? []);
            } else {
                setErreur(data.message || "Portefeuille indisponible");
            }
        } catch (e: any) {
            setErreur(e?.response?.status === 403
                ? "Le portefeuille est réservé au propriétaire."
                : "Connexion au serveur impossible.");
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => { charger(); }, [partnerId]);

    const retirer = async () => {
        const disponible = solde ?? 0;

        if (disponible < 500) {
            toast.error("Solde insuffisant : le retrait minimum est de 500 FCFA.");
            return;
        }

        const saisie = await Swal.fire({
            title: "Demander un retrait",
            html:
                `<p style="font-size:13px;color:#64748b;margin-bottom:12px">Disponible : <b>${disponible.toLocaleString("fr-FR")} FCFA</b></p>` +
                `<input id="montant" type="number" class="swal2-input" placeholder="Montant en FCFA" min="500" max="${disponible}">` +
                `<input id="numero" type="tel" class="swal2-input" placeholder="Numéro à créditer" value="${titulaire?.telephone ?? ""}">` +
                `<select id="mode" class="swal2-input"><option value="OM">Orange Money</option><option value="MOMO">MTN Mobile Money</option></select>`,
            showCancelButton: true,
            confirmButtonText: "Demander",
            cancelButtonText: "Annuler",
            preConfirm: () => {
                const montant = Number((document.getElementById("montant") as HTMLInputElement)?.value);
                const numero = (document.getElementById("numero") as HTMLInputElement)?.value?.trim();
                const mode = (document.getElementById("mode") as HTMLSelectElement)?.value;

                if (!montant || montant < 500) { Swal.showValidationMessage("Montant minimum : 500 FCFA"); return false; }
                if (montant > disponible) { Swal.showValidationMessage("Montant supérieur au solde disponible"); return false; }
                if (!numero) { Swal.showValidationMessage("Indiquez le numéro à créditer"); return false; }

                return { montant, numero, mode };
            },
        });

        if (!saisie.isConfirmed || !saisie.value) return;

        try {
            const { data } = await api.postData(`v3/partner/${partnerId}/wallet/withdraw`, {
                amount: saisie.value.montant,
                receiver_phone: saisie.value.numero,
                mode: saisie.value.mode,
            });

            if (data.success) {
                toast.success("Demande de retrait enregistrée");
                charger();
            } else {
                toast.error(data.message || "Retrait refusé");
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Connexion au serveur impossible");
        }
    };

    if (erreur) {
        return (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700">account_balance_wallet</span>
                <p className="text-sm text-slate-500 max-w-sm">{erreur}</p>
                <Button icon="refresh" onClick={() => charger()}>Réessayer</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5">
            <div className="bg-primary text-white p-6 rounded-2xl shadow-sm flex flex-wrap items-end gap-6">
                <div className="mr-auto">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Solde disponible</p>
                    <p className="text-4xl font-black mt-1 tabular-nums">
                        {chargement ? "…" : francs(solde)}
                    </p>
                    {titulaire && (
                        <p className="text-[11px] text-white/70 mt-1">
                            Compte de {titulaire.nom || "—"} · {titulaire.telephone}
                        </p>
                    )}
                </div>
                {role === "owner" && (
                    <Button
                        icon="payments"
                        disabled={!actif || (solde ?? 0) < 500}
                        title={!actif ? "Partenariat suspendu" : (solde ?? 0) < 500 ? "Solde insuffisant" : undefined}
                        onClick={retirer}
                        className="bg-white text-primary border-white hover:bg-white/90 hover:text-primary"
                    >
                        Retirer
                    </Button>
                )}
            </div>

            {/* L'ecart entre la somme des lignes et le solde n'est pas une
                erreur : une ecriture en attente ne compte pas encore. */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                <span className="material-symbols-outlined text-[20px] shrink-0">info</span>
                <p className="text-xs font-semibold leading-relaxed">
                    Seules les écritures validées entrent dans le solde. Une ligne « en attente » apparaît ci-dessous mais n'est pas encore comptée.
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-end gap-3">
                <DateField size="sm" label="Du" value={du} onChange={(e) => setDu(e.target.value)} />
                <DateField size="sm" label="Au" value={au} onChange={(e) => setAu(e.target.value)} />
                <Button icon="filter_list" onClick={() => charger()}>Filtrer</Button>
                {(du || au) && (
                    <Button variant="ghost" icon="filter_alt_off" onClick={() => { setDu(""); setAu(""); }}>
                        Réinitialiser
                    </Button>
                )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[720px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <th className={entete}>Date</th>
                                <th className={entete}>Libellé</th>
                                <th className={entete}>Référence</th>
                                <th className={entete}>Statut</th>
                                <th className={`${entete} text-right`}>Montant</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {chargement ? (
                                <tr><td colSpan={5} className="py-10"><Loading /></td></tr>
                            ) : lignes.length === 0 ? (
                                <tr><td colSpan={5} className="py-12 text-center text-sm text-slate-500">Aucune écriture sur cette période.</td></tr>
                            ) : lignes.map((l: any) => {
                                const st = STATUTS[l.statut] ?? { libelle: l.statut || "—", classe: "bg-slate-100 dark:bg-slate-800 text-slate-500" };
                                const entree = l.sens === "entree";
                                return (
                                    <tr key={l.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{quand(l.date)}</td>
                                        <td className="px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 max-w-xs">
                                            <span className="line-clamp-1">{l.description || l.service || "—"}</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-[11px] font-mono text-slate-400">{l.reference || "—"}</td>
                                        <td className="px-4 py-2.5">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${st.classe}`}>
                                                {st.libelle}
                                            </span>
                                        </td>
                                        <td className={`px-4 py-2.5 text-right text-sm font-bold tabular-nums whitespace-nowrap ${entree ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                            {entree ? "+" : ""}{francs(l.montant)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {pagination.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-1 justify-end">
                        {pagination.map((lien: any, i: number) => (
                            <button
                                key={i}
                                disabled={!lien.url || lien.active}
                                onClick={() => lien.url && charger(lien.url)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium ${lien.active
                                    ? "bg-primary text-white font-bold"
                                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"} ${!lien.url ? "opacity-50 cursor-not-allowed" : ""}`}
                                dangerouslySetInnerHTML={{ __html: lien.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PartnerWallet;
