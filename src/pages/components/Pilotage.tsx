import { useEffect, useMemo, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Banknote, Bike, CircleCheck, Inbox, ReceiptText, Target, UserPlus, Wallet } from 'lucide-react';
import ApiService from '../../services/ApiService';
import { StatCard, cx } from '../../components/ui';

/*
 * Le tableau de bord de décision.
 *
 * Trois questions, dans l'ordre où on se les pose : est-ce qu'on gagne plus ?
 * combien de demandes perd-on ? quand les perd-on ? Chaque chiffre se compare
 * à la période d'avant, de même longueur — un cumul depuis 2022 ne dit pas si
 * l'activité monte ou baisse.
 *
 * Les chiffres viennent de `v3/admin/dashboard` (`AdminDashboardController`),
 * qui en tient les définitions : une course est rangée au jour de sa demande,
 * et le revenu d'Ongo se compte au taux figé sur chaque course.
 */

interface Kpi {
    value: number;
    previous: number;
    change: number | null;
}

interface Point {
    date: string;
    requests: number;
    completed: number;
    volume: number;
    revenue: number;
}

interface Case {
    day: number;
    hour: number;
    requests: number;
    completed: number;
}

interface Donnees {
    period: { from: string; to: string; days: number };
    previous: { from: string; to: string };
    bucket: 'day' | 'week';
    kpis: Record<
        'volume' | 'revenue' | 'completed' | 'requests' | 'completion_rate' | 'average_basket' | 'new_clients' | 'active_drivers',
        Kpi
    >;
    online_drivers: number;
    series: Point[];
    previous_series: Point[];
    funnel: {
        requested: number;
        accepted: number;
        completed: number;
        cancelled_by_client: number;
        expired: number;
        no_driver: number;
        other: number;
    };
    heatmap: Case[];
}

const PERIODES = [
    { jours: 7, libelle: '7 jours' },
    { jours: 30, libelle: '30 jours' },
    { jours: 90, libelle: '90 jours' },
    { jours: 365, libelle: '12 mois' },
] as const;

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/*
 * Les couleurs, validées par `validate_palette.js` dans les deux modes.
 *
 * Une seule teinte pour la période affichée, du gris pour celle d'avant : la
 * seconde est un repère, pas une série à lire pour elle-même. Le gris est
 * sous 3:1 sur fond clair — d'où la légende, le trait sans aplat et la vue
 * en tableau sous la courbe.
 */
const TEINTES = {
    light: { serie: '#2a78d6', repere: '#94a3b8', grille: '#e2e8f0', axe: '#64748b', vide: '#f1f5f9' },
    dark: { serie: '#3987e5', repere: '#94a3b8', grille: '#1e293b', axe: '#94a3b8', vide: '#1e293b' },
};

/*
 * La rampe séquentielle bleue, du presque rien au plus dense.
 *
 * Sur fond sombre, elle s'inverse : « plus » doit rester « plus visible », et
 * le bleu nuit des créneaux les plus chargés se fondait dans le fond.
 */
const RAMPES = {
    light: ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'],
    dark: ['#104281', '#184f95', '#1c5cab', '#256abf', '#3987e5', '#6da7ec', '#b7d3f6'],
};

/** L'entonnoir : une rampe ordinale, la dernière étape la plus marquée. */
const ETAPES = {
    light: ['#86b6ef', '#3987e5', '#1c5cab'],
    dark: ['#184f95', '#2a78d6', '#6da7ec'],
};

const francs = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
const nombre = (n: number) => Math.round(n).toLocaleString('fr-FR');
const pourcent = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;

/** 1 200 → « 1,2 k » : l'axe porte des repères, pas des montants exacts. */
const compact = (n: number) =>
    n >= 1_000_000
        ? `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`
        : n >= 1_000
          ? `${(n / 1_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k`
          : String(n);

const jourCourt = (iso: string) =>
    new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00`));

/** Avec l'année : sur douze mois, « du 14 oct. au 13 oct. » ne dit pas lesquels. */
const jourLong = (iso: string) =>
    new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${iso}T12:00:00`));

/** La date locale au format attendu par l'API, sans passer par l'UTC. */
const isoLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const MESURES = {
    revenue: { libelle: 'Revenu Ongo', format: francs },
    volume: { libelle: "Volume d'affaires", format: francs },
    completed: { libelle: 'Courses terminées', format: nombre },
    requests: { libelle: 'Demandes', format: nombre },
} as const;

type Mesure = keyof typeof MESURES;

/** Un choix parmi quelques-uns, d'un seul geste. */
function Segments<T extends string | number>({
    options,
    valeur,
    onChange,
    libelle,
}: {
    options: { cle: T; libelle: string }[];
    valeur: T;
    onChange: (cle: T) => void;
    libelle: string;
}) {
    return (
        <div role="radiogroup" aria-label={libelle} className="inline-flex max-w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
            {options.map((option) => (
                <button
                    key={option.cle}
                    role="radio"
                    aria-checked={option.cle === valeur}
                    onClick={() => onChange(option.cle)}
                    className={cx(
                        'px-3 py-1.5 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors',
                        option.cle === valeur
                            ? 'bg-primary text-white dark:bg-primary-container'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                    )}
                >
                    {option.libelle}
                </button>
            ))}
        </div>
    );
}

function Panneau({ titre, sousTitre, action, children }: { titre: string; sousTitre?: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
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

interface InfobulleProps {
    active?: boolean;
    payload?: { dataKey?: string | number; value?: number; payload?: { date: string; datePrecedente?: string } }[];
    mesure: Mesure;
    teintes: (typeof TEINTES)['light'];
    parSemaine: boolean;
}

/** L'infobulle de la courbe : la valeur d'abord, le nom de la série ensuite. */
function Infobulle({ active, payload, mesure, teintes, parSemaine }: InfobulleProps) {
    if (!active || !payload?.length) return null;

    const point = payload[0].payload;
    const courant = payload.find((p) => p.dataKey === 'courant')?.value;
    const avant = payload.find((p) => p.dataKey === 'avant')?.value;
    const prefixe = parSemaine ? 'Semaine du ' : '';

    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-2">
                <span className="h-0.5 w-3 rounded-full" style={{ background: teintes.serie }} />
                <span className="font-bold text-slate-900 dark:text-white">{courant != null ? MESURES[mesure].format(courant) : '—'}</span>
                <span className="text-slate-500">{point?.date ? prefixe + jourCourt(point.date) : ''}</span>
            </div>
            {avant != null && (
                <div className="mt-1 flex items-center gap-2">
                    <span className="h-0.5 w-3 rounded-full" style={{ background: teintes.repere }} />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{MESURES[mesure].format(avant)}</span>
                    <span className="text-slate-500">{point?.datePrecedente ? prefixe + jourCourt(point.datePrecedente) : ''}</span>
                </div>
            )}
        </div>
    );
}

export default function Pilotage({ theme }: { theme: 'light' | 'dark' }) {
    const [jours, setJours] = useState<number>(30);
    const [donnees, setDonnees] = useState<Donnees | null>(null);

    // La période dont la réponse est arrivée, et ce qu'elle a dit. Tant
    // qu'elle diffère de celle choisie, on charge : rien à basculer à la main.
    const [reponse, setReponse] = useState<{ jours: number; erreur: string | null } | null>(null);
    const chargement = reponse?.jours !== jours;
    const erreur = reponse?.jours === jours ? reponse.erreur : null;
    const [mesure, setMesure] = useState<Mesure>('revenue');
    const [grilleMesure, setGrilleMesure] = useState<'requests' | 'lost'>('lost');
    const [caseSurvolee, setCaseSurvolee] = useState<Case | null>(null);

    const teintes = TEINTES[theme];
    const rampe = RAMPES[theme];

    useEffect(() => {
        const fin = new Date();
        const debut = new Date();
        debut.setDate(fin.getDate() - (jours - 1));

        // Une réponse lente ne doit pas écraser celle d'une période choisie après.
        let abandonnee = false;

        new ApiService()
            .getData('v3/admin/dashboard', { from: isoLocal(debut), to: isoLocal(fin) })
            .then(({ data }) => {
                if (abandonnee) return;
                if (data?.success) setDonnees(data.data);
                setReponse({ jours, erreur: data?.success ? null : (data?.message ?? 'Les chiffres sont indisponibles.') });
            })
            .catch(() => {
                if (!abandonnee) setReponse({ jours, erreur: 'Les chiffres sont indisponibles : le serveur ne répond pas.' });
            });

        return () => {
            abandonnee = true;
        };
    }, [jours]);

    // La période d'avant se superpose jour pour jour : même rang, même place.
    const courbe = useMemo(
        () =>
            (donnees?.series ?? []).map((point, i) => ({
                date: point.date,
                courant: point[mesure],
                avant: donnees?.previous_series[i]?.[mesure],
                datePrecedente: donnees?.previous_series[i]?.date,
            })),
        [donnees, mesure],
    );

    const perdue = (c: Case) => c.requests - c.completed;
    const valeurCase = (c: Case) => (grilleMesure === 'lost' ? perdue(c) : c.requests);
    const maxCase = Math.max(1, ...(donnees?.heatmap ?? []).map(valeurCase));

    /** Le créneau qui perd le plus de demandes : la première chose à regarder. */
    const pire = (donnees?.heatmap ?? []).reduce<Case | null>(
        (meilleur, c) => (perdue(c) > (meilleur ? perdue(meilleur) : 0) ? c : meilleur),
        null,
    );

    const teinteCase = (c: Case) => {
        const v = valeurCase(c);
        if (v === 0) return teintes.vide;
        return rampe[Math.min(rampe.length - 1, Math.floor((v / maxCase) * rampe.length))];
    };

    const decrire = (c: Case) =>
        `${JOURS[c.day - 1]} ${c.hour} h : ${nombre(c.requests)} demande${c.requests > 1 ? 's' : ''}, ` +
        `${nombre(c.completed)} terminée${c.completed > 1 ? 's' : ''}` +
        (c.requests ? ` (${pourcent((c.completed / c.requests) * 100)})` : '');

    const k = donnees?.kpis;
    const f = donnees?.funnel;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Segments
                    libelle="Période"
                    options={PERIODES.map((p) => ({ cle: p.jours as number, libelle: p.libelle }))}
                    valeur={jours}
                    onChange={setJours}
                />
                {donnees && (
                    <p className="text-[13px] text-slate-500 dark:text-slate-400">
                        Du {jourLong(donnees.period.from)} au {jourLong(donnees.period.to)}, comparé au{' '}
                        {jourLong(donnees.previous.from)} – {jourLong(donnees.previous.to)}
                    </p>
                )}
            </div>

            {erreur && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                    {erreur}
                </p>
            )}

            {!donnees && chargement && <p className="text-sm text-slate-500">Chargement des chiffres…</p>}

            {k && f && donnees && (
                <div className={cx('space-y-6 transition-opacity', chargement && 'opacity-60')}>
                    {/* Est-ce qu'on gagne plus ? */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-4">
                        <StatCard label="Revenu Ongo" value={francs(k.revenue.value)} icon={Wallet} delta={{ value: k.revenue.change }} />
                        <StatCard label="Volume d'affaires" value={francs(k.volume.value)} icon={Banknote} delta={{ value: k.volume.change }} />
                        <StatCard label="Courses terminées" value={nombre(k.completed.value)} icon={CircleCheck} delta={{ value: k.completed.change }} />
                        <StatCard
                            label="Taux d'aboutissement"
                            value={pourcent(k.completion_rate.value)}
                            icon={Target}
                            delta={{
                                value: k.requests.previous ? Math.round((k.completion_rate.value - k.completion_rate.previous) * 10) / 10 : null,
                                unit: 'pts',
                            }}
                        />
                        <StatCard label="Demandes" value={nombre(k.requests.value)} icon={Inbox} delta={{ value: k.requests.change }} />
                        <StatCard label="Panier moyen" value={francs(k.average_basket.value)} icon={ReceiptText} delta={{ value: k.average_basket.change }} />
                        <StatCard label="Nouveaux clients" value={nombre(k.new_clients.value)} icon={UserPlus} delta={{ value: k.new_clients.change }} />
                        <StatCard
                            label="Chauffeurs actifs"
                            value={nombre(k.active_drivers.value)}
                            icon={Bike}
                            delta={{ value: k.active_drivers.change }}
                            note={`Au moins une course terminée · ${nombre(donnees.online_drivers)} en ligne maintenant`}
                        />
                    </div>

                    <Panneau
                        titre={`${MESURES[mesure].libelle} par ${donnees.bucket === 'week' ? 'semaine' : 'jour'}`}
                        sousTitre="La période affichée, et en gris la précédente, superposée jour pour jour."
                        action={
                            <Segments
                                libelle="Mesure"
                                options={(Object.keys(MESURES) as Mesure[]).map((cle) => ({ cle, libelle: MESURES[cle].libelle }))}
                                valeur={mesure}
                                onChange={setMesure}
                            />
                        }
                    >
                        <div className="mb-3 flex items-center gap-5 text-[13px] text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-2">
                                <span className="h-0.5 w-4 rounded-full" style={{ background: teintes.serie }} />
                                Cette période
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="h-0.5 w-4 rounded-full" style={{ background: teintes.repere }} />
                                Période précédente
                            </span>
                        </div>

                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={courbe} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                                    <CartesianGrid vertical={false} stroke={teintes.grille} strokeWidth={1} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={jourCourt}
                                        tick={{ fill: teintes.axe, fontSize: 12 }}
                                        axisLine={{ stroke: teintes.grille }}
                                        tickLine={false}
                                        minTickGap={24}
                                    />
                                    <YAxis
                                        tickFormatter={compact}
                                        tick={{ fill: teintes.axe, fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={48}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        cursor={{ stroke: teintes.axe, strokeWidth: 1 }}
                                        content={<Infobulle mesure={mesure} teintes={teintes} parSemaine={donnees.bucket === 'week'} />}
                                    />
                                    <Line
                                        dataKey="avant"
                                        stroke={teintes.repere}
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4, fill: teintes.repere, stroke: theme === 'dark' ? '#0f172a' : '#ffffff', strokeWidth: 2 }}
                                        isAnimationActive={false}
                                    />
                                    <Area
                                        dataKey="courant"
                                        stroke={teintes.serie}
                                        strokeWidth={2}
                                        fill={teintes.serie}
                                        fillOpacity={0.1}
                                        dot={false}
                                        activeDot={{ r: 4, fill: teintes.serie, stroke: theme === 'dark' ? '#0f172a' : '#ffffff', strokeWidth: 2 }}
                                        isAnimationActive={false}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Les mêmes chiffres, sans survoler : l'infobulle n'en garde aucun pour elle. */}
                        <details className="mt-4 text-[13px]">
                            <summary className="cursor-pointer text-slate-500 hover:text-slate-900 dark:hover:text-white">Voir les données</summary>
                            <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
                                <table className="w-full">
                                    <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800">
                                        <tr>
                                            <th className="px-3 py-2 font-semibold">{donnees.bucket === 'week' ? 'Semaine du' : 'Jour'}</th>
                                            <th className="px-3 py-2 text-right font-semibold">Cette période</th>
                                            <th className="px-3 py-2 text-right font-semibold">Période précédente</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {courbe.map((ligne) => (
                                            <tr key={ligne.date}>
                                                <td className="px-3 py-1.5 text-slate-700 dark:text-slate-300">{jourCourt(ligne.date)}</td>
                                                <td className="px-3 py-1.5 text-right tabular-nums text-slate-900 dark:text-white">{MESURES[mesure].format(ligne.courant)}</td>
                                                <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">
                                                    {ligne.avant != null ? MESURES[mesure].format(ligne.avant) : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </details>
                    </Panneau>

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
                        {/* Combien de demandes perd-on, et pourquoi ? */}
                        <div className="xl:col-span-2">
                            <Panneau
                                titre="De la demande à la course"
                                sousTitre={
                                    f.requested
                                        ? `${nombre(f.requested - f.completed)} demandes sur ${nombre(f.requested)} n'aboutissent pas.`
                                        : 'Aucune demande sur la période.'
                                }
                            >
                                <div className="space-y-3">
                                    {[
                                        { libelle: 'Demandes', valeur: f.requested },
                                        { libelle: 'Acceptées par un chauffeur', valeur: f.accepted },
                                        { libelle: 'Terminées', valeur: f.completed },
                                    ].map((etape, i) => (
                                        <Barre
                                            key={etape.libelle}
                                            libelle={etape.libelle}
                                            valeur={etape.valeur}
                                            total={f.requested}
                                            teinte={ETAPES[theme][i]}
                                        />
                                    ))}
                                </div>

                                <h3 className="mb-3 mt-6 text-[13px] font-semibold text-slate-900 dark:text-white">Où elles se perdent</h3>
                                <div className="space-y-3">
                                    {[
                                        { libelle: 'Annulées par le client', valeur: f.cancelled_by_client },
                                        { libelle: 'Expirées sans réponse', valeur: f.expired },
                                        { libelle: 'Aucun chauffeur trouvé', valeur: f.no_driver },
                                        { libelle: 'Acceptées, puis non terminées', valeur: Math.max(0, f.accepted - f.completed) },
                                    ].map((perte) => (
                                        <Barre key={perte.libelle} libelle={perte.libelle} valeur={perte.valeur} total={f.requested} teinte={teintes.repere} />
                                    ))}
                                </div>
                                <p className="mt-4 text-[12px] text-slate-500 dark:text-slate-400">
                                    Les annulations après acceptation recoupent les annulations par le client : les deux lectures ne s'additionnent pas.
                                </p>
                            </Panneau>
                        </div>

                        {/* Quand les perd-on ? */}
                        <div className="xl:col-span-3">
                            <Panneau
                                titre="Quand les demandes se perdent"
                                sousTitre="Par heure de la demande et jour de la semaine, sur toute la période."
                                action={
                                    <Segments
                                        libelle="Mesure de la grille"
                                        options={[
                                            { cle: 'lost' as const, libelle: 'Non abouties' },
                                            { cle: 'requests' as const, libelle: 'Demandes' },
                                        ]}
                                        valeur={grilleMesure}
                                        onChange={setGrilleMesure}
                                    />
                                }
                            >
                                <p className="mb-4 min-h-[20px] text-[13px] text-slate-700 dark:text-slate-300" aria-live="polite">
                                    {caseSurvolee
                                        ? decrire(caseSurvolee)
                                        : pire && perdue(pire) > 0
                                          ? `Créneau le plus perdant — ${decrire(pire)}`
                                          : 'Aucune demande perdue sur la période.'}
                                </p>

                                <div className="overflow-x-auto">
                                    <div className="min-w-[560px]">
                                        <div className="grid grid-cols-[72px_repeat(24,minmax(0,1fr))] gap-[2px]" onMouseLeave={() => setCaseSurvolee(null)}>
                                            {JOURS.map((jour, j) => (
                                                <div key={jour} className="contents">
                                                    <div className="pr-2 text-[12px] leading-[22px] text-slate-500 dark:text-slate-400">{jour.slice(0, 3)}</div>
                                                    {donnees.heatmap
                                                        .filter((c) => c.day === j + 1)
                                                        .map((c) => (
                                                            <button
                                                                key={c.hour}
                                                                type="button"
                                                                aria-label={decrire(c)}
                                                                onMouseEnter={() => setCaseSurvolee(c)}
                                                                onFocus={() => setCaseSurvolee(c)}
                                                                onBlur={() => setCaseSurvolee(null)}
                                                                className={cx(
                                                                    'h-[22px] rounded-[3px] outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white',
                                                                    caseSurvolee === c && 'ring-2 ring-slate-900 dark:ring-white',
                                                                )}
                                                                style={{ background: teinteCase(c) }}
                                                            />
                                                        ))}
                                                </div>
                                            ))}

                                            <div />
                                            {Array.from({ length: 24 }, (_, h) => (
                                                <div key={h} className="pt-1 text-center text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                                                    {h % 3 === 0 ? `${h}h` : ''}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-4 flex items-center justify-end gap-2 text-[12px] text-slate-500 dark:text-slate-400">
                                            <span>Moins</span>
                                            <span className="h-3 w-3 rounded-[3px]" style={{ background: teintes.vide }} />
                                            {rampe.map((teinte) => (
                                                <span key={teinte} className="h-3 w-3 rounded-[3px]" style={{ background: teinte }} />
                                            ))}
                                            <span>Plus</span>
                                        </div>
                                    </div>
                                </div>
                            </Panneau>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Une étape de l'entonnoir : la barre part de zéro, le chiffre et sa part des
 * demandes restent hors de la barre — une barre courte ne rogne rien.
 */
function Barre({ libelle, valeur, total, teinte }: { libelle: string; valeur: number; total: number; teinte: string }) {
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
