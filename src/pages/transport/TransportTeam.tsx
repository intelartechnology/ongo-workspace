import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import ApiService from "../../services/ApiService";
import Loading from "../../components/Loading";
import { Avatar, Button, Input, Select } from "../../components/ui";
import type { EspaceTransport, RoleTransport } from "./transportDonnees";

interface Membre {
    user_id: number;
    role: "owner" | "manager" | "agent";
    station_id: number | null;
    station_name: string | null;
    nom: string | null;
    prenom: string | null;
    telephone: string | null;
    photo: string | null;
}

const ROLES: Record<Membre["role"], string> = { owner: "Propriétaire", manager: "Responsable", agent: "Agent de gare" };

const etiquette = "text-[11px] font-bold uppercase tracking-wider text-slate-400";
const entete = "px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500";

/**
 * L'équipe du transporteur.
 *
 * Un agent est celui d'une gare : il tient l'écran des départs de sa gare, et
 * rien d'autre. Un responsable gère tout le réseau. Seul le propriétaire
 * nomme des responsables.
 */
export default function TransportTeam({ operatorId, espace }: { operatorId: string; espace: EspaceTransport }) {
    const [membres, setMembres] = useState<Membre[]>([]);
    const [moi, setMoi] = useState(0);
    const [chargement, setChargement] = useState(true);
    const [telephone, setTelephone] = useState("");
    const [role, setRole] = useState<"agent" | "manager">("agent");
    const [gare, setGare] = useState<number>(espace.stations.find((g) => g.boarding)?.id ?? espace.stations[0]?.id ?? 0);
    const [envoi, setEnvoi] = useState(false);

    const monRole: RoleTransport = espace.role;
    const nommeResponsables = monRole === "owner" || monRole === "admin";

    const charger = async () => {
        setChargement(true);
        try {
            const { data } = await new ApiService().getData(`v3/transport/${operatorId}/team`);
            if (data.success) { setMembres(data.data.members); setMoi(data.data.me); }
            else toast.error(data.message || "Chargement impossible");
        } catch {
            toast.error("Connexion au serveur impossible");
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => { charger(); }, [operatorId]); // eslint-disable-line react-hooks/exhaustive-deps

    const inviter = async (e: React.FormEvent) => {
        e.preventDefault();
        setEnvoi(true);
        try {
            const { data } = await new ApiService().postData(`v3/transport/${operatorId}/team`, {
                phone: telephone.trim(),
                role,
                ...(role === "agent" ? { station_id: gare } : {}),
            });
            if (data.success) { toast.success("Membre ajouté"); setTelephone(""); charger(); }
            else toast.error(data.message || "Ajout refusé");
        } catch {
            toast.error("Connexion au serveur impossible");
        } finally {
            setEnvoi(false);
        }
    };

    const retirer = async (m: Membre) => {
        const nom = [m.nom, m.prenom].filter(Boolean).join(" ") || m.telephone || "ce membre";
        const choix = await Swal.fire({
            title: `Retirer ${nom} ?`,
            text: "Il n'aura plus accès à cet espace. Vous pourrez l'inviter de nouveau.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Retirer",
            cancelButtonText: "Annuler",
            confirmButtonColor: "#be123c",
        });
        if (!choix.isConfirmed) return;
        try {
            const { data } = await new ApiService().postData(`v3/transport/${operatorId}/team/remove`, { user_id: m.user_id });
            if (data.success) { toast.success("Membre retiré"); charger(); }
            else toast.error(data.message || "Action refusée");
        } catch {
            toast.error("Connexion au serveur impossible");
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {espace.can_manage && (
                <form onSubmit={inviter} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1.5 flex-1 min-w-[200px]"><span className={etiquette}>Numéro de téléphone</span>
                        <Input required value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="6XX XX XX XX" />
                    </label>
                    <label className="flex flex-col gap-1.5 min-w-[180px]"><span className={etiquette}>Rôle</span>
                        <Select value={role} onChange={(e) => setRole(e.target.value as "agent" | "manager")}>
                            <option value="agent">Agent de gare</option>
                            {nommeResponsables && <option value="manager">Responsable du réseau</option>}
                        </Select>
                    </label>
                    {role === "agent" && (
                        <label className="flex flex-col gap-1.5 min-w-[200px]"><span className={etiquette}>Sa gare</span>
                            <Select value={gare} onChange={(e) => setGare(Number(e.target.value))}>
                                {espace.stations.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </Select>
                        </label>
                    )}
                    <Button type="submit" variant="primary" disabled={envoi}>{envoi ? "Ajout…" : "Ajouter"}</Button>
                    <p className="w-full text-[11px] text-slate-400">La personne doit déjà avoir un compte Ongo. Un agent ne voit et ne ferme que les départs de sa gare.</p>
                </form>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[560px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <th className={entete}>Membre</th><th className={entete}>Rôle</th><th className={entete}>Gare</th><th className={`${entete} text-right`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {chargement ? (
                                <tr><td colSpan={4} className="py-10"><Loading /></td></tr>
                            ) : membres.map((m) => {
                                const nom = [m.nom, m.prenom].filter(Boolean).join(" ") || "Sans nom";
                                const retirable = espace.can_manage && m.role !== "owner" && m.user_id !== moi && (m.role !== "manager" || nommeResponsables);
                                return (
                                    <tr key={m.user_id}>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-3">
                                                <span className="size-9 shrink-0 rounded-full overflow-hidden"><Avatar photo={m.photo} nom={nom} className="size-9 rounded-full text-sm" /></span>
                                                <span className="flex flex-col">
                                                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{nom}{m.user_id === moi && <span className="ml-2 text-[10px] font-black uppercase text-slate-400">vous</span>}</span>
                                                    <span className="text-[11px] text-slate-500 font-mono">{m.telephone}</span>
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-sm">{ROLES[m.role]}</td>
                                        <td className="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300">{m.station_name ?? "Tout le réseau"}</td>
                                        <td className="px-4 py-2.5 text-right">
                                            {retirable && <Button size="sm" variant="danger" onClick={() => retirer(m)}>Retirer</Button>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
