import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
    Banknote, Ban, ChefHat, CreditCard, History, ImageOff, Minus, Plus, Printer, ReceiptText, RefreshCw, Search, Smartphone, Trash2, X,
} from "lucide-react";
import ApiService from "../../services/ApiService";
import TablesAEncaisser from "./TablesAEncaisser";
import Loading from "../../components/Loading";
import {
    francs, imprimerTicket, lieuDeLaVente, MODES_DE_PAIEMENT, type EnTeteBoutique, type VenteImprimable,
} from "./ticketDeCaisse";

/**
 * La caisse du restaurant.
 *
 * Le catalogue à gauche, le ticket à droite : le caissier touche un produit,
 * il passe sur le ticket ; il encaisse, le ticket s'imprime. Les prix affichés
 * suivent le catalogue, mais c'est le serveur qui les recalcule à
 * l'encaissement : l'écran ne fait jamais foi.
 */

interface Option { id: number; name: string; extra_price: number; is_default: boolean; is_available: boolean }
interface Groupe { id: number; name: string; is_required: boolean; min_choices: number; max_choices: number; options: Option[] }
interface Produit {
    id: number;
    name: string;
    description: string | null;
    image: string | null;
    price: number;
    compare_at_price: number | null;
    bundle: { qty: number; price: number } | null;
    is_orderable: boolean;
    option_groups: Groupe[];
}
interface Rayon { id: number; name: string; products: Produit[] }
interface Boutique extends EnTeteBoutique { id: number; logo: string | null }

interface Ligne {
    /** Le produit et ses options : le même burger avec ou sans fromage fait deux lignes. */
    cle: string;
    produit: Produit;
    options: Option[];
    quantite: number;
}

type Mode = "dine_in" | "takeaway";
type Paiement = VenteImprimable["payment_method"];

interface VenteDuJour extends VenteImprimable { id: number; cancel_reason: string | null; kitchen_status: string | null }
interface Journee { count: number; total: number; by_payment_method: Record<Paiement, number>; sales: VenteDuJour[] }

interface Props {
    merchantId: string;
    storeId: number;
    /** Le propriétaire et le gérant annulent une vente ; la caisse, non. */
    peutAnnuler: boolean;
    /** Les commandes de table à encaisser en espèces, et sa mise à jour. */
    aEncaisser?: number;
    onAEncaisser?: (n: number) => void;
}

/** Une photo de produit, ou un pictogramme si elle manque ou ne se charge pas. */
function Vignette({ src, className, icone = "size-6" }: { src: string | null; className: string; icone?: string }) {
    // L'adresse qui a échoué, et non un simple drapeau : une autre photo se
    // retente d'elle-même.
    const [cassee, setCassee] = useState<string | null>(null);

    return src && cassee !== src
        ? <img src={src} alt="" loading="lazy" onError={() => setCassee(src)} className={className} />
        : <ImageOff className={`${icone} text-slate-300`} />;
}

const minimum = (g: Groupe) => (g.is_required ? Math.max(1, g.min_choices) : g.min_choices);

/** Le total d'une ligne, lots compris : le même calcul que le serveur. */
const totalDeLigne = (l: Ligne) => {
    const supplements = l.options.reduce((s, o) => s + o.extra_price, 0);
    const lot = l.produit.bundle;

    if (!lot || l.quantite < lot.qty) return (l.produit.price + supplements) * l.quantite;

    return Math.floor(l.quantite / lot.qty) * lot.price + (l.quantite % lot.qty) * l.produit.price + supplements * l.quantite;
};

const PAIEMENTS: { cle: Paiement; icone: typeof Banknote }[] = [
    { cle: "cash", icone: Banknote },
    { cle: "mobile_money", icone: Smartphone },
    { cle: "card", icone: CreditCard },
];

export default function Caisse({ merchantId, storeId, peutAnnuler, aEncaisser = 0, onAEncaisser }: Props) {
    const base = `v3/merchant/${merchantId}/stores/${storeId}`;

    const [boutique, setBoutique] = useState<Boutique | null>(null);
    const [rayons, setRayons] = useState<Rayon[]>([]);
    const [chargement, setChargement] = useState(true);
    const [rayon, setRayon] = useState<number | "tout">("tout");
    const [recherche, setRecherche] = useState("");

    const [lignes, setLignes] = useState<Ligne[]>([]);
    const [mode, setMode] = useState<Mode>("dine_in");
    const [table, setTable] = useState("");
    const [client, setClient] = useState("");
    const [enCuisine, setEnCuisine] = useState(true);
    const [paiement, setPaiement] = useState<Paiement>("cash");
    const [recu, setRecu] = useState("");
    const [envoi, setEnvoi] = useState(false);

    const [aChoisir, setAChoisir] = useState<Produit | null>(null);
    const [encaissee, setEncaissee] = useState<VenteDuJour | null>(null);
    const [journee, setJournee] = useState<Journee | null>(null);
    const [historique, setHistorique] = useState(false);

    /** Le volet de droite : le ticket en cours, ou les tables à encaisser. */
    const [volet, setVolet] = useState<"ticket" | "tables">("ticket");

    const champRecherche = useRef<HTMLInputElement>(null);

    const charger = async () => {
        setChargement(true);
        try {
            const { data } = await new ApiService().getData(`${base}/counter/catalog`);
            if (data.success) {
                setBoutique(data.data.store);
                setRayons(data.data.sections);
            } else toast.error(data.message || "Catalogue illisible");
        } catch {
            toast.error("Connexion au serveur impossible");
        } finally {
            setChargement(false);
        }
    };

    const chargerJournee = async () => {
        try {
            const { data } = await new ApiService().getData(`${base}/counter/sales`);
            if (data.success) setJournee(data.data);
        } catch {
            // La caisse reste utilisable sans le récapitulatif.
        }
    };

    useEffect(() => {
        setLignes([]);
        charger();
        chargerJournee();
    }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

    const visibles = useMemo(() => {
        const mot = recherche.trim().toLowerCase();
        const source = rayon === "tout" ? rayons : rayons.filter((r) => r.id === rayon);
        const produits = source.flatMap((r) => r.products);

        return mot ? rayons.flatMap((r) => r.products).filter((p) => p.name.toLowerCase().includes(mot)) : produits;
    }, [rayons, rayon, recherche]);

    const total = lignes.reduce((s, l) => s + totalDeLigne(l), 0);
    const articles = lignes.reduce((s, l) => s + l.quantite, 0);
    const recuEnFrancs = Number(recu.replace(/\s/g, "")) || 0;
    const monnaie = paiement === "cash" && recu !== "" ? recuEnFrancs - total : null;

    const quantiteAuTicket = (p: Produit) => lignes.filter((l) => l.produit.id === p.id).reduce((s, l) => s + l.quantite, 0);

    const ajouter = (produit: Produit, options: Option[] = []) => {
        const cle = `${produit.id}:${options.map((o) => o.id).sort((a, b) => a - b).join(",")}`;
        setLignes((avant) => {
            const deja = avant.find((l) => l.cle === cle);
            return deja
                ? avant.map((l) => (l.cle === cle ? { ...l, quantite: l.quantite + 1 } : l))
                : [...avant, { cle, produit, options, quantite: 1 }];
        });
    };

    const toucher = (produit: Produit) => {
        if (!produit.is_orderable) return;
        if (produit.option_groups.length > 0) setAChoisir(produit);
        else ajouter(produit);
    };

    const changerQuantite = (cle: string, ecart: number) =>
        setLignes((avant) => avant.flatMap((l) => (l.cle !== cle ? [l] : l.quantite + ecart <= 0 ? [] : [{ ...l, quantite: l.quantite + ecart }])));

    const vider = () => {
        setLignes([]);
        setTable("");
        setClient("");
        setRecu("");
        setPaiement("cash");
    };

    const encaisser = async () => {
        if (lignes.length === 0 || envoi) return;
        if (monnaie !== null && monnaie < 0) {
            toast.error("La somme reçue est inférieure au total");
            return;
        }

        setEnvoi(true);
        try {
            const { data } = await new ApiService().postData(`${base}/counter/sales`, {
                items: lignes.map((l) => ({ product_id: l.produit.id, quantity: l.quantite, options: l.options.map((o) => o.id) })),
                dining_mode: mode,
                table_number: mode === "dine_in" ? table : null,
                customer_name: client,
                payment_method: paiement,
                amount_received: paiement === "cash" && recu !== "" ? recuEnFrancs : null,
                send_to_kitchen: enCuisine,
            });

            if (data.success) {
                setEncaissee(data.data);
                vider();
                chargerJournee();
            } else {
                toast.error(data.message || "Vente refusée");
                // Un produit passé indisponible entre-temps : le catalogue se met à jour.
                charger();
            }
        } catch {
            toast.error("Connexion au serveur impossible");
        } finally {
            setEnvoi(false);
        }
    };

    const annuler = async (vente: VenteDuJour) => {
        const motif = window.prompt(`Annuler le ticket n° ${vente.ticket_number} (${francs(vente.total)}) ?\nIndiquez le motif :`);
        if (motif === null) return;
        if (motif.trim() === "") {
            toast.error("Indiquez le motif de l'annulation");
            return;
        }

        try {
            const { data } = await new ApiService().postData(`${base}/counter/sales/cancel`, { sale_id: vente.id, reason: motif });
            if (data.success) {
                toast.success(`Ticket n° ${vente.ticket_number} annulé`);
                chargerJournee();
            } else toast.error(data.message || "Annulation refusée");
        } catch {
            toast.error("Connexion au serveur impossible");
        }
    };

    if (chargement && !boutique) return <div className="p-10"><Loading /></div>;

    return (
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)]">
            {/* Le catalogue */}
            <section className="flex-1 min-w-0 flex flex-col lg:overflow-hidden">
                <div className="px-4 md:px-6 pt-5 pb-3 space-y-4">
                    <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center gap-2.5 h-11 px-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus-within:border-primary">
                            <Search className="size-[18px] text-slate-400" />
                            <input
                                ref={champRecherche}
                                autoFocus
                                value={recherche}
                                onChange={(e) => setRecherche(e.target.value)}
                                placeholder="Rechercher un produit…"
                                className="flex-1 bg-transparent outline-none text-[15px] text-slate-900 dark:text-white placeholder:text-slate-400"
                            />
                            {recherche && <button onClick={() => setRecherche("")} aria-label="Effacer"><X className="size-4 text-slate-400" /></button>}
                        </label>
                        <button
                            onClick={() => { setHistorique(true); chargerJournee(); }}
                            className="h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-primary/40"
                        >
                            <History className="size-[18px]" />
                            <span className="hidden sm:inline">Ventes du jour</span>
                            {journee && <span className="px-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs">{journee.count}</span>}
                        </button>
                        <button onClick={charger} title="Actualiser le catalogue" className="h-11 w-11 grid place-items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800">
                            <RefreshCw className={`size-[18px] ${chargement ? "animate-spin" : ""}`} />
                        </button>
                    </div>

                    {/* Les rayons, comme des onglets */}
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 custom-scrollbar">
                        {[{ id: "tout" as const, name: "Tout", image: null as string | null }, ...rayons.map((r) => ({ id: r.id, name: r.name, image: r.products.find((p) => p.image)?.image ?? null }))].map((r) => {
                            const actif = !recherche && rayon === r.id;
                            return (
                                <button
                                    key={r.id}
                                    onClick={() => { setRayon(r.id); setRecherche(""); }}
                                    className={`shrink-0 min-w-[84px] px-3 py-2 rounded-xl border flex flex-col items-center gap-1 text-[13px] font-semibold transition ${
                                        actif
                                            ? "border-primary bg-primary/5 text-primary dark:border-primary-fixed-dim dark:text-primary-fixed-dim"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                                    }`}
                                >
                                    {r.image
                                        ? <span className="size-7 grid place-items-center"><Vignette src={r.image} className="size-7 rounded-full object-cover" icone="size-5" /></span>
                                        : <ReceiptText className="size-7 p-1" strokeWidth={1.75} />}
                                    <span className="max-w-[120px] truncate">{r.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 lg:overflow-y-auto custom-scrollbar px-4 md:px-6 pb-6">
                    {rayons.length === 0 ? (
                        <div className="mt-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-sm text-slate-500">
                            Aucun produit dans le catalogue. Ajoutez vos produits dans Catalogue › Produits, ils apparaîtront ici.
                        </div>
                    ) : visibles.length === 0 ? (
                        <p className="mt-6 text-center text-sm text-slate-500">Aucun produit ne correspond à « {recherche} ».</p>
                    ) : (
                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                            {visibles.map((p) => {
                                const auTicket = quantiteAuTicket(p);
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => toucher(p)}
                                        disabled={!p.is_orderable}
                                        className={`relative text-left rounded-2xl border bg-white dark:bg-slate-900 p-3 flex flex-col gap-2 transition ${
                                            auTicket > 0 ? "border-primary ring-1 ring-primary/30" : "border-slate-200 dark:border-slate-800"
                                        } enabled:hover:border-primary/50 enabled:active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        <div className="aspect-[4/3] rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden grid place-items-center">
                                            <Vignette src={p.image} className="h-full w-full object-cover" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-[14px] leading-snug text-slate-900 dark:text-white line-clamp-2">{p.name}</p>
                                            {p.description && <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{p.description}</p>}
                                        </div>
                                        <div className="mt-auto flex items-center justify-between gap-2">
                                            <span>
                                                <span className="font-bold text-[15px] text-slate-900 dark:text-white">{francs(p.price)}</span>
                                                {p.compare_at_price && <span className="ml-1.5 text-xs text-slate-400 line-through">{francs(p.compare_at_price)}</span>}
                                            </span>
                                            {p.is_orderable
                                                ? <span className="size-8 rounded-lg bg-primary text-white grid place-items-center dark:bg-primary-container"><Plus className="size-4" strokeWidth={2.5} /></span>
                                                : <span className="text-[11px] font-bold uppercase text-slate-400">Indisponible</span>}
                                        </div>
                                        {auTicket > 0 && (
                                            <span className="absolute top-2 right-2 min-w-6 h-6 px-1.5 rounded-full bg-primary text-white text-xs font-bold grid place-items-center shadow">{auTicket}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* Le ticket */}
            <aside className="w-full lg:w-[380px] xl:w-[400px] shrink-0 bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col lg:h-full">
                <div className="px-5 pt-5">
                    <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-semibold">
                        <button onClick={() => setVolet("ticket")} className={`py-2 rounded-lg transition ${volet === "ticket" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"}`}>Ticket</button>
                        <button onClick={() => setVolet("tables")} className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${volet === "tables" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"}`}>
                            Tables à encaisser
                            {aEncaisser > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-white text-[11px] font-bold grid place-items-center">{aEncaisser}</span>}
                        </button>
                    </div>
                </div>

                {volet === "tables" ? (
                    <div className="flex-1 lg:overflow-y-auto custom-scrollbar p-5">
                        <TablesAEncaisser merchantId={merchantId} storeId={storeId} onCompte={onAEncaisser} />
                    </div>
                ) : (<>
                <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ticket <span className="text-sm font-medium text-slate-400">{articles > 0 ? `· ${articles} article${articles > 1 ? "s" : ""}` : ""}</span></h3>
                    {lignes.length > 0 && (
                        <button onClick={vider} className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1"><Trash2 className="size-3.5" /> Vider</button>
                    )}
                </div>

                <div className="flex-1 min-h-[120px] lg:overflow-y-auto custom-scrollbar px-5 space-y-2">
                    {lignes.length === 0 ? (
                        <p className="py-10 text-center text-sm text-slate-400">Touchez un produit pour l'ajouter au ticket.</p>
                    ) : lignes.map((l) => (
                        <div key={l.cle} className="flex gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                            <div className="size-12 shrink-0 rounded-lg bg-white dark:bg-slate-900 overflow-hidden grid place-items-center">
                                <Vignette src={l.produit.image} className="h-full w-full object-cover" icone="size-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-semibold text-slate-900 dark:text-white truncate">{l.produit.name}</p>
                                {l.options.length > 0 && <p className="text-xs text-slate-500 truncate">+ {l.options.map((o) => o.name).join(", ")}</p>}
                                <p className="text-[13px] font-bold text-slate-900 dark:text-white mt-0.5">{francs(totalDeLigne(l))}</p>
                            </div>
                            <div className="flex flex-col items-end justify-between">
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => changerQuantite(l.cle, -1)} aria-label="Retirer un" className="size-7 rounded-full border border-slate-300 dark:border-slate-600 grid place-items-center text-slate-600 dark:text-slate-300 hover:border-primary"><Minus className="size-3.5" /></button>
                                    <span className="w-6 text-center text-sm font-bold tabular-nums">{l.quantite}</span>
                                    <button onClick={() => changerQuantite(l.cle, 1)} aria-label="Ajouter un" className="size-7 rounded-full bg-primary text-white grid place-items-center dark:bg-primary-container"><Plus className="size-3.5" /></button>
                                </div>
                                <button onClick={() => changerQuantite(l.cle, -l.quantite)} className="text-[11px] font-semibold text-red-600 hover:underline">Retirer</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-5 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    {/* Sur place ou à emporter */}
                    <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                        {(["dine_in", "takeaway"] as Mode[]).map((m) => (
                            <button key={m} onClick={() => setMode(m)} className={`py-2 rounded-lg text-sm font-semibold transition ${mode === m ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500"}`}>
                                {m === "dine_in" ? "Sur place" : "À emporter"}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        {mode === "dine_in" && (
                            <input value={table} onChange={(e) => setTable(e.target.value)} maxLength={12} placeholder="Table n°" className="w-24 h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary" />
                        )}
                        <input value={client} onChange={(e) => setClient(e.target.value)} maxLength={80} placeholder="Nom du client (facultatif)" className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary" />
                    </div>

                    <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                        <input type="checkbox" checked={enCuisine} onChange={(e) => setEnCuisine(e.target.checked)} className="size-4 accent-primary" />
                        <ChefHat className="size-4 text-slate-500" /> Envoyer en cuisine
                    </label>

                    {/* Le paiement */}
                    <div className="grid grid-cols-3 gap-2">
                        {PAIEMENTS.map(({ cle, icone: Icone }) => (
                            <button key={cle} onClick={() => setPaiement(cle)} className={`py-2 rounded-xl border flex flex-col items-center gap-1 text-[12px] font-semibold transition ${paiement === cle ? "border-primary bg-primary/5 text-primary dark:text-primary-fixed-dim" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}>
                                <Icone className="size-[18px]" /> {MODES_DE_PAIEMENT[cle]}
                            </button>
                        ))}
                    </div>
                    {paiement === "cash" && (
                        <div className="flex items-center gap-2">
                            <input inputMode="numeric" value={recu} onChange={(e) => setRecu(e.target.value.replace(/[^\d\s]/g, ""))} placeholder="Somme reçue" className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-primary" />
                            <span className={`text-sm font-semibold whitespace-nowrap ${monnaie !== null && monnaie < 0 ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"}`}>
                                {monnaie === null ? "" : monnaie < 0 ? `Manque ${francs(-monnaie)}` : `Rendre ${francs(monnaie)}`}
                            </span>
                        </div>
                    )}

                    <div className="flex items-end justify-between pt-1">
                        <span className="text-sm font-semibold text-slate-500">Total</span>
                        <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">{francs(total)}</span>
                    </div>

                    <button
                        onClick={encaisser}
                        disabled={lignes.length === 0 || envoi || (monnaie !== null && monnaie < 0)}
                        className="w-full h-12 rounded-xl bg-primary text-white font-bold text-[15px] dark:bg-primary-container disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {envoi ? "Encaissement…" : lignes.length === 0 ? "Encaisser" : `Encaisser ${francs(total)}`}
                    </button>
                </div>
                </>)}
            </aside>

            {aChoisir && <ChoixDesOptions produit={aChoisir} onClose={() => setAChoisir(null)} onValider={(options) => { ajouter(aChoisir, options); setAChoisir(null); }} />}

            {encaissee && boutique && (
                <Fenetre onClose={() => { setEncaissee(null); champRecherche.current?.focus(); }} titre={`Ticket n° ${encaissee.ticket_number} encaissé`}>
                    <div className="text-center space-y-1">
                        <p className="text-3xl font-black text-slate-900 dark:text-white">{francs(encaissee.total)}</p>
                        <p className="text-sm text-slate-500">{MODES_DE_PAIEMENT[encaissee.payment_method]} · {lieuDeLaVente(encaissee)}{encaissee.kitchen_status ? " · envoyé en cuisine" : ""}</p>
                        {encaissee.change_given !== null && encaissee.change_given > 0 && (
                            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">Rendre {francs(encaissee.change_given)}</p>
                        )}
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-2">
                        <button onClick={() => imprimerTicket(encaissee, boutique)} className="h-12 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 dark:bg-primary-container">
                            <Printer className="size-5" /> Imprimer
                        </button>
                        <button onClick={() => { setEncaissee(null); champRecherche.current?.focus(); }} className="h-12 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200">
                            Nouvelle vente
                        </button>
                    </div>
                </Fenetre>
            )}

            {historique && boutique && (
                <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label="Ventes du jour">
                    <button aria-label="Fermer" onClick={() => setHistorique(false)} className="absolute inset-0 bg-slate-900/50" />
                    <aside className="relative w-full max-w-[480px] h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
                        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="text-lg font-bold">Ventes du jour</h3>
                            <button onClick={() => setHistorique(false)} aria-label="Fermer"><X className="size-5 text-slate-400" /></button>
                        </div>
                        {journee && (
                            <div className="px-5 py-4 grid grid-cols-2 gap-3 border-b border-slate-200 dark:border-slate-800">
                                <div className="col-span-2">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Encaissé aujourd'hui</p>
                                    <p className="text-2xl font-black">{francs(journee.total)} <span className="text-sm font-medium text-slate-500">· {journee.count} vente{journee.count > 1 ? "s" : ""}</span></p>
                                </div>
                                {PAIEMENTS.map(({ cle }) => (
                                    <div key={cle} className="text-sm"><span className="text-slate-500">{MODES_DE_PAIEMENT[cle]}</span> <strong className="float-right">{francs(journee.by_payment_method[cle])}</strong></div>
                                ))}
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800">
                            {!journee || journee.sales.length === 0 ? (
                                <p className="p-8 text-center text-sm text-slate-400">Aucune vente aujourd'hui.</p>
                            ) : journee.sales.map((v) => (
                                <div key={v.id} className={`px-5 py-3 flex items-center gap-3 ${v.canceled_at ? "opacity-60" : ""}`}>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-semibold text-sm ${v.canceled_at ? "line-through" : ""}`}>
                                            N° {v.ticket_number} · {francs(v.total)}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">
                                            {new Date(v.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · {MODES_DE_PAIEMENT[v.payment_method]} · {lieuDeLaVente(v)}{v.seller ? ` · ${v.seller}` : ""}
                                        </p>
                                        {v.canceled_at && <p className="text-xs text-red-600">Annulée : {v.cancel_reason}</p>}
                                    </div>
                                    <button onClick={() => imprimerTicket(v, boutique)} title="Réimprimer" className="size-9 grid place-items-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800"><Printer className="size-4" /></button>
                                    {peutAnnuler && !v.canceled_at && (
                                        <button onClick={() => annuler(v)} title="Annuler la vente" className="size-9 grid place-items-center rounded-lg border border-red-200 dark:border-red-900 text-red-500 hover:text-red-700"><Ban className="size-4" /></button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}

function Fenetre({ titre, onClose, children }: { titre: string; onClose: () => void; children: React.ReactNode }) {
    useEffect(() => {
        const fermer = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", fermer);
        return () => window.removeEventListener("keydown", fermer);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-label={titre}>
            <button aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-slate-900/50" />
            <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{titre}</h3>
                    <button onClick={onClose} aria-label="Fermer"><X className="size-5 text-slate-400" /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

/** Le choix des options d'un produit : taille, cuisson, suppléments. */
function ChoixDesOptions({ produit, onClose, onValider }: { produit: Produit; onClose: () => void; onValider: (options: Option[]) => void }) {
    const [choisis, setChoisis] = useState<number[]>(() =>
        produit.option_groups.flatMap((g) => g.options.filter((o) => o.is_default && o.is_available).slice(0, Math.max(1, g.max_choices)).map((o) => o.id)),
    );

    const basculer = (g: Groupe, o: Option) => {
        setChoisis((avant) => {
            const duGroupe = avant.filter((id) => g.options.some((x) => x.id === id));
            if (avant.includes(o.id)) return avant.filter((id) => id !== o.id);
            // Un seul choix : le nouveau remplace l'ancien.
            if (g.max_choices <= 1) return [...avant.filter((id) => !duGroupe.includes(id)), o.id];
            if (duGroupe.length >= g.max_choices) return avant;
            return [...avant, o.id];
        });
    };

    const manque = produit.option_groups.find((g) => choisis.filter((id) => g.options.some((o) => o.id === id)).length < minimum(g));
    const options = produit.option_groups.flatMap((g) => g.options).filter((o) => choisis.includes(o.id));
    const prix = produit.price + options.reduce((s, o) => s + o.extra_price, 0);

    return (
        <Fenetre titre={produit.name} onClose={onClose}>
            <div className="max-h-[55vh] overflow-y-auto custom-scrollbar space-y-5 -mx-1 px-1">
                {produit.option_groups.map((g) => (
                    <div key={g.id}>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {g.name}
                            <span className="ml-2 text-xs font-medium text-slate-400">
                                {minimum(g) > 0 ? "obligatoire" : "facultatif"}{g.max_choices > 1 ? ` · ${g.max_choices} au plus` : ""}
                            </span>
                        </p>
                        <div className="mt-2 grid gap-1.5">
                            {g.options.map((o) => {
                                const pris = choisis.includes(o.id);
                                return (
                                    <button
                                        key={o.id}
                                        disabled={!o.is_available}
                                        onClick={() => basculer(g, o)}
                                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition ${pris ? "border-primary bg-primary/5 font-semibold" : "border-slate-200 dark:border-slate-700"} disabled:opacity-40`}
                                    >
                                        <span>{o.name}{!o.is_available ? " · épuisé" : ""}</span>
                                        {o.extra_price > 0 && <span className="text-slate-500">+ {francs(o.extra_price)}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            <button
                disabled={!!manque}
                onClick={() => onValider(options)}
                className="mt-5 w-full h-12 rounded-xl bg-primary text-white font-bold dark:bg-primary-container disabled:opacity-40"
            >
                {manque ? `Choisissez : ${manque.name}` : `Ajouter · ${francs(prix)}`}
            </button>
        </Fenetre>
    );
}
