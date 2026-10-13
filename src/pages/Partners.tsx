import { useEffect, useState } from "react";
import ApiService from "../services/ApiService";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import Loading from "../components/Loading";
import MainLayout from "./MainLayout";
import { useNavigate } from "react-router-dom";
import { Car, CircleCheck, Handshake, TriangleAlert } from "lucide-react";
import { ActionsMenu, StatCard, type ActionItem } from "../components/ui";
import { notifier } from "../services/notifier";

interface PartnersProps {
    onLogout?: () => void;
    theme?: "light" | "dark";
    toggleTheme?: () => void;
}

export default function Partners({ onLogout = () => {}, theme = "light", toggleTheme = () => {} }: PartnersProps) {
    const [partners, setPartners] = useState<any[]>([]);
    const [pagination, setPagination] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>(null);
    const [load, setLoad] = useState(true);
    const [search, setSearch] = useState("");
    const navigate = useNavigate();
    const Api = new ApiService();

    const fetchPartners = async (url: string, isPag = false) => {
        setLoad(true);
        try {
            const { data } = await Api.getDatawithPagination(url, isPag);
            if (data.success) {
                setPartners(data.data.data || data.data);
                setPagination(data.data.links || []);
                setMeta({
                    current_page: data.data.current_page,
                    from: data.data.from,
                    to: data.data.to,
                    total: data.data.total,
                    last_page: data.data.last_page,
                });
            } else {
                toast.error(data.message || "Erreur lors du chargement");
            }
        } catch {
            toast.error("Connexion au serveur impossible");
        } finally {
            setLoad(false);
        }
    };

    const togglePartnerStatus = async (id: number) => {
        try {
            const { data } = await Api.postData(`dashboard/partner/${id}/toggle`, {});
            if (data.success) {
                toast.success("Statut mis à jour");
                fetchPartners("dashboard/partner");
            } else {
                toast.error(data.message);
            }
        } catch {
            toast.error("Erreur lors de la mise à jour");
        }
    };

    /**
     * L'ajustement du taux.
     *
     * Le dialogue rappelle que le taux se prend sur la part Ongo : la lecture
     * inverse — une ponction sur le chauffeur — est l'erreur naturelle, et
     * elle porte sur de l'argent.
     */
    const ajusterCommission = async (partner: any) => {
        const actuel = partner.commission_rate ?? 0;

        const saisie = await Swal.fire({
            title: `Commission de ${partner.name}`,
            html:
                `<p style="font-size:13px;color:#64748b;margin-bottom:12px">` +
                `Pourcentage prélevé <b>sur la part Ongo</b> de chaque course de ses chauffeurs. ` +
                `La part du chauffeur n'est pas touchée.</p>`,
            input: "number",
            inputValue: String(actuel),
            inputAttributes: { min: "0", max: "100", step: "0.1" },
            showCancelButton: true,
            confirmButtonText: "Enregistrer",
            cancelButtonText: "Annuler",
            inputValidator: (valeur) => {
                const n = Number(valeur);
                if (valeur === "" || Number.isNaN(n)) return "Entrez un pourcentage";
                if (n < 0 || n > 100) return "Le taux doit être compris entre 0 et 100";
                return null;
            },
        });

        if (!saisie.isConfirmed) return;

        try {
            const { data } = await Api.postData(`dashboard/partner/${partner.id}/commission`, {
                commission_rate: Number(saisie.value),
            });
            if (data.success) {
                toast.success("Commission mise à jour");
                fetchPartners("dashboard/partner");
            } else {
                // Le serveur refuse un taux supérieur à la commission
                // plateforme : son message porte le plafond, on le relaie tel quel.
                toast.error(data.message || "Taux refusé");
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Connexion au serveur impossible");
        }
    };

    const actionsPartenaire = (partner: any, isActive: boolean): ActionItem[] => [
        { label: "Ouvrir l'espace", icon: "open_in_new", onClick: () => navigate(`/partner/${partner.uuid ?? partner.id}`) },
        { label: "Gérer la flotte", icon: "directions_car", onClick: () => navigate(`/partners/${partner.id}/fleet`) },
        {
            label: "Notifier",
            icon: "notifications",
            onClick: () => notifier({ destinataires: [{ id: partner.user?.id ?? partner.user_id, nom: partner.name || partner.user?.nom }] }),
        },
        { label: "Ajuster la commission", icon: "percent", separatorBefore: true, onClick: () => ajusterCommission(partner) },
        {
            label: isActive ? "Suspendre" : "Réactiver",
            icon: isActive ? "block" : "check_circle",
            danger: isActive,
            separatorBefore: true,
            onClick: () => confirmToggle(partner.id, isActive),
        },
    ];

    const confirmToggle = (id: number, isActive: boolean) => {
        Swal.fire({
            title: isActive ? "Désactiver ce partenaire ?" : "Activer ce partenaire ?",
            text: "Cette action modifiera le statut du partenaire.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Confirmer",
            cancelButtonText: "Annuler",
        }).then((result) => {
            if (result.isConfirmed) togglePartnerStatus(id);
        });
    };

    const handleSearch = () => {
        if (!search.trim()) {
            fetchPartners("dashboard/partner");
        } else {
            fetchPartners(`dashboard/partner/search?q=${encodeURIComponent(search)}`);
        }
    };

    useEffect(() => {
        fetchPartners("dashboard/partner");
    }, []);

    // Calculés sur la page affichée seulement : l'API ne renvoie pas de
    // totaux. Les cartes le disent, plutôt que de passer une page pour le tout.
    const totalActive = partners.filter((p) => p.user?.is_active).length;
    const totalFleets = partners.reduce((acc, p) => acc + (p.fleets?.length || 0), 0);


    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            {/*
              * Le même gabarit que les écrans d'Ongo Eat et des marchands.
              *
              * La page portait sa propre barre — fil d'Ariane en capitales,
              * cartes à liseré coloré, « +12 % » inventé, une carte « Page
              * actuelle » qui ne disait rien. Elle reprend la forme commune :
              * un titre, une phrase, l'action principale à droite.
              */}
            <header>
                <div className="px-8 py-6 max-w-7xl mx-auto flex items-start justify-between gap-6 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Partenaires</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Les loueurs de flotte : leurs chauffeurs roulent pour Ongo, et ils touchent une part de la commission.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => navigate("/partners/activity")}
                            className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            Suivi d'activité
                        </button>
                        <button
                            onClick={() => navigate("/partners/add")}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white dark:bg-primary-container"
                        >
                            Nouveau partenaire
                        </button>
                    </div>
                </div>
            </header>

            <main className="px-8 py-8 max-w-7xl mx-auto space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard label="Partenaires" value={meta?.total ?? partners.length} icon={Handshake} />
                    <StatCard
                        label="Actifs"
                        value={totalActive}
                        icon={CircleCheck}
                        note={`${partners.length ? Math.round((totalActive / partners.length) * 100) : 0} % de cette page`}
                    />
                    <StatCard label="Véhicules" value={totalFleets} icon={Car} note="Flottes des partenaires de cette page" />
                </div>

                {/* Entrée lance la recherche ; un champ vidé ramène la liste entière. */}
                <div className="flex items-center gap-4">
                    <input
                        value={search}
                        onChange={(evenement) => setSearch(evenement.target.value)}
                        onKeyDown={(evenement) => evenement.key === "Enter" && handleSearch()}
                        placeholder="Chercher un partenaire — nom, email, téléphone, puis Entrée"
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                    {meta && (
                        <p className="text-sm text-slate-500 whitespace-nowrap tabular-nums">
                            {meta.from || 0}–{meta.to || 0} sur {meta.total || 0}
                        </p>
                    )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                    {load ? (
                        <Loading />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[800px]">
                                <thead className="text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-800/40 text-left">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold">Partenaire</th>
                                        <th className="px-5 py-3 font-semibold">Contact</th>
                                        <th className="px-5 py-3 font-semibold text-right">Flotte</th>
                                        <th className="px-5 py-3 font-semibold text-right">Solde</th>
                                        <th className="px-5 py-3 font-semibold text-right">Commission</th>
                                        <th className="px-5 py-3 font-semibold">Statut</th>
                                        <th className="px-5 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {partners.length > 0 ? (
                                        partners.map((partner) => {
                                            const isActive = partner.user?.is_active ?? true;
                                            const flotte = partner.fleets?.length || 0;

                                            return (
                                                <tr key={partner.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="px-5 py-3">
                                                        <p className="font-semibold text-slate-900 dark:text-white">{partner.name || partner.user?.nom}</p>
                                                        <p className="text-xs text-slate-500">{partner.user?.ville || "—"}</p>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <p className="text-slate-700 dark:text-slate-300">{partner.user?.email || "—"}</p>
                                                        <p className="text-xs text-slate-500">{partner.user?.telephone || "—"}</p>
                                                    </td>
                                                    <td className="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                                                        {flotte} véhicule{flotte > 1 ? "s" : ""}
                                                    </td>
                                                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                                        {(partner.total_balance || 0).toLocaleString("fr-FR")} <span className="text-xs font-normal text-slate-500">FCFA</span>
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        {/* En ambre quand le taux dépasse la commission plateforme : il n'est alors pas appliqué. */}
                                                        <span
                                                            title={partner.commission_invalid ? "Taux supérieur à la commission plateforme" : undefined}
                                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium tabular-nums ${
                                                                partner.commission_invalid
                                                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                                                    : (partner.commission_rate ?? 0) > 0
                                                                      ? "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                                                                      : "text-slate-400"
                                                            }`}
                                                        >
                                                            {partner.commission_invalid && <TriangleAlert className="size-3" />}
                                                            {partner.commission_rate ?? 0} %
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                isActive
                                                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                                                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                                            }`}
                                                        >
                                                            {isActive ? "Actif" : "Suspendu"}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => navigate(`/partner/${partner.uuid ?? partner.id}`)}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                            >
                                                                Espace
                                                            </button>
                                                            <ActionsMenu items={actionsPartenaire(partner, isActive)} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                                                Aucun partenaire trouvé.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {pagination.length > 3 && (
                        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                            <p className="text-xs text-slate-500">
                                Page {meta?.current_page} sur {meta?.last_page}
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {pagination.map((lien: any, index: number) => (
                                    <button
                                        key={index}
                                        disabled={!lien.url || lien.active}
                                        onClick={() => lien.url && fetchPartners(lien.url, true)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                                            lien.active
                                                ? "bg-primary text-white dark:bg-primary-container"
                                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        } ${!lien.url ? "opacity-40 cursor-not-allowed" : ""}`}
                                        // Les libellés de Laravel : « &laquo; Previous », « Next &raquo; ».
                                        dangerouslySetInnerHTML={{
                                            __html: lien.label.replace("Previous", "Précédent").replace("Next", "Suivant"),
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </MainLayout>
    );
}
