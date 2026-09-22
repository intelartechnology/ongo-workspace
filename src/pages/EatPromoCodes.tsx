import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import PromoTicketPreview, { titreParDefaut } from "./components/PromoTicketPreview";

/**
 * Les codes promo d'Ongo Eat.
 *
 * Les codes **d'Ongo** se créent ici, et Ongo les paie : le marchand est
 * reversé comme si le client avait réglé plein tarif. Valables partout, ou
 * limités à un marchand ou à une boutique.
 *
 * Les codes **des marchands** s'y lisent aussi — ils les créent et les paient
 * eux-mêmes, mais un code qui fuit sur les réseaux doit pouvoir être coupé
 * d'ici.
 */

interface Code {
    id: number;
    code: string;
    description: string | null;
    funded_by: "merchant" | "platform";
    merchant_id: number | null;
    store_id: number | null;
    type: "percent" | "amount";
    value: number;
    max_discount: number | null;
    min_subtotal: number;
    starts_at: string | null;
    ends_at: string | null;
    max_uses: number | null;
    max_uses_per_user: number;
    first_order_only: boolean;
    is_active: boolean;
    label: string;
    ticket_headline: string | null;
    ticket_text: string | null;
    ticket_color: string | null;
    uses: number;
    discount_given: number;
}

interface Marchand {
    id: number;
    name: string;
    stores: { id: number; name: string }[];
}

interface EatPromoCodesProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const champ = "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white";
const francs = (montant: number) => `${(montant ?? 0).toLocaleString("fr-FR")} F`;
const date = (valeur: string | null) => (valeur ? new Date(valeur).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : null);

const vide = {
    id: null as number | null,
    code: "",
    description: "",
    type: "amount" as "percent" | "amount",
    value: "",
    max_discount: "",
    min_subtotal: "",
    starts_at: "",
    ends_at: "",
    max_uses: "",
    max_uses_per_user: "1",
    first_order_only: false,
    merchant_id: "",
    store_id: "",
    ticket_headline: "",
    ticket_text: "",
    ticket_color: "#FF1A1A",
};

export default function EatPromoCodes({ onLogout, theme, toggleTheme }: EatPromoCodesProps) {
    const [codes, setCodes] = useState<Code[]>([]);
    const [marchands, setMarchands] = useState<Marchand[]>([]);
    const [filtre, setFiltre] = useState<"" | "platform" | "merchant">("");
    const [form, setForm] = useState<typeof vide | null>(null);

    const api = new ApiService();

    const charger = async () => {
        try {
            const [lesCodes, lesMarchands] = await Promise.all([
                api.getData("v3/admin/eat/promo-codes", filtre ? { funded_by: filtre } : undefined),
                api.getData("v3/admin/merchants", { per_page: 200 }),
            ]);

            if (lesCodes.data.success) setCodes(lesCodes.data.data ?? []);
            if (lesMarchands.data.success) setMarchands(lesMarchands.data.data?.data ?? []);
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Codes illisibles", text: String(erreur) });
        }
    };

    useEffect(() => {
        charger();
    }, [filtre]);

    const nomMarchand = (id: number | null) => marchands.find((m) => m.id === id)?.name ?? (id ? `#${id}` : null);

    const nomBoutique = (id: number | null) => {
        for (const m of marchands) {
            const b = m.stores.find((s) => s.id === id);
            if (b) return b.name;
        }

        return id ? `#${id}` : null;
    };

    const enregistrer = async () => {
        if (!form) return;

        const nombre = (v: string) => (v.trim() === "" ? null : Number(v));

        const { data } = await api.postData("v3/admin/eat/promo-codes", {
            id: form.id,
            code: form.code,
            description: form.description || null,
            type: form.type,
            value: Number(form.value),
            max_discount: nombre(form.max_discount),
            min_subtotal: nombre(form.min_subtotal) ?? 0,
            starts_at: form.starts_at || null,
            ends_at: form.ends_at || null,
            max_uses: nombre(form.max_uses),
            max_uses_per_user: nombre(form.max_uses_per_user) ?? 1,
            first_order_only: form.first_order_only,
            merchant_id: nombre(form.merchant_id),
            store_id: nombre(form.store_id),
            ticket_headline: form.ticket_headline.trim() || null,
            ticket_text: form.ticket_text.trim() || null,
            ticket_color: form.ticket_color || null,
        });

        if (!data.success) {
            const details = data.data && typeof data.data === "object" ? Object.values(data.data).flat().join("\n") : "";
            Swal.fire({ icon: "error", title: data.message, text: details });

            return;
        }

        Swal.fire({ icon: "success", title: data.message, timer: 1400, showConfirmButton: false });
        setForm(null);
        charger();
    };

    const basculer = async (c: Code) => {
        const { data } = await api.postData("v3/admin/eat/promo-codes/toggle", { id: c.id, is_active: !c.is_active });

        if (!data.success) {
            Swal.fire({ icon: "error", title: data.message });

            return;
        }

        charger();
    };

    const modifier = (c: Code) =>
        setForm({
            id: c.id,
            code: c.code,
            description: c.description ?? "",
            type: c.type,
            value: String(c.value),
            max_discount: c.max_discount ? String(c.max_discount) : "",
            min_subtotal: c.min_subtotal ? String(c.min_subtotal) : "",
            starts_at: c.starts_at ? c.starts_at.slice(0, 16) : "",
            ends_at: c.ends_at ? c.ends_at.slice(0, 16) : "",
            max_uses: c.max_uses ? String(c.max_uses) : "",
            max_uses_per_user: String(c.max_uses_per_user),
            first_order_only: c.first_order_only,
            merchant_id: c.merchant_id ? String(c.merchant_id) : "",
            store_id: c.store_id ? String(c.store_id) : "",
            ticket_headline: c.ticket_headline ?? "",
            ticket_text: c.ticket_text ?? "",
            ticket_color: c.ticket_color ?? "#FF1A1A",
        });

    const totaux = useMemo(
        () => ({
            ongo: codes.filter((c) => c.funded_by === "platform").reduce((s, c) => s + c.discount_given, 0),
            marchands: codes.filter((c) => c.funded_by === "merchant").reduce((s, c) => s + c.discount_given, 0),
        }),
        [codes]
    );

    const boutiquesDuMarchand = form?.merchant_id ? marchands.find((m) => m.id === Number(form.merchant_id))?.stores ?? [] : [];

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-8 py-6 max-w-7xl mx-auto flex items-start justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Codes promo</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Remises accordées : {francs(totaux.ongo)} payées par Ongo · {francs(totaux.marchands)} payées par les marchands
                        </p>
                    </div>
                    {!form && (
                        <button onClick={() => setForm({ ...vide })} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium dark:bg-white dark:text-slate-900">
                            Nouveau code Ongo
                        </button>
                    )}
                </div>
            </header>

            <main className="px-8 py-8 max-w-7xl mx-auto space-y-6">
                {form && (
                    <div className="p-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-sm text-slate-500 mb-4">Ce code est payé par Ongo : le marchand est reversé plein tarif.</p>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Code</span>
                                <input className={`${champ} uppercase`} value={form.code} placeholder="BIENVENUE" onChange={(e) => setForm({ ...form, code: e.target.value })} />
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Type</span>
                                <select className={champ} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "percent" | "amount" })}>
                                    <option value="amount">Montant fixe</option>
                                    <option value="percent">Pourcentage</option>
                                </select>
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">{form.type === "percent" ? "Remise (%)" : "Remise (F)"}</span>
                                <input className={champ} value={form.value} inputMode="numeric" onChange={(e) => setForm({ ...form, value: e.target.value })} />
                            </label>
                            {form.type === "percent" ? (
                                <label>
                                    <span className="text-xs font-semibold uppercase text-slate-500">Plafond (F)</span>
                                    <input className={champ} value={form.max_discount} placeholder="aucun" onChange={(e) => setForm({ ...form, max_discount: e.target.value })} />
                                </label>
                            ) : (
                                <div />
                            )}
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Panier minimum (F)</span>
                                <input className={champ} value={form.min_subtotal} placeholder="aucun" onChange={(e) => setForm({ ...form, min_subtotal: e.target.value })} />
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Début</span>
                                <input type="datetime-local" className={champ} value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Fin</span>
                                <input type="datetime-local" className={champ} value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Utilisations au total</span>
                                <input className={champ} value={form.max_uses} placeholder="illimitées" onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Par client</span>
                                <input className={champ} value={form.max_uses_per_user} onChange={(e) => setForm({ ...form, max_uses_per_user: e.target.value })} />
                                <span className="text-xs text-slate-400">0 : illimité</span>
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Limiter à un marchand</span>
                                <select className={champ} value={form.merchant_id} onChange={(e) => setForm({ ...form, merchant_id: e.target.value, store_id: "" })}>
                                    <option value="">Tous</option>
                                    {marchands.map((m) => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">…à une boutique</span>
                                <select className={champ} value={form.store_id} disabled={!form.merchant_id} onChange={(e) => setForm({ ...form, store_id: e.target.value })}>
                                    <option value="">Toutes</option>
                                    {boutiquesDuMarchand.map((b) => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="md:col-span-2">
                                <span className="text-xs font-semibold uppercase text-slate-500">Description</span>
                                <input className={champ} value={form.description} placeholder="Campagne de lancement" onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            </label>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 mt-4">
                            <input type="checkbox" checked={form.first_order_only} onChange={(e) => setForm({ ...form, first_order_only: e.target.checked })} />
                            Première commande seulement
                        </label>

                        {/* Le ticket qu'ouvre une bannière d'entrée pointant sur ce code. */}
                        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6">
                            <div className="space-y-4">
                                <p className="text-sm text-slate-500">
                                    Le ticket s'ouvre depuis une bannière d'entrée (destination « Le ticket d'un code promo »). Laissé vide, il se déduit du code.
                                </p>
                                <label className="block">
                                    <span className="text-xs font-semibold uppercase text-slate-500">Grand titre du ticket</span>
                                    <input className={champ} value={form.ticket_headline} maxLength={60} placeholder={titreParDefaut(form).titre} onChange={(e) => setForm({ ...form, ticket_headline: e.target.value })} />
                                </label>
                                <label className="block">
                                    <span className="text-xs font-semibold uppercase text-slate-500">Texte du ticket</span>
                                    <textarea
                                        className={champ}
                                        rows={2}
                                        maxLength={200}
                                        value={form.ticket_text}
                                        placeholder="Choisissez des plats, passez votre première commande…"
                                        onChange={(e) => setForm({ ...form, ticket_text: e.target.value })}
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-xs font-semibold uppercase text-slate-500">Couleur</span>
                                    <input type="color" className="block mt-1 h-10 w-20 rounded" value={form.ticket_color} onChange={(e) => setForm({ ...form, ticket_color: e.target.value })} />
                                </label>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900">
                                <PromoTicketPreview form={form} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300">
                                Annuler
                            </button>
                            <button
                                onClick={enregistrer}
                                disabled={!form.code.trim() || !form.value}
                                className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 dark:bg-white dark:text-slate-900"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex gap-2">
                    {([["", "Tous"], ["platform", "Ongo"], ["merchant", "Marchands"]] as const).map(([cle, libelle]) => (
                        <button
                            key={cle}
                            onClick={() => setFiltre(cle)}
                            className={`px-4 py-1.5 rounded-full text-sm border ${
                                filtre === cle
                                    ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                                    : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                            }`}
                        >
                            {libelle}
                        </button>
                    ))}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs uppercase text-slate-500 text-left">
                            <tr>
                                <th className="px-5 py-3">Code</th>
                                <th className="px-5 py-3">Payé par</th>
                                <th className="px-5 py-3">Remise</th>
                                <th className="px-5 py-3">Portée</th>
                                <th className="px-5 py-3">Utilisations</th>
                                <th className="px-5 py-3">Coût</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {codes.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-5 py-6 text-center text-slate-500">Aucun code.</td>
                                </tr>
                            )}
                            {codes.map((c) => (
                                <tr key={c.id} className={c.is_active ? "" : "opacity-50"}>
                                    <td className="px-5 py-3">
                                        <p className="font-mono font-semibold text-slate-900 dark:text-white">{c.code}</p>
                                        {c.description && <p className="text-xs text-slate-500">{c.description}</p>}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span
                                            className={`px-2 py-1 rounded-md text-xs font-medium ${
                                                c.funded_by === "platform" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"
                                            }`}
                                        >
                                            {c.funded_by === "platform" ? "Ongo" : nomMarchand(c.merchant_id)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-slate-700 dark:text-slate-200">
                                        {c.label}
                                        <p className="text-xs text-slate-500">
                                            {[
                                                c.min_subtotal ? `dès ${francs(c.min_subtotal)}` : null,
                                                c.first_order_only ? "1re commande" : null,
                                                date(c.ends_at) ? `jusqu'au ${date(c.ends_at)}` : null,
                                            ]
                                                .filter(Boolean)
                                                .join(" · ")}
                                        </p>
                                    </td>
                                    <td className="px-5 py-3 text-xs text-slate-500">
                                        {c.store_id ? nomBoutique(c.store_id) : c.merchant_id ? nomMarchand(c.merchant_id) : "Toute la plateforme"}
                                    </td>
                                    <td className="px-5 py-3 text-slate-700 dark:text-slate-200">
                                        {c.uses}
                                        {c.max_uses ? ` / ${c.max_uses}` : ""}
                                    </td>
                                    <td className="px-5 py-3 text-slate-700 dark:text-slate-200">{francs(c.discount_given)}</td>
                                    <td className="px-5 py-3 text-right whitespace-nowrap">
                                        {c.funded_by === "platform" && (
                                            <button onClick={() => modifier(c)} className="text-sm text-slate-600 dark:text-slate-300 mr-4">
                                                Modifier
                                            </button>
                                        )}
                                        <button onClick={() => basculer(c)} className="text-sm text-slate-900 dark:text-white">
                                            {c.is_active ? "Suspendre" : "Réactiver"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </MainLayout>
    );
}
