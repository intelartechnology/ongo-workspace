import { useRef, useState } from "react";
import MediaGallery from "./MediaGallery";
import { apercu, GALERIE_ONGO } from "../../services/images";

/**
 * Le champ image des formulaires : un aperçu, et « Choisir une image ».
 *
 * La fenêtre propose deux voies :
 *   - **la galerie** : réutiliser une image déjà envoyée — rien ne repart ;
 *   - **l'ordinateur** : un nouveau fichier, montré en aperçu et envoyé dans
 *     la galerie seulement au clic sur « Enregistrer » du formulaire.
 */

interface Props {
    label: string;
    hint?: string;
    /** L'adresse déjà choisie (galerie ou enregistrée). */
    adresse: string;
    /** Un fichier de l'ordinateur, pas encore envoyé. */
    fichier: File | null;
    onChange: (adresse: string, fichier: File | null) => void;
    galerie?: string;
    disabled?: boolean;
    /** Forme de l'aperçu : « aspect-square », « aspect-[2/1] »… */
    forme?: string;
    /** Galerie d'Ongo : quel rayon ouvrir (Ongo pour les bannières, Marchands pour une fiche). */
    owner?: "ongo" | "merchants";
}

export default function ImageField({ label, hint, adresse, fichier, onChange, galerie = GALERIE_ONGO, disabled = false, forme = "aspect-[2/1]", owner }: Props) {
    const [ouverte, setOuverte] = useState(false);
    const ordinateur = useRef<HTMLInputElement>(null);
    const image = apercu(fichier, adresse);

    return (
        <div>
            <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
            <div className="mt-1 flex items-center gap-3">
                <div className={`w-28 ${forme} rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0`}>
                    {image && <img src={image} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="space-y-1">
                    <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={disabled} onClick={() => setOuverte(true)} className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-50">
                            {image ? "Changer" : "Choisir une image"}
                        </button>
                        {image && !disabled && (
                            <button type="button" onClick={() => onChange("", null)} className="px-3 py-1.5 rounded-lg text-sm text-slate-500">
                                Retirer
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-slate-400">{fichier ? "Nouvelle image : envoyée à l'enregistrement." : hint}</p>
                </div>
            </div>

            <input
                ref={ordinateur}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const choisi = e.target.files?.[0];
                    if (choisi) {
                        onChange(adresse, choisi);
                        setOuverte(false);
                    }
                    e.target.value = "";
                }}
            />

            {ouverte && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setOuverte(false)}>
                    <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl max-w-5xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-lg font-semibold text-slate-900 dark:text-white">Choisir une image</p>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => ordinateur.current?.click()} className="px-4 py-2 rounded-lg text-sm border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                                    Depuis l'ordinateur
                                </button>
                                <button type="button" onClick={() => setOuverte(false)} className="px-3 py-2 text-sm text-slate-500">
                                    Fermer
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">Touchez une image de la galerie pour la réutiliser.</p>
                        <MediaGallery
                            galerie={galerie}
                            owner={owner}
                            canDelete={false}
                            onPick={(choisie) => {
                                onChange(choisie.url, null);
                                setOuverte(false);
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
