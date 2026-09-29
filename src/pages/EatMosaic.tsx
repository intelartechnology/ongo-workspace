import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";

/**
 * La mosaïque d'accueil, vue d'en haut.
 *
 * Elle se règle à trois endroits — les deux verticales dans les Réglages, les
 * rubriques dans leur écran, les places vendues dans la régie — parce que ces
 * trois-là n'ont pas le même cycle de vie : une verticale ne disparaît jamais,
 * une rubrique s'efface d'elle-même quand elle est vide, une campagne se relit
 * et expire.
 *
 * Ce qui manquait n'était donc pas un formulaire de plus, mais un écran pour
 * **voir** : quelles cases existent, qui les occupe à telle heure, et où aller
 * les changer. Chaque tuile porte son bouton vers le bon formulaire — un écran
 * qui montre un problème sans dire où le corriger est pire que pas d'écran.
 */

interface Tuile {
    kind: string;
    key: string;
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
    image: string | null;
    tint: string | null;
    tint_dark: string | null;
    source?: string;
    where?: string;
    merchant_name?: string | null;
    section_title?: string | null;
    reason?: string;
}

interface Endormie {
    id: number;
    label: string;
    place: number;
    reason: string;
}

interface Mosaique {
    hour: number;
    night: boolean;
    rows: number;
    columns: number;
    /** La hauteur qu'on regarde, et celle qui est enregistrée. */
    budget: number;
    saved: number;
    tiles: Tuile[];
    rail: Tuile[];
    asleep: Endormie[];
}

interface Props {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

/**
 * Là où chaque nature de tuile se règle.
 *
 * Le chemin porte l'identifiant quand il y en a un : une tuile nommée
 * « Promos » renvoie sur une rangée intitulée « ELITE CLUB & DISTRICT CI », et
 * envoyer vers la liste laisserait chercher dans quinze lignes celle qui
 * correspond.
 */
const OU: Record<string, { ecran: string; chemin: (ou?: string) => string }> = {
    settings: { ecran: "Réglages", chemin: () => "/settings" },
    section: { ecran: "Ouvrir la rubrique", chemin: (ou) => `/eat-sections?open=${ou ?? ""}` },
    sponsorship: { ecran: "Ouvrir la campagne", chemin: () => "/eat-sponsorships" },
    stores: { ecran: "Boutiques", chemin: () => "/eat-stores" },
};

const HEURES = [8, 12, 15, 21];

/** L'encre se déduit du fond, comme dans l'application. */
const encre = (fond: string | null): string => {
    const c = (fond || "#EDEFF2").replace("#", "");

    if (!/^[0-9a-fA-F]{6}$/.test(c)) return "#14110D";

    const canal = (i: number) => {
        const x = parseInt(c.slice(i, i + 2), 16) / 255;

        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    };

    return 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4) > 0.45 ? "#14110D" : "#FFFFFF";
};

export default function EatMosaic({ onLogout, theme, toggleTheme }: Props) {
    const [mosaique, setMosaique] = useState<Mosaique | null>(null);
    const [heure, setHeure] = useState<number | null>(null);
    // Nul tant qu'on n'a rien demandé : le serveur répond alors avec la
    // hauteur enregistrée, et c'est elle qu'on voit.
    const [rangees, setRangees] = useState<number | null>(null);
    const [chargement, setChargement] = useState(true);

    const api = new ApiService();
    const aller = useNavigate();

    const charger = async () => {
        setChargement(true);

        try {
            const params = new URLSearchParams();

            if (rangees !== null) params.set("rows", String(rangees));
            if (heure !== null) params.set("hour", String(heure));

            const { data } = await api.getData(`v3/admin/eat/mosaic?${params}`);

            if (data.success) setMosaique(data.data);
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Mosaïque illisible", text: String(erreur) });
        }

        setChargement(false);
    };

    useEffect(() => {
        charger();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [heure, rangees]);

    // La grille se mesure comme dans l'application : quatre colonnes, une
    // gouttière de dix, une cellule carrée.
    const LARGEUR = 360;
    const ESPACE = 10;
    const COTE = (LARGEUR - ESPACE * 3) / 4;
    const etendue = (n: number) => n * COTE + ESPACE * (n - 1);

    const bouton = "px-3 py-1.5 rounded-full text-sm font-medium transition";
    const actif = "bg-slate-900 text-white dark:bg-white dark:text-slate-900";
    const inactif = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-6 py-5">
                    <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Mosaïque d'accueil</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                        Les premières tuiles que voit un client. Elles se règlent à trois endroits selon leur
                        nature — cet écran dit qui occupe quelle case, et ouvre le bon formulaire.
                    </p>
                </div>
            </header>

            <div className="p-6">
                <div className="flex flex-wrap items-center gap-2 mb-6">
                    <span className="text-xs font-semibold uppercase text-slate-500 mr-1">Heure</span>

                    <button onClick={() => setHeure(null)} className={`${bouton} ${heure === null ? actif : inactif}`}>
                        Maintenant
                    </button>

                    {HEURES.map((h) => (
                        <button key={h} onClick={() => setHeure(h)} className={`${bouton} ${heure === h ? actif : inactif}`}>
                            {String(h).padStart(2, "0")} h
                        </button>
                    ))}

                    <span className="text-xs font-semibold uppercase text-slate-500 ml-4 mr-1">Hauteur</span>

                    {[2, 3, 4].map((r) => (
                        <button
                            key={r}
                            onClick={() => setRangees(r === mosaique?.saved ? null : r)}
                            className={`${bouton} ${mosaique?.budget === r ? actif : inactif}`}
                        >
                            {r} rangées
                            {mosaique?.saved === r && <span className="ml-1 opacity-60">·</span>}
                        </button>
                    ))}
                </div>

                {/*
                  * Dire qu'on regarde autre chose que ce qui tourne.
                  *
                  * Sans cette ligne, le bouton laisse croire que l'accueil a changé.
                  * Il n'a pas bougé : c'est un essai, et il faut aller l'enregistrer.
                  */}
                {mosaique && mosaique.budget !== mosaique.saved && (
                    <p className="-mt-3 mb-6 text-sm text-amber-700 dark:text-amber-400">
                        Aperçu sur {mosaique.budget} rangées. L'accueil en montre toujours{" "}
                        {mosaique.saved} — la hauteur se règle dans{" "}
                        <button onClick={() => aller("/settings")} className="underline font-medium">
                            Réglages
                        </button>
                        , clé <code className="font-mono text-xs">eat.mosaic_rows</code>.
                    </p>
                )}

                {chargement && <p className="text-sm text-slate-500">Lecture…</p>}

                {mosaique && !chargement && (
                    <div className="grid grid-cols-1 xl:grid-cols-[400px_minmax(0,1fr)] gap-8 items-start">
                        {/* L'écran du client, à l'échelle. */}
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                            <div className="flex items-baseline justify-between mb-4 px-1">
                                <strong className="text-slate-900 dark:text-white">Ongo Eat</strong>
                                <span className="text-xs font-mono text-slate-400">
                                    {String(mosaique.hour).padStart(2, "0")}:00 · {mosaique.night ? "nuit" : "jour"}
                                </span>
                            </div>

                            <div
                                className="relative mx-auto"
                                style={{ width: LARGEUR, maxWidth: "100%", height: etendue(mosaique.rows) }}
                            >
                                {mosaique.tiles.map((t) => {
                                    const fond = (mosaique.night ? t.tint_dark : t.tint) || "#EDEFF2";

                                    return (
                                        <div
                                            key={t.key}
                                            className="absolute rounded-2xl overflow-hidden"
                                            style={{
                                                left: t.x * (COTE + ESPACE),
                                                top: t.y * (COTE + ESPACE),
                                                width: etendue(t.w),
                                                height: etendue(t.h),
                                                background: fond,
                                            }}
                                        >
                                            {t.image && (
                                                <img
                                                    src={t.image}
                                                    alt=""
                                                    className="absolute object-contain"
                                                    style={{
                                                        width: t.w > t.h * 1.3 ? undefined : etendue(t.w) * 0.6,
                                                        height: t.w > t.h * 1.3 ? etendue(t.h) * 1.04 : undefined,
                                                        top: etendue(t.h) * 0.06,
                                                        right: -etendue(t.w) * 0.05,
                                                    }}
                                                />
                                            )}
                                            <span
                                                className="absolute left-3.5 right-3.5 bottom-3.5 font-extrabold leading-tight"
                                                style={{ color: encre(fond), fontSize: t.w >= 2 && t.h >= 2 ? 19 : 15 }}
                                            >
                                                {t.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {mosaique.rail.length > 0 && (
                                <>
                                    <p className="text-xs font-bold tracking-wide text-slate-400 mt-5 mb-2">
                                        {mosaique.rail.some((x) => x.kind !== "store")
                                            ? `RACCOURCIS · ${mosaique.rail.length}`
                                            : `ENSEIGNES PARTENAIRES · ${mosaique.rail.length}`}
                                    </p>
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {mosaique.rail.map((x) => (
                                            <div key={x.key} className="shrink-0 w-[76px]">
                                                <div className="h-[76px] rounded-xl bg-slate-100 dark:bg-slate-800 grid place-items-center font-mono text-sm text-slate-500">
                                                    {x.kind === "store"
                                                        ? x.label.split(" ").map((m) => m[0]).join("").slice(0, 2).toUpperCase()
                                                        : "§"}
                                                </div>
                                                <p className="text-[11px] font-semibold text-center mt-1 leading-tight text-slate-600 dark:text-slate-300 line-clamp-2">
                                                    {x.label}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="space-y-5">
                            {/* Qui occupe quoi, et où le changer. */}
                            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                                    Les cases occupées
                                </h2>

                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {mosaique.tiles.map((t) => {
                                        const ou = OU[t.source ?? ""] ?? null;

                                        return (
                                            <div key={t.key} className="py-3 flex items-center gap-3 flex-wrap">
                                                <span
                                                    className="w-8 h-8 rounded-lg shrink-0 border border-black/5"
                                                    style={{ background: (mosaique.night ? t.tint_dark : t.tint) || "#EDEFF2" }}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                        {t.label}
                                                        {t.merchant_name && (
                                                            <span className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                                                                vendue à {t.merchant_name}
                                                            </span>
                                                        )}
                                                    </p>
                                                    {/*
                                                      * Le titre de la rangée, quand il diffère du nom
                                                      * de la tuile. Sans lui, « Promos » est
                                                      * introuvable dans un écran où la rangée
                                                      * s'appelle « ELITE CLUB & DISTRICT CI ».
                                                      */}
                                                    {t.section_title && t.section_title !== t.label && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                            rangée : {t.section_title}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-slate-400 font-mono">
                                                        {t.w}×{t.h} en {t.x},{t.y}
                                                        {!t.image && " · aucune découpe"}
                                                    </p>
                                                </div>

                                                {ou && (
                                                    <button
                                                        onClick={() => aller(ou.chemin(t.where))}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 shrink-0"
                                                    >
                                                        {ou.ecran} ›
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/*
                              * Ce qui défile au lieu d'être posé.
                              *
                              * La rangée ne perd rien, mais elle ne se voit pas : une
                              * rubrique qu'on a pris le temps de régler et qui finit là
                              * ressemble à un réglage raté. Dire la raison évite de la
                              * chercher dans le formulaire, où elle n'est pas.
                              */}
                            {mosaique.rail.length > 0 && (
                                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                                        Dans la rangée qui défile
                                    </h2>

                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {mosaique.rail.map((x) => (
                                            <div key={x.key} className="py-3 flex items-center gap-3 flex-wrap">
                                                <span className="text-xs font-mono text-slate-400 w-14 shrink-0">
                                                    {x.kind === "store" ? "enseigne" : "rubrique"}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                                                        {x.label}
                                                    </p>
                                                    <p className="text-xs text-slate-400">{x.reason}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/*
                              * Ce qui dort.
                              *
                              * Une tuile absente parce qu'elle est hors de sa fenêtre n'est pas un
                              * oubli de réglage. Le dire évite d'aller la chercher.
                              */}
                            {mosaique.asleep.length > 0 && (
                                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                                        Réglées, mais pas visibles à cette heure
                                    </h2>

                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {mosaique.asleep.map((d) => (
                                            <div key={d.id} className="py-3 flex items-center gap-3 flex-wrap">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">
                                                        {d.label}
                                                    </p>
                                                    <p className="text-xs text-slate-400">
                                                        place {d.place} · {d.reason}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => aller(`/eat-sections?open=${d.id}`)}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 shrink-0"
                                                >
                                                    Rubriques ›
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-5">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                                    Ce qu'il faut savoir
                                </h2>
                                <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2 list-disc pl-4">
                                    <li>
                                        <b>Les places 1 et 2 ne se règlent pas ici</b> : « Restaurants » et
                                        « Magasins » sont les deux portes du service et ne bougent jamais.
                                    </li>
                                    <li>
                                        <b>À deux rangées, une seule rubrique entre.</b> Les autres attendent dans
                                        la rangée qui défile — rien ne se perd, mais rien ne se voit non plus.
                                    </li>
                                    <li>
                                        <b>Une place vendue évince la rubrique</b> qui l'occupait, et la lui rend à
                                        la fin de la campagne.
                                    </li>
                                    <li>
                                        <b>Une découpe doit être détourée</b>, à fond transparent. Une photo jpg est
                                        conservée mais pas affichée.
                                    </li>
                                </ul>
                            </section>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
