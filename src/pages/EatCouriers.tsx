import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";

/**
 * Les livreurs d'Ongo sur Ongo Eat.
 *
 * Un marchand désigne les siens ; Ongo ne désignait personne — la répartition
 * se contentait du rôle chauffeur, si bien que **tout** chauffeur de la
 * plateforme se voyait proposer les livraisons. Ongo ne choisissait pas à qui
 * elle confiait le panier d'un marchand.
 *
 * La liste est propre à Ongo Eat : elle ne touche pas au rôle de la plateforme.
 * Un chauffeur inscrit ici prend ses courses exactement comme avant. Ce qu'elle
 * change tient à un chiffre — le plafond d'espèces qu'on lui accorde, celui
 * d'un livreur choisi plutôt que celui d'un chauffeur de passage.
 */

interface Livreur {
    id: number;
    user_id: number;
    is_active: boolean;
    removed_at: string | null;
    created_at: string | null;
    nom: string | null;
    prenom: string | null;
    telephone: string | null;
    photo: string | null;
    matricule: string | null;
    modele: string | null;
    debt: number;
    ceiling: number;
}

interface EatCouriersProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const francs = (montant: number) => `${(montant ?? 0).toLocaleString("fr-FR")} F`;

const jour = (valeur: string | null) =>
    valeur ? new Date(valeur).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function EatCouriers({ onLogout, theme, toggleTheme }: EatCouriersProps) {
    const [livreurs, setLivreurs] = useState<Livreur[]>([]);
    const [plafonds, setPlafonds] = useState<{ courier: number; driver: number }>({ courier: 0, driver: 0 });
    const [chargement, setChargement] = useState(true);

    const api = new ApiService();

    const charger = async () => {
        setChargement(true);

        try {
            const { data } = await api.getData("v3/admin/eat/couriers");

            if (data.success) {
                setLivreurs(data.data?.couriers ?? []);
                setPlafonds(data.data?.ceilings ?? { courier: 0, driver: 0 });
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Liste illisible", text: String(erreur) });
        }

        setChargement(false);
    };

    useEffect(() => {
        charger();
    }, []);

    /**
     * Inscrire, en deux temps.
     *
     * Le numéro d'abord, le nom ensuite : un chiffre de trop inscrit quelqu'un
     * d'autre, et c'est à lui qu'on confiera des paniers. Le nom affiché avant
     * de valider est la seule vérification possible.
     */
    const inscrire = async () => {
        const saisie = await Swal.fire({
            title: "Inscrire un livreur",
            input: "text",
            inputLabel: "Son numéro de téléphone",
            inputPlaceholder: "+237 6…",
            showCancelButton: true,
            confirmButtonText: "Chercher",
            cancelButtonText: "Annuler",
        });

        if (!saisie.isConfirmed || !saisie.value) return;

        try {
            const { data } = await api.postData("v3/admin/eat/couriers/lookup", { phone: saisie.value });

            if (!data.success) {
                Swal.fire({ icon: "error", title: "Introuvable", text: data.message });
                return;
            }

            if (data.data.already) {
                Swal.fire({ icon: "info", title: "Déjà inscrit", text: `${data.data.nom} est déjà livreur Ongo Eat.` });
                return;
            }

            const confirmation = await Swal.fire({
                icon: "question",
                title: data.data.nom,
                text: `${data.data.telephone} — l'inscrire comme livreur Ongo Eat ? Son plafond d'espèces passera à ${francs(
                    plafonds.courier
                )}.`,
                showCancelButton: true,
                confirmButtonText: "Inscrire",
                cancelButtonText: "Annuler",
            });

            if (!confirmation.isConfirmed) return;

            const reponse = await api.postData("v3/admin/eat/couriers", { user_id: data.data.user_id });

            if (!reponse.data.success) {
                Swal.fire({ icon: "error", title: "Non inscrit", text: reponse.data.message });
                return;
            }

            await charger();
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Inscription impossible", text: String(erreur) });
        }
    };

    /**
     * Retirer, en disant ce que ça change.
     *
     * Il ne perd pas son compte ni ses courses : il retombe simplement au
     * plafond d'un chauffeur non inscrit. Et s'il doit encore de l'argent, le
     * dire ici évite de retirer celui qu'on cherchait justement à relancer.
     */
    const retirer = async (livreur: Livreur) => {
        const nom = `${livreur.prenom ?? ""} ${livreur.nom ?? ""}`.trim() || "ce livreur";

        const confirmation = await Swal.fire({
            icon: "warning",
            title: `Retirer ${nom} ?`,
            html:
                `<p style="font-size:14px">Il garde son compte et ses courses. Son plafond d'espèces retombe à ${francs(
                    plafonds.driver
                )}.</p>` +
                (livreur.debt > 0
                    ? `<p style="font-size:13px;color:#b91c1c;margin-top:8px">Il doit encore ${francs(
                          livreur.debt
                      )} à Ongo.</p>`
                    : ""),
            showCancelButton: true,
            confirmButtonText: "Retirer",
            cancelButtonText: "Annuler",
        });

        if (!confirmation.isConfirmed) return;

        try {
            const { data } = await api.postData("v3/admin/eat/couriers/remove", { user_id: livreur.user_id });

            if (!data.success) {
                Swal.fire({ icon: "error", title: "Non retiré", text: data.message });
                return;
            }

            await charger();
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Retrait impossible", text: String(erreur) });
        }
    };

    const actifs = livreurs.filter((l) => l.removed_at === null);
    const retires = livreurs.filter((l) => l.removed_at !== null);

    const ligne = (livreur: Livreur) => (
        <div
            key={livreur.id}
            className="p-5 flex items-center gap-4 flex-wrap"
        >
            <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-white">
                    {`${livreur.prenom ?? ""} ${livreur.nom ?? ""}`.trim() || "—"}
                </p>
                <p className="text-sm text-slate-500">
                    {livreur.telephone ?? "—"}
                    {livreur.matricule ? ` · ${livreur.matricule}` : ""}
                    {livreur.modele ? ` ${livreur.modele}` : ""}
                </p>
            </div>

            {livreur.removed_at === null ? (
                <>
                    <div className="text-right">
                        <p
                            className={`font-semibold ${
                                livreur.debt >= livreur.ceiling
                                    ? "text-rose-700 dark:text-rose-300"
                                    : "text-slate-900 dark:text-white"
                            }`}
                        >
                            {livreur.debt > 0 ? francs(livreur.debt) : "à jour"}
                        </p>
                        <p className="text-xs text-slate-500">plafond {francs(livreur.ceiling)}</p>
                    </div>

                    <button
                        onClick={() => retirer(livreur)}
                        className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300"
                    >
                        Retirer
                    </button>
                </>
            ) : (
                <span className="text-sm text-slate-500">retiré le {jour(livreur.removed_at)}</span>
            )}
        </div>
    );

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-8 py-6 max-w-7xl mx-auto flex items-start justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Livreurs Ongo Eat</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Ceux à qui vous confiez les livraisons. Inscrit, un chauffeur peut porter{" "}
                            {francs(plafonds.courier)} d'espèces ; sans l'être, {francs(plafonds.driver)}.
                        </p>
                    </div>

                    <button
                        onClick={inscrire}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 shrink-0"
                    >
                        Inscrire un livreur
                    </button>
                </div>
            </header>

            <div className="px-8 py-8 max-w-7xl mx-auto space-y-8">
                {chargement ? (
                    <Loading />
                ) : (
                    <>
                        <section>
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                                Inscrits {actifs.length > 0 ? `(${actifs.length})` : ""}
                            </h3>

                            {actifs.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                    Personne pour l'instant. Tant que la liste est vide, un chauffeur qui prend une
                                    livraison reste au plafond de {francs(plafonds.driver)}.
                                </p>
                            ) : (
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
                                    {actifs.map(ligne)}
                                </div>
                            )}
                        </section>

                        {retires.length > 0 && (
                            <section>
                                <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Retirés</h3>

                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800 opacity-70">
                                    {retires.map(ligne)}
                                </div>
                            </section>
                        )}

                        <p className="text-xs text-slate-500">
                            Les deux plafonds se règlent dans « Réglages ». Ce qu'un livreur doit se lit aussi dans
                            « Trésorerie », avec ce qu'on doit aux marchands.
                        </p>
                    </>
                )}
            </div>
        </MainLayout>
    );
}
