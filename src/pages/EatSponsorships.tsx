import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import { Carte } from "./components/BannerPreview";
import SponsorshipForm from "./components/SponsorshipForm";
import type { Sponsoring, Cibles } from "./components/SponsorshipForm";

/**
 * La régie, de bout en bout : ce qui attend, ce qui tourne, ce que ça rapporte.
 *
 * **Un seul écran.** Séparer « valider » de « suivre » obligeait à changer de
 * page entre le moment où l'on accepte une campagne et celui où l'on vérifie
 * qu'elle a servi à quelque chose — et personne ne faisait le second.
 *
 * **Ongo compose aussi pour ses marchands** : un commercial qui vend un
 * emplacement au téléphone ne va pas demander au restaurateur de le saisir
 * lui-même. Ce qu'Ongo compose part accepté — personne n'a à se relire.
 */

interface Props {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

interface Totaux {
    pending: number;
    live: number;
    scheduled: number;
    merchants: number;
    impressions: number;
    clicks: number;
}

/** Où en est un sponsoring — le statut seul ne suffit pas à le dire. */
const ETATS: Record<string, { libelle: string; classe: string }> = {
    pending: { libelle: "À relire", classe: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
    live: { libelle: "En ligne", classe: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
    scheduled: { libelle: "Programmé", classe: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400" },
    paused: { libelle: "Suspendu", classe: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
    ended: { libelle: "Terminé", classe: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
    rejected: { libelle: "Refusé", classe: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400" },
};

const FORMES: Record<string, string> = {
    banner: "Bannière",
    store: "Enseigne poussée",
    products: "Articles mis en avant",
    section: "Rayon mis en avant",
    mosaic: "Tuile d'accueil",
};

const AUDIENCES: Record<string, string> = {
    all: "Tout le monde",
    new: "Nouveaux clients",
    returning: "Clients fidèles",
    dormant: "Clients à reconquérir",
};

/** Les onglets, dans l'ordre où l'on s'en occupe. */
const FILTRES: { cle: string; libelle: string; etats: string[] }[] = [
    { cle: "pending", libelle: "À relire", etats: ["pending"] },
    { cle: "live", libelle: "En ligne", etats: ["live"] },
    { cle: "scheduled", libelle: "Programmés", etats: ["scheduled"] },
    { cle: "done", libelle: "Terminés", etats: ["ended", "paused", "rejected"] },
    { cle: "all", libelle: "Tous", etats: [] },
];

const nombre = (valeur: number | null) => (valeur ?? 0).toLocaleString("fr-FR");

const periode = (debut: string | null, fin: string | null) =>
    debut || fin
        ? `${debut ? `du ${new Date(debut).toLocaleDateString("fr-FR")} ` : ""}${fin ? `au ${new Date(fin).toLocaleDateString("fr-FR")}` : ""}`
        : "Permanent";

export default function EatSponsorships({ onLogout, theme, toggleTheme }: Props) {
    const [sponsorings, setSponsorings] = useState<Sponsoring[]>([]);
    const [totaux, setTotaux] = useState<Totaux | null>(null);
    const [jours, setJours] = useState<number>(30);
    const [cibles, setCibles] = useState<Cibles | null>(null);
    const [filtre, setFiltre] = useState<string>("pending");
    const [form, setForm] = useState<Sponsoring | null | "nouveau">(null);
    const [chargement, setChargement] = useState(true);

    const api = new ApiService();

    const charger = async () => {
        setChargement(true);

        try {
            const [liste, options] = await Promise.all([
                api.getData("v3/admin/eat/sponsorships"),
                api.getData("v3/admin/eat/sponsorships/targets"),
            ]);

            if (liste.data.success) {
                setSponsorings(liste.data.data.sponsorships ?? []);
                setTotaux(liste.data.data.totals ?? null);
                setJours(liste.data.data.days ?? 30);
            } else {
                Swal.fire({ icon: "error", title: liste.data.message });
            }

            if (options.data.success) setCibles(options.data.data);
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Sponsorings illisibles", text: String(erreur) });
        }

        setChargement(false);
    };

    useEffect(() => {
        charger();
    }, []);

    /**
     * Accepter, ou refuser en disant pourquoi.
     *
     * Le motif est obligatoire : sans lui, le marchand repropose la même
     * chose, et quelqu'un relit deux fois le même visuel.
     */
    const decider = async (cible: Sponsoring, decision: "approved" | "rejected") => {
        let motif = "";

        if (decision === "rejected") {
            const reponse = await Swal.fire({
                icon: "question",
                title: `Refuser « ${cible.title} » ?`,
                input: "text",
                inputLabel: "Pourquoi ? Le marchand le lira.",
                inputPlaceholder: "Visuel illisible, promesse non tenable…",
                showCancelButton: true,
                confirmButtonText: "Refuser",
                cancelButtonText: "Annuler",
                inputValidator: (valeur) => (valeur.trim() === "" ? "Dites pourquoi" : null),
            });

            if (!reponse.isConfirmed) return;

            motif = String(reponse.value ?? "");
        }

        const { data } = await api.postData("v3/admin/eat/sponsorships/review", {
            id: cible.id,
            status: decision,
            review_note: motif,
        });

        if (!data.success) {
            Swal.fire({ icon: "error", title: data.message });

            return;
        }

        charger();
    };

    const basculer = async (s: Sponsoring) => {
        const { data } = await api.postData("v3/admin/eat/sponsorships/toggle", {
            id: s.id,
            is_active: !s.is_active,
        });

        if (!data.success) {
            Swal.fire({ icon: "error", title: data.message });

            return;
        }

        charger();
    };

    const supprimer = async (s: Sponsoring) => {
        const reponse = await Swal.fire({
            icon: "warning",
            title: `Supprimer « ${s.title} » ?`,
            text: "Ses mesures partent avec lui.",
            showCancelButton: true,
            confirmButtonText: "Supprimer",
            cancelButtonText: "Annuler",
        });

        if (!reponse.isConfirmed) return;

        const { data } = await api.postData("v3/admin/eat/sponsorships/delete", { id: s.id });

        if (!data.success) {
            Swal.fire({ icon: "error", title: data.message });

            return;
        }

        charger();
    };

    const visibles = useMemo(() => {
        const regle = FILTRES.find((f) => f.cle === filtre);

        if (!regle || regle.etats.length === 0) return sponsorings;

        return sponsorings.filter((s) => regle.etats.includes(s.state));
    }, [sponsorings, filtre]);

    const carte = (titre: string, valeur: string, legende?: string) => (
        <div className="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase text-slate-500">{titre}</p>
            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{valeur}</p>
            {legende && <p className="text-xs text-slate-500 mt-1">{legende}</p>}
        </div>
    );

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Sponsorings</h1>
                    <p className="text-sm text-slate-500 mt-1 max-w-3xl">
                        Ce que les marchands achètent pour se montrer : les demandes à relire, ce qui tourne en ce
                        moment, et ce que chaque campagne a rapporté. Vous pouvez aussi en composer un pour un marchand
                        — il part accepté.
                    </p>
                </div>

                <button
                    onClick={() => setForm("nouveau")}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium shrink-0 dark:bg-white dark:text-slate-900"
                >
                    Nouveau sponsoring
                </button>
            </header>

            <main className="px-8 py-8 max-w-6xl">
                {chargement ? (
                    <p className="text-slate-500">Chargement…</p>
                ) : (
                    <>
                        {totaux && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                {carte("À relire", nombre(totaux.pending), "En attente de décision")}
                                {carte("En ligne", nombre(totaux.live), `${nombre(totaux.scheduled)} programmés`)}
                                {carte("Marchands", nombre(totaux.merchants), "Ont au moins un sponsoring")}
                                {carte(
                                    "Vues",
                                    nombre(totaux.impressions),
                                    `${nombre(totaux.clicks)} clics · ${jours} jours`,
                                )}
                            </div>
                        )}

                        <nav className="flex gap-2 mb-6 overflow-x-auto whitespace-nowrap">
                            {FILTRES.map((f) => {
                                const combien =
                                    f.etats.length === 0
                                        ? sponsorings.length
                                        : sponsorings.filter((s) => f.etats.includes(s.state)).length;

                                return (
                                    <button
                                        key={f.cle}
                                        onClick={() => setFiltre(f.cle)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                                            filtre === f.cle
                                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                                : "text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
                                        }`}
                                    >
                                        {f.libelle} {combien > 0 && <span className="opacity-60">· {combien}</span>}
                                    </button>
                                );
                            })}
                        </nav>

                        {visibles.length === 0 ? (
                            <div className="py-16 text-center">
                                <span className="material-symbols-outlined text-[48px] text-slate-300 dark:text-slate-700">
                                    done_all
                                </span>
                                <p className="text-slate-500 mt-2">Rien ici.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {visibles.map((s) => {
                                    const etat = ETATS[s.state] ?? ETATS.pending;

                                    return (
                                        <article
                                            key={s.id}
                                            className="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                                        >
                                            <div className="flex items-start gap-5">
                                                <div className="w-48 shrink-0">
                                                    {s.kind === "banner" && s.banner ? (
                                                        <Carte
                                                            banniere={s.banner}
                                                            h={s.banner.format === "square" ? 192 : 96}
                                                        />
                                                    ) : s.kind === "products" ? (
                                                        <div className="grid grid-cols-2 gap-1.5">
                                                            {s.products.slice(0, 4).map((a) => (
                                                                <div
                                                                    key={a.id}
                                                                    className="rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-square"
                                                                >
                                                                    {a.image && (
                                                                        <img
                                                                            src={a.image}
                                                                            alt=""
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="h-24 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-slate-400">
                                                                storefront
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <p className="text-xs font-semibold uppercase text-slate-400">
                                                                {FORMES[s.kind] ?? s.kind}
                                                            </p>
                                                            <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                                                                {s.title}
                                                            </p>
                                                        </div>

                                                        <span
                                                            className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${etat.classe}`}
                                                        >
                                                            {etat.libelle}
                                                        </span>
                                                    </div>

                                                    {s.state === "rejected" && s.review_note && (
                                                        <p className="mt-2 px-3 py-2 rounded-lg text-sm bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                                                            {s.review_note}
                                                        </p>
                                                    )}

                                                    <dl className="mt-3 text-sm text-slate-500 space-y-1">
                                                        <div>
                                                            <dt className="inline font-medium">Marchand : </dt>
                                                            <dd className="inline">
                                                                {s.merchant_name ?? "—"} · {s.store_name ?? "—"}
                                                            </dd>
                                                        </div>
                                                        <div>
                                                            <dt className="inline font-medium">Ce qui est poussé : </dt>
                                                            <dd className="inline">{s.target_label ?? "—"}</dd>
                                                        </div>
                                                        <div>
                                                            <dt className="inline font-medium">À qui : </dt>
                                                            <dd className="inline">
                                                                {AUDIENCES[s.audience] ?? s.audience}
                                                            </dd>
                                                        </div>
                                                        <div>
                                                            <dt className="inline font-medium">Période : </dt>
                                                            <dd className="inline">{periode(s.starts_at, s.ends_at)}</dd>
                                                        </div>
                                                    </dl>

                                                    {/*
                                                        Les mesures n'existent que pour une bannière.
                                                        Un tiret plutôt qu'un zéro : une enseigne
                                                        poussée est aussi vue ailleurs sur l'accueil,
                                                        et lui attribuer ces vues ferait un chiffre
                                                        flatteur mais faux.
                                                    */}
                                                    <div className="flex gap-6 mt-3 text-sm">
                                                        <span className="text-slate-500">
                                                            Vues{" "}
                                                            <b className="text-slate-900 dark:text-white">
                                                                {s.impressions === null ? "—" : nombre(s.impressions)}
                                                            </b>
                                                        </span>
                                                        <span className="text-slate-500">
                                                            Clics{" "}
                                                            <b className="text-slate-900 dark:text-white">
                                                                {s.clicks === null ? "—" : nombre(s.clicks)}
                                                            </b>
                                                        </span>
                                                        {s.impressions !== null && s.impressions > 0 && (
                                                            <span className="text-slate-500">
                                                                Taux{" "}
                                                                <b className="text-slate-900 dark:text-white">
                                                                    {(((s.clicks ?? 0) / s.impressions) * 100).toFixed(1)} %
                                                                </b>
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap gap-3 mt-4">
                                                        {s.state === "pending" && (
                                                            <>
                                                                <button
                                                                    onClick={() => decider(s, "approved")}
                                                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white"
                                                                >
                                                                    Accepter
                                                                </button>
                                                                <button
                                                                    onClick={() => decider(s, "rejected")}
                                                                    className="px-4 py-2 rounded-lg text-sm font-medium border border-rose-300 text-rose-600 dark:border-rose-900"
                                                                >
                                                                    Refuser
                                                                </button>
                                                            </>
                                                        )}

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
                                                        <button
                                                            onClick={() => supprimer(s)}
                                                            className="px-3 py-1.5 rounded-lg text-sm text-rose-600"
                                                        >
                                                            Supprimer
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}

                        {form !== null && cibles && (
                            <SponsorshipForm
                                cibles={cibles}
                                sponsoring={form === "nouveau" ? null : form}
                                onClose={() => setForm(null)}
                                onSaved={() => {
                                    setForm(null);
                                    charger();
                                }}
                            />
                        )}
                    </>
                )}
            </main>
        </MainLayout>
    );
}
