import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import ApiService from "../../../services/ApiService";
import { chargerCategories, estLivraison, type CategorieVehicule } from "../../../services/categories";
import Loading from "../../../components/Loading";
import { Button, Input, Select, ActionsMenu, type ActionItem } from "../../../components/ui";

interface Props {
    partnerId: string;
    /** Un partenariat suspendu interdit toute modification. */
    actif: boolean;
}

const entete = "px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500";

const STATUTS: Record<string, string> = {
    LIBRE: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400",
    OCCUPE: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400",
    INACTIVER: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400",
};

/**
 * La flotte du partenaire.
 *
 * `fleets` dit quel véhicule lui appartient — une question de patrimoine,
 * distincte de celle des chauffeurs. Un véhicule peut être à l'arrêt sans
 * conducteur, et un chauffeur peut changer de véhicule sans sortir de la
 * flotte : c'est pourquoi les deux onglets existent séparément.
 */
const PartnerFleet: React.FC<Props> = ({ partnerId, actif }) => {
    const api = new ApiService();

    const [lignes, setLignes] = useState<any[]>([]);
    const [pagination, setPagination] = useState<any[]>([]);
    const [chauffeurs, setChauffeurs] = useState<any[]>([]);
    const [chargement, setChargement] = useState(true);
    const [ajout, setAjout] = useState(false);

    const [matricule, setMatricule] = useState("");
    const [modele, setModele] = useState("");
    const [couleur, setCouleur] = useState("");
    const [categorie, setCategorie] = useState("1");
    const [conducteur, setConducteur] = useState("");
    const [envoi, setEnvoi] = useState(false);
    const [categories, setCategories] = useState<CategorieVehicule[]>([]);

    const charger = async (url?: string) => {
        setChargement(true);
        try {
            const { data } = url
                ? await api.getDatawithPagination(url, true)
                : await api.getData(`v3/partner/${partnerId}/vehicles`);

            if (data.success) {
                setLignes(data.data?.data ?? []);
                setPagination(data.data?.links ?? []);
            } else {
                toast.error(data.message || "Chargement impossible");
            }
        } catch (e: any) {
            toast.error(e?.response?.status === 403 ? "Accès refusé" : "Connexion au serveur impossible");
        } finally {
            setChargement(false);
        }
    };

    // Sert à remplir les listes de conducteurs ; son échec ne doit pas
    // empêcher de consulter la flotte.
    const chargerChauffeurs = async () => {
        try {
            const { data } = await api.getData(`v3/partner/${partnerId}/drivers`, { per_page: "all" });
            if (data.success) setChauffeurs(data.data?.data ?? []);
        } catch { /* les listes resteront vides */ }
    };

    useEffect(() => { charger(); chargerChauffeurs(); }, [partnerId]);

    useEffect(() => { chargerCategories().then(setCategories); }, []);

    const nomDe = (c: any) => [c.prenom, c.nom].filter(Boolean).join(" ") || c.telephone;

    const ajouter = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!matricule.trim()) { toast.error("Le matricule est obligatoire"); return; }

        setEnvoi(true);
        try {
            const { data } = await api.postData(`v3/partner/${partnerId}/vehicles`, {
                matricule: matricule.trim(),
                modele: modele.trim() || undefined,
                color: couleur.trim() || undefined,
                categorie_id: Number(categorie),
                chauffeur_id: conducteur ? Number(conducteur) : undefined,
            });

            if (data.success) {
                toast.success("Véhicule ajouté");
                setAjout(false);
                setMatricule(""); setModele(""); setCouleur(""); setConducteur(""); setCategorie("1");
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

    const changerConducteur = async (v: any) => {
        const options = chauffeurs
            .map((c: any) => `<option value="${c.id}" ${v.chauffeur?.id === c.id ? "selected" : ""}>${nomDe(c)}</option>`)
            .join("");

        const saisie = await Swal.fire({
            title: `Conducteur de ${v.matricule}`,
            html:
                `<p style="font-size:13px;color:#64748b;margin-bottom:10px">Choisissez parmi vos chauffeurs, ou libérez le véhicule.</p>` +
                `<select id="c" class="swal2-input"><option value="">— Aucun conducteur —</option>${options}</select>`,
            showCancelButton: true,
            confirmButtonText: "Enregistrer",
            cancelButtonText: "Annuler",
            preConfirm: () => ({ id: (document.getElementById("c") as HTMLSelectElement)?.value }),
        });

        if (!saisie.isConfirmed) return;

        try {
            const { data } = await api.postData(`v3/partner/${partnerId}/vehicles/${v.id}/driver`, {
                chauffeur_id: saisie.value?.id ? Number(saisie.value.id) : null,
            });
            if (data.success) { toast.success(data.message); charger(); }
            else toast.error(data.message || "Action refusée");
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Connexion au serveur impossible");
        }
    };

    /**
     * Les conducteurs d'un véhicule : qui est au volant, qui est autorisé,
     * et qui l'a conduit avant.
     *
     * Autoriser n'est pas mettre au volant. Deux chauffeurs autorisés sur une
     * même voiture se relaient sans que le partenaire ait à les déclarer à
     * chaque poste — c'est ce qui rend le travail en deux équipes tenable.
     */
    const gererConducteurs = async (v: any) => {
        let etat: any;

        try {
            const { data } = await api.getData(`v3/partner/${partnerId}/vehicles/${v.id}/drivers`);
            if (!data.success) { toast.error(data.message); return; }
            etat = data.data;
        } catch {
            toast.error("Connexion au serveur impossible");
            return;
        }

        const autorises: number[] = (etat.autorises || []).map((a: any) => a.id);

        const cases = chauffeurs.map((c: any) => `
            <label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:14px;text-align:left">
                <input type="checkbox" data-id="${c.id}" ${autorises.includes(c.id) ? "checked" : ""}>
                <span>${nomDe(c)}${etat.au_volant === c.id ? ' <b style="color:#00327d">· au volant</b>' : ""}</span>
            </label>`).join("");

        const journal = (etat.journal || []).slice(0, 8).map((j: any) => {
            const debut = new Date(j.started_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
            const fin = j.ended_at
                ? new Date(j.ended_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                : "en cours";
            return `<li style="font-size:12px;color:#64748b">${[j.prenom, j.nom].filter(Boolean).join(" ")} — ${debut} → ${fin}</li>`;
        }).join("");

        const saisie = await Swal.fire({
            title: `Conducteurs de ${v.matricule}`,
            width: 560,
            html:
                `<p style="font-size:13px;color:#64748b;text-align:left;margin-bottom:8px">Cochez qui a le droit de conduire ce véhicule.</p>` +
                `<div style="text-align:left;max-height:180px;overflow:auto">${cases || '<p style="font-size:13px;color:#94a3b8">Aucun chauffeur dans votre flotte.</p>'}</div>` +
                (journal
                    ? `<hr style="margin:14px 0;border:none;border-top:1px solid #e2e8f0">
                       <p style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;text-align:left">Derniers postes</p>
                       <ul style="text-align:left;margin:6px 0 0;padding-left:16px">${journal}</ul>`
                    : ""),
            showCancelButton: true,
            confirmButtonText: "Enregistrer",
            cancelButtonText: "Fermer",
            preConfirm: () => Array.from(document.querySelectorAll<HTMLInputElement>("input[data-id]"))
                .map((i) => ({ id: Number(i.dataset.id), coche: i.checked })),
        });

        if (!saisie.isConfirmed || !saisie.value) return;

        // Seules les cases qui ont change sont envoyees : reecrire les autres
        // ferait du bruit dans le journal pour rien.
        const aChanger = saisie.value.filter((c: any) => c.coche !== autorises.includes(c.id));

        if (aChanger.length === 0) { toast.info("Aucun changement"); return; }

        for (const c of aChanger) {
            try {
                const { data } = await api.postData(`v3/partner/${partnerId}/vehicles/${v.id}/drivers`, {
                    chauffeur_id: c.id,
                    autoriser: c.coche,
                });
                if (!data.success) toast.error(data.message);
            } catch {
                toast.error("Connexion au serveur impossible");
            }
        }

        toast.success("Autorisations mises à jour");
        charger();
    };

    /**
     * La gamme d'un véhicule : celle qu'il déclare, et celles qu'il accepte.
     *
     * Le partenaire déclare lui-même la gamme — il a la voiture sous les
     * yeux. Ongo contrôle ensuite, et une fois reclassé, le champ se ferme :
     * l'écran le dit explicitement plutôt que de griser sans expliquer.
     */
    const gererGammes = async (v: any) => {
        let etat: any;

        try {
            const { data } = await api.getData(`v3/partner/${partnerId}/vehicles/${v.id}/categories`);
            if (!data.success) { toast.error(data.message); return; }
            etat = data.data;
        } catch {
            toast.error("Connexion au serveur impossible");
            return;
        }

        const verrouille = Boolean(etat.classement_verrouille);
        const actuelle = etat.categorie_validee?.id;

        const options = (etat.gammes_declarables || [])
            .map((c: any) => `<option value="${c.id}" ${c.id === actuelle ? "selected" : ""}>${c.libelle}${c.is_delivery ? " — livraison" : ""}</option>`)
            .join("");

        const sousGammes = (etat.gammes_ouvertes || [])
            .map((g: any) => `
                <label style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:14px;text-align:left">
                    <input type="checkbox" data-g="${g.id}" ${g.active ? "checked" : ""}>
                    <span>${g.libelle}</span>
                </label>`)
            .join("");

        const saisie = await Swal.fire({
            title: `Gamme de ${v.matricule}`,
            width: 540,
            html:
                (verrouille
                    ? `<div style="text-align:left;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 12px;margin-bottom:12px">
                         <p style="font-size:13px;color:#b45309;font-weight:600;margin:0">
                           Ce véhicule a été <b>reclassé par Ongo</b>. Sa gamme ne peut plus être modifiée depuis votre espace — contactez Ongo si vous contestez.
                         </p>
                       </div>`
                    : `<p style="font-size:13px;color:#64748b;text-align:left;margin-bottom:8px">Déclarez la gamme de ce véhicule. Ongo la contrôlera.</p>`) +
                `<p style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;text-align:left">Gamme</p>` +
                (verrouille
                    ? `<p style="font-size:16px;font-weight:800;color:#00327d;text-align:left;margin:4px 0 12px">${etat.categorie_validee?.libelle ?? "—"}</p>`
                    : `<select id="gamme" class="swal2-input" style="margin:4px 0 12px">${options}</select>`) +
                (sousGammes
                    ? `<p style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;text-align:left">Accepte aussi</p>
                       <div style="text-align:left">${sousGammes}</div>
                       <p style="font-size:12px;color:#94a3b8;text-align:left;margin-top:6px">Uniquement les gammes inférieures. Une gamme supérieure n'est jamais proposée.</p>`
                    : `<p style="font-size:12px;color:#94a3b8;text-align:left">Aucune gamme inférieure n'est ouverte à ce véhicule.</p>`),
            showCancelButton: true,
            confirmButtonText: "Enregistrer",
            cancelButtonText: "Fermer",
            preConfirm: () => ({
                gamme: verrouille ? null : (document.getElementById("gamme") as HTMLSelectElement)?.value,
                sous: Array.from(document.querySelectorAll<HTMLInputElement>("input[data-g]"))
                    .filter((i) => i.checked)
                    .map((i) => Number(i.dataset.g)),
            }),
        });

        if (!saisie.isConfirmed || !saisie.value) return;

        // La gamme d'abord : elle décide des sous-gammes recevables, et
        // l'ordre inverse ferait refuser des sous-gammes devenues valides.
        if (saisie.value.gamme && Number(saisie.value.gamme) !== actuelle) {
            try {
                const { data } = await api.postData(`v3/partner/${partnerId}/vehicles/${v.id}/category`, {
                    categorie_id: Number(saisie.value.gamme),
                });
                if (!data.success) { toast.error(data.message); return; }
                if (data.message?.includes("retirees")) toast.info(data.message);
            } catch {
                toast.error("Connexion au serveur impossible");
                return;
            }
        }

        try {
            const { data } = await api.postData(`v3/partner/${partnerId}/vehicles/${v.id}/categories`, {
                categories: saisie.value.sous,
            });
            if (data.success) toast.success("Gammes mises à jour");
            else toast.error(data.message);
        } catch {
            toast.error("Connexion au serveur impossible");
        }

        charger();
    };

    const retirer = async (v: any) => {
        const confirmation = await Swal.fire({
            icon: "warning",
            title: "Retirer ce véhicule ?",
            html: `<p style="font-size:14px">${v.matricule} sortira de votre flotte.</p>
                   <p style="font-size:13px;color:#64748b;margin-top:8px">Le véhicule n'est pas supprimé — ses courses passées sont conservées — mais son conducteur est retiré et il cessera de rouler pour vous.</p>`,
            showCancelButton: true,
            confirmButtonText: "Retirer",
            cancelButtonText: "Annuler",
            confirmButtonColor: "#e11d48",
        });
        if (!confirmation.isConfirmed) return;

        try {
            const { data } = await api.postData(`v3/partner/${partnerId}/vehicles/${v.id}/remove`, {});
            if (data.success) { toast.success("Véhicule retiré"); charger(); }
            else toast.error(data.message || "Action refusée");
        } catch {
            toast.error("Connexion au serveur impossible");
        }
    };

    const actions = (v: any): ActionItem[] => [
        {
            label: v.chauffeur ? "Changer de conducteur" : "Affecter un conducteur",
            icon: "person_search",
            disabled: !actif,
            onClick: () => changerConducteur(v),
        },
        {
            label: "Gamme et équivalences",
            icon: "workspace_premium",
            onClick: () => gererGammes(v),
        },
        {
            label: "Conducteurs autorisés",
            icon: "group",
            onClick: () => gererConducteurs(v),
        },
        {
            label: "Retirer de la flotte",
            icon: "no_crash",
            danger: true,
            disabled: !actif,
            separatorBefore: true,
            onClick: () => retirer(v),
        },
    ];

    return (
        <div className="flex flex-col gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-3">
                <div className="mr-auto">
                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Flotte</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Vos véhicules. Plusieurs chauffeurs peuvent être autorisés sur un même véhicule et se relayer.
                    </p>
                </div>
                {!ajout && (
                    <Button variant="primary" icon="add" disabled={!actif} title={actif ? undefined : "Partenariat suspendu"} onClick={() => setAjout(true)}>
                        Ajouter un véhicule
                    </Button>
                )}
            </div>

            {ajout && (
                <form onSubmit={ajouter} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1.5 min-w-[160px]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Matricule *</span>
                        <Input value={matricule} onChange={(e) => setMatricule(e.target.value)} placeholder="LT 1234 AB" autoFocus />
                    </label>
                    <label className="flex flex-col gap-1.5 min-w-[140px]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Modèle</span>
                        <Input value={modele} onChange={(e) => setModele(e.target.value)} placeholder="Yaris" />
                    </label>
                    <label className="flex flex-col gap-1.5 min-w-[120px]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Couleur</span>
                        <Input value={couleur} onChange={(e) => setCouleur(e.target.value)} placeholder="Gris" />
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Catégorie</span>
                        <Select value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.libelle}{estLivraison(c) ? " — livraison" : ""}
                                </option>
                            ))}
                        </Select>
                    </label>
                    <Select value={conducteur} onChange={(e) => setConducteur(e.target.value)}>
                        <option value="">Sans conducteur</option>
                        {chauffeurs.map((c: any) => <option key={c.id} value={c.id}>{nomDe(c)}</option>)}
                    </Select>
                    <Button type="submit" variant="primary" icon="check" loading={envoi}>Ajouter</Button>
                    <Button type="button" variant="ghost" onClick={() => setAjout(false)} disabled={envoi}>Annuler</Button>

                    {/* MOTO, TRICYCLE et FOURGON ne prennent pas de passagers.
                        Sans ce mot, le partenaire attendrait des courses qui
                        ne viendront jamais, et chercherait la panne ailleurs. */}
                    {estLivraison(categories.find((c) => String(c.id) === categorie)) && (
                        <div className="w-full flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            <span className="material-symbols-outlined text-[20px] shrink-0">local_shipping</span>
                            <p className="text-xs font-semibold leading-relaxed">
                                Catégorie de <strong>livraison</strong> : ce véhicule recevra des livraisons, pas de courses de passagers.
                                Aucune gamme supplémentaire ne lui est ouverte.
                            </p>
                        </div>
                    )}
                </form>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[780px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                <th className={entete}>Véhicule</th>
                                <th className={entete}>Catégorie</th>
                                <th className={entete}>Conducteur</th>
                                <th className={entete}>Statut</th>
                                <th className={`${entete} text-right`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {chargement ? (
                                <tr><td colSpan={5} className="py-10"><Loading /></td></tr>
                            ) : lignes.length === 0 ? (
                                <tr><td colSpan={5} className="py-12 text-center text-sm text-slate-500">Aucun véhicule dans votre flotte.</td></tr>
                            ) : lignes.map((v: any) => (
                                <tr key={v.fleet_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-4 py-2.5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{v.matricule}</span>
                                            <span className="text-[11px] text-slate-500 leading-tight">
                                                {v.modele || "—"}{v.couleur ? ` · ${v.couleur}` : ""}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex flex-col items-start gap-1">
                                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary">
                                                {v.categorie || "—"}
                                            </span>
                                            {/* La catégorie est rendue par son libellé seul : on
                                                la retrouve dans la liste chargée pour savoir si
                                                c'est une catégorie de livraison. */}
                                            {estLivraison(categories.find((c) => c.libelle === v.categorie)) && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                    <span className="material-symbols-outlined text-[13px]">local_shipping</span>
                                                    Livraison
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {v.chauffeur ? (
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{v.chauffeur.nom}</span>
                                                <span className="text-[11px] text-slate-500 font-mono leading-tight">{v.chauffeur.telephone}</span>
                                            </div>
                                        ) : <span className="text-xs text-slate-400 italic">Aucun</span>}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUTS[v.statut] ?? "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                                            <span className={`size-1.5 rounded-full ${v.en_ligne ? "bg-current" : "bg-current opacity-25"}`} />
                                            {v.statut || "—"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex justify-end"><ActionsMenu items={actions(v)} /></div>
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
        </div>
    );
};

export default PartnerFleet;
