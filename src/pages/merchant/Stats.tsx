import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";

/**
 * Ce que le marchand rapporte : vues et clics de ses surfaces.
 *
 * Il paie un emplacement, il doit pouvoir le juger. Sans cet écran, une
 * campagne se renouvelle sur une impression — « ça a bien marché » — et se
 * négocie sans chiffre, ce qui ne tient pas une fois la régie ouverte.
 *
 * **Le taux avant les totaux.** Mille vues et deux clics valent moins que
 * cent vues et trente clics ; c'est le rapport qui dit si une surface
 * fonctionne, pas le volume.
 */

interface Ligne {
    id: number;
    name: string;
    status: string | null;
    impressions: number;
    clicks: number;
    rate: number;
}

interface Mesures {
    days: number;
    totals: { impressions: number; clicks: number };
    sources: Record<string, Ligne[]>;
}

interface StatsProps {
    merchantId: string;
}

/** Les familles, dans l'ordre où elles intéressent le marchand. */
const FAMILLES: { cle: string; titre: string; legende: string }[] = [
    { cle: "campaign", titre: "Campagnes", legende: "Vos opérations et ce qu'elles ont porté" },
    { cle: "banner", titre: "Bannières", legende: "Les emplacements qui mènent à vos campagnes" },
    { cle: "store", titre: "Boutiques", legende: "Combien de fois vos enseignes ont été vues sur l'accueil" },
    { cle: "collection", titre: "Collections", legende: "Vos sélections d'articles" },
    { cle: "product", titre: "Produits", legende: "Les trente plus vus" },
];

const nombre = (valeur: number) => (valeur ?? 0).toLocaleString("fr-FR");

/** L'état d'une proposition, dit en clair. */
const ETAT: Record<string, { libelle: string; classe: string }> = {
    pending: { libelle: "En attente", classe: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
    approved: { libelle: "Acceptée", classe: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
    rejected: { libelle: "Refusée", classe: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400" },
    draft: { libelle: "Brouillon", classe: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
};

export default function Stats({ merchantId }: StatsProps) {
    const [mesures, setMesures] = useState<Mesures | null>(null);
    const [jours, setJours] = useState<number>(30);
    const [chargement, setChargement] = useState<boolean>(true);

    const api = new ApiService();

    const charger = async (fenetre: number) => {
        setChargement(true);

        try {
            const { data } = await api.getData(`v3/merchant/${merchantId}/stats?days=${fenetre}`);

            if (data.success) {
                setMesures(data.data);
            } else {
                Swal.fire({ icon: "info", title: "Non accessible", text: data.message });
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Statistiques illisibles", text: String(erreur) });
        }

        setChargement(false);
    };

    useEffect(() => {
        charger(jours);
    }, [merchantId, jours]);

    const carte = (titre: string, valeur: string, legende?: string) => (
        <div className="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase text-slate-500">{titre}</p>
            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{valeur}</p>
            {legende && <p className="text-xs text-slate-500 mt-1">{legende}</p>}
        </div>
    );

    if (chargement) return <p className="text-slate-500">Chargement…</p>;
    if (!mesures) return <p className="text-slate-500">Aucune mesure.</p>;

    const totalTaux =
        mesures.totals.impressions > 0
            ? `${((mesures.totals.clicks * 100) / mesures.totals.impressions).toFixed(1)} %`
            : "—";

    return (
        <div>
            <div className="flex items-start justify-between gap-6 mb-6">
                <p className="text-sm text-slate-500 max-w-xl">
                    Combien de fois vos boutiques, vos produits et vos campagnes ont été vus, et combien de fois on les
                    a ouverts. Une surface jamais vue reste affichée à zéro : elle existe, elle n'a simplement pas
                    encore paru.
                </p>

                <select
                    value={jours}
                    onChange={(e) => setJours(Number(e.target.value))}
                    className="px-3 py-2 rounded-lg text-sm border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white shrink-0"
                >
                    <option value={7}>7 jours</option>
                    <option value={30}>30 jours</option>
                    <option value={90}>90 jours</option>
                </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                {carte("Vues", nombre(mesures.totals.impressions), `Sur ${mesures.days} jours`)}
                {carte("Clics", nombre(mesures.totals.clicks))}
                {carte("Taux de clic", totalTaux, "Clics rapportés aux vues")}
            </div>

            {FAMILLES.map(({ cle, titre, legende }) => {
                const lignes = mesures.sources[cle] ?? [];

                if (lignes.length === 0) return null;

                return (
                    <section key={cle} className="mb-10">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{titre}</h3>
                        <p className="text-sm text-slate-500 mt-1 mb-4">{legende}</p>

                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500">
                                    <tr>
                                        <th className="text-left font-medium px-4 py-3">Nom</th>
                                        <th className="text-right font-medium px-4 py-3">Vues</th>
                                        <th className="text-right font-medium px-4 py-3">Clics</th>
                                        <th className="text-right font-medium px-4 py-3">Taux</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {lignes.map((ligne) => (
                                        <tr
                                            key={`${cle}-${ligne.id}`}
                                            className="border-t border-slate-100 dark:border-slate-800"
                                        >
                                            <td className="px-4 py-3 text-slate-900 dark:text-white">
                                                {ligne.name || "—"}

                                                {ligne.status && ETAT[ligne.status] && (
                                                    <span
                                                        className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${ETAT[ligne.status].classe}`}
                                                    >
                                                        {ETAT[ligne.status].libelle}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums">
                                                {nombre(ligne.impressions)}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums">{nombre(ligne.clicks)}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                                                {ligne.impressions > 0 ? `${ligne.rate} %` : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
