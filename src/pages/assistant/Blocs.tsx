import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, Bell, Download, Mail, Minus } from 'lucide-react';
import type { Bloc, BlocEnvoi, Serie } from './types';
import { formater, formaterCourt, telechargerCsv } from './format';

type Theme = 'light' | 'dark';

/* Les mêmes teintes que le tableau de bord, puis trois voisines pour les séries suivantes. */
const SERIES = {
    light: ['#2a78d6', '#0f9488', '#d97706', '#7c3aed'],
    dark: ['#3987e5', '#2dd4bf', '#f59e0b', '#a78bfa'],
};
const GRILLE = { light: '#e2e8f0', dark: '#1e293b' };
const AXE = { light: '#64748b', dark: '#94a3b8' };

const Carte: React.FC<{ titre: string; sousTitre?: string | null; actions?: React.ReactNode; children: React.ReactNode }> = ({ titre, sousTitre, actions, children }) => (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 break-inside-avoid">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
                <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">{titre}</h3>
                {sousTitre && <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">{sousTitre}</p>}
            </div>
            {actions && <div className="flex shrink-0 gap-2 print:hidden">{actions}</div>}
        </div>
        {children}
    </section>
);

const BoutonCsv: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
    >
        <Download size={13} /> CSV
    </button>
);

/* ------------------------------------------------------------------ indicateurs */

const Indicateurs: React.FC<{ bloc: Extract<Bloc, { type: 'indicateurs' }> }> = ({ bloc }) => (
    <Carte titre={bloc.titre} sousTitre={bloc.comparaison ? `${bloc.periode} · comparé ${bloc.comparaison}` : bloc.periode}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {bloc.elements.map((e) => {
                const hausse = (e.variation ?? 0) > 0;
                const baisse = (e.variation ?? 0) < 0;
                return (
                    <div key={e.mesure} className="rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
                        <p className="text-[12px] text-slate-500 dark:text-slate-400">{e.libelle}</p>
                        <p className="mt-1 text-[20px] font-bold tabular-nums text-slate-900 dark:text-white">{formater(e.valeur, e.unite)}</p>
                        {e.avant !== undefined && (
                            <p className="mt-0.5 flex items-center gap-1 text-[12px] tabular-nums">
                                {e.variation === null || e.variation === undefined ? (
                                    <span className="text-slate-400">Rien sur la période d'avant</span>
                                ) : (
                                    <>
                                        <span className={`inline-flex items-center gap-0.5 rounded px-1 font-semibold ${hausse ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : baisse ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                                            {hausse ? <ArrowUpRight size={12} /> : baisse ? <ArrowDownRight size={12} /> : <Minus size={12} />}
                                            {formater(Math.abs(e.variation), '%')}
                                        </span>
                                        <span className="text-slate-500">contre {formater(e.avant, e.unite)}</span>
                                    </>
                                )}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    </Carte>
);

/* ------------------------------------------------------------------ graphique */

const Infobulle: React.FC<any> = ({ active, payload, label, unites }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="mb-1 font-semibold text-slate-700 dark:text-slate-200">{label}</p>
            {payload.map((p: any) => (
                <p key={p.dataKey} className="flex items-center gap-2 tabular-nums">
                    <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-slate-500">{p.name}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formater(p.value, unites[p.dataKey])}</span>
                </p>
            ))}
        </div>
    );
};

const Graphique: React.FC<{ bloc: Extract<Bloc, { type: 'graphique' }>; theme: Theme }> = ({ bloc, theme }) => {
    const couleurs = SERIES[theme];
    const donnees = useMemo(() => {
        const lignes: Record<string, any>[] = [];
        bloc.series.forEach((serie: Serie, i) => {
            serie.points.forEach((p, j) => {
                lignes[j] ??= { x: p.x };
                lignes[j][`s${i}`] = p.y;
            });
        });
        return lignes;
    }, [bloc]);
    const unites = Object.fromEntries(bloc.series.map((s, i) => [`s${i}`, s.unite]));
    const barres = bloc.forme === 'barres';
    const horizontal = barres && donnees.some((d) => String(d.x).length > 10);
    const hauteur = horizontal ? Math.max(220, donnees.length * 30 + 40) : 260;

    const exporter = () => telechargerCsv(bloc.titre, ['', ...bloc.series.map((s) => s.nom)], donnees.map((d) => [d.x, ...bloc.series.map((_, i) => d[`s${i}`])]));

    const axeValeurs = { tick: { fill: AXE[theme], fontSize: 11 }, tickFormatter: (v: number) => formaterCourt(v, bloc.unite), axisLine: false, tickLine: false };
    const axeLibelles = { tick: { fill: AXE[theme], fontSize: 11 }, axisLine: false, tickLine: false };

    return (
        <Carte titre={bloc.titre} sousTitre={bloc.periode} actions={<BoutonCsv onClick={exporter} />}>
            <div style={{ height: hauteur }}>
                <ResponsiveContainer width="100%" height="100%">
                    {barres ? (
                        <BarChart data={donnees} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 4, right: 12, bottom: 0, left: horizontal ? 8 : 0 }}>
                            <CartesianGrid stroke={GRILLE[theme]} vertical={horizontal} horizontal={!horizontal} />
                            {horizontal ? (
                                <>
                                    <XAxis type="number" {...axeValeurs} />
                                    <YAxis type="category" dataKey="x" width={150} {...axeLibelles} />
                                </>
                            ) : (
                                <>
                                    <XAxis dataKey="x" {...axeLibelles} interval="preserveStartEnd" />
                                    <YAxis width={48} {...axeValeurs} />
                                </>
                            )}
                            <Tooltip cursor={{ fill: theme === 'dark' ? '#1e293b' : '#f1f5f9' }} content={<Infobulle unites={unites} />} />
                            {bloc.series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
                            {bloc.series.map((s, i) => (
                                <Bar key={i} dataKey={`s${i}`} name={s.nom} fill={couleurs[i % couleurs.length]} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={36}>
                                    {bloc.series.length === 1 && donnees.map((_, j) => <Cell key={j} fill={couleurs[0]} />)}
                                </Bar>
                            ))}
                        </BarChart>
                    ) : (
                        <LineChart data={donnees} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                            <CartesianGrid stroke={GRILLE[theme]} vertical={false} />
                            <XAxis dataKey="x" {...axeLibelles} interval="preserveStartEnd" minTickGap={24} />
                            <YAxis width={48} {...axeValeurs} />
                            <Tooltip content={<Infobulle unites={unites} />} />
                            {bloc.series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
                            {bloc.series.map((s, i) => (
                                <Line key={i} type="monotone" dataKey={`s${i}`} name={s.nom} stroke={couleurs[i % couleurs.length]} strokeWidth={2} dot={donnees.length <= 31} />
                            ))}
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>
        </Carte>
    );
};

/* ------------------------------------------------------------------ tableau */

const PAR_PAGE = 25;

const Tableau: React.FC<{ bloc: Extract<Bloc, { type: 'tableau' }> }> = ({ bloc }) => {
    const [vus, setVus] = useState(PAR_PAGE);
    const lignes = bloc.lignes.slice(0, vus);

    const exporter = () => telechargerCsv(bloc.titre, bloc.colonnes.map((c) => c.libelle), bloc.lignes.map((l) => bloc.colonnes.map((c) => l[c.cle])));

    const sousTitre = [bloc.periode, bloc.total !== undefined && bloc.total > bloc.lignes.length ? `${formater(bloc.total)} au total, ${formater(bloc.lignes.length)} affichés` : bloc.total !== undefined ? `${formater(bloc.total)} au total` : null]
        .filter(Boolean).join(' · ');

    return (
        <Carte titre={bloc.titre} sousTitre={sousTitre || null} actions={bloc.lignes.length > 0 ? <BoutonCsv onClick={exporter} /> : null}>
            {bloc.lignes.length === 0 ? (
                <p className="text-[13px] text-slate-500">Aucune ligne.</p>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-[13px]">
                            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-800/60">
                                <tr>
                                    {bloc.colonnes.map((c) => (
                                        <th key={c.cle} className={`whitespace-nowrap px-3 py-2 font-semibold ${c.type === 'nombre' || c.type === 'FCFA' ? 'text-right' : ''}`}>{c.libelle}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {lignes.map((l, i) => (
                                    <tr key={i} className="text-slate-700 dark:text-slate-300">
                                        {bloc.colonnes.map((c) => (
                                            <td key={c.cle} className={`whitespace-nowrap px-3 py-1.5 ${c.type === 'nombre' || c.type === 'FCFA' ? 'text-right tabular-nums' : ''}`}>
                                                {c.type === 'nombre' || c.type === 'FCFA' ? formater(l[c.cle], c.type === 'FCFA' ? 'FCFA' : 'nombre') : (l[c.cle] as React.ReactNode) ?? '—'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {bloc.lignes.length > vus && (
                        <button type="button" onClick={() => setVus(vus + PAR_PAGE * 4)} className="mt-2 text-[12px] font-semibold text-[#2a78d6] hover:underline print:hidden">
                            Voir {formater(Math.min(PAR_PAGE * 4, bloc.lignes.length - vus))} de plus
                        </button>
                    )}
                </>
            )}
        </Carte>
    );
};

/* ------------------------------------------------------------------ entonnoir */

const Entonnoir: React.FC<{ bloc: Extract<Bloc, { type: 'entonnoir' }>; theme: Theme }> = ({ bloc, theme }) => {
    const max = Math.max(1, ...bloc.etapes.map((e) => e.valeur));
    return (
        <Carte titre={bloc.titre} sousTitre={bloc.periode}>
            <div className="space-y-2">
                {bloc.etapes.map((e, i) => (
                    <div key={e.libelle} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-[13px]">
                        <span className="truncate text-slate-600 dark:text-slate-300">{e.libelle}</span>
                        <div className="h-6 rounded bg-slate-100 dark:bg-slate-800">
                            <div className="h-6 rounded" style={{ width: `${Math.max(1, (e.valeur / max) * 100)}%`, background: SERIES[theme][0], opacity: 1 - i * 0.15 }} />
                        </div>
                        <span className="w-28 text-right tabular-nums">
                            <b className="text-slate-900 dark:text-white">{formater(e.valeur)}</b>
                            {i > 0 && <span className="ml-1 text-slate-500">({formater(e.taux_depuis_debut, '%')})</span>}
                        </span>
                    </div>
                ))}
            </div>
            {bloc.pertes.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {bloc.pertes.map((p) => (
                        <span key={p.libelle} className="rounded-full bg-rose-50 px-2.5 py-1 text-[12px] text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                            {p.libelle} : <b className="tabular-nums">{formater(p.valeur)}</b>
                        </span>
                    ))}
                </div>
            )}
        </Carte>
    );
};

/* ------------------------------------------------------------------ cohortes */

const Cohortes: React.FC<{ bloc: Extract<Bloc, { type: 'cohortes' }>; theme: Theme }> = ({ bloc, theme }) => {
    const fond = (t: number) => {
        const a = Math.min(1, t / 60);
        return theme === 'dark' ? `rgba(57,135,229,${0.12 + a * 0.75})` : `rgba(42,120,214,${0.06 + a * 0.8})`;
    };
    const exporter = () => telechargerCsv(bloc.titre, ['Cohorte', 'Inscrits', ...bloc.mois], bloc.lignes.map((l) => [l.cohorte, l.taille, ...l.taux]));

    return (
        <Carte titre={bloc.titre} sousTitre={`${bloc.periode} · part des inscrits du mois qui achètent M0, M1, M2… mois après`} actions={<BoutonCsv onClick={exporter} />}>
            <div className="overflow-x-auto">
                <table className="text-[12px] tabular-nums">
                    <thead>
                        <tr className="text-slate-500">
                            <th className="px-2 py-1 text-left font-semibold">Mois</th>
                            <th className="px-2 py-1 text-right font-semibold">Inscrits</th>
                            {bloc.mois.map((m) => <th key={m} className="px-2 py-1 font-semibold">{m}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {bloc.lignes.map((l) => (
                            <tr key={l.cohorte}>
                                <td className="whitespace-nowrap px-2 py-1 text-slate-700 dark:text-slate-300">{l.cohorte}</td>
                                <td className="px-2 py-1 text-right text-slate-700 dark:text-slate-300">{formater(l.taille)}</td>
                                {bloc.mois.map((m, k) => (
                                    <td key={m} className="px-0.5 py-0.5">
                                        {k < l.taux.length ? (
                                            <div className="min-w-[3.2rem] rounded px-1.5 py-1 text-center" style={{ background: fond(l.taux[k]), color: l.taux[k] > 35 ? '#fff' : undefined }}>
                                                {formater(l.taux[k], '%')}
                                            </div>
                                        ) : null}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Carte>
    );
};

/* ------------------------------------------------------------------ envoi */

export const CarteEnvoi: React.FC<{ bloc: BlocEnvoi; onConfirmer: (id: number) => Promise<void>; onAnnuler: (id: number) => Promise<void> }> = ({ bloc, onConfirmer, onAnnuler }) => {
    const [occupe, setOccupe] = useState(false);
    const agir = async (action: (id: number) => Promise<void>) => {
        setOccupe(true);
        try {
            await action(bloc.id);
        } finally {
            setOccupe(false);
        }
    };
    const Icone = bloc.canal === 'email' ? Mail : Bell;
    const etat = {
        en_attente: { texte: 'À confirmer : rien n\'est envoyé sans votre clic', classe: 'border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-950/30' },
        en_cours: { texte: 'Envoi en cours…', classe: 'border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30' },
        envoye: { texte: `Envoyé${bloc.envoyes !== undefined ? ` à ${formater(bloc.envoyes)} destinataires` : ''}${bloc.echecs ? `, ${formater(bloc.echecs)} échecs` : ''}`, classe: 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' },
        annule: { texte: 'Annulé : rien n\'a été envoyé', classe: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40' },
    }[bloc.statut];

    return (
        <section className={`rounded-xl border p-4 ${etat.classe}`}>
            <p className="flex items-center gap-2 text-[13px] font-bold text-slate-900 dark:text-white">
                <Icone size={15} /> {etat.texte}
            </p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-[13px]">
                <dt className="text-slate-500">Canal</dt>
                <dd className="text-slate-800 dark:text-slate-200">{bloc.canal === 'email' ? 'E-mail' : 'Notification push'}</dd>
                <dt className="text-slate-500">Destinataires</dt>
                <dd className="text-slate-800 dark:text-slate-200">
                    <b className="tabular-nums">{formater(bloc.nombre)}</b>{bloc.audience ? ` · ${bloc.audience}` : ''}
                </dd>
            </dl>
            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-[13px] dark:border-slate-700 dark:bg-slate-900">
                <p className="font-bold text-slate-900 dark:text-white">{bloc.titre}</p>
                <p className="mt-1 whitespace-pre-line text-slate-700 dark:text-slate-300">{bloc.message}</p>
            </div>
            {bloc.statut === 'en_attente' && (
                <div className="mt-3 flex flex-wrap gap-2 print:hidden">
                    <button type="button" disabled={occupe} onClick={() => agir(onConfirmer)} className="rounded-lg bg-[#10377b] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-[#0c2a5e] disabled:opacity-60 dark:bg-[#3987e5] dark:text-slate-950">
                        Envoyer à {formater(bloc.nombre)} {bloc.nombre > 1 ? 'destinataires' : 'destinataire'}
                    </button>
                    <button type="button" disabled={occupe} onClick={() => agir(onAnnuler)} className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-white disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                        Annuler
                    </button>
                </div>
            )}
        </section>
    );
};

/* ------------------------------------------------------------------ aiguillage */

export const BlocAffiche: React.FC<{
    bloc: Bloc;
    theme: Theme;
    onConfirmer: (id: number) => Promise<void>;
    onAnnuler: (id: number) => Promise<void>;
}> = ({ bloc, theme, onConfirmer, onAnnuler }) => {
    switch (bloc.type) {
        case 'indicateurs': return <Indicateurs bloc={bloc} />;
        case 'graphique': return <Graphique bloc={bloc} theme={theme} />;
        case 'tableau': return <Tableau bloc={bloc} />;
        case 'entonnoir': return <Entonnoir bloc={bloc} theme={theme} />;
        case 'cohortes': return <Cohortes bloc={bloc} theme={theme} />;
        case 'envoi': return <CarteEnvoi bloc={bloc} onConfirmer={onConfirmer} onAnnuler={onAnnuler} />;
        default: return null;
    }
};
