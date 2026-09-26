import ImageField from "./ImageField";
import { Teinte, RENDUS, POSITIONS } from "./BannerPreview";
import type { Rendu, Position } from "./BannerPreview";

/**
 * Les réglages d'apparence d'une bannière — rendu, textes, couleurs, visuel.
 *
 * **Le même éditeur pour Ongo et pour ses marchands.** Une bannière proposée
 * par un restaurant se règle exactement comme une bannière maison. Deux
 * éditeurs auraient divergé au premier champ ajouté, et le marchand aurait
 * composé autre chose que ce que l'écran de validation montre.
 *
 * Le composant ne connaît **que la forme** : ni l'emplacement, ni la période,
 * ni la destination, qui n'ont pas le même sens des deux côtés — Ongo vise
 * qui il veut, un marchand ne vise que chez lui.
 */

/** Ce que ces champs écrivent. Chaque écran y ajoute ce qui le regarde. */
export interface FormeBanniere {
    render: Rendu;
    title: string;
    subtitle: string;
    badge: string;
    text_position: Position;
    background_color: string;
    title_color: string;
    subtitle_color: string;
    image: string;
}

interface Props {
    form: FormeBanniere;
    /** Applique un changement partiel : l'écran garde le reste de son état. */
    patch: (modif: Partial<FormeBanniere>) => void;
    fichier: File | null;
    onFichier: (f: File | null) => void;
    /** La galerie d'Ongo, ou celle d'un marchand : l'un des deux, pas les deux. */
    owner?: "ongo" | "merchants";
    galerie?: string;
    forme: string;
    disabled?: boolean;
    labelVisuel?: string;
    aideVisuel?: string;
}

const champ =
    "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white";

export default function BannerFields({
    form,
    patch,
    fichier,
    onFichier,
    owner,
    galerie,
    forme,
    disabled = false,
    labelVisuel = "Visuel du graphiste",
    aideVisuel = "Depuis la galerie ou l'ordinateur.",
}: Props) {
    return (
        <>
            <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-500">Rendu</span>
                <select
                    className={champ}
                    value={form.render}
                    onChange={(e) => patch({ render: e.target.value as Rendu })}
                >
                    {RENDUS.map((r) => (
                        <option key={r.valeur} value={r.valeur}>
                            {r.libelle}
                        </option>
                    ))}
                </select>
                <span className="text-xs text-slate-400 mt-1 block">
                    {RENDUS.find((r) => r.valeur === form.render)?.aide}
                </span>
            </label>

            <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-500">
                    Titre {form.render === "image" && "(pour le workspace)"}
                </span>
                <div className="flex items-center gap-2">
                    {form.render !== "image" && (
                        <Teinte
                            valeur={form.title_color}
                            defaut="#FFFFFF"
                            onChange={(v) => patch({ title_color: v })}
                        />
                    )}
                    <input
                        className={champ}
                        value={form.title}
                        maxLength={120}
                        placeholder="Code BONJOUR"
                        onChange={(e) => patch({ title: e.target.value })}
                    />
                </div>
                {form.render === "image" && (
                    <span className="text-xs text-slate-400 mt-1 block">
                        Le texte est dans le visuel : ce nom ne sert qu'à retrouver la bannière ici.
                    </span>
                )}
            </label>

            {form.render === "template" && (
                <label className="block">
                    <span className="text-xs font-semibold uppercase text-slate-500">
                        Sous-titre
                    </span>
                    <div className="flex items-center gap-2">
                        <Teinte
                            valeur={form.subtitle_color}
                            defaut="#FFFFFF"
                            onChange={(v) => patch({ subtitle_color: v })}
                        />
                        <input
                            className={champ}
                            value={form.subtitle}
                            placeholder="Riz noir & poulet braisé"
                            onChange={(e) => patch({ subtitle: e.target.value })}
                        />
                    </div>
                    <span className="text-xs text-slate-400 mt-1 block">
                        Ce que le titre promet, en clair. Facultatif.
                    </span>
                </label>
            )}

            {form.render === "template" && (
                <div className="grid grid-cols-2 gap-4">
                    <label>
                        <span className="text-xs font-semibold uppercase text-slate-500">Badge</span>
                        <input
                            className={champ}
                            value={form.badge}
                            placeholder="−50 %"
                            onChange={(e) => patch({ badge: e.target.value })}
                        />
                    </label>
                    <label>
                        <span className="text-xs font-semibold uppercase text-slate-500">
                            Position du texte
                        </span>
                        <select
                            className={champ}
                            value={form.text_position}
                            onChange={(e) =>
                                patch({ text_position: e.target.value as Position })
                            }
                        >
                            {POSITIONS.map((p) => (
                                <option key={p.valeur} value={p.valeur}>
                                    {p.libelle}
                                </option>
                            ))}
                        </select>
                        <span className="text-xs text-slate-400 mt-1 block">
                            Du côté où le visuel laisse de la place.
                        </span>
                    </label>
                </div>
            )}

            {form.render !== "image" && (
                <label className="block">
                    <span className="text-xs font-semibold uppercase text-slate-500">
                        Couleur de fond
                    </span>
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            className="h-10 w-14 rounded border border-slate-300 dark:border-slate-700"
                            value={form.background_color || "#E23744"}
                            onChange={(e) => patch({ background_color: e.target.value })}
                        />
                        <input
                            className={champ}
                            value={form.background_color}
                            placeholder="#8BC34A"
                            onChange={(e) => patch({ background_color: e.target.value })}
                        />
                    </div>
                    <span className="text-xs text-slate-400 mt-1 block">
                        Visible là où la photo ne couvre pas — et partout s'il n'y a pas de photo.
                    </span>
                </label>
            )}

            <ImageField
                label={labelVisuel}
                hint={aideVisuel}
                adresse={form.image}
                fichier={fichier}
                owner={owner}
                galerie={galerie}
                disabled={disabled}
                forme={forme}
                onChange={(image, choisi) => {
                    patch({ image });
                    onFichier(choisi);
                }}
            />
        </>
    );
}
