import { useEffect, useState } from "react";
import ApiService from "../services/ApiService";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import Loading from "../components/Loading";
import MainLayout from "./MainLayout";
import { useNavigate } from "react-router-dom";

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

    const totalActive = partners.filter((p) => p.user?.is_active).length;
    const totalFleets = partners.reduce((acc, p) => acc + (p.fleets?.length || 0), 0);

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">

                {/* Header */}
                <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between sticky top-0 z-10">
                    <div>
                        <nav className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                            <span>Admin</span>
                            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                            <span className="text-primary">Gestion des Partenaires</span>
                        </nav>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Liste des Partenaires</h2>
                    </div>
                    <button
                        onClick={() => navigate("/partners/add")}
                        className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
                    >
                        <span className="material-symbols-outlined">person_add</span>
                        Ajouter un Partenaire
                    </button>
                </header>

                <div className="p-8 space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-primary">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Partenaires</p>
                            <div className="flex items-end justify-between">
                                <h3 className="text-2xl font-bold">{meta?.total || partners.length}</h3>
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">+12%</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-emerald-500">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Actifs</p>
                            <div className="flex items-end justify-between">
                                <h3 className="text-2xl font-bold">{totalActive}</h3>
                                <span className="text-xs font-bold text-slate-400">{partners.length ? Math.round((totalActive / partners.length) * 100) : 0}% ratio</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-blue-400">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Véhicules Totaux</p>
                            <div className="flex items-end justify-between">
                                <h3 className="text-2xl font-bold">{totalFleets}</h3>
                                <span className="material-symbols-outlined text-blue-400">local_shipping</span>
                            </div>
                        </div>
                        <div className="bg-primary text-white p-5 rounded-xl shadow-lg shadow-primary/10 relative overflow-hidden">
                            <p className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-1">Page actuelle</p>
                            <h3 className="text-2xl font-bold">{meta?.current_page || 1} / {meta?.last_page || 1}</h3>
                            <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-7xl opacity-10">trending_up</span>
                        </div>
                    </div>

                    {/* Search & Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-4">
                            <div className="flex-1 min-w-[260px] relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="Rechercher un partenaire..."
                                />
                            </div>
                            <button onClick={handleSearch} className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-primary px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all">
                                <span className="material-symbols-outlined text-sm">filter_list</span>Filtrer
                            </button>
                            <p className="text-xs text-slate-400 ml-auto italic">
                                {meta ? `${meta.from || 0} - ${meta.to || 0} sur ${meta.total || 0} partenaires` : ""}
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            {load ? (
                                <Loading />
                            ) : (
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Partenaire</th>
                                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Contact</th>
                                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest text-center">Flotte</th>
                                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest text-center">Solde Total</th>
                                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Statut</th>
                                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {partners.length > 0 ? (
                                            partners.map((partner) => {
                                                const isActive = partner.user?.is_active ?? true;
                                                return (
                                                    <tr key={partner.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-6 py-5">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                                    <span className="material-symbols-outlined text-primary">handshake</span>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-800 dark:text-white">{partner.name || partner.user?.nom}</p>
                                                                    <p className="text-xs text-slate-500">{partner.user?.ville || "—"}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{partner.user?.email || "—"}</p>
                                                            <p className="text-xs font-bold text-slate-400">{partner.user?.telephone || "—"}</p>
                                                        </td>
                                                        <td className="px-6 py-5 text-center">
                                                            <span className="inline-flex items-center justify-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                                                                {partner.fleets?.length || 0} véhicule{(partner.fleets?.length || 0) > 1 ? "s" : ""}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-5 text-center">
                                                            <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200">
                                                                {(partner.total_balance || 0).toLocaleString()} <small className="text-[10px] text-slate-400">XAF</small>
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            {isActive ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                                                    <span className="text-xs font-bold text-emerald-600 uppercase">Actif</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                                                    <span className="text-xs font-bold text-slate-400 uppercase">Inactif</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-5 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => navigate(`/partners/${partner.id}/fleet`)}
                                                                    className="bg-primary/10 hover:bg-primary text-primary hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
                                                                >
                                                                    Gérer la Flotte
                                                                </button>
                                                                <button
                                                                    onClick={() => confirmToggle(partner.id, isActive)}
                                                                    className={`p-2 rounded-lg transition-all ${isActive ? "hover:bg-red-50 text-slate-400 hover:text-red-500" : "hover:bg-emerald-50 text-slate-400 hover:text-emerald-500"}`}
                                                                    title={isActive ? "Désactiver" : "Activer"}
                                                                >
                                                                    <span className="material-symbols-outlined text-lg">{isActive ? "block" : "check_circle"}</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
                                                        <p>Aucun partenaire trouvé</p>
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
                                <p className="text-xs text-slate-500 font-medium">
                                    Page {meta?.current_page} de {meta?.last_page}
                                </p>
                                <div className="flex items-center gap-2">
                                    {pagination.map((item: any, index: number) => {
                                        if (item.label.includes("Previous") || item.label.includes("&laquo;")) {
                                            return (
                                                <button key={index} disabled={!item.url} onClick={() => item.url && fetchPartners(item.url, true)}
                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 transition-colors ${!item.url ? "opacity-50 cursor-not-allowed" : "hover:bg-white"}`}>
                                                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                                                </button>
                                            );
                                        }
                                        if (item.label.includes("Next") || item.label.includes("&raquo;")) {
                                            return (
                                                <button key={index} disabled={!item.url} onClick={() => item.url && fetchPartners(item.url, true)}
                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 transition-colors ${!item.url ? "opacity-50 cursor-not-allowed" : "hover:bg-white"}`}>
                                                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                                                </button>
                                            );
                                        }
                                        return (
                                            <button key={index} onClick={() => item.url && fetchPartners(item.url, true)}
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-medium transition-colors ${item.active ? "bg-primary text-white border-primary" : "border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-white"}`}>
                                                <span dangerouslySetInnerHTML={{ __html: item.label }} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
