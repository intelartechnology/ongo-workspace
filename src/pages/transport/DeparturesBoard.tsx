import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Bus, LogOut, Maximize, Minimize, RefreshCw, Settings2, TrainFront, Wifi, WifiOff } from "lucide-react";
import ApiService from "../../services/ApiService";
import PassengerList from "./PassengerList";
import { heureDe, jourIso } from "./transportDonnees";
import type { Depart, EspaceTransport, Passage, TableauDesDeparts, Vente } from "./transportDonnees";

interface Props {
    operatorId: string;
    espace: EspaceTransport;
    onLogout: () => void;
    /** Un administrateur sort vers le back-office au lieu de se déconnecter. */
    onQuitter?: () => void;
    /** Ouvrir les rubriques de gestion ; absent pour un agent de gare. */
    onGerer?: () => void;
}

/** Une tuile : un départ vu depuis une gare. */
interface Tuile {
    depart: Depart;
    passage: Passage;
}

const RAFRAICHIR_MS = 30_000;

const cleGare = (operatorId: string) => `ongo.transport.gare.${operatorId}`;

function lireGare(operatorId: string): number | null {
    try {
        const brut = localStorage.getItem(cleGare(operatorId));
        return brut ? Number(brut) : null;
    } catch {
        return null;
    }
}

function retenirGare(operatorId: string, gare: number | null) {
    try {
        if (gare === null) localStorage.removeItem(cleGare(operatorId));
        else localStorage.setItem(cleGare(operatorId), String(gare));
    } catch {
        // Stockage indisponible (navigation privée) : la gare sera redemandée.
    }
}

/**
 * Les départs du jour, en plein écran : l'écran que la gare garde ouvert.
 *
 * Une grande tuile par départ, et un seul geste à faire : passer en
 * « Complet » quand le car est plein, parce que l'agence vend aussi à son
 * comptoir et qu'Ongo ne peut pas le savoir. Le geste demande une
 * confirmation — sur un écran tactile, un doigt qui glisse ne doit pas fermer
 * la vente d'un départ.
 *
 * Les états viennent du serveur : l'heure du poste peut être fausse, et c'est
 * le serveur qui refuse une vente.
 */
export default function DeparturesBoard({ operatorId, espace, onLogout, onQuitter, onGerer }: Props) {
    const agent = espace.station_id !== null;
    // Seules les gares où l'on monte ont des départs à tenir.
    const gares = espace.stations.filter((g) => g.boarding);
    const [gare, setGare] = useState<number | null>(() => {
        if (agent) return espace.station_id;
        const retenue = lireGare(operatorId);
        if (retenue === 0) return null;
        if (retenue !== null && gares.some((g) => g.id === retenue)) return retenue;
        return gares[0]?.id ?? null;
    });
    const [decalage, setDecalage] = useState(0);
    const [destination, setDestination] = useState<string | null>(null);
    /** La classe affichée : nulle pour toutes, le défaut. */
    const [classe, setClasse] = useState<string | null>(null);

    const [tableau, setTableau] = useState<TableauDesDeparts | null>(null);
    const [ventes, setVentes] = useState<Vente[]>([]);
    const [horsLigne, setHorsLigne] = useState(false);
    const [majA, setMajA] = useState<Date | null>(null);
    const [actualisation, setActualisation] = useState(false);
    const [chargement, setChargement] = useState(true);
    const [aConfirmer, setAConfirmer] = useState<string | null>(null);
    const [enCours, setEnCours] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [annulation, setAnnulation] = useState<Depart | null>(null);
    const [ouverte, setOuverte] = useState<Tuile | null>(null);
    const [raison, setRaison] = useState("");
    const [pleinEcran, setPleinEcran] = useState(false);
    const [horloge, setHorloge] = useState(() => new Date());

    const charger = useCallback(async () => {
        try {
            const { data } = await new ApiService().getData(`v3/transport/${operatorId}/departures`, {
                date: jourIso(decalage),
                ...(gare !== null ? { station_id: gare } : {}),
            });
            if (data.success) {
                setTableau(data.data);
                setHorsLigne(false);
                setMajA(new Date());
            } else {
                setMessage(data.message ?? "Lecture des départs impossible.");
            }

            // Le fil des ventes suit la même gare. Illisible, il ne bloque
            // pas l'écran : les départs comptent plus.
            const ventesLues = await new ApiService().getData(`v3/transport/${operatorId}/sales/recent`, gare !== null ? { station_id: gare } : {});
            if (ventesLues.data.success) setVentes(ventesLues.data.data);
        } catch {
            setHorsLigne(true);
        } finally {
            setChargement(false);
        }
    }, [operatorId, decalage, gare]);

    useEffect(() => {
        setChargement(true);
        charger();
        const minuterie = window.setInterval(charger, RAFRAICHIR_MS);
        return () => window.clearInterval(minuterie);
    }, [charger]);

    useEffect(() => {
        const minuterie = window.setInterval(() => setHorloge(new Date()), 15_000);
        return () => window.clearInterval(minuterie);
    }, []);

    useEffect(() => {
        const suivre = () => setPleinEcran(document.fullscreenElement !== null);
        document.addEventListener("fullscreenchange", suivre);
        return () => document.removeEventListener("fullscreenchange", suivre);
    }, []);

    useEffect(() => {
        if (!message) return;
        const minuterie = window.setTimeout(() => setMessage(null), 5000);
        return () => window.clearTimeout(minuterie);
    }, [message]);

    /**
     * Actualiser à la main.
     *
     * Le rechargement se faisait, mais sans rien montrer : si rien n'avait
     * changé, l'écran restait identique et le bouton semblait mort. L'icône
     * tourne au moins un instant, et l'heure de mise à jour change.
     */
    const actualiser = async () => {
        if (actualisation) return;
        setActualisation(true);
        await Promise.all([charger(), new Promise((r) => window.setTimeout(r, 600))]);
        setActualisation(false);
    };

    const choisirGare = (valeur: number | null) => {
        setGare(valeur);
        retenirGare(operatorId, valeur === null ? 0 : valeur);
    };

    const basculerPleinEcran = () => {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
        else document.documentElement.requestFullscreen().catch(() => undefined);
    };

    const tuiles: Tuile[] = useMemo(() => {
        if (!tableau) return [];
        return tableau.departures
            .flatMap((depart) => depart.stations.map((passage) => ({ depart, passage })))
            .sort((a, b) => a.passage.passes_at.localeCompare(b.passage.passes_at));
    }, [tableau]);

    const destinations = useMemo(() => {
        const compte = new Map<string, number>();
        tuiles.forEach((t) => compte.set(t.depart.line.destination, (compte.get(t.depart.line.destination) ?? 0) + 1));
        return [...compte.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }, [tuiles]);

    const versDestination = destination ? tuiles.filter((t) => t.depart.line.destination === destination) : tuiles;

    // Les classes de la destination choisie, avec leur nombre de départs.
    const classes = useMemo(() => {
        const compte = new Map<string, number>();
        versDestination.forEach((t) => compte.set(t.depart.class.name, (compte.get(t.depart.class.name) ?? 0) + 1));
        return [...compte.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }, [versDestination]);

    const visibles = classe ? versDestination.filter((t) => t.depart.class.name === classe) : versDestination;

    const agir = async (tuile: Tuile, action: "close" | "reopen") => {
        const cle = `${tuile.depart.id}-${tuile.passage.station_id}`;
        setEnCours(cle);
        setAConfirmer(null);
        try {
            const { data } = await new ApiService().postData(`v3/transport/${operatorId}/departures/${tuile.depart.id}/${action}`, {
                station_id: tuile.passage.station_id,
            });
            setMessage(data.success ? null : data.message);
            await charger();
        } catch {
            setMessage("Le serveur ne répond pas : rien n'a changé. Réessayez.");
        } finally {
            setEnCours(null);
        }
    };

    const annuler = async () => {
        if (!annulation || raison.trim() === "") return;
        try {
            const { data } = await new ApiService().postData(`v3/transport/${operatorId}/departures/${annulation.id}/cancel`, { reason: raison.trim() });
            setMessage(data.success ? null : data.message);
            setAnnulation(null);
            setRaison("");
            await charger();
        } catch {
            setMessage("Le serveur ne répond pas : le départ n'est pas annulé.");
        }
    };

    const nomGare = gare === null ? "Toutes les gares" : espace.stations.find((g) => g.id === gare)?.name ?? "Gare";
    const IconeMode = espace.operator.mode === "train" ? TrainFront : Bus;
    const dateLisible = new Date(`${jourIso(decalage)}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 flex flex-col">
            <header className="bg-primary text-white px-4 md:px-6 py-3 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                    <span className="size-11 rounded-xl bg-white/15 grid place-items-center"><IconeMode className="size-6" /></span>
                    <div className="min-w-0">
                        <p className="text-lg md:text-xl font-bold truncate">Départs · {nomGare}</p>
                        <p className="text-sm text-blue-100 truncate first-letter:uppercase">{dateLisible} · {espace.operator.name}</p>
                    </div>
                </div>
                <span className={`flex items-center gap-2 text-sm ${horsLigne ? "text-amber-200" : "text-blue-100"}`}>
                    {horsLigne ? <WifiOff className="size-4" /> : <Wifi className="size-4" />}
                    {horsLigne
                        ? "Hors ligne · nouvel essai dans 30 s"
                        : majA ? `En direct · à jour à ${majA.toLocaleTimeString("fr-FR")}` : "En direct"}
                </span>
                <strong className="text-3xl tabular-nums tracking-tight">{horloge.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</strong>
                <button onClick={basculerPleinEcran} title={pleinEcran ? "Quitter le plein écran" : "Plein écran"} className="size-11 grid place-items-center rounded-xl border border-white/30 hover:bg-white/10">
                    {pleinEcran ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
                </button>
                {onGerer && (
                    <button onClick={onGerer} className="h-11 px-4 flex items-center gap-2 rounded-xl bg-white text-primary hover:bg-blue-50 text-sm font-semibold">
                        <Settings2 className="size-4" /> Gérer le réseau
                    </button>
                )}
                <button onClick={onQuitter ?? onLogout} className="h-11 px-4 flex items-center gap-2 rounded-xl border border-white/30 hover:bg-white/10 text-sm font-semibold">
                    <LogOut className="size-4" /> {onQuitter ? "Back-office" : "Se déconnecter"}
                </button>
            </header>

            <div className="px-4 md:px-6 pt-4 flex items-center gap-2.5 flex-wrap">
                <div className="flex rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-base font-semibold">
                    {["Aujourd'hui", "Demain"].map((libelle, i) => (
                        <button key={libelle} onClick={() => setDecalage(i)} className={`px-5 py-3 ${decalage === i ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : ""}`}>{libelle}</button>
                    ))}
                </div>

                {!agent && gares.length > 1 && (
                    <select
                        aria-label="Gare"
                        value={gare ?? 0}
                        onChange={(e) => choisirGare(Number(e.target.value) || null)}
                        className="h-[50px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-base font-semibold"
                    >
                        {gares.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                        <option value={0}>Toutes les gares</option>
                    </select>
                )}

                {destinations.length > 1 && (
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={() => { setDestination(null); setClasse(null); }} className={`px-4 py-3 rounded-xl text-base font-semibold border ${destination === null ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900" : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"}`}>
                            Toutes · {tuiles.length}
                        </button>
                        {destinations.map(([ville, n]) => (
                            <button key={ville} onClick={() => { setDestination(ville); setClasse(null); }} className={`px-4 py-3 rounded-xl text-base font-semibold border ${destination === ville ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900" : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"}`}>
                                {ville} · {n}
                            </button>
                        ))}
                    </div>
                )}

                <span className="flex-1" />
                {tableau && (
                    <span className="flex gap-5 text-[15px] text-slate-600 dark:text-slate-300">
                        <span><strong className="text-xl text-emerald-700 dark:text-emerald-400">{tableau.summary.on_sale}</strong> en vente</span>
                        <span><strong className="text-xl text-rose-700 dark:text-rose-400">{tableau.summary.closed}</strong> complet{tableau.summary.closed > 1 ? "s" : ""}</span>
                        <span><strong className="text-xl">{tableau.summary.sold}</strong> places vendues</span>
                    </span>
                )}
                <button onClick={actualiser} disabled={actualisation} title="Actualiser" className="size-[50px] grid place-items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition">
                    <RefreshCw className={`size-5 ${chargement || actualisation ? "animate-spin" : ""}`} />
                </button>
            </div>

            {/* La classe : Classique, Confort, VIP… Toutes par défaut. */}
            {classes.length > 1 && (
                <div className="px-4 md:px-6 pt-2 flex items-center gap-1.5 overflow-x-auto">
                    <span className="text-xs font-semibold text-slate-500 shrink-0 mr-1">Classe</span>
                    <button onClick={() => setClasse(null)} className={`shrink-0 px-2.5 py-1 rounded-lg text-[13px] font-semibold border ${classe === null ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900" : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"}`}>
                        Toutes · {versDestination.length}
                    </button>
                    {classes.map(([nom, n]) => (
                        <button key={nom} onClick={() => setClasse(nom)} className={`shrink-0 px-2.5 py-1 rounded-lg text-[13px] font-semibold border ${classe === nom ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900" : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"}`}>
                            {nom} · {n}
                        </button>
                    ))}
                </div>
            )}

            {message && (
                <div role="alert" className="mx-4 md:mx-6 mt-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200 px-4 py-3 text-[15px] font-medium">
                    {message}
                </div>
            )}

            <div className="flex-1 flex gap-5 px-4 md:px-6 py-4 items-start flex-wrap">
                <section aria-label="Départs" className="flex-[999_1_720px] grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
                    {visibles.map((tuile) => {
                        const cle = `${tuile.depart.id}-${tuile.passage.station_id}`;
                        return (
                            <TuileDepart
                                key={cle}
                                tuile={tuile}
                                avecGare={gare === null}
                                confirmer={aConfirmer === cle}
                                occupe={enCours === cle}
                                peutAnnuler={espace.can_manage}
                                onFermer={() => setAConfirmer(cle)}
                                onConfirmer={() => agir(tuile, "close")}
                                onRenoncer={() => setAConfirmer(null)}
                                onRouvrir={() => agir(tuile, "reopen")}
                                onAnnuler={() => { setAnnulation(tuile.depart); setRaison(""); }}
                                onOuvrir={() => setOuverte(tuile)}
                            />
                        );
                    })}
                    {!chargement && visibles.length === 0 && (
                        <div className="col-span-full rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-slate-500">
                            <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">Aucun départ {decalage === 0 ? "aujourd'hui" : "demain"} dans cette gare.</p>
                            <p className="mt-1 text-sm">Les départs viennent des horaires de vos lignes : ils sont créés trente jours à l'avance.</p>
                        </div>
                    )}
                </section>

                <aside className="flex-[1_1_260px] max-w-[340px] flex flex-col gap-3">
                    <h2 className="text-lg font-bold">Ventes en direct</h2>
                    {ventes.length === 0 ? (
                        <p className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-[15px] text-slate-600 dark:text-slate-300">
                            Aucune vente en ligne depuis hier. Chaque billet acheté dans l'application Ongo apparaît ici, avec le nom des voyageurs.
                        </p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {ventes.slice(0, 8).map((v, i) => {
                                const recente = Date.now() - new Date(v.paid_at.replace(" ", "T")).getTime() < 10 * 60_000;
                                return (
                                    <li key={v.code} className={`rounded-xl border px-3.5 py-3 flex flex-col gap-0.5 ${i === 0 && recente ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900" : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800"}`}>
                                        <span className="flex justify-between text-[13px] text-slate-500">
                                            <span>{heureDe(v.paid_at)} · {v.code}</span>
                                            {i === 0 && recente && <strong className="text-emerald-700 dark:text-emerald-400">Nouvelle</strong>}
                                        </span>
                                        <strong className="text-base">{heureDe(v.departs_at)} {v.class} · {v.seats} place{v.seats > 1 ? "s" : ""}{v.trip_type === "round_trip" ? " · A/R" : ""}</strong>
                                        <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{v.passengers.join(", ")}</span>
                                        {gare === null && v.station && <span className="text-xs text-slate-500">{v.station}</span>}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    <p className="text-[13px] text-slate-500">
                        Chaque gare gère ses départs. Un départ passé en « Complet » n'est plus proposé dans l'application pour cette gare seulement ; les billets déjà vendus restent valables.
                    </p>
                </aside>
            </div>

            {ouverte && (
                <PassengerList
                    operatorId={operatorId}
                    operatorName={espace.operator.name}
                    depart={ouverte.depart}
                    passage={ouverte.passage}
                    onClose={() => setOuverte(null)}
                />
            )}

            {annulation && (
                <div role="dialog" aria-label="Annuler le départ" className="fixed inset-0 z-50 bg-slate-900/60 grid place-items-center p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 flex flex-col gap-4">
                        <p className="text-xl font-bold">Annuler le départ de {heureDe(annulation.departs_at)} · {annulation.class.name} ?</p>
                        <p className="text-[15px] text-slate-600 dark:text-slate-300">Le départ est annulé dans toutes ses gares, et ne se vend plus. La raison sera donnée aux voyageurs.</p>
                        <input
                            autoFocus
                            value={raison}
                            onChange={(e) => setRaison(e.target.value)}
                            placeholder="Raison de l'annulation"
                            className="h-12 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-4 text-base"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setAnnulation(null)} className="h-12 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold">Retour</button>
                            <button onClick={annuler} disabled={raison.trim() === ""} className="h-12 rounded-xl bg-rose-700 text-white font-semibold disabled:opacity-40">Annuler le départ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

interface TuileProps {
    tuile: Tuile;
    avecGare: boolean;
    confirmer: boolean;
    occupe: boolean;
    peutAnnuler: boolean;
    onFermer: () => void;
    onConfirmer: () => void;
    onRenoncer: () => void;
    onRouvrir: () => void;
    onAnnuler: () => void;
    /** Ouvrir la liste des voyageurs : toucher la tuile, hors de ses boutons. */
    onOuvrir: () => void;
}

function TuileDepart({ tuile, avecGare, confirmer, occupe, peutAnnuler, onFermer, onConfirmer, onRenoncer, onRouvrir, onAnnuler, onOuvrir }: TuileProps) {
    const { depart, passage } = tuile;
    const etat = passage.state;
    const vendus = passage.sold_online;
    const plafond = depart.online_cap;
    const part = plafond > 0 ? Math.min(100, Math.round((vendus * 100) / plafond)) : 0;

    const ferme = etat === "closed" || etat === "full";
    const inactif = etat === "departed" || etat === "cancelled" || etat === "sales_ended";

    const fond = ferme
        ? "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900"
        : inactif
            ? "bg-slate-100 border-slate-200 dark:bg-slate-900/60 dark:border-slate-800"
            : "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800";
    const barre = ferme ? "bg-rose-600" : inactif ? "bg-slate-400" : part >= 80 ? "bg-amber-500" : "bg-emerald-600";

    const info = {
        on_sale: `Vente en ligne jusqu'à ${heureDe(passage.sales_end_at)}`,
        closed: `Fermé à ${passage.closed_at ? heureDe(passage.closed_at) : "—"} · toucher pour rouvrir`,
        full: "Plafond de vente en ligne atteint",
        sales_ended: `Vente en ligne terminée à ${heureDe(passage.sales_end_at)}`,
        departed: `Parti à ${heureDe(passage.passes_at)}`,
        cancelled: depart.cancel_reason ? `Annulé : ${depart.cancel_reason}` : "Annulé",
    }[etat];

    return (
        <article
            onClick={(e) => {
                // Les boutons de la tuile gardent leur geste ; le reste ouvre la liste.
                if ((e.target as HTMLElement).closest("button") || confirmer) return;
                onOuvrir();
            }}
            className={`relative rounded-2xl border-[1.5px] p-4 flex flex-col gap-3 cursor-pointer hover:shadow-md transition-shadow ${fond}`}
        >
            <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                    <p className={`text-[40px] leading-none font-bold tracking-tight tabular-nums ${inactif ? "text-slate-400" : ""}`}>{heureDe(passage.passes_at)}</p>
                    <p className="mt-1.5 text-[15px] text-slate-600 dark:text-slate-300 truncate">→ {depart.line.destination}{avecGare ? ` · ${passage.station_name}` : ""}</p>
                </div>
                <span className="shrink-0 rounded-full bg-primary text-white text-sm font-bold px-3 py-1">{depart.class.name}</span>
            </div>

            <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Vendus en ligne</span>
                    <span><strong className="text-2xl tabular-nums">{vendus}</strong><span className="text-base text-slate-500"> / {plafond}</span></span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div className={`h-full ${barre}`} style={{ width: `${part}%` }} />
                </div>
            </div>

            {etat === "on_sale" && (
                <button onClick={onFermer} disabled={occupe} className="min-h-[52px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold flex items-center justify-center gap-2.5 disabled:opacity-60">
                    <span aria-hidden="true" className="relative w-10 h-6 rounded-full bg-white/30"><span className="absolute top-0.5 right-0.5 size-5 rounded-full bg-white" /></span>
                    En vente
                </button>
            )}
            {ferme && (
                <button onClick={onRouvrir} disabled={occupe || etat === "full"} className="min-h-[52px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-base font-bold flex items-center justify-center gap-2.5 disabled:opacity-80 disabled:cursor-not-allowed">
                    <span aria-hidden="true" className="relative w-10 h-6 rounded-full bg-white/30"><span className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white" /></span>
                    Complet
                </button>
            )}
            {inactif && (
                <div className="min-h-[52px] rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-base font-bold grid place-items-center">
                    {etat === "departed" ? "Parti" : etat === "cancelled" ? "Annulé" : "Vente en ligne close"}
                </div>
            )}

            <p className={`text-[13px] text-center ${ferme ? "text-rose-800 dark:text-rose-300" : "text-slate-500 dark:text-slate-400"}`}>{info}</p>
            {peutAnnuler && !depart.cancelled && etat !== "departed" && (
                <button onClick={onAnnuler} className="self-center flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-rose-700">
                    <Ban className="size-3.5" /> Annuler ce départ
                </button>
            )}

            {confirmer && (
                <div role="dialog" aria-label="Confirmer" className="absolute inset-0 rounded-2xl bg-slate-900 text-white p-5 flex flex-col justify-center gap-3">
                    <p className="text-xl font-bold leading-snug">Passer le {heureDe(passage.passes_at)} {depart.class.name} en « Complet » à {passage.station_name} ?</p>
                    <p className="text-sm text-slate-300">La vente en ligne s'arrête tout de suite pour cette gare. Les {vendus} billet{vendus > 1 ? "s" : ""} déjà vendu{vendus > 1 ? "s" : ""} restent valables.</p>
                    <div className="grid grid-cols-2 gap-2.5">
                        <button onClick={onRenoncer} className="min-h-[52px] rounded-xl bg-white text-slate-900 font-bold">Retour</button>
                        <button onClick={onConfirmer} className="min-h-[52px] rounded-xl bg-rose-600 font-bold">Oui, complet</button>
                    </div>
                </div>
            )}
        </article>
    );
}
