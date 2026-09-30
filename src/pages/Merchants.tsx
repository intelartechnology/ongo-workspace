import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";
import OwnerPicker from "./components/OwnerPicker";
import type { CompteOngo } from "./components/OwnerPicker";
import StoreProfileForm from "./components/StoreProfileForm";
import type { Cuisine, Fiche } from "./components/StoreProfileForm";

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
 * un rôle de plus. On le **retrouve par son numéro** et on l'affiche pour
 * confirmation : l'écran demandait jusqu'ici son identifiant utilisateur, un
 * nombre que personne ne connaît.
 *
 * La création se fait en deux temps, dans le même panneau : l'identité, puis
 * la **fiche** de la première boutique — logo, bannière, couleur, description,
 * cuisines, latitude et longitude. Cette fiche est le formulaire de l'espace
 * marchand, `StoreProfileForm`, tel quel : mêmes champs, mêmes règles, même
 * aperçu de ce que le client verra. Sans elle, l'administration ouvrait des
 * restaurants sans photo ni position — donc invisibles dans les listes, et
 * hors de portée de la répartition, qui part de leur latitude.
 *
 * Le second temps n'est pas qu'une étape de création : la même fiche se rouvre
 * depuis la liste, et c'est ainsi qu'on modifie une boutique après coup.
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

    /** Les cuisines, pour la fiche. Une fois, et légères. */
    const [cuisines, setCuisines] = useState<Cuisine[]>([]);

    const [nouveau, setNouveau] = useState({
        name: "",
        phone: "",
        email: "",
        store_name: "",
        store_phone: "",
        store_type: "restaurant",

        /*
         * La position de la première boutique, dès l'étape 1.
         *
         * Obligatoire, et ici plutôt qu'à l'étape de la fiche : le serveur
         * l'exige à la création, et rien n'oblige celui qui crée à aller
         * jusqu'à l'étape 2. Une boutique sans coordonnées n'est proposée à
         * aucun livreur — `CourierDispatch` les cherche autour d'elle — et rien
         * à l'écran ne dirait pourquoi elle ne reçoit personne.
         */
        latitude: "",
        longitude: "",
    });

    /** Le compte Ongo retenu comme responsable, affiché avant la création. */
    const [responsable, setResponsable] = useState<CompteOngo | null>(null);

    /**
     * La boutique dont on remplit la fiche : celle qu'on vient de créer, ou
     * celle qu'on rouvre depuis la liste. Le même formulaire dans les deux cas.
     */
    const [fiche, setFiche] = useState<{ store: Fiche; merchantId: number; nouvelle: boolean } | null>(null);

    /** Le marchand dont on modifie l'identité — nom, téléphone, email. */
    const [edition, setEdition] = useState<{ marchand: Marchand; name: string; phone: string; email: string } | null>(null);

    /** Le nouveau responsable, pendant un changement. */
    const [repreneur, setRepreneur] = useState<CompteOngo | null>(null);

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

    /**
     * Les cuisines, une fois pour l'écran.
     *
     * Elles viennent de `admin/tags` et non de la liste des boutiques : celle-là
     * rend cinq cents fiches pour deux colonnes dont on a besoin.
     */
    useEffect(() => {
        api.getData("v3/admin/eat/tags")
            .then(({ data }) => {
                if (data.success) setCuisines((data.data ?? []).map((t: Cuisine) => ({ slug: t.slug, name: t.name })));
            })
            .catch(() => setCuisines([]));
    }, []);

    const creer = async () => {
        if (!nouveau.name.trim() || !responsable || !nouveau.store_name.trim() || !nouveau.store_phone.trim()) {
            Swal.fire({
                icon: "info",
                title: "Il manque l'essentiel",
                text: "Le nom, le responsable, la première boutique et son téléphone sont requis.",
            });

            return;
        }

        if (!Number.isFinite(Number(nouveau.latitude)) || nouveau.latitude.trim() === ""
            || !Number.isFinite(Number(nouveau.longitude)) || nouveau.longitude.trim() === "") {
            Swal.fire({
                icon: "info",
                title: "Position manquante",
                text: "La latitude et la longitude de la boutique sont obligatoires : sans elles, aucun livreur ne lui est proposé.",
            });

            return;
        }

        setEnvoi(true);

        try {
            const { data } = await api.postData("v3/admin/merchants", {
                ...nouveau,
                owner_id: responsable.id,

                // Des nombres : le serveur les valide entre −90 et 90.
                latitude: Number(nouveau.latitude),
                longitude: Number(nouveau.longitude),
            });

            if (data.success) {
                /*
                 * Le panneau ne se referme pas : il passe à la fiche.
                 *
                 * C'est le seul moment où l'on tient celui qui fait entrer le
                 * marchand. Lui demander de retrouver la boutique dans un autre
                 * écran pour y mettre un logo, c'est un logo qui n'arrive jamais.
                 */
                if (data.data?.store) {
                    setFiche({
                        store: data.data.store as Fiche,
                        merchantId: Number(data.data.merchant?.id ?? 0),
                        nouvelle: true,
                    });
                }

                setNouveau({
                    name: "", phone: "", email: "",
                    store_name: "", store_phone: "", store_type: "restaurant",
                    latitude: "", longitude: "",
                });
                setResponsable(null);
                await charger();

                /*
                 * Le compte du restaurant naît avec lui.
                 *
                 * C'est celui qui détiendra sa caisse, séparée de celle de son
                 * propriétaire. Le mot de passe provisoire ne s'affiche qu'une
                 * fois : il n'est stocké nulle part en clair.
                 */
                if (data.data?.account_password) {
                    await Swal.fire({
                        icon: "success",
                        title: "Marchand créé",
                        html:
                            `<p style="font-size:14px">Le compte du restaurant est ouvert.</p>` +
                            `<p style="font-size:13px;color:#64748b;margin-top:8px">Identifiant <b>${nouveau.store_phone}</b></p>` +
                            `<p style="font-size:28px;font-weight:800;letter-spacing:4px;margin:12px 0">${data.data.account_password}</p>` +
                            `<p style="font-size:13px;color:#b91c1c">Notez-le maintenant : il ne s'affichera plus. Transmettez-le au propriétaire, qui le changera depuis l'application.</p>`,
                        confirmButtonText: "J'ai noté",
                    });
                } else if (data.data?.account_message) {
                    await Swal.fire({
                        icon: "warning",
                        title: "Marchand créé, compte non ouvert",
                        text: data.data.account_message,
                    });
                } else {
                    Swal.fire({ icon: "success", title: "Marchand créé", timer: 1600, showConfirmButton: false });
                }
            } else {
                Swal.fire({ icon: "error", title: "Création refusée", text: data.message });
            }
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Création impossible", text: String(erreur) });
        }

        setEnvoi(false);
    };

    /**
     * Enregistrer la fiche d'une boutique.
     *
     * La même route que l'écran des boutiques — `admin/eat/stores` —, donc les
     * mêmes règles côté serveur. Rien n'est réécrit ici : ce formulaire est
     * celui de l'espace marchand, et il doit enregistrer là où l'espace
     * marchand enregistre.
     */
    const enregistrerLaFiche = async (champs: Record<string, unknown>) => {
        if (!fiche) return false;

        const { data } = await api.postData("v3/admin/eat/stores", { id: fiche.store.id, ...champs });

        if (!data.success) {
            Swal.fire({ icon: "error", title: "Fiche refusée", text: data.message });
            return false;
        }

        setFiche({ ...fiche, store: { ...fiche.store, ...data.data } });
        await charger();

        Swal.fire({ icon: "success", title: "Fiche enregistrée", timer: 1200, showConfirmButton: false });

        return true;
    };

    /** Ouvrir la fiche d'une boutique de la liste : la même, pour la modifier. */
    const ouvrirLaFiche = async (boutique: Boutique, marchand: Marchand) => {
        try {
            const { data } = await api.getData("v3/admin/merchants/store", { store_id: boutique.id });

            if (!data.success) {
                Swal.fire({ icon: "error", title: "Fiche illisible", text: data.message });
                return;
            }

            setFormulaire(false);
            setEdition(null);
            setFiche({ store: data.data as Fiche, merchantId: Number(data.data.merchant_id ?? marchand.id), nouvelle: false });
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Fiche illisible", text: String(erreur) });
        }
    };

    /** Modifier l'enseigne : son nom, son numéro, son email. */
    const enregistrerLEnseigne = async () => {
        if (!edition) return;

        setEnvoi(true);

        try {
            const { data } = await api.postData("v3/admin/merchants/update", {
                merchant_id: edition.marchand.short_id,
                name: edition.name,
                phone: edition.phone,
                email: edition.email,
            });

            if (data.success) {
                setEdition(null);
                await charger();
                Swal.fire({ icon: "success", title: "Enseigne enregistrée", timer: 1200, showConfirmButton: false });
            } else {
                Swal.fire({ icon: "error", title: "Refusé", text: data.message });
            }
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Enregistrement impossible", text: String(erreur) });
        }

        setEnvoi(false);
    };

    /**
     * Donner l'enseigne à un autre responsable.
     *
     * L'ancien perd l'accès — sa caisse, ses retraits, son espace. Ce n'est pas
     * une nuance : on le nomme dans la confirmation, et le nouveau aussi.
     */
    const changerLeResponsable = async (marchand: Marchand) => {
        if (!repreneur) return;

        const accord = await Swal.fire({
            icon: "warning",
            title: `Confier ${marchand.name} à ${repreneur.nom || "ce compte"} ?`,
            html:
                `<p style="font-size:14px">${repreneur.nom || "Ce compte"} — ${repreneur.telephone ?? "—"} — deviendra responsable.</p>` +
                `<p style="font-size:13px;color:#b91c1c;margin-top:8px">Le responsable actuel perd l'accès à l'espace, à la caisse et aux retraits. Sa trace est conservée.</p>`,
            showCancelButton: true,
            confirmButtonText: "Confier l'enseigne",
            cancelButtonText: "Annuler",
        });

        if (!accord.isConfirmed) return;

        try {
            const { data } = await api.postData("v3/admin/merchants/update", {
                merchant_id: marchand.short_id,
                owner_id: repreneur.id,
            });

            if (data.success) {
                setRepreneur(null);
                setEdition(null);
                await charger();
                Swal.fire({ icon: "success", title: "Responsable changé", timer: 1400, showConfirmButton: false });
            } else {
                Swal.fire({ icon: "error", title: "Refusé", text: data.message });
            }
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Changement impossible", text: String(erreur) });
        }
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
                        <h2 className="font-semibold text-slate-900 dark:text-white">Faire entrer un marchand · étape 1 sur 2</h2>
                        <p className="text-sm text-slate-500 mt-1 mb-5">
                            L'identité d'abord. La fiche de la boutique — logo, bannière, cuisines, position — vient
                            juste après, sans quitter cet écran.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { cle: "name", libelle: "Nom de l'enseigne", exemple: "Chez Mama" },
                                { cle: "phone", libelle: "Téléphone de l'enseigne", exemple: "699 00 00 00" },
                                { cle: "email", libelle: "Email", exemple: "contact@chezmama.cm" },
                                { cle: "store_name", libelle: "Première boutique", exemple: "Chez Mama Akwa" },
                                { cle: "store_phone", libelle: "Téléphone de la boutique", exemple: "699 00 00 01" },
                                { cle: "latitude", libelle: "Latitude de la boutique *", exemple: "4.0483" },
                                { cle: "longitude", libelle: "Longitude de la boutique *", exemple: "9.7043" },
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

                            {/* Le responsable, trouvé par son numéro et affiché pour confirmation. */}
                            <div className="md:col-span-2">
                                <OwnerPicker choisi={responsable} onChoisir={setResponsable} />
                            </div>

                            <p className="md:col-span-2 text-xs text-slate-400">
                                La position est obligatoire : elle fait les frais et le délai, et c'est autour d'elle
                                qu'on cherche les livreurs. Sans elle, la boutique ne reçoit aucune proposition.
                            </p>
                        </div>

                        <button
                            onClick={creer}
                            disabled={envoi}
                            className="mt-6 px-5 py-2.5 rounded-lg text-sm font-medium bg-slate-900 text-white disabled:bg-slate-300 dark:bg-white dark:text-slate-900"
                        >
                            {envoi ? "Création…" : "Créer, puis remplir la fiche"}
                        </button>
                    </section>
                )}

                {/*
                 * La fiche : second temps de la création, et seul chemin pour la
                 * modifier ensuite. Le formulaire est celui de l'espace marchand.
                 */}
                {fiche && (
                    <section className="mb-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                        <div className="flex items-start justify-between gap-4 mb-5">
                            <div>
                                <h2 className="font-semibold text-slate-900 dark:text-white">
                                    {fiche.nouvelle ? "Faire entrer un marchand · étape 2 sur 2" : "Fiche de la boutique"}
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">
                                    {fiche.store.name} — ce que le client voit, et ce dont la livraison a besoin :
                                    la latitude et la longitude font les délais et les frais.
                                </p>
                            </div>

                            <button
                                onClick={() => setFiche(null)}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 shrink-0"
                            >
                                {fiche.nouvelle ? "Terminer" : "Fermer"}
                            </button>
                        </div>

                        <StoreProfileForm
                            key={fiche.store.id}
                            fiche={fiche.store}
                            cuisines={cuisines}
                            onSave={enregistrerLaFiche}
                            merchantId={fiche.merchantId}
                        />
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

                                        {/*
                                          * Une boutique se touche pour ouvrir sa fiche.
                                          *
                                          * C'est le même formulaire que la création, et le
                                          * seul endroit d'où l'administration change un
                                          * logo, une position ou des cuisines sans passer
                                          * par l'écran des boutiques.
                                          */}
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {(marchand.stores ?? []).map((boutique) => (
                                                <button
                                                    key={boutique.public_id}
                                                    onClick={() => ouvrirLaFiche(boutique, marchand)}
                                                    className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:ring-1 hover:ring-slate-400"
                                                >
                                                    {boutique.name} · {TYPES[boutique.type] ?? boutique.type}
                                                    {boutique.city ? ` · ${boutique.city}` : ""}
                                                    <span className="ml-1 text-slate-400">· fiche</span>
                                                </button>
                                            ))}
                                        </div>

                                        {/* L'identifiant que le marchand verra dans son URL. */}
                                        <p className="text-xs text-slate-400 mt-3 font-mono">/merchant/{marchand.short_id}</p>

                                        {/* Modifier l'enseigne, et son responsable. */}
                                        {edition?.marchand.public_id === marchand.public_id && (
                                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    {([
                                                        { cle: "name", libelle: "Nom de l'enseigne" },
                                                        { cle: "phone", libelle: "Téléphone" },
                                                        { cle: "email", libelle: "Email" },
                                                    ] as const).map((champ) => (
                                                        <label key={champ.cle} className="block">
                                                            <span className="text-xs font-semibold text-slate-500 uppercase">{champ.libelle}</span>
                                                            <input
                                                                value={edition[champ.cle]}
                                                                onChange={(e) => setEdition({ ...edition, [champ.cle]: e.target.value })}
                                                                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                            />
                                                        </label>
                                                    ))}
                                                </div>

                                                <div className="flex gap-2 mt-3">
                                                    <button
                                                        onClick={enregistrerLEnseigne}
                                                        disabled={envoi}
                                                        className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"
                                                    >
                                                        {envoi ? "Enregistrement…" : "Enregistrer"}
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            setEdition(null);
                                                            setRepreneur(null);
                                                        }}
                                                        className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                                                    >
                                                        Annuler
                                                    </button>
                                                </div>

                                                <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800">
                                                    <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
                                                        Changer le responsable
                                                    </p>

                                                    <OwnerPicker
                                                        choisi={repreneur}
                                                        onChoisir={setRepreneur}
                                                        libelle="Nouveau responsable"
                                                    />

                                                    {repreneur && (
                                                        <button
                                                            onClick={() => changerLeResponsable(marchand)}
                                                            className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-amber-600 text-white"
                                                        >
                                                            Confier l'enseigne à {repreneur.nom || "ce compte"}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2 shrink-0">
                                        <button
                                            onClick={() => {
                                                setFiche(null);
                                                setRepreneur(null);
                                                setEdition(
                                                    edition?.marchand.public_id === marchand.public_id
                                                        ? null
                                                        : {
                                                            marchand,
                                                            name: marchand.name ?? "",
                                                            phone: marchand.phone ?? "",
                                                            email: marchand.email ?? "",
                                                        }
                                                );
                                            }}
                                            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                                        >
                                            {edition?.marchand.public_id === marchand.public_id ? "Fermer" : "Modifier"}
                                        </button>

                                        <button
                                            onClick={() => basculer(marchand)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                                                marchand.status === "suspended"
                                                    ? "bg-emerald-600 text-white"
                                                    : "border border-red-300 text-red-600 dark:border-red-800 dark:text-red-400"
                                            }`}
                                        >
                                            {marchand.status === "suspended" ? "Réactiver" : "Suspendre"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
