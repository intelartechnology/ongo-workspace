import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ApiService from "../services/ApiService";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import Loading from "../components/Loading";
import MainLayout from "./MainLayout";
import { useNavigate, useParams } from "react-router-dom";

interface PartnerFleetProps {
    onLogout?: () => void;
    theme?: "light" | "dark";
    toggleTheme?: () => void;
}

export default function PartnerFleet({ onLogout = () => {}, theme = "light", toggleTheme = () => {} }: PartnerFleetProps) {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const Api = new ApiService();

    const [partner, setPartner] = useState<any>(null);
    const [fleets, setFleets] = useState<any[]>([]);
    const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
    const [load, setLoad] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
    const [addLoading, setAddLoading] = useState(false);
    const [pagination, setPagination] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>(null);

    const fetchPartner = async () => {
        try {
            const { data } = await Api.getData(`dashboard/partner/${id}`);
            if (data.success) {
                setPartner(data.data);
            }
        } catch {
            toast.error("Impossible de charger le partenaire");
        }
    };

    const fetchFleets = async (url = `dashboard/fleet?partner_id=${id}`, isPag = false) => {
        setLoad(true);
        try {
            const { data } = await Api.getDatawithPagination(url, isPag);
            if (data.success) {
                const d = data.data;
                setFleets(d.data || d);
                setPagination(d.links || []);
                setMeta({ current_page: d.current_page, from: d.from, to: d.to, total: d.total, last_page: d.last_page });
            } else {
                toast.error(data.message || "Erreur de chargement");
            }
        } catch {
            toast.error("Connexion au serveur impossible");
        } finally {
            setLoad(false);
        }
    };

    const fetchAvailableVehicles = async () => {
        try {
            const { data } = await Api.getData("dashboard/fleet/available-vehicles");
            if (data.success) setAvailableVehicles(data.data || []);
        } catch {
            toast.error("Impossible de charger les véhicules disponibles");
        }
    };

    const addVehicleToFleet = async () => {
        if (!selectedVehicleId) { toast.error("Sélectionnez un véhicule"); return; }
        setAddLoading(true);
        try {
            const { data } = await Api.postData("dashboard/fleet", { partner_id: id, vehicle_id: selectedVehicleId });
            if (data.success) {
                toast.success("Véhicule ajouté à la flotte");
                setShowAddModal(false);
                setSelectedVehicleId("");
                fetchFleets();
            } else {
                toast.error(data.message || "Erreur lors de l'ajout");
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Connexion au serveur impossible");
        } finally {
            setAddLoading(false);
        }
    };

    const removeFromFleet = (fleetId: number) => {
        Swal.fire({
            title: "Retirer ce véhicule ?",
            text: "Ce véhicule sera retiré de la flotte du partenaire.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Retirer",
            cancelButtonText: "Annuler",
            confirmButtonColor: "#d33",
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const { data } = await Api.postData(`dashboard/fleet/${fleetId}/remove`, {});
                    if (data.success) {
                        toast.success("Véhicule retiré avec succès");
                        fetchFleets();
                    } else {
                        toast.error(data.message);
                    }
                } catch {
                    toast.error("Erreur lors de la suppression");
                }
            }
        });
    };

    const openAddModal = () => {
        fetchAvailableVehicles();
        setShowAddModal(true);
    };

    useEffect(() => {
        fetchPartner();
        fetchFleets();
    }, [id]);

    const totalActive = fleets.filter((f) => f.vehicle?.statut === "LIBRE" || f.vehicle?.statut === "OCCUPÉ").length;
    const inMaintenance = fleets.filter((f) => f.vehicle?.statut === "MAINTENANCE").length;

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">

                {/* Header */}
                <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate("/partners")} className="text-slate-400 hover:text-primary p-2 rounded-lg hover:bg-slate-100 transition-all">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                                <span className="hover:text-primary cursor-pointer" onClick={() => navigate("/partners")}>Partenaires</span>
                                <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                                <span className="text-primary">{partner?.name || partner?.user?.nom || "..."}</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gérer la Flotte du Partenaire</h2>
                        </div>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
                    >
                        <span className="material-symbols-outlined">add</span>
                        Ajouter un Véhicule
                    </button>
                </header>

                <div className="p-8 space-y-6">
                    {/* Partner Info Badge */}
                    {partner && (
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                <span className="text-sm font-bold text-primary">{partner?.name || partner?.user?.nom}</span>
                            </div>
                            <span className="text-slate-400 text-sm">•</span>
                            <span className="text-slate-500 text-sm font-medium">ID Partenaire: ONGO-{String(partner.id).padStart(5, "0")}</span>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { label: "Total Véhicules", value: meta?.total || fleets.length, sub: `+${meta?.total || 0} ce mois`, subColor: "text-emerald-600" },
                            { label: "Solde Total Flotte", value: `${(partner?.total_balance || 0).toLocaleString()} XAF`, sub: "Gain cumulé", subColor: "text-primary" },
                            { label: "En Service", value: totalActive, sub: `${fleets.length ? Math.round((totalActive / fleets.length) * 100) : 0}% Capacité`, subColor: "text-slate-500" },
                            { label: "Maintenance", value: inMaintenance, sub: inMaintenance > 0 ? "Action Requise" : "Aucune", subColor: "text-amber-600" },
                        ].map((s) => (
                            <div key={s.label} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{s.label}</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-extrabold">{s.value}</span>
                                    <span className={`text-xs font-semibold ${s.subColor}`}>{s.sub}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Fleet Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 dark:text-white">Détails de la Flotte Active</h3>
                            <p className="text-xs text-slate-400 italic">
                                {meta ? `${meta.from || 0}-${meta.to || 0} sur ${meta.total || 0} véhicules` : ""}
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            {load ? (
                                <Loading />
                            ) : (
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Modèle</th>
                                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Matricule</th>
                                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Ville</th>
                                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Chauffeur</th>
                                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 text-center">Solde</th>
                                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Statut</th>
                                            <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {fleets.length > 0 ? (
                                            fleets.map((fleet) => {
                                                const vehicle = fleet.vehicle;
                                                const driver = vehicle?.driver;
                                                const status = vehicle?.statut || "INACTIF";
                                                const statusMap: Record<string, { bg: string; text: string }> = {
                                                    LIBRE: { bg: "bg-emerald-100 text-emerald-700", text: "ACTIF" },
                                                    OCCUPÉ: { bg: "bg-blue-100 text-blue-700", text: "OCCUPÉ" },
                                                    INACTIF: { bg: "bg-slate-100 text-slate-500", text: "INACTIF" },
                                                    MAINTENANCE: { bg: "bg-amber-100 text-amber-700", text: "MAINTENANCE" },
                                                };
                                                const st = statusMap[status] || statusMap.INACTIF;
                                                return (
                                                    <tr key={fleet.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-6 py-5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                                                                    <span className="material-symbols-outlined text-slate-500">directions_car</span>
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-sm text-slate-800 dark:text-white">{vehicle?.modele || "—"}</p>
                                                                    <p className="text-[10px] text-slate-500">{vehicle?.type || "Véhicule"}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <span className="font-mono text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-semibold tracking-tight">
                                                                {vehicle?.matricule || "—"}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{vehicle?.ville || "—"}</p>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            {driver ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                                                                        {driver.photo ? (
                                                                            <img src={driver.photo} alt="Driver" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <span className="material-symbols-outlined text-xs text-slate-500">person</span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm font-semibold">{driver.nom} {driver.prenom || ""}</p>
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm italic text-slate-400">Non assigné</p>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-5 text-center">
                                                            {driver ? (
                                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                                    {(driver.balance || 0).toLocaleString()} <small className="text-[9px] text-slate-400">XAF</small>
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-slate-300">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${st.bg}`}>{st.text}</span>
                                                        </td>
                                                        <td className="px-6 py-5 text-right">
                                                            <button onClick={() => removeFromFleet(fleet.id)}
                                                                className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                                                                title="Retirer de la flotte">
                                                                <span className="material-symbols-outlined">delete_outline</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <span className="material-symbols-outlined text-4xl text-slate-300">directions_car</span>
                                                        <p>Aucun véhicule dans la flotte</p>
                                                        <button onClick={openAddModal} className="text-primary text-sm font-bold hover:underline">
                                                            + Ajouter un véhicule
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Pagination */}
                        {pagination.length > 0 && (
                            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                                <p className="text-xs text-slate-500 font-medium">Page {meta?.current_page} de {meta?.last_page}</p>
                                <div className="flex items-center gap-2">
                                    {pagination.map((item: any, index: number) => {
                                        const isPrev = item.label.includes("Previous") || item.label.includes("&laquo;");
                                        const isNext = item.label.includes("Next") || item.label.includes("&raquo;");
                                        if (isPrev || isNext) {
                                            return (
                                                <button key={index} disabled={!item.url} onClick={() => item.url && fetchFleets(item.url, true)}
                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 transition-colors ${!item.url ? "opacity-50 cursor-not-allowed" : "hover:bg-white"}`}>
                                                    <span className="material-symbols-outlined text-sm">{isPrev ? "chevron_left" : "chevron_right"}</span>
                                                </button>
                                            );
                                        }
                                        return (
                                            <button key={index} onClick={() => item.url && fetchFleets(item.url, true)}
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-medium transition-colors ${item.active ? "bg-primary text-white border-primary" : "border-slate-200 text-slate-600 hover:bg-white"}`}>
                                                <span dangerouslySetInnerHTML={{ __html: item.label }} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Add Vehicle Modal */}
                {showAddModal && createPortal(
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl p-8 relative">
                            <button onClick={() => { setShowAddModal(false); setSelectedVehicleId(""); }}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                            <h3 className="text-xl font-extrabold text-slate-800 dark:text-white mb-2">Ajouter un Véhicule à la Flotte</h3>
                            <p className="text-slate-500 text-sm mb-6">Sélectionnez un véhicule disponible à assigner à ce partenaire.</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Véhicule Disponible</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">directions_car</span>
                                        <select value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm appearance-none">
                                            <option value="">Sélectionner un véhicule</option>
                                            {availableVehicles.map((v: any) => (
                                                <option key={v.id} value={v.id}>
                                                    {v.modele} — {v.matricule} ({v.ville})
                                                </option>
                                            ))}
                                        </select>
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none">expand_more</span>
                                    </div>
                                    {availableVehicles.length === 0 && (
                                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">warning</span>
                                            Aucun véhicule disponible pour le moment.
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => { setShowAddModal(false); setSelectedVehicleId(""); }}
                                        className="flex-1 py-3 rounded-xl font-bold text-sm text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors">
                                        Annuler
                                    </button>
                                    <button type="button" onClick={addVehicleToFleet} disabled={addLoading || !selectedVehicleId}
                                        className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-primary/90">
                                        {addLoading ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined">add</span>}
                                        {addLoading ? "Ajout..." : "Ajouter"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </MainLayout>
    );
}
