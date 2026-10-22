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
    /** Ouvre le rapport de suivi du chauffeur. */
    onOuvrir?: (chauffeurId: number) => void;
}

const entete = "px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500";

const francs = (v: number | null | undefined): string =>
    v == null ? "—" : `${Number(v).toLocaleString("fr-FR")} FCFA`;

/** « il y a 12 min », « hier à 18:40 », « le 12/10 » : la dernière activité, lisible d'un coup d'œil. */
const ilYa = (iso?: string | null): string => {
    if (!iso) return "Jamais vu";
    const d = new Date(iso);
    const minutes = Math.round((Date.now() - d.getTime()) / 60000);
    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (minutes < 24 * 60) return `Il y a ${Math.round(minutes / 60)} h`;
    const hier = new Date(); hier.setDate(hier.getDate() - 1);
    const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    if (d.toDateString() === hier.toDateString()) return `Hier à ${heure}`;
    return `Le ${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: d.getFullYear() === new Date().getFullYear() ? undefined : "2-digit" })}`;
};

/** En service ou non, tel que le serveur le déduit de l'application du chauffeur. */
const SERVICE: Record<string, { libelle: string; classe: string; point: string; aide: string }> = {
    en_course: { libelle: "En course", classe: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300", point: "bg-sky-500", aide: "En ligne et en train de faire une course." },
    en_service: { libelle: "En service", classe: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400", point: "bg-emerald-500 animate-pulse", aide: "En ligne et disponible pour des courses." },
    hors_service: { libelle: "Hors service", classe: "bg-slate-100 text-slate-500 dark:bg-slate-800", point: "bg-slate-400", aide: "Hors ligne dans l'application." },
};

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
const PartnerDrivers: React.FC<Props> = ({ partnerId, actif, onChange, onOuvrir }) => {
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
        ...(onOuvrir ? [{ label: "Voir son rapport", icon: "monitoring", onClick: () => onOuvrir(c.id) }] : []),
        {
            separatorBefore: Boolean(onOuvrir),
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
                    <table className="w-full text-left border-collapse min-w-[980px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <th className={entete}>Chauffeur</th>
                                <th className={entete}>Véhicule</th>
                                <th className={entete}>En service</th>
                                <th className={entete}>Rattachement</th>
                                <th className={`${entete} text-right`}>Courses</th>
                                <th className={`${entete} text-right`}>Chiffre d'affaires</th>
                                <th className={entete}>Rattaché le</th>
                                <th className={`${entete} text-right`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {chargement ? (
                                <tr><td colSpan={8} className="py-10"><Loading /></td></tr>
                            ) : lignes.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-sm text-slate-500">
                                        {recherche || filtre ? "Aucun chauffeur ne correspond." : "Aucun chauffeur rattaché pour l'instant."}
                                    </td>
                                </tr>
                            ) : lignes.map((c: any) => (
                                <tr
                                    key={c.id}
                                    onClick={() => onOuvrir?.(c.id)}
                                    title="Voir son rapport d'activité"
                                    className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors ${onOuvrir ? "cursor-pointer" : ""}`}
                                >
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
                                    <td className="px-4 py-2.5" title={(SERVICE[c.service] ?? SERVICE.hors_service).aide}>
                                        <div className="flex flex-col gap-0.5">
                                            <span className={`inline-flex w-fit items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${(SERVICE[c.service] ?? SERVICE.hors_service).classe}`}>
                                                <span className={`size-1.5 rounded-full ${(SERVICE[c.service] ?? SERVICE.hors_service).point}`} />
                                                {(SERVICE[c.service] ?? SERVICE.hors_service).libelle}
                                            </span>
                                            <span className="text-[11px] text-slate-500 whitespace-nowrap" title={c.derniere_activite ? new Date(c.derniere_activite).toLocaleString("fr-FR") : undefined}>
                                                {ilYa(c.derniere_activite)}
                                            </span>
                                        </div>
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
                                    {/* Le menu ne doit pas ouvrir le rapport : ses clics remonteraient
                                        jusqu'à la ligne, portail compris. */}
                                    <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
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
