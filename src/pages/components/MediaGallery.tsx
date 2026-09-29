import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";

/**
 * La galerie : les images envoyées pour Ongo Eat, où chacune sert, et le
 * ménage.
 *
 * Une image utilisée ne se supprime pas : le serveur refuse et dit où elle
 * sert — une bannière, une tuile, un logo qui pointeraient vers un fichier
 * effacé s'afficheraient vides chez tous les clients.
 *
 * Deux usages : la page complète (gestion) et la fenêtre de choix des
 * formulaires (`onPick`), où toucher une image la choisit.
 */

export interface ImageGalerie {
    id: number;
    url: string;
    name: string | null;

    /** « burger grillades menu midi » : ce qui fait retrouver l'image. */
    keywords: string | null;
    size: number | null;
    created_at?: string;
    usages: { type: string; label: string }[];
}

interface Props {
    /** « v3/admin/eat/media » ou la galerie d'un marchand. */
    galerie: string;
    /** Mode choix : toucher une image la rend. */
    onPick?: (image: ImageGalerie) => void;
    canDelete?: boolean;
    /** Galerie d'Ongo seulement : « ongo » (par défaut) ou « merchants ». */
    owner?: "ongo" | "merchants";
    /** Où ranger les images importées : chez ce marchand plutôt que chez Ongo. */
    merchantId?: number | null;
}

type Filtre = "" | "used" | "unused";

const taille = (octets: number | null) => (octets == null ? "" : octets > 1_000_000 ? `${(octets / 1_000_000).toFixed(1)} Mo` : `${Math.round(octets / 1000)} Ko`);

export default function MediaGallery({ galerie, onPick, canDelete = true, owner, merchantId = null }: Props) {
    const [images, setImages] = useState<ImageGalerie[]>([]);
    const [recherche, setRecherche] = useState("");
    const [filtre, setFiltre] = useState<Filtre>("");
    const [chargement, setChargement] = useState(true);
    const [envoi, setEnvoi] = useState(0);
    const [ouverte, setOuverte] = useState<ImageGalerie | null>(null);

    /** Les mots-clés en cours d'écriture, et l'envoi. */
    const [motsCles, setMotsCles] = useState<string>("");
    const [etiquetage, setEtiquetage] = useState<boolean>(false);

    // Ouvrir une image charge ses mots-clés dans le champ : sans cela, on
    // repartirait d'un champ vide et on effacerait ce qui était écrit.
    useEffect(() => setMotsCles(ouverte?.keywords ?? ""), [ouverte?.id]);

    /** Poser les mots-clés d'une image. */
    const etiqueter = async (image: ImageGalerie) => {
        setEtiquetage(true);

        try {
            const { data } = await api.postData(`${galerie}/tag`, { id: image.id, keywords: motsCles });

            if (data?.success) {
                setOuverte({ ...image, keywords: motsCles.trim() || null });
                await charger();
            } else {
                Swal.fire({ icon: "error", title: "Refusé", text: data?.message });
            }
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Enregistrement impossible", text: String(erreur) });
        }

        setEtiquetage(false);
    };
    const fichiers = useRef<HTMLInputElement>(null);

    const api = new ApiService();

    const charger = async () => {
        setChargement(true);

        try {
            const { data } = await api.getData(galerie, { q: recherche || undefined, filter: filtre || undefined, owner });
            if (data.success) setImages(data.data ?? []);
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Galerie illisible", text: String(erreur) });
        }

        setChargement(false);
    };

    useEffect(() => {
        const minuteur = setTimeout(charger, 250);
        return () => clearTimeout(minuteur);
    }, [galerie, recherche, filtre, owner]);

    /** Importer : dans la galerie, tout de suite — c'est une bibliothèque. */
    const importer = async (liste: FileList | null) => {
        if (!liste || liste.length === 0) return;

        const refus: string[] = [];
        setEnvoi(liste.length);

        for (const fichier of Array.from(liste)) {
            const formulaire = new FormData();
            formulaire.append("file", fichier);
            if (merchantId) formulaire.append("merchant_id", String(merchantId));

            try {
                const { data } = await api.postData(`${galerie}/upload`, formulaire);
                if (!data.success) refus.push(`${fichier.name} : ${data.message}`);
            } catch (erreur) {
                refus.push(`${fichier.name} : ${String(erreur)}`);
            }

            setEnvoi((n) => n - 1);
        }

        if (refus.length) Swal.fire({ icon: "warning", title: "Certaines images n'ont pas été ajoutées", text: refus.join("\n") });
        if (fichiers.current) fichiers.current.value = "";

        charger();
    };

    const supprimer = async (image: ImageGalerie) => {
        // Utilisée : on le dit avant même de demander.
        if (image.usages.length) {
            Swal.fire({
                icon: "warning",
                title: "Image utilisée",
                html: `Elle sert encore à :<br><b>${image.usages.map((u) => u.label).join("<br>")}</b><br><br>Retirez-la de ces endroits avant de la supprimer.`,
            });
            return;
        }

        const reponse = await Swal.fire({
            icon: "question",
            title: "Supprimer cette image ?",
            text: "Elle sera effacée de Firebase. Cette action est définitive.",
            showCancelButton: true,
            confirmButtonText: "Supprimer",
            cancelButtonText: "Annuler",
        });

        if (!reponse.isConfirmed) return;

        const { data } = await api.postData(`${galerie}/delete`, { id: image.id });

        if (!data.success) {
            // Utilisée entre-temps : le serveur a le dernier mot.
            Swal.fire({ icon: "warning", title: "Suppression refusée", text: data.message });
            return;
        }

        setOuverte(null);
        charger();
    };

    const copier = (url: string) => {
        navigator.clipboard?.writeText(url);
        Swal.fire({ icon: "success", title: "Adresse copiée", timer: 1000, showConfirmButton: false });
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <input
                    className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm w-60"
                    value={recherche}
                    placeholder="Rechercher par nom ou mot-clé"
                    onChange={(e) => setRecherche(e.target.value)}
                />
                {([["", "Toutes"], ["used", "Utilisées"], ["unused", "Inutilisées"]] as const).map(([cle, libelle]) => (
                    <button
                        key={cle}
                        onClick={() => setFiltre(cle)}
                        className={`px-3 py-1.5 rounded-full text-sm border ${
                            filtre === cle ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900" : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                        }`}
                    >
                        {libelle}
                    </button>
                ))}
                {!(owner === "merchants" && !merchantId) && <label className="ml-auto px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium dark:bg-white dark:text-slate-900 cursor-pointer">
                    {envoi > 0 ? `Envoi… (${envoi})` : "Importer des images"}
                    <input ref={fichiers} type="file" accept="image/*" multiple className="hidden" disabled={envoi > 0} onChange={(e) => importer(e.target.files)} />
                </label>}
            </div>

            {chargement && images.length === 0 ? (
                <p className="text-sm text-slate-500">Chargement…</p>
            ) : images.length === 0 ? (
                <p className="text-sm text-slate-500">{filtre === "unused" ? "Aucune image inutilisée : rien à nettoyer." : "La galerie est vide. Importez vos premières images."}</p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {images.map((image) => (
                        <button
                            key={image.id}
                            type="button"
                            onClick={() => (onPick ? onPick(image) : setOuverte(image))}
                            className={`group text-left rounded-xl overflow-hidden border bg-white dark:bg-slate-900 ${ouverte?.id === image.id ? "border-slate-900 dark:border-white" : "border-slate-200 dark:border-slate-800"}`}
                        >
                            <div className="aspect-square bg-slate-100 dark:bg-slate-800">
                                <img src={image.url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:opacity-90" />
                            </div>
                            <div className="px-2 py-1.5">
                                <p className="text-xs text-slate-700 dark:text-slate-200 truncate">{image.name || "Sans nom"}</p>
                                <p className={`text-[11px] ${image.usages.length ? "text-emerald-700" : "text-slate-400"}`}>
                                    {image.usages.length ? `Utilisée · ${image.usages.length}` : "Inutilisée"}
                                </p>
                                {/* Les mots-clés sous la vignette : on voit
                                    d'un coup d'œil celles qui n'en ont pas. */}
                                {image.keywords && (
                                    <p className="text-[11px] text-slate-500 truncate" title={image.keywords}>
                                        {image.keywords}
                                    </p>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Le détail d'une image : où elle sert, et le ménage. */}
            {!onPick && ouverte && (
                <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" onClick={() => setOuverte(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-slate-100 dark:bg-slate-800 flex items-center justify-center min-h-64">
                            <img src={ouverte.url} alt="" className="max-h-[70vh] w-full object-contain" />
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <p className="font-semibold text-slate-900 dark:text-white break-all">{ouverte.name || "Sans nom"}</p>
                                <p className="text-xs text-slate-500">
                                    {taille(ouverte.size)}
                                    {ouverte.created_at ? ` · ${new Date(ouverte.created_at).toLocaleDateString("fr-FR")}` : ""}
                                </p>
                            </div>
                            {/*
                                Une chaîne libre, pas une liste d'étiquettes :
                                on écrit « burger grillades menu midi » comme
                                on le dirait. Une table d'étiquettes
                                demanderait un écran de gestion des étiquettes,
                                que personne n'ouvrirait.
                            */}
                            <div>
                                <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Mots-clés</p>
                                <div className="flex gap-2">
                                    <input
                                        value={motsCles}
                                        onChange={(e) => setMotsCles(e.target.value)}
                                        placeholder="burger, grillades, menu midi"
                                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                                    />
                                    <button
                                        onClick={() => etiqueter(ouverte)}
                                        disabled={etiquetage || motsCles === (ouverte.keywords ?? "")}
                                        className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white disabled:bg-slate-200 disabled:text-slate-400 dark:bg-white dark:text-slate-900"
                                    >
                                        {etiquetage ? "…" : "Enregistrer"}
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Séparez-les par des espaces ou des virgules. C'est là-dessus que porte la recherche.
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Utilisée par</p>
                                {ouverte.usages.length ? (
                                    <ul className="text-sm text-slate-700 dark:text-slate-200 space-y-1">
                                        {ouverte.usages.map((u, i) => (
                                            <li key={i}>• {u.label}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-slate-400">Nulle part : elle peut être supprimée.</p>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-3 pt-2">
                                <button onClick={() => copier(ouverte.url)} className="px-4 py-2 rounded-lg text-sm border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                                    Copier l'adresse
                                </button>
                                {canDelete && (
                                    <button onClick={() => supprimer(ouverte)} className={`px-4 py-2 rounded-lg text-sm font-medium ${ouverte.usages.length ? "bg-slate-100 text-slate-400 dark:bg-slate-800" : "bg-rose-600 text-white"}`}>
                                        Supprimer
                                    </button>
                                )}
                                <button onClick={() => setOuverte(null)} className="ml-auto px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300">
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
