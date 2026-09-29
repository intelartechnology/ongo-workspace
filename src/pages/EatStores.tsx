import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import StoreProfileForm from "./components/StoreProfileForm";
import ImageField from "./components/ImageField";
import { envoyerSiBesoin, galerieMarchand } from "../services/images";
import type { Cuisine, Fiche } from "./components/StoreProfileForm";

/**
 * Les boutiques Ongo Eat, vues d'Ongo.
 *
 * La fiche (la même que le marchand règle lui-même), plus ce qu'Ongo seul
 * décide : le nom, le type, le statut, la mise en avant dans la mosaïque
 * d'accueil — et l'ouverture d'une boutique de plus pour un marchand.
 */

interface Boutique extends Fiche {
    type: string;
    sponsored_until?: string | null;
    sponsored_label?: string | null;
    status: string;
    is_featured: boolean;
    public_id: string;
    rating_count: number;
    merchant_id: number;
    merchant_name: string | null;

    /**
     * Son compte est-il ouvert ?
     *
     * C'est lui qui détient sa caisse : un portefeuille appartient à un
     * utilisateur, et verser au marchand créditait le compte personnel de son
     * propriétaire. Sans compte, rien ne peut être versé à ce restaurant sur un
     * portefeuille.
     */
    has_account: boolean;
}

interface EatStoresProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const champ = "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white";

const TYPES: Record<string, string> = { restaurant: "Restaurant", supermarket: "Supermarché", convenience: "Épicerie", pharmacy: "Pharmacie" };

export default function EatStores({ onLogout, theme, toggleTheme }: EatStoresProps) {
    const [boutiques, setBoutiques] = useState<Boutique[]>([]);
    const [cuisines, setCuisines] = useState<Cuisine[]>([]);
    const [marchands, setMarchands] = useState<{ id: number; name: string }[]>([]);
    const [recherche, setRecherche] = useState("");
    const [ouverte, setOuverte] = useState<Boutique | null>(null);
    const [nouvelle, setNouvelle] = useState<{
        merchant_id: string;
        name: string;
        type: string;
        city: string;
        address: string;
        phone: string;
        logo: string;
        banner: string;
        brand_color: string;
    } | null>(null);

    /** Les fichiers choisis sur l'ordinateur, envoyés au clic sur « Ouvrir ». */
    const [images, setImages] = useState<{ logo: File | null; banner: File | null }>({ logo: null, banner: null });

    const api = new ApiService();

    const charger = async () => {
        try {
            const { data } = await api.getData("v3/admin/eat/stores", recherche ? { q: recherche } : undefined);

            if (data.success) {
                setBoutiques(data.data.stores ?? []);
                setCuisines(data.data.tags ?? []);
                setMarchands(data.data.merchants ?? []);
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Boutiques illisibles", text: String(erreur) });
        }
    };

    useEffect(() => {
        const minuteur = setTimeout(charger, 250);
        return () => clearTimeout(minuteur);
    }, [recherche]);

    const enregistrer = async (champs: Record<string, unknown>) => {
        if (!ouverte) return false;

        const { data } = await api.postData("v3/admin/eat/stores", { id: ouverte.id, ...champs });

        if (!data.success) {
            Swal.fire({ icon: "error", title: data.message });
            return false;
        }

        Swal.fire({ icon: "success", title: data.message, timer: 1200, showConfirmButton: false });
        charger();

        return true;
    };

    const changer = async (b: Boutique, champs: Record<string, unknown>) => {
        const { data } = await api.postData("v3/admin/eat/stores", { id: b.id, ...champs });

        if (!data.success) return Swal.fire({ icon: "error", title: data.message });

        if (ouverte?.id === b.id) setOuverte({ ...ouverte, ...data.data });
        charger();
    };

    /**
     * Ouvrir le compte d'un restaurant.
     *
     * Le mot de passe provisoire est affiché **une seule fois** : il n'est
     * stocké nulle part en clair. Celui qui ouvre le compte le transmet au
     * propriétaire, qui le change depuis l'application.
     */
    const ouvrirLeCompte = async (b: Boutique) => {
        const confirmation = await Swal.fire({
            icon: "question",
            title: `Ouvrir le compte de ${b.name} ?`,
            html:
                `<p style="font-size:14px">Ce compte détiendra la caisse du restaurant, séparée de celle de son propriétaire.</p>` +
                `<p style="font-size:13px;color:#64748b;margin-top:8px">Identifiant : <b>${b.phone ?? "—"}</b></p>`,
            showCancelButton: true,
            confirmButtonText: "Ouvrir",
            cancelButtonText: "Annuler",
        });

        if (!confirmation.isConfirmed) return;

        try {
            const { data } = await api.postData("v3/admin/eat/stores/account", { store_id: b.id });

            if (!data.success) {
                Swal.fire({ icon: "error", title: "Compte non ouvert", text: data.message });
                return;
            }

            await montrerLeMotDePasse(b, data.data.password, data.data.telephone);
            await charger();
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Ouverture impossible", text: String(erreur) });
        }
    };

    /** Refaire le mot de passe, quand il a été perdu. */
    const renouvelerLeCompte = async (b: Boutique) => {
        const confirmation = await Swal.fire({
            icon: "warning",
            title: `Refaire le mot de passe de ${b.name} ?`,
            text: "L'ancien ne fonctionnera plus. Le nouveau ne s'affichera qu'une fois.",
            showCancelButton: true,
            confirmButtonText: "Refaire",
            cancelButtonText: "Annuler",
        });

        if (!confirmation.isConfirmed) return;

        try {
            const { data } = await api.postData("v3/admin/eat/stores/account/reset", { store_id: b.id });

            if (!data.success) {
                Swal.fire({ icon: "error", title: "Non renouvelé", text: data.message });
                return;
            }

            await montrerLeMotDePasse(b, data.data.password, data.data.telephone);
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Renouvellement impossible", text: String(erreur) });
        }
    };

    /**
     * Le montrer, une fois, en disant qu'il ne reviendra pas.
     *
     * Il n'est stocké nulle part en clair : fermer cette fenêtre sans l'avoir
     * noté oblige à en refaire un.
     */
    const montrerLeMotDePasse = (b: Boutique, motDePasse: string, numero: string) =>
        Swal.fire({
            icon: "success",
            title: `Compte de ${b.name}`,
            html:
                `<p style="font-size:14px">Identifiant <b>${numero}</b></p>` +
                `<p style="font-size:28px;font-weight:800;letter-spacing:4px;margin:12px 0">${motDePasse}</p>` +
                `<p style="font-size:13px;color:#b91c1c">Notez-le maintenant : il ne s'affichera plus. Transmettez-le au propriétaire, qui le changera depuis l'application.</p>`,
            confirmButtonText: "J'ai noté",
        });

    const mettreEnAvant = async (b: Boutique) => {
        const { data } = await api.postData("v3/admin/eat/stores/feature", { id: b.id, is_featured: !b.is_featured });

        if (!data.success) return Swal.fire({ icon: "error", title: data.message });

        charger();
    };

    /**
     * Mise en avant payée : la boutique passe devant dans les listes, et le
     * client lit « Sponsorisé » — la mention est obligatoire.
     */
    const sponsoriser = async (b: Boutique) => {
        const actif = !!b.sponsored_until && new Date(b.sponsored_until) > new Date();

        if (actif) {
            await changer(b, { sponsored_until: null, sponsored_label: null });
            return;
        }

        const { value } = await Swal.fire({
            title: `Sponsoriser ${b.name}`,
            html:
                `<input id="jours" class="swal2-input" type="number" min="1" max="90" value="7" placeholder="Jours">` +
                `<input id="mention" class="swal2-input" value="Sponsorisé" maxlength="40" placeholder="Mention affichée">`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: "Sponsoriser",
            cancelButtonText: "Annuler",
            preConfirm: () => ({
                jours: Number((document.getElementById("jours") as HTMLInputElement)?.value || 7),
                mention: (document.getElementById("mention") as HTMLInputElement)?.value || "Sponsorisé",
            }),
        });

        if (!value) return;

        const fin = new Date();
        fin.setDate(fin.getDate() + Math.min(90, Math.max(1, value.jours)));

        await changer(b, { sponsored_until: fin.toISOString().slice(0, 19).replace("T", " "), sponsored_label: value.mention });
    };

    const renommer = async (b: Boutique) => {
        const { value } = await Swal.fire({ title: "Nom de la boutique", input: "text", inputValue: b.name, showCancelButton: true, confirmButtonText: "Renommer", cancelButtonText: "Annuler" });

        if (value && value.trim() !== b.name) changer(b, { name: value.trim() });
    };

    const ouvrir = async () => {
        if (!nouvelle) return;

        // Les images passent par la galerie du marchand : la boutique n'a pas
        // encore d'identifiant, on range donc sous celle du marchand.
        const galerie = galerieMarchand(nouvelle.merchant_id);
        const logo = await envoyerSiBesoin(images.logo, nouvelle.logo || null, galerie, Number(nouvelle.merchant_id));
        const banner = await envoyerSiBesoin(images.banner, nouvelle.banner || null, galerie, Number(nouvelle.merchant_id));

        const { data } = await api.postData("v3/admin/eat/stores/create", {
            ...nouvelle,
            merchant_id: Number(nouvelle.merchant_id),
            logo,
            banner,
        });

        if (!data.success) return Swal.fire({ icon: "error", title: data.message });

        /*
         * Le compte du restaurant naît avec lui.
         *
         * C'est celui qui détiendra sa caisse. Le mot de passe provisoire ne
         * s'affiche qu'une fois : il n'est stocké nulle part en clair.
         */
        if (data.data?.account_password) {
            await Swal.fire({
                icon: "success",
                title: "Boutique ouverte",
                html:
                    `<p style="font-size:14px">Son compte est ouvert : c'est lui qui détiendra sa caisse.</p>` +
                    `<p style="font-size:13px;color:#64748b;margin-top:8px">Identifiant <b>${nouvelle.phone}</b></p>` +
                    `<p style="font-size:28px;font-weight:800;letter-spacing:4px;margin:12px 0">${data.data.account_password}</p>` +
                    `<p style="font-size:13px;color:#b91c1c">Notez-le maintenant : il ne s'affichera plus. Transmettez-le au propriétaire, qui le changera depuis l'application.</p>`,
                confirmButtonText: "J'ai noté",
            });
        } else if (data.data?.account_message) {
            await Swal.fire({
                icon: "warning",
                title: "Boutique ouverte, compte non ouvert",
                text: data.data.account_message,
            });
        } else {
            Swal.fire({ icon: "success", title: data.message, timer: 1200, showConfirmButton: false });
        }

        setNouvelle(null);
        setImages({ logo: null, banner: null });
        charger();
    };

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-8 py-6 max-w-7xl mx-auto flex items-start justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Boutiques</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            {boutiques.filter((b) => b.is_featured).length} mise(s) en avant dans la mosaïque d'accueil · la fiche est aussi réglable par le marchand
                        </p>
                    </div>
                    {!nouvelle && (
                        <button onClick={() => setNouvelle({ merchant_id: "", name: "", type: "restaurant", city: "Douala", address: "", phone: "", logo: "", banner: "", brand_color: "#111827" })} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium dark:bg-white dark:text-slate-900">
                            Ouvrir une boutique
                        </button>
                    )}
                </div>
            </header>

            <main className="px-8 py-8 max-w-7xl mx-auto space-y-6">
                {nouvelle && (
                    <div className="p-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <p className="text-sm text-slate-500 mb-4">Une boutique de plus pour un marchand existant. Pour un nouveau marchand, passez par « Marchands ».</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Marchand</span>
                                <select className={champ} value={nouvelle.merchant_id} onChange={(e) => setNouvelle({ ...nouvelle, merchant_id: e.target.value })}>
                                    <option value="">Choisir…</option>
                                    {marchands.map((m) => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Nom</span>
                                <input className={champ} value={nouvelle.name} placeholder="Chez Mama Bonamoussadi" onChange={(e) => setNouvelle({ ...nouvelle, name: e.target.value })} />
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Type</span>
                                <select className={champ} value={nouvelle.type} onChange={(e) => setNouvelle({ ...nouvelle, type: e.target.value })}>
                                    {Object.entries(TYPES).map(([cle, libelle]) => (
                                        <option key={cle} value={cle}>{libelle}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Ville</span>
                                <input className={champ} value={nouvelle.city} onChange={(e) => setNouvelle({ ...nouvelle, city: e.target.value })} />
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Téléphone <span className="text-rose-500">*</span></span>
                                <input className={champ} value={nouvelle.phone} placeholder="+237 6…" onChange={(e) => setNouvelle({ ...nouvelle, phone: e.target.value })} />
                                {/* Obligatoire : c'est le numéro que le livreur appelle depuis
                                    la commande. Facultatif, aucune boutique ne l'avait rempli. */}
                                <span className="text-xs text-slate-400">Le livreur l'appelle quand la commande n'est pas prête.</span>
                            </label>
                            <label className="md:col-span-2">
                                <span className="text-xs font-semibold uppercase text-slate-500">Adresse</span>
                                <input className={champ} value={nouvelle.address} onChange={(e) => setNouvelle({ ...nouvelle, address: e.target.value })} />
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Couleur de l'enseigne</span>
                                <input type="color" className={`${champ} h-10 p-1`} value={nouvelle.brand_color} onChange={(e) => setNouvelle({ ...nouvelle, brand_color: e.target.value })} />
                            </label>
                            <ImageField
                                label="Logo"
                                hint="Affiché sur fond de couleur dans « Commerces à proximité »"
                                forme="aspect-square"
                                owner="merchants"
                                galerie={galerieMarchand(nouvelle.merchant_id)}
                                adresse={nouvelle.logo}
                                fichier={images.logo}
                                disabled={!nouvelle.merchant_id}
                                onChange={(adresse, fichier) => { setNouvelle({ ...nouvelle, logo: adresse }); setImages({ ...images, logo: fichier }); }}
                            />
                            <ImageField
                                label="Bannière"
                                hint="En haut de la page de la boutique"
                                owner="merchants"
                                galerie={galerieMarchand(nouvelle.merchant_id)}
                                adresse={nouvelle.banner}
                                fichier={images.banner}
                                disabled={!nouvelle.merchant_id}
                                onChange={(adresse, fichier) => { setNouvelle({ ...nouvelle, banner: adresse }); setImages({ ...images, banner: fichier }); }}
                            />
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setNouvelle(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300">Annuler</button>
                            <button onClick={ouvrir} disabled={!nouvelle.merchant_id || !nouvelle.name.trim() || !nouvelle.phone.trim()} className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 dark:bg-white dark:text-slate-900">
                                Ouvrir
                            </button>
                        </div>
                    </div>
                )}

                {ouverte && (
                    <div className="p-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <p className="text-lg font-semibold text-slate-900 dark:text-white">{ouverte.name}</p>
                                <p className="text-sm text-slate-500">{ouverte.merchant_name} · {TYPES[ouverte.type] ?? ouverte.type}</p>
                            </div>
                            <button onClick={() => setOuverte(null)} className="text-sm text-slate-600 dark:text-slate-300">Fermer</button>
                        </div>
                        <StoreProfileForm key={ouverte.id} fiche={ouverte} cuisines={cuisines} onSave={enregistrer} merchantId={ouverte.merchant_id} />
                    </div>
                )}

                <input className={`${champ} max-w-sm`} value={recherche} placeholder="Rechercher une boutique" onChange={(e) => setRecherche(e.target.value)} />

                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs uppercase text-slate-500 text-left">
                            <tr>
                                <th className="px-5 py-3">Boutique</th>
                                <th className="px-5 py-3">Type</th>
                                <th className="px-5 py-3">Cuisines</th>
                                <th className="px-5 py-3">Préparation</th>
                                <th className="px-5 py-3">Note</th>
                                <th className="px-5 py-3">En avant</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {boutiques.map((b) => (
                                <tr key={b.id} className={b.status === "active" ? "" : "opacity-50"}>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                                                {b.logo && <img src={b.logo} alt="" className="w-full h-full object-cover" />}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">{b.name}</p>
                                                <p className="text-xs text-slate-500">{b.merchant_name}{b.status !== "active" ? " · suspendue" : ""}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <select className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" value={b.type} onChange={(e) => changer(b, { type: e.target.value })}>
                                            {Object.entries(TYPES).map(([cle, libelle]) => (
                                                <option key={cle} value={cle}>{libelle}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-5 py-3 text-xs text-slate-500">{b.tags.map((t) => cuisines.find((c) => c.slug === t)?.name ?? t).join(", ") || "—"}</td>
                                    <td className="px-5 py-3 text-slate-700 dark:text-slate-200">{b.prep_minutes} min</td>
                                    <td className="px-5 py-3 text-slate-700 dark:text-slate-200">{b.rating_avg ? `★ ${Number(b.rating_avg).toFixed(1)} (${b.rating_count})` : "—"}</td>
                                    <td className="px-5 py-3">
                                        <button onClick={() => mettreEnAvant(b)} title={b.is_featured ? "Retirer des raccourcis" : "Mettre dans les raccourcis de l'accueil"}>
                                            <span className={`material-symbols-outlined text-[22px] ${b.is_featured ? "text-amber-500 fill-1" : "text-slate-300"}`}>star</span>
                                        </button>
                                    </td>
                                    <td className="px-5 py-3 text-right whitespace-nowrap">
                                        <button onClick={() => sponsoriser(b)} className={`text-sm mr-4 ${b.sponsored_until && new Date(b.sponsored_until) > new Date() ? "text-amber-700 font-medium" : "text-slate-600 dark:text-slate-300"}`}>
                                            {b.sponsored_until && new Date(b.sponsored_until) > new Date() ? "Sponsorisée" : "Sponsoriser"}
                                        </button>
                                        <button
                                            onClick={() => (b.has_account ? renouvelerLeCompte(b) : ouvrirLeCompte(b))}
                                            className={`text-sm mr-4 ${
                                                b.has_account ? "text-slate-600 dark:text-slate-300" : "text-amber-700 font-medium"
                                            }`}
                                            title={
                                                b.has_account
                                                    ? "Refaire son mot de passe"
                                                    : "Ouvrir le compte qui détiendra sa caisse"
                                            }
                                        >
                                            {b.has_account ? "Compte" : "Ouvrir le compte"}
                                        </button>
                                        <button onClick={() => setOuverte(b)} className="text-sm text-slate-600 dark:text-slate-300 mr-4">Fiche</button>
                                        <button onClick={() => renommer(b)} className="text-sm text-slate-600 dark:text-slate-300 mr-4">Renommer</button>
                                        <button onClick={() => changer(b, { status: b.status === "active" ? "suspended" : "active" })} className={`text-sm ${b.status === "active" ? "text-rose-600" : "text-slate-900 dark:text-white"}`}>
                                            {b.status === "active" ? "Suspendre" : "Réactiver"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </MainLayout>
    );
}
