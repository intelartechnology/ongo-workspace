import { useState } from "react";
import type { GroupeEdite } from "./OptionGroupsEditor";

/**
 * Le plat tel que le client le verra dans l'application.
 *
 * Même ordre, mêmes mots que la fiche mobile : photo, badge de remise,
 * description, ingrédients, options avec leur supplément, puis le nom et le
 * prix — qui suit les options cochées. Le marchand essaie ses combos ici
 * avant de les publier.
 */

interface ProductPreviewProps {
    name: string;
    description: string | null;
    ingredients: string[];
    image: string | null;
    price: number;
    compareAtPrice: number | null;
    sizeValue: number | null;
    sizeUnit: string | null;
    groupes: GroupeEdite[];
}

const francs = (montant: number) => `${Math.round(montant).toLocaleString("fr-FR")} F`;

export default function ProductPreview({ name, description, ingredients, image, price, compareAtPrice, sizeValue, sizeUnit, groupes }: ProductPreviewProps) {
    const [coches, setCoches] = useState<Record<string, boolean>>({});
    const [quantite, setQuantite] = useState<number>(1);
    const [ouverte, setOuverte] = useState<boolean>(false);

    const remise = compareAtPrice && compareAtPrice > price ? Math.round(100 - (price * 100) / compareAtPrice) : 0;

    const cleOption = (g: number, o: number) => `${g}-${o}`;

    const basculer = (g: number, o: number) => {
        const groupe = groupes[g];
        const unique = Number(groupe.max_choices) === 1;
        const cle = cleOption(g, o);

        setCoches((avant) => {
            const suite = { ...avant };

            if (suite[cle]) {
                delete suite[cle];

                return suite;
            }

            if (unique) groupe.options.forEach((_, i) => delete suite[cleOption(g, i)]);

            const retenus = groupe.options.filter((_, i) => suite[cleOption(g, i)]).length;

            if (retenus < (Number(groupe.max_choices) || 1)) suite[cle] = true;

            return suite;
        });
    };

    const supplements = groupes.reduce(
        (somme, g, gi) => somme + g.options.reduce((s, o, oi) => s + (coches[cleOption(gi, oi)] ? Number(o.extra_price) || 0 : 0), 0),
        0
    );

    const manque = groupes.find((g, gi) => g.is_required && !g.options.some((_, oi) => coches[cleOption(gi, oi)]));

    const taille = sizeValue ? `${sizeValue} ${sizeUnit ?? ""}`.trim() : null;

    return (
        <div className="sticky top-6">
            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Aperçu client</p>

            <div className="w-full max-w-[340px] rounded-[28px] border-8 border-slate-900 bg-slate-100 overflow-hidden shadow-xl">
                <div className="max-h-[560px] overflow-y-auto">
                    <div className="bg-white rounded-b-3xl pb-5">
                        <div className="aspect-[1.1] bg-slate-200 flex items-center justify-center">
                            {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <span className="text-xs text-slate-400">Sans photo</span>}
                        </div>

                        <div className="px-4 pt-4">
                            {remise > 0 && <span className="inline-block mb-3 px-2 py-0.5 rounded-md bg-red-600 text-white text-xs font-bold">-{remise}%</span>}

                            {description ? (
                                <button onClick={() => setOuverte(!ouverte)} className="block text-left">
                                    <p className={`text-[15px] text-slate-900 ${ouverte ? "" : "line-clamp-3"}`}>{description}</p>
                                    {!ouverte && description.length > 110 && <p className="text-sm text-slate-400">Toute la description</p>}
                                </button>
                            ) : (
                                <p className="text-sm text-slate-400 italic">Pas de description</p>
                            )}

                            {ingredients.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-sm text-slate-400">Ingrédients</p>
                                    <p className="text-[15px] text-slate-900">{ingredients.join(", ")}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {groupes.length > 0 && (
                        <div className="mt-3 bg-white rounded-3xl pl-4 py-2">
                            {groupes.map((g, gi) => (
                                <div key={g.id ?? gi}>
                                    <div className="flex items-center justify-between pr-4 pt-4 pb-1">
                                        <p className="text-sm text-slate-400">{g.name || "Groupe sans nom"}</p>
                                        {(g.is_required || Number(g.max_choices) > 1) && (
                                            <p className={`text-xs ${g.is_required ? "text-sky-700" : "text-slate-400"}`}>
                                                {g.is_required ? "obligatoire" : ""}
                                                {g.is_required && Number(g.max_choices) > 1 ? " · " : ""}
                                                {Number(g.max_choices) > 1 ? `jusqu'à ${g.max_choices}` : ""}
                                            </p>
                                        )}
                                    </div>
                                    {g.options.map((o, oi) => {
                                        const coche = !!coches[cleOption(gi, oi)];

                                        return (
                                            <button key={o.id ?? oi} onClick={() => basculer(gi, oi)} className="w-full flex items-center gap-3 text-left">
                                                <span
                                                    className={`h-6 w-6 shrink-0 flex items-center justify-center text-white text-xs ${
                                                        Number(g.max_choices) === 1 ? "rounded-full" : "rounded-md"
                                                    } ${coche ? "bg-slate-900" : "bg-slate-100"}`}
                                                >
                                                    {coche ? "✓" : ""}
                                                </span>
                                                <span className="flex-1 py-3.5 border-b border-slate-100 text-[15px] text-slate-900">
                                                    {o.name || "Option"}
                                                    {Number(o.extra_price) > 0 && <span className="text-slate-400">&nbsp;&nbsp;+{francs(Number(o.extra_price))}</span>}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="h-3" />
                </div>

                <div className="bg-white px-4 pt-3 pb-4 border-t border-slate-100">
                    <div className="flex items-end gap-2">
                        <p className="flex-1 text-[15px] text-slate-900 leading-tight">
                            {name || "Nom du plat"}
                            {taille && <span className="text-slate-400">&nbsp;&nbsp;{taille}</span>}
                        </p>
                        {remise > 0 && <p className="text-sm text-slate-400 line-through">{francs(((compareAtPrice ?? 0) + supplements) * quantite)}</p>}
                        <p className={`text-lg font-bold ${remise > 0 ? "text-red-600" : "text-slate-900"}`}>{francs((price + supplements) * quantite)}</p>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <div className="flex items-center rounded-2xl bg-slate-100">
                            <button onClick={() => setQuantite(Math.max(1, quantite - 1))} className="w-9 h-11 text-lg">−</button>
                            <span className="w-5 text-center text-sm font-semibold">{quantite}</span>
                            <button onClick={() => setQuantite(quantite + 1)} className="w-9 h-11 text-lg">+</button>
                        </div>
                        <div className={`flex-1 h-11 rounded-2xl flex items-center justify-center text-sm font-semibold ${manque ? "bg-slate-100 text-slate-500" : "bg-sky-900 text-white"}`}>
                            {manque ? `Choisissez « ${manque.name || "…"} »` : "Ajouter"}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
