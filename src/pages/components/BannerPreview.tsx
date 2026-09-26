/**
 * L'apparence d'une bannière : ses réglages, et son aperçu.
 *
 * **Le même éditeur pour Ongo et pour ses marchands.** Une bannière proposée
 * par un restaurant se compose exactement comme une bannière maison — mêmes
 * rendus, mêmes couleurs, même aperçu. Deux éditeurs auraient divergé au
 * premier réglage ajouté, et le marchand aurait vu autre chose que ce que
 * l'écran de validation montre.
 *
 * L'aperçu redessine en HTML ce que le widget Flutter dessine : un aperçu qui
 * montrerait autre chose que l'écran du client ne servirait à rien — c'est là
 * qu'on s'aperçoit qu'un titre est trop long ou qu'il tombe sur le produit.
 */

/** Comment elle se dessine. */
export type Rendu = "image" | "template" | "ticket";

/**
 * Les tailles du gabarit, les mêmes que dans l'application.
 *
 * Fixes : elles se jugent à l'œil et se changent des deux côtés à la fois.
 * L'aperçu les met à l'échelle de sa vignette, sinon un titre de 34 points
 * remplirait une carte de 56 pixels de haut.
 */
/**
 * Les tailles des bannières simples, les mêmes que `EatBannerStyle` côté
 * application. Un aperçu qui ne les suivrait pas ne servirait à rien : c'est
 * là qu'on juge si un titre est trop gros.
 */
export const TAILLES = { titre: 25, sousTitre: 12, badge: 14 };

/**
 * Celles du coupon, séparées comme `EatTicketStyle` : ce n'est pas une
 * bannière avec une forme en plus, et régler l'un ne doit pas déplacer
 * l'autre.
 */
export const TAILLES_COUPON = { titre: 30, code: 18, souche: 15, bouton: 14 };

/** Où poser le texte, selon la place que le visuel laisse. */
export type Position = "top_left" | "bottom_left" | "center";

export const RENDUS: { valeur: Rendu; libelle: string; aide: string }[] = [
    { valeur: "image", libelle: "Visuel complet", aide: "Le texte est dans l'image, faite par le graphiste." },
    { valeur: "template", libelle: "Gabarit", aide: "Fond, titre et badge composés par l'application." },
    { valeur: "ticket", libelle: "Coupon", aide: "Le bon cranté d'un code promo." },
];

export const POSITIONS: { valeur: Position; libelle: string }[] = [
    { valeur: "top_left", libelle: "En haut à gauche" },
    { valeur: "bottom_left", libelle: "En bas à gauche" },
    { valeur: "center", libelle: "Au centre" },
];



/**
 * Le sélecteur de couleur d'un texte, posé juste devant lui.
 *
 * À côté du champ qu'il habille, et non dans une section « couleurs » à part :
 * autrement, on ne sait plus laquelle des deux on règle, et il faut faire
 * l'aller-retour avec l'aperçu pour le deviner.
 */
export function Teinte({ valeur, defaut, onChange }: { valeur: string; defaut: string; onChange: (v: string) => void }) {
    return (
        <input
            type="color"
            title="Couleur du texte"
            className="h-10 w-10 shrink-0 rounded border border-slate-300 dark:border-slate-700"
            value={valeur || defaut}
            onChange={(e) => onChange(e.target.value)}
        />
    );
}

/** Ce qui décide de l'apparence d'une bannière, aperçu compris. */
export interface Apercu {
    image: string;
    format: "wide" | "square";
    render?: Rendu;
    title?: string;
    subtitle?: string | null;
    // `null` autant que `undefined` : la base rend l'un, le formulaire l'autre.
    badge?: string | null;
    background_color?: string | null;
    title_color?: string | null;
    subtitle_color?: string | null;
    text_position?: Position;
    promo_code?: string | null;
}

/**
 * La bannière telle qu'elle apparaîtra dans l'application.
 *
 * Le même dessin que le widget mobile, en HTML : fond photo ou couleur, titre
 * composé, badge, et le coupon cranté pour les codes. Un aperçu qui montrerait
 * autre chose que l'écran du client ne servirait à rien — c'est là qu'on
 * s'aperçoit qu'un titre est trop long ou qu'il tombe sur le produit.
 *
 * La largeur n'est pas fixe : une carte carrée et une carte large cohabitent
 * dans la même rangée, et tout se règle sur la hauteur reçue.
 */
export function Carte({ banniere, h = 150 }: { banniere: Apercu; h?: number }) {
    const {
        image,
        format,
        render = "image",
        title = "",
        subtitle,
        badge,
        background_color,
        title_color,
        subtitle_color,
        text_position = "top_left",
    } = banniere;

    // Blanc à défaut, comme dans l'application : les fonds de campagne sont
    // presque toujours saturés. La souche du coupon, elle, est sombre — son
    // fond est clair.
    const encreTitre = title_color || "#FFFFFF";
    const encreSousTitre = subtitle_color || "#FFFFFF";



    const largeur = format === "square" ? h : h * 2.06;
    const fond = background_color || "#E23744";
    const marge = Math.min(Math.max(largeur * 0.06, 12), 22);

    // Les mêmes tailles fixes que l'application — un aperçu qui ne les suivrait
    // pas ne servirait à rien. `apercuEchelle` les ramène à la taille de la
    // vignette : la carte de la liste fait 56 px de haut, l'écran du client
    // 170, et un titre de 34 points y serait illisible.
    const echelle = h / 170;
    const titre = TAILLES.titre * echelle;
    const sousTitre = TAILLES.sousTitre * echelle;
    const tailleBadge = TAILLES.badge * echelle;

    const cadre = "shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 relative";

    if (render === "ticket") {
        // Le bon cranté à gauche, ce qu'il donne à droite : la carte n'est pas
        // le coupon, le coupon est dedans.
        //
        // Les encoches sont deux disques de la couleur du fond posés à cheval
        // sur les bords — en CSS, c'est ainsi qu'on mord une forme. Sans elles
        // l'aperçu montrait un rectangle, et l'on ne jugeait pas ce qu'on
        // allait publier.
        const encoche = Math.max(10 * echelle, 5);
        const pastille = Math.max(5 * echelle, 2);

        return (
            <div className={`${cadre} rounded-3xl flex gap-2 bg-slate-100`} style={{ height: h, width: largeur, padding: 8 * echelle }}>
                <div className="relative flex flex-col items-center justify-center text-center overflow-hidden rounded-2xl" style={{ background: fond, flex: 62, padding: 8 * echelle }}>
                    <span className="font-black uppercase leading-none" style={{ fontSize: TAILLES_COUPON.titre * echelle, letterSpacing: "-0.02em", color: encreTitre }}>
                        {title || "Titre du coupon"}
                    </span>

                    {banniere.promo_code && (
                        <>
                            {/* Les pastilles rondes de la déchirure, à l'encre du bon :
                                en tirets et en blanc, elles disparaissaient sur un
                                coupon à texte noir. */}
                            <div className="flex w-full items-center justify-between" style={{ margin: `${6 * echelle}px 0` }}>
                                {Array.from({ length: 14 }).map((_, i) => (
                                    <span key={i} className="rounded-full" style={{ width: pastille, height: pastille, background: encreTitre }} />
                                ))}
                            </div>
                            <span className="font-extrabold uppercase" style={{ fontSize: TAILLES_COUPON.code * echelle, letterSpacing: "0.08em", color: encreTitre }}>
                                {banniere.promo_code}
                            </span>

                            {/* Les deux morsures, au niveau de la déchirure. */}
                            <span className="absolute rounded-full bg-slate-100" style={{ width: encoche, height: encoche, left: -encoche / 2, top: "62%" }} />
                            <span className="absolute rounded-full bg-slate-100" style={{ width: encoche, height: encoche, right: -encoche / 2, top: "62%" }} />
                        </>
                    )}
                </div>

                <div className="flex flex-col justify-center" style={{ flex: 38 }}>
                    {subtitle && (
                        <span className="font-bold leading-tight" style={{ fontSize: TAILLES_COUPON.souche * echelle, color: subtitle_color || "#0F172A" }}>
                            {subtitle}
                        </span>
                    )}
                    {banniere.promo_code && (
                        <span className="mt-1 self-start rounded-full bg-slate-900 font-bold text-white" style={{ fontSize: TAILLES_COUPON.bouton * echelle, padding: `${5 * echelle}px ${12 * echelle}px` }}>
                            Copier
                        </span>
                    )}
                </div>
            </div>
        );
    }

    if (render === "template") {
        const place =
            text_position === "center"
                ? "items-center justify-center text-center"
                : text_position === "bottom_left"
                  ? "items-start justify-end text-left"
                  : "items-start justify-start text-left";

        return (
            <div className={`${cadre} rounded-3xl flex flex-col ${place}`} style={{ height: h, width: largeur, background: fond, padding: marge }}>
                {image && <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                {/* Le même voile que l'application : un titre blanc sur une photo claire ne se lit pas. */}
                {image && (
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                text_position === "bottom_left"
                                    ? "linear-gradient(to top, rgba(0,0,0,.45), transparent 75%)"
                                    : "linear-gradient(to bottom, rgba(0,0,0,.45), transparent 75%)",
                        }}
                    />
                )}
                <span className="relative font-black uppercase leading-none" style={{ fontSize: titre, letterSpacing: "-0.02em", maxWidth: "64%", color: encreTitre }}>
                    {title || "Titre de la campagne"}
                </span>
                {subtitle && (
                    <span className="relative mt-1 font-medium" style={{ fontSize: sousTitre, maxWidth: "64%", color: encreSousTitre }}>
                        {subtitle}
                    </span>
                )}
                {badge && (
                    <span className="relative mt-2 rounded-lg bg-slate-900 px-2 py-1 font-extrabold uppercase text-white" style={{ fontSize: tailleBadge }}>
                        {badge}
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className={`${cadre} rounded-3xl`} style={{ height: h, width: largeur }}>
            {image && <img src={image} alt="" className="w-full h-full object-cover" />}
        </div>
    );
}
