import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, History, Loader2, Plus, Printer, ShieldCheck, Sparkles, X } from 'lucide-react';
import MainLayout from '../MainLayout';
import ApiService from '../../services/ApiService';
import { BlocAffiche } from './Blocs';
import Texte from './Texte';
import type { Bloc, ConversationResume, Message, Usage } from './types';

interface Props {
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const BASE = 'v3/admin/assistant';

/* Une réponse peut demander plusieurs calculs : on laisse le temps. */
const DELAI = { timeout: 180000 };

const SUGGESTIONS: { famille: string; questions: string[] }[] = [
    {
        famille: 'Pilotage',
        questions: [
            'Fais-moi le point de la semaine sur tous les services, comparé à la semaine dernière',
            'Comment évoluent les courses terminées et le revenu Ongo sur les 3 derniers mois ?',
            'Où perd-on des demandes de course ce mois-ci, et à quelles heures ?',
        ],
    },
    {
        famille: 'Marketing',
        questions: [
            'Quels sont nos segments de clients aujourd\'hui ?',
            'Combien d\'inscrits du mois n\'ont jamais commandé ? Prépare-leur une notification',
            'Quelle est la rétention des clients inscrits ces 6 derniers mois ?',
        ],
    },
    {
        famille: 'Opérations',
        questions: [
            'Dans quels quartiers manque-t-il des chauffeurs ?',
            'Classement des restaurants du mois, et ceux qui vendent le moins',
            'Billets vendus par agence ce mois-ci',
        ],
    },
];

/** Imprimer une réponse : son rendu, avec les styles de la page, dans un cadre caché. */
const imprimer = (noeud: HTMLElement | null, titre: string) => {
    if (!noeud) return;
    const cadre = document.createElement('iframe');
    cadre.setAttribute('aria-hidden', 'true');
    cadre.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(cadre);
    const doc = cadre.contentDocument;
    if (!doc || !cadre.contentWindow) {
        cadre.remove();
        return;
    }
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map((n) => n.outerHTML).join('');
    const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${titre.replace(/</g, '&lt;')}</title>${styles}
        <style>body{background:#fff;padding:24px;font-family:'DM Sans',sans-serif} .print\\:hidden{display:none!important} section{break-inside:avoid;margin-bottom:12px}</style>
        </head><body><p style="font-size:12px;color:#64748b;margin-bottom:4px">Ongo 237 · Rapport de l'assistant · ${date}</p>
        <h1 style="font-size:18px;font-weight:700;margin-bottom:16px">${titre.replace(/</g, '&lt;')}</h1>${noeud.innerHTML}</body></html>`);
    doc.close();
    const retirer = () => setTimeout(() => cadre.remove(), 500);
    cadre.contentWindow.addEventListener('afterprint', retirer);
    setTimeout(() => cadre.remove(), 60000);
    // Le temps que les styles se chargent.
    setTimeout(() => {
        cadre.contentWindow?.focus();
        cadre.contentWindow?.print();
    }, 400);
};

const Reponse: React.FC<{
    message: Message;
    question: string;
    theme: 'light' | 'dark';
    onConfirmer: (id: number) => Promise<void>;
    onAnnuler: (id: number) => Promise<void>;
}> = ({ message, question, theme, onConfirmer, onAnnuler }) => {
    const zone = useRef<HTMLDivElement>(null);
    const erreur = message.role === 'erreur';
    const outils = Array.from(new Set(message.outils.map((o) => o.libelle)));

    return (
        <div className="flex flex-col gap-3">
            <div ref={zone} className="flex flex-col gap-3">
                {message.texte && (
                    <div className={`rounded-2xl rounded-tl-md border px-4 py-3 ${erreur ? 'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
                        <Texte texte={message.texte} />
                    </div>
                )}
                {message.blocs.map((bloc: Bloc, i) => (
                    <BlocAffiche key={i} bloc={bloc} theme={theme} onConfirmer={onConfirmer} onAnnuler={onAnnuler} />
                ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-400 print:hidden">
                {outils.length > 0 && <span>Calculé avec : {outils.join(', ')}</span>}
                {!erreur && (message.blocs.length > 0 || (message.texte?.length ?? 0) > 300) && (
                    <button type="button" onClick={() => imprimer(zone.current, question)} className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white">
                        <Printer size={13} /> Imprimer ou PDF
                    </button>
                )}
            </div>
        </div>
    );
};

const Assistant: React.FC<Props> = ({ onLogout, theme, toggleTheme }) => {
    const api = useRef(new ApiService()).current;
    const [conversations, setConversations] = useState<ConversationResume[]>([]);
    const [courante, setCourante] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [usage, setUsage] = useState<Usage | null>(null);
    const [question, setQuestion] = useState('');
    const [enCours, setEnCours] = useState<string | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const [historiqueOuvert, setHistoriqueOuvert] = useState(false);
    const fin = useRef<HTMLDivElement>(null);
    const saisie = useRef<HTMLTextAreaElement>(null);

    const chargerEtat = useCallback(async () => {
        try {
            const [etat, liste] = await Promise.all([api.getData(`${BASE}/etat`), api.getData(`${BASE}/conversations`)]);
            setUsage(etat.data.data);
            setConversations(liste.data.data);
        } catch {
            setErreur('Impossible de joindre l\'assistant. Vérifiez votre connexion.');
        }
    }, [api]);

    useEffect(() => {
        chargerEtat();
    }, [chargerEtat]);

    useEffect(() => {
        fin.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, enCours]);

    const ouvrir = async (id: number) => {
        setHistoriqueOuvert(false);
        setErreur(null);
        try {
            const r = await api.getData(`${BASE}/conversations/${id}`);
            setCourante(id);
            setMessages(r.data.data.messages);
        } catch {
            setErreur('Cette conversation ne s\'ouvre pas.');
        }
    };

    const nouvelle = () => {
        setCourante(null);
        setMessages([]);
        setErreur(null);
        setHistoriqueOuvert(false);
        saisie.current?.focus();
    };

    const envoyer = async (texte?: string) => {
        const q = (texte ?? question).trim();
        if (!q || enCours) return;
        setQuestion('');
        setErreur(null);
        setEnCours(q);
        try {
            const r = await api.postData(`${BASE}/questions`, { question: q, conversation_id: courante }, DELAI);
            const { conversation, messages: nouveaux } = r.data.data;
            setCourante(conversation.id);
            // Un message déjà affiché ne s'ajoute pas une seconde fois.
            setMessages((avant) => [...avant, ...nouveaux.filter((m: Message) => !avant.some((a) => a.id === m.id))]);
            chargerEtat();
        } catch (e: any) {
            setQuestion(q);
            setErreur(e?.response?.data?.message ?? 'La réponse n\'est pas arrivée. Réessayez.');
        } finally {
            setEnCours(null);
            saisie.current?.focus();
        }
    };

    /* Le bloc d'un envoi change d'état : on le met à jour dans tous les messages. */
    const remplacerEnvoi = (bloc: Bloc) =>
        setMessages((liste) => liste.map((m) => ({ ...m, blocs: m.blocs.map((b) => (b.type === 'envoi' && bloc.type === 'envoi' && b.id === bloc.id ? bloc : b)) })));

    const suivreEnvoi = (id: number, essais = 0) => {
        if (essais > 40) return;
        setTimeout(async () => {
            try {
                const r = await api.getData(`${BASE}/envois/${id}`);
                remplacerEnvoi(r.data.data);
                if (r.data.data.statut === 'en_cours') suivreEnvoi(id, essais + 1);
            } catch {
                /* l'état se relira à la prochaine ouverture */
            }
        }, 3000);
    };

    const confirmer = async (id: number) => {
        try {
            const r = await api.postData(`${BASE}/envois/${id}/confirmer`, {});
            remplacerEnvoi(r.data.data);
            chargerEtat();
            if (r.data.data.statut === 'en_cours') suivreEnvoi(id);
        } catch (e: any) {
            setErreur(e?.response?.data?.message ?? 'L\'envoi n\'a pas pu être confirmé.');
        }
    };

    const annuler = async (id: number) => {
        try {
            const r = await api.postData(`${BASE}/envois/${id}/annuler`, {});
            remplacerEnvoi(r.data.data);
        } catch (e: any) {
            setErreur(e?.response?.data?.message ?? 'L\'envoi n\'a pas pu être annulé.');
        }
    };

    /* Les messages, en paires question → réponse. */
    const paires: { question: Message; reponse?: Message }[] = [];
    messages.forEach((m) => {
        if (m.role === 'user') paires.push({ question: m });
        else if (paires.length) paires[paires.length - 1].reponse = m;
    });

    const limiteAtteinte = usage ? usage.questions_aujourdhui >= usage.questions_par_jour : false;

    const historique = (
        <div className="flex h-full flex-col">
            <button type="button" onClick={nouvelle} className="mb-3 inline-flex items-center justify-center gap-2 rounded-lg bg-[#10377b] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#0c2a5e] dark:bg-[#3987e5] dark:text-slate-950">
                <Plus size={15} /> Nouvelle conversation
            </button>
            <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Historique</p>
            <div className="-mx-1 flex-1 space-y-0.5 overflow-y-auto">
                {conversations.length === 0 && <p className="px-1 text-[13px] text-slate-500">Vos conversations apparaîtront ici.</p>}
                {conversations.map((c) => (
                    <button
                        key={c.id}
                        type="button"
                        onClick={() => ouvrir(c.id)}
                        className={`block w-full truncate rounded-lg px-2 py-1.5 text-left text-[13px] ${c.id === courante ? 'bg-slate-100 font-semibold text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60'}`}
                    >
                        {c.titre ?? 'Sans titre'}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden">
                <aside className="hidden w-64 shrink-0 border-r border-slate-200 p-4 dark:border-slate-800 lg:block">{historique}</aside>

                {historiqueOuvert && (
                    <div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setHistoriqueOuvert(false)}>
                        <div className="h-full w-72 max-w-[85vw] bg-white p-4 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
                            <div className="mb-3 flex justify-end">
                                <button type="button" aria-label="Fermer" onClick={() => setHistoriqueOuvert(false)} className="text-slate-500"><X size={18} /></button>
                            </div>
                            {historique}
                        </div>
                    </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 md:px-8">
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={() => setHistoriqueOuvert(true)} aria-label="Historique" className="rounded-lg border border-slate-200 p-1.5 text-slate-600 dark:border-slate-700 dark:text-slate-300 lg:hidden">
                                <History size={16} />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Assistant</h1>
                                <p className="text-[13px] text-slate-500">Chiffres, tendances, segments et rapports. Il prépare les envois, vous les confirmez.</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[12px]">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <ShieldCheck size={13} /> Lecture seule
                            </span>
                            {usage && (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {usage.questions_aujourdhui} / {usage.questions_par_jour} questions aujourd'hui · {usage.cout_du_mois_usd.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' })} ce mois
                                </span>
                            )}
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
                        <div className="mx-auto flex max-w-4xl flex-col gap-6">
                            {usage && !usage.configure && (
                                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                                    L'assistant n'est pas encore configuré sur le serveur : il manque la clé <code>ANTHROPIC_API_KEY</code> dans le fichier <code>.env</code> de l'API.
                                </p>
                            )}

                            {paires.length === 0 && !enCours && (
                                <div className="py-6">
                                    <div className="mb-6 flex items-center gap-3">
                                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#10377b] text-white dark:bg-[#3987e5] dark:text-slate-950"><Sparkles size={20} /></span>
                                        <div>
                                            <p className="text-[16px] font-bold text-slate-900 dark:text-white">Que voulez-vous savoir ?</p>
                                            <p className="text-[13px] text-slate-500">Les chiffres viennent de la base, en lecture seule. Rien n'est modifié, et aucun message ne part sans votre confirmation.</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        {SUGGESTIONS.map((s) => (
                                            <div key={s.famille}>
                                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.famille}</p>
                                                <div className="space-y-2">
                                                    {s.questions.map((q) => (
                                                        <button key={q} type="button" disabled={limiteAtteinte} onClick={() => envoyer(q)} className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-[13px] text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                                                            {q}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {paires.map(({ question: q, reponse }) => (
                                <div key={q.id} className="flex flex-col gap-3">
                                    <div className="max-w-[85%] self-end whitespace-pre-line rounded-2xl rounded-tr-md bg-[#10377b] px-4 py-2.5 text-[14px] text-white dark:bg-[#3987e5] dark:text-slate-950">{q.texte}</div>
                                    {reponse && <Reponse message={reponse} question={q.texte ?? ''} theme={theme} onConfirmer={confirmer} onAnnuler={annuler} />}
                                </div>
                            ))}

                            {enCours && (
                                <div className="flex flex-col gap-3">
                                    <div className="max-w-[85%] self-end whitespace-pre-line rounded-2xl rounded-tr-md bg-[#10377b] px-4 py-2.5 text-[14px] text-white dark:bg-[#3987e5] dark:text-slate-950">{enCours}</div>
                                    <p className="flex items-center gap-2 text-[13px] text-slate-500"><Loader2 size={15} className="animate-spin" /> Analyse des données en cours…</p>
                                </div>
                            )}

                            {erreur && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">{erreur}</p>}
                            <div ref={fin} />
                        </div>
                    </div>

                    <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800 md:px-8">
                        <form
                            className="mx-auto flex max-w-4xl items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 pl-4 focus-within:border-slate-400 dark:border-slate-700 dark:bg-slate-900"
                            onSubmit={(e) => {
                                e.preventDefault();
                                envoyer();
                            }}
                        >
                            <textarea
                                id="question-assistant"
                                ref={saisie}
                                value={question}
                                rows={1}
                                disabled={limiteAtteinte}
                                onChange={(e) => {
                                    setQuestion(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        envoyer();
                                    }
                                }}
                                placeholder={limiteAtteinte ? 'Limite de questions du jour atteinte' : 'Posez une question, demandez un rapport ou un envoi…'}
                                className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent py-2 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                            />
                            <button type="submit" aria-label="Envoyer" disabled={!question.trim() || Boolean(enCours) || limiteAtteinte} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#10377b] text-white disabled:opacity-40 dark:bg-[#3987e5] dark:text-slate-950">
                                {enCours ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
                            </button>
                        </form>
                        <p className="mx-auto mt-1.5 max-w-4xl text-center text-[11px] text-slate-400">L'assistant peut se tromper dans l'interprétation d'une question : la période et la mesure utilisées sont rappelées dans chaque réponse.</p>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default Assistant;
