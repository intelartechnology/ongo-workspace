import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ApiService from "../../services/ApiService";
import Loading from "../../components/Loading";
import { Button, Input } from "../../components/ui";

interface VehicleEditModalProps {
    /** L'identifiant du véhicule à éditer, ou `null` pour garder la modale fermée. */
    vehicleId: number | string | null;
    onClose: () => void;
    /** Appelé après un enregistrement réussi, pour rafraîchir la liste derrière. */
    onSaved?: () => void;
}

/**
 * L'édition d'un véhicule, en modale.
 *
 * Elle occupait une page entière, atteinte par un changement de route : on
 * perdait la liste, sa pagination et ses filtres pour changer une couleur, et
 * revenir demandait de refaire le chemin. La modale garde la liste derrière.
 *
 * Elle charge tout depuis l'API. La page lisait le véhicule dans
 * `sessionStorage`, ce qui la rendait inutilisable en accès direct ou après
 * un rafraîchissement — elle affichait alors « Données introuvables » en
 * parlant d'un véhicule qui existait.
 */
const VehicleEditModal: React.FC<VehicleEditModalProps> = ({ vehicleId, onClose, onSaved }) => {
    const api = new ApiService();

    const [chargement, setChargement] = useState(true);
    const [envoi, setEnvoi] = useState(false);
    const [erreur, setErreur] = useState<string | null>(null);

    const [matricule, setMatricule] = useState("");
    const [modele, setModele] = useState("");
    const [couleur, setCouleur] = useState("");
    const [ville, setVille] = useState("");
    const [chauffeurId, setChauffeurId] = useState<number | null>(null);

    const [classement, setClassement] = useState<any>(null);
    const [gamme, setGamme] = useState("");
    const [sousGammes, setSousGammes] = useState<number[]>([]);

    const ouvert = vehicleId !== null;

    const charger = async () => {
        if (!ouvert) return;
        setChargement(true);
        setErreur(null);

        try {
            // Deux appels, parce que ce sont deux questions : ce que le
            // véhicule est, et comment il est classé.
            const [detail, cls] = await Promise.all([
                api.getData(`vehicule/details?id=${vehicleId}`),
                api.getData(`dashboard/vehicles/${vehicleId}/categories`),
            ]);

            if (!detail.data?.success) { setErreur(detail.data?.message || "Véhicule introuvable"); return; }

            const v = detail.data.data.vehicule;
            setMatricule(v.matricule ?? "");
            setModele(v.modele ?? "");
            setCouleur(v.color ?? "");
            setVille(v.ville ?? "");
            setChauffeurId(v.chauffeur_id ?? null);

            if (cls.data?.success) {
                setClassement(cls.data.data);
                setGamme(String(cls.data.data.categorie?.id ?? ""));
                setSousGammes(
                    (cls.data.data.gammes_ouvertes ?? []).filter((g: any) => g.active).map((g: any) => g.id),
                );
            }
        } catch {
            setErreur("Connexion au serveur impossible");
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => { charger(); }, [vehicleId]);

    useEffect(() => {
        if (!ouvert) return;
        const auClavier = (e: KeyboardEvent) => { if (e.key === "Escape" && !envoi) onClose(); };
        window.addEventListener("keydown", auClavier);
        return () => window.removeEventListener("keydown", auClavier);
    }, [ouvert, envoi, onClose]);

    const basculer = (id: number) =>
        setSousGammes((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

    const gammeChoisie = (classement?.catalogue ?? []).find((c: any) => String(c.id) === gamme);
    const gammeActuelle = String(classement?.categorie?.id ?? "");

    const enregistrer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!matricule.trim()) { toast.error("Le matricule est obligatoire"); return; }

        setEnvoi(true);
        try {
            // 1. Les informations. `categorie_id` n'y figure pas : la gamme
            //    passe par `reclass`, qui seul pose le verrou.
            const { data } = await api.postData("vehicule/modifier", {
                vehicule_id: vehicleId,
                matricule: matricule.trim(),
                modele: modele.trim(),
                color: couleur.trim(),
                ville: ville.trim(),
                chauffeur_id: chauffeurId,
            });

            if (!data.success) { toast.error(data.message || "Une erreur s'est produite"); return; }

            // 2. La gamme, si elle a changé. Avant les sous-gammes : c'est
            //    elle qui décide de ce qui est recevable.
            if (gamme && gamme !== gammeActuelle) {
                const { data: r } = await api.postData(`dashboard/vehicles/${vehicleId}/reclass`, {
                    categorie_id: Number(gamme),
                });
                if (!r.success) { toast.error(r.message || "Reclassement refusé"); return; }
                toast.info(r.message);
            }

            // 3. Les gammes acceptées en plus.
            const { data: g } = await api.postData(`dashboard/vehicles/${vehicleId}/categories`, {
                categories: sousGammes,
            });
            if (!g.success) { toast.error(g.message || "Gammes refusées"); return; }

            toast.success("Véhicule mis à jour");

            // On reste ouvert : un reclassement change les gammes
            // disponibles, et il faut pouvoir cocher les nouvelles sans
            // rouvrir la modale.
            await charger();
            onSaved?.();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Connexion au serveur impossible");
        } finally {
            setEnvoi(false);
        }
    };

    if (!ouvert) return null;

    const champ = "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !envoi) onClose(); }}
        >
            <form
                onSubmit={enregistrer}
                role="dialog"
                aria-modal="true"
                aria-label="Modifier le véhicule"
                className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col"
            >
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                    <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                        {matricule ? `Véhicule ${matricule}` : "Modifier le véhicule"}
                    </h3>
                    <Button type="button" variant="ghost" size="sm" icon="close" aria-label="Fermer" onClick={onClose} disabled={envoi} />
                </div>

                <div className="px-6 py-5 overflow-y-auto flex flex-col gap-6">
                    {chargement ? (
                        <Loading />
                    ) : erreur ? (
                        <div className="py-10 flex flex-col items-center gap-3 text-center">
                            <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700">search_off</span>
                            <p className="text-sm text-slate-500">{erreur}</p>
                            <Button type="button" icon="refresh" onClick={charger}>Réessayer</Button>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Matricule *</span>
                                    <Input value={matricule} onChange={(e) => setMatricule(e.target.value)} />
                                </label>
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Modèle</span>
                                    <Input value={modele} onChange={(e) => setModele(e.target.value)} />
                                </label>
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Couleur</span>
                                    <Input value={couleur} onChange={(e) => setCouleur(e.target.value)} />
                                </label>
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ville</span>
                                    <Input value={ville} onChange={(e) => setVille(e.target.value)} />
                                </label>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-800 pt-5 flex flex-col gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[20px]">workspace_premium</span>
                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Classement</h4>
                                </div>

                                <label className="flex flex-col gap-1.5 max-w-xs">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Catégorie du véhicule</span>
                                    <select
                                        value={gamme}
                                        onChange={(e) => { setGamme(e.target.value); setSousGammes([]); }}
                                        className={champ}
                                    >
                                        {(classement?.catalogue ?? []).map((c: any) => (
                                            <option key={c.id} value={c.id}>
                                                {c.libelle}{c.is_delivery ? " — livraison" : ""}
                                            </option>
                                        ))}
                                    </select>

                                    {classement?.verrouille && (
                                        <span className="text-xs text-slate-500 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[14px]">lock</span>
                                            Reclassé par Ongo
                                            {classement.verrouille_le ? ` le ${new Date(classement.verrouille_le).toLocaleDateString("fr-FR")}` : ""}
                                            {" "}— le partenaire ne peut plus la modifier.
                                        </span>
                                    )}

                                    {gamme !== gammeActuelle && (
                                        <span className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                                            <span className="material-symbols-outlined text-[14px] mt-0.5">info</span>
                                            Enregistrer reclassera ce véhicule et fermera la gamme au partenaire.
                                        </span>
                                    )}
                                </label>

                                {gammeChoisie?.is_delivery ? (
                                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                        <span className="material-symbols-outlined text-[20px] shrink-0">local_shipping</span>
                                        <p className="text-xs font-semibold leading-relaxed">
                                            Catégorie de <strong>livraison</strong> : ce véhicule recevra des livraisons, pas de courses de passagers.
                                            Aucune gamme supplémentaire ne lui est ouverte.
                                        </p>
                                    </div>
                                ) : (classement?.gammes_ouvertes ?? []).length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Accepte aussi les courses</span>
                                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                                            {(classement?.gammes_ouvertes ?? []).map((g: any) => (
                                                <label key={g.id} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={sousGammes.includes(g.id)}
                                                        onChange={() => basculer(g.id)}
                                                        className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
                                                    />
                                                    <span className="text-sm text-slate-700 dark:text-slate-300">{g.libelle}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <span className="text-xs text-slate-400">
                                            Seules les gammes inférieures. Une gamme supérieure n'est jamais proposée.
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-400">Aucune gamme inférieure n'est ouverte à ce véhicule.</span>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={envoi}>Fermer</Button>
                    <Button type="submit" variant="primary" icon="check" loading={envoi} disabled={chargement || Boolean(erreur)}>
                        Enregistrer
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default VehicleEditModal;
