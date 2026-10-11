import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "../MainLayout";
import ApiService from "../../services/ApiService";
import Loading from "../../components/Loading";
import { Button } from "../../components/ui";
import PartnerDrivers from "./space/PartnerDrivers";
import PartnerRides from "./space/PartnerRides";
import PartnerReport from "./space/PartnerReport";
import PartnerOverview from "./space/PartnerOverview";
import PartnerTeam from "./space/PartnerTeam";
import PartnerWallet from "./space/PartnerWallet";
import PartnerFleet from "./space/PartnerFleet";

export interface Partenaire {
    id: number;
    uuid?: string;
    name: string;
    contact: string | null;
    commission_rate: number;
    is_active: boolean;
    commission_invalid?: boolean;
    me?: { id: number; role: "owner" | "staff" | "admin" };
    stats?: {
        drivers_total: number;
        drivers_active: number;
        courses_month: number;
        revenue_month: number;
        /** Nul pour un membre d'équipe : le serveur ne le lui envoie pas. */
        commission_month: number | null;
    };
}

interface PartnerSpaceProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

type Onglet = "apercu" | "chauffeurs" | "flotte" | "courses" | "rapport" | "portefeuille" | "equipe";

const ONGLETS: { cle: Onglet; libelle: string; icone: string }[] = [
    { cle: "apercu", libelle: "Aperçu", icone: "dashboard" },
    { cle: "chauffeurs", libelle: "Chauffeurs", icone: "sports_motorsports" },
    { cle: "flotte", libelle: "Flotte", icone: "directions_car" },
    { cle: "courses", libelle: "Courses", icone: "route" },
    { cle: "rapport", libelle: "Rapport", icone: "summarize" },
    { cle: "portefeuille", libelle: "Portefeuille", icone: "account_balance_wallet" },
    { cle: "equipe", libelle: "Équipe", icone: "group" },
];

/**
 * L'espace de travail d'un partenaire.
 *
 * Calqué sur l'espace marchand : une seule route porte l'identifiant, les
 * sections sont des onglets. L'ancien espace partenaire se cadrait sur
 * l'utilisateur connecté, ce qui interdisait à un admin d'ouvrir l'espace de
 * quelqu'un pour le dépanner. Ici l'identifiant est dans l'URL — ce qui
 * déplace l'autorisation côté serveur, car le front ne peut rien garantir.
 */
export default function PartnerSpace({ onLogout, theme, toggleTheme }: PartnerSpaceProps) {
    const { partnerId } = useParams<{ partnerId: string }>();
    const navigate = useNavigate();
    const api = new ApiService();

    const [partenaire, setPartenaire] = useState<Partenaire | null>(null);
    const [chargement, setChargement] = useState(true);
    const [erreur, setErreur] = useState<string | null>(null);
    const [onglet, setOnglet] = useState<Onglet>("apercu");

    const charger = async () => {
        setChargement(true);
        setErreur(null);
        try {
            const { data } = await api.getData(`v3/partner/${partnerId}`);
            if (data.success) {
                setPartenaire(data.data);
            } else {
                setErreur(data.message || "Partenaire introuvable");
            }
        } catch (e: any) {
            // Un 403 ici veut dire que le compte n'a pas accès à CET espace —
            // pas que le serveur est injoignable. Le dire franchement évite de
            // chercher une panne réseau qui n'existe pas.
            const code = e?.response?.status;
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
    }, [partnerId]);

    if (chargement) {
        return (
            <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
                <Loading />
            </MainLayout>
        );
    }

    if (erreur || !partenaire) {
        return (
            <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
                <div className="p-8 flex flex-col items-center justify-center gap-4 text-center min-h-[60vh]">
                    <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700">lock</span>
                    <p className="text-base font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">Espace indisponible</p>
                    <p className="text-sm text-slate-500 max-w-sm">{erreur}</p>
                    <div className="flex gap-2 mt-2">
                        <Button icon="refresh" onClick={charger}>Réessayer</Button>
                        <Button variant="ghost" icon="arrow_back" onClick={() => navigate("/partners")}>Partenaires</Button>
                    </div>
                </div>
            </MainLayout>
        );
    }

    const admin = partenaire.me?.role === "admin";

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-background-dark">

                <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 pt-5">
                    <div className="flex flex-wrap items-start gap-3 mb-4">
                        <div className="mr-auto min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white truncate">{partenaire.name}</h1>
                                {!partenaire.is_active && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400">
                                        Suspendu
                                    </span>
                                )}
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary">
                                    {partenaire.commission_rate} % de commission
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 font-mono">{partenaire.contact || "Pas de contact"}</p>
                        </div>

                        {admin && (
                            <Button variant="ghost" size="sm" icon="arrow_back" onClick={() => navigate("/partners")}>
                                Retour admin
                            </Button>
                        )}
                    </div>

                    {/* Un admin entre ici pour dépanner, mais il agit AU NOM du
                        partenaire : désactiver un chauffeur depuis cet écran a
                        exactement le même effet que si le partenaire l'avait
                        fait. Sans repère visible, on oublie dans quel espace on
                        se trouve — et on le découvre après coup. */}
                    {admin && (
                        <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <span className="material-symbols-outlined text-[20px] shrink-0">visibility</span>
                            <p className="text-xs font-semibold leading-relaxed">
                                Vous consultez cet espace en tant qu'administrateur.
                                Les actions que vous y menez — ajout, activation, détachement de chauffeur —
                                sont enregistrées comme celles du partenaire.
                            </p>
                        </div>
                    )}

                    {/* Un partenaire suspendu garde son espace en lecture : le lui
                        fermer le priverait de ses rapports sans rien régler. */}
                    {!partenaire.is_active && (
                        <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400">
                            <span className="material-symbols-outlined text-[20px] shrink-0">block</span>
                            <p className="text-xs font-semibold leading-relaxed">
                                Ce partenariat est suspendu. Les écrans restent consultables, mais l'ajout et l'activation de chauffeurs sont bloqués.
                            </p>
                        </div>
                    )}

                    {partenaire.commission_invalid && (
                        <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            <span className="material-symbols-outlined text-[20px] shrink-0">warning</span>
                            <p className="text-xs font-semibold leading-relaxed">
                                Le taux de ce partenaire dépasse la commission actuelle de la plateforme. Aucune commission ne peut être calculée tant qu'un admin ne l'a pas ajusté.
                            </p>
                        </div>
                    )}

                    {/* Le personnel ne voit pas ce que le partenariat rapporte :
                        l'onglet est retire plutot que de mener a un refus. */}
                    <nav className="flex gap-1 overflow-x-auto">
                        {ONGLETS.filter((item) => !(["rapport", "portefeuille"].includes(item.cle) && partenaire.me?.role === "staff")).map((item) => (
                            <button
                                key={item.cle}
                                onClick={() => setOnglet(item.cle)}
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${onglet === item.cle
                                    ? "border-primary text-primary"
                                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
                            >
                                <span className="material-symbols-outlined text-[18px]">{item.icone}</span>
                                {item.libelle}
                            </button>
                        ))}
                    </nav>
                </header>

                <div className="flex-1 p-4 md:p-8">
                    {onglet === "apercu" && <PartnerOverview partenaire={partenaire} onVoirChauffeurs={() => setOnglet("chauffeurs")} />}
                    {onglet === "chauffeurs" && <PartnerDrivers partnerId={partnerId!} actif={partenaire.is_active} onChange={charger} />}
                    {onglet === "flotte" && <PartnerFleet partnerId={partnerId!} actif={partenaire.is_active} />}
                    {onglet === "courses" && <PartnerRides partnerId={partnerId!} />}
                    {onglet === "rapport" && <PartnerReport partnerId={partnerId!} />}
                    {onglet === "portefeuille" && <PartnerWallet partnerId={partnerId!} actif={partenaire.is_active} role={partenaire.me?.role ?? "staff"} />}
                    {onglet === "equipe" && <PartnerTeam partnerId={partnerId!} role={partenaire.me?.role ?? "staff"} />}
                </div>
            </div>
        </MainLayout>
    );
}
