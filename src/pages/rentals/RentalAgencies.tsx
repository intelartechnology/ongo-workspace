import React, { useEffect, useMemo, useState } from 'react';
import MainLayout from '../MainLayout';
import ApiService from '../../services/ApiService';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { SearchBar, Button, Input, ActionsMenu, type ActionItem } from '../../components/ui';
import { champBase, champTaille } from '../../components/ui/tokens';

interface RentalAgenciesProps {
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

interface Agence {
    id: number;
    libelle: string;
    description: string | null;
    ville: string | null;
    telephone: string | null;
    email: string | null;
    status: string;
    client: { id: number; nom: string | null; prenom: string | null; telephone: string | null } | null;
    vehicules_count: number;
    locations_count: number;
}

type Filtre = 'toutes' | 'actives' | 'attente';

/** Le compte Ongo qui confirme les locations et reçoit les paiements. */
interface Compte {
    id: number;
    nom: string | null;
    prenom: string | null;
    telephone: string | null;
    /** Les autres agences qu'il gère déjà, s'il y en a. */
    agences?: string[];
}

const nomDuCompte = (c: Compte | null | undefined) => [c?.prenom, c?.nom].filter(Boolean).join(' ') || '—';

const entete = "px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest";

const estActive = (a: Agence) => a.status === 'ACTIVE';

/**
 * Les agences de location : les voir, les créer, les modifier, les activer,
 * les retirer.
 *
 * Le contact de l'agence (téléphone, email) et son compte gestionnaire sont
 * deux choses : le premier sert à la joindre, le second confirme les
 * locations et reçoit les paiements. Changer de gestionnaire demande donc
 * une confirmation qui le rappelle.
 *
 * La suppression suit la règle du serveur. Une agence déjà réservée ne se
 * supprime pas, l'historique des clients y renvoie : la confirmation le dit
 * avant même d'essayer, et propose de la désactiver.
 */
const RentalAgencies: React.FC<RentalAgenciesProps> = ({ onLogout, theme, toggleTheme }) => {
    const api = new ApiService();
    const [agences, setAgences] = useState<Agence[]>([]);
    const [chargement, setChargement] = useState(true);
    const [recherche, setRecherche] = useState('');
    const [filtre, setFiltre] = useState<Filtre>('toutes');

    // La fenêtre sert à créer (`aModifier` nul) et à modifier.
    const [formOuvert, setFormOuvert] = useState(false);
    const [aModifier, setAModifier] = useState<Agence | null>(null);
    const [libelle, setLibelle] = useState('');
    const [ville, setVille] = useState('');
    const [description, setDescription] = useState('');
    const [telephone, setTelephone] = useState('');
    const [email, setEmail] = useState('');
    const [gestionnaire, setGestionnaire] = useState<Compte | null>(null);
    const [changerCompte, setChangerCompte] = useState(false);
    const [numeroCompte, setNumeroCompte] = useState('');
    const [rechercheCompte, setRechercheCompte] = useState(false);
    const [erreurCompte, setErreurCompte] = useState<string | null>(null);

    const [aSupprimer, setASupprimer] = useState<Agence | null>(null);
    const [enCours, setEnCours] = useState(false);

    const charger = async () => {
        setChargement(true);
        try {
            const { data } = await api.getData('location/agence/all');
            if (data.success) setAgences(data.data || []);
            else toast.error(data.message || 'Les agences n\'ont pas pu être chargées');
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

    // Échap ferme la fenêtre ouverte, sauf pendant un envoi.
    useEffect(() => {
        if (!formOuvert && !aSupprimer) return;
        const auClavier = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !enCours) {
                setFormOuvert(false);
                setASupprimer(null);
            }
        };
        window.addEventListener('keydown', auClavier);
        return () => window.removeEventListener('keydown', auClavier);
    }, [formOuvert, aSupprimer, enCours]);

    const visibles = useMemo(() => {
        const terme = recherche.trim().toLowerCase();
        return agences
            .filter((a) => filtre === 'toutes' || (filtre === 'actives' ? estActive(a) : !estActive(a)))
            .filter((a) =>
                !terme ||
                `${a.libelle} ${a.ville ?? ''} ${a.telephone ?? ''} ${a.email ?? ''} ${a.client?.prenom ?? ''} ${a.client?.nom ?? ''} ${a.client?.telephone ?? ''}`
                    .toLowerCase()
                    .includes(terme)
            );
    }, [agences, recherche, filtre]);

    const nombres = {
        toutes: agences.length,
        actives: agences.filter(estActive).length,
        attente: agences.filter((a) => !estActive(a)).length,
    };

    const ouvrirFormulaire = (a: Agence | null) => {
        setAModifier(a);
        setLibelle(a?.libelle || '');
        setVille(a?.ville || '');
        setDescription(a?.description || '');
        setTelephone(a?.telephone || '');
        setEmail(a?.email || '');
        setGestionnaire(a?.client ?? null);
        // À la création, il faut un compte : la recherche s'ouvre d'emblée.
        setChangerCompte(a === null);
        setNumeroCompte('');
        setErreurCompte(null);
        setFormOuvert(true);
    };

    const chercherCompte = async () => {
        if (numeroCompte.trim().length < 8) {
            setErreurCompte('Saisissez le numéro complet du compte');
            return;
        }
        setRechercheCompte(true);
        setErreurCompte(null);
        try {
            const { data } = await api.postData('location/agence/compte', { telephone: numeroCompte.trim() });
            if (data.success) {
                setGestionnaire(data.data);
                setChangerCompte(false);
            } else {
                setErreurCompte(data.message || 'Aucun compte avec ce numéro');
            }
        } catch (e: any) {
            setErreurCompte(e?.response?.data?.message || 'Connexion au serveur impossible');
        } finally {
            setRechercheCompte(false);
        }
    };

    const enregistrer = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!libelle.trim()) {
            toast.error('Le nom de l\'agence est obligatoire');
            return;
        }
        if (!gestionnaire) {
            toast.error('Choisissez le compte gestionnaire de l\'agence');
            return;
        }

        // Changer de gestionnaire change qui reçoit les paiements : on le dit.
        const nouveauGestionnaire = aModifier !== null && gestionnaire.id !== aModifier.client?.id;
        if (nouveauGestionnaire) {
            const ok = await Swal.fire({
                title: 'Changer le compte gestionnaire ?',
                html: `<b>${nomDuCompte(gestionnaire)}</b> confirmera les locations de « ${aModifier!.libelle} » et <b>recevra ses paiements</b>, à la place de ${nomDuCompte(aModifier!.client)}.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Changer',
                cancelButtonText: 'Annuler',
                confirmButtonColor: '#10377b',
            });
            if (!ok.isConfirmed) return;
        }

        const corps = {
            libelle: libelle.trim(),
            ville: ville.trim(),
            description: description.trim(),
            telephone: telephone.trim(),
            email: email.trim(),
            id_utilisateur: gestionnaire.id,
        };

        setEnCours(true);
        try {
            const { data } = aModifier
                ? await api.postData(`location/agence/edit/${aModifier.id}`, corps)
                : await api.postData('location/agence/store', corps);
            if (data.success) {
                toast.success(aModifier ? `Agence « ${libelle.trim()} » modifiée` : `Agence « ${libelle.trim()} » créée`);
                setFormOuvert(false);
                charger();
            } else {
                toast.error(data.message || 'Modification refusée');
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Connexion au serveur impossible');
        } finally {
            setEnCours(false);
        }
    };

    const basculer = async (a: Agence) => {
        setEnCours(true);
        try {
            const { data } = await api.postData('location/agence/active_desactive', { id_agence: a.id });
            if (data.success) {
                toast.success(estActive(a) ? `« ${a.libelle} » désactivée` : `« ${a.libelle} » activée`);
                setASupprimer(null);
                charger();
            } else {
                toast.error(data.message || 'Changement refusé');
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Connexion au serveur impossible');
        } finally {
            setEnCours(false);
        }
    };

    const supprimer = async () => {
        if (!aSupprimer) return;
        setEnCours(true);
        try {
            const { data } = await api.postData(`location/agence/delete/${aSupprimer.id}`, {});
            if (data.success) {
                toast.success(`Agence « ${aSupprimer.libelle} » supprimée`);
                setASupprimer(null);
                charger();
            } else {
                toast.error(data.message || 'Suppression refusée');
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Connexion au serveur impossible');
        } finally {
            setEnCours(false);
        }
    };

    const actions = (a: Agence): ActionItem[] => [
        { label: 'Modifier', icon: 'edit', onClick: () => ouvrirFormulaire(a) },
        {
            label: estActive(a) ? 'Désactiver' : 'Activer',
            icon: estActive(a) ? 'toggle_off' : 'toggle_on',
            disabled: enCours,
            onClick: () => basculer(a),
        },
        { label: 'Supprimer', icon: 'delete', danger: true, separatorBefore: true, onClick: () => setASupprimer(a) },
    ];


    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="px-4 md:px-8 py-6 flex flex-col gap-5">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Agences de location</h1>
                        {!chargement && (
                            <span className="bg-primary/10 text-primary dark:text-primary-fixed-dim px-2.5 py-1 rounded-lg text-xs font-black tabular-nums">
                                {agences.length}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl">
                        Les agences qui proposent leurs véhicules en location. Une agence désactivée disparaît du catalogue, ses données restent.
                    </p>
                </div>
                    <Button variant="primary" icon="add" className="shrink-0" onClick={() => ouvrirFormulaire(null)}>
                        Nouvelle agence
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <SearchBar
                        value={recherche}
                        onChange={setRecherche}
                        placeholder="Rechercher une agence, une ville, un propriétaire…"
                        className="max-w-md flex-1 min-w-[240px]"
                    />
                    <div className="flex gap-1.5">
                        {([
                            ['toutes', 'Toutes'],
                            ['actives', 'Actives'],
                            ['attente', 'En attente'],
                        ] as [Filtre, string][]).map(([cle, texte]) => (
                            <button
                                key={cle}
                                type="button"
                                onClick={() => setFiltre(cle)}
                                className={`rounded-full border px-3 py-1 text-[13px] tabular-nums transition-colors ${
                                    filtre === cle
                                        ? 'border-primary bg-primary text-white'
                                        : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:hover:text-white'
                                }`}
                            >
                                {texte} · {nombres[cle]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-8 pt-0 md:pt-0">
                {chargement ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                        {Array(5).fill(0).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-5 py-4">
                                <div className="h-3 w-48 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                                <div className="h-3 flex-1 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                            </div>
                        ))}
                    </div>
                ) : visibles.length === 0 ? (
                    <div className="py-16 px-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-2">
                        <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700">storefront</span>
                        <p className="font-bold text-slate-800 dark:text-slate-100">
                            {agences.length === 0 ? 'Aucune agence de location' : 'Aucune agence ne correspond'}
                        </p>
                        {agences.length > 0 && (
                            <button
                                type="button"
                                onClick={() => { setRecherche(''); setFiltre('toutes'); }}
                                className="text-xs font-bold text-primary hover:underline"
                            >
                                Réinitialiser la recherche
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[860px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className={entete}>Nom</th>
                                        <th className={entete}>Ville</th>
                                        <th className={entete}>Contact</th>
                                        <th className={`${entete} text-right`}>Véhicules</th>
                                        <th className={`${entete} text-right`}>Réservations</th>
                                        <th className={entete}>Statut</th>
                                        <th className={`${entete} text-right`}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {visibles.map((a) => (
                                        <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-5 py-3 text-sm font-bold text-slate-900 dark:text-white">{a.libelle}</td>
                                            <td className="px-5 py-3 text-sm text-slate-700 dark:text-slate-300">{a.ville || '—'}</td>
                                            {/* Le contact de l'agence ; à défaut, son compte gestionnaire. */}
                                            <td className="px-5 py-3">
                                                <p className="text-sm text-slate-700 dark:text-slate-300 tabular-nums">{a.telephone || a.client?.telephone || '—'}</p>
                                                <p className="text-xs text-slate-500">{a.email || (a.telephone ? '' : nomDuCompte(a.client))}</p>
                                            </td>
                                            <td className="px-5 py-3 text-right text-sm tabular-nums text-slate-700 dark:text-slate-300">{a.vehicules_count}</td>
                                            <td className="px-5 py-3 text-right text-sm tabular-nums text-slate-700 dark:text-slate-300">{a.locations_count}</td>
                                            <td className="px-5 py-3">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        estActive(a)
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                                    }`}
                                                >
                                                    {estActive(a) ? 'Active' : 'En attente'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex justify-end">
                                                    <ActionsMenu items={actions(a)} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Création et modification */}
            {formOuvert && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                    onMouseDown={(e) => { if (e.target === e.currentTarget && !enCours) setFormOuvert(false); }}
                >
                    <form
                        onSubmit={enregistrer}
                        role="dialog"
                        aria-modal="true"
                        aria-label={aModifier ? "Modifier l'agence" : 'Nouvelle agence'}
                        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col"
                    >
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                            <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                {aModifier ? `Modifier « ${aModifier.libelle} »` : 'Nouvelle agence'}
                            </h3>
                            <Button type="button" variant="ghost" size="sm" icon="close" aria-label="Fermer" onClick={() => setFormOuvert(false)} disabled={enCours} />
                        </div>
                        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">L'agence</p>
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs text-slate-500">Nom de l'agence</span>
                                <Input value={libelle} onChange={(e) => setLibelle(e.target.value)} maxLength={255} autoFocus />
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs text-slate-500">Ville</span>
                                <Input value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Ex. Yaoundé" maxLength={255} />
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs text-slate-500">Description</span>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={2}
                                    className={`${champBase} ${champTaille.md} resize-none`}
                                />
                            </label>

                            <div className="flex flex-col gap-1 pt-2">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Contact de l'agence</p>
                                <p className="text-xs text-slate-500">Ce que voient les clients et le support pour joindre l'agence.</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-xs text-slate-500">Téléphone</span>
                                    <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} inputMode="tel" maxLength={30} placeholder="6 77 12 34 56" />
                                </label>
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-xs text-slate-500">Email</span>
                                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={191} placeholder="contact@agence.cm" />
                                </label>
                            </div>

                            <div className="flex flex-col gap-1 pt-2">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Compte gestionnaire</p>
                                <p className="text-xs text-slate-500">Le compte Ongo qui confirme les locations et reçoit les paiements de l'agence.</p>
                            </div>
                            {gestionnaire && !changerCompte ? (
                                <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{nomDuCompte(gestionnaire)}</p>
                                        <p className="text-xs text-slate-500 tabular-nums">{gestionnaire.telephone || '—'}</p>
                                        {gestionnaire.agences && gestionnaire.agences.filter((n) => n !== aModifier?.libelle).length > 0 && (
                                            <p className="text-xs text-amber-700 dark:text-amber-400">
                                                Gère déjà : {gestionnaire.agences.filter((n) => n !== aModifier?.libelle).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                    <button type="button" onClick={() => { setChangerCompte(true); setNumeroCompte(''); setErreurCompte(null); }} className="text-sm font-bold text-primary hover:underline">
                                        Changer
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex gap-2">
                                        <Input
                                            value={numeroCompte}
                                            onChange={(e) => setNumeroCompte(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); chercherCompte(); } }}
                                            inputMode="tel"
                                            placeholder="Numéro du compte Ongo"
                                            className="flex-1"
                                        />
                                        <Button type="button" onClick={chercherCompte} loading={rechercheCompte} icon="search">Chercher</Button>
                                    </div>
                                    {erreurCompte && <span className="text-xs font-semibold text-error">{erreurCompte}</span>}
                                    {aModifier && gestionnaire && (
                                        <button type="button" onClick={() => { setChangerCompte(false); setGestionnaire(aModifier.client); }} className="self-start text-xs font-bold text-slate-500 hover:underline">
                                            Garder {nomDuCompte(aModifier.client)}
                                        </button>
                                    )}
                                </div>
                            )}
                            {aModifier && gestionnaire && gestionnaire.id !== aModifier.client?.id && (
                                <p className="rounded-lg bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                                    Ce compte recevra désormais les paiements de l'agence. Une confirmation le rappellera.
                                </p>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setFormOuvert(false)} disabled={enCours}>Annuler</Button>
                            <Button type="submit" variant="primary" loading={enCours} icon="check">{aModifier ? 'Enregistrer' : "Créer l'agence"}</Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Suppression : refusée d'avance pour une agence déjà réservée */}
            {aSupprimer && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
                    onClick={() => !enCours && setASupprimer(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-7 flex flex-col gap-5"
                    >
                        <div className="flex items-start gap-4">
                            <div className="size-12 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-rose-500 text-2xl">delete</span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                                    Supprimer « {aSupprimer.libelle} » ?
                                </h3>
                                {aSupprimer.locations_count > 0 ? (
                                    <p className="text-sm text-rose-700 dark:text-rose-400 leading-relaxed">
                                        Suppression impossible : l'agence a {aSupprimer.locations_count} réservation{aSupprimer.locations_count > 1 ? 's' : ''}.
                                        Les supprimer effacerait l'historique des clients.
                                        {estActive(aSupprimer) ? ' Désactivez-la plutôt : elle disparaît du catalogue et ses données restent.' : ' Elle est déjà désactivée.'}
                                    </p>
                                ) : aSupprimer.vehicules_count > 0 ? (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Ses {aSupprimer.vehicules_count} véhicule{aSupprimer.vehicules_count > 1 ? 's' : ''} et leurs images seront supprimés avec elle.
                                        Aucune réservation n'est concernée. C'est définitif.
                                    </p>
                                ) : (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Aucun véhicule ni réservation. L'agence sera supprimée définitivement.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setASupprimer(null)}
                                disabled={enCours}
                                className="flex-1 px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-all text-sm"
                            >
                                {aSupprimer.locations_count > 0 ? 'Fermer' : 'Annuler'}
                            </button>
                            {aSupprimer.locations_count > 0 ? (
                                estActive(aSupprimer) && (
                                    <button
                                        type="button"
                                        onClick={() => basculer(aSupprimer)}
                                        disabled={enCours}
                                        className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-primary text-white disabled:opacity-40"
                                    >
                                        Désactiver l'agence
                                    </button>
                                )
                            ) : (
                                <button
                                    type="button"
                                    onClick={supprimer}
                                    disabled={enCours}
                                    className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                                >
                                    {enCours && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                                    {enCours ? 'Suppression…' : 'Supprimer'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};

export default RentalAgencies;
