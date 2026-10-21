import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { ArrowDown, ArrowUp, Moon, Plus, Trash2, X } from "lucide-react";
import ApiService from "../../services/ApiService";
import Loading from "../../components/Loading";
import { Button, Input, Select } from "../../components/ui";

interface GareCourte { id: number; name: string; city: string }

interface Arret {
    station_id: number;
    offset_minutes: number;
    boarding: boolean;
    alighting: boolean;
    station?: GareCourte;
}

interface Classe {
    id?: number;
    name: string;
    price_one_way: number;
    price_round_trip: number;
    online_cap: number;
    is_active?: boolean;
}

interface Horaire {
    id: number;
    class_id: number;
    departure_time: string;
    days: string;
    price_one_way: number | null;
    price_round_trip: number | null;
    is_active: boolean;
}

interface Ligne {
    id: number;
    origin_city: string;
    destination_city: string;
    duration_minutes: number;
    is_active: boolean;
    stops: Arret[];
    classes: Classe[];
    schedules: Horaire[];
}

interface Brouillon {
    id?: number;
    origin_city: string;
    destination_city: string;
    heures: number;
    minutes: number;
    stops: Arret[];
    classes: Classe[];
}

const JOURS = ["L", "M", "M", "J", "V", "S", "D"];
const NOMS_JOURS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

const etiquette = "text-[11px] font-bold uppercase tracking-wider text-slate-400";
const carte = "bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800";

const fcfa = (n: number) => `${n.toLocaleString("fr-FR").replace(/\s/g, " ")} F`;

const duree = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
};

/** « 1111110 » → « lun – sam » ; « 1111111 » → « tous les jours ». */
function joursLisibles(jours: string): string {
    if (jours === "1111111") return "tous les jours";
    const actifs = jours.split("").map((c, i) => (c === "1" ? i : -1)).filter((i) => i >= 0);
    const suite = actifs.every((j, k) => k === 0 || j === actifs[k - 1] + 1);
    if (suite && actifs.length > 2) return `${NOMS_JOURS[actifs[0]]} – ${NOMS_JOURS[actifs[actifs.length - 1]]}`;
    return actifs.map((i) => NOMS_JOURS[i]).join(", ");
}

/** Le premier message d'erreur lisible d'une réponse de validation. */
function messageDe(data: { message?: string; data?: unknown }): string {
    if (data.data && typeof data.data === "object" && !Array.isArray(data.data)) {
        const premier = Object.values(data.data as Record<string, string[]>).flat()[0];
        if (premier) return premier;
    }
    return data.message || "Enregistrement refusé";
}

/**
 * Les lignes : leurs gares dans l'ordre, leurs classes, leurs tarifs et leurs
 * horaires.
 *
 * Les horaires se règlent classe par classe — Classique et Confort ne partent
 * pas aux mêmes heures — et un horaire peut avoir son propre tarif, pour les
 * départs de nuit. Chaque ajout crée aussitôt les départs des trente
 * prochains jours.
 */
export default function TransportLines({ operatorId, peutGerer }: { operatorId: string; peutGerer: boolean }) {
    const [lignes, setLignes] = useState<Ligne[]>([]);
    const [gares, setGares] = useState<GareCourte[]>([]);
    const [chargement, setChargement] = useState(true);
    const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
    const [envoi, setEnvoi] = useState(false);

    const charger = async () => {
        setChargement(true);
        try {
            const api = new ApiService();
            const [l, g] = await Promise.all([
                api.getData(`v3/transport/${operatorId}/lines`),
                api.getData(`v3/transport/${operatorId}/stations`),
            ]);
            if (l.data.success) setLignes(l.data.data);
            if (g.data.success) setGares((g.data.data as (GareCourte & { is_active: boolean })[]).filter((s) => s.is_active));
        } catch {
            toast.error("Connexion au serveur impossible");
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => { charger(); }, [operatorId]); // eslint-disable-line react-hooks/exhaustive-deps

    const nouvelle = () => setBrouillon({
        origin_city: "", destination_city: "", heures: 4, minutes: 0,
        stops: [
            { station_id: gares[0]?.id ?? 0, offset_minutes: 0, boarding: true, alighting: false },
            { station_id: gares[1]?.id ?? gares[0]?.id ?? 0, offset_minutes: 240, boarding: false, alighting: true },
        ],
        classes: [{ name: "Classique", price_one_way: 0, price_round_trip: 0, online_cap: 10 }],
    });

    const modifier = (l: Ligne) => setBrouillon({
        id: l.id,
        origin_city: l.origin_city,
        destination_city: l.destination_city,
        heures: Math.floor(l.duration_minutes / 60),
        minutes: l.duration_minutes % 60,
        stops: l.stops.map((s) => ({ station_id: s.station_id, offset_minutes: s.offset_minutes, boarding: s.boarding, alighting: s.alighting })),
        classes: l.classes.filter((c) => c.is_active !== false).map((c) => ({ ...c })),
    });

    const enregistrer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!brouillon) return;
        setEnvoi(true);
        try {
            const corps = {
                origin_city: brouillon.origin_city,
                destination_city: brouillon.destination_city,
                duration_minutes: brouillon.heures * 60 + brouillon.minutes,
                stops: brouillon.stops,
                classes: brouillon.classes,
            };
            const url = brouillon.id ? `v3/transport/${operatorId}/lines/${brouillon.id}` : `v3/transport/${operatorId}/lines`;
            const { data } = await new ApiService().postData(url, corps);
            if (data.success) {
                toast.success(brouillon.id ? "Ligne modifiée" : "Ligne créée");
                setBrouillon(null);
                charger();
            } else {
                toast.error(messageDe(data));
            }
        } catch {
            toast.error("Connexion au serveur impossible");
        } finally {
            setEnvoi(false);
        }
    };

    const retirerHoraire = async (h: Horaire, classe: string) => {
        const choix = await Swal.fire({
            title: `Retirer ${classe} à ${h.departure_time} ?`,
            text: "Les départs à venir encore vides disparaissent. Ceux qui ont déjà des billets restent : annulez-les depuis l'écran des départs si le car ne roule plus.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Retirer",
            cancelButtonText: "Garder",
            confirmButtonColor: "#be123c",
        });
        if (!choix.isConfirmed) return;
        try {
            const { data } = await new ApiService().postData(`v3/transport/${operatorId}/schedules/${h.id}/remove`, {});
            if (data.success) { toast.success("Horaire retiré"); charger(); }
            else toast.error(data.message || "Action refusée");
        } catch {
            toast.error("Connexion au serveur impossible");
        }
    };

    if (chargement) return <Loading />;

    if (brouillon) {
        return <EditeurDeLigne brouillon={brouillon} setBrouillon={setBrouillon} gares={gares} envoi={envoi} onEnregistrer={enregistrer} />;
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
                <p className="mr-auto text-sm text-slate-500 max-w-2xl">
                    Chaque classe a ses horaires et son plafond de vente en ligne. Ajouter un horaire crée ses départs des trente prochains jours.
                </p>
                {peutGerer && (
                    <Button variant="primary" onClick={nouvelle} disabled={gares.length < 2} title={gares.length < 2 ? "Ajoutez d'abord au moins deux gares" : undefined}>
                        <Plus className="size-4" /> Nouvelle ligne
                    </Button>
                )}
            </div>

            {lignes.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-sm text-slate-500">
                    {gares.length < 2 ? "Ajoutez d'abord vos gares (au moins deux), puis créez une ligne." : "Aucune ligne. Créez la première : ses gares, ses classes et leurs tarifs."}
                </div>
            )}

            {lignes.map((l) => {
                const classes = l.classes.filter((c) => c.is_active !== false);
                return (
                    <section key={l.id} className={`${carte} p-5 flex flex-col gap-4 ${l.is_active ? "" : "opacity-60"}`}>
                        <div className="flex flex-wrap items-center gap-3">
                            <h3 className="mr-auto text-lg font-bold">{l.origin_city} → {l.destination_city} <span className="text-sm font-medium text-slate-500">· {duree(l.duration_minutes)}</span></h3>
                            {!l.is_active && <span className="text-[10px] font-black uppercase text-slate-400">suspendue</span>}
                            {peutGerer && <Button size="sm" onClick={() => modifier(l)}>Modifier la ligne</Button>}
                        </div>

                        <ol className="flex flex-wrap items-center gap-2 text-sm">
                            {l.stops.map((s, i) => (
                                <li key={s.station_id} className="flex items-center gap-2">
                                    {i > 0 && <span className="text-slate-300">→</span>}
                                    <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1">
                                        <strong>{s.station?.name ?? "Gare"}</strong>
                                        <span className="text-slate-500"> {i === 0 ? "· départ" : `· +${duree(s.offset_minutes)}`}{s.boarding && i > 0 ? " · montée" : ""}{s.alighting ? " · descente" : ""}</span>
                                    </span>
                                </li>
                            ))}
                        </ol>

                        <div className="grid gap-3 lg:grid-cols-2">
                            {classes.map((c) => (
                                <BlocClasse
                                    key={c.id}
                                    operatorId={operatorId}
                                    ligne={l}
                                    classe={c}
                                    horaires={l.schedules.filter((h) => h.class_id === c.id && h.is_active)}
                                    peutGerer={peutGerer}
                                    onRetirer={(h) => retirerHoraire(h, c.name)}
                                    onChange={charger}
                                />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

interface BlocClasseProps {
    operatorId: string;
    ligne: Ligne;
    classe: Classe;
    horaires: Horaire[];
    peutGerer: boolean;
    onRetirer: (h: Horaire) => void;
    onChange: () => void;
}

/** Une classe, ses tarifs, et ses horaires — avec l'ajout d'un horaire sur place. */
function BlocClasse({ operatorId, ligne, classe, horaires, peutGerer, onRetirer, onChange }: BlocClasseProps) {
    const [ajout, setAjout] = useState(false);
    const [heure, setHeure] = useState("");
    const [jours, setJours] = useState("1111111");
    const [tarifPropre, setTarifPropre] = useState(false);
    const [prix, setPrix] = useState("");
    const [prixAR, setPrixAR] = useState("");
    const [envoi, setEnvoi] = useState(false);

    const basculerJour = (i: number) => setJours((j) => j.split("").map((c, k) => (k === i ? (c === "1" ? "0" : "1") : c)).join(""));

    const ajouter = async (e: React.FormEvent) => {
        e.preventDefault();
        setEnvoi(true);
        try {
            const { data } = await new ApiService().postData(`v3/transport/${operatorId}/lines/${ligne.id}/schedules`, {
                class_id: classe.id,
                departure_time: heure,
                days: jours,
                ...(tarifPropre ? { price_one_way: Number(prix), price_round_trip: Number(prixAR) } : {}),
            });
            if (data.success) {
                toast.success(`Horaire ajouté · ${data.data?.departures_created ?? 0} départs créés`);
                setAjout(false); setHeure(""); setJours("1111111"); setTarifPropre(false); setPrix(""); setPrixAR("");
                onChange();
            } else {
                toast.error(messageDe(data));
            }
        } catch {
            toast.error("Connexion au serveur impossible");
        } finally {
            setEnvoi(false);
        }
    };

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="rounded-full bg-primary text-white text-xs font-bold px-2.5 py-0.5">{classe.name}</span>
                <span className="text-sm"><strong>{fcfa(classe.price_one_way)}</strong> <span className="text-slate-500">aller</span></span>
                <span className="text-sm"><strong>{fcfa(classe.price_round_trip)}</strong> <span className="text-slate-500">aller-retour</span></span>
                <span className="text-sm text-slate-500">plafond en ligne <strong className="text-slate-800 dark:text-slate-200">{classe.online_cap}</strong> places par gare</span>
            </div>

            <div className="flex flex-wrap gap-2">
                {horaires.length === 0 && <span className="text-sm text-slate-500">Aucun horaire : cette classe ne part pas encore.</span>}
                {horaires.map((h) => (
                    <span key={h.id} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 pl-3 pr-1 py-1 text-sm">
                        <strong className="tabular-nums">{h.departure_time}</strong>
                        <span className="text-slate-500">{joursLisibles(h.days)}</span>
                        {h.price_one_way !== null && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 px-1.5 text-xs font-semibold">
                                <Moon className="size-3" /> {fcfa(h.price_one_way)}
                            </span>
                        )}
                        {peutGerer && (
                            <button onClick={() => onRetirer(h)} title="Retirer cet horaire" className="size-6 grid place-items-center rounded-md text-slate-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40">
                                <X className="size-3.5" />
                            </button>
                        )}
                    </span>
                ))}
                {peutGerer && !ajout && (
                    <button onClick={() => setAjout(true)} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-400 px-3 py-1 text-sm text-slate-600 dark:text-slate-300">
                        <Plus className="size-3.5" /> Ajouter un horaire
                    </button>
                )}
            </div>

            {ajout && (
                <form onSubmit={ajouter} className="flex flex-col gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                    <div className="flex flex-wrap items-end gap-3">
                        <label className="flex flex-col gap-1.5"><span className={etiquette}>Départ</span>
                            <Input type="time" required value={heure} onChange={(e) => setHeure(e.target.value)} className="w-[130px]" />
                        </label>
                        <div className="flex flex-col gap-1.5"><span className={etiquette}>Jours</span>
                            <div className="flex gap-1">
                                {JOURS.map((j, i) => (
                                    <button key={i} type="button" onClick={() => basculerJour(i)} aria-pressed={jours[i] === "1"} title={NOMS_JOURS[i]}
                                        className={`size-9 rounded-lg text-sm font-semibold ${jours[i] === "1" ? "bg-primary text-white" : "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-500"}`}>
                                        {j}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={tarifPropre} onChange={(e) => setTarifPropre(e.target.checked)} className="size-4 accent-primary" />
                        Tarif propre à cet horaire (départ de nuit…)
                    </label>
                    {tarifPropre && (
                        <div className="flex flex-wrap gap-3">
                            <label className="flex flex-col gap-1.5"><span className={etiquette}>Aller simple (F)</span>
                                <Input type="number" min={1} required value={prix} onChange={(e) => setPrix(e.target.value)} className="w-[150px]" placeholder={String(classe.price_one_way)} />
                            </label>
                            <label className="flex flex-col gap-1.5"><span className={etiquette}>Aller-retour (F)</span>
                                <Input type="number" min={1} required value={prixAR} onChange={(e) => setPrixAR(e.target.value)} className="w-[150px]" placeholder={String(classe.price_round_trip)} />
                            </label>
                        </div>
                    )}
                    <div className="flex gap-2 justify-end">
                        <Button type="button" size="sm" onClick={() => setAjout(false)}>Annuler</Button>
                        <Button type="submit" size="sm" variant="primary" disabled={envoi || heure === "" || jours === "0000000"}>{envoi ? "Ajout…" : "Ajouter"}</Button>
                    </div>
                </form>
            )}
        </div>
    );
}

interface EditeurProps {
    brouillon: Brouillon;
    setBrouillon: (b: Brouillon | null) => void;
    gares: GareCourte[];
    envoi: boolean;
    onEnregistrer: (e: React.FormEvent) => void;
}

/**
 * Créer ou modifier une ligne : ses gares dans l'ordre du trajet, et ses
 * classes. Les règles sont celles du serveur, rappelées ici pour ne pas les
 * découvrir au moment d'enregistrer.
 */
function EditeurDeLigne({ brouillon, setBrouillon, gares, envoi, onEnregistrer }: EditeurProps) {
    const maj = (partiel: Partial<Brouillon>) => setBrouillon({ ...brouillon, ...partiel });

    const majArret = (i: number, partiel: Partial<Arret>) => maj({ stops: brouillon.stops.map((s, k) => (k === i ? { ...s, ...partiel } : s)) });
    const deplacer = (i: number, sens: -1 | 1) => {
        const stops = [...brouillon.stops];
        [stops[i], stops[i + sens]] = [stops[i + sens], stops[i]];
        maj({ stops });
    };
    const ajouterArret = () => {
        const dernier = brouillon.stops[brouillon.stops.length - 1];
        const libre = gares.find((g) => !brouillon.stops.some((s) => s.station_id === g.id));
        maj({ stops: [...brouillon.stops, { station_id: libre?.id ?? gares[0]?.id ?? 0, offset_minutes: (dernier?.offset_minutes ?? 0) + 30, boarding: false, alighting: true }] });
    };

    const majClasse = (i: number, partiel: Partial<Classe>) => maj({ classes: brouillon.classes.map((c, k) => (k === i ? { ...c, ...partiel } : c)) });

    return (
        <form onSubmit={onEnregistrer} className="flex flex-col gap-4">
            <section className={`${carte} p-5 grid gap-4 md:grid-cols-[1fr_1fr_auto]`}>
                <h3 className="md:col-span-3 text-base font-bold">{brouillon.id ? "Modifier la ligne" : "Nouvelle ligne"}</h3>
                <label className="flex flex-col gap-1.5"><span className={etiquette}>Ville de départ</span>
                    <Input required value={brouillon.origin_city} onChange={(e) => maj({ origin_city: e.target.value })} placeholder="Ville de départ" />
                </label>
                <label className="flex flex-col gap-1.5"><span className={etiquette}>Ville d'arrivée</span>
                    <Input required value={brouillon.destination_city} onChange={(e) => maj({ destination_city: e.target.value })} placeholder="Ville d'arrivée" />
                </label>
                <div className="flex flex-col gap-1.5"><span className={etiquette}>Durée du trajet</span>
                    <div className="flex items-center gap-2">
                        <Input type="number" min={0} max={72} className="w-[80px]" value={brouillon.heures} onChange={(e) => maj({ heures: Number(e.target.value) })} /><span className="text-sm text-slate-500">h</span>
                        <Input type="number" min={0} max={59} className="w-[80px]" value={brouillon.minutes} onChange={(e) => maj({ minutes: Number(e.target.value) })} /><span className="text-sm text-slate-500">min</span>
                    </div>
                </div>
            </section>

            <section className={`${carte} p-5 flex flex-col gap-3`}>
                <h3 className="text-base font-bold">Gares, dans l'ordre du trajet</h3>
                <p className="text-xs text-slate-500">La première est le départ (0 minute). L'heure de chaque gare se compte depuis le départ. Le terminus doit permettre de descendre.</p>
                {brouillon.stops.map((s, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 p-2">
                        <span className="w-6 text-center text-sm font-bold text-slate-400">{i + 1}</span>
                        <div className="min-w-[200px] flex-1">
                            <Select value={s.station_id} onChange={(e) => majArret(i, { station_id: Number(e.target.value) })}>
                                {gares.map((g) => <option key={g.id} value={g.id}>{g.name} · {g.city}</option>)}
                            </Select>
                        </div>
                        <label className="flex items-center gap-1.5 text-sm text-slate-500">+
                            <Input type="number" min={0} className="w-[90px]" disabled={i === 0} value={s.offset_minutes} onChange={(e) => majArret(i, { offset_minutes: Number(e.target.value) })} /> min
                        </label>
                        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={s.boarding} disabled={i === 0} onChange={(e) => majArret(i, { boarding: e.target.checked })} /> montée</label>
                        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={s.alighting} onChange={(e) => majArret(i, { alighting: e.target.checked })} /> descente</label>
                        <span className="flex gap-1 ml-auto">
                            <button type="button" title="Monter" disabled={i === 0} onClick={() => deplacer(i, -1)} className="size-8 grid place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><ArrowUp className="size-4" /></button>
                            <button type="button" title="Descendre" disabled={i === brouillon.stops.length - 1} onClick={() => deplacer(i, 1)} className="size-8 grid place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><ArrowDown className="size-4" /></button>
                            <button type="button" title="Retirer" disabled={brouillon.stops.length <= 2} onClick={() => maj({ stops: brouillon.stops.filter((_, k) => k !== i) })} className="size-8 grid place-items-center rounded-md text-slate-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30"><Trash2 className="size-4" /></button>
                        </span>
                    </div>
                ))}
                <button type="button" onClick={ajouterArret} className="self-start inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-400 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300">
                    <Plus className="size-3.5" /> Ajouter une gare
                </button>
            </section>

            <section className={`${carte} p-5 flex flex-col gap-3`}>
                <h3 className="text-base font-bold">Classes et tarifs par place</h3>
                <p className="text-xs text-slate-500">
                    Nommez vos classes librement (Classique, VIP, 1re classe, Couchette…). Le plafond est obligatoire : c'est le nombre maximum de places vendues en ligne, pour chaque gare et chaque départ. Vous recevez 100 % de ces prix.
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-sm">
                        <thead>
                            <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                <th className="py-2 pr-2">Classe</th><th className="py-2 pr-2">Aller simple (F)</th><th className="py-2 pr-2">Aller-retour (F)</th><th className="py-2 pr-2">Plafond en ligne *</th><th />
                            </tr>
                        </thead>
                        <tbody>
                            {brouillon.classes.map((c, i) => {
                                const trop = c.price_one_way > 0 && c.price_round_trip >= 2 * c.price_one_way;
                                return (
                                    <tr key={c.id ?? `n${i}`} className="align-top">
                                        <td className="py-1.5 pr-2"><Input required value={c.name} onChange={(e) => majClasse(i, { name: e.target.value })} /></td>
                                        <td className="py-1.5 pr-2"><Input type="number" min={1} required value={c.price_one_way || ""} onChange={(e) => majClasse(i, { price_one_way: Number(e.target.value) })} /></td>
                                        <td className="py-1.5 pr-2">
                                            <Input type="number" min={1} required value={c.price_round_trip || ""} onChange={(e) => majClasse(i, { price_round_trip: Number(e.target.value) })} className={trop ? "border-rose-500" : ""} />
                                            {trop && <p className="mt-1 text-xs text-rose-700">Doit coûter moins que deux allers ({fcfa(2 * c.price_one_way)}).</p>}
                                        </td>
                                        <td className="py-1.5 pr-2"><div className="flex items-center gap-2"><Input type="number" min={1} max={500} required value={c.online_cap || ""} onChange={(e) => majClasse(i, { online_cap: Number(e.target.value) })} className="w-[90px]" /><span className="text-slate-500">places</span></div></td>
                                        <td className="py-1.5">
                                            <button type="button" title="Retirer cette classe" disabled={brouillon.classes.length <= 1} onClick={() => maj({ classes: brouillon.classes.filter((_, k) => k !== i) })} className="size-9 grid place-items-center rounded-md text-slate-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30"><Trash2 className="size-4" /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <button type="button" onClick={() => maj({ classes: [...brouillon.classes, { name: "", price_one_way: 0, price_round_trip: 0, online_cap: 0 }] })} className="self-start inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-400 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300">
                    <Plus className="size-3.5" /> Ajouter une classe
                </button>
                {brouillon.id && <p className="text-xs text-slate-500">Retirer une classe la retire de la vente : ses départs déjà vendus restent, les autres disparaissent.</p>}
            </section>

            <div className="flex justify-end gap-2">
                <Button type="button" onClick={() => setBrouillon(null)}>Annuler</Button>
                <Button type="submit" variant="primary" disabled={envoi}>{envoi ? "Enregistrement…" : brouillon.id ? "Enregistrer" : "Créer la ligne"}</Button>
            </div>
        </form>
    );
}
