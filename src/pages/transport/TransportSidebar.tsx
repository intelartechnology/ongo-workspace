import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
    ArrowLeft, Bus, Clock, LogOut, MapPin, Network, RotateCcw, TrainFront, UsersRound, Wallet, X, type LucideIcon,
} from "lucide-react";
import type { RootState } from "../../store";

interface Entree {
    icon: LucideIcon;
    label: string;
    /** La rubrique, après `/transport/<id>/` ; vide pour l'écran des départs. */
    section: string;
}

interface Groupe {
    titre: string;
    icon: LucideIcon;
    entrees: Entree[];
}

interface Props {
    nom: string;
    base: string;
    section: string;
    mode: "bus" | "train";
    admin: boolean;
    isOpen: boolean;
    setIsOpen: (ouvert: boolean) => void;
    onLogout: () => void;
}

/**
 * La barre latérale de l'espace transporteur.
 *
 * Le dessin de celle du back-office et de l'espace partenaire. L'écran des
 * départs n'y a qu'un lien : il s'ouvre en plein écran, sans elle, parce que
 * c'est lui que la gare garde affiché toute la journée.
 */
export default function TransportSidebar({ nom, base, section, mode, admin, isOpen, setIsOpen, onLogout }: Props) {
    const user = useSelector((state: RootState) => state.auth.user) as { nom?: string; prenom?: string; email?: string; telephone?: string } | null;

    const groupes: Groupe[] = [
        {
            titre: "Mon réseau",
            icon: Network,
            entrees: [
                { icon: Clock, label: "Lignes et horaires", section: "lignes" },
                { icon: MapPin, label: "Gares", section: "gares" },
            ],
        },
        {
            // L'argent des billets arrive chez l'agence ; elle fixe ses remboursements.
            titre: "Argent",
            icon: Wallet,
            entrees: [
                { icon: Wallet, label: "Revenus", section: "revenus" },
                { icon: RotateCcw, label: "Remboursements", section: "remboursements" },
            ],
        },
    ];

    const actif = (s: string) => section === s;
    const chemin = (s: string) => (s ? `${base}/${s}` : base);

    const lien = (item: Entree) => (
        <Link
            key={item.section || "accueil"}
            to={chemin(item.section)}
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-[14px] transition-colors ${
                actif(item.section)
                    ? "bg-slate-100 dark:bg-slate-800/70 text-primary dark:text-primary-fixed-dim font-semibold"
                    : "text-slate-800 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
        >
            <item.icon className="size-[19px] shrink-0" strokeWidth={actif(item.section) ? 2.25 : 1.75} />
            <span className="truncate">{item.label}</span>
        </Link>
    );

    const sousLien = (item: Entree) => (
        <Link
            key={item.section}
            to={chemin(item.section)}
            onClick={() => setIsOpen(false)}
            className={`relative flex items-center gap-2 pl-10 pr-2.5 py-[7px] rounded-lg text-[14px] transition-colors ${
                actif(item.section)
                    ? "bg-slate-100 dark:bg-slate-800/70 text-primary dark:text-primary-fixed-dim font-semibold"
                    : "text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
            }`}
        >
            <span
                className={`absolute left-[17px] top-1/2 -translate-y-1/2 size-[7px] rounded-full ring-2 ring-white dark:ring-slate-900 ${
                    actif(item.section) ? "bg-primary dark:bg-primary-fixed-dim" : "bg-slate-300 dark:bg-slate-600"
                }`}
            />
            <span className="truncate">{item.label}</span>
        </Link>
    );

    const initiale = (user?.nom || user?.prenom || "T").trim().charAt(0).toUpperCase();

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
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">{mode === "train" ? "Compagnie ferroviaire" : "Agence de voyage"}</p>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <X className="size-5" />
                    </button>
                </div>

                <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto custom-scrollbar">
                    {lien({ icon: mode === "train" ? TrainFront : Bus, label: "Départs du jour", section: "" })}

                    <div className="h-2" />

                    {groupes.map((groupe) => (
                        <div key={groupe.titre}>
                            <div className="w-full flex items-center gap-3 px-2.5 py-2 mt-3 text-[14px] font-medium text-slate-500 dark:text-slate-400">
                                <groupe.icon className="size-[19px] shrink-0" strokeWidth={1.75} />
                                <span className="truncate">{groupe.titre}</span>
                            </div>
                            <div className="relative space-y-0.5 pt-0.5 pb-1 before:absolute before:left-[20px] before:top-1 before:bottom-3 before:w-px before:bg-slate-200 dark:before:bg-slate-700">
                                {groupe.entrees.map(sousLien)}
                            </div>
                        </div>
                    ))}

                    <div className="h-4" />

                    {lien({ icon: UsersRound, label: "Équipe", section: "equipe" })}

                    {/* L'administrateur venu dépanner retrouve le back-office d'un clic. */}
                    {admin && (
                        <Link
                            to="/transport-operators"
                            className="mt-2 flex items-center gap-3 px-2.5 py-2 rounded-lg text-[14px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
                        >
                            <ArrowLeft className="size-[19px] shrink-0" strokeWidth={1.75} />
                            <span className="truncate">Retour au back-office</span>
                        </Link>
                    )}
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
