import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "react-toastify";
import { MoreHorizontal, Plus, Printer } from "lucide-react";
import ApiService from "../../services/ApiService";
import Loading from "../../components/Loading";
import { imprimerChevalets } from "./chevalets";

/**
 * Les tables du restaurant et leurs QR codes.
 *
 * Le client scanne le QR code de sa table avec l'application Ongo, commande
 * et paie en ligne ou en espèces ; la commande arrive dans l'écran Commandes,
 * marquée « Sur place · Table N ».
 */

interface Table { id: number; name: string; is_active: boolean; link: string; orders_today: number }
interface Etat { enabled: boolean; is_located: boolean; radius_m: number; store: { name: string }; tables: Table[] }

interface Props { merchantId: string; storeId: number; peutGerer: boolean }

function Vignette({ lien }: { lien: string }) {
    const [svg, setSvg] = useState<string>("");

    useEffect(() => {
        let vivant = true;
        QRCode.toString(lien, { type: "svg", margin: 0, color: { dark: "#0f172a", light: "#ffffff" } }).then((s) => vivant && setSvg(s));
        return () => { vivant = false; };
    }, [lien]);

    return <div className="size-24 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function Tables({ merchantId, storeId, peutGerer }: Props) {
    const base = `v3/merchant/${merchantId}/stores/${storeId}`;
    const [etat, setEtat] = useState<Etat | null>(null);
    const [ajout, setAjout] = useState(false);
    const [de, setDe] = useState("1");
    const [a, setA] = useState("10");
    const [prefixe, setPrefixe] = useState("Table");
    const [menu, setMenu] = useState<number | null>(null);

    const charger = async () => {
        try {
            const { data } = await new ApiService().getData(`${base}/tables`);
            if (data.success) setEtat(data.data);
            else toast.error(data.message || "Tables illisibles");
        } catch {
            toast.error("Connexion au serveur impossible");
        }
    };

    useEffect(() => { charger(); }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

    const envoyer = async (chemin: string, corps: Record<string, unknown>) => {
        try {
            const { data } = await new ApiService().postData(`${base}/${chemin}`, corps);
            if (data.success) {
                toast.success(data.message);
                await charger();
                return true;
            }
            toast.error(data.message || "Refusé");
        } catch {
            toast.error("Connexion au serveur impossible");
        }
        return false;
    };

    const ajouter = async (e: React.FormEvent) => {
        e.preventDefault();
        if (await envoyer("tables", { from: Number(de), to: Number(a), prefix: prefixe })) setAjout(false);
    };

    const renommer = async (t: Table) => {
        setMenu(null);
        const nom = window.prompt(`Nouveau nom pour « ${t.name} »`, t.name);
        if (nom && nom.trim() && nom.trim() !== t.name) await envoyer("tables/update", { table_id: t.id, name: nom.trim() });
    };

    const nouveauQr = async (t: Table) => {
        setMenu(null);
        if (window.confirm(`Créer un nouveau QR code pour ${t.name} ? L'ancien ne fonctionnera plus : il faudra réimprimer le chevalet.`)) {
            await envoyer("tables/regenerate", { table_id: t.id });
        }
    };

    if (!etat) return <Loading />;

    const actives = etat.tables.filter((t) => t.is_active);

    return (
        <div className="flex flex-col gap-4" onClick={() => setMenu(null)}>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white">Commande à table</p>
                    <p className="text-sm text-slate-500">
                        Vos clients scannent le QR code de leur table avec l'application Ongo, commandent, et paient en ligne ou en espèces.
                        La commande arrive dans l'écran Commandes, marquée « Sur place · Table N ». Le client doit être à moins de {etat.radius_m} m du restaurant.
                    </p>
                    {!etat.is_located && (
                        <p className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-400">Indiquez d'abord la position du restaurant dans Réglages › Boutique : elle sert à vérifier que le client est sur place.</p>
                    )}
                </div>
                <button
                    role="switch"
                    aria-checked={etat.enabled}
                    disabled={!peutGerer}
                    onClick={() => envoyer("tables/enabled", { enabled: !etat.enabled })}
                    className={`relative w-12 h-7 shrink-0 rounded-full transition ${etat.enabled ? "bg-primary dark:bg-primary-container" : "bg-slate-300 dark:bg-slate-700"} disabled:opacity-50`}
                >
                    <span className={`absolute top-1 size-5 rounded-full bg-white transition-all ${etat.enabled ? "right-1" : "left-1"}`} />
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <p className="mr-auto text-sm text-slate-500">
                    {etat.tables.length} table{etat.tables.length > 1 ? "s" : ""} · chaque QR code est propre à une table et à ce restaurant.
                </p>
                {peutGerer && (
                    <button onClick={() => setAjout((v) => !v)} className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold flex items-center gap-1.5">
                        <Plus className="size-4" /> Ajouter des tables
                    </button>
                )}
                <button
                    disabled={actives.length === 0}
                    onClick={() => imprimerChevalets(etat.store.name, actives)}
                    className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold flex items-center gap-1.5 dark:bg-primary-container disabled:opacity-40"
                >
                    <Printer className="size-4" /> Imprimer tous les QR codes
                </button>
            </div>

            {ajout && (
                <form onSubmit={ajouter} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">Nom
                        <input value={prefixe} onChange={(e) => setPrefixe(e.target.value)} maxLength={30} className="h-10 w-36 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">De
                        <input type="number" min={1} value={de} onChange={(e) => setDe(e.target.value)} className="h-10 w-20 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">À
                        <input type="number" min={1} value={a} onChange={(e) => setA(e.target.value)} className="h-10 w-20 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white" />
                    </label>
                    <p className="text-sm text-slate-500 pb-2.5">Crée « {prefixe || "Table"} {de} » à « {prefixe || "Table"} {a} ». Les noms déjà pris sont ignorés.</p>
                    <button type="submit" className="ml-auto h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold dark:bg-primary-container">Ajouter</button>
                </form>
            )}

            {etat.tables.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-sm text-slate-500">
                    Aucune table. Ajoutez vos tables pour imprimer leurs QR codes.
                </div>
            ) : (
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                    {etat.tables.map((t) => (
                        <div key={t.id} className={`relative bg-white dark:bg-slate-900 rounded-xl border p-4 flex flex-col items-center gap-2 ${t.is_active ? "border-slate-200 dark:border-slate-800" : "border-dashed border-slate-300 dark:border-slate-700 opacity-60"}`}>
                            <Vignette lien={t.link} />
                            <p className="font-bold text-slate-900 dark:text-white text-center">{t.name}</p>
                            <p className="text-xs text-slate-500">
                                {!t.is_active ? "désactivée" : t.orders_today > 0 ? `${t.orders_today} commande${t.orders_today > 1 ? "s" : ""} aujourd'hui` : "—"}
                            </p>
                            <div className="flex gap-2 w-full">
                                <button disabled={!t.is_active} onClick={() => imprimerChevalets(etat.store.name, [t])} className="flex-1 h-8 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold disabled:opacity-40">Imprimer</button>
                                {peutGerer && (
                                    <button onClick={(e) => { e.stopPropagation(); setMenu(menu === t.id ? null : t.id); }} aria-label="Plus d'actions" className="h-8 px-2 rounded-lg border border-slate-300 dark:border-slate-700">
                                        <MoreHorizontal className="size-4" />
                                    </button>
                                )}
                            </div>
                            {menu === t.id && (
                                <div onClick={(e) => e.stopPropagation()} className="absolute right-3 top-[calc(100%-8px)] z-10 w-48 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1 text-sm">
                                    <button onClick={() => renommer(t)} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">Renommer</button>
                                    <button onClick={() => { setMenu(null); envoyer("tables/update", { table_id: t.id, is_active: !t.is_active }); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">{t.is_active ? "Désactiver" : "Réactiver"}</button>
                                    <button onClick={() => nouveauQr(t)} className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">Nouveau QR code</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
