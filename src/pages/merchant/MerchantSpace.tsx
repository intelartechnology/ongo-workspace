import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";
import Loading from "../../components/Loading";
import OrderDesk from "./OrderDesk";
import Catalog from "./Catalog";
import Sponsorships from "./Sponsorships";
import Audiences from "./Audiences";
import Revenue from "./Revenue";
import Stats from "./Stats";
import Delivery from "./Delivery";
import Promotions from "./Promotions";
import Hours from "./Hours";
import PaymentMethods from "./PaymentMethods";
import StoreProfile from "./StoreProfile";
import Reviews from "./Reviews";
import Team from "./Team";
import Collections from "./Collections";
import MediaGallery from "../components/MediaGallery";
import { galerieMarchand } from "../../services/images";

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

interface MerchantSpaceProps {
    onLogout: () => void;
}

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

type Onglet = "commandes" | "horaires" | "boutique" | "paiement" | "catalogue" | "avis" | "promotions" | "livraison" | "livreurs" | "equipe" | "photos" | "collections" | "revenus" | "campagnes" | "audiences" | "statistiques";

interface Groupe {
    cle: string;
    libelle: string;
    icone: string;
    onglets: { cle: Onglet; libelle: string }[];
}

/**
 * Les quinze écrans, en six familles.
 *
 * Alignés en une seule rangée, ils débordaient de l'écran : « Statistiques »
 * et « Sponsorings » vivaient derrière un défilement horizontal que personne
 * ne pense à faire. Groupés, tout se voit d'un coup, et l'ordre raconte la
 * journée d'un restaurateur — ce qui tourne maintenant, ce qu'il vend, ce
 * qu'il met en avant, qui livre, ce que ça rapporte, et le reste.
 *
 * Le groupe n'est pas un état de plus : il se déduit de l'onglet ouvert. Un
 * second état pourrait le contredire — groupe « Finances » affiché, écran des
 * commandes dessous.
 */
const GROUPES: Groupe[] = [
    {
        cle: "activite",
        libelle: "Activité",
        icone: "receipt_long",
        onglets: [
            { cle: "commandes", libelle: "Commandes" },
            { cle: "horaires", libelle: "Horaires" },
            { cle: "avis", libelle: "Avis" },
        ],
    },
    {
        cle: "offre",
        libelle: "Catalogue",
        icone: "restaurant_menu",
        onglets: [
            { cle: "catalogue", libelle: "Produits" },
            { cle: "collections", libelle: "Collections" },
            { cle: "photos", libelle: "Photos" },
        ],
    },
    {
        // La régie : ce qu'il met en avant, et ce que cela rapporte.
        cle: "marketing",
        libelle: "Marketing",
        icone: "campaign",
        onglets: [
            { cle: "promotions", libelle: "Promotions" },
            { cle: "campagnes", libelle: "Sponsorings" },
            // À qui il s'adresse. Juste après les sponsorings : c'est en
            // composant une opération qu'on découvre qu'on voudrait viser ceux
            // qui aiment les grillades.
            { cle: "audiences", libelle: "Audiences" },
            { cle: "statistiques", libelle: "Statistiques" },
        ],
    },
    {
        cle: "livraison",
        libelle: "Livraison",
        icone: "local_shipping",
        onglets: [
            { cle: "livraison", libelle: "Frais" },
            { cle: "livreurs", libelle: "Livreurs" },
        ],
    },
    {
        cle: "finances",
        libelle: "Finances",
        icone: "payments",
        onglets: [
            { cle: "revenus", libelle: "Revenus" },
            { cle: "paiement", libelle: "Moyens de paiement" },
        ],
    },
    {
        cle: "reglages",
        libelle: "Réglages",
        icone: "settings",
        onglets: [
            { cle: "boutique", libelle: "Boutique" },
            { cle: "equipe", libelle: "Équipe" },
        ],
    },
];

export default function MerchantSpace({ onLogout }: MerchantSpaceProps) {
    const { merchantId } = useParams<{ merchantId: string }>();

    const [marchand, setMarchand] = useState<Marchand | null>(null);
    const [boutique, setBoutique] = useState<Boutique | null>(null);
    const [onglet, setOnglet] = useState<Onglet>("commandes");
    const [livreurs, setLivreurs] = useState<Livreur[]>([]);

    /** Les types de véhicule qui livrent : moto, tricycle, fourgon. */
    const [typesVehicule, setTypesVehicule] = useState<{ id: number; libelle: string }[]>([]);
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

        // Les types de véhicule, une fois : la liste ne bouge pas d'une
        // session à l'autre.
        if (typesVehicule.length > 0) return;

        try {
            const { data } = await api.getData(`v3/merchant/${merchantId}/couriers/categories`);

            if (data.success) setTypesVehicule(data.data ?? []);
        } catch {
            // Sans la liste, le formulaire retombe sur la moto : c'est le cas
            // courant, et mieux vaut un ajout possible qu'un écran bloqué.
        }
    };

    useEffect(() => {
        charger();
    }, [merchantId]);

    useEffect(() => {
        if (onglet === "livreurs") chargerLivreurs();
    }, [onglet]);

    /**
     * Ajouter un livreur, en deux temps.
     *
     * Le formulaire demandait « l'identifiant de son compte Ongo » : le
     * numéro de ligne en base. Un restaurateur ne l'a jamais vu de sa vie —
     * il connaît le téléphone de son livreur. L'écran était donc inutilisable
     * sans que quelqu'un ouvre la base à sa place.
     *
     * Le nom s'affiche avant de valider, comme pour un envoi d'argent : un
     * chiffre de trop rattache le livreur de quelqu'un d'autre, et rien à
     * l'écran ne l'aurait dit.
     */
    const ajouterLivreur = async () => {
        const choix = await Swal.fire({
            title: "Ajouter un livreur",
            html:
                `<input id="phone" class="swal2-input" type="tel" placeholder="Son numéro : 6 55 00 11 22">` +
                `<input id="matricule" class="swal2-input" placeholder="Immatriculation de son véhicule">` +
                `<input id="modele" class="swal2-input" placeholder="Modèle (facultatif)">` +
                (typesVehicule.length > 0
                    ? `<select id="categorie" class="swal2-select" style="width:min(100%,20.5em);margin:1em auto 0">` +
                      typesVehicule
                          .map((t) => `<option value="${t.id}">${t.libelle}</option>`)
                          .join("") +
                      `</select>`
                    : "") +
                `<p style="font-size:13px;color:#64748b;margin-top:8px">Il doit déjà avoir un compte Ongo — le même que pour commander une course.</p>`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: "Continuer",
            cancelButtonText: "Annuler",
            preConfirm: () => ({
                phone: (document.getElementById("phone") as HTMLInputElement)?.value,
                matricule: (document.getElementById("matricule") as HTMLInputElement)?.value,
                modele: (document.getElementById("modele") as HTMLInputElement)?.value,
                categorie: (document.getElementById("categorie") as HTMLSelectElement)?.value,
            }),
        });

        if (!choix.isConfirmed || !choix.value?.phone || !choix.value?.matricule) return;

        // Qui est derrière ce numéro ? On le montre avant d'engager quoi que
        // ce soit.
        let compte: { nom: string; telephone: string; already: boolean };

        try {
            const { data } = await api.postData(`v3/merchant/${merchantId}/couriers/lookup`, {
                phone: choix.value.phone,
            });

            if (!data.success) {
                Swal.fire({ icon: "error", title: "Compte introuvable", text: data.message });

                return;
            }

            compte = data.data;
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Recherche impossible", text: String(erreur) });

            return;
        }

        if (compte.already) {
            Swal.fire({
                icon: "info",
                title: `${compte.nom} est déjà l'un de vos livreurs`,
                text: "Rien à ajouter.",
            });

            return;
        }

        const confirmation = await Swal.fire({
            icon: "question",
            title: compte.nom || compte.telephone,
            html:
                `<p style="font-size:14px;color:#334155">${compte.telephone}</p>` +
                `<p style="font-size:13px;color:#64748b;margin-top:10px">Ajouter cette personne à vos livreurs ?</p>`,
            showCancelButton: true,
            confirmButtonText: "Oui, c'est lui",
            cancelButtonText: "Non",
        });

        if (!confirmation.isConfirmed) return;

        try {
            const { data } = await api.postData(`v3/merchant/${merchantId}/couriers`, {
                phone: choix.value.phone,
                matricule: choix.value.matricule,
                modele: choix.value.modele,
                categorie_id: choix.value.categorie ? Number(choix.value.categorie) : undefined,
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

                    {/*
                        Sans ce bouton, un compte envoyé sur le mauvais espace n'a
                        plus aucune sortie : ni barre latérale, ni menu, et l'URL
                        le ramène ici à chaque ouverture.
                    */}
                    <button
                        onClick={onLogout}
                        className="mt-6 px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium dark:bg-white dark:text-slate-900"
                    >
                        Se déconnecter
                    </button>
                </div>
            </div>
        );
    }

    // La cuisine voit ses commandes, et les horaires pour fermer ou ouvrir
    // dans la journée ; ni le catalogue, ni les livreurs, ni l'argent. Un
    // seul groupe, donc : sa rangée ne s'affiche pas.
    const visibles: Groupe[] =
        marchand.role === "staff"
            ? [{ ...GROUPES[0], onglets: GROUPES[0].onglets.slice(0, 2) }]
            : GROUPES;

    const groupeOuvert = visibles.find((g) => g.onglets.some((o) => o.cle === onglet)) ?? visibles[0];

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

                        <div className="flex items-center gap-3 shrink-0">
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

                            {/*
                                L'espace marchand n'emprunte pas la barre latérale
                                d'administration : c'est voulu, mais la déconnexion
                                y vivait, et un restaurateur restait connecté sans
                                aucun moyen de sortir.
                            */}
                            <button
                                onClick={onLogout}
                                title="Se déconnecter"
                                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
                            >
                                <span className="material-symbols-outlined text-xl">logout</span>
                                <span className="hidden sm:inline">Déconnexion</span>
                            </button>
                        </div>
                    </div>

                    {/*
                        Deux niveaux : la famille, puis l'écran.

                        Ouvrir une famille mène à son premier écran — un groupe
                        sélectionné qui n'afficherait rien serait un clic pour
                        rien. Un seul groupe (la cuisine) et sa rangée
                        disparaît : un onglet unique n'est pas un choix.
                    */}
                    {visibles.length > 1 && (
                        <nav className="flex flex-wrap gap-2 mt-5">
                            {visibles.map((groupe) => {
                                const ouvert = groupe.cle === groupeOuvert.cle;

                                return (
                                    <button
                                        key={groupe.cle}
                                        onClick={() => setOnglet(groupe.onglets[0].cle)}
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition ${
                                            ouvert
                                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                                : "bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white"
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-lg">{groupe.icone}</span>
                                        {groupe.libelle}
                                    </button>
                                );
                            })}
                        </nav>
                    )}

                    <nav className="flex gap-6 mt-4 overflow-x-auto whitespace-nowrap">
                        {groupeOuvert.onglets.map(({ cle, libelle }) => (
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
                ) : onglet === "boutique" ? (
                    <StoreProfile merchantId={merchantId!} storeId={boutique.id} canEdit={marchand.role !== "staff"} />
                ) : onglet === "paiement" ? (
                    <PaymentMethods merchantId={merchantId!} storeId={boutique.id} canEdit={marchand.role !== "staff"} />
                ) : onglet === "avis" ? (
                    <Reviews merchantId={merchantId!} storeId={boutique.id} />
                ) : onglet === "equipe" ? (
                    <Team merchantId={merchantId!} />
                ) : onglet === "photos" ? (
                    <MediaGallery galerie={galerieMarchand(merchantId!)} canDelete={marchand.role !== "staff"} />
                ) : onglet === "catalogue" ? (
                    <Catalog merchantId={merchantId!} storeId={boutique.id} storeType={boutique.type} />
                ) : onglet === "horaires" ? (
                    <Hours merchantId={merchantId!} storeId={boutique.id} storeName={boutique.name} canEditWeek={marchand.role !== "staff"} />
                ) : onglet === "collections" ? (
                    <Collections merchantId={merchantId!} storeId={boutique.id} canEdit={marchand.role !== "staff"} />
                ) : onglet === "promotions" ? (
                    <Promotions merchantId={merchantId!} storeId={boutique.id} storeName={boutique.name} />
                ) : onglet === "livraison" ? (
                    <Delivery merchantId={merchantId!} storeId={boutique.id} />
                ) : onglet === "revenus" ? (
                    <Revenue merchantId={merchantId!} storeId={boutique?.id ?? null} isOwner={marchand.role === "owner"} />
                ) : onglet === "campagnes" ? (
                    <Sponsorships merchantId={merchantId!} canEdit={marchand.role !== "staff"} />
                ) : onglet === "audiences" ? (
                    <Audiences merchantId={merchantId!} canEdit={marchand.role !== "staff"} />
                ) : onglet === "statistiques" ? (
                    <Stats merchantId={merchantId!} />
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
