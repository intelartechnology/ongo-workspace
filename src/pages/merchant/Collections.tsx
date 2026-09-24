import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";
import ImageField from "../components/ImageField";
import { envoyerSiBesoin, galerieMarchand } from "../../services/images";

/**
 * Les collections d'une boutique : « Promotions du moment », « Remplir ses
 * placards », « Offres de snacks ».
 *
 * Une sélection d'articles, nommée, que le client voit en rangée sur l'écran
 * Magasins — avec votre logo et votre nom — et sur votre page.
 */

interface Article {
    id: number;
    name: string;
    image: string | null;
    price: number;
    compare_at_price: number | null;
}

interface Collection {
    id: number;
    title: string;
    subtitle: string | null;
    image: string | null;
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
    products: Article[];
}

interface CollectionsProps {
    merchantId: string;
    storeId: number;
    canEdit: boolean;
}

const champ = "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white";
const francs = (montant: number) => `${(montant ?? 0).toLocaleString("fr-FR")} F`;

const vide = {
    id: null as number | null,
    title: "",
    subtitle: "",
    image: "",
    starts_at: "",
    ends_at: "",
    products: [] as number[],
};

export default function Collections({ merchantId, storeId, canEdit }: CollectionsProps) {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [catalogue, setCatalogue] = useState<Article[]>([]);
    const [form, setForm] = useState<typeof vide | null>(null);
    const [fichier, setFichier] = useState<File | null>(null);
    const [recherche, setRecherche] = useState("");
    const [envoi, setEnvoi] = useState(false);

    const api = new ApiService();
    const base = `v3/merchant/${merchantId}/stores/${storeId}`;

    const charger = async () => {
        try {
            const [lesCollections, leCatalogue] = await Promise.all([api.getData(`${base}/collections`), api.getData(`${base}/catalog`)]);

            if (lesCollections.data.success) setCollections(lesCollections.data.data ?? []);

            if (leCatalogue.data.success) {
                // Tous les articles, rayons et sous-rayons confondus.
                const rayons = leCatalogue.data.data.sections ?? [];
                const tous: Article[] = rayons.flatMap((r: { products?: Article[]; children?: { products?: Article[] }[] }) => [
                    ...(r.products ?? []),
                    ...(r.children ?? []).flatMap((sous) => sous.products ?? []),
                ]);

                setCatalogue(tous);
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Collections illisibles", text: String(erreur) });
        }
    };

    useEffect(() => {
        charger();
    }, [base]);

    useEffect(() => setFichier(null), [form === null, form?.id]);

    const enregistrer = async () => {
        if (!form) return;

        setEnvoi(true);

        try {
            const image = await envoyerSiBesoin(fichier, form.image || null, galerieMarchand(merchantId));
            const { data } = await api.postData(`${base}/collections`, { ...form, image });

            setEnvoi(false);

            if (!data.success) {
                Swal.fire({ icon: "error", title: data.message });
                return;
            }
        } catch (erreur) {
            setEnvoi(false);
            Swal.fire({ icon: "error", title: "Image non envoyée", text: String((erreur as Error).message ?? erreur) });
            return;
        }

        Swal.fire({ icon: "success", title: "Collection enregistrée", timer: 1200, showConfirmButton: false });
        setForm(null);
        charger();
    };

    const basculer = async (c: Collection) => {
        const { data } = await api.postData(`${base}/collections/toggle`, { id: c.id, is_active: !c.is_active });

        if (data.success) charger();
        else Swal.fire({ icon: "error", title: data.message });
    };

    const supprimer = async (c: Collection) => {
        const reponse = await Swal.fire({
            icon: "question",
            title: `Supprimer « ${c.title} » ?`,
            text: "Vos articles ne sont pas supprimés, seulement la sélection.",
            showCancelButton: true,
            confirmButtonText: "Supprimer",
            cancelButtonText: "Annuler",
        });

        if (!reponse.isConfirmed) return;

        const { data } = await api.postData(`${base}/collections/delete`, { id: c.id });

        if (data.success) charger();
        else Swal.fire({ icon: "error", title: data.message });
    };

    const modifier = (c: Collection) =>
        setForm({
            id: c.id,
            title: c.title,
            subtitle: c.subtitle ?? "",
            image: c.image ?? "",
            starts_at: c.starts_at ? c.starts_at.slice(0, 16) : "",
            ends_at: c.ends_at ? c.ends_at.slice(0, 16) : "",
            products: c.products.map((p) => p.id),
        });

    const basculerArticle = (id: number) =>
        setForm((f) => (f === null ? f : { ...f, products: f.products.includes(id) ? f.products.filter((x) => x !== id) : [...f.products, id] }));

    const trouves = catalogue.filter((a) => a.name.toLowerCase().includes(recherche.toLowerCase()));

    return (
        <section className="space-y-6">
            <div className="flex items-start justify-between gap-6">
                <p className="text-sm text-slate-500 max-w-xl">
                    Une sélection d'articles, nommée. Elle s'affiche en rangée sur l'écran Magasins — avec votre logo et votre nom — et en haut de votre page.
                </p>
                {canEdit && !form && (
                    <button onClick={() => setForm({ ...vide })} className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 shrink-0">
                        Nouvelle collection
                    </button>
                )}
            </div>

            {form && (
                <div className="p-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label>
                            <span className="text-xs font-semibold uppercase text-slate-500">Titre</span>
                            <input className={champ} value={form.title} maxLength={80} placeholder="Promotions du moment" onChange={(e) => setForm({ ...form, title: e.target.value })} />
                        </label>
                        <label>
                            <span className="text-xs font-semibold uppercase text-slate-500">Sous-titre (facultatif)</span>
                            <input className={champ} value={form.subtitle} maxLength={160} placeholder="De votre magasin" onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
                            <span className="text-xs text-slate-400">Vide : « De {`{votre boutique}`} ».</span>
                        </label>
                        <ImageField
                            label="Image (facultative)"
                            hint="Pour les écrans où la collection a une vignette."
                            adresse={form.image}
                            fichier={fichier}
                            galerie={galerieMarchand(merchantId)}
                            disabled={envoi}
                            forme="aspect-[2/1]"
                            onChange={(image, choisi) => {
                                setForm({ ...form, image });
                                setFichier(choisi);
                            }}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Début</span>
                                <input type="datetime-local" className={champ} value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
                            </label>
                            <label>
                                <span className="text-xs font-semibold uppercase text-slate-500">Fin</span>
                                <input type="datetime-local" className={champ} value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
                            </label>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold uppercase text-slate-500">Articles · {form.products.length}</p>
                            <input
                                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm w-60"
                                value={recherche}
                                placeholder="Chercher un article"
                                onChange={(e) => setRecherche(e.target.value)}
                            />
                        </div>
                        <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                            {trouves.length === 0 && <p className="p-4 text-sm text-slate-400">Aucun article.</p>}
                            {trouves.map((a) => (
                                <label key={a.id} className="flex items-center gap-3 p-3 cursor-pointer">
                                    <input type="checkbox" checked={form.products.includes(a.id)} onChange={() => basculerArticle(a.id)} />
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                                        {a.image && <img src={a.image} alt="" className="w-full h-full object-cover" />}
                                    </div>
                                    <span className="flex-1 text-sm text-slate-800 dark:text-slate-100">{a.name}</span>
                                    <span className="text-sm text-slate-500">{francs(a.price)}</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">L'ordre des cases cochées est celui de l'affichage. Quarante articles au plus.</p>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300">Annuler</button>
                        <button
                            onClick={enregistrer}
                            disabled={!form.title.trim() || form.products.length === 0 || envoi}
                            className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 dark:bg-white dark:text-slate-900"
                        >
                            {envoi ? "Envoi…" : "Enregistrer"}
                        </button>
                    </div>
                </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                {collections.length === 0 && <p className="p-6 text-slate-500">Aucune collection : « Promotions du moment », « Remplir ses placards »…</p>}
                {collections.map((c) => (
                    <div key={c.id} className={`p-4 ${c.is_active ? "" : "opacity-50"}`}>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                                {(c.image || c.products[0]?.image) && <img src={c.image ?? c.products[0]?.image ?? ""} alt="" className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-slate-900 dark:text-white">{c.title}</p>
                                <p className="text-xs text-slate-500">
                                    {c.products.length} article{c.products.length > 1 ? "s" : ""}
                                    {c.subtitle ? ` · ${c.subtitle}` : ""}
                                    {c.ends_at ? ` · jusqu'au ${new Date(c.ends_at).toLocaleDateString("fr-FR")}` : ""}
                                </p>
                            </div>
                            {canEdit && (
                                <>
                                    <button onClick={() => modifier(c)} className="text-sm text-slate-600 dark:text-slate-300">Modifier</button>
                                    <button onClick={() => basculer(c)} className="text-sm text-slate-900 dark:text-white">{c.is_active ? "Masquer" : "Afficher"}</button>
                                    <button onClick={() => supprimer(c)} className="text-sm text-rose-600">Supprimer</button>
                                </>
                            )}
                        </div>
                        <div className="flex gap-2 mt-3 overflow-x-auto">
                            {c.products.slice(0, 8).map((a) => (
                                <div key={a.id} className="w-16 shrink-0">
                                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                                        {a.image && <img src={a.image} alt="" className="w-full h-full object-cover" />}
                                    </div>
                                    <p className="text-[11px] text-slate-500 truncate">{a.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
