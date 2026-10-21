import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, History, Loader2, Maximize2, PanelRight, Plus, Printer, ShieldCheck, Sparkles, X } from 'lucide-react';
import ApiService from '../../services/ApiService';
import { BlocAffiche } from './Blocs';
import Texte from './Texte';
import { useHylana } from './HylanaContext';
import { useSurvolMenu } from '../components/menuReduit';
import type { Bloc, ConversationResume, Message, Usage } from './types';

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
    const echapper = (t: string) => t.replace(/</g, '&lt;');
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map((n) => n.outerHTML).join('');
    const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${echapper(titre)}</title>${styles}
        <style>body{background:#fff;padding:24px;font-family:'DM Sans',sans-serif} .print\\:hidden{display:none!important} section{break-inside:avoid;margin-bottom:12px}</style>
        </head><body><p style="font-size:12px;color:#64748b;margin-bottom:4px">Ongo 237 · Rapport de Hylana · ${date}</p>
        <h1 style="font-size:18px;font-weight:700;margin-bottom:16px">${echapper(titre)}</h1>${noeud.innerHTML}</body></html>`);
    doc.close();
    cadre.contentWindow.addEventListener('afterprint', () => setTimeout(() => cadre.remove(), 500));
    setTimeout(() => cadre.remove(), 60000);
    setTimeout(() => {
        cadre.contentWindow?.focus();
        cadre.contentWindow?.print();
    }, 400);
};

const Pastille: React.FC<{ taille?: number }> = ({ taille = 28 }) => (
    <span
        className="inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#10377b] to-[#3d5fd9] text-white"
        style={{ width: taille, height: taille }}
    >
        <Sparkles size={Math.round(taille * 0.5)} />
    </span>
);

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
                    <div className={erreur ? 'rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/60 dark:bg-rose-950/30' : ''}>
                        <Texte texte={message.texte} />
                    </div>
                )}
                {message.blocs.map((bloc: Bloc, i) => (
                    <BlocAffiche key={i} bloc={bloc} theme={theme} onConfirmer={onConfirmer} onAnnuler={onAnnuler} />
                ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-400 print:hidden">
                {!erreur && message.texte && (
                    <button type="button" onClick={() => navigator.clipboard?.writeText(message.texte ?? '').catch(() => undefined)} className="font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white">
                        Copier
                    </button>
                )}
                {!erreur && (message.blocs.length > 0 || (message.texte?.length ?? 0) > 300) && (
                    <button type="button" onClick={() => imprimer(zone.current, question)} className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white">
                        <Printer size={13} /> Imprimer ou PDF
                    </button>
                )}
                {outils.length > 0 && <span>Calculé avec : {outils.join(', ')}</span>}
            </div>
        </div>
    );
};

/**
 * Hylana, ouverte par-dessus le back-office.
 *
 * En grand, elle occupe tout l'écran à côté du menu réduit ; à côté, elle
 * laisse la page utilisable. Montée une seule fois au-dessus des routes : la
 * conversation survit à la navigation.
 */
const PanneauHylana: React.FC<{ theme: 'light' | 'dark' }> = ({ theme }) => {
    const hylana = useHylana();
    // Le menu déplié au survol pousse aussi Hylana.
    const survolMenu = useSurvolMenu();
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

    const ouverte = hylana?.ouverte ?? false;
    const grand = hylana?.mode !== 'cote';

    const chargerEtat = useCallback(async () => {
        try {
            const [etat, liste] = await Promise.all([api.getData(`${BASE}/etat`), api.getData(`${BASE}/conversations`)]);
            setUsage(etat.data.data);
            setConversations(liste.data.data);
        } catch {
            setErreur('Impossible de joindre Hylana. Vérifiez votre connexion.');
        }
    }, [api]);

    useEffect(() => {
        if (ouverte) {
            chargerEtat();
            setTimeout(() => saisie.current?.focus(), 50);
        }
    }, [ouverte, chargerEtat]);

    useEffect(() => {
        fin.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, enCours]);

    if (!hylana || !ouverte) return null;

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
        if (saisie.current) saisie.current.style.height = 'auto';
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
    const bouton = 'grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white';

    const historique = (
        <div className="flex h-full min-h-0 flex-col gap-1.5">
            <button type="button" onClick={nouvelle} className="mb-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#eceffd] px-3 py-2.5 text-[14px] font-bold text-[#10377b] hover:bg-[#e2e7fc] dark:bg-[#1c2a4d] dark:text-[#8fb0ff]">
                <Plus size={16} /> Nouvelle conversation
            </button>
            <p className="px-2 pb-1 pt-2 text-[12px] font-bold text-slate-500">Conversations</p>
            <div className="-mx-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1">
                {conversations.length === 0 && <p className="px-2 text-[13px] text-slate-500">Vos conversations apparaîtront ici.</p>}
                {conversations.map((c) => (
                    <button
                        key={c.id}
                        type="button"
                        onClick={() => ouvrir(c.id)}
                        className={`block w-full truncate rounded-lg px-2.5 py-2 text-left text-[13.5px] ${c.id === courante ? 'bg-slate-100 font-semibold text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'}`}
                    >
                        {c.titre ?? 'Sans titre'}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div
            role="dialog"
            aria-label="Hylana"
            className={
                grand
                    ? `fixed inset-x-0 bottom-0 top-16 z-[45] bg-background-light p-0 transition-[left] duration-300 dark:bg-background-dark lg:p-3 ${survolMenu ? 'lg:left-[272px]' : 'lg:left-20'}`
                    : 'fixed inset-x-0 bottom-0 top-16 z-[45] lg:inset-x-auto lg:right-3 lg:bottom-3 lg:top-0 lg:w-[400px]'
            }
        >
            <div className={`relative flex h-full overflow-hidden bg-white dark:bg-slate-900 lg:rounded-2xl lg:border lg:border-slate-200 lg:dark:border-slate-800 ${grand ? '' : 'lg:rounded-t-none lg:border-t-0 lg:shadow-2xl'}`}>
                {/* L'historique : colonne en grand, volet à la demande à côté. */}
                {grand && <aside className="hidden w-64 shrink-0 border-r border-slate-200 p-4 dark:border-slate-800 lg:block">{historique}</aside>}
                {historiqueOuvert && (
                    <div className={`absolute inset-0 z-10 bg-slate-950/30 ${grand ? 'lg:hidden' : ''}`} onClick={() => setHistoriqueOuvert(false)}>
                        <div className="h-full w-72 max-w-[85%] bg-white p-4 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
                            {historique}
                        </div>
                    </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-3">
                        <div className="flex min-w-0 items-center gap-2">
                            <button type="button" aria-label="Historique" onClick={() => setHistoriqueOuvert(true)} className={`${bouton} ${grand ? 'lg:hidden' : ''}`}>
                                <History size={16} />
                            </button>
                            <Pastille taille={24} />
                            <span className="truncate text-[14px] font-bold text-slate-900 dark:text-white">Hylana</span>
                            <span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 sm:inline-flex">
                                <ShieldCheck size={12} /> Lecture seule
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {usage && grand && (
                                <span className="hidden text-[12px] tabular-nums text-slate-400 md:inline">
                                    {usage.questions_aujourdhui} / {usage.questions_par_jour} questions aujourd'hui
                                </span>
                            )}
                            <button type="button" onClick={hylana.changerMode} className={`${bouton} hidden lg:grid`} title={grand ? 'Mettre à côté de la page' : 'Agrandir'} aria-label={grand ? 'Mettre à côté de la page' : 'Agrandir'}>
                                {grand ? <PanelRight size={16} /> : <Maximize2 size={15} />}
                            </button>
                            <button type="button" onClick={hylana.fermer} className={bouton} title="Fermer (Échap)" aria-label="Fermer">
                                <X size={17} />
                            </button>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
                        <div className={`mx-auto flex flex-col gap-6 ${grand ? 'max-w-3xl' : ''}`}>
                            {usage && !usage.configure && (
                                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                                    Hylana n'est pas encore configurée sur le serveur : il manque la clé <code>ANTHROPIC_API_KEY</code> dans le fichier <code>.env</code> de l'API.
                                </p>
                            )}

                            {paires.length === 0 && !enCours && (
                                <div className="py-4">
                                    <div className="mb-6 flex items-center gap-3">
                                        <Pastille taille={40} />
                                        <div>
                                            <p className="text-[16px] font-bold text-slate-900 dark:text-white">Bonjour, je suis Hylana, experte en pilotage et en données d'Ongo. Que voulez-vous savoir ?</p>
                                            <p className="text-[13px] text-slate-500">Je lis les chiffres en lecture seule. Je ne modifie rien, et aucun message ne part sans votre confirmation.</p>
                                        </div>
                                    </div>
                                    <div className={`grid grid-cols-1 gap-4 ${grand ? 'md:grid-cols-3' : ''}`}>
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
                                    <div className="max-w-[85%] self-end whitespace-pre-line rounded-2xl rounded-tr-md bg-slate-100 px-4 py-2.5 text-[14px] text-slate-900 dark:bg-slate-800 dark:text-white">{q.texte}</div>
                                    {reponse && <Reponse message={reponse} question={q.texte ?? ''} theme={theme} onConfirmer={confirmer} onAnnuler={annuler} />}
                                </div>
                            ))}

                            {enCours && (
                                <div className="flex flex-col gap-3">
                                    <div className="max-w-[85%] self-end whitespace-pre-line rounded-2xl rounded-tr-md bg-slate-100 px-4 py-2.5 text-[14px] text-slate-900 dark:bg-slate-800 dark:text-white">{enCours}</div>
                                    <p className="flex items-center gap-2 text-[13px] text-slate-500"><Loader2 size={15} className="animate-spin" /> Hylana analyse les données…</p>
                                </div>
                            )}

                            {erreur && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">{erreur}</p>}
                            <div ref={fin} />
                        </div>
                    </div>

                    <div className="px-4 pb-2 pt-1">
                        <form
                            className={`mx-auto flex flex-col gap-3 rounded-[20px] border-[1.5px] border-slate-200 bg-white px-4 pb-2.5 pt-3 focus-within:border-slate-400 dark:border-slate-700 dark:bg-slate-900 ${grand ? 'max-w-3xl' : ''}`}
                            onSubmit={(e) => {
                                e.preventDefault();
                                envoyer();
                            }}
                        >
                            <textarea
                                id="question-hylana"
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
                                placeholder={limiteAtteinte ? 'Limite de questions du jour atteinte' : grand && window.innerWidth >= 640 ? 'Posez une question, demandez un rapport ou un envoi…' : 'Posez une question…'}
                                className="max-h-40 min-h-[28px] resize-none bg-transparent text-[14px] text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                            />
                            <div className="flex items-center justify-between">
                                <button type="button" onClick={nouvelle} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white" title="Nouvelle conversation">
                                    <Plus size={16} /> Nouvelle
                                </button>
                                <button type="submit" aria-label="Envoyer" disabled={!question.trim() || Boolean(enCours) || limiteAtteinte} className="grid size-9 place-items-center rounded-full bg-[#10377b] text-white disabled:bg-slate-100 disabled:text-slate-400 dark:bg-[#3987e5] dark:text-slate-950 dark:disabled:bg-slate-800">
                                    {enCours ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
                                </button>
                            </div>
                        </form>
                        <p className="mt-1.5 text-center text-[11px] text-slate-400">Hylana peut se tromper : la période et la mesure utilisées sont rappelées dans chaque réponse.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PanneauHylana;
export { Pastille };
