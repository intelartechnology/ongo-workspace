import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import MainLayout from './MainLayout';
import ApiService from '../services/ApiService';
import Trajet from './components/Trajet';

interface Props {
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

interface Personne {
    id: number;
    nom: string | null;
    prenom: string | null;
    telephone: string | null;
}

interface Ligne {
    id: number;
    code: string | null;
    lieu_depart: string | null;
    lieu_arrive: string | null;
    montant: number;
    transaction_type: string | null;
    is_paid: boolean;
    cloture_auto_at: string | null;
    date_depart: string | null;
    heure_depart: string | null;
    client: Personne | null;
    chauffeur: Personne | null;
}

const entete = "px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap";

const nom = (p: Personne | null) => (p ? [p.prenom, p.nom].filter(Boolean).join(' ') || `#${p.id}` : '—');

const dateHeure = (iso: string | null) =>
    iso ? new Date(iso.replace(' ', 'T')).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

/**
 * Les courses closes d'office sans arrivée détectée.
 *
 * Restées en cours huit heures, elles ont été annulées sans mouvement
 * d'argent et le véhicule a été libéré. Reste à décider : la course a-t-elle
 * eu lieu (on la règle), ou non (on confirme l'annulation, et le support
 * rembourse un paiement en ligne) ?
 */
const CoursesARegulariser: React.FC<Props> = ({ onLogout, theme, toggleTheme }) => {
    const api = new ApiService();
    const [lignes, setLignes] = useState<Ligne[]>([]);
    const [pagination, setPagination] = useState<any>(null);
    const [chargement, setChargement] = useState(true);
    const [enCours, setEnCours] = useState<number | null>(null);

    const charger = async (url?: string) => {
        setChargement(true);
        try {
            const { data } = url ? await api.getDatawithPagination(url, true) : await api.getData('v3/admin/courses/a-regulariser');
            if (data.success) {
                setLignes(data.data.data);
                setPagination(data.data);
            } else {
                toast.error(data.message || 'La liste n\'a pas pu être chargée');
            }
        } catch {
            toast.error('Connexion au serveur impossible');
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => {
        charger();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const decider = async (l: Ligne, decision: 'TERMINEE' | 'ANNULEE') => {
        const enLigne = l.is_paid && l.transaction_type === 'NUMERIC';
        const ok = await Swal.fire({
            title: decision === 'TERMINEE' ? `Terminer et régler #${l.id} ?` : `Confirmer l'annulation de #${l.id} ?`,
            html:
                decision === 'TERMINEE'
                    ? `La course est réglée comme une course faite : part du chauffeur et commission sur <b>${l.montant.toLocaleString('fr-FR')} F</b>.`
                    : enLigne
                      ? "Rien n'est réglé. Le client avait payé en ligne : le support est prévenu pour le rembourser."
                      : "Rien n'est réglé. La course reste annulée.",
            icon: decision === 'TERMINEE' ? 'question' : 'warning',
            showCancelButton: true,
            confirmButtonText: decision === 'TERMINEE' ? 'Terminer et régler' : "Confirmer l'annulation",
            cancelButtonText: 'Fermer',
            confirmButtonColor: decision === 'TERMINEE' ? '#10377b' : '#dc2626',
        });
        if (!ok.isConfirmed) return;

        setEnCours(l.id);
        try {
            const { data } = await api.postData(`v3/admin/courses/${l.id}/regulariser`, { decision });
            if (data.success) {
                toast.success(data.message);
                charger();
            } else {
                toast.error(data.message || 'Décision refusée');
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Connexion au serveur impossible');
        } finally {
            setEnCours(null);
        }
    };

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="px-4 md:px-8 py-6 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Courses à régulariser</h1>
                    {pagination && (
                        <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2.5 py-1 rounded-lg text-xs font-black tabular-nums">
                            {pagination.total}
                        </span>
                    )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
                    Restées en cours plus de 8 h sans arrivée à destination détectée : clôturées sans mouvement d'argent, véhicule libéré.
                    Décidez si la course a eu lieu.
                </p>
            </div>

            <div className="p-4 md:p-8 pt-2 md:pt-2">
                {chargement && lignes.length === 0 ? (
                    <div className="h-40 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
                ) : lignes.length === 0 ? (
                    <div className="py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-5xl text-emerald-500/60">task_alt</span>
                        <p className="font-bold text-slate-700 dark:text-slate-200">Rien à régulariser</p>
                        <p className="text-sm text-slate-500">Toutes les courses closes automatiquement ont été traitées.</p>
                    </div>
                ) : (
                    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-opacity ${chargement ? 'opacity-60' : ''}`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[1040px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className={entete}>Course</th>
                                        <th className={entete}>Trajet</th>
                                        <th className={entete}>Client</th>
                                        <th className={entete}>Chauffeur</th>
                                        <th className={`${entete} text-right`}>Montant</th>
                                        <th className={entete}>Paiement</th>
                                        <th className={entete}>Clôturée</th>
                                        <th className={`${entete} text-right`}>Décision</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {lignes.map((l) => {
                                        const enLigne = l.transaction_type === 'NUMERIC';
                                        return (
                                            <tr key={l.id} className="align-top">
                                                <td className="px-5 py-3">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">#{l.id}</p>
                                                    <p className="text-xs text-slate-500">{l.code || ''}</p>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <Trajet depart={l.lieu_depart} arrivee={l.lieu_arrive} largeur="max-w-[220px]" />
                                                </td>
                                                <td className="px-5 py-3">
                                                    <p className="text-sm text-slate-700 dark:text-slate-300">{nom(l.client)}</p>
                                                    <p className="text-xs text-slate-500 tabular-nums">{l.client?.telephone || ''}</p>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <p className="text-sm text-slate-700 dark:text-slate-300">{nom(l.chauffeur)}</p>
                                                    <p className="text-xs text-slate-500 tabular-nums">{l.chauffeur?.telephone || ''}</p>
                                                </td>
                                                <td className="px-5 py-3 text-right text-sm font-bold tabular-nums whitespace-nowrap">{l.montant.toLocaleString('fr-FR')} F</td>
                                                <td className="px-5 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${enLigne ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                        {enLigne ? (l.is_paid ? 'En ligne, payée' : 'En ligne, non payée') : 'Espèces'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-sm text-slate-500 whitespace-nowrap">{dateHeure(l.cloture_auto_at)}</td>
                                                <td className="px-5 py-3">
                                                    <div className="flex flex-wrap justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            disabled={enCours === l.id}
                                                            onClick={() => decider(l, 'TERMINEE')}
                                                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 whitespace-nowrap"
                                                        >
                                                            Terminer et régler
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={enCours === l.id}
                                                            onClick={() => decider(l, 'ANNULEE')}
                                                            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-50 whitespace-nowrap"
                                                        >
                                                            Confirmer l'annulation
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {pagination && pagination.last_page > 1 && (
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-slate-500 tabular-nums">{pagination.from} à {pagination.to} sur {pagination.total}</p>
                        <div className="flex flex-wrap gap-1.5">
                            {pagination.links.map((lien: any, i: number) => (
                                <button
                                    key={i}
                                    type="button"
                                    disabled={!lien.url || lien.active}
                                    onClick={() => lien.url && charger(lien.url)}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold ${lien.active ? 'bg-primary text-white' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800'} ${!lien.url ? 'opacity-30' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: lien.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default CoursesARegulariser;
