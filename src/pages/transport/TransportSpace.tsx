import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Eye, Lock, Menu, Moon, RefreshCw, Sun } from "lucide-react";
import ApiService from "../../services/ApiService";
import Loading from "../../components/Loading";
import DeparturesBoard from "./DeparturesBoard";
import TransportLines from "./TransportLines";
import TransportSidebar from "./TransportSidebar";
import TransportStations from "./TransportStations";
import TransportTeam from "./TransportTeam";
import TransportRevenue from "./TransportRevenue";
import TransportRefunds from "./TransportRefunds";
import type { EspaceTransport } from "./transportDonnees";

interface TransportSpaceProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

/** Les rubriques de gestion, et leur titre. L'écran des départs n'en est pas : il s'ouvre en plein écran. */
const TITRES: Record<string, string> = {
    lignes: "Lignes et horaires",
    gares: "Gares",
    equipe: "Équipe",
    revenus: "Revenus",
    remboursements: "Remboursements",
};

/**
 * L'espace d'un transporteur (bus, train).
 *
 * Il s'ouvre sur l'écran des départs, en plein écran : c'est ce que la gare
 * garde affiché toute la journée. Les rubriques de gestion — lignes et
 * horaires, gares, équipe — ont chacune leur adresse
 * (`/transport/<id>/<rubrique>`) et la barre latérale du back-office.
 *
 * Un agent de gare n'a que l'écran des départs : les rubriques ne lui sont
 * pas proposées, et le serveur refuserait de toute façon ses modifications.
 *
 * L'identifiant est dans l'URL : l'accès se décide côté serveur
 * (`transport.member`), le front n'en garantit rien.
 */
export default function TransportSpace({ onLogout, theme, toggleTheme }: TransportSpaceProps) {
    const { operatorId, section = "" } = useParams<{ operatorId: string; section?: string }>();
    const [menuOuvert, setMenuOuvert] = useState(false);
    const navigate = useNavigate();

    const [espace, setEspace] = useState<EspaceTransport | null>(null);
    const [chargement, setChargement] = useState(true);
    const [erreur, setErreur] = useState<string | null>(null);

    const charger = async () => {
        setChargement(true);
        setErreur(null);
        try {
            const { data } = await new ApiService().getData(`v3/transport/${operatorId}`);
            if (data.success) setEspace(data.data);
            else setErreur(data.message || "Espace introuvable");
        } catch (e: unknown) {
            const code = (e as { response?: { status?: number } })?.response?.status;
            setErreur(code === 404 ? "Cet espace ne vous est pas accessible." : "Connexion au serveur impossible.");
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => {
        if (operatorId) charger();
    }, [operatorId]); // eslint-disable-line react-hooks/exhaustive-deps

    if (chargement && !espace) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-background-dark grid place-items-center">
                <Loading />
            </div>
        );
    }

    if (erreur || !espace) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-background-dark p-8 flex flex-col items-center justify-center gap-4 text-center">
                <Lock className="size-12 text-slate-300 dark:text-slate-700" />
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">Espace indisponible</p>
                <p className="text-sm text-slate-500 max-w-sm">{erreur}</p>
                <div className="flex gap-2 mt-2">
                    <button onClick={charger} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300">
                        <RefreshCw className="size-4" /> Réessayer
                    </button>
                    <button onClick={onLogout} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                        Se déconnecter
                    </button>
                </div>
            </div>
        );
    }

    const id = espace.operator.short_id;
    const base = `/transport/${id}`;
    const admin = espace.role === "admin";

    if (section === "" || !TITRES[section]) {
        if (section !== "") return <Navigate to={base} replace />;
        return (
            <DeparturesBoard
                operatorId={id}
                espace={espace}
                onLogout={onLogout}
                onGerer={espace.can_manage ? () => navigate(`${base}/lignes`) : undefined}
                // Un administrateur dépanne : il repart vers le back-office, sans se déconnecter.
                onQuitter={admin ? () => navigate("/transport-operators") : undefined}
            />
        );
    }

    // Un agent de gare n'a que l'écran des départs.
    if (!espace.can_manage) return <Navigate to={base} replace />;

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
            <TransportSidebar
                nom={espace.operator.name}
                base={base}
                section={section}
                mode={espace.operator.mode}
                admin={admin}
                isOpen={menuOuvert}
                setIsOpen={setMenuOuvert}
                onLogout={onLogout}
            />

            <main className="lg:ml-[272px] min-h-screen flex flex-col min-w-0">
                <header className="h-16 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 px-4 md:px-8 sticky top-0 z-40">
                    <button onClick={() => setMenuOuvert(true)} title="Menu" className="lg:hidden -ml-1 size-9 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Menu className="size-5" />
                    </button>
                    <h2 className="flex-1 min-w-0 truncate text-base md:text-[17px] font-bold tracking-tight text-slate-900 dark:text-white">{TITRES[section]}</h2>
                    <button
                        onClick={toggleTheme}
                        title={theme === "light" ? "Passer en mode sombre" : "Passer en mode clair"}
                        className="size-9 grid place-items-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        {theme === "light" ? <Moon className="size-[18px]" strokeWidth={1.75} /> : <Sun className="size-[18px]" strokeWidth={1.75} />}
                    </button>
                </header>

                <div className="flex-1 px-4 md:px-8 py-6 space-y-4">
                    {admin && (
                        <div className="flex items-start gap-2.5 p-3 rounded-xl border border-primary/20 bg-primary/5 text-primary dark:text-primary-fixed-dim">
                            <Eye className="size-4 mt-0.5 shrink-0" />
                            <p className="text-[13px] font-medium">Vous consultez l'espace de {espace.operator.name} en tant qu'administrateur. Vos actions y sont enregistrées comme les siennes.</p>
                        </div>
                    )}
                    {section === "lignes" && <TransportLines operatorId={id} peutGerer={espace.can_manage} />}
                    {section === "gares" && <TransportStations operatorId={id} peutGerer={espace.can_manage} />}
                    {section === "equipe" && <TransportTeam operatorId={id} espace={espace} />}
                    {section === "revenus" && <TransportRevenue operatorId={id} />}
                    {section === "remboursements" && <TransportRefunds operatorId={id} />}
                </div>
            </main>
        </div>
    );
}
