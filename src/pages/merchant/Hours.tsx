import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";
import Loading from "../../components/Loading";

/**
 * Les horaires de la boutique, le plus simplement possible.
 *
 * En haut, un grand bouton pour aujourd'hui : fermer maintenant, ou ouvrir
 * maintenant. Il vaut jusqu'à ce soir minuit ; demain, les horaires reprennent.
 *
 * En dessous, la semaine : chaque jour ouvert ou fermé, une heure d'ouverture,
 * une heure de fermeture. Une fermeture plus tôt que l'ouverture passe minuit.
 */

interface Jour {
    weekday: number;
    is_open: boolean;
    opens_at: string;
    closes_at: string;
}

interface Etat {
    days: { weekday: number; is_open: boolean; opens_at: string | null; closes_at: string | null }[] | null;
    is_open_now: boolean;
    manual_state: "open" | "closed" | null;
    is_paused: boolean;
    next_opening: string | null;
}

interface HoursProps {
    merchantId: string;
    storeId: number;
    storeName: string;
    /** La cuisine ouvre et ferme, mais ne change pas la semaine. */
    canEditWeek: boolean;
}

const NOMS: Record<number, string> = { 0: "Dimanche", 1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi", 5: "Vendredi", 6: "Samedi" };

/** Lundi → dimanche, 8 h – 22 h : de quoi commencer sans rien taper. */
const SEMAINE_PAR_DEFAUT: Jour[] = [1, 2, 3, 4, 5, 6, 0].map((weekday) => ({ weekday, is_open: true, opens_at: "08:00", closes_at: "22:00" }));

const quand = (valeur: string | null) => {
    if (!valeur) return null;

    const date = new Date(valeur.replace(" ", "T"));
    const demain = new Date();
    demain.setDate(demain.getDate() + 1);

    const heure = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    if (date.toDateString() === new Date().toDateString()) return `aujourd'hui à ${heure}`;
    if (date.toDateString() === demain.toDateString()) return `demain à ${heure}`;

    return `${date.toLocaleDateString("fr-FR", { weekday: "long" })} à ${heure}`;
};

export default function Hours({ merchantId, storeId, storeName, canEditWeek }: HoursProps) {
    const [etat, setEtat] = useState<Etat | null>(null);
    const [jours, setJours] = useState<Jour[]>(SEMAINE_PAR_DEFAUT);
    const [configure, setConfigure] = useState<boolean>(false);
    const [envoi, setEnvoi] = useState<boolean>(false);

    const api = new ApiService();
    const base = `v3/merchant/${merchantId}/stores/${storeId}/hours`;

    const appliquer = (donnees: Etat) => {
        setEtat(donnees);

        if (donnees.days) {
            setConfigure(true);
            setJours(
                donnees.days.map((j) => ({
                    weekday: j.weekday,
                    is_open: j.is_open,
                    opens_at: j.opens_at ?? "08:00",
                    closes_at: j.closes_at ?? "22:00",
                }))
            );
        }
    };

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.getData(base);

                if (data.success) appliquer(data.data);
                else Swal.fire({ icon: "info", title: "Non accessible", text: data.message });
            } catch (erreur) {
                Swal.fire({ icon: "warning", title: "Horaires illisibles", text: String(erreur) });
            }
        })();
    }, [merchantId, storeId]);

    const bouton = async (state: "open" | "closed" | "auto") => {
        setEnvoi(true);

        try {
            const { data } = await api.postData(`${base}/now`, { state });

            if (data.success) {
                appliquer(data.data);
                Swal.fire({ icon: "success", title: data.message, timer: 1400, showConfirmButton: false });
            } else {
                Swal.fire({ icon: "error", title: data.message });
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Action impossible", text: String(erreur) });
        }

        setEnvoi(false);
    };

    const modifier = (rang: number, changes: Partial<Jour>) => setJours((avant) => avant.map((j, i) => (i === rang ? { ...j, ...changes } : j)));

    const copierPartout = () => {
        const modele = jours[0];
        setJours((avant) => avant.map((j) => ({ ...j, is_open: modele.is_open, opens_at: modele.opens_at, closes_at: modele.closes_at })));
    };

    const enregistrer = async () => {
        setEnvoi(true);

        try {
            const { data } = await api.postData(base, {
                days: jours.map((j) => ({ weekday: j.weekday, is_open: j.is_open, opens_at: j.is_open ? j.opens_at : null, closes_at: j.is_open ? j.closes_at : null })),
            });

            if (data.success) {
                appliquer(data.data);
                Swal.fire({ icon: "success", title: data.message, timer: 1400, showConfirmButton: false });
            } else {
                const details = data.data && typeof data.data === "object" ? Object.values(data.data).flat().join("\n") : "";
                Swal.fire({ icon: "error", title: data.message, text: details });
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Enregistrement impossible", text: String(erreur) });
        }

        setEnvoi(false);
    };

    if (!etat) return <Loading />;

    const ouvert = etat.is_open_now;
    const prochaine = quand(etat.next_opening);

    return (
        <div className="max-w-3xl space-y-8">
            {/* ------------------------------------------------ aujourd'hui */}
            <section
                className={`p-6 rounded-2xl border ${
                    ouvert
                        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                        : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                }`}
            >
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className={`h-3 w-3 rounded-full ${ouvert ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                        <div>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{ouvert ? "Ouvert" : "Fermé"}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                {etat.is_paused
                                    ? "En pause depuis le poste de commande"
                                    : etat.manual_state === "closed"
                                    ? "Fermé à la main pour aujourd'hui"
                                    : etat.manual_state === "open"
                                    ? "Ouvert à la main jusqu'à ce soir"
                                    : ouvert
                                    ? "Selon vos horaires"
                                    : prochaine
                                    ? `Rouvre ${prochaine}`
                                    : "Selon vos horaires"}
                                {!ouvert && prochaine && etat.manual_state === "closed" ? ` · rouvre ${prochaine}` : ""}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {ouvert ? (
                            <button
                                onClick={() => bouton("closed")}
                                disabled={envoi}
                                className="px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-50 dark:bg-white dark:text-slate-900"
                            >
                                Fermer maintenant
                            </button>
                        ) : (
                            <button
                                onClick={() => bouton("open")}
                                disabled={envoi}
                                className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50"
                            >
                                Ouvrir maintenant
                            </button>
                        )}
                        {etat.manual_state && (
                            <button onClick={() => bouton("auto")} disabled={envoi} className="px-4 py-3 rounded-xl text-sm text-slate-600 dark:text-slate-300">
                                Revenir aux horaires
                            </button>
                        )}
                    </div>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                    Le bouton vaut pour aujourd'hui seulement. Demain, {storeName} suit de nouveau ses horaires.
                </p>
            </section>

            {/* ------------------------------------------------ la semaine */}
            <section className="p-6 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">Horaires de la semaine</h3>
                    {canEditWeek && (
                        <button onClick={copierPartout} className="text-sm text-slate-600 dark:text-slate-300 underline">
                            Copier le lundi sur tous les jours
                        </button>
                    )}
                </div>
                {!configure && (
                    <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">
                        Aucun horaire enregistré : la boutique est considérée ouverte tout le temps. Ajustez puis enregistrez.
                    </p>
                )}

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {jours.map((jour, rang) => (
                        <div key={jour.weekday} className="flex flex-wrap items-center gap-4 py-3">
                            <span className="w-24 font-medium text-slate-900 dark:text-white">{NOMS[jour.weekday]}</span>

                            {/* Ouvert / Fermé : un interrupteur, rien d'autre à comprendre. */}
                            <button
                                role="switch"
                                aria-checked={jour.is_open}
                                disabled={!canEditWeek}
                                onClick={() => modifier(rang, { is_open: !jour.is_open })}
                                className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                                    jour.is_open ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                                }`}
                            >
                                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${jour.is_open ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                            <span className={`w-16 text-sm ${jour.is_open ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500"}`}>
                                {jour.is_open ? "Ouvert" : "Fermé"}
                            </span>

                            {jour.is_open && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="time"
                                        value={jour.opens_at}
                                        disabled={!canEditWeek}
                                        onChange={(e) => modifier(rang, { opens_at: e.target.value })}
                                        className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    />
                                    <span className="text-slate-400">→</span>
                                    <input
                                        type="time"
                                        value={jour.closes_at}
                                        disabled={!canEditWeek}
                                        onChange={(e) => modifier(rang, { closes_at: e.target.value })}
                                        className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    />
                                    {jour.closes_at <= jour.opens_at && <span className="text-xs text-slate-500">jusqu'au lendemain</span>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {canEditWeek ? (
                    <div className="flex justify-end mt-6">
                        <button
                            onClick={enregistrer}
                            disabled={envoi}
                            className="px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-50 dark:bg-white dark:text-slate-900"
                        >
                            {envoi ? "Enregistrement…" : "Enregistrer les horaires"}
                        </button>
                    </div>
                ) : (
                    <p className="text-xs text-slate-500 mt-4">Seuls le propriétaire et le gérant changent les horaires.</p>
                )}
            </section>
        </div>
    );
}
