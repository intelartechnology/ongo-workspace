import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cx } from "./tokens";

interface StatCardProps {
    label: string;
    value: React.ReactNode;
    icon?: LucideIcon;
    /** Une ligne sous le chiffre : sa portée (« sur cette page »), un rapport. */
    note?: React.ReactNode;
    /** Le chiffre demande une action : la carte passe en rouge. */
    alert?: boolean;
    /**
     * L'écart avec la période précédente. `null` quand il n'y avait rien à
     * comparer — un « +∞ % » ne dit rien. `pts` pour un taux : passer de 20 à
     * 25 % fait +5 points, pas +25 %.
     */
    delta?: { value: number | null; unit?: "%" | "pts" };
    className?: string;
}

/** « +12,4 % », avec la flèche et la couleur du sens — jamais la couleur seule. */
function Ecart({ value, unit = "%" }: { value: number | null; unit?: "%" | "pts" }) {
    if (value === null) {
        return <p className="mt-2 text-[13px] text-slate-400 dark:text-slate-500">Pas de période précédente à comparer</p>;
    }

    // Zéro n'est ni une hausse ni une baisse : une flèche verte sur « +0 % »
    // annonçait un progrès qui n'a pas eu lieu.
    if (value === 0) {
        return (
            <p className="mt-2 text-[13px]">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Stable</span>
                <span className="ml-1.5 text-slate-500 dark:text-slate-400">vs période précédente</span>
            </p>
        );
    }

    const hausse = value > 0;
    const Fleche = hausse ? TrendingUp : TrendingDown;
    const texte = `${hausse ? "+" : "−"}${Math.abs(value).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}${unit === "pts" ? " pts" : " %"}`;

    return (
        <p className="mt-2 flex items-center gap-1.5 text-[13px]">
            <span
                className={cx(
                    "inline-flex items-center gap-1 font-semibold",
                    hausse ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400",
                )}
            >
                <Fleche className="size-3.5" strokeWidth={2.25} />
                {texte}
            </span>
            <span className="text-slate-500 dark:text-slate-400">vs période précédente</span>
        </p>
    );
}

/**
 * Une carte chiffrée, celle du tableau de bord.
 *
 * Chaque écran avait la sienne : libellé en capitales espacées ici, liseré
 * coloré là, une carte pleine en bleu pour finir la rangée, des chiffres de
 * 24 à 38 pixels. Côte à côte, deux pages voisines ne semblaient pas venir de
 * la même application. Celle-ci tranche : libellé en casse normale, icône en
 * retrait, un chiffre — et la couleur seulement quand il faut agir.
 */
export default function StatCard({ label, value, icon: Icon, note, alert = false, delta, className }: StatCardProps) {
    return (
        <div
            className={cx(
                "rounded-xl border p-5",
                alert
                    ? "border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
                className,
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
                {Icon && (
                    <Icon
                        className={cx("size-5 shrink-0", alert ? "text-rose-400" : "text-slate-300 dark:text-slate-600")}
                        strokeWidth={1.75}
                    />
                )}
            </div>
            <p
                className={cx(
                    // Chiffres proportionnels : `tabular-nums` donne à chaque chiffre
                    // la chasse d'un zéro, et un grand « 121 » paraît décousu.
                    "mt-3 truncate text-[28px] font-bold leading-none tracking-[-0.03em]",
                    alert ? "text-rose-700 dark:text-rose-300" : "text-slate-900 dark:text-white",
                )}
            >
                {value}
            </p>
            {delta && <Ecart value={delta.value} unit={delta.unit} />}
            {note && <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">{note}</p>}
        </div>
    );
}
