import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";

/**
 * Les covoitureurs : ceux qui attendent une décision, ceux qui roulent.
 *
 * L'application laissait postuler sans que personne n'ait d'écran pour
 * trancher : une demande envoyée restait « en cours d'examen » indéfiniment, et
 * les comptes autorisés l'étaient à la main, en base.
 *
 * Deux onglets plutôt que deux pages : accorder et retirer sont le même geste
 * vu de deux moments, et l'on passe de l'un à l'autre en décidant.
 */

interface Vehicule {
    id: number;
    matricule: string;
    modele: string | null;
    color: string | null;
    ville: string | null;
}

interface Covoitureur {
    id: number;
    nom: string | null;
    prenom: string | null;
    telephone: string | null;
    photo: string | null;
    can_carpool: boolean | number | null;
    carpool_requested_at: string | null;
    carpool_verified_at: string | null;
    carpool_rejection_reason: string | null;
    vehicules: Vehicule[];
}

interface CarpoolersProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

type Onglet = "pending" | "active";

export default function Carpoolers({ onLogout, theme, toggleTheme }: CarpoolersProps) {
    const [onglet, setOnglet] = useState<Onglet>("pending");
    const [lignes, setLignes] = useState<Covoitureur[]>([]);
    const [chargement, setChargement] = useState<boolean>(true);

    const api = new ApiService();

    const charger = async (vue: Onglet) => {
        setChargement(true);

        try {
            const { data } = await api.getData(`v3/carpool-access/${vue}`);

            if (data.success) {
                setLignes(data.data?.data ?? []);
            } else {
                Swal.fire({ icon: "warning", title: "Erreur", text: data.message });
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Serveur injoignable", text: String(erreur) });
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => {
        charger(onglet);
    }, [onglet]);

    /** Accorder le droit de covoiturer. */
    const autoriser = async (personne: Covoitureur) => {
        const confirmation = await Swal.fire({
            icon: "question",
            title: "Autoriser ce covoitureur ?",
            text: `${personne.prenom ?? ""} ${personne.nom ?? ""} pourra publier des trajets et répondre aux demandes.`,
            showCancelButton: true,
            confirmButtonText: "Autoriser",
            cancelButtonText: "Annuler",
        });

        if (!confirmation.isConfirmed) return;

        await decider(personne, true);
    };

    /**
     * Refuser, ou retirer le droit.
     *
     * Le motif part tel quel dans l'application : c'est lui que le candidat lit
     * pour corriger son dossier, « Non précisé » ne l'aide en rien.
     */
    const refuser = async (personne: Covoitureur) => {
        const { value: motif, isConfirmed } = await Swal.fire({
            icon: "warning",
            title: onglet === "pending" ? "Refuser cette demande ?" : "Retirer le droit de covoiturer ?",
            input: "text",
            inputLabel: "Motif, tel qu'il sera lu par la personne",
            inputPlaceholder: "Plaque illisible sur la photo…",
            showCancelButton: true,
            confirmButtonText: onglet === "pending" ? "Refuser" : "Retirer",
            cancelButtonText: "Annuler",
            inputValidator: (valeur) => (valeur.trim() === "" ? "Indiquez un motif" : null),
        });

        if (!isConfirmed) return;

        await decider(personne, false, motif);
    };

    const decider = async (personne: Covoitureur, accorder: boolean, motif?: string) => {
        try {
            const { data } = await api.postData("v3/carpool-access/decide", {
                user_id: personne.id,
                accorder,
                motif,
            });

            if (data.success) {
                Swal.fire({ icon: "success", title: "C'est fait", text: data.message, timer: 1800, showConfirmButton: false });
                charger(onglet);

                return;
            }

            Swal.fire({ icon: "error", title: "Refusé", text: data.message });
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Serveur injoignable", text: String(erreur) });
        }
    };

    const vehicule = (personne: Covoitureur) => personne.vehicules?.[0];

    const date = (valeur: string | null) =>
        valeur ? new Date(valeur).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-8 py-6 max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Covoitureurs</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Covoiturer n'est pas conduire pour Ongo : une voiture vérifiée suffit.
                    </p>
                </div>
            </header>

            <div className="p-8 max-w-7xl mx-auto space-y-6">
                <div className="flex items-center gap-2">
                    {([
                        { cle: "pending", libelle: "À examiner" },
                        { cle: "active", libelle: "Autorisés" },
                    ] as { cle: Onglet; libelle: string }[]).map((item) => (
                        <button
                            key={item.cle}
                            onClick={() => setOnglet(item.cle)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                                onglet === item.cle
                                    ? "bg-[#137fec] text-white border-[#137fec]"
                                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                            }`}
                        >
                            {item.libelle}
                        </button>
                    ))}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        {chargement ? (
                            <Loading />
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-slate-800">
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Personne</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Téléphone</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Véhicule</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            {onglet === "pending" ? "Demandé le" : "Autorisé le"}
                                        </th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {lignes.length > 0 ? (
                                        lignes.map((personne) => (
                                            <tr key={personne.id} className="group hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                                                <td className="px-6 py-4 text-sm font-semibold text-slate-400">#{personne.id}</td>
                                                <td className="px-6 py-4 text-sm font-bold">
                                                    {personne.prenom ?? ""} {personne.nom ?? ""}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium">{personne.telephone ?? "—"}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    {vehicule(personne) ? (
                                                        <div>
                                                            <div className="font-semibold">{vehicule(personne).matricule}</div>
                                                            <div className="text-xs text-slate-500">
                                                                {[vehicule(personne).modele, vehicule(personne).color, vehicule(personne).ville]
                                                                    .filter(Boolean)
                                                                    .join(" · ") || "—"}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">Aucun véhicule</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-500">
                                                    {date(onglet === "pending" ? personne.carpool_requested_at : personne.carpool_verified_at)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {onglet === "pending" && (
                                                            <button
                                                                onClick={() => autoriser(personne)}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
                                                            >
                                                                Autoriser
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => refuser(personne)}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-500 text-red-500 hover:bg-red-50 transition-all"
                                                        >
                                                            {onglet === "pending" ? "Refuser" : "Retirer"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                                                {onglet === "pending"
                                                    ? "Aucune demande à examiner."
                                                    : "Aucun covoitureur autorisé pour l'instant."}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
