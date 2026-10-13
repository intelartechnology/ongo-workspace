import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import ApiService from "../../../services/ApiService";
import Loading from "../../../components/Loading";
import { SearchBar, Button, Select, ActionsMenu, type ActionItem, Avatar } from "../../../components/ui";
import AddDriverModal from "./AddDriverModal";

interface Props {
    partnerId: string;
    /** Un partenariat suspendu interdit l'ajout et l'activation. */
    actif: boolean;
    onChange: () => void;
}

const entete = "px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500";

const francs = (v: number | null | undefined): string =>
    v == null ? "—" : `${Number(v).toLocaleString("fr-FR")} FCFA`;

const date = (v?: string | null): string => {
    if (!v) return "—";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};

/**
 * Les chauffeurs d'un partenaire.
 *
 * C'est le seul écran où un partenaire agit sur des comptes : il peut en
 * créer, les activer, les suspendre, les détacher. Toutes ces actions passent
 * par des routes préfixées de son identifiant — le serveur doit vérifier
 * qu'il n'agit que sur les siens, le front ne peut pas le garantir.
 */
const PartnerDrivers: React.FC<Props> = ({ partnerId, actif, onChange }) => {
    const api = new ApiService();

    const [lignes, setLignes] = useState<any[]>([]);
    const [pagination, setPagination] = useState<any[]>([]);
    const [chargement, setChargement] = useState(true);
    const [recherche, setRecherche] = useState("");
    const [filtre, setFiltre] = useState("");
    const [ajout, setAjout] = useState(false);

    const charger = async (url?: string) => {
        setChargement(true);
        try {
            const { data } = url
                ? await api.getDatawithPagination(url, true)
                : await api.getData(`v3/partner/${partnerId}/drivers`, {
                    ...(recherche ? { q: recherche } : {}),
                    ...(filtre ? { statut: filtre } : {}),
                });

            if (data.success) {
                setLignes(data.data?.data ?? []);
                setPagination(data.data?.links ?? []);
            } else {
                toast.error(data.message || "Chargement impossible");
            }
        } catch (e: any) {
            toast.error(e?.response?.status === 403
                ? "Vous n'avez pas accès à ces chauffeurs."
                : "Connexion au serveur impossible");
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => { charger(); }, [partnerId, filtre]);

    const basculer = async (chauffeur: any) => {
        const activer = !chauffeur.is_active;
        const confirmation = await Swal.fire({
            icon: "question",
            title: activer ? "Activer ce chauffeur ?" : "Désactiver ce chauffeur ?",
            text: activer
                ? `${chauffeur.prenom ?? ""} ${chauffeur.nom ?? ""} pourra de nouveau recevoir des courses.`
                : `${chauffeur.prenom ?? ""} ${chauffeur.nom ?? ""} ne recevra plus de courses. Ses courses en cours ne sont pas interrompues.`,
            showCancelButton: true,
            confirmButtonText: activer ? "Activer" : "Désactiver",
            cancelButtonText: "Annuler",
        });
        if (!confirmation.isConfirmed) return;

        try {
            const { data } = await api.postData(`v3/partner/${partnerId}/drivers/${chauffeur.id}/toggle`, {});
            if (data.success) {
                toast.success(activer ? "Chauffeur activé" : "Chauffeur désactivé");
                charger();
                onChange();
            } else {
                toast.error(data.message || "Action refusée");
            }
        } catch {
            toast.error("Connexion au serveur impossible");
        }
    };

    const detacher = async (chauffeur: any) => {
        const nom = `${chauffeur.prenom ?? ""} ${chauffeur.nom ?? ""}`.trim();
        const confirmation = await Swal.fire({
            icon: "warning",
            title: "Détacher ce chauffeur ?",
            html: `<p style="font-size:14px">${nom} ne fera plus partie de votre flotte.</p>
                   <p style="font-size:13px;color:#64748b;margin-top:8px">Son compte n'est pas supprimé et ses courses passées vous restent acquises. Vous ne toucherez plus de commission sur ses courses à venir.</p>`,
            showCancelButton: true,
            confirmButtonText: "Détacher",
            cancelButtonText: "Annuler",
            confirmButtonColor: "#e11d48",
        });
        if (!confirmation.isConfirmed) return;

        try {
            const { data } = await api.postData(`v3/partner/${partnerId}/drivers/${chauffeur.id}/remove`, {});
            if (data.success) {
                toast.success("Chauffeur détaché");
                charger();
                onChange();
            } else {
                toast.error(data.message || "Action refusée");
            }
        } catch {
            toast.error("Connexion au serveur impossible");
        }
    };

    const actions = (c: any): ActionItem[] => [
        {
            label: c.is_active ? "Désactiver" : "Activer",
            icon: c.is_active ? "toggle_off" : "toggle_on",
            disabled: !actif,
            onClick: () => basculer(c),
        },
        {
            label: "Détacher",
            icon: "link_off",
            danger: true,
            separatorBefore: true,
            onClick: () => detacher(c),
        },
    ];

    return (
        <div className="flex flex-col gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
                <SearchBar
                    value={recherche}
                    onChange={setRecherche}
                    onSearch={() => charger()}
                    placeholder="Rechercher un chauffeur…"
                />
                <Select value={filtre} onChange={(e) => setFiltre(e.target.value)}>
                    <option value="">Tous</option>
                    <option value="actif">Actifs</option>
                    <option value="inactif">Inactifs</option>
                </Select>
                <Button
                    variant="primary"
                    icon="person_add"
                    disabled={!actif}
                    title={actif ? undefined : "Partenariat suspendu"}
                    onClick={() => setAjout(true)}
                >
                    Ajouter
                </Button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[860px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <th className={entete}>Chauffeur</th>
                                <th className={entete}>Véhicule</th>
                                <th className={entete}>Statut</th>
                                <th className={`${entete} text-right`}>Courses</th>
                                <th className={`${entete} text-right`}>Chiffre d'affaires</th>
                                <th className={entete}>Rattaché le</th>
                                <th className={`${entete} text-right`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {chargement ? (
                                <tr><td colSpan={7} className="py-10"><Loading /></td></tr>
                            ) : lignes.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-sm text-slate-500">
                                        {recherche || filtre ? "Aucun chauffeur ne correspond." : "Aucun chauffeur rattaché pour l'instant."}
                                    </td>
                                </tr>
                            ) : lignes.map((c: any) => (
                                <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-3">
                                            <div className="size-9 shrink-0 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                <Avatar photo={c?.photo} nom={c?.nom || c?.prenom} className="text-base" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-semibold text-slate-900 dark:text-white truncate leading-tight">
                                                    {[c.prenom, c.nom].filter(Boolean).join(" ") || "Sans nom"}
                                                </span>
                                                <span className="text-[11px] text-slate-500 font-mono leading-tight">{c.telephone || "—"}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {c.vehicule ? (
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-tight">{c.vehicule.matricule}</span>
                                                <span className="text-[11px] text-slate-500 leading-tight">
                                                    {c.vehicule.modele}{c.vehicule.categorie ? ` · ${c.vehicule.categorie}` : ""}
                                                </span>
                                            </div>
                                        ) : <span className="text-xs text-slate-400 italic">Aucun</span>}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${c.is_active
 ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                                            <span className={`size-1.5 rounded-full ${c.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                                            {c.is_active ? "Actif" : "Inactif"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-700 dark:text-slate-300">
                                        {c.stats?.courses_total?.toLocaleString("fr-FR") ?? "—"}
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-sm font-bold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                                        {francs(c.stats?.revenue_total)}
                                    </td>
                                    <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{date(c.created_at)}</td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex justify-end">
                                            <ActionsMenu items={actions(c)} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {pagination.length > 0 && (
                    <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-1 justify-end">
                        {pagination.map((lien: any, i: number) => (
                            <button
                                key={i}
                                disabled={!lien.url || lien.active}
                                onClick={() => lien.url && charger(lien.url)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium ${lien.active
 ? "bg-primary text-white font-bold"
                                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"} ${!lien.url ? "opacity-50 cursor-not-allowed" : ""}`}
                                dangerouslySetInnerHTML={{ __html: lien.label }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <AddDriverModal
                partnerId={partnerId}
                open={ajout}
                onClose={() => setAjout(false)}
                onAdded={() => { charger(); onChange(); }}
            />
        </div>
    );
};

export default PartnerDrivers;
