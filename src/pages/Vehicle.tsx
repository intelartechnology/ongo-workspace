import React, { useEffect, useState } from 'react';
import MainLayout from './MainLayout';
import ApiService from '../services/ApiService';
import moment from 'moment';

interface VehicleProps {
    onLogout?: () => void;
    theme?: 'light' | 'dark';
    toggleTheme?: () => void;
}

const Vehicle: React.FC<VehicleProps> = ({ onLogout = () => { }, theme = 'light', toggleTheme = () => { } }) => {
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [paginationnext, setPaginationNext] = useState<string | null>(null);
    const [paginationprev, setPaginationPrev] = useState<string | null>(null);
    const [pagination, setPagination] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');

    const Api = new ApiService();

    const getAllVehicles = async (url: string, isPag: boolean, search: string = '') => {
        setLoading(true);
        try {
            const searchParam = search ? `&search=${search}` : '';
            const { data } = await Api.getDatawithPagination(`${url}${searchParam}`, isPag);
            if (data.success) {
                setVehicles(data.data.data);
                setPaginationNext(data.data.next_page_url);
                setPaginationPrev(data.data.prev_page_url);
                setPagination(data.data.links);
            } else {
                // Handle error, e.g., show a toast or alert
                console.error("Failed to fetch vehicles:", data.message);
            }
        } catch (error) {
            console.error("API call failed:", error);
            // Handle network errors or other exceptions
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const handleExport = () => {
        // Implement export logic here, e.g., call an API to download a file
        console.log("Exporting vehicles...");
    };

    const handleAddVehicle = () => {
        // Implement logic to navigate to add vehicle page or open a modal
        console.log("Adding new vehicle...");
    };

    const toggleActivate = (id: number) => {
        console.log(`Toggling activation for vehicle ID: ${id}`);
        // Implement API call to activate/deactivate vehicle
    };

    const setCurrentCar = (vehicle: any) => {
        console.log("Setting current car for modification:", vehicle);
        // Implement logic to set the current vehicle for editing, e.g., open a modal or navigate
    };

    const ExtrackTime = (timestamp: string) => {
        return moment(timestamp).format("HH:mm");
    };

    useEffect(() => {
        getAllVehicles("vehicule/liste-vehicule-dash", false, searchTerm);
    }, [searchTerm]);
    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
                {/* Header */}
                <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6">
                    <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Gestion des Véhicules</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Gérez et suivez tous les véhicules de la plateforme.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Rechercher un véhicule..."
                                    className="pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            </div>
                            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onClick={handleExport}>
                                <span className="material-symbols-outlined text-[20px]">file_download</span>
                                Exporter
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm" onClick={handleAddVehicle}>
                                <span className="material-symbols-outlined text-[20px]">add</span>
                                Ajouter un véhicule
                            </button>
                        </div>
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Stats Summary (Optional Enhancement) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-slate-500 text-sm font-medium">Total Véhicules</span>
                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                    <span className="material-symbols-outlined">directions_car</span>
                                </div>
                            </div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">1,248</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-slate-500 text-sm font-medium">En Service</span>
                                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                    <span className="material-symbols-outlined">check_circle</span>
                                </div>
                            </div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">856</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-slate-500 text-sm font-medium">Maintenance</span>
                                <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                                    <span className="material-symbols-outlined">build</span>
                                </div>
                            </div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">42</p>
                        </div>
                    </div>
                    {/* Modernized Table Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">ID VÉH.</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Véhicule</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Matricule</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Marque/Couleur</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Chauffeur</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Catégorie</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Statut</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Statut Service</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Dernière Mise à Jour</th>
                                        <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={10} className="text-center py-4 text-slate-500 dark:text-slate-400">
                                                Chargement des véhicules...
                                            </td>
                                        </tr>
                                    ) : vehicles.length > 0 ? (
                                        vehicles.map((vehicle) => (
                                            <tr key={vehicle.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4 text-sm font-semibold text-slate-500">{vehicle.id}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                                                            <span className="material-symbols-outlined text-xl">auto_awesome</span>
                                                        </div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{vehicle.categorie.libelle}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">{vehicle.matricule}</td>
                                                <td className="px-6 py-4 text-sm text-slate-500">{vehicle.modele} / {vehicle.color}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{vehicle.chauffeur?.nom || 'N/A'}{' '}{vehicle.chauffeur?.prenom || 'N/A'}</p>
                                                        <p className="text-xs text-slate-500 font-medium">{vehicle.chauffeur?.telephone || 'N/A'}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-primary/10 text-primary">{vehicle.categorie?.libelle || 'N/A'}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${vehicle.statut === 'LIBRE' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : vehicle.statut === 'OCCUPÉ' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400'}`}>
                                                        <span className={`w-1 h-1 rounded-full ${vehicle.statut === 'LIBRE' ? 'bg-emerald-500' : vehicle.statut === 'OCCUPÉ' ? 'bg-blue-500' : 'bg-rose-500'}`}></span> {vehicle.statut}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                                                    {vehicle.is_online ? "En Service" : "Hors service"}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                                                    {moment(vehicle.updated_at).fromNow()} <br />
                                                    {moment(vehicle.updated_at).format("MMMM DD, YYYY")}
                                                    <br />
                                                    {ExtrackTime(vehicle.updated_at)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        {vehicle.statut === "INACTIVER" && (
                                                            <button
                                                                className="px-4 py-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-xs font-bold rounded hover:bg-red-200 dark:hover:bg-red-800 transition-all"
                                                                onClick={() => toggleActivate(vehicle.id)}
                                                            >
                                                                ACTIVER
                                                            </button>
                                                        )}
                                                        <button
                                                            className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded hover:bg-primary hover:text-white transition-all"
                                                            onClick={() => setCurrentCar(vehicle)}
                                                        >
                                                            Modifier
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={10} className="text-center py-4 text-slate-500 dark:text-slate-400">
                                                Aucun véhicule trouvé.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Affichage de {vehicles.length} sur {pagination.length > 0 && pagination[0].total !== undefined ? pagination[0].total : '...'} véhicules</p>
                            <div className="flex gap-2">
                                <button
                                    className="p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-400 hover:text-primary transition-colors disabled:opacity-50"
                                    onClick={() => paginationprev && getAllVehicles(paginationprev, true)}
                                    disabled={!paginationprev}
                                >
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                                {pagination.map((link: any, index: number) => (
                                    link.url ? (
                                        <button
                                            key={index}
                                            className={`px-3 py-1 border border-slate-200 dark:border-slate-700 rounded text-sm font-medium ${link.active ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                            onClick={() => getAllVehicles(link.url, true)}
                                        >
                                            {link.label}
                                        </button>
                                    ) : (
                                        <span key={index} className="px-3 py-1 text-sm font-medium text-slate-400">{link.label}</span>
                                    )
                                ))}
                                <button
                                    className="p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-400 hover:text-primary transition-colors disabled:opacity-50"
                                    onClick={() => paginationnext && getAllVehicles(paginationnext, true)}
                                    disabled={!paginationnext}
                                >
                                    <span className="material-symbols-outlined">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default Vehicle;
