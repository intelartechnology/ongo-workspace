import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Eye, Lock, Menu, Moon, OctagonX, RefreshCw, Sun, TriangleAlert } from "lucide-react";
import ApiService from "../../services/ApiService";
import Loading from "../../components/Loading";
import PartnerSidebar from "./PartnerSidebar";
import PartnerDashboard from "./space/PartnerDashboard";
import PartnerDriverReport from "./space/PartnerDriverReport";
import PartnerDrivers from "./space/PartnerDrivers";
import PartnerRides from "./space/PartnerRides";
import PartnerReport from "./space/PartnerReport";
import PartnerTeam from "./space/PartnerTeam";
import PartnerWallet from "./space/PartnerWallet";
import PartnerFleet from "./space/PartnerFleet";

export interface Partenaire {
    id: number;
    /** L'identifiant de l'URL, comme `/merchant/<short_id>`. */
    short_id?: string;
    name: string;
    contact: string | null;
    commission_rate: number;
    is_active: boolean;
    commission_invalid?: boolean;
    me?: { id: number; role: "owner" | "staff" | "admin" };
}

interface PartnerSpaceProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

/** Le titre de la barre du haut, selon la rubrique ouverte. */
const TITRES: Record<string, string> = {
    "": "Tableau de bord",
    chauffeurs: "Chauffeurs",
    flotte: "Véhicules",
    courses: "Courses",
    rapport: "Rapport financier",
    portefeuille: "Portefeuille",
    equipe: "Équipe",
};

/**
 * L'espace d'un propriétaire de flotte.
 *
 * Bâti comme le back-office : une barre latérale à gauche, une barre de titre
 * en haut, la rubrique au centre. Chaque rubrique a son adresse —
 * `/partner/<id>/chauffeurs`, et le rapport d'un chauffeur
 * `/partner/<id>/chauffeurs/<n°>` — pour qu'un lien mène à l'écran exact et
 * que « précédent » ramène où l'on était.
 *
 * L'identifiant est dans l'URL : l'autorisation se décide côté serveur
 * (`partner.member`), le front n'en garantit rien.
 */
export default function PartnerSpace({ onLogout, theme, toggleTheme }: PartnerSpaceProps) {
    const { partnerId, section = "", sousId } = useParams<{ partnerId: string; section?: string; sousId?: string }>();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const [partenaire, setPartenaire] = useState<Partenaire | null>(null);
    const [chargement, setChargement] = useState(true);
    const [erreur, setErreur] = useState<string | null>(null);
    const [menuOuvert, setMenuOuvert] = useState(false);

    const charger = async () => {
        setChargement(true);
        setErreur(null);
        try {
            const { data } = await new ApiService().getData(`v3/partner/${partnerId}`);
            if (data.success) {
                setPartenaire(data.data);
                // Ouvert par l'ancien `id` (lien d'avant l'identifiant public) :
                // l'adresse prend la forme courte, rubrique comprise.
                if (data.data?.short_id && data.data.short_id !== partnerId) {
                    navigate(pathname.replace(`/partner/${partnerId}`, `/partner/${data.data.short_id}`), { replace: true });
                }
            } else {
                setErreur(data.message || "Partenaire introuvable");
            }
        } catch (e: unknown) {
            const code = (e as { response?: { status?: number } })?.response?.status;
            setErreur(
                code === 403 ? "Vous n'avez pas accès à cet espace partenaire."
                    : code === 404 ? "Ce partenaire n'existe pas."
                        : "Connexion au serveur impossible.",
            );
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => {
        if (partnerId) charger();
    }, [partnerId]); // eslint-disable-line react-hooks/exhaustive-deps

    if (chargement && !partenaire) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-background-dark grid place-items-center">
                <Loading />
            </div>
        );
    }

    if (erreur || !partenaire) {
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

    const role = partenaire.me?.role ?? "staff";
    const admin = role === "admin";
    const proprietaire = role !== "staff";
    const id = partenaire.short_id ?? partnerId!;
    const base = `/partner/${id}`;

    // Un membre d'équipe n'ouvre pas les finances : la rubrique n'existe pas pour lui.
    const rubrique = !proprietaire && ["rapport", "portefeuille"].includes(section) ? "" : section;
    const titre = rubrique === "chauffeurs" && sousId ? "Rapport du chauffeur" : (TITRES[rubrique] ?? "Tableau de bord");

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-slate-100">
            <PartnerSidebar
                nom={partenaire.name}
                base={base}
                section={sousId ? `${rubrique}/${sousId}` : rubrique}
                proprietaire={proprietaire}
                admin={admin}
                isOpen={menuOuvert}
                setIsOpen={setMenuOuvert}
                onLogout={onLogout}
            />

            <main className="lg:ml-[272px] min-h-screen flex flex-col min-w-0">
                {/* La barre du haut, comme au back-office. */}
                <header className="h-16 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 px-4 md:px-8 sticky top-0 z-40">
                    <button onClick={() => setMenuOuvert(true)} title="Menu" className="lg:hidden -ml-1 size-9 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Menu className="size-5" />
                    </button>
                    <h2 className="flex-1 min-w-0 truncate text-base md:text-[17px] font-bold tracking-tight text-slate-900 dark:text-white">{titre}</h2>
                    <button
                        onClick={toggleTheme}
                        title={theme === "light" ? "Passer en mode sombre" : "Passer en mode clair"}
                        className="size-9 grid place-items-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        {theme === "light" ? <Moon className="size-[18px]" strokeWidth={1.75} /> : <Sun className="size-[18px]" strokeWidth={1.75} />}
                    </button>
                </header>

                <div className="flex-1 px-4 md:px-8 py-6 space-y-4">
                    {/* Un admin agit AU NOM du partenaire : sans repère visible, on
                        oublie dans quel espace on se trouve. */}
                    {admin && (
                        <div className="flex items-start gap-2.5 p-3 rounded-xl border border-primary/20 bg-primary/5 text-primary dark:text-primary-fixed-dim">
                            <Eye className="size-4 mt-0.5 shrink-0" />
                            <p className="text-[13px] font-medium">
                                Vous consultez l'espace de {partenaire.name} en tant qu'administrateur. Vos actions y sont enregistrées comme les siennes.
                            </p>
                        </div>
                    )}
                    {!partenaire.is_active && (
                        <div className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                            <OctagonX className="size-4 mt-0.5 shrink-0" />
                            <p className="text-[13px] font-medium">Ce partenariat est suspendu. Les écrans restent consultables, mais l'ajout et l'activation de chauffeurs sont bloqués.</p>
                        </div>
                    )}
                    {partenaire.commission_invalid && proprietaire && (
                        <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                            <TriangleAlert className="size-4 mt-0.5 shrink-0" />
                            <p className="text-[13px] font-medium">Votre taux de commission dépasse celui de la plateforme : aucune commission n'est calculée tant qu'Ongo ne l'a pas ajusté.</p>
                        </div>
                    )}

                    {rubrique === "" && <PartnerDashboard partnerId={id} theme={theme} />}
                    {rubrique === "chauffeurs" && !sousId && (
                        <PartnerDrivers partnerId={id} actif={partenaire.is_active} onChange={charger} onOuvrir={(chauffeur) => navigate(`${base}/chauffeurs/${chauffeur}`)} />
                    )}
                    {rubrique === "chauffeurs" && sousId && <PartnerDriverReport partnerId={id} driverId={sousId} theme={theme} />}
                    {rubrique === "flotte" && <PartnerFleet partnerId={id} actif={partenaire.is_active} />}
                    {rubrique === "courses" && <PartnerRides partnerId={id} />}
                    {rubrique === "rapport" && <PartnerReport partnerId={id} />}
                    {rubrique === "portefeuille" && <PartnerWallet partnerId={id} actif={partenaire.is_active} role={role} />}
                    {rubrique === "equipe" && <PartnerTeam partnerId={id} role={role} />}
                </div>
            </main>
        </div>
    );
}
