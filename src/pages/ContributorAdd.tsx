import { useState } from "react";
import { createPortal } from "react-dom";
import ApiService from "../services/ApiService";
import { toast } from "react-toastify";
import MainLayout from "./MainLayout";
import { useNavigate } from "react-router-dom";

interface ContributorAddProps {
    onLogout?: () => void;
    theme?: "light" | "dark";
    toggleTheme?: () => void;
}

export default function ContributorAdd({ onLogout = () => {}, theme = "light", toggleTheme = () => {} }: ContributorAddProps) {
    const navigate = useNavigate();
    const Api = new ApiService();

    const [loading, setLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [selectedVehicle, setSelectedVehicle] = useState<any>(null);

    // User selection modal
    const [showUserModal, setShowUserModal] = useState(false);
    const [userSearch, setUserSearch] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);

    // Vehicle selection modal
    const [showVehicleModal, setShowVehicleModal] = useState(false);
    const [vehicleSearch, setVehicleSearch] = useState("");
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [vehiclesLoading, setVehiclesLoading] = useState(false);

    const fetchUsers = async (q = "") => {
        setUsersLoading(true);
        try {
            const { data } = await Api.getData(`utilisateur/search-user-contributor?q=${encodeURIComponent(q)}`);
            if (data.success) {
                setUsers(data.data.data || data.data || []);
            }
        } catch {
            toast.error("Impossible de charger les utilisateurs");
        } finally {
            setUsersLoading(false);
        }
    };

    const fetchVehicles = async (q = "") => {
        setVehiclesLoading(true);
        try {
            const { data } = await Api.getData(`utilisateur/search-vehicle-contributor?q=${encodeURIComponent(q)}`);
            if (data.success) {
                setVehicles(data.data.data || data.data || []);
            }
        } catch {
            toast.error("Impossible de charger les véhicules");
        } finally {
            setVehiclesLoading(false);
        }
    };

    const selectUser = (user: any) => {
        setSelectedUser(user);
        setShowUserModal(false);
        setUserSearch("");
    };

    const selectVehicle = (vehicle: any) => {
        setSelectedVehicle(vehicle);
        setShowVehicleModal(false);
        setVehicleSearch("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || !selectedVehicle) {
            toast.error("Veuillez sélectionner un utilisateur et un véhicule");
            return;
        }
        setLoading(true);
        try {
            const { data } = await Api.postData("utilisateur/add-contributor", {
                user_id: selectedUser.id,
                vehicle_id: selectedVehicle.id
            });
            if (data.success) {
                toast.success("Contributeur ajouté avec succès");
                navigate("/contributors");
            } else {
                toast.error(data.message || "Erreur lors de l'ajout");
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
                        <button onClick={() => navigate("/contributors")} className="text-slate-400 hover:text-primary p-2 rounded-lg hover:bg-slate-100 transition-all">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div>
                            <nav className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                                <span className="hover:text-primary cursor-pointer" onClick={() => navigate("/contributors")}>Contributeurs</span>
                                <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                                <span className="text-primary">Nouveau Contributeur</span>
                            </nav>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Ajouter un Contributeur</h2>
                        </div>
                    </div>
                </header>

                <div className="flex-1 p-8 flex justify-center">
                    <div className="w-full max-w-4xl">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 md:p-10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 pointer-events-none" />

                            <div className="relative z-10">
                                <div className="mb-8">
                                    <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">Détails de l'Association</h3>
                                    <p className="text-slate-500 text-sm mt-1">Sélectionnez un utilisateur et le véhicule auquel il sera associé comme contributeur.</p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-8">

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* User Selection */}
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Utilisateur Associé *</label>
                                            {selectedUser ? (
                                                <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-xl relative group">
                                                    <button type="button" onClick={() => setShowUserModal(true)} className="absolute top-2 right-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="material-symbols-outlined text-sm">edit</span>
                                                    </button>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-primary text-2xl">person</span>
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800 dark:text-white truncate">{selectedUser.nom} {selectedUser.prenom || ""}</p>
                                                            <p className="text-xs text-slate-500">{selectedUser.telephone || selectedUser.email}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button type="button" onClick={() => { setShowUserModal(true); fetchUsers(); }}
                                                    className="w-full p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center gap-2 group">
                                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                                        <span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-2xl">person_search</span>
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-500 group-hover:text-primary">Sélectionner un utilisateur</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Vehicle Selection */}
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Véhicule Associé *</label>
                                            {selectedVehicle ? (
                                                <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-xl relative group">
                                                    <button type="button" onClick={() => setShowVehicleModal(true)} className="absolute top-2 right-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="material-symbols-outlined text-sm">edit</span>
                                                    </button>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-primary text-2xl">directions_car</span>
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800 dark:text-white truncate">{selectedVehicle.matricule}</p>
                                                            <p className="text-xs text-slate-500">{selectedVehicle.modele}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button type="button" onClick={() => { setShowVehicleModal(true); fetchVehicles(); }}
                                                    className="w-full p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center gap-2 group">
                                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                                        <span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-2xl">directions_car_filled</span>
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-500 group-hover:text-primary">Sélectionner un véhicule</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col sm:flex-row items-center justify-end gap-4 mt-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <button type="button" onClick={() => navigate("/contributors")}
                                            className="w-full sm:w-auto px-8 py-3 rounded-full font-bold text-sm text-slate-500 hover:bg-slate-100 transition-colors">
                                            Annuler
                                        </button>
                                        <button type="submit" disabled={loading || !selectedUser || !selectedVehicle}
                                            className="w-full sm:w-auto px-10 py-3 rounded-full bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                                            {loading ? (
                                                <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                                            ) : (
                                                <span className="material-symbols-outlined text-lg">save</span>
                                            )}
                                            {loading ? "Enregistrement..." : "Enregistrer le Contributeur"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                {/* User Search Modal */}
                {showUserModal && createPortal(
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative flex flex-col" style={{ maxHeight: "80vh" }}>
                            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">Sélectionner un Utilisateur</h3>
                                    <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                    <input
                                        value={userSearch}
                                        onChange={(e) => { setUserSearch(e.target.value); fetchUsers(e.target.value); }}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="Nom, téléphone, email..."
                                        autoFocus
                                    />
                                </div>
                            </div>
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
                                                    <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{user.nom} {user.prenom || ""}</p>
                                                    <p className="text-[11px] text-slate-500">{user.telephone || user.email}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center py-12 text-slate-500 text-sm">Aucun utilisateur trouvé</p>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Vehicle Search Modal */}
                {showVehicleModal && createPortal(
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative flex flex-col" style={{ maxHeight: "80vh" }}>
                            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">Sélectionner un Véhicule</h3>
                                    <button onClick={() => setShowVehicleModal(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                    <input
                                        value={vehicleSearch}
                                        onChange={(e) => { setVehicleSearch(e.target.value); fetchVehicles(e.target.value); }}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="Matricule, modèle..."
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                {vehiclesLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <span className="material-symbols-outlined animate-spin text-primary text-3xl">refresh</span>
                                    </div>
                                ) : vehicles.length > 0 ? (
                                    <div className="space-y-1">
                                        {vehicles.map((vehicle: any) => (
                                            <button key={vehicle.id} onClick={() => selectVehicle(vehicle)}
                                                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-primary/5 transition-all text-left group">
                                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors flex-shrink-0">
                                                    <span className="material-symbols-outlined text-slate-500 group-hover:text-primary">directions_car</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{vehicle.matricule}</p>
                                                    <p className="text-[11px] text-slate-500">{vehicle.modele} • {vehicle.ville}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center py-12 text-slate-500 text-sm">Aucun véhicule trouvé</p>
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
