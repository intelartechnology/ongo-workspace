import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import { Carte } from "./components/BannerPreview";
import type { Apercu, Rendu, Position } from "./components/BannerPreview";
import { apercu, envoyerSiBesoin } from "../services/images";
import BannerFields from "./components/BannerFields";
import ImageField from "./components/ImageField";
import EatTargetPicker, { cibleComplete, decrireCible } from "./components/EatTargetPicker";
import type { TargetOptions, TargetType } from "./components/EatTargetPicker";

/**
 * Les bannières de l'accueil Ongo Eat, en trois emplacements :
 *
 *   - **Entrée** : le carrousel en haut, une bannière par page, qui avance
 *     seule. C'est là que vivent les tickets de code promo.
 *   - **Meilleurs deals** : la rangée sous « Laissez-vous tenter », cartes larges
 *     et carrées mêlées.
 *   - **Magasins** : en haut de l'écran des enseignes.
 *   - **Accueil de l'application** : la carte d'Ongo Eat posée à côté de la
 *     course et de la location, vue avant d'entrer dans Ongo Eat. Elle change
 *     avec la ville du client et avec ce qu'il a déjà commandé ; sans rien de
 *     configuré, l'application garde sa carte par défaut.
 *
 * Le graphiste fait le visuel en entier — texte, dégradé, logo. Ici on ne
 * choisit que l'image, son format, où elle mène et quand elle s'affiche.
 *
 * **La page de transition** est facultative sur chacune : une page qui s'ouvre
 * quand on touche la bannière, dit ce qu'il y a à dire, et porte un bouton vers
 * la destination déjà configurée. Rien ne s'ouvre tout seul.
 */

type Placement = "hero" | "deals" | "stores" | "home";

interface Banniere {
    id: number;
    placement: Placement;
    title: string;
    image: string;
    format: "wide" | "square";
    promo_code: string | null;
    target_type: TargetType | null;
    target_value: string | null;
    starts_at: string | null;
    ends_at: string | null;
    is_active: boolean;
    areas?: { id: number }[];
    impressions?: number;
    clicks?: number;
    audience?: Audience;

    /** La cible composée, quand elle en porte une : le profil ci-dessus sinon. */
    audience_id?: number | null;

    /** La page de transition, quand la bannière en traverse une. */
    splash_image?: string | null;
    splash_logo?: string | null;
    splash_title?: string | null;
    splash_text?: string | null;
    splash_cta_label?: string | null;

    max_views_per_user?: number | null;
    render?: Rendu;
    background_color?: string | null;
    title_color?: string | null;
    subtitle_color?: string | null;
    badge?: string | null;
    subtitle?: string | null;
    text_position?: Position;
    // La régie : nul, la bannière est d'Ongo ; sinon c'est la proposition d'un
    // marchand, qui ne paraît qu'acceptée.
    merchant_id?: number | null;
    status?: "draft" | "pending" | "approved" | "rejected";
    review_note?: string | null;
}

/** À qui la bannière s'adresse. */
type Audience = "all" | "new" | "returning" | "dormant";

const AUDIENCES: { valeur: Audience; libelle: string; aide: string }[] = [
    { valeur: "all", libelle: "Tout le monde", aide: "Aucune restriction." },
    { valeur: "new", libelle: "N'a jamais commandé", aide: "L'offre de bienvenue, et elle seule." },
    { valeur: "returning", libelle: "A déjà commandé", aide: "Les clients qui connaissent le service." },
    { valeur: "dormant", libelle: "Parti depuis 45 jours", aide: "Pour rappeler ceux qu'on a perdus de vue." },
];

/** Une ville ouverte, pour restreindre une bannière. */
interface Zone {
    id: number;
    name: string;
}

interface EatBannersProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const champ = "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white";

const EMPLACEMENTS: Record<Placement, { titre: string; aide: string }> = {
    hero: { titre: "Entrée", aide: "Le carrousel en haut de l'accueil. Format large 1240 × 600 px." },
    deals: { titre: "Meilleurs deals", aide: "La rangée sous « Laissez-vous tenter ». Large 1240 × 600 px ou carré 600 × 600 px." },
    stores: { titre: "Magasins", aide: "En haut de l'écran « Magasins ». Format large 1240 × 600 px." },
    home: {
        titre: "Accueil de l'application",
        aide:
            "La carte d'Ongo Eat sur l'accueil, à côté de la course et de la location — vue avant d'entrer dans " +
            "Ongo Eat. Format large 1240 × 600 px. Rien de configuré : la carte par défaut de l'application reste.",
    },
};

const vide = (placement: Placement) => ({
    id: null as number | null,
    placement,
    title: "",
    image: "",
    format: "wide" as "wide" | "square",
    promo_code: "",
    target_type: (placement === "hero" ? "promo" : "store") as TargetType,
    target_value: "",
    starts_at: "",
    ends_at: "",
    // Aucune ville cochée : la bannière s'affiche partout.
    areas: [] as number[],
    audience: "all" as Audience,
    // La cible composée, quand quatre profils ne suffisent pas. Zéro : aucune,
    // c'est alors le profil ci-dessus qui décide.
    audience_id: 0,
    // Vide : sans plafond.
    max_views_per_user: "",
    // L'accueil compose son titre par-dessus la photo : c'est le gabarit, pas
    // le visuel du graphiste. Ailleurs, l'image telle quelle reste le défaut.
    render: (placement === "home" ? "template" : "image") as Rendu,
    background_color: "",
    title_color: "",
    subtitle_color: "",
    badge: "",
    subtitle: "",
    /*
     * Où le texte se pose sur le visuel.
     *
     * En bas à gauche sur l'accueil de l'application : la carte y fait cent
     * points de haut, la photo doit respirer, et le titre posé en bas sur un
     * dégradé montant est ce qui se lit le mieux à cette taille. Ailleurs, en
     * haut à gauche comme avant — et cela reste un choix, pas une règle.
     */
    text_position: (placement === "home" ? "bottom_left" : "top_left") as Position,

    // La page de transition : vide, la bannière mène droit à sa destination.
    splash_image: "",
    splash_logo: "",
    splash_title: "",
    splash_text: "",
    splash_cta_label: "",
});

// La carte telle qu'elle apparaîtra : même hauteur pour toutes.

export default function EatBanners({ onLogout, theme, toggleTheme }: EatBannersProps) {
    const [emplacement, setEmplacement] = useState<Placement>("hero");
    const [bannieres, setBannieres] = useState<Banniere[]>([]);
    const [zones, setZones] = useState<Zone[]>([]);
    const [options, setOptions] = useState<TargetOptions>({ stores: [], tags: [], campaigns: [], promo_codes: [] });
    const [form, setForm] = useState<ReturnType<typeof vide> | null>(null);
    // Le visuel choisi, envoyé seulement à l'enregistrement.
    const [fichier, setFichier] = useState<File | null>(null);

    // Le fond et le logo d'une page de transition, choisis de la même façon.
    const [fichierSplash, setFichierSplash] = useState<File | null>(null);
    const [fichierLogo, setFichierLogo] = useState<File | null>(null);
    const [envoi, setEnvoi] = useState(false);

    /** Les audiences composées, pour viser autrement que par profil. */
    const [audiences, setAudiences] = useState<{ id: number; name: string; reach: number | null }[]>([]);

    useEffect(() => {
        setFichier(null);
        setFichierSplash(null);
        setFichierLogo(null);
    }, [form === null, form?.id]);

    const api = new ApiService();

    const charger = async () => {
        try {
            const { data } = await api.getData("v3/admin/eat/banners");

            if (data.success) {
                setBannieres(data.data.banners ?? []);
                setZones(data.data.areas ?? []);
                setAudiences(data.data.audiences ?? []);
                setOptions({
                    stores: data.data.stores ?? [],
                    tags: data.data.tags ?? [],
                    campaigns: data.data.campaigns ?? [],
                    promo_codes: data.data.promo_codes ?? [],
                    categories: data.data.categories ?? [],
                    aisles: data.data.aisles ?? [],
                });
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Bannières illisibles", text: String(erreur) });
        }
    };

    useEffect(() => {
        charger();
    }, []);

    const echec = (data: { success: boolean; message: string }) => {
        if (data.success) return false;

        Swal.fire({ icon: "error", title: data.message });

        return true;
    };

    const enregistrer = async () => {
        if (!form) return;

        setEnvoi(true);

        let image: string | null;
        let splashImage: string | null;
        let splashLogo: string | null;

        try {
            image = await envoyerSiBesoin(fichier, form.image || null);

            // Le fond et le logo de la page de transition partent par le même
            // chemin : il n'y a qu'une façon d'envoyer une image, et deux en
            // feraient diverger une le jour où la galerie change.
            splashImage = await envoyerSiBesoin(fichierSplash, form.splash_image || null);
            splashLogo = await envoyerSiBesoin(fichierLogo, form.splash_logo || null);
        } catch (erreur) {
            setEnvoi(false);
            Swal.fire({ icon: "error", title: "Image non envoyée", text: String((erreur as Error).message ?? erreur) });
            return;
        }

        const { data } = await api.postData("v3/admin/eat/banners", {
            id: form.id,
            placement: form.placement,
            title: form.title,
            image,
            // L'entrée n'a qu'un format.
            // L'entrée et l'écran Magasins n'ont qu'un format.
            format: form.placement === "deals" ? form.format : "wide",
            promo_code: form.promo_code || null,
            target_type: form.target_type || null,
            target_value: form.target_value || null,
            starts_at: form.starts_at || null,
            ends_at: form.ends_at || null,
            areas: form.areas,
            audience: form.audience,
            // Zéro veut dire « aucune audience » : l'envoyer tel quel
            // désignerait l'audience 0.
            audience_id: form.audience_id || null,
            max_views_per_user: form.max_views_per_user === "" ? null : Number(form.max_views_per_user),
            render: form.render,
            background_color: form.background_color || null,
            title_color: form.title_color || null,
            subtitle_color: form.subtitle_color || null,
            badge: form.badge || null,
            subtitle: form.subtitle || null,
            text_position: form.text_position,
            splash_image: splashImage || null,
            splash_logo: splashLogo || null,
            splash_title: form.splash_title || null,
            splash_text: form.splash_text || null,
            splash_cta_label: form.splash_cta_label || null,
        });

        setEnvoi(false);

        if (echec(data)) return;

        Swal.fire({ icon: "success", title: data.message, timer: 1200, showConfirmButton: false });
        setForm(null);
        charger();
    };

    const basculer = async (b: Banniere) => {
        const { data } = await api.postData("v3/admin/eat/banners/toggle", { id: b.id, is_active: !b.is_active });

        if (!echec(data)) charger();
    };

    const liste = bannieres.filter((b) => (b.placement ?? "hero") === emplacement);

    const deplacer = async (rang: number, sens: -1 | 1) => {
        const cible = rang + sens;

        if (cible < 0 || cible >= liste.length) return;

        const ordre = [...liste];
        [ordre[rang], ordre[cible]] = [ordre[cible], ordre[rang]];

        const { data } = await api.postData("v3/admin/eat/banners/reorder", { ids: ordre.map((b) => b.id) });

        if (!echec(data)) charger();
    };

    const supprimer = async (b: Banniere) => {
        const reponse = await Swal.fire({
            icon: "question",
            title: `Supprimer « ${b.title} » ?`,
            showCancelButton: true,
            confirmButtonText: "Supprimer",
            cancelButtonText: "Annuler",
        });

        if (!reponse.isConfirmed) return;

        const { data } = await api.postData("v3/admin/eat/banners/delete", { id: b.id });

        if (!echec(data)) charger();
    };

    const modifier = (b: Banniere) =>
        setForm({
            id: b.id,
            placement: b.placement ?? "hero",
            title: b.title,
            image: b.image,
            format: b.format ?? "wide",
            promo_code: b.target_type === "promo" ? "" : b.promo_code ?? "",
            target_type: (b.target_type ?? "") as TargetType,
            target_value: b.target_value ?? "",
            starts_at: b.starts_at ? b.starts_at.slice(0, 16) : "",
            areas: (b.areas ?? []).map((z) => z.id),
            audience: b.audience ?? "all",
            audience_id: b.audience_id ?? 0,
            render: b.render ?? "image",
            background_color: b.background_color ?? "",
            title_color: b.title_color ?? "",
            subtitle_color: b.subtitle_color ?? "",
            badge: b.badge ?? "",
            subtitle: b.subtitle ?? "",
            text_position: b.text_position ?? "top_left",
            max_views_per_user: b.max_views_per_user == null ? "" : String(b.max_views_per_user),
            ends_at: b.ends_at ? b.ends_at.slice(0, 16) : "",
            splash_image: b.splash_image ?? "",
            splash_logo: b.splash_logo ?? "",
            splash_title: b.splash_title ?? "",
            splash_text: b.splash_text ?? "",
            splash_cta_label: b.splash_cta_label ?? "",
        });

    // « Acceptée » compte autant que la période : une bannière en attente ne
    // s'affiche nulle part, la liste doit le montrer plutôt que de la faire
    // passer pour en ligne.
    const enCours = (b: Banniere) =>
        b.is_active
        && (b.status ?? "approved") === "approved"
        && (!b.starts_at || new Date(b.starts_at) <= new Date())
        && (!b.ends_at || new Date(b.ends_at) >= new Date());

    const valide = !!form
        && form.title.trim() !== ""
        && (form.image !== "" || fichier !== null)
        && cibleComplete(form.target_type, form.target_value);

    // L'aperçu d'une rangée, comme dans l'application.
    const Rangee = ({ elements, placement }: { elements: Apercu[]; placement: Placement }) =>
        placement === "hero" ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
                {elements.map((e, i) => (
                    <Carte key={i} banniere={{ ...e, format: "wide" }} h={170} />
                ))}
            </div>
        ) : (
            <>
                <p className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white mb-3">Meilleurs deals</p>
                {/* Les largeurs diffèrent dans la même rangée : carré et large se suivent, comme dans l'application. */}
                <div className="flex gap-3 overflow-x-auto pb-2">
                    {elements.map((e, i) => (
                        <Carte key={i} banniere={e} />
                    ))}
                </div>
            </>
        );

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-8 py-6 max-w-7xl mx-auto flex items-start justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Bannières</h1>
                        <p className="text-sm text-slate-500 mt-1">Texte, dégradé et logo sont dans l'image du graphiste. Ici : l'emplacement, la destination, la période.</p>
                    </div>
                    {!form && (
                        <button onClick={() => setForm(vide(emplacement))} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium dark:bg-white dark:text-slate-900">
                            Nouvelle bannière
                        </button>
                    )}
                </div>
            </header>

            <main className="px-8 py-8 max-w-7xl mx-auto space-y-6">
                <div className="flex gap-2">
                    {(Object.keys(EMPLACEMENTS) as Placement[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => {
                                setEmplacement(p);
                                setForm(null);
                            }}
                            className={`px-4 py-1.5 rounded-full text-sm border ${
                                emplacement === p
                                    ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                                    : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                            }`}
                        >
                            {EMPLACEMENTS[p].titre} · {bannieres.filter((b) => (b.placement ?? "hero") === p).length}
                        </button>
                    ))}
                </div>

                {/* Ce qu'un client voit maintenant à cet emplacement. */}
                <div className="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase text-slate-500 mb-3">En ce moment — {EMPLACEMENTS[emplacement].aide}</p>
                    {liste.filter(enCours).length === 0 ? (
                        <p className="text-sm text-slate-400">Rien en ce moment : l'emplacement est masqué.</p>
                    ) : (
                        <Rangee elements={liste.filter(enCours)} placement={emplacement} />
                    )}
                </div>

                {form && (
                    <div className="p-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <BannerFields
                                    form={form}
                                    patch={(modif) => setForm({ ...form, ...modif })}
                                    fichier={fichier}
                                    onFichier={setFichier}
                                    owner="ongo"
                                    disabled={envoi}
                                    aideVisuel="Depuis la galerie d'Ongo ou l'ordinateur."
                                    forme={form.placement === "deals" && form.format === "square" ? "aspect-square" : "aspect-[2/1]"}
                                />

                                <label className="block">
                                    <span className="text-xs font-semibold uppercase text-slate-500">Emplacement</span>
                                    <select className={champ} value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value as Placement })}>
                                        <option value="hero">Entrée (en haut)</option>
                                        <option value="deals">Meilleurs deals</option>
                                        <option value="stores">Écran Magasins</option>
                                        <option value="home">Accueil de l'application</option>
                                    </select>
                                    <span className="text-xs text-slate-400 mt-1 block">
                                        {EMPLACEMENTS[form.placement].aide}
                                    </span>
                                </label>

                                {/*
                                  * La page de transition, facultative sur n'importe
                                  * quelle bannière.
                                  *
                                  * Poser un fond ou un titre suffit à la demander : pas
                                  * de case à cocher, qui se désynchroniserait du contenu
                                  * — une page activée et vide, ou remplie et jamais
                                  * montrée. Ce qui manque est repris de la bannière.
                                  */}
                                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-slate-500">
                                            Page de transition — facultative
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Quand on touche la bannière, cette page s'ouvre d'abord ; son bouton mène
                                            à la destination ci-dessus. Laissez tout vide pour y aller directement.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <ImageField
                                            label="Fond de la page"
                                            hint="Vertical, 1240 × 2200 px. Vide : le visuel de la bannière."
                                            forme="aspect-[2/3]"
                                            owner="ongo"
                                            adresse={form.splash_image}
                                            fichier={fichierSplash}
                                            disabled={envoi}
                                            onChange={(adresse: string, choisi: File | null) => {
                                                setForm({ ...form, splash_image: adresse });
                                                setFichierSplash(choisi);
                                            }}
                                        />

                                        <ImageField
                                            label="Logo de la marque"
                                            hint="Carré, 400 × 400 px. Posé au centre, sur fond blanc."
                                            forme="aspect-square"
                                            owner="ongo"
                                            adresse={form.splash_logo}
                                            fichier={fichierLogo}
                                            disabled={envoi}
                                            onChange={(adresse: string, choisi: File | null) => {
                                                setForm({ ...form, splash_logo: adresse });
                                                setFichierLogo(choisi);
                                            }}
                                        />
                                    </div>

                                    <label className="block">
                                        <span className="text-xs font-semibold uppercase text-slate-500">Titre</span>
                                        <input
                                            className={champ}
                                            maxLength={120}
                                            value={form.splash_title}
                                            placeholder="Gagnez une paire de baskets"
                                            onChange={(e) => setForm({ ...form, splash_title: e.target.value })}
                                        />
                                        <span className="text-xs text-slate-400 mt-1 block">
                                            Vide : le titre de la bannière. Un titre seul suffit à demander la page.
                                        </span>
                                    </label>

                                    <label className="block">
                                        <span className="text-xs font-semibold uppercase text-slate-500">Texte</span>
                                        <textarea
                                            className={champ}
                                            rows={3}
                                            maxLength={400}
                                            value={form.splash_text}
                                            placeholder="Commandez un menu à 8 500 F pour tenter votre chance"
                                            onChange={(e) => setForm({ ...form, splash_text: e.target.value })}
                                        />
                                        <span className="text-xs text-slate-400 mt-1 block">
                                            Vide : le sous-titre de la bannière.
                                        </span>
                                    </label>

                                    <label className="block">
                                        <span className="text-xs font-semibold uppercase text-slate-500">
                                            Libellé du bouton
                                        </span>
                                        <input
                                            className={champ}
                                            maxLength={32}
                                            value={form.splash_cta_label}
                                            placeholder="Commander"
                                            onChange={(e) => setForm({ ...form, splash_cta_label: e.target.value })}
                                        />
                                        <span className="text-xs text-slate-400 mt-1 block">
                                            Vide, le bouton dira « Découvrir » — une page sans sortie est une impasse.
                                        </span>
                                    </label>
                                </div>

                                {form.placement === "deals" && (
                                    <div>
                                        <span className="text-xs font-semibold uppercase text-slate-500">Format</span>
                                        <div className="flex gap-2 mt-1">
                                            {([["wide", "Large · 1240 × 600"], ["square", "Carré · 600 × 600"]] as const).map(([cle, libelle]) => (
                                                <button
                                                    key={cle}
                                                    type="button"
                                                    onClick={() => setForm({ ...form, format: cle })}
                                                    className={`px-4 py-2 rounded-lg text-sm border ${
                                                        form.format === cle
                                                            ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                                                            : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                                                    }`}
                                                >
                                                    {libelle}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <EatTargetPicker
                                    type={form.target_type}
                                    value={form.target_value}
                                    options={options}
                                    onChange={(target_type, target_value) => setForm({ ...form, target_type, target_value })}
                                />

                                {form.target_type === "promo" && (
                                    <p className="text-xs text-slate-400">
                                        Le toucher ouvre le ticket du code ; son texte se règle dans « Codes promo ». Le code est proposé au paiement.
                                    </p>
                                )}

                                {form.target_type !== "promo" && (
                                    <label className="block">
                                        <span className="text-xs font-semibold uppercase text-slate-500">Code promo à copier (facultatif)</span>
                                        <input className={`${champ} uppercase`} value={form.promo_code} placeholder="DIP40" onChange={(e) => setForm({ ...form, promo_code: e.target.value })} />
                                        <span className="text-xs text-slate-400">Copié par un appui long sur la carte.</span>
                                    </label>
                                )}

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

                                {zones.length > 0 && (
                                    <div>
                                        <span className="text-xs font-semibold uppercase text-slate-500">Villes</span>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {zones.map((z) => {
                                                const cochee = form.areas.includes(z.id);

                                                return (
                                                    <button
                                                        key={z.id}
                                                        type="button"
                                                        onClick={() =>
                                                            setForm({
                                                                ...form,
                                                                areas: cochee
                                                                    ? form.areas.filter((id) => id !== z.id)
                                                                    : [...form.areas, z.id],
                                                            })
                                                        }
                                                        className={`px-3 py-1.5 rounded-full text-sm border ${
                                                            cochee
                                                                ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                                                                : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                                                        }`}
                                                    >
                                                        {z.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <span className="text-xs text-slate-400 mt-2 block">
                                            Aucune ville cochée : la bannière s'affiche partout. Dès qu'une ville est
                                            retenue, elle ne sort que là — et jamais chez un client dont on ignore la
                                            position.
                                        </span>
                                    </div>
                                )}

                                {/* L'audience composée passe avant le profil : quand elle est
                                    posée, c'est elle qui décide, et le profil est ignoré. */}
                                <label className="block">
                                    <span className="text-xs font-semibold uppercase text-slate-500">Audience</span>
                                    <select
                                        className={champ}
                                        value={String(form.audience_id)}
                                        onChange={(e) => setForm({ ...form, audience_id: Number(e.target.value) })}
                                    >
                                        <option value="0">Aucune — s'en tenir au public ci-dessous</option>

                                        {audiences.map((a) => (
                                            <option key={a.id} value={a.id}>
                                                {a.name}
                                                {a.reach === null ? "" : ` — ${a.reach.toLocaleString("fr-FR")} personnes`}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="text-xs text-slate-400 mt-1 block">
                                        Composée dans « Audiences » : ceux qui ont commandé un plat, aiment une
                                        cuisine, ou ont laissé un panier.
                                    </span>
                                </label>

                                <div className="grid grid-cols-2 gap-4">
                                    <label>
                                        <span className="text-xs font-semibold uppercase text-slate-500">Public</span>
                                        <select
                                            className={champ}
                                            disabled={form.audience_id !== 0}
                                            value={form.audience}
                                            onChange={(e) => setForm({ ...form, audience: e.target.value as Audience })}
                                        >
                                            {AUDIENCES.map((a) => (
                                                <option key={a.valeur} value={a.valeur}>
                                                    {a.libelle}
                                                </option>
                                            ))}
                                        </select>
                                        <span className="text-xs text-slate-400 mt-1 block">
                                            {form.audience_id !== 0
                                                ? "Ignoré : l'audience ci-dessus décide."
                                                : AUDIENCES.find((a) => a.valeur === form.audience)?.aide}
                                        </span>
                                    </label>
                                    <label>
                                        <span className="text-xs font-semibold uppercase text-slate-500">
                                            Vues max par personne
                                        </span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={20}
                                            className={champ}
                                            placeholder="sans limite"
                                            value={form.max_views_per_user}
                                            onChange={(e) => setForm({ ...form, max_views_per_user: e.target.value })}
                                        />
                                        <span className="text-xs text-slate-400 mt-1 block">
                                            Vide : elle s'affiche sans compter. Avec « N'a jamais commandé », c'est ce
                                            qui la réserve aux premières ouvertures d'Ongo Eat.
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Aperçu</p>
                                <div className="p-4 rounded-2xl bg-white border border-slate-200 dark:bg-slate-950 dark:border-slate-800 overflow-hidden">
                                    <Rangee
                                        elements={[
                                            {
                                                image: apercu(fichier, form.image),
                                                format: form.format,
                                                render: form.render,
                                                title: form.title,
                                                subtitle: form.subtitle,
                                                badge: form.badge,
                                                background_color: form.background_color,
                                                title_color: form.title_color,
                                                subtitle_color: form.subtitle_color,
                                                text_position: form.text_position,
                                                promo_code: form.promo_code,
                                            },
                                            // Une voisine vide : elle montre que la suivante dépasse du bord.
                                            { image: "", format: "square" },
                                        ]}
                                        placement={form.placement}
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-2">{decrireCible(form.target_type || null, form.target_value, options)}</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300">
                                Annuler
                            </button>
                            <button
                                onClick={enregistrer}
                                disabled={!valide || envoi}
                                className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 dark:bg-white dark:text-slate-900"
                            >
                                {envoi ? "Envoi…" : "Enregistrer"}
                            </button>
                        </div>
                    </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs uppercase text-slate-500 text-left">
                            <tr>
                                <th className="px-3 py-3 w-16">Ordre</th>
                                <th className="px-5 py-3">Visuel</th>
                                <th className="px-5 py-3">Mène vers</th>
                                <th className="px-5 py-3">Période</th>
                                <th className="px-5 py-3">30 jours</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {liste.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-6 text-center text-slate-500">Aucune bannière ici.</td>
                                </tr>
                            )}
                            {liste.map((b, rang) => (
                                <tr key={b.id} className={enCours(b) ? "" : "opacity-50"}>
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <button onClick={() => deplacer(rang, -1)} disabled={rang === 0} className="disabled:opacity-20" title="Avancer">
                                            <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                                        </button>
                                        <button onClick={() => deplacer(rang, 1)} disabled={rang === liste.length - 1} className="disabled:opacity-20" title="Reculer">
                                            <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                                        </button>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3">
                                            <Carte banniere={b} h={56} />
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">
                                                    {b.title}
                                                    {b.status === "pending" && (
                                                        <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                                                            À relire
                                                        </span>
                                                    )}
                                                    {b.status === "rejected" && (
                                                        <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">
                                                            Refusée
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {b.format === "square" ? "Carré" : "Large"}
                                                    {b.promo_code ? ` · code ${b.promo_code}` : ""}
                                                    {b.merchant_id ? " · proposée par un marchand" : ""}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-xs text-slate-500">{decrireCible(b.target_type, b.target_value, options)}</td>
                                    <td className="px-5 py-3 text-xs text-slate-500">
                                        {b.starts_at || b.ends_at
                                            ? `${b.starts_at ? `du ${new Date(b.starts_at).toLocaleDateString("fr-FR")} ` : ""}${b.ends_at ? `au ${new Date(b.ends_at).toLocaleDateString("fr-FR")}` : ""}`
                                            : "Permanente"}
                                    </td>
                                    {/*
                                        Vues, clics et leur rapport : c'est lui
                                        qui dit si une bannière sert à quelque
                                        chose. Sans clic, le taux ne s'affiche
                                        pas — « 0 % » se lit comme un échec
                                        alors qu'il n'y a souvent rien encore à
                                        mesurer.
                                    */}
                                    <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                                        {(b.impressions ?? 0) === 0 ? (
                                            <span className="text-slate-400">Pas encore vue</span>
                                        ) : (
                                            <>
                                                {b.impressions} vue{(b.impressions ?? 0) > 1 ? "s" : ""} ·{" "}
                                                {b.clicks ?? 0} clic{(b.clicks ?? 0) > 1 ? "s" : ""}
                                                {(b.clicks ?? 0) > 0 && (
                                                    <span className="ml-1 font-semibold text-slate-700 dark:text-slate-300">
                                                        ({(((b.clicks ?? 0) / (b.impressions ?? 1)) * 100).toFixed(1)} %)
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-right whitespace-nowrap">
                                        <button onClick={() => modifier(b)} className="text-sm text-slate-600 dark:text-slate-300 mr-4">
                                            Modifier
                                        </button>
                                        <button onClick={() => basculer(b)} className="text-sm text-slate-900 dark:text-white">
                                            {b.is_active ? "Masquer" : "Afficher"}
                                        </button>
                                        <button onClick={() => supprimer(b)} className="text-sm text-rose-600 ml-4">
                                            Supprimer
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
