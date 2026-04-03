import { useEffect, useState } from "react";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";
import MainLayout from "./MainLayout";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";


interface ContributorsProps {
    onLogout?: () => void;
    theme?: "light" | "dark";
    toggleTheme?: () => void;
}

export default function Contributors({ onLogout = () => {}, theme = "light", toggleTheme = () => {} }: ContributorsProps) {
    const [contributors, setContributors] = useState<any[]>([]);
    const [pagination, setPagination] = useState<any[]>([]);
    const [meta, setMeta] = useState<any>(null);
    const [load, setLoad] = useState(true);
    const [search, setSearch] = useState("");
    const Api = new ApiService();
    const navigate = useNavigate();


    const fetchContributors = async (url: string, isPag = false) => {
        setLoad(true);
        try {
            const { data } = await Api.getDatawithPagination(url, isPag);
            if (data.success) {
                setContributors(data.data.data || data.data);
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

    const handleSearch = () => {
        if (!search.trim()) {
            fetchContributors("utilisateur/list-contributor");
        } else {
            fetchContributors(`utilisateur/search-contributor?q=${encodeURIComponent(search)}`);
        }
    };

    useEffect(() => {
        fetchContributors("utilisateur/list-contributor");
    }, []);

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
                {/* Header */}
                <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between sticky top-0 z-10">
                    <div>
                        <nav className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                            <span>Admin</span>
                            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                            <span className="text-primary">Gestion des Contributeurs</span>
                        </nav>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Liste des Contributeurs</h2>
                    </div>
                    <button onClick={() => navigate("/contributors/add")}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-lg shadow-primary/20 transition-all">
                        <span className="material-symbols-outlined text-lg">person_add</span>
                        Ajouter un Contributeur
                    </button>
                </header>


                <div className="p-8 space-y-6">
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
                                    placeholder="Rechercher un contributeur (nom, matricule)..."
                                />
                            </div>
                            <button onClick={handleSearch} className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-primary px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all">
                                <span className="material-symbols-outlined text-sm">filter_list</span>Filtrer
                            </button>
                            <p className="text-xs text-slate-400 ml-auto italic">
                                {meta ? `${meta.from || 0} - ${meta.to || 0} sur ${meta.total || 0} contributeurs` : ""}
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            {load ? (
                                <Loading />
                            ) : (
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Contributeur</th>
                                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Contact</th>
                                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Véhicule</th>
                                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Chauffeur</th>
                                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Statut Véhicule</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {contributors.length > 0 ? (
                                            contributors.map((item) => {
                                                const u = item.user;
                                                const v = item.vehicle;
                                                return (
                                                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-6 py-5">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                                    <span className="material-symbols-outlined text-primary">person</span>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-800 dark:text-white">{u?.nom} {u?.prenom}</p>
                                                                    <p className="text-xs text-slate-500">{u?.ville || v?.ville || "—"}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{u?.email || "—"}</p>
                                                            <p className="text-xs font-bold text-slate-400">{u?.telephone || "—"}</p>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            {v ? (
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-800 dark:text-white">{v.matricule}</p>
                                                                    <p className="text-xs text-slate-500">{v.modele}</p>
                                                                </div>
                                                            ) : "—"}
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            {v?.chauffeur ? (
                                                                <div>
                                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{v.chauffeur.nom} {v.chauffeur.prenom}</p>
                                                                    <p className="text-xs text-slate-400">{v.chauffeur.telephone}</p>
                                                                </div>
                                                            ) : "—"}
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase transition-all ${
                                                                v?.statut === 'LIBRE' ? 'bg-emerald-100 text-emerald-700' :
                                                                v?.statut === 'OCCUPE' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {v?.statut || "INCONNU"}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
                                                        <p>Aucun contributeur trouvé</p>
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
                                                <button key={index} disabled={!item.url} onClick={() => item.url && fetchContributors(item.url, true)}
                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 transition-colors ${!item.url ? "opacity-50 cursor-not-allowed" : "hover:bg-white"}`}>
                                                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                                                </button>
                                            );
                                        }
                                        if (item.label.includes("Next") || item.label.includes("&raquo;")) {
                                            return (
                                                <button key={index} disabled={!item.url} onClick={() => item.url && fetchContributors(item.url, true)}
                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 transition-colors ${!item.url ? "opacity-50 cursor-not-allowed" : "hover:bg-white"}`}>
                                                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                                                </button>
                                            );
                                        }
                                        return (
                                            <button key={index} onClick={() => item.url && fetchContributors(item.url, true)}
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
