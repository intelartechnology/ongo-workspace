import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { Bus, Plus, TrainFront } from "lucide-react";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";
import { ActionsMenu, Button, Input, Select } from "../components/ui";

interface Transporteur {
    short_id: string;
    name: string;
    mode: "bus" | "train";
    status: "active" | "suspended";
    phone: string | null;
    stations_count: number;
    lines_count: number;
    created_at: string | null;
}

interface Props {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const etiquette = "text-[11px] font-bold uppercase tracking-wider text-slate-400";
const entete = "px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500";

/**
 * Les transporteurs : agences de bus et compagnies ferroviaires.
 *
 * Ongo les crée et leur donne un propriétaire ; tout le reste — gares,
 * lignes, tarifs, équipe — se règle dans leur espace, où l'on entre d'ici
 * pour dépanner.
 */
export default function TransportOperators({ onLogout, theme, toggleTheme }: Props) {
    const navigate = useNavigate();
    const [liste, setListe] = useState<Transporteur[]>([]);
    const [chargement, setChargement] = useState(true);
    const [formulaire, setFormulaire] = useState(false);
    const [envoi, setEnvoi] = useState(false);
    const [nom, setNom] = useState("");
    const [mode, setMode] = useState<"bus" | "train">("bus");
    const [telephone, setTelephone] = useState("");
    const [email, setEmail] = useState("");
    const [proprietaire, setProprietaire] = useState("");

    const charger = async () => {
        setChargement(true);
        try {
            const { data } = await new ApiService().getData("v3/admin/transport/operators");
            if (data.success) setListe(data.data);
            else toast.error(data.message || "Chargement impossible");
        } catch {
            toast.error("Connexion au serveur impossible");
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => { charger(); }, []);

    const creer = async (e: React.FormEvent) => {
        e.preventDefault();
        setEnvoi(true);
        try {
            const { data } = await new ApiService().postData("v3/admin/transport/operators", {
                name: nom.trim(),
                mode,
                phone: telephone.trim() || null,
                email: email.trim() || null,
                owner_phone: proprietaire.trim(),
            });
            if (data.success) {
                toast.success(`${data.data.name} est créé`);
                setFormulaire(false);
                setNom(""); setTelephone(""); setEmail(""); setProprietaire("");
                charger();
            } else {
                const details = data.data && typeof data.data === "object" ? Object.values(data.data as Record<string, string[]>).flat()[0] : null;
                toast.error(details || data.message || "Création refusée");
            }
        } catch {
            toast.error("Connexion au serveur impossible");
        } finally {
            setEnvoi(false);
        }
    };

    const basculer = async (t: Transporteur) => {
        const suspendre = t.status === "active";
        const choix = await Swal.fire({
            title: suspendre ? `Suspendre ${t.name} ?` : `Réactiver ${t.name} ?`,
            text: suspendre ? "Son équipe n'entre plus dans son espace. Ongo y garde accès." : "Son équipe retrouve son espace.",
            icon: suspendre ? "warning" : "question",
            showCancelButton: true,
            confirmButtonText: suspendre ? "Suspendre" : "Réactiver",
            cancelButtonText: "Annuler",
            confirmButtonColor: suspendre ? "#be123c" : "#10377b",
        });
        if (!choix.isConfirmed) return;
        try {
            const { data } = await new ApiService().postData("v3/admin/transport/operators/status", {
                operator_id: t.short_id,
                status: suspendre ? "suspended" : "active",
            });
            if (data.success) { toast.success(suspendre ? "Transporteur suspendu" : "Transporteur réactivé"); charger(); }
            else toast.error(data.message || "Action refusée");
        } catch {
            toast.error("Connexion au serveur impossible");
        }
    };

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header>
                <div className="px-8 py-6 max-w-7xl mx-auto flex flex-wrap items-end gap-4">
                    <div className="mr-auto">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Transporteurs</h1>
                        <p className="text-sm text-slate-500 mt-1">Agences de bus et compagnies ferroviaires. Leurs gares, lignes et tarifs se règlent dans leur espace.</p>
                    </div>
                    {!formulaire && <Button variant="primary" onClick={() => setFormulaire(true)}><Plus className="size-4" /> Nouveau transporteur</Button>}
                </div>
            </header>

            <div className="px-8 pb-10 max-w-7xl mx-auto flex flex-col gap-4">
                {formulaire && (
                    <form onSubmit={creer} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 grid gap-4 md:grid-cols-2">
                        <label className="flex flex-col gap-1.5"><span className={etiquette}>Nom</span>
                            <Input required value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom de l'agence ou de la compagnie" />
                        </label>
                        <label className="flex flex-col gap-1.5"><span className={etiquette}>Type</span>
                            <Select value={mode} onChange={(e) => setMode(e.target.value as "bus" | "train")}>
                                <option value="bus">Agence de bus</option>
                                <option value="train">Compagnie ferroviaire</option>
                            </Select>
                        </label>
                        <label className="flex flex-col gap-1.5"><span className={etiquette}>Téléphone</span>
                            <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="6XX XX XX XX" />
                        </label>
                        <label className="flex flex-col gap-1.5"><span className={etiquette}>E-mail</span>
                            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </label>
                        <label className="flex flex-col gap-1.5 md:col-span-2"><span className={etiquette}>Numéro du propriétaire (compte Ongo existant)</span>
                            <Input required value={proprietaire} onChange={(e) => setProprietaire(e.target.value)} placeholder="6XX XX XX XX" />
                        </label>
                        <p className="md:col-span-2 -mt-2 text-xs text-slate-500">Le propriétaire se connecte ensuite sur la page de connexion habituelle : il arrive directement dans l'espace du transporteur.</p>
                        <div className="md:col-span-2 flex justify-end gap-2">
                            <Button type="button" onClick={() => setFormulaire(false)}>Annuler</Button>
                            <Button type="submit" variant="primary" disabled={envoi}>{envoi ? "Création…" : "Créer"}</Button>
                        </div>
                    </form>
                )}

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[720px]">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className={entete}>Transporteur</th><th className={entete}>Gares</th><th className={entete}>Lignes</th><th className={entete}>Statut</th><th className={entete}>Créé le</th><th className={`${entete} text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {chargement ? (
                                    <tr><td colSpan={6} className="py-10"><Loading /></td></tr>
                                ) : liste.length === 0 ? (
                                    <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-500">Aucun transporteur pour l'instant.</td></tr>
                                ) : liste.map((t) => (
                                    <tr key={t.short_id} onClick={() => navigate(`/transport/${t.short_id}/lignes`)} className="cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center">{t.mode === "train" ? <TrainFront className="size-5" /> : <Bus className="size-5" />}</span>
                                                <span className="flex flex-col">
                                                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{t.name}</span>
                                                    <span className="text-[11px] text-slate-500">{t.mode === "train" ? "Compagnie ferroviaire" : "Agence de bus"}{t.phone ? ` · ${t.phone}` : ""}</span>
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">{t.stations_count}</td>
                                        <td className="px-4 py-3 text-sm">{t.lines_count}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${t.status === "active" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"}`}>
                                                {t.status === "active" ? "Actif" : "Suspendu"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{t.created_at ? new Date(t.created_at.replace(" ", "T")).toLocaleDateString("fr-FR") : "—"}</td>
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-end">
                                                <ActionsMenu items={[
                                                    { label: "Ouvrir son espace", icon: "open_in_new", onClick: () => navigate(`/transport/${t.short_id}/lignes`) },
                                                    { label: "Écran des départs", icon: "departure_board", onClick: () => navigate(`/transport/${t.short_id}`) },
                                                    { label: t.status === "active" ? "Suspendre" : "Réactiver", icon: t.status === "active" ? "block" : "check_circle", danger: t.status === "active", separatorBefore: true, onClick: () => basculer(t) },
                                                ]} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
