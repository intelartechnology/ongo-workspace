import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ApiService from "../../../services/ApiService";
import Loading from "../../../components/Loading";
import { Button, DateField } from "../../../components/ui";

interface Props { partnerId: string }

const entete = "px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500";

const francs = (v: number | null | undefined): string =>
    v == null ? "—" : `${Number(v).toLocaleString("fr-FR")} FCFA`;

/** Le premier jour du mois courant, au format attendu par un champ date. */
const debutDuMois = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const aujourdhui = (): string => new Date().toISOString().slice(0, 10);

/**
 * Le rapport d'activité d'un partenaire, par chauffeur.
 *
 * Les totaux viennent du serveur et ne sont pas resommés depuis les lignes :
 * les lignes peuvent être tronquées ou filtrées, et deux totaux qui divergent
 * de quelques francs sur un document financier coûtent plus de confiance
 * qu'ils ne font gagner de temps.
 */
const PartnerReport: React.FC<Props> = ({ partnerId }) => {
    const api = new ApiService();

    const [du, setDu] = useState(debutDuMois());
    const [au, setAu] = useState(aujourdhui());
    const [rapport, setRapport] = useState<any>(null);
    const [chargement, setChargement] = useState(false);

    const charger = async () => {
        if (du && au && du > au) {
            toast.error("La date de début est postérieure à la date de fin");
            return;
        }
        setChargement(true);
        try {
            const { data } = await api.getData(`v3/partner/${partnerId}/report`, { du, au });
            if (data.success) setRapport(data.data);
            else toast.error(data.message || "Rapport indisponible");
        } catch (e: any) {
            toast.error(e?.response?.status === 403 ? "Accès refusé" : "Connexion au serveur impossible");
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => { charger(); }, [partnerId]);

    const t = rapport?.totaux;

    return (
        <div className="flex flex-col gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-end gap-3">
                <DateField size="sm" label="Du" value={du} onChange={(e) => setDu(e.target.value)} />
                <DateField size="sm" label="Au" value={au} onChange={(e) => setAu(e.target.value)} />
                <Button variant="primary" icon="summarize" onClick={charger} loading={chargement}>Générer</Button>
                <Button
                    icon="print"
                    className="ml-auto"
                    disabled={!rapport}
                    onClick={() => window.print()}
                >
                    Imprimer
                </Button>
            </div>

            {chargement ? (
                <Loading />
            ) : !rapport ? (
                <div className="py-16 text-center text-sm text-slate-500">Choisissez une période et générez le rapport.</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {[
                            ["Courses", t?.courses?.toLocaleString("fr-FR") ?? "—", "route"],
                            ["Chiffre d'affaires", francs(t?.chiffre_affaires), "payments"],
                            ["Votre commission", francs(t?.commission_partenaire), "account_balance_wallet"],
                            ["Taux moyen", t?.taux_moyen != null ? `${t.taux_moyen} %` : "—", "percent"],
                        ].map(([libelle, valeur, icone]) => (
                            <div key={libelle as string} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
                                <div className="flex items-start justify-between">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{libelle}</p>
                                    <span className="material-symbols-outlined text-[20px] text-slate-300 dark:text-slate-600">{icone}</span>
                                </div>
                                <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 tabular-nums">{valeur}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Détail par chauffeur</h3>
                            {rapport.periode && (
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Du {rapport.periode.du} au {rapport.periode.au}
                                </p>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[620px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className={entete}>Chauffeur</th>
                                        <th className={`${entete} text-right`}>Courses</th>
                                        <th className={`${entete} text-right`}>Chiffre d'affaires</th>
                                        <th className={`${entete} text-right`}>Votre commission</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {(rapport.par_chauffeur ?? []).length === 0 ? (
                                        <tr><td colSpan={4} className="py-12 text-center text-sm text-slate-500">Aucune activité sur cette période.</td></tr>
                                    ) : rapport.par_chauffeur.map((l: any) => (
                                        <tr key={l.driver_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white">{l.nom || `#${l.driver_id}`}</td>
                                            <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-700 dark:text-slate-300">{l.courses?.toLocaleString("fr-FR") ?? "—"}</td>
                                            <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">{francs(l.chiffre_affaires)}</td>
                                            <td className="px-4 py-2.5 text-right text-sm font-bold tabular-nums text-primary whitespace-nowrap">{francs(l.commission)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PartnerReport;
