import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";

/**
 * La majoration des courses (« surge ») : les créneaux et les zones.
 *
 * L'interrupteur général, la pluie, le plafond et le plancher sont des
 * réglages (onglet « Majoration des prix ») ; cette page les relit pour dire
 * si la majoration joue, et pose ce qui ne tient pas dans un réglage.
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
    majorations: Record<string, { pct: number; base: number; raisons: Raison[] }>;
}

interface EtatDuSurge {
    etat: { actif: boolean; pluie: boolean; pluie_pct: number; plafond_pct: number; plancher_pct: number };
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
}

interface SurgeProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
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
const zoneVide = { libelle: "", lat: String(CENTRE.lat), lng: String(CENTRE.lng), rayon_m: 1000, debut: "", fin: "", coefficient_pct: 130, categorie_id: "" };

/** Le message d'une erreur Laravel : la validation, sinon le texte brut. */
const messageDErreur = (erreur: unknown) => {
    const r = (erreur as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })?.response?.data;
    if (r?.errors) return Object.values(r.errors).flat().join("\n");
    return r?.message ?? String(erreur);
};

export default function Surge({ onLogout, theme, toggleTheme }: SurgeProps) {
    const [etat, setEtat] = useState<EtatDuSurge | null>(null);
    const [chargement, setChargement] = useState(true);
    const [creneau, setCreneau] = useState({ ...creneauVide });
    const [zone, setZone] = useState({ ...zoneVide });
    const [apercu, setApercu] = useState<{ actif: boolean; a: string; categories: LigneApercu[] } | null>(null);
    const [pointApercu, setPointApercu] = useState({ lat: String(CENTRE.lat), lng: String(CENTRE.lng), a: "" });
    const navigate = useNavigate();

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
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header>
                <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Majoration des prix</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Le prix monte quand les chauffeurs manquent : aux heures de pointe, sous la pluie, autour d'un événement. Le client paie le prix
                        annoncé, figé à l'estimation.
                    </p>
                </div>
            </header>

            <div className="px-4 md:px-8 pb-10 max-w-7xl mx-auto space-y-8">
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
                                    Plafond {coefficient(etat.etat.plafond_pct)} · plancher {coefficient(etat.etat.plancher_pct)} · pluie{" "}
                                    {etat.etat.pluie ? `allumée (${coefficient(etat.etat.pluie_pct)})` : "éteinte"}
                                </p>
                            </div>
                            <button onClick={() => navigate("/settings?onglet=surge")} className="text-sm text-primary underline">
                                Allumer, éteindre, régler la pluie et le plafond
                            </button>
                        </div>

                        {/* Les créneaux. */}
                        <section className="space-y-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Créneaux horaires</h2>
                                <p className="text-sm text-slate-500">
                                    Un créneau majore toutes les catégories. Deux créneaux qui se chevauchent ne se cumulent pas : le plus fort l'emporte.
                                    Un créneau qui passe minuit (22:00 – 02:00) appartient au jour où il commence.
                                </p>
                            </div>

                            <div className={`${carte} divide-y divide-slate-100 dark:divide-slate-800`}>
                                {etat.creneaux.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500">Aucun créneau</p>}
                                {etat.creneaux.map((c) => (
                                    <div key={c.id} className={`px-5 py-4 flex flex-wrap items-center justify-between gap-3 ${c.actif ? "" : "opacity-50"}`}>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                {c.libelle} <span className="ml-1 font-bold text-amber-600 dark:text-amber-400">{coefficient(c.coefficient_pct)}</span>
                                            </p>
                                            <p className="text-[13px] text-slate-500">
                                                {joursLisibles(c.jours)} · {c.heure_debut.slice(0, 5)} – {c.heure_fin.slice(0, 5)}
                                                {!c.actif && " · désactivé"}
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
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
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
                                                .map(([id, m]) => `${nomCategorie(Number(id))} ${coefficient(m.pct)} (${m.raisons.map((r) => r.libelle).join(", ")})`)
                                                .join(" · ")}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </>
                )}
            </div>
        </MainLayout>
    );
}
