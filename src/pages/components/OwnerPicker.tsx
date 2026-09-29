import { useState } from "react";
import ApiService from "../../services/ApiService";

/**
 * Retrouver le compte Ongo d'un responsable par son numéro, et le confirmer.
 *
 * Le responsable n'est pas créé ici : il a déjà un compte Ongo, le même que
 * pour commander une course. Ce qu'on demandait jusqu'ici était son
 * **identifiant utilisateur** — un nombre que personne ne connaît, et qu'il
 * fallait aller chercher dans une autre page.
 *
 * Le numéro se cherche, le compte s'affiche, et c'est celui qu'on voit qu'on
 * retient. La confirmation n'est pas une politesse : `utilisateurs.telephone`
 * n'est pas unique — soixante numéros sont portés par deux comptes ou plus —,
 * si bien qu'un même numéro peut désigner deux personnes. Le serveur les rend
 * toutes ; celui qui fait entrer le marchand tranche, en voyant les noms et
 * les enseignes déjà tenues.
 */

export interface CompteOngo {
    id: number;
    nom: string;
    telephone: string | null;
    email: string | null;
    merchants: string[];
}

interface Props {
    choisi: CompteOngo | null;
    onChoisir: (compte: CompteOngo | null) => void;
    /** Ce qu'on cherche : « responsable », « nouveau responsable »… */
    libelle?: string;
}

const champ =
    "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white";

export default function OwnerPicker({ choisi, onChoisir, libelle = "Responsable" }: Props) {
    const [numero, setNumero] = useState("");
    const [resultats, setResultats] = useState<CompteOngo[] | null>(null);
    const [recherche, setRecherche] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const api = new ApiService();

    const chercher = async () => {
        setRecherche(true);
        setMessage(null);

        try {
            const { data } = await api.getData("v3/admin/merchants/owners", { phone: numero });

            setResultats(data.data ?? []);

            if (!data.success) setMessage(data.message);

            // Un seul compte : il est retenu d'office, mais **affiché** — on ne
            // fait pas disparaître ce qu'on vient de choisir à sa place.
            if (data.success && (data.data ?? []).length === 1) onChoisir(data.data[0]);
        } catch (erreur) {
            setMessage(String(erreur));
        }

        setRecherche(false);
    };

    if (choisi) {
        return (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 p-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400">{libelle}</p>
                        <p className="font-semibold text-slate-900 dark:text-white truncate">{choisi.nom || "Sans nom"}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{choisi.telephone ?? "—"}</p>

                        {choisi.merchants.length > 0 && (
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                Déjà chez : {choisi.merchants.join(", ")}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            onChoisir(null);
                            setResultats(null);
                        }}
                        className="text-xs font-medium text-slate-600 dark:text-slate-300 underline shrink-0"
                    >
                        Changer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">{libelle} · son numéro Ongo</span>

            <div className="mt-1 flex gap-2">
                <input
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            chercher();
                        }
                    }}
                    placeholder="699 00 00 00"
                    className={champ}
                />

                <button
                    type="button"
                    onClick={chercher}
                    disabled={recherche}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white disabled:opacity-40 dark:bg-white dark:text-slate-900 shrink-0"
                >
                    {recherche ? "…" : "Chercher"}
                </button>
            </div>

            {message && <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{message}</p>}

            {resultats && resultats.length > 1 && (
                <>
                    <p className="text-xs text-slate-500 mt-2">
                        Ce numéro est porté par {resultats.length} comptes. Lequel est le responsable ?
                    </p>

                    <div className="mt-2 space-y-2">
                        {resultats.map((compte) => (
                            <button
                                key={compte.id}
                                type="button"
                                onClick={() => onChoisir(compte)}
                                className="w-full text-left px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-slate-900 dark:hover:border-white"
                            >
                                <p className="text-sm font-medium text-slate-900 dark:text-white">{compte.nom || "Sans nom"}</p>
                                <p className="text-xs text-slate-500">
                                    {compte.telephone ?? "—"}
                                    {compte.email ? ` · ${compte.email}` : ""}
                                    {compte.merchants.length > 0 ? ` · déjà chez ${compte.merchants.join(", ")}` : ""}
                                </p>
                            </button>
                        ))}
                    </div>
                </>
            )}

            <p className="text-xs text-slate-400 mt-1">
                Il doit déjà avoir un compte Ongo — le même que pour commander une course.
            </p>
        </div>
    );
}
