import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ApiService from "../../../services/ApiService";
import Loading from "../../../components/Loading";
import { Button, Select, DateField } from "../../../components/ui";

interface Props { partnerId: string }

const entete = "px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500";

const francs = (v: number | null | undefined): string =>
    v == null ? "—" : `${Number(v).toLocaleString("fr-FR")} FCFA`;

const quand = (d?: string | null, h?: string | null): string => {
    if (!d) return "—";
    const dt = new Date(d);
    const jour = Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    return h ? `${jour} · ${h}` : jour;
};

const STATUTS: Record<string, string> = {
    TERMINEE: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400",
    ANNULEE: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400",
};

/**
 * Les courses réalisées par les chauffeurs du partenaire.
 *
 * La commission affichée par ligne est celle **figée au moment de la
 * course**, renvoyée par le serveur. L'écran ne la recalcule pas depuis le
 * taux courant : un taux ajusté en cours de mois réécrirait alors des
 * montants déjà dus, et le total ne correspondrait plus à ce qui a été versé.
 */
const PartnerRides: React.FC<Props> = ({ partnerId }) => {
    const api = new ApiService();

    const [lignes, setLignes] = useState<any[]>([]);
    const [pagination, setPagination] = useState<any[]>([]);
    const [chauffeurs, setChauffeurs] = useState<any[]>([]);
    const [chargement, setChargement] = useState(true);

    const [chauffeur, setChauffeur] = useState("");
    const [statut, setStatut] = useState("");
    const [du, setDu] = useState("");
    const [au, setAu] = useState("");

    const charger = async (url?: string) => {
        setChargement(true);
        try {
            const { data } = url
                ? await api.getDatawithPagination(url, true)
                : await api.getData(`v3/partner/${partnerId}/courses`, {
                    ...(chauffeur ? { driver_id: chauffeur } : {}),
                    ...(statut ? { statut } : {}),
                    ...(du ? { du } : {}),
                    ...(au ? { au } : {}),
                });

            if (data.success) {
                setLignes(data.data?.data ?? []);
                setPagination(data.data?.links ?? []);
            } else {
                toast.error(data.message || "Chargement impossible");
            }
        } catch (e: any) {
            toast.error(e?.response?.status === 403 ? "Accès refusé" : "Connexion au serveur impossible");
        } finally {
            setChargement(false);
        }
    };

    // La liste des chauffeurs sert uniquement à remplir le filtre ; son échec
    // ne doit pas empêcher de consulter les courses.
    const chargerChauffeurs = async () => {
        try {
            const { data } = await api.getData(`v3/partner/${partnerId}/drivers`, { per_page: "all" });
            if (data.success) setChauffeurs(data.data?.data ?? []);
        } catch { /* le filtre restera vide */ }
    };

    useEffect(() => { charger(); chargerChauffeurs(); }, [partnerId]);

    return (
        <div className="flex flex-col gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-end gap-3">
                <Select size="sm" value={chauffeur} onChange={(e) => setChauffeur(e.target.value)}>
                    <option value="">Tous les chauffeurs</option>
                    {chauffeurs.map((c: any) => (
                        <option key={c.id} value={c.id}>{[c.prenom, c.nom].filter(Boolean).join(" ") || c.telephone}</option>
                    ))}
                </Select>
                <Select size="sm" value={statut} onChange={(e) => setStatut(e.target.value)}>
                    <option value="">Tout statut</option>
                    <option value="TERMINEE">Terminées</option>
                    <option value="ANNULEE">Annulées</option>
                </Select>
                <DateField size="sm" label="Du" value={du} onChange={(e) => setDu(e.target.value)} />
                <DateField size="sm" label="Au" value={au} onChange={(e) => setAu(e.target.value)} />
                <Button icon="filter_list" onClick={() => charger()}>Filtrer</Button>
                {(chauffeur || statut || du || au) && (
                    <Button variant="ghost" icon="filter_alt_off" onClick={() => {
                        setChauffeur(""); setStatut(""); setDu(""); setAu("");
                    }}>
                        Réinitialiser
                    </Button>
                )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[840px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <th className={entete}>Course</th>
                                <th className={entete}>Chauffeur</th>
                                <th className={entete}>Trajet</th>
                                <th className={entete}>Statut</th>
                                <th className={`${entete} text-right`}>Montant</th>
                                <th className={`${entete} text-right`}>Votre part</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {chargement ? (
                                <tr><td colSpan={6} className="py-10"><Loading /></td></tr>
                            ) : lignes.length === 0 ? (
                                <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-500">Aucune course sur cette période.</td></tr>
                            ) : lignes.map((c: any) => (
                                <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-4 py-2.5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{c.code || `#${c.id}`}</span>
                                            <span className="text-[11px] text-slate-500 leading-tight">{quand(c.date_depart, c.heure_depart)}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300">
                                        {c.chauffeur ? [c.chauffeur.prenom, c.chauffeur.nom].filter(Boolean).join(" ") : "—"}
                                    </td>
                                    <td className="px-4 py-2.5 text-xs text-slate-500 max-w-xs">
                                        <span className="line-clamp-1">{c.lieu_depart} → {c.lieu_arrive}</span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUTS[c.statut] ?? "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                                            {c.statut || "—"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                        {francs(c.montant)}
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-sm font-bold tabular-nums text-primary whitespace-nowrap">
                                        {francs(c.commission_partenaire)}
                                    </td>
                                </tr>
                            ))}
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

export default PartnerRides;
