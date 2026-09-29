import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";
import { Carte } from "../components/BannerPreview";
import SponsorshipForm from "../components/SponsorshipForm";
import type { Cibles, Sponsoring } from "../components/SponsorshipForm";
import { galerieMarchand } from "../../services/images";

/**
 * Ce qu'un marchand achète pour se montrer sur Ongo Eat.
 *
 * **Le même formulaire que côté Ongo** : il compose, Ongo relit. Deux
 * éditeurs auraient divergé au premier champ ajouté, et le marchand aurait
 * composé autre chose que ce que l'écran de pilotage montre.
 *
 * Rien ne paraît sans relecture, et chaque modification y repasse — une place
 * validée n'est pas un blanc-seing.
 */

interface Props {
    merchantId: string;
    canEdit: boolean;
}

const nombre = (valeur: number | null) => (valeur ?? 0).toLocaleString("fr-FR");

const FORMES: Record<string, string> = {
    banner: "Une bannière",
    store: "Mon enseigne",
    products: "Des articles",
    section: "Un rayon",
    mosaic: "Une tuile d'accueil",
};

const AUDIENCES: Record<string, string> = {
    all: "Tout le monde",
    new: "Nouveaux clients",
    returning: "Clients fidèles",
    dormant: "Clients à reconquérir",
};

const ETAT: Record<string, { libelle: string; classe: string; aide: string }> = {
    pending: {
        libelle: "En attente",
        classe: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
        aide: "Ongo le relit. Il ne s'affiche pas encore.",
    },
    approved: {
        libelle: "Accepté",
        classe: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
        aide: "En ligne pendant sa période.",
    },
    rejected: {
        libelle: "Refusé",
        classe: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
        aide: "Corrigez et renvoyez.",
    },
};

export default function Sponsorships({ merchantId, canEdit }: Props) {
    const [sponsorings, setSponsorings] = useState<Sponsoring[]>([]);
    const [cibles, setCibles] = useState<Cibles | null>(null);
    const [marchand, setMarchand] = useState<number>(0);
    const [form, setForm] = useState<Sponsoring | null | "nouveau">(null);
    const [chargement, setChargement] = useState(true);

    const api = new ApiService();
    const base = `v3/merchant/${merchantId}`;

    const charger = async () => {
        setChargement(true);

        try {
            const [liste, options] = await Promise.all([
                api.getData(`${base}/sponsorships`),
                api.getData(`${base}/sponsorships/targets`),
            ]);

            if (liste.data.success) setSponsorings(liste.data.data ?? []);

            if (options.data.success) {
                setCibles(options.data.data);
                setMarchand(options.data.data.merchant_id ?? 0);
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Sponsorings illisibles", text: String(erreur) });
        }

        setChargement(false);
    };

    useEffect(() => {
        charger();
    }, [merchantId]);

    const basculer = async (s: Sponsoring) => {
        const { data } = await api.postData(`${base}/sponsorships/toggle`, { id: s.id, is_active: !s.is_active });

        if (!data.success) {
            Swal.fire({ icon: "error", title: data.message });

            return;
        }

        charger();
    };

    const supprimer = async (s: Sponsoring) => {
        const reponse = await Swal.fire({
            icon: "warning",
            title: "Supprimer ce sponsoring ?",
            text: "Ses mesures partent avec lui.",
            showCancelButton: true,
            confirmButtonText: "Supprimer",
            cancelButtonText: "Annuler",
        });

        if (!reponse.isConfirmed) return;

        const { data } = await api.postData(`${base}/sponsorships/delete`, { id: s.id });

        if (!data.success) {
            Swal.fire({ icon: "error", title: data.message });

            return;
        }

        charger();
    };

    if (chargement) return <p className="text-slate-500">Chargement…</p>;

    return (
        <div>
            <div className="flex items-start justify-between gap-6 mb-6">
                <p className="text-sm text-slate-500 max-w-xl">
                    Mettez votre enseigne, vos plats ou votre visuel en avant sur l'accueil d'Ongo Eat. Vous composez,
                    Ongo relit : tant que ce n'est pas accepté, rien ne s'affiche.
                </p>

                {canEdit && (
                    <button
                        onClick={() => setForm("nouveau")}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 shrink-0"
                    >
                        Nouveau sponsoring
                    </button>
                )}
            </div>

            {sponsorings.length === 0 && !form && <p className="text-slate-500">Aucun sponsoring pour l'instant.</p>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sponsorings.map((s) => {
                    const etat = ETAT[s.status] ?? ETAT.pending;

                    return (
                        <div
                            key={s.id}
                            className="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase text-slate-400">
                                        {FORMES[s.kind] ?? s.kind}
                                    </p>
                                    <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{s.title}</p>
                                </div>

                                <span className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${etat.classe}`}>
                                    {etat.libelle}
                                </span>
                            </div>

                            <p className="text-xs text-slate-500 mt-2">
                                {etat.aide}
                                {s.audience !== "all" && ` · ${AUDIENCES[s.audience]}`}
                            </p>

                            {s.status === "rejected" && s.review_note && (
                                <p className="mt-2 px-3 py-2 rounded-lg text-sm bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                                    {s.review_note}
                                </p>
                            )}

                            {s.kind === "banner" && s.banner && (
                                <div className="mt-4">
                                    <Carte banniere={s.banner} h={s.banner.format === "square" ? 200 : 140} />
                                </div>
                            )}

                            {s.kind === "products" && s.products.length > 0 && (
                                <p className="text-sm text-slate-500 mt-3">
                                    {s.products.map((a) => a.name).join(" · ")}
                                </p>
                            )}

                            <p className="text-xs text-slate-500 mt-3">
                                {s.store_name} · <b className="text-slate-700 dark:text-slate-300">{s.target_label ?? "—"}</b>
                            </p>

                            {/* Les mesures n'existent que pour une bannière : une enseigne
                                poussée est aussi vue ailleurs, et lui attribuer ces vues
                                ferait un chiffre flatteur mais faux. */}
                            {s.impressions !== null && (
                                <div className="flex gap-6 mt-2 text-sm">
                                    <span className="text-slate-500">
                                        Vues <b className="text-slate-900 dark:text-white">{nombre(s.impressions)}</b>
                                    </span>
                                    <span className="text-slate-500">
                                        Clics <b className="text-slate-900 dark:text-white">{nombre(s.clicks)}</b>
                                    </span>
                                </div>
                            )}

                            {canEdit && (
                                <div className="flex gap-3 mt-4">
                                    <button
                                        onClick={() => setForm(s)}
                                        className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 dark:border-slate-700 dark:text-white"
                                    >
                                        Modifier
                                    </button>
                                    <button
                                        onClick={() => basculer(s)}
                                        className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 dark:border-slate-700 dark:text-white"
                                    >
                                        {s.is_active ? "Suspendre" : "Relancer"}
                                    </button>
                                    <button onClick={() => supprimer(s)} className="px-3 py-1.5 rounded-lg text-sm text-rose-600">
                                        Supprimer
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {form && cibles && (
                <SponsorshipForm
                    cibles={cibles}
                    sponsoring={form === "nouveau" ? null : form}
                    merchantId={marchand}
                    base={`${base}/sponsorships`}
                    galerie={galerieMarchand(merchantId)}
                    onClose={() => setForm(null)}
                    onSaved={() => {
                        setForm(null);
                        charger();
                    }}
                />
            )}
        </div>
    );
}
