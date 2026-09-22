import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";

/**
 * Ce que les clients disent de la boutique.
 *
 * Tout ce que voit le client, et les notes sans commentaire en plus : un
 * « 2 » sec est aussi une information. Filtrer par étoiles aide à lire
 * d'abord ce qui fâche.
 */

interface Avis {
    id: number;
    rating: number;
    comment: string | null;
    at: string;
    author: string;
}

interface Donnees {
    rating_avg: number | null;
    rating_count: number;
    breakdown: Record<string, number>;
    reviews: Avis[];
}

interface ReviewsProps {
    merchantId: string;
    storeId: number;
}

const etoiles = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default function Reviews({ merchantId, storeId }: ReviewsProps) {
    const [donnees, setDonnees] = useState<Donnees | null>(null);
    const [filtre, setFiltre] = useState<number | null>(null);

    useEffect(() => {
        new ApiService()
            .getData(`v3/merchant/${merchantId}/stores/${storeId}/reviews`, filtre ? { rating: filtre } : undefined)
            .then(({ data }) => {
                if (data.success) setDonnees(data.data);
                else Swal.fire({ icon: "error", title: data.message });
            })
            .catch((erreur) => Swal.fire({ icon: "warning", title: "Avis illisibles", text: String(erreur) }));
    }, [merchantId, storeId, filtre]);

    if (!donnees) return <p className="text-slate-500">Chargement…</p>;

    const total = Object.values(donnees.breakdown).reduce((s, n) => s + n, 0);

    return (
        <section className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
            <div className="p-6 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 h-fit">
                <p className="text-5xl font-black text-slate-900 dark:text-white">{donnees.rating_avg ? donnees.rating_avg.toFixed(1) : "—"}</p>
                <p className="text-sm text-slate-500 mt-1">
                    {total} note{total > 1 ? "s" : ""}
                    {!donnees.rating_avg && total > 0 && " · la moyenne s'affiche aux clients à partir de quelques avis"}
                </p>
                <div className="mt-5 space-y-2">
                    {[5, 4, 3, 2, 1].map((n) => {
                        const nombre = donnees.breakdown[String(n)] ?? 0;

                        return (
                            <button key={n} onClick={() => setFiltre(filtre === n ? null : n)} className={`w-full flex items-center gap-2 text-sm ${filtre === n ? "font-semibold" : ""}`}>
                                <span className="w-4 text-slate-600 dark:text-slate-300">{n}</span>
                                <span className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    <span className="block h-full bg-amber-400" style={{ width: total ? `${(nombre * 100) / total}%` : 0 }} />
                                </span>
                                <span className="w-8 text-right text-slate-500">{nombre}</span>
                            </button>
                        );
                    })}
                </div>
                {filtre && (
                    <button onClick={() => setFiltre(null)} className="mt-4 text-sm text-slate-600 dark:text-slate-300 underline">
                        Tous les avis
                    </button>
                )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                {donnees.reviews.length === 0 && <p className="p-6 text-slate-500">Aucun avis{filtre ? ` à ${filtre} étoile${filtre > 1 ? "s" : ""}` : " pour le moment"}.</p>}
                {donnees.reviews.map((a) => (
                    <div key={a.id} className="p-5">
                        <div className="flex items-center justify-between">
                            <p className={`text-lg ${a.rating <= 2 ? "text-rose-500" : "text-amber-500"}`}>{etoiles(a.rating)}</p>
                            <p className="text-xs text-slate-400">{new Date(a.at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</p>
                        </div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">{a.author}</p>
                        {a.comment ? <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{a.comment}</p> : <p className="text-xs text-slate-400 mt-1">Note sans commentaire</p>}
                    </div>
                ))}
            </div>
        </section>
    );
}
