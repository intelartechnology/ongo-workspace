import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";
import Loading from "../../components/Loading";

/**
 * Les frais de livraison d'une boutique.
 *
 * Deux tarifs, selon qui livre :
 *   - **vos livreurs** : vous fixez vos frais, et vous les gardez ;
 *   - **les livreurs d'Ongo** : le tarif d'Ongo (à la distance), ou le vôtre.
 *     Le livreur est payé sur ces frais.
 *
 * Pour chacun, la livraison offerte au-delà d'un montant d'articles — elle
 * s'affiche en bandeau sur votre page, et reste à votre charge.
 */

type Mode = "ongo" | "none" | "flat" | "distance" | "tiers";
type Source = "merchant" | "platform";

interface Palier {
    up_to_km: string;
    amount: string;
}

interface Politique {
    mode: Mode;
    params: any;
    free_over: number | null;
    free_over_max_distance: number | null;
    max_distance: number | null;
}

interface Formulaire {
    mode: Mode;
    amount: string;
    base: string;
    per_km: string;
    included_km: string;
    tiers: Palier[];
    free_over: string;
    free_over_max_distance: string;
    max_distance: string;
}

interface DeliveryProps {
    merchantId: string;
    storeId: number;
}

const champ = "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white";

const texte = (valeur: number | null | undefined) => (valeur === null || valeur === undefined ? "" : String(valeur));

const versFormulaire = (politique: Politique | null, parDefaut: Mode): Formulaire => ({
    mode: politique?.mode ?? parDefaut,
    amount: texte(politique?.params?.amount),
    base: texte(politique?.params?.base),
    per_km: texte(politique?.params?.per_km),
    included_km: texte(politique?.params?.included_km),
    tiers: (politique?.params?.tiers ?? []).map((p: any) => ({ up_to_km: String(p.up_to_km), amount: String(p.amount) })),
    free_over: texte(politique?.free_over),
    free_over_max_distance: texte(politique?.free_over_max_distance),
    max_distance: texte(politique?.max_distance),
});

export default function Delivery({ merchantId, storeId }: DeliveryProps) {
    const [formulaires, setFormulaires] = useState<Record<Source, Formulaire> | null>(null);
    const [avecLivreurs, setAvecLivreurs] = useState<boolean>(false);
    const [tarifOngo, setTarifOngo] = useState<{ base: number; per_km: number; included_km: number } | null>(null);
    const [envoi, setEnvoi] = useState<Source | null>(null);

    const api = new ApiService();
    const base = `v3/merchant/${merchantId}/stores/${storeId}/delivery`;

    const charger = async () => {
        try {
            const { data } = await api.getData(base);

            if (!data.success) {
                Swal.fire({ icon: "info", title: "Non accessible", text: data.message });

                return;
            }

            setAvecLivreurs(Boolean(data.data.has_couriers));
            setTarifOngo(data.data.ongo_rates);
            setFormulaires({
                merchant: versFormulaire(data.data.merchant, "none"),
                platform: versFormulaire(data.data.platform, "ongo"),
            });
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Livraison illisible", text: String(erreur) });
        }
    };

    useEffect(() => {
        charger();
    }, [merchantId, storeId]);

    const modifier = (source: Source, changes: Partial<Formulaire>) =>
        setFormulaires((avant) => (avant ? { ...avant, [source]: { ...avant[source], ...changes } } : avant));

    const nombre = (valeur: string) => (valeur.trim() === "" ? null : Number(valeur));

    const enregistrer = async (source: Source) => {
        if (!formulaires) return;

        const f = formulaires[source];

        setEnvoi(source);

        try {
            const { data } = await api.postData(base, {
                courier_source: source,
                mode: f.mode,
                amount: nombre(f.amount),
                base: nombre(f.base),
                per_km: nombre(f.per_km),
                included_km: nombre(f.included_km),
                tiers: f.mode === "tiers" ? f.tiers.map((p) => ({ up_to_km: Number(p.up_to_km), amount: Number(p.amount) })) : null,
                free_over: nombre(f.free_over),
                free_over_max_distance: nombre(f.free_over_max_distance),
                max_distance: nombre(f.max_distance),
            });

            if (data.success) {
                Swal.fire({ icon: "success", title: data.message, timer: 1400, showConfirmButton: false });
                charger();
            } else {
                const details = data.data ? Object.values(data.data).flat().join("\n") : "";
                Swal.fire({ icon: "error", title: data.message, text: details });
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Enregistrement impossible", text: String(erreur) });
        }

        setEnvoi(null);
    };

    if (!formulaires) return <Loading />;

    const bloc = (source: Source, titre: string, legende: string) => {
        const f = formulaires[source];

        const modes: { cle: Mode; libelle: string }[] =
            source === "platform"
                ? [
                      { cle: "ongo", libelle: "Tarif d'Ongo" },
                      { cle: "flat", libelle: "Forfait" },
                      { cle: "distance", libelle: "À la distance" },
                      { cle: "tiers", libelle: "Par paliers" },
                  ]
                : [
                      { cle: "none", libelle: "Comme Ongo" },
                      { cle: "flat", libelle: "Forfait" },
                      { cle: "distance", libelle: "À la distance" },
                      { cle: "tiers", libelle: "Par paliers" },
                  ];

        return (
            <section className="p-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">{titre}</h3>
                <p className="text-sm text-slate-500 mt-1 mb-5">{legende}</p>

                <div className="flex flex-wrap gap-2 mb-5">
                    {modes.map(({ cle, libelle }) => (
                        <button
                            key={cle}
                            onClick={() => modifier(source, { mode: cle })}
                            className={`px-4 py-2 rounded-full text-sm border ${
                                f.mode === cle
                                    ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                                    : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                            }`}
                        >
                            {libelle}
                        </button>
                    ))}
                </div>

                {f.mode === "ongo" && tarifOngo && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
                        {tarifOngo.base.toLocaleString("fr-FR")} F, dont {tarifOngo.included_km} km inclus, puis{" "}
                        {tarifOngo.per_km.toLocaleString("fr-FR")} F par kilomètre. Suit les réglages d'Ongo.
                    </p>
                )}

                {f.mode === "none" && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
                        Vos livraisons sont facturées au tarif des livreurs d'Ongo ci-dessous.
                    </p>
                )}

                {f.mode === "flat" && (
                    <label className="block mb-5 max-w-xs">
                        <span className="text-xs font-semibold uppercase text-slate-500">Montant (F)</span>
                        <input className={champ} value={f.amount} onChange={(e) => modifier(source, { amount: e.target.value })} inputMode="numeric" />
                    </label>
                )}

                {f.mode === "distance" && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                        <label>
                            <span className="text-xs font-semibold uppercase text-slate-500">Base (F)</span>
                            <input className={champ} value={f.base} onChange={(e) => modifier(source, { base: e.target.value })} inputMode="numeric" />
                        </label>
                        <label>
                            <span className="text-xs font-semibold uppercase text-slate-500">Km inclus</span>
                            <input className={champ} value={f.included_km} onChange={(e) => modifier(source, { included_km: e.target.value })} inputMode="decimal" />
                        </label>
                        <label>
                            <span className="text-xs font-semibold uppercase text-slate-500">Par km suivant (F)</span>
                            <input className={champ} value={f.per_km} onChange={(e) => modifier(source, { per_km: e.target.value })} inputMode="numeric" />
                        </label>
                    </div>
                )}

                {f.mode === "tiers" && (
                    <div className="mb-5 space-y-2">
                        {f.tiers.map((palier, rang) => (
                            <div key={rang} className="flex items-center gap-3">
                                <span className="text-sm text-slate-500 w-24">Jusqu'à</span>
                                <input
                                    className={`${champ} max-w-[110px]`}
                                    value={palier.up_to_km}
                                    placeholder="km"
                                    onChange={(e) => modifier(source, { tiers: f.tiers.map((p, i) => (i === rang ? { ...p, up_to_km: e.target.value } : p)) })}
                                />
                                <span className="text-sm text-slate-500">km :</span>
                                <input
                                    className={`${champ} max-w-[140px]`}
                                    value={palier.amount}
                                    placeholder="F"
                                    onChange={(e) => modifier(source, { tiers: f.tiers.map((p, i) => (i === rang ? { ...p, amount: e.target.value } : p)) })}
                                />
                                <button className="text-sm text-red-600" onClick={() => modifier(source, { tiers: f.tiers.filter((_, i) => i !== rang) })}>
                                    Retirer
                                </button>
                            </div>
                        ))}
                        <button className="text-sm font-medium text-slate-900 dark:text-white" onClick={() => modifier(source, { tiers: [...f.tiers, { up_to_km: "", amount: "" }] })}>
                            + Ajouter un palier
                        </button>
                    </div>
                )}

                {f.mode !== "none" && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-slate-100 dark:border-slate-800">
                        <label>
                            <span className="text-xs font-semibold uppercase text-slate-500">Livraison offerte dès (F)</span>
                            <input className={champ} value={f.free_over} placeholder="aucune" onChange={(e) => modifier(source, { free_over: e.target.value })} inputMode="numeric" />
                            <span className="text-xs text-slate-400">D'articles. À votre charge, affiché en bandeau.</span>
                        </label>
                        <label>
                            <span className="text-xs font-semibold uppercase text-slate-500">…jusqu'à (km)</span>
                            <input
                                className={champ}
                                value={f.free_over_max_distance}
                                placeholder="sans limite"
                                disabled={f.free_over.trim() === ""}
                                onChange={(e) => modifier(source, { free_over_max_distance: e.target.value })}
                                inputMode="decimal"
                            />
                        </label>
                        <label>
                            <span className="text-xs font-semibold uppercase text-slate-500">Ne pas livrer au-delà de (km)</span>
                            <input className={champ} value={f.max_distance} placeholder="sans limite" onChange={(e) => modifier(source, { max_distance: e.target.value })} inputMode="decimal" />
                        </label>
                    </div>
                )}

                <div className="flex justify-end mt-6">
                    <button
                        onClick={() => enregistrer(source)}
                        disabled={envoi !== null}
                        className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-50 dark:bg-white dark:text-slate-900"
                    >
                        {envoi === source ? "Enregistrement…" : "Enregistrer"}
                    </button>
                </div>
            </section>
        );
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {avecLivreurs &&
                bloc("merchant", "Quand vos livreurs livrent", "Vous fixez vos frais, et vous les gardez en entier.")}
            {bloc(
                "platform",
                "Quand un livreur d'Ongo livre",
                "Le livreur est payé sur ces frais, comme sur une course. Gardez le tarif d'Ongo ou posez le vôtre."
            )}
        </div>
    );
}
