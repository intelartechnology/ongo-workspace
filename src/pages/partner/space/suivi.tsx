import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cx } from "../../../components/ui";
import { type Totaux, type Point, type Alerte, PERIODES, TEINTES, isoLocal, jourCourt, nombre, pourcent } from "./suiviDonnees";

/*
 * Les pièces communes au tableau de bord d'un partenaire et au rapport d'un
 * de ses chauffeurs : mêmes chiffres, même lecture.
 *
 * Les couleurs des courbes sont les deux premières teintes de la palette
 * validée (`validate_palette.js`) : bleu pour ce qui est fait, orange pour ce
 * qui est manqué. Chaque série a sa légende — la couleur ne porte jamais seule
 * le sens.
 */

export function SelecteurPeriode({ jours, onChange }: { jours: number; onChange: (jours: number) => void }) {
    return (
        <div role="radiogroup" aria-label="Période" className="inline-flex max-w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
            {PERIODES.map((p) => (
                <button
                    key={p.jours}
                    role="radio"
                    aria-checked={p.jours === jours}
                    onClick={() => onChange(p.jours)}
                    className={cx(
                        "px-3 py-1.5 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors",
                        p.jours === jours
                            ? "bg-primary text-white dark:bg-primary-container"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
                    )}
                >
                    {p.libelle}
                </button>
            ))}
        </div>
    );
}

export function Panneau({ titre, sousTitre, action, children, className }: { titre: string; sousTitre?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
    return (
        <section className={cx("rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900", className)}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-[16px] font-bold tracking-tight text-slate-900 dark:text-white">{titre}</h2>
                    {sousTitre && <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{sousTitre}</p>}
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

/** Une étape : le libellé et le chiffre au-dessus, la barre pleine largeur dessous. */
export function Barre({ libelle, valeur, total, teinte }: { libelle: string; valeur: number; total: number; teinte: string }) {
    const part = total ? (valeur / total) * 100 : 0;

    return (
        <div className="text-[13px]" title={`${libelle} : ${nombre(valeur)} (${pourcent(part)})`}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-400">{libelle}</span>
                <span className="shrink-0 tabular-nums">
                    <span className="font-semibold text-slate-900 dark:text-white">{nombre(valeur)}</span>
                    <span className="ml-1.5 text-slate-500">{pourcent(part)}</span>
                </span>
            </div>
            <div className="h-3">
                <div className="h-full rounded-r-[4px]" style={{ width: `${Math.max(part, valeur > 0 ? 1 : 0)}%`, background: teinte }} />
            </div>
        </div>
    );
}

/** De la proposition à la course : ce qui est pris, et où le reste se perd. */
export function Entonnoir({ t, theme }: { t: Totaux; theme: "light" | "dark" }) {
    const etapes = theme === "dark" ? ["#184f95", "#2a78d6", "#6da7ec"] : ["#86b6ef", "#3987e5", "#1c5cab"];

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                <Barre libelle="Courses proposées" valeur={t.offers} total={t.offers} teinte={etapes[0]} />
                <Barre libelle="Acceptées" valeur={t.accepted} total={t.offers} teinte={etapes[1]} />
                <Barre libelle="Terminées" valeur={t.completed} total={t.offers} teinte={etapes[2]} />
            </div>
            <p className="pt-2 text-[13px] font-semibold text-slate-900 dark:text-white">Ce qui se perd</p>
            <div className="space-y-3">
                <Barre libelle="Manquées (trop tard, sans réponse)" valeur={t.missed} total={t.offers} teinte="#94a3b8" />
                <Barre libelle="Refusées" valeur={t.refused} total={t.offers} teinte="#94a3b8" />
                <Barre libelle="Annulées après acceptation" valeur={t.cancelled_after_accept} total={t.offers} teinte="#94a3b8" />
            </div>
        </div>
    );
}

interface InfobulleProps {
    active?: boolean;
    payload?: { name?: string; value?: number; color?: string }[];
    label?: string;
}

function Infobulle({ active, payload, label }: InfobulleProps) {
    if (!active || !payload?.length) return null;

    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] dark:border-slate-700 dark:bg-slate-900">
            <p className="mb-1 text-slate-500">{label ? jourCourt(label) : ""}</p>
            {payload.map((p) => (
                <p key={p.name} className="flex items-center gap-2">
                    <span className="h-0.5 w-3 rounded-full" style={{ background: p.color }} />
                    <span className="font-bold text-slate-900 dark:text-white">{nombre(p.value)}</span>
                    <span className="text-slate-500">{p.name}</span>
                </p>
            ))}
        </div>
    );
}

/** Courses terminées et manquées, jour après jour (semaine après semaine sur un an). */
export function CourbeActivite({ serie, theme }: { serie: Point[]; theme: "light" | "dark" }) {
    const c = TEINTES[theme];

    // Au-delà de trois mois, une semaine par point : 365 points ne se lisent pas.
    const points =
        serie.length > 92
            ? Object.values(
                  serie.reduce<Record<string, Point>>((acc, p) => {
                      const d = new Date(`${p.date}T12:00:00`);
                      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
                      const cle = isoLocal(d);
                      acc[cle] ??= { date: cle, completed: 0, missed: 0, revenue: 0 };
                      acc[cle].completed += p.completed;
                      acc[cle].missed += p.missed;
                      acc[cle].revenue += p.revenue;
                      return acc;
                  }, {}),
              )
            : serie;

    return (
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                    <CartesianGrid vertical={false} stroke={c.grille} />
                    <XAxis dataKey="date" tickFormatter={jourCourt} tick={{ fill: c.axe, fontSize: 12 }} axisLine={{ stroke: c.grille }} tickLine={false} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={{ fill: c.axe, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<Infobulle />} cursor={{ stroke: c.axe, strokeWidth: 1 }} />
                    <Legend iconType="plainline" wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
                    <Line name="Terminées" dataKey="completed" stroke={c.fait} strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line name="Manquées" dataKey="missed" stroke={c.manque} strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

/** À quelle heure les courses sont manquées : là où il faut des chauffeurs disponibles. */
export function HeuresManquees({ heures, theme }: { heures: number[]; theme: "light" | "dark" }) {
    const c = TEINTES[theme];
    const donnees = heures.map((n, h) => ({ heure: `${h}h`, n }));
    const pire = heures.reduce((m, n, h) => (n > heures[m] ? h : m), 0);

    return (
        <div>
            <p className="mb-3 text-[13px] text-slate-600 dark:text-slate-400">
                {heures[pire] > 0 ? `Le pire créneau : ${pire} h – ${pire + 1} h (${nombre(heures[pire])} courses manquées).` : "Aucune course manquée sur la période."}
            </p>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={donnees} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                        <CartesianGrid vertical={false} stroke={c.grille} />
                        <XAxis dataKey="heure" tick={{ fill: c.axe, fontSize: 11 }} axisLine={{ stroke: c.grille }} tickLine={false} interval={2} />
                        <YAxis allowDecimals={false} tick={{ fill: c.axe, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip
                            cursor={{ fill: theme === "dark" ? "#1e293b" : "#f1f5f9" }}
                            content={({ active, payload }) =>
                                active && payload?.length ? (
                                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] dark:border-slate-700 dark:bg-slate-900">
                                        <span className="font-bold text-slate-900 dark:text-white">{nombre(payload[0].value as number)}</span>
                                        <span className="ml-1.5 text-slate-500">manquées à {payload[0].payload.heure}</span>
                                    </div>
                                ) : null
                            }
                        />
                        <Bar dataKey="n" fill={c.manque} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

/** Une alerte : l'icône et le mot, jamais la couleur seule. */
export function ListeAlertes({ alertes }: { alertes: Alerte[] }) {
    if (alertes.length === 0) {
        return <p className="text-[13px] text-emerald-700 dark:text-emerald-400">Rien à signaler.</p>;
    }

    const tons = {
        critical: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300",
        warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
        info: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
    };
    const mots = { critical: "Urgent", warning: "À surveiller", info: "Info" };

    return (
        <ul className="space-y-2">
            {alertes.map((a, i) => (
                <li key={i} className={cx("flex items-start gap-2.5 rounded-lg border px-3 py-2 text-[13px]", tons[a.level])}>
                    <span className="shrink-0 font-semibold">{mots[a.level]}</span>
                    <span>{a.text}</span>
                </li>
            ))}
        </ul>
    );
}
