import { useEffect, useRef, useState } from "react";
import ApiService from "../../services/ApiService";

/**
 * Les ingrédients d'un plat, en étiquettes.
 *
 * On tape, la plateforme propose ce que d'autres ont déjà saisi — « fro »
 * donne « fromage » avant « fromage de chèvre » s'il sert davantage. Entrée
 * ou virgule valide ; un mot nouveau entre dans le répertoire à
 * l'enregistrement du plat.
 */

interface IngredientsInputProps {
    merchantId: string;
    valeur: string[];
    onChange: (ingredients: string[]) => void;
}

const cle = (mot: string) =>
    mot
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

export default function IngredientsInput({ merchantId, valeur, onChange }: IngredientsInputProps) {
    const [saisie, setSaisie] = useState<string>("");
    const [propositions, setPropositions] = useState<string[]>([]);
    const [ouvert, setOuvert] = useState<boolean>(false);
    const [surligne, setSurligne] = useState<number>(0);

    const api = useRef(new ApiService()).current;

    // Les propositions, un quart de seconde après la dernière frappe.
    useEffect(() => {
        const minuterie = setTimeout(async () => {
            try {
                const { data } = await api.getData(`v3/merchant/${merchantId}/ingredients`, { q: saisie });

                if (data.success) {
                    const deja = new Set(valeur.map(cle));
                    setPropositions((data.data ?? []).filter((mot: string) => !deja.has(cle(mot))));
                    setSurligne(0);
                }
            } catch {
                setPropositions([]);
            }
        }, 250);

        return () => clearTimeout(minuterie);
    }, [saisie, merchantId, valeur]);

    const ajouter = (mot: string) => {
        const propre = mot.replace(/\s+/g, " ").trim();

        if (!propre || valeur.some((v) => cle(v) === cle(propre))) {
            setSaisie("");

            return;
        }

        onChange([...valeur, propre]);
        setSaisie("");
    };

    const retirer = (rang: number) => onChange(valeur.filter((_, i) => i !== rang));

    const touche = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown" && propositions.length > 0) {
            e.preventDefault();
            setSurligne((s) => Math.min(s + 1, propositions.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSurligne((s) => Math.max(s - 1, 0));
        } else if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            ajouter(ouvert && propositions[surligne] && saisie.trim() ? propositions[surligne] : saisie);
        } else if (e.key === "Backspace" && saisie === "" && valeur.length > 0) {
            retirer(valeur.length - 1);
        }
    };

    return (
        <div className="relative">
            <div className="mt-1 flex flex-wrap items-center gap-2 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 min-h-[42px]">
                {valeur.map((mot, rang) => (
                    <span key={`${mot}-${rang}`} className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100">
                        {mot}
                        <button onClick={() => retirer(rang)} className="h-5 w-5 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600" aria-label={`Retirer ${mot}`}>
                            ×
                        </button>
                    </span>
                ))}
                <input
                    value={saisie}
                    onChange={(e) => setSaisie(e.target.value)}
                    onKeyDown={touche}
                    onFocus={() => setOuvert(true)}
                    onBlur={() => setTimeout(() => setOuvert(false), 150)}
                    placeholder={valeur.length === 0 ? "filet de poulet, fromage, laitue…" : ""}
                    className="flex-1 min-w-[140px] px-1 py-1 bg-transparent outline-none text-sm text-slate-900 dark:text-white"
                />
            </div>

            {ouvert && propositions.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
                    {propositions.map((mot, rang) => (
                        <li key={mot}>
                            <button
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    ajouter(mot);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm ${
                                    rang === surligne ? "bg-slate-100 dark:bg-slate-700" : ""
                                } text-slate-800 dark:text-slate-100`}
                            >
                                {mot}
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <p className="text-xs text-slate-400 mt-1">Entrée ou virgule pour ajouter. Les ingrédients déjà saisis sur Ongo vous sont proposés.</p>
        </div>
    );
}
