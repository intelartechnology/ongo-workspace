import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";
import Loading from "../../components/Loading";
import BlocReglages from "./BlocReglages";
import FraisApproche from "./FraisApproche";
import { useReglages } from "./useReglages";

/**
 * La majoration des courses (« surge »), en un seul endroit : le sous-onglet
 * « Majoration des prix » de Réglages › Courses.
 *
 * Les réglages du groupe `surge` — interrupteurs, limites, seuils — et les
 * listes — créneaux, zones, villes — se règlent ici, chacun à côté de ce qu'il
 * concerne. Ils étaient éclatés entre une page à part et un onglet des
 * Réglages ; tout ce qui règle une course est maintenant sous le même onglet.
 *
 * Les coefficients sont en pourcents : 120 = ×1,2.
 */

interface Creneau {
    id: number;
    libelle: string;
    jours: string;
    heure_debut: string;
    heure_fin: string;
    coefficient_pct: number;
    actif: boolean | number;
    /** `auto` : appris de l'historique, refait chaque lundi. */
    source?: "manuel" | "auto";
    commandes?: number | null;
    taux_echec_pct?: number | null;
}

/** Une ville où la pluie se mesure, avec sa dernière mesure. */
interface Ville {
    id: number;
    nom: string;
    lat: number;
    lng: number;
    rayon_km: number;
    actif: boolean | number;
    derniere: { condition: string; precipitation_mm: number; pleut: boolean; mesure_at: string; fraiche: boolean } | null;
}

interface Zone {
    id: number;
    libelle: string;
    lat: number;
    lng: number;
    rayon_m: number;
    debut: string | null;
    fin: string | null;
    coefficient_pct: number;
    categorie_id: number | null;
    actif: boolean | number;
}

interface Categorie {
    id: number;
    libelle: string;
    is_delivery: boolean | number;
}

interface Raison {
    facteur: string;
    libelle: string;
    pct: number;
}

interface Estimation {
    id: number;
    lieu_depart: string | null;
    lieu_arrive: string | null;
    created_at: string;
    majorations: Record<string, { pct: number; base: number; raisons: Raison[]; approche?: number }>;
}

interface EtatDuSurge {
    etat: {
        actif: boolean;
        pluie_pct: number;
        plafond_pct: number;
        plancher_pct: number;
        pluie_auto: boolean;
        meteo_cle: boolean;
        tension: boolean;
        echecs: boolean;
        apprentissage: boolean;
    };
    villes: Ville[];
    appels_par_ville: number;
    creneaux: Creneau[];
    zones: Zone[];
    categories: Categorie[];
    estimations: Estimation[];
}

interface LigneApercu {
    categorie_id: number;
    libelle: string;
    pct: number;
    raisons: Raison[];
    /** Ce que la demande a compté autour du point, maintenant. */
    mesure?: { clients: number; chauffeurs: number; echecs: number };
    /** Les frais d'approche du chauffeur le plus proche ; `null` sans chauffeur dans le rayon. */
    approche?: { montant: number; metres: number; minutes: number } | null;
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

/** Le centre de Yaoundé : le point de départ par défaut de l'aperçu et d'une zone. */
const CENTRE = { lat: 3.8667, lng: 11.5167 };

const coefficient = (pct: number) => `×${(pct / 100).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`;

const joursLisibles = (jours: string) => {
    const liste = jours.split(",").map(Number);
    if (liste.length === 7) return "Tous les jours";
    if (liste.join(",") === "1,2,3,4,5") return "Lun – ven";
    if (liste.join(",") === "6,7") return "Week-end";
    return liste.map((n) => JOURS.find((j) => j.n === n)?.court).join(", ");
};

const champ =
    "block w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm text-slate-900 dark:text-white";
const etiquette = "text-xs font-semibold text-slate-500";
const carte = "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900";

const creneauVide = { libelle: "", jours: [1, 2, 3, 4, 5], heure_debut: "17:00", heure_fin: "20:00", coefficient_pct: 120 };
const villeVide = { nom: "", lat: "", lng: "", rayon_km: 15 };

/** Les types de temps de Google, en français, pour l'écran. */
const TEMPS: Record<string, string> = {
    CLEAR: "Dégagé", MOSTLY_CLEAR: "Plutôt dégagé", PARTLY_CLOUDY: "Partiellement nuageux", MOSTLY_CLOUDY: "Plutôt nuageux",
    CLOUDY: "Couvert", WINDY: "Venteux", CHANCE_OF_SHOWERS: "Averses possibles", LIGHT_RAIN_SHOWERS: "Averses légères",
    SCATTERED_SHOWERS: "Averses éparses", LIGHT_RAIN: "Pluie légère", LIGHT_TO_MODERATE_RAIN: "Pluie légère à modérée",
    RAIN: "Pluie", RAIN_SHOWERS: "Averses", WIND_AND_RAIN: "Vent et pluie", MODERATE_TO_HEAVY_RAIN: "Pluie modérée à forte",
    HEAVY_RAIN: "Forte pluie", HEAVY_RAIN_SHOWERS: "Fortes averses", RAIN_PERIODICALLY_HEAVY: "Pluie parfois forte",
    THUNDERSTORM: "Orage", THUNDERSHOWER: "Averse orageuse", LIGHT_THUNDERSTORM_RAIN: "Pluie orageuse légère",
    SCATTERED_THUNDERSTORMS: "Orages épars", HEAVY_THUNDERSTORM: "Fort orage", HAIL: "Grêle", HAIL_SHOWERS: "Averses de grêle",
};

const zoneVide = { libelle: "", lat: String(CENTRE.lat), lng: String(CENTRE.lng), rayon_m: 1000, debut: "", fin: "", coefficient_pct: 130, categorie_id: "" };

/** Le message d'une erreur Laravel : la validation, sinon le texte brut. */
const messageDErreur = (erreur: unknown) => {
    const r = (erreur as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })?.response?.data;
    if (r?.errors) return Object.values(r.errors).flat().join("\n");
    return r?.message ?? String(erreur);
};

export default function MajorationPrix() {
    const [etat, setEtat] = useState<EtatDuSurge | null>(null);
    const [chargement, setChargement] = useState(true);
    const [creneau, setCreneau] = useState({ ...creneauVide });
    const [zone, setZone] = useState({ ...zoneVide });
    const [ville, setVille] = useState({ ...villeVide });
    const [apercu, setApercu] = useState<{ actif: boolean; a: string; categories: LigneApercu[] } | null>(null);
    const [pointApercu, setPointApercu] = useState({ lat: String(CENTRE.lat), lng: String(CENTRE.lng), a: "" });
    const api = new ApiService();

    const charger = async () => {
        try {
            const { data } = await api.getData("v3/admin/surge");
            if (data.success) setEtat(data.data);
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Majoration illisible", text: messageDErreur(erreur) });
        }

        setChargement(false);
    };

    // Un réglage enregistré peut changer l'état affiché en tête : on le relit.
    const reglages = useReglages("surge", charger);

    useEffect(() => {
        charger();
    }, []);

    const nomCategorie = (id: number | null) =>
        id === null ? "Toutes" : etat?.categories.find((c) => c.id === id)?.libelle ?? `#${id}`;

    const ajouterCreneau = async () => {
        try {
            await api.postData("v3/admin/surge/creneaux", creneau);
            setCreneau({ ...creneauVide });
            charger();
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Créneau refusé", text: messageDErreur(erreur) });
        }
    };

    const ajouterZone = async () => {
        try {
            await api.postData("v3/admin/surge/zones", {
                ...zone,
                lat: Number(zone.lat),
                lng: Number(zone.lng),
                debut: zone.debut || null,
                fin: zone.fin || null,
                categorie_id: zone.categorie_id === "" ? null : Number(zone.categorie_id),
            });
            setZone({ ...zoneVide });
            charger();
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Zone refusée", text: messageDErreur(erreur) });
        }
    };

    /** Allumer ou éteindre une ligne sans la retaper. */
    const basculer = async (type: "creneaux" | "zones", ligne: Creneau | Zone) => {
        const corps =
            type === "creneaux"
                ? { ...(ligne as Creneau), jours: (ligne as Creneau).jours.split(",").map(Number), heure_debut: (ligne as Creneau).heure_debut.slice(0, 5), heure_fin: (ligne as Creneau).heure_fin.slice(0, 5) }
                : { ...(ligne as Zone) };

        try {
            await api.updateData(`v3/admin/surge/${type}/${ligne.id}`, { ...corps, actif: !ligne.actif });
            charger();
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Modification refusée", text: messageDErreur(erreur) });
        }
    };

    const supprimer = async (type: "creneaux" | "zones", ligne: Creneau | Zone) => {
        const choix = await Swal.fire({
            icon: "question",
            title: `Supprimer « ${ligne.libelle} » ?`,
            showCancelButton: true,
            confirmButtonText: "Supprimer",
            cancelButtonText: "Annuler",
        });
        if (!choix.isConfirmed) return;

        await api.deleteData(`v3/admin/surge/${type}/${ligne.id}`);
        charger();
    };

    const apprendre = async () => {
        try {
            const { data } = await api.postData("v3/admin/surge/apprendre", {});
            const b = data.data;
            Swal.fire({
                icon: "success",
                title: "Historique analysé",
                text: `${b.creneaux} créneau(x) appris : ${b.crees} nouveau(x), ${b.gardes} gardé(s), ${b.supprimes} retiré(s).`,
            });
            charger();
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Analyse impossible", text: messageDErreur(erreur) });
        }
    };

    const mesurerMeteo = async () => {
        try {
            const { data } = await api.postData("v3/admin/surge/meteo", {});
            if (!data.success) Swal.fire({ icon: "warning", title: "Météo indisponible", text: data.message });
            charger();
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Météo indisponible", text: messageDErreur(erreur) });
        }
    };

    const ajouterVille = async () => {
        try {
            await api.postData("v3/admin/surge/villes", { ...ville, lat: Number(ville.lat), lng: Number(ville.lng) });
            setVille({ ...villeVide });
            charger();
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Ville refusée", text: messageDErreur(erreur) });
        }
    };

    const basculerVille = async (v: Ville) => {
        try {
            await api.updateData(`v3/admin/surge/villes/${v.id}`, { nom: v.nom, lat: v.lat, lng: v.lng, rayon_km: v.rayon_km, actif: !v.actif });
            charger();
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Modification refusée", text: messageDErreur(erreur) });
        }
    };

    const supprimerVille = async (v: Ville) => {
        const choix = await Swal.fire({
            icon: "question",
            title: `Ne plus mesurer la pluie à ${v.nom} ?`,
            showCancelButton: true,
            confirmButtonText: "Supprimer",
            cancelButtonText: "Annuler",
        });
        if (!choix.isConfirmed) return;

        await api.deleteData(`v3/admin/surge/villes/${v.id}`);
        charger();
    };

    /** Un facteur automatique : allumé ou non, en une pastille. */
    const facteur = (nom: string, allume: boolean) => (
        <span
            key={nom}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                allume ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
            }`}
        >
            <span className={`size-1.5 rounded-full ${allume ? "bg-emerald-500" : "bg-slate-400"}`} />
            {nom}
        </span>
    );

    const calculerApercu = async () => {
        try {
            const { data } = await api.getData("v3/admin/surge/apercu", {
                lat: pointApercu.lat,
                lng: pointApercu.lng,
                ...(pointApercu.a ? { a: pointApercu.a.replace("T", " ") } : {}),
            });
            if (data.success) setApercu(data.data);
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Aperçu impossible", text: messageDErreur(erreur) });
        }
    };

    const choixCategorie = (valeur: string, changer: (v: string) => void) => (
        <select value={valeur} onChange={(e) => changer(e.target.value)} className={champ}>
            <option value="">Toutes les catégories</option>
            {etat?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                    {c.libelle}
                </option>
            ))}
        </select>
    );

    const actionsDeLigne = (type: "creneaux" | "zones", ligne: Creneau | Zone) => (
        <div className="flex items-center gap-3 text-sm">
            <button onClick={() => basculer(type, ligne)} className="text-primary underline">
                {ligne.actif ? "Désactiver" : "Activer"}
            </button>
            <button onClick={() => supprimer(type, ligne)} className="text-red-600 underline">
                Supprimer
            </button>
        </div>
    );

    return (
        <div className="space-y-8 pb-10">
            <p className="text-sm text-slate-500 max-w-3xl">
                Le prix monte quand les chauffeurs manquent : aux heures de pointe, sous la pluie, autour d'un événement. Le client paie le prix annoncé,
                figé à l'estimation.
            </p>

            {chargement || !etat ? (
                <Loading />
            ) : (
                <>
                    {/* L'état : ce qui joue en ce moment, et où le changer. */}
                    <div
                        className={`rounded-xl border p-4 flex flex-wrap items-center justify-between gap-4 ${
                            etat.etat.actif
                                ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                                : "border-slate-200 dark:border-slate-800"
                        }`}
                    >
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Majoration</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                                {etat.etat.actif ? "Active" : "Coupée — aucun prix n'est majoré"}
                            </p>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Plafond {coefficient(etat.etat.plafond_pct)} · plancher {coefficient(etat.etat.plancher_pct)} · pluie par la météo{" "}
                                {etat.etat.pluie_auto ? `activée (${coefficient(etat.etat.pluie_pct)})` : "coupée"}
                            </p>
                        </div>
                    </div>

                    {/* L'interrupteur général et les limites, juste sous l'état qu'ils commandent. */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Réglages généraux</h2>
                        <BlocReglages reglages={reglages} cles={/^surge\.(actif|plafond_pct|plancher_pct)$/} />
                    </section>

                    {/* Les facteurs automatiques. */}
                    <div className={`${carte} p-4 space-y-3`}>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Facteurs automatiques</p>
                        <div className="flex flex-wrap gap-2">
                            {facteur("Pluie par la météo", etat.etat.pluie_auto && etat.etat.meteo_cle)}
                            {facteur("Manque de chauffeurs", etat.etat.tension)}
                            {facteur("Commandes sans chauffeur", etat.etat.echecs)}
                            {facteur("Créneaux appris (lundi 3 h 30)", etat.etat.apprentissage)}
                        </div>

                        {/* Repliés : on les ouvre pour régler un seuil, pas pour lire la page. */}
                        <details className="border-t border-slate-100 dark:border-slate-800 pt-3">
                            <summary className="cursor-pointer text-sm font-semibold text-primary">Manque de chauffeurs : réglages</summary>
                            <div className="mt-3">
                                <BlocReglages reglages={reglages} cles={/^surge\.tension_/} />
                            </div>
                        </details>
                        <details className="border-t border-slate-100 dark:border-slate-800 pt-3">
                            <summary className="cursor-pointer text-sm font-semibold text-primary">Commandes sans chauffeur : réglages</summary>
                            <div className="mt-3">
                                <BlocReglages reglages={reglages} cles={/^surge\.echecs_/} />
                            </div>
                        </details>
                    </div>

                    {/* La pluie, ville par ville : Google Weather, une mesure toutes les dix minutes. */}
                    <section className="space-y-3">
                        <div>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Pluie par ville</h2>
                                <button onClick={mesurerMeteo} className="px-3 py-1.5 bg-primary/10 text-primary font-bold rounded-lg text-sm">
                                    Mesurer maintenant
                                </button>
                            </div>
                            <p className="text-sm text-slate-500">
                                Google Weather, toutes les 10 minutes, dans chaque ville active. Un départ appartient à la ville la plus proche dont le
                                rayon le contient ; hors de toute ville, la pluie ne joue pas. Pour ouvrir une ville, ajoutez-la ici.
                            </p>
                            {(() => {
                                const appels = etat.villes.filter((v) => v.actif).length * etat.appels_par_ville;
                                const payants = Math.max(0, appels - 10000);
                                return (
                                    <p className="text-[13px] text-slate-500 mt-1">
                                        Environ {appels.toLocaleString("fr-FR")} appels par mois
                                        {payants === 0
                                            ? " : dans les 10 000 gratuits."
                                            : ` : ${payants.toLocaleString("fr-FR")} au-delà des 10 000 gratuits, soit environ ${((payants / 1000) * 0.15).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} $.`}
                                    </p>
                                );
                            })()}
                            {!etat.etat.meteo_cle && (
                                <p className="text-[13px] text-amber-600 mt-1">La clé GOOGLE_WEATHER_KEY n'est pas posée sur le serveur : aucune mesure.</p>
                            )}
                            {etat.etat.meteo_cle && !etat.etat.pluie_auto && (
                                <p className="text-[13px] text-amber-600 mt-1">« Pluie par la météo » est coupée ci-dessous : la pluie ne majore pas.</p>
                            )}
                        </div>

                        <BlocReglages reglages={reglages} cles={/^surge\.pluie_/} />

                        <div className={`${carte} divide-y divide-slate-100 dark:divide-slate-800`}>
                            {etat.villes.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500">Aucune ville</p>}
                            {etat.villes.map((v) => (
                                <div key={v.id} className={`px-5 py-4 flex flex-wrap items-center justify-between gap-3 ${v.actif ? "" : "opacity-50"}`}>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                            {v.nom}
                                            {v.derniere && v.derniere.fraiche && (
                                                <span
                                                    className={`ml-2 align-middle px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                                        v.derniere.pleut
                                                            ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                                                            : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                                                    }`}
                                                >
                                                    {v.derniere.pleut ? "Il pleut" : "Sec"}
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-[13px] text-slate-500">
                                            {v.rayon_km} km autour de {Number(v.lat).toFixed(4)}, {Number(v.lng).toFixed(4)} ·{" "}
                                            {v.derniere
                                                ? `${TEMPS[v.derniere.condition] ?? v.derniere.condition}, ${Number(v.derniere.precipitation_mm).toLocaleString("fr-FR")} mm à ${new Date(
                                                      v.derniere.mesure_at,
                                                  ).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}${v.derniere.fraiche ? "" : " (trop ancienne)"}`
                                                : "aucune mesure"}
                                            {!v.actif && " · non mesurée"}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <button onClick={() => basculerVille(v)} className="text-primary underline">
                                            {v.actif ? "Ne plus mesurer" : "Mesurer"}
                                        </button>
                                        <button onClick={() => supprimerVille(v)} className="text-red-600 underline">
                                            Supprimer
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={`${carte} p-5 space-y-4`}>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">Ajouter une ville</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                <label className={etiquette}>
                                    Nom
                                    <input value={ville.nom} onChange={(e) => setVille({ ...ville, nom: e.target.value })} placeholder="Bafoussam" className={champ} />
                                </label>
                                <label className={etiquette}>
                                    Latitude du centre
                                    <input value={ville.lat} onChange={(e) => setVille({ ...ville, lat: e.target.value })} placeholder="5.4781" className={champ} />
                                </label>
                                <label className={etiquette}>
                                    Longitude du centre
                                    <input value={ville.lng} onChange={(e) => setVille({ ...ville, lng: e.target.value })} placeholder="10.4176" className={champ} />
                                </label>
                                <label className={etiquette}>
                                    Rayon (km)
                                    <input type="number" min={1} max={200} value={ville.rayon_km} onChange={(e) => setVille({ ...ville, rayon_km: Number(e.target.value) })} className={champ} />
                                </label>
                                <div className="flex items-end">
                                    <button onClick={ajouterVille} className="w-full py-2 bg-primary text-white font-bold rounded-lg text-sm">
                                        Ajouter
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <div>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Créneaux horaires</h2>
                                <button onClick={apprendre} className="px-3 py-1.5 bg-primary/10 text-primary font-bold rounded-lg text-sm">
                                    Analyser l'historique maintenant
                                </button>
                            </div>
                            <p className="text-sm text-slate-500">
                                Un créneau majore toutes les catégories. Deux créneaux qui se chevauchent ne se cumulent pas : le plus fort l'emporte.
                                Un créneau qui passe minuit (22:00 – 02:00) appartient au jour où il commence. Les créneaux « Appris » viennent des
                                heures où les commandes restent sans chauffeur ; chaque analyse les refait.
                            </p>
                        </div>

                        <details className={`${carte} px-5 py-3`}>
                            <summary className="cursor-pointer text-sm font-semibold text-primary">Créneaux appris : réglages de l'analyse</summary>
                            <div className="mt-3">
                                <BlocReglages reglages={reglages} cles={/^surge\.apprentissage/} />
                            </div>
                        </details>

                        <div className={`${carte} divide-y divide-slate-100 dark:divide-slate-800`}>
                            {etat.creneaux.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500">Aucun créneau</p>}
                            {etat.creneaux.map((c) => (
                                <div key={c.id} className={`px-5 py-4 flex flex-wrap items-center justify-between gap-3 ${c.actif ? "" : "opacity-50"}`}>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                            {c.libelle} <span className="ml-1 font-bold text-amber-600 dark:text-amber-400">{coefficient(c.coefficient_pct)}</span>
                                            {c.source === "auto" && (
                                                <span className="ml-2 align-middle px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                                                    Appris
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-[13px] text-slate-500">
                                            {joursLisibles(c.jours)} · {c.heure_debut.slice(0, 5)} – {c.heure_fin.slice(0, 5)}
                                            {c.source === "auto" && c.commandes != null && ` · ${c.commandes} commandes, ${c.taux_echec_pct} % sans chauffeur`}
                                            {!c.actif && (c.source === "auto" ? " · proposé, à activer" : " · désactivé")}
                                        </p>
                                    </div>
                                    {actionsDeLigne("creneaux", c)}
                                </div>
                            ))}
                        </div>

                        <div className={`${carte} p-5 space-y-4`}>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">Ajouter un créneau</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <label className={etiquette}>
                                    Nom
                                    <input value={creneau.libelle} onChange={(e) => setCreneau({ ...creneau, libelle: e.target.value })} placeholder="Sortie des bureaux" className={champ} />
                                </label>
                                <label className={etiquette}>
                                    De
                                    <input type="time" value={creneau.heure_debut} onChange={(e) => setCreneau({ ...creneau, heure_debut: e.target.value })} className={champ} />
                                </label>
                                <label className={etiquette}>
                                    À
                                    <input type="time" value={creneau.heure_fin} onChange={(e) => setCreneau({ ...creneau, heure_fin: e.target.value })} className={champ} />
                                </label>
                                <label className={etiquette}>
                                    Coefficient (%) — {coefficient(creneau.coefficient_pct || 100)}
                                    <input
                                        type="number"
                                        min={50}
                                        max={300}
                                        step={5}
                                        value={creneau.coefficient_pct}
                                        onChange={(e) => setCreneau({ ...creneau, coefficient_pct: Number(e.target.value) })}
                                        className={champ}
                                    />
                                </label>
                                <div className="sm:col-span-2">
                                    <p className={etiquette}>Jours</p>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                        {JOURS.map((j) => {
                                            const choisi = creneau.jours.includes(j.n);
                                            return (
                                                <button
                                                    key={j.n}
                                                    type="button"
                                                    onClick={() =>
                                                        setCreneau({
                                                            ...creneau,
                                                            jours: choisi ? creneau.jours.filter((n) => n !== j.n) : [...creneau.jours, j.n].sort(),
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
                                <div className="flex items-end lg:col-span-2">
                                    <button onClick={ajouterCreneau} className="w-full py-2 bg-primary text-white font-bold rounded-lg text-sm">
                                        Ajouter
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Les zones. */}
                    <section className="space-y-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Zones</h2>
                            <p className="text-sm text-slate-500">
                                Un cercle autour d'un lieu — stade, salle, aéroport — pendant une période. C'est le point de départ de la course qui compte.
                                Sans dates, la zone joue en permanence.
                            </p>
                        </div>

                        <div className={`${carte} divide-y divide-slate-100 dark:divide-slate-800`}>
                            {etat.zones.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500">Aucune zone</p>}
                            {etat.zones.map((z) => (
                                <div key={z.id} className={`px-5 py-4 flex flex-wrap items-center justify-between gap-3 ${z.actif ? "" : "opacity-50"}`}>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                            {z.libelle} <span className="ml-1 font-bold text-amber-600 dark:text-amber-400">{coefficient(z.coefficient_pct)}</span>
                                        </p>
                                        <p className="text-[13px] text-slate-500">
                                            {(z.rayon_m / 1000).toLocaleString("fr-FR")} km autour de {Number(z.lat).toFixed(4)}, {Number(z.lng).toFixed(4)} ·{" "}
                                            {z.debut || z.fin
                                                ? `${z.debut ? new Date(z.debut).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "…"} → ${
                                                      z.fin ? new Date(z.fin).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "…"
                                                  }`
                                                : "en permanence"}{" "}
                                            · {nomCategorie(z.categorie_id)}
                                            {!z.actif && " · désactivée"}
                                        </p>
                                    </div>
                                    {actionsDeLigne("zones", z)}
                                </div>
                            ))}
                        </div>

                        <div className={`${carte} p-5 space-y-4`}>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">Ajouter une zone</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <label className={etiquette}>
                                    Nom
                                    <input value={zone.libelle} onChange={(e) => setZone({ ...zone, libelle: e.target.value })} placeholder="Stade Omnisports" className={champ} />
                                </label>
                                <label className={etiquette}>
                                    Latitude
                                    <input value={zone.lat} onChange={(e) => setZone({ ...zone, lat: e.target.value })} className={champ} />
                                </label>
                                <label className={etiquette}>
                                    Longitude
                                    <input value={zone.lng} onChange={(e) => setZone({ ...zone, lng: e.target.value })} className={champ} />
                                </label>
                                <label className={etiquette}>
                                    Rayon (m)
                                    <input type="number" min={100} max={20000} step={100} value={zone.rayon_m} onChange={(e) => setZone({ ...zone, rayon_m: Number(e.target.value) })} className={champ} />
                                </label>
                                <label className={etiquette}>
                                    Début (facultatif)
                                    <input type="datetime-local" value={zone.debut} onChange={(e) => setZone({ ...zone, debut: e.target.value })} className={champ} />
                                </label>
                                <label className={etiquette}>
                                    Fin (facultatif)
                                    <input type="datetime-local" value={zone.fin} onChange={(e) => setZone({ ...zone, fin: e.target.value })} className={champ} />
                                </label>
                                <label className={etiquette}>
                                    Coefficient (%) — {coefficient(zone.coefficient_pct || 100)}
                                    <input
                                        type="number"
                                        min={50}
                                        max={300}
                                        step={5}
                                        value={zone.coefficient_pct}
                                        onChange={(e) => setZone({ ...zone, coefficient_pct: Number(e.target.value) })}
                                        className={champ}
                                    />
                                </label>
                                <label className={etiquette}>
                                    Catégorie
                                    {choixCategorie(zone.categorie_id, (v) => setZone({ ...zone, categorie_id: v }))}
                                </label>
                                <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                                    <button onClick={ajouterZone} className="w-full sm:w-auto px-6 py-2 bg-primary text-white font-bold rounded-lg text-sm">
                                        Ajouter
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* L'aperçu : vérifier un réglage avant de l'allumer. */}
                    <section className="space-y-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Aperçu</h2>
                            <p className="text-sm text-slate-500">
                                Le coefficient qu'aurait chaque catégorie à un point et à un instant, même majoration coupée : pour vérifier avant d'allumer.
                                L'instant ne vaut que pour les créneaux et les zones : la pluie et la demande se mesurent maintenant.
                            </p>
                        </div>
                        <div className={`${carte} p-5 space-y-4`}>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <label className={etiquette}>
                                    Latitude du départ
                                    <input value={pointApercu.lat} onChange={(e) => setPointApercu({ ...pointApercu, lat: e.target.value })} className={champ} />
                                </label>
                                <label className={etiquette}>
                                    Longitude du départ
                                    <input value={pointApercu.lng} onChange={(e) => setPointApercu({ ...pointApercu, lng: e.target.value })} className={champ} />
                                </label>
                                <label className={etiquette}>
                                    Instant (vide = maintenant)
                                    <input type="datetime-local" value={pointApercu.a} onChange={(e) => setPointApercu({ ...pointApercu, a: e.target.value })} className={champ} />
                                </label>
                                <div className="flex items-end">
                                    <button onClick={calculerApercu} className="w-full py-2 bg-primary/10 text-primary font-bold rounded-lg text-sm">
                                        Calculer
                                    </button>
                                </div>
                            </div>

                            {apercu && (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
                                    {!apercu.actif && (
                                        <p className="py-3 text-[13px] text-amber-600">Majoration coupée : ces coefficients ne s'appliquent pas aujourd'hui.</p>
                                    )}
                                    {apercu.categories.map((l) => (
                                        <div key={l.categorie_id} className="py-3 flex items-center justify-between gap-3">
                                            <span className="text-sm text-slate-900 dark:text-white">{l.libelle}</span>
                                            <span className="text-sm text-right">
                                                <span className={`font-bold ${l.pct === 100 ? "text-slate-500" : "text-amber-600 dark:text-amber-400"}`}>{coefficient(l.pct)}</span>
                                                {l.raisons.length > 0 && (
                                                    <span className="block text-[12px] text-slate-500">
                                                        {l.raisons.map((r) => `${r.libelle} ${coefficient(r.pct)}`).join(" · ")}
                                                    </span>
                                                )}
                                                {l.mesure && (
                                                    <span className="block text-[12px] text-slate-400">
                                                        Maintenant : {l.mesure.clients} client(s), {l.mesure.chauffeurs} chauffeur(s) libre(s), {l.mesure.echecs} échec(s)
                                                    </span>
                                                )}
                                                {l.approche !== undefined && (
                                                    <span className="block text-[12px] text-slate-400">
                                                        {l.approche === null
                                                            ? "Approche : aucun chauffeur dans le rayon de recherche"
                                                            : `Approche : ${(l.approche.metres / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km, ${l.approche.minutes} min → ${
                                                                  l.approche.montant > 0 ? `+${l.approche.montant.toLocaleString("fr-FR")} F` : "offerte"
                                                              }`}
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Les frais d'approche : le client paie le trajet du chauffeur jusqu'à lui. */}
                    <section className="space-y-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Frais d'approche</h2>
                            <p className="text-sm text-slate-500">
                                Le trajet du chauffeur le plus proche jusqu'au client, au-delà de la part offerte, au prix du km et de la minute de la
                                catégorie. La part offerte (km et minutes) et le plafond se règlent par catégorie, ci-dessous. Ajoutés au prix après la
                                majoration, sans être majorés. Figés à l'estimation : si ce chauffeur refuse, le client garde son prix.
                            </p>
                        </div>
                        <BlocReglages reglages={reglages} cles={/^surge\.approche_/} />
                        <FraisApproche />
                    </section>

                    {/* Ce qui touche aux livraisons et au boost : rarement changé, en bas. */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Livraisons et boost</h2>
                        <BlocReglages reglages={reglages} cles={/^surge\.(livraisons|deduire_du_boost)$/} />
                    </section>

                    {/* Le journal : les dernières estimations majorées. */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Dernières estimations majorées</h2>
                        <div className={`${carte} divide-y divide-slate-100 dark:divide-slate-800`}>
                            {etat.estimations.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500">Aucune estimation majorée</p>}
                            {etat.estimations.map((e) => (
                                <div key={e.id} className="px-5 py-4 space-y-1">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                            {e.lieu_depart ?? "?"} → {e.lieu_arrive ?? "?"}
                                        </p>
                                        <p className="text-[12px] text-slate-500">
                                            {new Date(e.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                                        </p>
                                    </div>
                                    <p className="text-[13px] text-slate-500">
                                        {Object.entries(e.majorations)
                                            .map(
                                                ([id, m]) =>
                                                    `${nomCategorie(Number(id))} ${coefficient(m.pct)}` +
                                                    (m.raisons.length > 0 ? ` (${m.raisons.map((r) => r.libelle).join(", ")})` : "") +
                                                    (m.approche ? ` + ${m.approche.toLocaleString("fr-FR")} F d'approche` : ""),
                                            )
                                            .join(" · ")}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
