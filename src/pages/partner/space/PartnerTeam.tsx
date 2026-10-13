import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import ApiService from "../../../services/ApiService";
import Loading from "../../../components/Loading";
import { Button, Input, Select, ActionsMenu, type ActionItem } from "../../../components/ui";

interface Props {
    partnerId: string;
    /** Le rôle de celui qui regarde : seul `owner` (ou un admin) peut gérer. */
    role: string;
}

const entete = "px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500";

const ROLES: Record<string, string> = { owner: "Propriétaire", staff: "Équipe" };

const date = (v?: string | null): string => {
    if (!v) return "—";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};

/**
 * L'équipe d'un partenaire.
 *
 * Une flotte de trente véhicules ne se tient pas à une personne. Le
 * propriétaire délègue le suivi quotidien sans céder ses revenus : un membre
 * `staff` gère les chauffeurs et consulte les courses, mais ne voit nulle
 * part ce que le partenariat rapporte.
 *
 * On invite un compte **existant**, par son numéro. Ouvrir la création ici
 * donnerait à un partenaire le moyen de peupler la plateforme de comptes
 * qu'Ongo n'a jamais vus — un chauffeur se crée, un collègue s'invite.
 */
const PartnerTeam: React.FC<Props> = ({ partnerId, role }) => {
    const api = new ApiService();

    const [membres, setMembres] = useState<any[]>([]);
    const [moi, setMoi] = useState<number>(0);
    const [chargement, setChargement] = useState(true);
    const [ajout, setAjout] = useState(false);
    const [telephone, setTelephone] = useState("");
    const [roleNouveau, setRoleNouveau] = useState("staff");
    const [envoi, setEnvoi] = useState(false);

    const peutGerer = role === "owner" || role === "admin";

    const charger = async () => {
        setChargement(true);
        try {
            const { data } = await api.getData(`v3/partner/${partnerId}/team`);
            if (data.success) {
                setMembres(data.data?.members ?? []);
                setMoi(Number(data.data?.me ?? 0));
            } else {
                toast.error(data.message || "Chargement impossible");
            }
        } catch (e: any) {
            toast.error(e?.response?.status === 403 ? "Accès refusé" : "Connexion au serveur impossible");
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => { charger(); }, [partnerId]);

    const inviter = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!telephone.trim()) { toast.error("Entrez un numéro"); return; }

        setEnvoi(true);
        try {
            const { data } = await api.postData(`v3/partner/${partnerId}/team`, {
                phone: telephone.trim(),
                role: roleNouveau,
            });
            if (data.success) {
                toast.success("Membre ajouté");
                setAjout(false);
                setTelephone("");
                setRoleNouveau("staff");
                charger();
            } else {
                toast.error(data.message || "Ajout refusé");
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Connexion au serveur impossible");
        } finally {
            setEnvoi(false);
        }
    };

    const retirer = async (m: any) => {
        const nom = `${m.prenom ?? ""} ${m.nom ?? ""}`.trim() || m.telephone;
        const confirmation = await Swal.fire({
            icon: "warning",
            title: "Retirer ce membre ?",
            html: `<p style="font-size:14px">${nom} perdra l'accès à cet espace.</p>
                   <p style="font-size:13px;color:#64748b;margin-top:8px">Son compte Ongo n'est pas supprimé. Vous pourrez le réinviter plus tard.</p>`,
            showCancelButton: true,
            confirmButtonText: "Retirer",
            cancelButtonText: "Annuler",
            confirmButtonColor: "#e11d48",
        });
        if (!confirmation.isConfirmed) return;

        try {
            const { data } = await api.postData(`v3/partner/${partnerId}/team/remove`, { user_id: m.user_id });
            if (data.success) { toast.success("Membre retiré"); charger(); }
            else toast.error(data.message || "Action refusée");
        } catch {
            toast.error("Connexion au serveur impossible");
        }
    };

    const actions = (m: any): ActionItem[] => [
        { label: "Retirer de l'équipe", icon: "person_remove", danger: true, onClick: () => retirer(m) },
    ];

    return (
        <div className="flex flex-col gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
                <div className="mr-auto">
                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Équipe</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Un membre « Équipe » gère les chauffeurs sans voir la commission.
                    </p>
                </div>
                {peutGerer && !ajout && (
                    <Button variant="primary" icon="person_add" onClick={() => setAjout(true)}>Inviter</Button>
                )}
            </div>

            {ajout && (
                <form onSubmit={inviter} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1.5 flex-1 min-w-[220px]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Numéro de téléphone</span>
                        <Input
                            value={telephone}
                            onChange={(e) => setTelephone(e.target.value)}
                            placeholder="6XX XX XX XX"
                            inputMode="tel"
                            autoFocus
                        />
                    </label>
                    <Select value={roleNouveau} onChange={(e) => setRoleNouveau(e.target.value)}>
                        <option value="staff">Équipe</option>
                        <option value="owner">Propriétaire</option>
                    </Select>
                    <Button type="submit" variant="primary" icon="check" loading={envoi}>Ajouter</Button>
                    <Button type="button" variant="ghost" onClick={() => setAjout(false)} disabled={envoi}>Annuler</Button>
                    {/* La personne doit déjà avoir un compte Ongo : on invite, on ne crée pas. */}
                    <p className="w-full text-[11px] text-slate-400">
                        La personne doit déjà avoir un compte Ongo. Sinon, qu'elle s'inscrive depuis l'application.
                    </p>
                </form>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[560px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <th className={entete}>Membre</th>
                                <th className={entete}>Rôle</th>
                                <th className={entete}>Depuis</th>
                                <th className={`${entete} text-right`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {chargement ? (
                                <tr><td colSpan={4} className="py-10"><Loading /></td></tr>
                            ) : membres.length === 0 ? (
                                <tr><td colSpan={4} className="py-12 text-center text-sm text-slate-500">Aucun membre.</td></tr>
                            ) : membres.map((m: any) => (
                                <tr key={m.user_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-4 py-2.5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                                                {[m.prenom, m.nom].filter(Boolean).join(" ") || "Sans nom"}
                                                {m.user_id === moi && <span className="ml-2 text-[10px] font-black uppercase text-slate-400">vous</span>}
                                            </span>
                                            <span className="text-[11px] text-slate-500 font-mono leading-tight">{m.telephone}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${m.role === "owner"
                                            ? "bg-primary/10 text-primary"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                                            {ROLES[m.role] ?? m.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{date(m.created_at)}</td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex justify-end">
                                            {/* Le propriétaire du partenariat ne se retire pas :
                                                l'espace resterait sans titulaire. */}
                                            {peutGerer && m.user_id !== moi && m.role !== "owner" && (
                                                <ActionsMenu items={actions(m)} />
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PartnerTeam;
