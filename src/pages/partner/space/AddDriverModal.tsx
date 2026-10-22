import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ApiService from "../../../services/ApiService";
import { chargerCategories, estLivraison, type CategorieVehicule } from "../../../services/categories";
import { Button, Input, Select } from "../../../components/ui";

interface Props {
    partnerId: string;
    open: boolean;
    onClose: () => void;
    onAdded: () => void;
}

type Resultat =
    | { etat: "vierge" }
    | { etat: "recherche" }
    | { etat: "trouve"; user: any; already: boolean; taken: boolean; vehicule: VehiculeConnu | null }
    | { etat: "absent"; telephone: string };

interface VehiculeConnu {
    id: number;
    matricule: string;
    modele: string | null;
    categorie: string | null;
}

const TEL = /^[0-9+\s]{8,15}$/;

/**
 * L'ajout d'un chauffeur à la flotte d'un partenaire.
 *
 * Le numéro de téléphone mène la saisie : c'est la seule donnée que le
 * partenaire a de façon certaine. Le serveur répond qui est derrière, et on
 * le montre avant d'engager quoi que ce soit — ajouter la mauvaise personne
 * revient à lui donner accès à des courses.
 *
 * Trois refus distincts, qui n'appellent pas la même suite : déjà dans la
 * flotte (rien à faire), rattaché ailleurs (refus net, sans dire à qui), ou
 * aucun compte (on le crée).
 */
const AddDriverModal: React.FC<Props> = ({ partnerId, open, onClose, onAdded }) => {
    const api = new ApiService();

    const [telephone, setTelephone] = useState("");
    const [resultat, setResultat] = useState<Resultat>({ etat: "vierge" });
    const [nom, setNom] = useState("");
    const [prenom, setPrenom] = useState("");
    const [matricule, setMatricule] = useState("");
    const [modele, setModele] = useState("");
    const [categorie, setCategorie] = useState("1");
    const [envoi, setEnvoi] = useState(false);
    // Un chauffeur qui a déjà un véhicule le garde ; ce choix permet d'en enregistrer un autre.
    const [autreVehicule, setAutreVehicule] = useState(false);
    // Le partenaire décide : le véhicule entre dans sa flotte, ou le chauffeur garde le sien.
    const [dansLaFlotte, setDansLaFlotte] = useState(true);
    const [categories, setCategories] = useState<CategorieVehicule[]>([]);

    useEffect(() => {
        if (!open) return;
        setTelephone(""); setResultat({ etat: "vierge" });
        setNom(""); setPrenom(""); setMatricule(""); setModele(""); setCategorie("1"); setAutreVehicule(false); setDansLaFlotte(true);
    }, [open]);

    useEffect(() => { chargerCategories().then(setCategories); }, []);

    useEffect(() => {
        if (!open) return;
        const auClavier = (e: KeyboardEvent) => { if (e.key === "Escape" && !envoi) onClose(); };
        window.addEventListener("keydown", auClavier);
        return () => window.removeEventListener("keydown", auClavier);
    }, [open, envoi, onClose]);

    const chercher = async () => {
        const tel = telephone.trim();
        if (!TEL.test(tel)) { toast.error("Numéro de téléphone invalide"); return; }

        setResultat({ etat: "recherche" });
        try {
            const { data } = await api.postData(`v3/partner/${partnerId}/drivers/lookup`, { phone: tel });
            if (!data.success) {
                toast.error(data.message || "Recherche impossible");
                setResultat({ etat: "vierge" });
                return;
            }
            if (data.data?.found) {
                setResultat({
                    etat: "trouve",
                    user: data.data.user,
                    already: Boolean(data.data.already),
                    taken: Boolean(data.data.taken),
                    vehicule: data.data.vehicule ?? null,
                });
                setAutreVehicule(false);
                // Un chauffeur qui vient avec son véhicule le garde, sauf choix contraire.
                setDansLaFlotte(!data.data.vehicule);
            } else {
                setResultat({ etat: "absent", telephone: tel });
            }
        } catch (e: any) {
            toast.error(e?.response?.status === 403 ? "Accès refusé" : "Connexion au serveur impossible");
            setResultat({ etat: "vierge" });
        }
    };

    const ajouter = async (e: React.FormEvent) => {
        e.preventDefault();
        // Le véhicule qu'il conduit déjà est repris par le serveur : rien à saisir.
        const reprendVehicule = resultat.etat === "trouve" && resultat.vehicule !== null && !autreVehicule;

        if (!reprendVehicule && !matricule.trim()) { toast.error("Le matricule du véhicule est obligatoire"); return; }

        let corps: Record<string, unknown> = reprendVehicule ? { ajouter_flotte: dansLaFlotte } : {
            ajouter_flotte: dansLaFlotte,
            vehicule: {
                matricule: matricule.trim().toUpperCase(),
                modele: modele.trim() || undefined,
                categorie_id: Number(categorie),
            },
        };

        if (resultat.etat === "trouve") {
            corps.user_id = resultat.user.id;
        } else if (resultat.etat === "absent") {
            if (!nom.trim() || !prenom.trim()) { toast.error("Nom et prénom obligatoires"); return; }
            corps.new_user = { nom: nom.trim(), prenom: prenom.trim(), telephone: resultat.telephone };
        } else {
            toast.error("Recherchez d'abord un numéro"); return;
        }

        setEnvoi(true);
        try {
            const { data } = await api.postData(`v3/partner/${partnerId}/drivers`, corps);
            if (data.success) {
                // Sans suivi temps réel, le chauffeur existe mais reste
                // invisible sur la carte : l'annoncer comme un succès plein
                // serait trompeur.
                if (data.data?.tracking_enabled === false) {
                    toast.warn("Chauffeur ajouté, mais son véhicule n'a pas pu être inscrit au suivi temps réel.");
                } else {
                    toast.success("Chauffeur ajouté");
                }
                onAdded();
                onClose();
            } else {
                toast.error(data.message || "Ajout refusé");
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Connexion au serveur impossible");
        } finally {
            setEnvoi(false);
        }
    };

    if (!open) return null;

    const bloque = resultat.etat === "trouve" && (resultat.already || resultat.taken);
    const vehiculeConnu = resultat.etat === "trouve" ? resultat.vehicule : null;
    const saisirVehicule = !vehiculeConnu || autreVehicule;
    const peutAjouter = (resultat.etat === "trouve" && !bloque) || resultat.etat === "absent";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !envoi) onClose(); }}
        >
            <form
                onSubmit={ajouter}
                role="dialog"
                aria-modal="true"
                aria-label="Ajouter un chauffeur"
                className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col"
            >
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">Ajouter un chauffeur</h3>
                    <Button type="button" variant="ghost" size="sm" icon="close" aria-label="Fermer" onClick={onClose} disabled={envoi} />
                </div>

                <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Téléphone du chauffeur</span>
                        <div className="flex gap-2">
                            <Input
                                value={telephone}
                                onChange={(e) => { setTelephone(e.target.value); if (resultat.etat !== "vierge") setResultat({ etat: "vierge" }); }}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); chercher(); } }}
                                placeholder="6XX XX XX XX"
                                inputMode="tel"
                                autoFocus
                            />
                            <Button type="button" icon="search" onClick={chercher} loading={resultat.etat === "recherche"} className="shrink-0">
                                Chercher
                            </Button>
                        </div>
                    </label>

                    {resultat.etat === "trouve" && (
                        <div className={`flex items-start gap-3 p-4 rounded-xl border ${bloque
 ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20"
                            : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"}`}>
                            <span className={`material-symbols-outlined ${bloque ? "text-amber-600" : "text-emerald-600"}`}>
                                {bloque ? "warning" : "how_to_reg"}
                            </span>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    {[resultat.user?.prenom, resultat.user?.nom].filter(Boolean).join(" ") || "Compte sans nom"}
                                </p>
                                <p className="text-xs text-slate-500 font-mono">{resultat.user?.telephone}</p>
                                <p className={`text-xs font-semibold mt-1 ${bloque ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                                    {resultat.already
                                        ? "Cette personne fait déjà partie de votre flotte."
                                        : resultat.taken
                                            ? "Cette personne est déjà rattachée à un autre partenaire."
                                            : "Compte trouvé. Vérifiez qu'il s'agit bien de la bonne personne."}
                                </p>
                            </div>
                        </div>
                    )}

                    {resultat.etat === "absent" && (
                        <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px] text-slate-400">person_add</span>
                                Aucun compte sur {resultat.telephone}. Il sera créé.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom *" />
                                <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom *" />
                            </div>
                        </div>
                    )}

                    {/* Son véhicule est déjà enregistré : il sera associé tel quel. */}
                    {vehiculeConnu && !bloque && (
                        <div className="flex flex-col gap-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Son véhicule</span>
                            {!autreVehicule ? (
                                <>
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-slate-400">directions_car</span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold font-mono text-slate-900 dark:text-white">{vehiculeConnu.matricule}</p>
                                            <p className="text-xs text-slate-500">
                                                {[vehiculeConnu.modele, vehiculeConnu.categorie].filter(Boolean).join(" · ") || "Véhicule enregistré"}
                                            </p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => setAutreVehicule(true)} className="self-start text-xs font-semibold text-primary hover:underline">
                                        Enregistrer un autre véhicule
                                    </button>
                                </>
                            ) : (
                                <button type="button" onClick={() => setAutreVehicule(false)} className="self-start text-xs font-semibold text-primary hover:underline">
                                    Garder {vehiculeConnu.matricule}
                                </button>
                            )}
                        </div>
                    )}

                    {saisirVehicule && (
                    <div className={`flex flex-col gap-3 transition-opacity ${peutAjouter ? "" : "opacity-50 pointer-events-none"}`}>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{vehiculeConnu ? "Autre véhicule" : "Son véhicule"}</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input value={matricule} onChange={(e) => setMatricule(e.target.value)} placeholder="Matricule *" />
                            <Input value={modele} onChange={(e) => setModele(e.target.value)} placeholder="Modèle" />
                        </div>
                        <Select value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.libelle}{estLivraison(c) ? " — livraison" : ""}
                                </option>
                            ))}
                        </Select>

                        {/* Une catégorie de livraison ne reçoit pas de courses
                            de passagers : le dire ici évite d'attendre en vain. */}
                        {estLivraison(categories.find((c) => String(c.id) === categorie)) && (
                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                <span className="material-symbols-outlined text-[20px] shrink-0">local_shipping</span>
                                <p className="text-xs font-semibold leading-relaxed">
                                    Catégorie de <strong>livraison</strong> : ce chauffeur recevra des livraisons, pas de courses de passagers.
                                </p>
                            </div>
                        )}
                    </div>
                    )}
                </div>

                {/* Ajouter le véhicule à la flotte, ou rattacher le chauffeur seul. */}
                {peutAjouter && (
                    <label className="mx-6 mb-1 flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                        <input type="checkbox" checked={dansLaFlotte} onChange={(e) => setDansLaFlotte(e.target.checked)} className="mt-0.5 size-4 accent-primary" />
                        <span className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                            <strong className="block text-sm text-slate-900 dark:text-white">Ajouter ce véhicule à ma flotte</strong>
                            {dansLaFlotte
                                ? "Le véhicule apparaîtra dans votre flotte, avec le chauffeur."
                                : "Seul le chauffeur est rattaché : il travaille avec son propre véhicule, qui reste hors de votre flotte."}
                        </span>
                    </label>
                )}

                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={envoi}>Annuler</Button>
                    <Button type="submit" variant="primary" icon="check" loading={envoi} disabled={!peutAjouter}>
                        Ajouter
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default AddDriverModal;
