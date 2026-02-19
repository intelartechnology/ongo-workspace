import React, { useEffect, useState, useRef } from 'react';
import MainLayout from './MainLayout';
import ApiService from '../services/ApiService';
import { toast } from 'react-toastify';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import jsPDF from 'jspdf';

interface UsersProps {
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const Users: React.FC<UsersProps> = ({ onLogout, theme, toggleTheme }) => {
    const api = new ApiService();

    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [currentData, setCurrentData] = useState<any>(null);
    const [pagination, setPagination] = useState<any>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    // For Image Upload
    const hiddenFileInput = useRef<HTMLInputElement>(null);

    const notify = (title: string, type: 'success' | 'error') => {
        if (type === 'success') {
            toast.success(title);
        } else {
            toast.error(title);
        }
    };
    const fetchUsers = async (url: string = "utilisateur/liste-utilisateurs") => {
        setLoading(true);
        try {
            const response = await api.getData(url);
            if (response.data.success) {
                setUsers(response.data.data.data);
                setPagination(response.data.data.links);
            } else {
                notify("Erreur lors du chargement des utilisateurs", "error");
            }
        } catch (error) {
            notify("Erreur serveur/connexion", "error");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nom_utilisateur: currentData?.nom_utilisateur || '',
            description: currentData?.description || '',
        },
        validationSchema: Yup.object({
            nom_utilisateur: Yup.string()
                .min(2, "Le nom doit contenir au moins 3 caractères")
                .required("Le nom est obligatoire"),
            description: Yup.string()
                .max(50, "Maximum 50 caractères")
                .required("La description est obligatoire"),
        }),
        onSubmit: async (values) => {
            setLoading(true);
            try {
                const formData = {
                    nom_utilisateur: values.nom_utilisateur,
                    description: values.description,
                };
                const response = await api.updateData(`backend/utilisateur/${currentData.id}`, formData);
                if (response.data.success) {
                    fetchUsers();
                    notify("Utilisateur mis à jour avec succès", "success");
                    setCurrentData(null); // Close edit mode if applicable
                } else {
                    notify("Erreur lors de la mise à jour", "error");
                }
            } catch (error) {
                notify("Une erreur s'est produite", "error");
            } finally {
                setLoading(false);
            }
        },
    });

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        try {
            const response = await api.uploadImage(file);
            if (response.data.success) {
                const newImgUrl = response.data.data;

                // If editing a user, immediately update their profile pic
                if (currentData) {
                    const formData = { img: newImgUrl };
                    const updateResponse = await api.updateData(`backend/utilisateur/${currentData.id}`, formData);
                    if (updateResponse.data.success) {
                        fetchUsers();
                        notify("Image de profil mise à jour", "success");
                    }
                }
            } else {
                notify("Échec de l'upload", "error");
            }
        } catch (error) {
            notify("Erreur lors de l'upload", "error");
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        const elementHTML = document.getElementById("pdf-generated");
        if (elementHTML) {
            doc.html(elementHTML, {
                callback: function (doc) {
                    doc.save('utilisateurs.pdf');
                },
                x: 10,
                y: 10
            });
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        // Implement debounced search here or client-side filtering if API doesn't support search param
    };
    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            {/* Header section with breadcrumbs and title */}
            <div className="bg-white dark:bg-slate-900 px-4 md:px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <a className="hover:text-primary transition-colors" href="/dashboard">Tableau de bord</a>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                    <span className="text-slate-900 dark:text-slate-100 font-medium">Utilisateurs</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Gestion des Utilisateurs</h2>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button
                            onClick={generatePDF}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 justify-center"
                        >
                            <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                            PDF
                        </button>
                        <button className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-primary/20 w-full sm:w-auto justify-center">
                            <span className="material-symbols-outlined text-[20px]">add_circle</span>
                            Ajouter un utilisateur
                        </button>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="px-4 md:px-8 py-6">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-[280px]">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
                            placeholder="Rechercher par nom, email ou ID..."
                            type="text"
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </div>
                    <div className="flex flex-wrap gap-2 flex-1 sm:flex-none">
                        <select className="flex-1 sm:flex-none bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm px-4 py-2 pr-10 focus:ring-2 focus:ring-primary/20 text-slate-600 dark:text-slate-300">
                            <option>Rôle</option>
                            <option>Admin</option>
                            <option>Agent</option>
                            <option>Chauffeur</option>
                        </select>
                        <select className="flex-1 sm:flex-none bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm px-4 py-2 pr-10 focus:ring-2 focus:ring-primary/20 text-slate-600 dark:text-slate-300">
                            <option>Statut</option>
                            <option>Actif</option>
                            <option>Inactif</option>
                            <option>Suspendu</option>
                        </select>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        <span className="material-symbols-outlined">tune</span>
                    </button>
                </div>
            </div>

            {/* User Table container */}
            <div className="px-4 md:px-8 pb-8">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 w-20">ID</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Photo &amp; Nom</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">Contact</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center">Chauffeur</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-10 text-center text-slate-500">Chargement en cours...</td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-10 text-center text-slate-500">Aucun utilisateur trouvé</td>
                                    </tr>
                                ) : (
                                    users.map((user: any, index: number) => (
                                        <tr key={user.id || index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-4 text-xs font-medium text-slate-400">#{user.id}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="size-10 rounded-full bg-slate-100 bg-cover bg-center border border-slate-200 cursor-pointer"
                                                        style={{ backgroundImage: `url('${user.photo || 'https://via.placeholder.com/150'}')` }}
                                                        onClick={() => {
                                                            setCurrentData(user);
                                                            hiddenFileInput.current?.click();
                                                        }}
                                                    ></div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
                                                            {user.nom || 'N/A'} {''}
                                                            {user.prenom || 'N/A'}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500">{user.balance + ' FCFA' || 'N/A'} </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-[13px]">
                                                    <p className="text-slate-700 dark:text-slate-300 font-medium">{user.email || 'N/A'}</p>
                                                    <p className="text-slate-500 text-xs">{user.telephone || 'N/A'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    {user.role_id === 1 && (
                                                        <a
                                                            href={`#/add-user-to-driver/${user.id}`}
                                                            className="px-3 py-1.5 text-[11px] font-bold text-emerald-600 border border-emerald-600 rounded hover:bg-emerald-50 transition-colors inline-block"
                                                        >
                                                            Nommer chauffeur
                                                        </a>
                                                    )}
                                                    {user.role_id === 2 && (
                                                        <button className="px-3 py-1.5 text-[11px] font-bold text-rose-600 border border-rose-600 rounded hover:bg-rose-50 transition-colors">
                                                            Activer/Désactiver
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                         

                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {user.is_agence == 0 && (
                                                        <button
                                                            className="px-3 py-1.5 text-[11px] font-bold text-emerald-600 border border-emerald-600 rounded hover:bg-emerald-50 transition-colors"
                                                            onClick={() => setCurrentData(user)}
                                                        >
                                                            Créer une agence
                                                        </button>
                                                    )}
                                                    <button
                                                        className="px-3 py-1.5 text-[11px] font-bold text-emerald-600 border border-emerald-600 rounded hover:bg-emerald-50 transition-colors"
                                                        onClick={() => setCurrentData(user)}
                                                    >
                                                        Ma fiche
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="mt-auto bg-white dark:bg-slate-900 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-1 flex-wrap w-full justify-end">
                            {pagination && pagination.map((link: any, index: number) => (
                                <button
                                    key={index}
                                    onClick={() => link.url && fetchUsers(link.url)}
                                    disabled={!link.url || link.active}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium 
                                        ${link.active
                                            ? 'bg-primary text-white font-bold'
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                                        } 
                                        ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Form Modal (Logic Implementation) */}
            {currentData && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-96 relative">
                        <button
                            onClick={() => setCurrentData(null)}
                            className="absolute top-2 right-2 text-slate-500 hover:text-slate-700"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <h3 className="text-lg font-bold mb-4 dark:text-white">Éditer l'utilisateur</h3>
                        <form onSubmit={formik.handleSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nom</label>
                                <input
                                    type="text"
                                    name="nom_utilisateur"
                                    onChange={formik.handleChange}
                                    value={formik.values.nom_utilisateur}
                                    className="w-full mt-1 p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                />
                                {formik.errors.nom_utilisateur ? <div className="text-red-500 text-xs">{formik.errors.nom_utilisateur}</div> : null}
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                                <input
                                    type="text"
                                    name="description"
                                    onChange={formik.handleChange}
                                    value={formik.values.description}
                                    className="w-full mt-1 p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                />
                                {formik.errors.description ? <div className="text-red-500 text-xs">{formik.errors.description}</div> : null}
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-primary text-white py-2 rounded font-bold hover:bg-primary/90 disabled:opacity-70"
                            >
                                {loading ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Hidden Input for Image Upload */}
            <input
                type="file"
                ref={hiddenFileInput}
                onChange={onFileChange}
                style={{ display: 'none' }}
                accept="image/*"
            />
        </MainLayout >
    );
};

export default Users;
