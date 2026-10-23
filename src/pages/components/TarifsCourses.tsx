import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import ApiService from "../../services/ApiService";

/** Les quatre paramètres du prix d'une course, tels que l'API les rend. */
const CHAMPS = [
    { cle: "base_price", libelle: "Prise en charge", unite: "F" },
    { cle: "included_km", libelle: "Km inclus", unite: "km" },
    { cle: "km_price", libelle: "Prix par km", unite: "F" },
    { cle: "minute_price", libelle: "Prix par minute", unite: "F" },
] as const;

type Cle = (typeof CHAMPS)[number]["cle"];

interface Categorie {
    id: number;
    libelle: string;
    niveau: number | null;
    is_delivery: boolean | number;
    base_price: number | string | null;
    included_km: number | string | null;
    km_price: number | string | null;
    minute_price: number | string | null;
}

interface Regles {
    km_inclus_par_defaut: number;
    arrondi: number;
    supplement_aeroport: number;
    minimum_aeroport: number;
}

interface Changement {
    id: number;
    categorie: string | null;
    avant: Record<Cle, number | null>;
    apres: Record<Cle, number | null>;
    created_at: string;
    par: string | null;
}

/* La course type de l'aperçu : assez longue pour que le prix au km pèse. */
const KM = 10;
const MINUTES = 20;

const nombre = (v: unknown): number => {
    const n = Number(String(v ?? "").replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
};
const francs = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F`;

/**
 * Le prix d'une course type, avec la même formule que `FareCalculator` :
 * prise en charge, kilomètres au-delà du forfait, minutes, arrondi supérieur.
 */
const prixType = (t: Record<Cle, unknown>, regles: Regles): number => {
    const inclus = t.included_km === null || t.included_km === "" || t.included_km === undefined ? regles.km_inclus_par_defaut : nombre(t.included_km);
    const brut = nombre(t.base_price) + Math.max(0, KM - inclus) * nombre(t.km_price) + MINUTES * nombre(t.minute_price);
    const pas = regles.arrondi > 1 ? regles.arrondi : 1;
    return Math.ceil(brut / pas) * pas;
};

/**
 * Les tarifs des courses : une ligne par catégorie, enregistrée à part.
 *
 * Un aperçu compare l'ancien et le nouveau prix d'une course type, et une
 * confirmation le rappelle avant d'enregistrer : une faute de frappe (3 000
 * au lieu de 300) toucherait toutes les courses suivantes.
 */
export default function TarifsCourses() {
    const api = new ApiService();
    const [categories, setCategories] = useState<Categorie[]>([]);
    const [regles, setRegles] = useState<Regles | null>(null);
    const [journal, setJournal] = useState<Changement[]>([]);
    const [brouillon, setBrouillon] = useState<Record<number, Partial<Record<Cle, string>>>>({});
    const [enCours, setEnCours] = useState<number | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);

    const charger = async () => {
        try {
            const { data } = await api.getData("v3/admin/tarifs-courses");
            if (!data.success) throw new Error(data.message);
            setCategories(data.data.categories);
            setRegles(data.data.regles);
            setJournal(data.data.journal);
            setErreur(null);
        } catch {
            setErreur("Les tarifs n'ont pas pu être chargés.");
        }
    };

    useEffect(() => {
        charger();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const valeur = (c: Categorie, cle: Cle): string => brouillon[c.id]?.[cle] ?? (c[cle] === null ? "" : String(Number(c[cle])));
    const actuel = (c: Categorie) => Object.fromEntries(CHAMPS.map((f) => [f.cle, c[f.cle]])) as Record<Cle, unknown>;
    const nouveau = (c: Categorie) => Object.fromEntries(CHAMPS.map((f) => [f.cle, valeur(c, f.cle)])) as Record<Cle, unknown>;
    const modifie = (c: Categorie) => CHAMPS.some((f) => brouillon[c.id]?.[f.cle] !== undefined && nombre(brouillon[c.id]?.[f.cle]) !== nombre(c[f.cle]));

    const enregistrer = async (c: Categorie) => {
        if (!regles) return;
        const avant = prixType(actuel(c), regles);
        const apres = prixType(nouveau(c), regles);
        const ecart = avant > 0 ? Math.round(((apres - avant) / avant) * 100) : 0;

        const ok = await Swal.fire({
            title: `Changer le tarif ${c.libelle} ?`,
            html: `Une course de ${KM} km et ${MINUTES} min passera de <b>${francs(avant)}</b> à <b>${francs(apres)}</b>${avant > 0 ? ` (${ecart > 0 ? "+" : ""}${ecart} %)` : ""}.<br><small>Le changement vaut pour les prochaines estimations, pas pour les courses déjà commandées.</small>`,
            icon: Math.abs(ecart) >= 30 ? "warning" : "question",
            showCancelButton: true,
            confirmButtonText: "Enregistrer",
            cancelButtonText: "Annuler",
            confirmButtonColor: "#10377b",
        });
        if (!ok.isConfirmed) return;

        setEnCours(c.id);
        try {
            const corps = Object.fromEntries(CHAMPS.map((f) => [f.cle, nombre(valeur(c, f.cle) || 0)]));
            const { data } = await api.updateData(`v3/admin/tarifs-courses/${c.id}`, corps);
            if (data.success) {
                toast.success(`Tarif ${c.libelle} mis à jour`);
                setBrouillon((b) => {
                    const suite = { ...b };
                    delete suite[c.id];
                    return suite;
                });
                await charger();
            } else {
                toast.error(data.message || "Enregistrement refusé");
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Connexion au serveur impossible");
        } finally {
            setEnCours(null);
        }
    };

    const champ = "w-24 bg-transparent text-right outline-none tabular-nums text-slate-900 dark:text-white";

    return (
        <section className="mb-10">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tarifs des courses</h2>
            <p className="mt-1 text-sm text-slate-500">
                Le prix d'une course dans chaque catégorie. Une modification s'applique aux prochaines estimations, pas aux courses déjà commandées.
            </p>
            {regles && (
                <p className="mt-2 text-[13px] text-slate-500">
                    Prix = prise en charge + prix par km × km au-delà des km inclus + prix par minute × minutes, arrondi aux {regles.arrondi} F supérieurs.
                    Supplément aéroport : +{regles.supplement_aeroport.toLocaleString("fr-FR")} F, minimum {regles.minimum_aeroport.toLocaleString("fr-FR")} F.
                </p>
            )}

            {erreur && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{erreur}</p>}

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Catégorie</th>
                            {CHAMPS.map((f) => <th key={f.cle} className="px-4 py-3 font-semibold">{f.libelle}</th>)}
                            <th className="px-4 py-3 font-semibold">Course de {KM} km · {MINUTES} min</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {categories.map((c) => {
                            const change = modifie(c);
                            const avant = regles ? prixType(actuel(c), regles) : 0;
                            const apres = regles ? prixType(nouveau(c), regles) : 0;
                            return (
                                <tr key={c.id}>
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-slate-900 dark:text-white">{c.libelle}</p>
                                        <p className="text-[11px] text-slate-500">{Number(c.is_delivery) ? "Livraison" : c.niveau ? `Gamme ${c.niveau}` : "—"}</p>
                                    </td>
                                    {CHAMPS.map((f) => {
                                        const touche = brouillon[c.id]?.[f.cle] !== undefined && nombre(brouillon[c.id]?.[f.cle]) !== nombre(c[f.cle]);
                                        return (
                                            <td key={f.cle} className="px-4 py-3">
                                                <label className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 ${touche ? "border-primary bg-white dark:bg-slate-900" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60"}`}>
                                                    <input
                                                        id={`tarif-${c.id}-${f.cle}`}
                                                        inputMode="decimal"
                                                        value={valeur(c, f.cle)}
                                                        placeholder={f.cle === "included_km" && regles ? String(regles.km_inclus_par_defaut) : "0"}
                                                        onChange={(e) => setBrouillon((b) => ({ ...b, [c.id]: { ...b[c.id], [f.cle]: e.target.value } }))}
                                                        className={champ}
                                                    />
                                                    <span className="text-[11px] text-slate-400">{f.unite}</span>
                                                </label>
                                            </td>
                                        );
                                    })}
                                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                                        <p className="font-bold text-slate-900 dark:text-white">{francs(apres)}</p>
                                        <p className={`text-[11.5px] ${change ? "font-semibold text-amber-600 dark:text-amber-400" : "text-slate-500"}`}>
                                            {change ? `avant : ${francs(avant)}${avant > 0 ? ` (${apres >= avant ? "+" : ""}${Math.round(((apres - avant) / avant) * 100)} %)` : ""}` : "inchangé"}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            type="button"
                                            disabled={!change || enCours === c.id}
                                            onClick={() => enregistrer(c)}
                                            className="rounded-lg bg-primary px-3 py-1.5 text-[13px] font-bold text-white disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800"
                                        >
                                            {enCours === c.id ? "…" : change ? "Enregistrer" : "Enregistré"}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {journal.length > 0 && (
                <details className="mt-4 text-sm">
                    <summary className="cursor-pointer font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                        Journal des changements ({journal.length})
                    </summary>
                    <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                        {journal.map((j) => (
                            <li key={j.id} className="px-4 py-2.5 text-[13px] text-slate-600 dark:text-slate-300">
                                <span className="font-semibold text-slate-900 dark:text-white">{j.categorie ?? "Catégorie supprimée"}</span>
                                {" · "}
                                {CHAMPS.filter((f) => nombre(j.avant?.[f.cle]) !== nombre(j.apres?.[f.cle]))
                                    .map((f) => `${f.libelle.toLowerCase()} ${nombre(j.avant?.[f.cle])} → ${nombre(j.apres?.[f.cle])} ${f.unite}`)
                                    .join(", ")}
                                <span className="text-slate-400"> · {new Date(j.created_at).toLocaleString("fr-FR")}{j.par ? ` · par ${j.par}` : ""}</span>
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </section>
    );
}
