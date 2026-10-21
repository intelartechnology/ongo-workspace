import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { MapPin, Plus } from "lucide-react";
import ApiService from "../../services/ApiService";
import Loading from "../../components/Loading";
import { Button, Input } from "../../components/ui";

interface Gare {
    id: number;
    name: string;
    city: string;
    landmark: string | null;
    latitude: number;
    longitude: number;
    phone: string | null;
    opens_at: string | null;
    closes_at: string | null;
    online_close_minutes: number;
    is_active: boolean;
}

type Brouillon = Omit<Gare, "id" | "latitude" | "longitude"> & { id?: number; latitude: string; longitude: string };

const VIDE: Brouillon = {
    name: "", city: "", landmark: "", latitude: "", longitude: "", phone: "",
    opens_at: "", closes_at: "", online_close_minutes: 60, is_active: true,
};

const etiquette = "text-[11px] font-bold uppercase tracking-wider text-slate-400";

/**
 * Les gares du transporteur.
 *
 * Leur position fait la distance montrée au voyageur dans l'application : une
 * gare mal placée envoie les gens au mauvais endroit. Le lien « Voir sur la
 * carte » permet de vérifier le point avant d'enregistrer.
 */
export default function TransportStations({ operatorId, peutGerer }: { operatorId: string; peutGerer: boolean }) {
    const [gares, setGares] = useState<Gare[]>([]);
    const [chargement, setChargement] = useState(true);
    const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
    const [envoi, setEnvoi] = useState(false);

    const charger = async () => {
        setChargement(true);
        try {
            const { data } = await new ApiService().getData(`v3/transport/${operatorId}/stations`);
            if (data.success) setGares(data.data);
            else toast.error(data.message || "Chargement impossible");
        } catch {
            toast.error("Connexion au serveur impossible");
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => { charger(); }, [operatorId]); // eslint-disable-line react-hooks/exhaustive-deps

    const changer = <K extends keyof Brouillon>(cle: K, valeur: Brouillon[K]) => setBrouillon((b) => (b ? { ...b, [cle]: valeur } : b));

    const enregistrer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!brouillon) return;
        setEnvoi(true);
        const corps = {
            ...brouillon,
            landmark: brouillon.landmark || null,
            phone: brouillon.phone || null,
            opens_at: brouillon.opens_at || null,
            closes_at: brouillon.closes_at || null,
            latitude: Number(brouillon.latitude.replace(",", ".")),
            longitude: Number(brouillon.longitude.replace(",", ".")),
        };
        try {
            const url = brouillon.id ? `v3/transport/${operatorId}/stations/${brouillon.id}` : `v3/transport/${operatorId}/stations`;
            const { data } = await new ApiService().postData(url, corps);
            if (data.success) {
                toast.success(brouillon.id ? "Gare modifiée" : "Gare ajoutée");
                setBrouillon(null);
                charger();
            } else {
                const details = data.data && typeof data.data === "object" ? Object.values(data.data as Record<string, string[]>).flat()[0] : null;
                toast.error(details || data.message || "Enregistrement refusé");
            }
        } catch {
            toast.error("Connexion au serveur impossible");
        } finally {
            setEnvoi(false);
        }
    };

    const ouvrir = (g: Gare) => setBrouillon({
        ...g,
        landmark: g.landmark ?? "",
        phone: g.phone ?? "",
        opens_at: g.opens_at ?? "",
        closes_at: g.closes_at ?? "",
        latitude: String(g.latitude),
        longitude: String(g.longitude),
    });

    const positionValide = brouillon && brouillon.latitude !== "" && brouillon.longitude !== "" && !Number.isNaN(Number(brouillon.latitude.replace(",", "."))) && !Number.isNaN(Number(brouillon.longitude.replace(",", ".")));

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
                <p className="mr-auto text-sm text-slate-500 max-w-2xl">
                    Vos points de départ et d'arrivée. Leur position sert à montrer au voyageur la gare la plus proche de lui.
                </p>
                {peutGerer && !brouillon && (
                    <Button variant="primary" onClick={() => setBrouillon({ ...VIDE })}><Plus className="size-4" /> Ajouter une gare</Button>
                )}
            </div>

            {brouillon && (
                <form onSubmit={enregistrer} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 grid gap-4 md:grid-cols-2">
                    <h3 className="md:col-span-2 text-base font-bold">{brouillon.id ? `Modifier ${brouillon.name}` : "Nouvelle gare"}</h3>
                    <label className="flex flex-col gap-1.5"><span className={etiquette}>Nom affiché aux voyageurs</span>
                        <Input required value={brouillon.name} onChange={(e) => changer("name", e.target.value)} placeholder="Nom de la gare" />
                    </label>
                    <label className="flex flex-col gap-1.5"><span className={etiquette}>Ville</span>
                        <Input required value={brouillon.city} onChange={(e) => changer("city", e.target.value)} placeholder="Ville" />
                    </label>
                    <label className="flex flex-col gap-1.5 md:col-span-2"><span className={etiquette}>Repère pour la trouver</span>
                        <Input value={brouillon.landmark ?? ""} onChange={(e) => changer("landmark", e.target.value)} placeholder="Un repère connu, à côté de l'entrée" />
                    </label>
                    <label className="flex flex-col gap-1.5"><span className={etiquette}>Latitude</span>
                        <Input required inputMode="decimal" value={brouillon.latitude} onChange={(e) => changer("latitude", e.target.value)} placeholder="Latitude" />
                    </label>
                    <label className="flex flex-col gap-1.5"><span className={etiquette}>Longitude</span>
                        <Input required inputMode="decimal" value={brouillon.longitude} onChange={(e) => changer("longitude", e.target.value)} placeholder="Longitude" />
                    </label>
                    <p className="md:col-span-2 -mt-2 text-xs text-slate-500 flex items-center gap-1.5">
                        <MapPin className="size-3.5" />
                        {positionValide
                            ? <a className="text-primary font-semibold" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${brouillon.latitude.replace(",", ".")},${brouillon.longitude.replace(",", ".")}`}>Vérifier ce point sur la carte</a>
                            : "Copiez la position depuis Google Maps : appui long sur l'entrée de la gare, puis les deux nombres affichés."}
                    </p>
                    <label className="flex flex-col gap-1.5"><span className={etiquette}>Téléphone de la gare</span>
                        <Input value={brouillon.phone ?? ""} onChange={(e) => changer("phone", e.target.value)} placeholder="6XX XX XX XX" />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1.5"><span className={etiquette}>Ouverture</span>
                            <Input type="time" value={brouillon.opens_at ?? ""} onChange={(e) => changer("opens_at", e.target.value)} />
                        </label>
                        <label className="flex flex-col gap-1.5"><span className={etiquette}>Fermeture</span>
                            <Input type="time" value={brouillon.closes_at ?? ""} onChange={(e) => changer("closes_at", e.target.value)} />
                        </label>
                    </div>
                    <label className="flex flex-col gap-1.5"><span className={etiquette}>Fin de la vente en ligne, avant le passage du car</span>
                        <div className="flex items-center gap-2">
                            <Input type="number" min={0} max={1440} className="max-w-[120px]" value={brouillon.online_close_minutes} onChange={(e) => changer("online_close_minutes", Number(e.target.value))} />
                            <span className="text-sm text-slate-500">minutes</span>
                        </div>
                    </label>
                    {brouillon.id && (
                        <label className="flex items-center gap-2 text-sm self-end pb-2">
                            <input type="checkbox" checked={brouillon.is_active} onChange={(e) => changer("is_active", e.target.checked)} className="size-4 accent-primary" />
                            Gare en service
                        </label>
                    )}
                    <div className="md:col-span-2 flex justify-end gap-2">
                        <Button type="button" onClick={() => setBrouillon(null)}>Annuler</Button>
                        <Button type="submit" variant="primary" disabled={envoi}>{envoi ? "Enregistrement…" : "Enregistrer"}</Button>
                    </div>
                </form>
            )}

            {chargement ? <Loading /> : gares.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-sm text-slate-500">
                    Aucune gare. Commencez par ajouter vos gares : une ligne se construit avec elles.
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {gares.map((g) => (
                        <button
                            key={g.id}
                            type="button"
                            disabled={!peutGerer}
                            onClick={() => ouvrir(g)}
                            className={`text-left bg-white dark:bg-slate-900 rounded-xl border p-4 flex flex-col gap-1 enabled:hover:border-primary/40 ${g.is_active ? "border-slate-200 dark:border-slate-800" : "border-dashed border-slate-300 dark:border-slate-700 opacity-60"}`}
                        >
                            <span className="flex items-center justify-between gap-2">
                                <strong className="text-[15px] text-slate-900 dark:text-white">{g.name}</strong>
                                {!g.is_active && <span className="text-[10px] font-black uppercase text-slate-400">hors service</span>}
                            </span>
                            <span className="text-sm text-slate-600 dark:text-slate-300">{g.city}{g.landmark ? ` · ${g.landmark}` : ""}</span>
                            <span className="text-xs text-slate-500">
                                {g.opens_at && g.closes_at ? `Ouverte ${g.opens_at} – ${g.closes_at} · ` : ""}
                                Vente en ligne close {g.online_close_minutes} min avant le passage
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
