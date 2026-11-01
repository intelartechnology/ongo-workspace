import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ApiService from "../../services/ApiService";

/**
 * Les frais d'approche de chaque catégorie : la part offerte et le plafond.
 *
 * Par catégorie, comme chez Yango. Le km et la minute d'approche se paient au
 * prix de la grille de la catégorie (onglet « Tarifs »). L'enregistrement ne
 * touche qu'aux trois champs d'approche, et passe au même journal que les
 * tarifs.
 */

/** `defaut` : la valeur de la migration, montée en grisé dans une case vide. */
const CHAMPS = [
    { cle: "approche_km_offerts", libelle: "Km offerts", unite: "km", defaut: "2" },
    { cle: "approche_minutes_offertes", libelle: "Min offertes", unite: "min", defaut: "5" },
    { cle: "approche_plafond", libelle: "Plafond", unite: "F", defaut: "500" },
] as const;

type Cle = (typeof CHAMPS)[number]["cle"];

interface Categorie {
    id: number;
    libelle: string;
    is_delivery: boolean | number;
    km_price: number | string | null;
    minute_price: number | string | null;
    // Absents tant que le serveur n'a pas la migration des frais d'approche.
    approche_km_offerts?: number | string | null;
    approche_minutes_offertes?: number | string | null;
    approche_plafond?: number | string | null;
}

const nombre = (v: unknown): number => {
    const n = Number(String(v ?? "").replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
};

export default function FraisApproche() {
    const api = new ApiService();
    const [categories, setCategories] = useState<Categorie[]>([]);
    const [brouillon, setBrouillon] = useState<Record<number, Partial<Record<Cle, string>>>>({});
    const [enCours, setEnCours] = useState<number | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);

    const charger = async () => {
        try {
            const { data } = await api.getData("v3/admin/tarifs-courses");
            if (!data.success) throw new Error(data.message);
            setCategories(data.data.categories);
            setErreur(null);
        } catch {
            setErreur("Les frais d'approche n'ont pas pu être chargés.");
        }
    };

    useEffect(() => {
        charger();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // `== null` et non `=== null` : un champ absent de la réponse donnait
    // `Number(undefined)`, soit « NaN » dans la case.
    const valeur = (c: Categorie, cle: Cle): string => brouillon[c.id]?.[cle] ?? (c[cle] == null ? "" : String(Number(c[cle])));

    // Un serveur qui ne renvoie pas les champs n'a pas encore la migration :
    // rien ne s'y enregistrerait.
    const aJour = categories.every((c) => "approche_plafond" in c);
    const touche = (c: Categorie, cle: Cle) => brouillon[c.id]?.[cle] !== undefined && nombre(brouillon[c.id]?.[cle]) !== nombre(c[cle]);
    const modifie = (c: Categorie) => CHAMPS.some((f) => touche(c, f.cle));

    const enregistrer = async (c: Categorie) => {
        setEnCours(c.id);
        try {
            const corps = Object.fromEntries(CHAMPS.map((f) => [f.cle, nombre(valeur(c, f.cle))]));
            const { data } = await api.updateData(`v3/admin/tarifs-courses/${c.id}/approche`, corps);
            if (data.success) {
                toast.success(`Approche ${c.libelle} mise à jour`);
                setBrouillon((b) => {
                    const suite = { ...b };
                    delete suite[c.id];
                    return suite;
                });
                await charger();
            } else {
                toast.error(data.message || "Enregistrement refusé");
            }
        } catch (e: unknown) {
            const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(message || "Connexion au serveur impossible");
        } finally {
            setEnCours(null);
        }
    };

    const champ = "w-16 bg-transparent text-right outline-none tabular-nums text-slate-900 dark:text-white";

    return (
        <div className="space-y-2">
            {erreur && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{erreur}</p>}
            {!aJour && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                    Le serveur n'a pas encore les frais d'approche par catégorie : déployez l'API et lancez la migration
                    « 2026_11_01_300000_frais_d_approche ». En attente, les valeurs par défaut s'affichent en grisé.
                </p>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <table className="w-full min-w-[600px] text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Catégorie</th>
                            {CHAMPS.map((f) => (
                                <th key={f.cle} className="px-4 py-3 font-semibold">
                                    {f.libelle}
                                </th>
                            ))}
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {categories.map((c) => {
                            const change = modifie(c);
                            return (
                                <tr key={c.id}>
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-slate-900 dark:text-white">{c.libelle}</p>
                                        {Number(c.is_delivery) ? <p className="text-[11px] text-slate-500">Livraison</p> : null}
                                    </td>
                                    {CHAMPS.map((f) => (
                                        <td key={f.cle} className="px-4 py-3">
                                            <label
                                                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 ${
                                                    touche(c, f.cle)
                                                        ? "border-primary bg-white dark:bg-slate-900"
                                                        : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60"
                                                }`}
                                            >
                                                <input
                                                    id={`approche-${c.id}-${f.cle}`}
                                                    inputMode="decimal"
                                                    disabled={!aJour}
                                                    placeholder={f.defaut}
                                                    value={valeur(c, f.cle)}
                                                    onChange={(e) => setBrouillon((b) => ({ ...b, [c.id]: { ...b[c.id], [f.cle]: e.target.value } }))}
                                                    className={champ}
                                                />
                                                <span className="text-[11px] text-slate-400">{f.unite}</span>
                                            </label>
                                        </td>
                                    ))}
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            type="button"
                                            disabled={!aJour || !change || enCours === c.id}
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
        </div>
    );
}
