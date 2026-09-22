import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";
import PromoTicketPreview, { titreParDefaut } from "../components/PromoTicketPreview";

/**
 * Les promotions d'un marchand.
 *
 * **Les promotions par lot** : un taux, des produits, une période. Au début,
 * les prix baissent et l'ancien s'affiche barré ; à la fin, ils reviennent.
 * Un prix que vous changez à la main pendant la promotion n'est pas écrasé.
 *
 * **Les codes promo** : valables dans vos boutiques, et à votre charge — la
 * remise se retranche de ce qu'Ongo vous reverse. Chaque commande qui en
 * profite le signale sur votre poste de commande.
 */

interface ProduitPromo {
    id: number;
    name: string;
    price: number;
    compare_at_price: number | null;
}

interface Promotion {
    short_id: string;
    name: string;
    percent: number;
    starts_at: string;
    ends_at: string | null;
    status: "scheduled" | "active" | "ended" | "canceled";
    products: ProduitPromo[];
}

interface Code {
    id: number;
    code: string;
    description: string | null;
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
    store_id: number | null;
    ticket_headline: string | null;
    ticket_text: string | null;
    ticket_color: string | null;
    label: string;
    uses: number;
    discount_given: number;
}

interface PromotionsProps {
    merchantId: string;
    storeId: number;
    storeName: string;
}

const champ = "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white";
const francs = (montant: number) => `${(montant ?? 0).toLocaleString("fr-FR")} F`;
const date = (valeur: string | null) =>
    valeur ? new Date(valeur).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

/** Le prix remisé, au pas de 50 F inférieur — le même calcul que le serveur. */
const remise = (prix: number, taux: number) => Math.max(50, Math.floor((prix * (100 - taux)) / 100 / 50) * 50);

const STATUTS: Record<Promotion["status"], { libelle: string; classe: string }> = {
    scheduled: { libelle: "Programmée", classe: "bg-amber-100 text-amber-800" },
    active: { libelle: "En cours", classe: "bg-emerald-100 text-emerald-800" },
    ended: { libelle: "Terminée", classe: "bg-slate-100 text-slate-600" },
    canceled: { libelle: "Arrêtée", classe: "bg-slate-100 text-slate-600" },
};

const codeVide = {
    id: null as number | null,
    code: "",
    description: "",
    type: "percent" as "percent" | "amount",
    value: "",
    max_discount: "",
    min_subtotal: "",
    starts_at: "",
    ends_at: "",
    max_uses: "",
    max_uses_per_user: "1",
    first_order_only: false,
    this_store_only: false,
    ticket_headline: "",
    ticket_text: "",
    ticket_color: "#FF1A1A",
};

export default function Promotions({ merchantId, storeId, storeName }: PromotionsProps) {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [codes, setCodes] = useState<Code[]>([]);
    const [produits, setProduits] = useState<ProduitPromo[]>([]);

    const [nouvelle, setNouvelle] = useState<boolean>(false);
    const [nom, setNom] = useState<string>("");
    const [taux, setTaux] = useState<string>("20");
    const [debut, setDebut] = useState<string>("");
    const [fin, setFin] = useState<string>("");
    const [choisis, setChoisis] = useState<number[]>([]);

    const [code, setCode] = useState<typeof codeVide | null>(null);

    const api = new ApiService();
    const boutique = `v3/merchant/${merchantId}/stores/${storeId}`;

    const charger = async () => {
        try {
            const [lots, lesCodes, catalogue] = await Promise.all([
                api.getData(`${boutique}/promotions`),
                api.getData(`v3/merchant/${merchantId}/promo-codes`),
                api.getData(`${boutique}/catalog`),
            ]);

            if (lots.data.success) setPromotions(lots.data.data ?? []);
            if (lesCodes.data.success) setCodes(lesCodes.data.data ?? []);

            if (catalogue.data.success) {
                // Tous les produits, sous-rayons compris.
                const aplatir = (rayons: any[]): ProduitPromo[] =>
                    rayons.flatMap((r) => [...(r.products ?? []), ...aplatir(r.children ?? [])]);

                setProduits(aplatir(catalogue.data.data.sections ?? []));
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Promotions illisibles", text: String(erreur) });
        }
    };

    useEffect(() => {
        charger();
    }, [merchantId, storeId]);

    const erreur = (data: any) => {
        const details = data.data && typeof data.data === "object" ? Object.values(data.data).flat().join("\n") : "";
        Swal.fire({ icon: "error", title: data.message, text: details });
    };

    // ------------------------------------------------------------ les lots

    const lancer = async () => {
        const { data } = await api.postData(`${boutique}/promotions`, {
            name: nom,
            percent: Number(taux),
            starts_at: debut || null,
            ends_at: fin || null,
            product_ids: choisis,
        });

        if (!data.success) return erreur(data);

        Swal.fire({ icon: "success", title: data.message, timer: 1400, showConfirmButton: false });
        setNouvelle(false);
        setNom("");
        setChoisis([]);
        setDebut("");
        setFin("");
        charger();
    };

    const arreter = async (promotion: Promotion) => {
        const { isConfirmed } = await Swal.fire({
            icon: "question",
            title: `Arrêter « ${promotion.name} » ?`,
            text: promotion.status === "active" ? "Les prix d'avant reviennent tout de suite." : "Elle ne commencera pas.",
            showCancelButton: true,
            confirmButtonText: "Arrêter",
            cancelButtonText: "Garder",
        });

        if (!isConfirmed) return;

        const { data } = await api.postData(`${boutique}/promotions/stop`, { promotion_id: promotion.short_id });

        if (!data.success) return erreur(data);

        charger();
    };

    const basculer = (id: number) => setChoisis((avant) => (avant.includes(id) ? avant.filter((x) => x !== id) : [...avant, id]));

    const tauxNombre = Math.min(90, Math.max(0, Number(taux) || 0));

    // ------------------------------------------------------------ les codes

    const enregistrerCode = async () => {
        if (!code) return;

        const nombre = (v: string) => (v.trim() === "" ? null : Number(v));

        const { data } = await api.postData(`v3/merchant/${merchantId}/promo-codes`, {
            id: code.id,
            code: code.code,
            description: code.description || null,
            type: code.type,
            value: Number(code.value),
            max_discount: nombre(code.max_discount),
            min_subtotal: nombre(code.min_subtotal) ?? 0,
            starts_at: code.starts_at || null,
            ends_at: code.ends_at || null,
            max_uses: nombre(code.max_uses),
            max_uses_per_user: nombre(code.max_uses_per_user) ?? 1,
            first_order_only: code.first_order_only,
            store_id: code.this_store_only ? storeId : null,
            ticket_headline: code.ticket_headline.trim() || null,
            ticket_text: code.ticket_text.trim() || null,
            ticket_color: code.ticket_color || null,
        });

        if (!data.success) return erreur(data);

        Swal.fire({ icon: "success", title: data.message, timer: 1400, showConfirmButton: false });
        setCode(null);
        charger();
    };

    const suspendre = async (c: Code) => {
        const { data } = await api.postData(`v3/merchant/${merchantId}/promo-codes/toggle`, { id: c.id, is_active: !c.is_active });

        if (!data.success) return erreur(data);

        charger();
    };

    const modifierCode = (c: Code) =>
        setCode({
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
            this_store_only: c.store_id !== null,
            ticket_headline: c.ticket_headline ?? "",
            ticket_text: c.ticket_text ?? "",
            ticket_color: c.ticket_color ?? "#FF1A1A",
        });

    const coutTotal = useMemo(() => codes.reduce((s, c) => s + c.discount_given, 0), [codes]);

    return (
        <div className="space-y-10">
            {/* ------------------------------------------------ promotions par lot */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Promotions — {storeName}</h2>
                        <p className="text-sm text-slate-500">Un taux sur une sélection de produits, pour une période. Les prix reviennent seuls à la fin.</p>
                    </div>
                    {!nouvelle && (
                        <button onClick={() => setNouvelle(true)} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium dark:bg-white dark:text-slate-900">
                            Nouvelle promotion
                        </button>
                    )}
                </div>

                {nouvelle && (
                    <div className="p-6 mb-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <label className="md:col-span-2">
                                <span className="text-xs font-semibold uppercase text-slate-500">Nom</span>
                                <input className={champ} value={nom} placeholder="Semaine de la pizza" onChange={(e) => setNom(e.target.value)} />
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Remise (%)</span>
                                <input className={champ} value={taux} inputMode="numeric" onChange={(e) => setTaux(e.target.value)} />
                            </label>
                            <div />
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Début</span>
                                <input type="datetime-local" className={champ} value={debut} onChange={(e) => setDebut(e.target.value)} />
                                <span className="text-xs text-slate-400">Vide : tout de suite</span>
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Fin</span>
                                <input type="datetime-local" className={champ} value={fin} onChange={(e) => setFin(e.target.value)} />
                                <span className="text-xs text-slate-400">Vide : jusqu'à ce que vous l'arrêtiez</span>
                            </label>
                        </div>

                        <p className="text-xs font-semibold uppercase text-slate-500 mt-6 mb-2">
                            Produits ({choisis.length} choisi{choisis.length > 1 ? "s" : ""})
                        </p>
                        <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                            {produits.map((p) => (
                                <label key={p.id} className="flex items-center gap-3 px-4 py-2 cursor-pointer">
                                    <input type="checkbox" checked={choisis.includes(p.id)} onChange={() => basculer(p.id)} />
                                    <span className="flex-1 text-sm text-slate-900 dark:text-white">{p.name}</span>
                                    <span className="text-sm text-slate-400 line-through">{choisis.includes(p.id) && tauxNombre > 0 ? francs(p.price) : ""}</span>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 w-24 text-right">
                                        {choisis.includes(p.id) && tauxNombre > 0 ? francs(remise(p.price, tauxNombre)) : francs(p.price)}
                                    </span>
                                </label>
                            ))}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setNouvelle(false)} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300">
                                Annuler
                            </button>
                            <button
                                onClick={lancer}
                                disabled={!nom.trim() || choisis.length === 0 || tauxNombre < 1}
                                className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 dark:bg-white dark:text-slate-900"
                            >
                                Lancer la promotion
                            </button>
                        </div>
                    </div>
                )}

                {promotions.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune promotion pour le moment.</p>
                ) : (
                    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                        {promotions.map((p) => (
                            <div key={p.short_id} className="flex items-center gap-4 px-5 py-4">
                                <span className="text-lg font-bold text-red-600 w-16">-{p.percent} %</span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-900 dark:text-white">{p.name}</p>
                                    <p className="text-xs text-slate-500 truncate">
                                        {date(p.starts_at)} → {p.ends_at ? date(p.ends_at) : "sans fin"} · {p.products.map((x) => x.name).join(", ")}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUTS[p.status].classe}`}>{STATUTS[p.status].libelle}</span>
                                {(p.status === "scheduled" || p.status === "active") && (
                                    <button onClick={() => arreter(p)} className="text-sm text-red-600">
                                        Arrêter
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ------------------------------------------------------ codes promo */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Codes promo</h2>
                        <p className="text-sm text-slate-500">
                            Valables dans vos boutiques et à votre charge — {francs(coutTotal)} de remises accordées à ce jour.
                        </p>
                    </div>
                    {!code && (
                        <button onClick={() => setCode({ ...codeVide })} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium dark:bg-white dark:text-slate-900">
                            Nouveau code
                        </button>
                    )}
                </div>

                {code && (
                    <div className="p-6 mb-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Code</span>
                                <input className={`${champ} uppercase`} value={code.code} placeholder="MAMA20" onChange={(e) => setCode({ ...code, code: e.target.value })} />
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Type</span>
                                <select className={champ} value={code.type} onChange={(e) => setCode({ ...code, type: e.target.value as "percent" | "amount" })}>
                                    <option value="percent">Pourcentage</option>
                                    <option value="amount">Montant fixe</option>
                                </select>
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">{code.type === "percent" ? "Remise (%)" : "Remise (F)"}</span>
                                <input className={champ} value={code.value} inputMode="numeric" onChange={(e) => setCode({ ...code, value: e.target.value })} />
                            </label>
                            {code.type === "percent" ? (
                                <label>
                                    <span className="text-xs font-semibold uppercase text-slate-500">Plafond (F)</span>
                                    <input className={champ} value={code.max_discount} placeholder="aucun" inputMode="numeric" onChange={(e) => setCode({ ...code, max_discount: e.target.value })} />
                                </label>
                            ) : (
                                <div />
                            )}
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Panier minimum (F)</span>
                                <input className={champ} value={code.min_subtotal} placeholder="aucun" inputMode="numeric" onChange={(e) => setCode({ ...code, min_subtotal: e.target.value })} />
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Début</span>
                                <input type="datetime-local" className={champ} value={code.starts_at} onChange={(e) => setCode({ ...code, starts_at: e.target.value })} />
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Fin</span>
                                <input type="datetime-local" className={champ} value={code.ends_at} onChange={(e) => setCode({ ...code, ends_at: e.target.value })} />
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Utilisations au total</span>
                                <input className={champ} value={code.max_uses} placeholder="illimitées" inputMode="numeric" onChange={(e) => setCode({ ...code, max_uses: e.target.value })} />
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Par client</span>
                                <input className={champ} value={code.max_uses_per_user} inputMode="numeric" onChange={(e) => setCode({ ...code, max_uses_per_user: e.target.value })} />
                                <span className="text-xs text-slate-400">0 : illimité</span>
                            </label>
                            <label className="md:col-span-3">
                                <span className="text-xs font-semibold uppercase text-slate-500">Description (pour vous)</span>
                                <input className={champ} value={code.description} onChange={(e) => setCode({ ...code, description: e.target.value })} />
                            </label>
                        </div>

                        <div className="flex flex-wrap gap-6 mt-4">
                            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                                <input type="checkbox" checked={code.first_order_only} onChange={(e) => setCode({ ...code, first_order_only: e.target.checked })} />
                                Première commande seulement
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                                <input type="checkbox" checked={code.this_store_only} onChange={(e) => setCode({ ...code, this_store_only: e.target.checked })} />
                                Seulement chez {storeName}
                            </label>
                        </div>

                        {/* Le ticket : Ongo peut mettre le code en avant par une bannière d'entrée. */}
                        <details className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <summary className="text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer">Ticket du code (s'il est mis en avant sur l'accueil)</summary>
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6 mt-4">
                                <div className="space-y-4">
                                    <label className="block">
                                        <span className="text-xs font-semibold uppercase text-slate-500">Grand titre</span>
                                        <input className={champ} value={code.ticket_headline} maxLength={60} placeholder={titreParDefaut(code).titre} onChange={(e) => setCode({ ...code, ticket_headline: e.target.value })} />
                                    </label>
                                    <label className="block">
                                        <span className="text-xs font-semibold uppercase text-slate-500">Texte</span>
                                        <textarea className={champ} rows={2} maxLength={200} value={code.ticket_text} placeholder="Laissé vide, il se déduit du code" onChange={(e) => setCode({ ...code, ticket_text: e.target.value })} />
                                    </label>
                                    <label className="block">
                                        <span className="text-xs font-semibold uppercase text-slate-500">Couleur</span>
                                        <input type="color" className="block mt-1 h-10 w-20 rounded" value={code.ticket_color} onChange={(e) => setCode({ ...code, ticket_color: e.target.value })} />
                                    </label>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900">
                                    <PromoTicketPreview form={code} />
                                </div>
                            </div>
                        </details>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setCode(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300">
                                Annuler
                            </button>
                            <button
                                onClick={enregistrerCode}
                                disabled={!code.code.trim() || !code.value}
                                className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 dark:bg-white dark:text-slate-900"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </div>
                )}

                {codes.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun code pour le moment.</p>
                ) : (
                    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs uppercase text-slate-500 text-left">
                                <tr>
                                    <th className="px-5 py-3">Code</th>
                                    <th className="px-5 py-3">Remise</th>
                                    <th className="px-5 py-3">Conditions</th>
                                    <th className="px-5 py-3">Utilisations</th>
                                    <th className="px-5 py-3">Coût</th>
                                    <th className="px-5 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {codes.map((c) => (
                                    <tr key={c.id} className={c.is_active ? "" : "opacity-50"}>
                                        <td className="px-5 py-3 font-mono font-semibold text-slate-900 dark:text-white">{c.code}</td>
                                        <td className="px-5 py-3 text-slate-700 dark:text-slate-200">{c.label}</td>
                                        <td className="px-5 py-3 text-xs text-slate-500">
                                            {[
                                                c.min_subtotal ? `dès ${francs(c.min_subtotal)}` : null,
                                                c.first_order_only ? "1re commande" : null,
                                                c.ends_at ? `jusqu'au ${date(c.ends_at)}` : null,
                                                c.store_id ? "une boutique" : "toutes vos boutiques",
                                            ]
                                                .filter(Boolean)
                                                .join(" · ")}
                                        </td>
                                        <td className="px-5 py-3 text-slate-700 dark:text-slate-200">
                                            {c.uses}
                                            {c.max_uses ? ` / ${c.max_uses}` : ""}
                                        </td>
                                        <td className="px-5 py-3 text-slate-700 dark:text-slate-200">{francs(c.discount_given)}</td>
                                        <td className="px-5 py-3 text-right whitespace-nowrap">
                                            <button onClick={() => modifierCode(c)} className="text-sm text-slate-600 dark:text-slate-300 mr-4">
                                                Modifier
                                            </button>
                                            <button onClick={() => suspendre(c)} className="text-sm text-slate-900 dark:text-white">
                                                {c.is_active ? "Suspendre" : "Réactiver"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
