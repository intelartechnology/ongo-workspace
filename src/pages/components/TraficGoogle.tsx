import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";
import Loading from "../../components/Loading";
import BlocReglages from "./BlocReglages";
import { useReglages } from "./useReglages";

/**
 * Le temps de trajet avec trafic : l'interrupteur, et les heures où il joue.
 *
 * Sans créneau actif, le trafic joue toute la journée. Désactiver le dernier
 * créneau élargit donc la dépense au lieu de la réduire : l'écran le dit.
 */

interface Creneau {
    id: number;
    libelle: string;
    jours: string;
    heure_debut: string;
    heure_fin: string;
    actif: boolean | number;
}

interface Etat {
    interrupteur: boolean;
    creneaux_actifs: number;
    dans_un_creneau: boolean;
    actif: boolean;
    heure: string;
}

const JOURS = [
    { n: 1, court: "Lun" },
    { n: 2, court: "Mar" },
    { n: 3, court: "Mer" },
    { n: 4, court: "Jeu" },
    { n: 5, court: "Ven" },
    { n: 6, court: "Sam" },
    { n: 7, court: "Dim" },
];

const joursLisibles = (jours: string) => {
    const liste = jours.split(",").map(Number);
    if (liste.length === 7) return "Tous les jours";
    if (liste.join(",") === "1,2,3,4,5") return "Lun – ven";
    if (liste.join(",") === "6,7") return "Week-end";
    return liste.map((n) => JOURS.find((j) => j.n === n)?.court).join(", ");
};

const heure = (valeur: string) => valeur.slice(0, 5);

const messageDErreur = (erreur: unknown) => {
    const r = (erreur as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })?.response?.data;
    if (r?.errors) return Object.values(r.errors).flat().join("\n");
    return r?.message ?? String(erreur);
};

const champ =
    "block w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm text-slate-900 dark:text-white";
const etiquette = "text-xs font-semibold text-slate-500";
const carte = "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900";

const creneauVide = { libelle: "", jours: [1, 2, 3, 4, 5], heure_debut: "17:00", heure_fin: "20:00" };

/** La phrase d'état, et si elle doit attirer l'attention sur la dépense. */
const resume = (etat: Etat, creneaux: Creneau[]): { titre: string; detail: string; alerte: boolean } => {
    if (!etat.interrupteur) {
        return { titre: "Coupé : aucun trafic", detail: "Les tracés restent au tarif normal de Google.", alerte: false };
    }

    if (etat.creneaux_actifs === 0) {
        return { titre: "Allumé sans restriction", detail: "Tous les tracés paient le tarif plus élevé de Google, toute la journée.", alerte: true };
    }

    const liste = creneaux
        .filter((c) => c.actif)
        .map((c) => `${joursLisibles(c.jours)}, ${heure(c.heure_debut)} – ${heure(c.heure_fin)}`)
        .join(" ; ");

    return {
        titre: `Allumé sur ${etat.creneaux_actifs} créneau${etat.creneaux_actifs > 1 ? "x" : ""}`,
        detail: `${liste}. En ce moment (${etat.heure}, heure du Cameroun) : ${etat.dans_un_creneau ? "dans un créneau" : "hors créneau"}.`,
        alerte: false,
    };
};

export default function TraficGoogle() {
    const [etat, setEtat] = useState<Etat | null>(null);
    const [creneaux, setCreneaux] = useState<Creneau[]>([]);
    const [chargement, setChargement] = useState(true);
    const [formulaire, setFormulaire] = useState({ ...creneauVide });
    const [enEdition, setEnEdition] = useState<Creneau | null>(null);

    const api = new ApiService();

    const charger = async () => {
        try {
            const { data } = await api.getData("v3/admin/trafic");
            if (data.success) {
                setEtat(data.data.etat);
                setCreneaux(data.data.creneaux);
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Trafic illisible", text: messageDErreur(erreur) });
        }

        setChargement(false);
    };

    const reglages = useReglages("boost", charger);

    useEffect(() => {
        charger();
    }, []);

    /**
     * Le dernier créneau actif retiré, le trafic passe à toute la journée. On
     * demande confirmation : le geste a l'air de réduire la dépense.
     */
    const confirmeLaDerniere = async (ligne: Creneau) => {
        if (!etat?.interrupteur || !ligne.actif || etat.creneaux_actifs !== 1) return true;

        const choix = await Swal.fire({
            icon: "warning",
            title: "Passer le trafic à toute la journée ?",
            text: `« ${ligne.libelle} » est le dernier créneau actif. Sans lui, tous les tracés paieront le tarif plus élevé de Google, à toute heure.`,
            showCancelButton: true,
            confirmButtonText: "Continuer",
            cancelButtonText: "Annuler",
        });

        return choix.isConfirmed;
    };

    const corps = (ligne: Creneau, actif: boolean) => ({
        libelle: ligne.libelle,
        jours: ligne.jours.split(",").map(Number),
        heure_debut: heure(ligne.heure_debut),
        heure_fin: heure(ligne.heure_fin),
        actif,
    });

    const enregistrer = async () => {
        try {
            if (enEdition) {
                await api.updateData(`v3/admin/trafic/creneaux/${enEdition.id}`, { ...formulaire, actif: Boolean(enEdition.actif) });
            } else {
                await api.postData("v3/admin/trafic/creneaux", formulaire);
            }

            setEnEdition(null);
            setFormulaire({ ...creneauVide });
            charger();
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Créneau refusé", text: messageDErreur(erreur) });
        }
    };

    const modifier = (ligne: Creneau) => {
        setEnEdition(ligne);
        setFormulaire({
            libelle: ligne.libelle,
            jours: ligne.jours.split(",").map(Number),
            heure_debut: heure(ligne.heure_debut),
            heure_fin: heure(ligne.heure_fin),
        });
    };

    const annulerLaModification = () => {
        setEnEdition(null);
        setFormulaire({ ...creneauVide });
    };

    const basculer = async (ligne: Creneau) => {
        if (!(await confirmeLaDerniere(ligne))) return;

        try {
            await api.updateData(`v3/admin/trafic/creneaux/${ligne.id}`, corps(ligne, !ligne.actif));
            charger();
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Modification refusée", text: messageDErreur(erreur) });
        }
    };

    const supprimer = async (ligne: Creneau) => {
        if (!(await confirmeLaDerniere(ligne))) return;

        const choix = await Swal.fire({
            icon: "question",
            title: `Supprimer « ${ligne.libelle} » ?`,
            showCancelButton: true,
            confirmButtonText: "Supprimer",
            cancelButtonText: "Annuler",
        });

        if (!choix.isConfirmed) return;

        try {
            await api.deleteData(`v3/admin/trafic/creneaux/${ligne.id}`);
            if (enEdition?.id === ligne.id) annulerLaModification();
            charger();
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Suppression refusée", text: messageDErreur(erreur) });
        }
    };

    if (chargement) return <Loading />;

    const phrase = etat ? resume(etat, creneaux) : null;

    return (
        <div className="space-y-8 pb-10">
            {phrase && (
                <div
                    className={`rounded-xl px-5 py-4 border ${
                        phrase.alerte
                            ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40"
                            : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                    }`}
                >
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{phrase.titre}</p>
                    <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-0.5">{phrase.detail}</p>
                </div>
            )}

            <BlocReglages reglages={reglages} cles={/^trafic\./} />

            <section className="space-y-3">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Créneaux</h2>
                    <p className="text-sm text-slate-500 max-w-3xl">
                        Trafic allumé, seuls les créneaux actifs comptent. Sans créneau actif, il joue toute la journée. Le choix se fait quand le client
                        ouvre sa recherche de trajet, à l'heure du Cameroun. Un créneau peut passer minuit.
                    </p>
                </div>

                <div className={`${carte} divide-y divide-slate-100 dark:divide-slate-800`}>
                    {creneaux.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500">Aucun créneau</p>}
                    {creneaux.map((c) => (
                        <div key={c.id} className={`px-5 py-4 flex flex-wrap items-center justify-between gap-3 ${c.actif ? "" : "opacity-50"}`}>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.libelle}</p>
                                <p className="text-[13px] text-slate-500">
                                    {joursLisibles(c.jours)}, {heure(c.heure_debut)} – {heure(c.heure_fin)}
                                    {c.actif ? "" : " · désactivé"}
                                </p>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <button onClick={() => basculer(c)} className="text-primary underline">
                                    {c.actif ? "Désactiver" : "Activer"}
                                </button>
                                <button onClick={() => modifier(c)} className="text-primary underline">
                                    Modifier
                                </button>
                                <button onClick={() => supprimer(c)} className="text-red-600 underline">
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={`${carte} p-5`}>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                        {enEdition ? `Modifier « ${enEdition.libelle} »` : "Ajouter un créneau"}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <label className={etiquette}>
                            Nom
                            <input
                                value={formulaire.libelle}
                                onChange={(e) => setFormulaire({ ...formulaire, libelle: e.target.value })}
                                placeholder="Pointe du soir"
                                className={champ}
                            />
                        </label>
                        <label className={etiquette}>
                            Début
                            <input type="time" value={formulaire.heure_debut} onChange={(e) => setFormulaire({ ...formulaire, heure_debut: e.target.value })} className={champ} />
                        </label>
                        <label className={etiquette}>
                            Fin
                            <input type="time" value={formulaire.heure_fin} onChange={(e) => setFormulaire({ ...formulaire, heure_fin: e.target.value })} className={champ} />
                        </label>
                        <div className="sm:col-span-2 lg:col-span-3">
                            <span className={etiquette}>Jours</span>
                            <div className="mt-1 flex flex-wrap gap-2">
                                {JOURS.map((j) => {
                                    const choisi = formulaire.jours.includes(j.n);
                                    return (
                                        <button
                                            key={j.n}
                                            type="button"
                                            aria-pressed={choisi}
                                            onClick={() =>
                                                setFormulaire({
                                                    ...formulaire,
                                                    jours: choisi ? formulaire.jours.filter((n) => n !== j.n) : [...formulaire.jours, j.n],
                                                })
                                            }
                                            className={`px-3 py-1.5 rounded-lg text-sm border ${
                                                choisi ? "border-primary bg-primary/10 text-primary font-semibold" : "border-slate-300 dark:border-slate-700 text-slate-500"
                                            }`}
                                        >
                                            {j.court}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex gap-3 sm:col-span-2 lg:col-span-3">
                            <button onClick={enregistrer} className="px-5 py-2 bg-primary text-white font-bold rounded-lg text-sm">
                                {enEdition ? "Enregistrer" : "Ajouter"}
                            </button>
                            {enEdition && (
                                <button onClick={annulerLaModification} className="px-5 py-2 text-sm text-slate-500 underline">
                                    Annuler
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
