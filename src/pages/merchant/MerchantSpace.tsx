import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";
import Loading from "../../components/Loading";
import OrderDesk from "./OrderDesk";
import Catalog from "./Catalog";
import Revenue from "./Revenue";

/**
 * L'espace d'un marchand.
 *
 * Il n'emprunte pas la barre latérale d'administration : un restaurateur n'a
 * rien à faire dans les écrans de flotte d'Ongo. Il voit sa boutique, ses
 * commandes, son catalogue, ses livreurs — et rien d'autre.
 *
 * L'URL porte l'identifiant public, jamais le numéro de la table. Mais ce
 * n'est pas lui qui autorise : le serveur vérifie l'appartenance à chaque
 * requête, et répond la même chose à un marchand inconnu et à un marchand
 * interdit.
 */

interface Boutique {
    id: number;
    public_id: string;
    name: string;
    type: string;
    status: string;
    paused_until: string | null;
}

interface Marchand {
    public_id: string;
    short_id: string;
    name: string;
    status: string;
    role: string;
    stores: Boutique[];
}

interface Livreur {
    id: number;
    user_id: number;
    vehicule_id: number | null;
    is_active: boolean;
    removed_at: string | null;
    nom: string | null;
    prenom: string | null;
    telephone: string | null;
    matricule: string | null;
}

type Onglet = "commandes" | "catalogue" | "livreurs" | "revenus";

export default function MerchantSpace() {
    const { merchantId } = useParams<{ merchantId: string }>();

    const [marchand, setMarchand] = useState<Marchand | null>(null);
    const [boutique, setBoutique] = useState<Boutique | null>(null);
    const [onglet, setOnglet] = useState<Onglet>("commandes");
    const [livreurs, setLivreurs] = useState<Livreur[]>([]);
    const [chargement, setChargement] = useState<boolean>(true);
    const [refus, setRefus] = useState<string | null>(null);

    const api = new ApiService();

    const charger = async () => {
        setChargement(true);

        try {
            const { data } = await api.getData(`v3/merchant/${merchantId}`);

            if (data.success) {
                setMarchand(data.data);
                setBoutique(data.data.stores?.[0] ?? null);
            } else {
                setRefus(data.message);
            }
        } catch (erreur) {
            setRefus(String(erreur));
        }

        setChargement(false);
    };

    const chargerLivreurs = async () => {
        try {
            const { data } = await api.getData(`v3/merchant/${merchantId}/couriers`);

            if (data.success) setLivreurs(data.data ?? []);
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Livreurs illisibles", text: String(erreur) });
        }
    };

    useEffect(() => {
        charger();
    }, [merchantId]);

    useEffect(() => {
        if (onglet === "livreurs") chargerLivreurs();
    }, [onglet]);

    const ajouterLivreur = async () => {
        const choix = await Swal.fire({
            title: "Ajouter un livreur",
            html:
                `<input id="compte" class="swal2-input" placeholder="Identifiant de son compte Ongo">` +
                `<input id="matricule" class="swal2-input" placeholder="Immatriculation de sa moto">` +
                `<input id="modele" class="swal2-input" placeholder="Modèle (facultatif)">` +
                `<p style="font-size:13px;color:#64748b;margin-top:8px">Il doit déjà avoir un compte Ongo — le même que pour commander une course.</p>`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: "Ajouter",
            cancelButtonText: "Annuler",
            preConfirm: () => ({
                compte: (document.getElementById("compte") as HTMLInputElement)?.value,
                matricule: (document.getElementById("matricule") as HTMLInputElement)?.value,
                modele: (document.getElementById("modele") as HTMLInputElement)?.value,
            }),
        });

        if (!choix.isConfirmed || !choix.value?.compte || !choix.value?.matricule) return;

        try {
            const { data } = await api.postData(`v3/merchant/${merchantId}/couriers`, {
                user_id: Number(choix.value.compte),
                matricule: choix.value.matricule,
                modele: choix.value.modele,
                store_id: boutique?.id,
            });

            if (data.success) {
                await chargerLivreurs();

                // Le suivi temps réel est ce qui rend le livreur visible : si
                // l'inscription a échoué, il faut le dire tout de suite.
                Swal.fire({
                    icon: data.data?.tracking_enabled ? "success" : "warning",
                    title: "Livreur ajouté",
                    text: data.data?.tracking_enabled
                        ? "Il apparaîtra dans le suivi dès sa prochaine connexion."
                        : "Attention : son véhicule n'a pas pu être inscrit au suivi temps réel.",
                });
            } else {
                Swal.fire({ icon: "error", title: "Refusé", text: data.message });
            }
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Ajout impossible", text: String(erreur) });
        }
    };

    const retirerLivreur = async (livreur: Livreur) => {
        const confirmation = await Swal.fire({
            icon: "warning",
            title: `Retirer ${livreur.nom ?? "ce livreur"} ?`,
            text: "Il ne recevra plus vos livraisons et son véhicule sortira du suivi.",
            showCancelButton: true,
            confirmButtonText: "Retirer",
            cancelButtonText: "Garder",
            confirmButtonColor: "#dc2626",
        });

        if (!confirmation.isConfirmed) return;

        try {
            const { data } = await api.postData(`v3/merchant/${merchantId}/couriers/remove`, {
                user_id: livreur.user_id,
            });

            if (data.success) await chargerLivreurs();
            else Swal.fire({ icon: "error", title: "Refusé", text: data.message });
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Retrait impossible", text: String(erreur) });
        }
    };

    if (chargement) return <div className="p-10"><Loading /></div>;

    if (refus || !marchand) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-6">
                <div className="text-center max-w-md">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Cet espace ne vous est pas accessible</h1>
                    <p className="text-sm text-slate-500 mt-2">
                        Soit ce marchand n'existe pas, soit votre compte n'y a pas sa place. Contactez Ongo si vous
                        pensez qu'il s'agit d'une erreur.
                    </p>
                </div>
            </div>
        );
    }

    const onglets: { cle: Onglet; libelle: string }[] = [
        { cle: "commandes", libelle: "Commandes" },
        { cle: "catalogue", libelle: "Catalogue" },
        { cle: "livreurs", libelle: "Livreurs" },
        { cle: "revenus", libelle: "Revenus" },
    ];

    // La cuisine ne touche ni au catalogue ni aux livreurs.
    const visibles = marchand.role === "staff" ? onglets.slice(0, 1) : onglets;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-6 py-5 max-w-7xl mx-auto">
                    <div className="flex items-start justify-between gap-6">
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{marchand.name}</h1>
                            <p className="text-sm text-slate-500">
                                {boutique?.name ?? "—"}
                                {marchand.status === "suspended" && " · compte suspendu"}
                            </p>
                        </div>

                        {marchand.stores.length > 1 && (
                            <select
                                value={boutique?.id ?? ""}
                                onChange={(e) => setBoutique(marchand.stores.find((b) => b.id === Number(e.target.value)) ?? null)}
                                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            >
                                {marchand.stores.map((b) => (
                                    <option key={b.public_id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <nav className="flex gap-6 mt-5">
                        {visibles.map(({ cle, libelle }) => (
                            <button
                                key={cle}
                                onClick={() => setOnglet(cle)}
                                className={`pb-2 text-sm font-medium border-b-2 ${
                                    onglet === cle
                                        ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
                                        : "border-transparent text-slate-500"
                                }`}
                            >
                                {libelle}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            <main className="px-6 py-8 max-w-7xl mx-auto">
                {!boutique ? (
                    <p className="text-slate-500">Aucune boutique n'est rattachée à ce compte.</p>
                ) : onglet === "commandes" ? (
                    <OrderDesk merchantId={merchantId!} storeId={boutique.id} />
                ) : onglet === "catalogue" ? (
                    <Catalog merchantId={merchantId!} storeId={boutique.id} storeType={boutique.type} />
                ) : onglet === "revenus" ? (
                    <Revenue merchantId={merchantId!} />
                ) : (
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-sm text-slate-500 max-w-xl">
                                Vos livreurs reçoivent vos commandes en premier. Passé quelques minutes, Ongo prend le
                                relais — sauf si vous le refusez.
                            </p>

                            <button
                                onClick={ajouterLivreur}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 shrink-0"
                            >
                                Ajouter un livreur
                            </button>
                        </div>

                        {livreurs.length === 0 ? (
                            <p className="text-sm text-slate-500">
                                Aucun livreur. Vos commandes partiront directement aux livreurs d'Ongo.
                            </p>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
                                {livreurs.map((livreur) => (
                                    <div key={livreur.id} className="p-4 flex items-center gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium text-slate-900 dark:text-white ${livreur.removed_at ? "line-through opacity-50" : ""}`}>
                                                {livreur.prenom ? `${livreur.prenom} ` : ""}{livreur.nom ?? "—"}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                {livreur.telephone ?? "—"}
                                                {livreur.matricule ? ` · ${livreur.matricule}` : " · sans véhicule"}
                                            </p>
                                        </div>

                                        {livreur.removed_at ? (
                                            <span className="text-xs text-slate-400">retiré</span>
                                        ) : (
                                            <button
                                                onClick={() => retirerLivreur(livreur)}
                                                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-300 text-red-600 dark:border-red-800 dark:text-red-400"
                                            >
                                                retirer
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </main>
        </div>
    );
}
