import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";
import EatTargetPicker from "./EatTargetPicker";
import type { TargetOptions, TargetType } from "./EatTargetPicker";

/**
 * La vitrine d'une rubrique : les boutiques choisies, et ce que chacune porte.
 *
 * Les autres rubriques se calculent — les plus commandées, celles qui font
 * des remises. Celle-ci se compose : ces trois enseignes, dans cet ordre.
 * C'est ce qu'on vend à un marchand, et aucun classement ne sait le produire.
 *
 * Trois choses par carte, et pas une de plus :
 *
 *   - **où elle mène.** Pas forcément la boutique : l'un de ses rayons, une
 *     cuisine, une page ;
 *   - **quel code elle annonce.** Le badge « −5000 F » se déduit du code, il
 *     ne se saisit pas — sinon il continuerait de promettre après expiration ;
 *   - **à qui elle parle.** Un sponsoring s'achète sur une cible.
 */

interface Carte {
    id: number;
    store_id: number;
    store_name: string | null;
    position: number;
    target_type: string | null;
    target_value: string | null;
    promo_code_id: number | null;
    audience: string;
    is_active: boolean;
    badge: string | null;
    promo_code: string | null;
}

interface Props {
    sectionId: number;
    title: string;
    onClose: () => void;
}

const champ =
    "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white";

/** Les cibles, dites au back-office comme au marchand. */
const AUDIENCES: Record<string, string> = {
    all: "Tout le monde",
    new: "Nouveaux clients",
    returning: "Clients fidèles",
    dormant: "Clients qui ne sont pas revenus",
};

const vide = {
    id: null as number | null,
    store_id: 0,
    target_type: "" as TargetType,
    target_value: "",
    promo_code_id: "",
    audience: "all",
    is_active: true,
};

export default function SectionShowcase({ sectionId, title, onClose }: Props) {
    const [cartes, setCartes] = useState<Carte[]>([]);
    const [options, setOptions] = useState<TargetOptions>({ stores: [], tags: [], campaigns: [], promo_codes: [] });
    const [codes, setCodes] = useState<{ id: number; code: string }[]>([]);
    const [form, setForm] = useState<typeof vide | null>(null);
    const [chargement, setChargement] = useState(true);

    const api = new ApiService();

    const charger = async () => {
        setChargement(true);

        try {
            const { data } = await api.getData("v3/admin/eat/sections/picks", { id: sectionId });

            if (data.success) {
                setCartes(data.data.picks ?? []);
                setCodes(data.data.promo_codes ?? []);
                setOptions({
                    stores: data.data.stores ?? [],
                    tags: data.data.tags ?? [],
                    campaigns: data.data.campaigns ?? [],
                    promo_codes: data.data.promo_codes ?? [],
                    categories: data.data.categories ?? [],
                    aisles: data.data.aisles ?? [],
                });
            } else {
                Swal.fire({ icon: "error", title: data.message });
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Vitrine illisible", text: String(erreur) });
        }

        setChargement(false);
    };

    useEffect(() => {
        charger();
    }, [sectionId]);

    const enregistrer = async () => {
        if (!form || !form.store_id) {
            Swal.fire({ icon: "info", title: "Choisissez une enseigne" });

            return;
        }

        const { data } = await api.postData("v3/admin/eat/sections/picks", {
            section_id: sectionId,
            store_id: form.store_id,
            target_type: form.target_type || null,
            target_value: form.target_value || null,
            promo_code_id: form.promo_code_id || null,
            audience: form.audience,
            is_active: form.is_active,
        });

        if (!data.success) {
            Swal.fire({ icon: "error", title: data.message });

            return;
        }

        setForm(null);
        charger();
    };

    const retirer = async (carte: Carte) => {
        const reponse = await Swal.fire({
            icon: "question",
            title: `Retirer « ${carte.store_name} » ?`,
            showCancelButton: true,
            confirmButtonText: "Retirer",
            cancelButtonText: "Annuler",
        });

        if (!reponse.isConfirmed) return;

        const { data } = await api.postData("v3/admin/eat/sections/picks/delete", { id: carte.id });

        if (data.success) charger();
        else Swal.fire({ icon: "error", title: data.message });
    };

    /** L'ordre se vend : il se change ici, une place à la fois. */
    const deplacer = async (rang: number, sens: -1 | 1) => {
        const cible = rang + sens;

        if (cible < 0 || cible >= cartes.length) return;

        const ordonnees = [...cartes];
        [ordonnees[rang], ordonnees[cible]] = [ordonnees[cible], ordonnees[rang]];

        setCartes(ordonnees);

        await api.postData("v3/admin/eat/sections/picks/reorder", { ids: ordonnees.map((c) => c.id) });
    };

    const modifier = (carte: Carte) =>
        setForm({
            id: carte.id,
            store_id: carte.store_id,
            target_type: (carte.target_type ?? "") as TargetType,
            target_value: carte.target_value ?? "",
            promo_code_id: carte.promo_code_id ? String(carte.promo_code_id) : "",
            audience: carte.audience,
            is_active: carte.is_active,
        });

    return (
        <section className="mt-6 p-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-6 mb-5">
                <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Vitrine — {title}</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                        Les enseignes de cette rubrique, dans l'ordre où elles paraîtront. Le badge se déduit du code
                        promo choisi : il disparaît tout seul quand le code expire.
                    </p>
                </div>

                <div className="flex gap-3 shrink-0">
                    <button
                        onClick={() => setForm({ ...vide })}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    >
                        Ajouter une enseigne
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm border border-slate-300 dark:border-slate-700 dark:text-white"
                    >
                        Fermer
                    </button>
                </div>
            </div>

            {chargement ? (
                <p className="text-slate-500">Chargement…</p>
            ) : cartes.length === 0 ? (
                <p className="text-slate-500">Aucune enseigne : la rubrique ne s'affichera pas.</p>
            ) : (
                <ul className="space-y-2">
                    {cartes.map((carte, rang) => (
                        <li
                            key={carte.id}
                            className={`flex items-center gap-4 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800 ${carte.is_active ? "" : "opacity-50"}`}
                        >
                            <div className="flex flex-col">
                                <button onClick={() => deplacer(rang, -1)} disabled={rang === 0} className="disabled:opacity-20">
                                    <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                                </button>
                                <button
                                    onClick={() => deplacer(rang, 1)}
                                    disabled={rang === cartes.length - 1}
                                    className="disabled:opacity-20"
                                >
                                    <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                                </button>
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="font-medium text-slate-900 dark:text-white">
                                    {carte.store_name ?? "—"}

                                    {carte.badge && (
                                        <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                                            {carte.badge}
                                        </span>
                                    )}

                                    {carte.promo_code_id !== null && !carte.badge && (
                                        <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                                            Code expiré
                                        </span>
                                    )}
                                </p>

                                <p className="text-xs text-slate-500 mt-0.5">
                                    {AUDIENCES[carte.audience] ?? carte.audience}
                                    {carte.promo_code ? ` · code ${carte.promo_code}` : ""}
                                    {carte.target_type ? ` · mène vers ${carte.target_type}` : " · ouvre la boutique"}
                                </p>
                            </div>

                            <button onClick={() => modifier(carte)} className="text-sm text-slate-600 dark:text-slate-300">
                                Modifier
                            </button>
                            <button onClick={() => retirer(carte)} className="text-sm text-rose-600">
                                Retirer
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {form && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 gap-4 max-w-xl">
                    <label>
                        <span className="text-xs font-semibold uppercase text-slate-500">Enseigne</span>
                        <select
                            className={champ}
                            value={form.store_id || ""}
                            onChange={(e) => setForm({ ...form, store_id: Number(e.target.value) })}
                        >
                            <option value="">Choisir…</option>
                            {options.stores.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div>
                        <span className="text-xs font-semibold uppercase text-slate-500">Où mène la carte</span>
                        <p className="text-xs text-slate-400 mb-2">Vide : la boutique elle-même.</p>
                        <EatTargetPicker
                            type={form.target_type}
                            value={form.target_value}
                            options={options}
                            onChange={(type, valeur) => setForm({ ...form, target_type: type, target_value: valeur })}
                        />
                    </div>

                    <label>
                        <span className="text-xs font-semibold uppercase text-slate-500">Code promo annoncé</span>
                        <select
                            className={champ}
                            value={form.promo_code_id}
                            onChange={(e) => setForm({ ...form, promo_code_id: e.target.value })}
                        >
                            <option value="">Aucun badge</option>
                            {codes.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.code}
                                </option>
                            ))}
                        </select>
                        <span className="text-xs text-slate-400">
                            Le badge (« −5000 F ») se déduit du code : il tombe de lui-même à l'expiration.
                        </span>
                    </label>

                    <label>
                        <span className="text-xs font-semibold uppercase text-slate-500">À qui</span>
                        <select
                            className={champ}
                            value={form.audience}
                            onChange={(e) => setForm({ ...form, audience: e.target.value })}
                        >
                            {Object.entries(AUDIENCES).map(([cle, libelle]) => (
                                <option key={cle} value={cle}>
                                    {libelle}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <input
                            type="checkbox"
                            checked={form.is_active}
                            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                        />
                        Visible
                    </label>

                    <div className="flex gap-3">
                        <button
                            onClick={enregistrer}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                        >
                            Enregistrer
                        </button>
                        <button
                            onClick={() => setForm(null)}
                            className="px-4 py-2 rounded-lg text-sm border border-slate-300 dark:border-slate-700 dark:text-white"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
