import { useSelector } from "react-redux";
import {
    LogOut, Megaphone, ReceiptText, Settings, ShoppingCart, Truck, UtensilsCrossed, Wallet, X, type LucideIcon,
} from "lucide-react";
import type { RootState } from "../../store";

export interface GroupeDeMenu<C extends string> {
    cle: string;
    libelle: string;
    onglets: { cle: C; libelle: string }[];
}

interface Props<C extends string> {
    nom: string;
    boutique: string | null;
    groupes: GroupeDeMenu<C>[];
    /** L'écran hors groupe, tout en haut : la caisse. */
    premier: { cle: C; libelle: string };
    onglet: C;
    /** Un nombre à côté d'une entrée : les tables à encaisser. */
    pastilles?: Partial<Record<C, number>>;
    choisir: (onglet: C) => void;
    isOpen: boolean;
    setIsOpen: (ouvert: boolean) => void;
    onLogout: () => void;
}

const ICONES: Record<string, LucideIcon> = {
    activite: ReceiptText,
    offre: UtensilsCrossed,
    marketing: Megaphone,
    livraison: Truck,
    finances: Wallet,
    reglages: Settings,
};

/**
 * La barre latérale de l'espace restaurant.
 *
 * Le dessin de celle du back-office et de l'espace transporteur : la caisse
 * en tête, puis les familles d'écrans, chacune avec ses entrées.
 */
export default function MerchantSidebar<C extends string>({ nom, boutique, groupes, premier, onglet, pastilles = {}, choisir, isOpen, setIsOpen, onLogout }: Props<C>) {
    const user = useSelector((state: RootState) => state.auth.user) as { nom?: string; prenom?: string; email?: string; telephone?: string } | null;

    const ouvrir = (cle: C) => {
        choisir(cle);
        setIsOpen(false);
    };

    const pastille = (cle: C) => {
        const n = pastilles[cle] ?? 0;
        return n > 0 ? <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-white text-[11px] font-bold grid place-items-center">{n > 9 ? "9+" : n}</span> : null;
    };

    const initiale = (user?.nom || user?.prenom || "R").trim().charAt(0).toUpperCase();

    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 lg:hidden transition-opacity" onClick={() => setIsOpen(false)} />}

            <aside
                className={`w-[272px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed h-full z-[60] transition-transform duration-300 ${
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                }`}
            >
                <div className="px-3 pt-4 pb-3 flex items-center gap-2">
                    <div className="flex-1 min-w-0 flex items-center gap-3 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                        <div className="size-9 shrink-0 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 grid place-items-center">
                            <img src="/logo.png" alt="Ongo 237" className="h-6 w-auto object-contain" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-[14px] font-bold tracking-tight text-slate-900 dark:text-white leading-none truncate">{nom}</h1>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium truncate">{boutique ?? "Restaurant"}</p>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <X className="size-5" />
                    </button>
                </div>

                <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto custom-scrollbar">
                    <button
                        onClick={() => ouvrir(premier.cle)}
                        className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[14px] transition-colors ${
                            onglet === premier.cle
                                ? "bg-slate-100 dark:bg-slate-800/70 text-primary dark:text-primary-fixed-dim font-semibold"
                                : "text-slate-800 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                    >
                        <ShoppingCart className="size-[19px] shrink-0" strokeWidth={onglet === premier.cle ? 2.25 : 1.75} />
                        <span className="truncate">{premier.libelle}</span>
                        {pastille(premier.cle)}
                    </button>

                    {groupes.map((groupe) => {
                        const Icone = ICONES[groupe.cle] ?? ReceiptText;
                        return (
                            <div key={groupe.cle}>
                                <div className="w-full flex items-center gap-3 px-2.5 py-2 mt-3 text-[14px] font-medium text-slate-500 dark:text-slate-400">
                                    <Icone className="size-[19px] shrink-0" strokeWidth={1.75} />
                                    <span className="truncate">{groupe.libelle}</span>
                                </div>
                                <div className="relative space-y-0.5 pt-0.5 pb-1 before:absolute before:left-[20px] before:top-1 before:bottom-3 before:w-px before:bg-slate-200 dark:before:bg-slate-700">
                                    {groupe.onglets.map((o) => {
                                        const actif = onglet === o.cle;
                                        return (
                                            <button
                                                key={o.cle}
                                                onClick={() => ouvrir(o.cle)}
                                                className={`relative w-full text-left flex items-center gap-2 pl-10 pr-2.5 py-[7px] rounded-lg text-[14px] transition-colors ${
                                                    actif
                                                        ? "bg-slate-100 dark:bg-slate-800/70 text-primary dark:text-primary-fixed-dim font-semibold"
                                                        : "text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
                                                }`}
                                            >
                                                <span
                                                    className={`absolute left-[17px] top-1/2 -translate-y-1/2 size-[7px] rounded-full ring-2 ring-white dark:ring-slate-900 ${
                                                        actif ? "bg-primary dark:bg-primary-fixed-dim" : "bg-slate-300 dark:bg-slate-600"
                                                    }`}
                                                />
                                                <span className="truncate">{o.libelle}</span>
                                                {pastille(o.cle)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                <div className="p-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="size-8 shrink-0 rounded-full bg-primary/10 text-primary dark:bg-primary-fixed-dim/15 dark:text-primary-fixed-dim ring-2 ring-white dark:ring-slate-900 grid place-items-center text-[12px] font-bold">
                            {initiale}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{[user?.nom, user?.prenom].filter(Boolean).join(" ") || "Mon compte"}</p>
                            <p className="text-[11px] text-slate-500 truncate">{user?.email || user?.telephone || ""}</p>
                        </div>
                        <button
                            onClick={onLogout}
                            title="Se déconnecter"
                            className="size-8 grid place-items-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
                        >
                            <LogOut className="size-[18px]" strokeWidth={1.75} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
