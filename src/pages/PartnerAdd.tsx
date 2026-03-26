import { useState } from "react";
import { createPortal } from "react-dom";
import ApiService from "../services/ApiService";
import { toast } from "react-toastify";
import MainLayout from "./MainLayout";
import { useNavigate } from "react-router-dom";

interface PartnerAddProps {
    onLogout?: () => void;
    theme?: "light" | "dark";
    toggleTheme?: () => void;
}

export default function PartnerAdd({ onLogout = () => {}, theme = "light", toggleTheme = () => {} }: PartnerAddProps) {
    const navigate = useNavigate();
    const Api = new ApiService();

    const [form, setForm] = useState({ name: "", user_id: "", contact: "" });
    const [loading, setLoading] = useState(false);

    // User selection modal
    const [showUserModal, setShowUserModal] = useState(false);
    const [userSearch, setUserSearch] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const fetchUsers = async (q = "") => {
        setUsersLoading(true);
        try {
            const { data } = await Api.getData(`dashboard/users/search?q=${encodeURIComponent(q)}`);
            if (data.success) {
                setUsers(data.data.data || data.data || []);
            }
        } catch {
            toast.error("Impossible de charger les utilisateurs");
        } finally {
            setUsersLoading(false);
        }
    };

    const openUserModal = () => {
        setShowUserModal(true);
        fetchUsers();
    };

    const selectUser = (user: any) => {
        setSelectedUser(user);
        setForm((prev) => ({
            ...prev,
            user_id: user.id,
            contact: user.telephone || user.email || "",
        }));
        setShowUserModal(false);
        setUserSearch("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.user_id) {
            toast.error("Veuillez remplir le nom et sélectionner un utilisateur");
            return;
        }
        setLoading(true);
        try {
            const { data } = await Api.postData("dashboard/partner", form);
            if (data.success) {
                toast.success("Partenaire créé avec succès");
                navigate("/partners");
            } else {
                toast.error(data.message || "Erreur lors de la création");
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Connexion au serveur impossible");
        } finally {
            setLoading(false);
        }
    };

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-background-dark font-display">

                {/* Header */}
                <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate("/partners")} className="text-slate-400 hover:text-primary p-2 rounded-lg hover:bg-slate-100 transition-all">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div>
                            <nav className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                                <span className="hover:text-primary cursor-pointer" onClick={() => navigate("/partners")}>Partenaires</span>
                                <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                                <span className="text-primary">Nouveau Partenaire</span>
                            </nav>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Ajouter un Partenaire</h2>
                        </div>
                    </div>
                </header>

                <div className="flex-1 p-8 flex justify-center">
                    <div className="w-full max-w-4xl">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 md:p-10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 pointer-events-none" />

                            <div className="relative z-10">
                                <div className="mb-8">
                                    <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">Informations du Partenaire</h3>
                                    <p className="text-slate-500 text-sm mt-1">Sélectionnez un utilisateur existant et créez le profil partenaire.</p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">

                                    {/* Selected User Card */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Utilisateur Associé *</label>
                                        {selectedUser ? (
                                            <div className="flex items-center justify-between p-4 bg-primary/5 border-2 border-primary/20 rounded-xl">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-primary text-2xl">person</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-white">{selectedUser.nom} {selectedUser.prenom || ""}</p>
                                                        <div className="flex items-center gap-3 mt-0.5">
                                                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[12px]">call</span>
                                                                {selectedUser.telephone || "—"}
                                                            </span>
                                                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[12px]">mail</span>
                                                                {selectedUser.email || "—"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button type="button" onClick={openUserModal}
                                                    className="text-primary text-xs font-bold hover:underline flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">swap_horiz</span>Changer
                                                </button>
                                            </div>
                                        ) : (
                                            <button type="button" onClick={openUserModal}
                                                className="w-full p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center gap-2 group">
                                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                                    <span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-2xl">person_search</span>
                                                </div>
                                                <span className="text-sm font-bold text-slate-500 group-hover:text-primary">Sélectionner un utilisateur</span>
                                                <span className="text-xs text-slate-400">Cliquez pour rechercher et sélectionner un utilisateur existant</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Section divider */}
                                    <div className="pt-2 pb-1 border-t border-slate-100 dark:border-slate-800">
                                        <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                                            <span className="w-8 h-px bg-primary/20"></span>Détails du Partenaire
                                        </h4>
                                    </div>

                                    {/* Partner Name */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Nom du Partenaire *</label>
                                            <div className="relative group">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-primary transition-colors">business</span>
                                                <input name="name" value={form.name}
                                                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                                    required
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                                                    placeholder="Ex: Ongo Logistics SARL" />
                                            </div>
                                        </div>

                                        {/* Contact */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Contact</label>
                                            <div className="relative group">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-primary transition-colors">call</span>
                                                <input name="contact" value={form.contact}
                                                    onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                                                    placeholder="+237 6XX XXX XXX" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col sm:flex-row items-center justify-end gap-4 mt-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <button type="button" onClick={() => navigate("/partners")}
                                            className="w-full sm:w-auto px-8 py-3 rounded-full font-bold text-sm text-slate-500 hover:bg-slate-100 transition-colors">
                                            Annuler
                                        </button>
                                        <button type="submit" disabled={loading || !form.user_id}
                                            className="w-full sm:w-auto px-10 py-3 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                                            {loading ? (
                                                <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                                            ) : (
                                                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>
                                            )}
                                            {loading ? "Enregistrement..." : "Enregistrer le Partenaire"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                {showUserModal && createPortal(
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative flex flex-col" style={{ maxHeight: "80vh" }}>
                            {/* Modal Header */}
                            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">Sélectionner un Utilisateur</h3>
                                    <button onClick={() => { setShowUserModal(false); setUserSearch(""); }}
                                        className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                    <input
                                        value={userSearch}
                                        onChange={(e) => {
                                            setUserSearch(e.target.value);
                                            fetchUsers(e.target.value);
                                        }}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        placeholder="Rechercher par nom, téléphone, email..."
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto p-2">
                                {usersLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span>
                                    </div>
                                ) : users.length > 0 ? (
                                    <div className="space-y-1">
                                        {users.map((user: any) => (
                                            <button key={user.id} onClick={() => selectUser(user)}
                                                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-primary/5 transition-all text-left group">
                                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors flex-shrink-0">
                                                    <span className="material-symbols-outlined text-slate-500 group-hover:text-primary">person</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm text-slate-800 dark:text-white truncate">
                                                        {user.nom} {user.prenom || ""}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-0.5">
                                                        <span className="text-[11px] text-slate-500">{user.telephone || "—"}</span>
                                                        <span className="text-[11px] text-slate-400">{user.email || ""}</span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                                        <span className="material-symbols-outlined text-4xl text-slate-300">person_off</span>
                                        <p className="text-sm text-slate-500">Aucun utilisateur disponible</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </MainLayout>
    );
}
