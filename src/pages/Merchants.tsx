import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";

/**
 * Les marchands d'Ongo.
 *
 * Un marchand ne s'inscrit pas seul : quelqu'un d'Ongo le rencontre, vérifie
 * qui il est, et lui ouvre un compte. Cet écran est ce moment-là.
 *
 * Trois choses naissent ensemble — le compte, sa première boutique, son
 * responsable — parce qu'aucune ne vaut seule : un marchand sans responsable
 * est un compte que personne ne peut ouvrir.
 *
 * Le responsable doit déjà avoir un compte Ongo, le même que pour commander
 * une course. On ne crée pas d'identifiants séparés : un numéro, un compte,
 * un rôle de plus.
 */

interface Boutique {
    id: number;
    public_id: string;
    name: string;
    type: string;
    status: string;
    city: string | null;
}

interface Marchand {
    id: number;
    public_id: string;
    short_id: string;
    name: string;
    slug: string;
    status: "pending" | "active" | "suspended";
    phone: string | null;
    email: string | null;
    suspension_reason: string | null;
    stores: Boutique[];
}

interface MerchantsProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const TYPES: Record<string, string> = {
    restaurant: "Restaurant",
    supermarket: "Supermarché",
    convenience: "Supérette",
    pharmacy: "Pharmacie",
};

const STATUTS: Record<string, { texte: string; classe: string }> = {
    pending: { texte: "En attente", classe: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
    active: { texte: "Actif", classe: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
    suspended: { texte: "Suspendu", classe: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

export default function Merchants({ onLogout, theme, toggleTheme }: MerchantsProps) {
    const [marchands, setMarchands] = useState<Marchand[]>([]);
    const [recherche, setRecherche] = useState<string>("");
    const [chargement, setChargement] = useState<boolean>(true);
    const [formulaire, setFormulaire] = useState<boolean>(false);
    const [envoi, setEnvoi] = useState<boolean>(false);

    const [nouveau, setNouveau] = useState({
        name: "",
        phone: "",
        email: "",
        owner_id: "",
        store_name: "",
        store_type: "restaurant",
        city: "",
        address: "",
    });

    const api = new ApiService();

    const charger = async () => {
        setChargement(true);

        try {
            const { data } = await api.getData("v3/admin/merchants", {
                q: recherche.trim() || undefined,
            });

            if (data.success) setMarchands(data.data?.data ?? []);
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Liste illisible", text: String(erreur) });
        }

        setChargement(false);
    };

    useEffect(() => {
        // Une frappe ne déclenche pas une requête : on attend que la main
        // s'arrête.
        const minuteur = setTimeout(charger, 350);

        return () => clearTimeout(minuteur);
    }, [recherche]);

    const creer = async () => {
        if (!nouveau.name.trim() || !nouveau.owner_id || !nouveau.store_name.trim()) {
            Swal.fire({
                icon: "info",
                title: "Il manque l'essentiel",
                text: "Le nom, le responsable et la première boutique sont requis.",
            });

            return;
        }

        setEnvoi(true);

        try {
            const { data } = await api.postData("v3/admin/merchants", nouveau);

            if (data.success) {
                setFormulaire(false);
                setNouveau({
                    name: "", phone: "", email: "", owner_id: "",
                    store_name: "", store_type: "restaurant", city: "", address: "",
                });
                await charger();
                Swal.fire({ icon: "success", title: "Marchand créé", timer: 1600, showConfirmButton: false });
            } else {
                Swal.fire({ icon: "error", title: "Création refusée", text: data.message });
            }
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Création impossible", text: String(erreur) });
        }

        setEnvoi(false);
    };

    const basculer = async (marchand: Marchand) => {
        const suspendre = marchand.status !== "suspended";

        let motif: string | undefined;

        if (suspendre) {
            const saisie = await Swal.fire({
                icon: "warning",
                title: `Suspendre ${marchand.name} ?`,
                text: "Ses commandes s'arrêtent. Rien n'est supprimé.",
                input: "text",
                inputPlaceholder: "Motif — il sera conservé",
                showCancelButton: true,
                confirmButtonText: "Suspendre",
                cancelButtonText: "Annuler",
            });

            if (!saisie.isConfirmed || !saisie.value) return;

            motif = saisie.value;
        }

        try {
            const { data } = await api.postData("v3/admin/merchants/status", {
                merchant_id: marchand.short_id,
                status: suspendre ? "suspended" : "active",
                reason: motif,
            });

            if (data.success) await charger();
            else Swal.fire({ icon: "error", title: "Refusé", text: data.message });
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Action impossible", text: String(erreur) });
        }
    };

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-8 py-6 max-w-7xl mx-auto flex items-start justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Marchands</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Restaurants, supermarchés et supérettes. Chacun gère sa boutique depuis son propre espace.
                        </p>
                    </div>

                    <button
                        onClick={() => setFormulaire(!formulaire)}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 shrink-0"
                    >
                        {formulaire ? "Fermer" : "Nouveau marchand"}
                    </button>
                </div>
            </header>

            <div className="px-8 py-8 max-w-7xl mx-auto">
                {formulaire && (
                    <section className="mb-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                        <h2 className="font-semibold text-slate-900 dark:text-white">Faire entrer un marchand</h2>
                        <p className="text-sm text-slate-500 mt-1 mb-5">
                            Le responsable doit déjà avoir un compte Ongo — indiquez son identifiant utilisateur.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { cle: "name", libelle: "Nom de l'enseigne", exemple: "Chez Mama" },
                                { cle: "owner_id", libelle: "Compte Ongo du responsable", exemple: "identifiant utilisateur" },
                                { cle: "phone", libelle: "Téléphone", exemple: "699 00 00 00" },
                                { cle: "email", libelle: "Email", exemple: "contact@chezmama.cm" },
                                { cle: "store_name", libelle: "Première boutique", exemple: "Chez Mama Akwa" },
                                { cle: "city", libelle: "Ville", exemple: "Douala" },
                                { cle: "address", libelle: "Adresse", exemple: "Rue Njo-Njo, Bonapriso" },
                            ].map((champ) => (
                                <label key={champ.cle} className="block">
                                    <span className="text-xs font-semibold text-slate-500 uppercase">{champ.libelle}</span>
                                    <input
                                        value={(nouveau as never)[champ.cle]}
                                        onChange={(evenement) =>
                                            setNouveau({ ...nouveau, [champ.cle]: evenement.target.value })
                                        }
                                        placeholder={champ.exemple}
                                        className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    />
                                </label>
                            ))}

                            <label className="block">
                                <span className="text-xs font-semibold text-slate-500 uppercase">Type de boutique</span>
                                <select
                                    value={nouveau.store_type}
                                    onChange={(evenement) => setNouveau({ ...nouveau, store_type: evenement.target.value })}
                                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                >
                                    {Object.entries(TYPES).map(([valeur, libelle]) => (
                                        <option key={valeur} value={valeur}>{libelle}</option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <button
                            onClick={creer}
                            disabled={envoi}
                            className="mt-6 px-5 py-2.5 rounded-lg text-sm font-medium bg-slate-900 text-white disabled:bg-slate-300 dark:bg-white dark:text-slate-900"
                        >
                            {envoi ? "Création…" : "Créer le marchand"}
                        </button>
                    </section>
                )}

                <input
                    value={recherche}
                    onChange={(evenement) => setRecherche(evenement.target.value)}
                    placeholder="Chercher un marchand — nom, téléphone, email"
                    className="w-full mb-6 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />

                {chargement ? (
                    <Loading />
                ) : marchands.length === 0 ? (
                    <p className="text-slate-500 text-sm">Aucun marchand pour l'instant.</p>
                ) : (
                    <div className="space-y-3">
                        {marchands.map((marchand) => (
                            <div
                                key={marchand.public_id}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                                                {marchand.name}
                                            </h3>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUTS[marchand.status]?.classe}`}>
                                                {STATUTS[marchand.status]?.texte}
                                            </span>
                                        </div>

                                        <p className="text-sm text-slate-500 mt-1">
                                            {marchand.phone ?? "—"} · {marchand.stores?.length ?? 0} boutique
                                            {(marchand.stores?.length ?? 0) > 1 ? "s" : ""}
                                        </p>

                                        {marchand.suspension_reason && (
                                            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                                Suspendu : {marchand.suspension_reason}
                                            </p>
                                        )}

                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {(marchand.stores ?? []).map((boutique) => (
                                                <span
                                                    key={boutique.public_id}
                                                    className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                                >
                                                    {boutique.name} · {TYPES[boutique.type] ?? boutique.type}
                                                    {boutique.city ? ` · ${boutique.city}` : ""}
                                                </span>
                                            ))}
                                        </div>

                                        {/* L'identifiant que le marchand verra dans son URL. */}
                                        <p className="text-xs text-slate-400 mt-3 font-mono">/merchant/{marchand.short_id}</p>
                                    </div>

                                    <button
                                        onClick={() => basculer(marchand)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium shrink-0 ${
                                            marchand.status === "suspended"
                                                ? "bg-emerald-600 text-white"
                                                : "border border-red-300 text-red-600 dark:border-red-800 dark:text-red-400"
                                        }`}
                                    >
                                        {marchand.status === "suspended" ? "Réactiver" : "Suspendre"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
