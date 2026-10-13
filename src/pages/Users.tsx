import React, { useEffect, useState, useRef } from 'react';
import MainLayout from './MainLayout';
import ApiService from '../services/ApiService';
import { toast } from 'react-toastify';
import { notifier } from '../services/notifier';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import jsPDF from 'jspdf';
import { SearchBar, Select, Button, ActionsMenu, type ActionItem, Avatar } from "../components/ui";

interface UsersProps {
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const entete = "px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500";

// Les rôles sont identifiés par un entier côté API ; 1 = client, 2 = chauffeur.
// Tout autre code est affiché tel quel plutôt que masqué, pour qu'un rôle
// ajouté côté serveur se remarque ici au lieu de disparaître.
const roleLabel = (roleId: any): string =>
    roleId === 1 ? "Client" : roleId === 2 ? "Chauffeur" : roleId == null ? "—" : `Rôle ${roleId}`;

const roleStyle = (roleId: any): string =>
    roleId === 1
        ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
        : roleId === 2
            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
            : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400";

const Users: React.FC<UsersProps> = ({ onLogout, theme, toggleTheme }) => {
    const api = new ApiService();

    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [currentData, setCurrentData] = useState<any>(null);
    const [pagination, setPagination] = useState<any>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [tri, setTri] = useState<'recent' | 'ancien'>('recent');
    // For Image Upload
    const hiddenFileInput = useRef<HTMLInputElement>(null);

    const notify = (title: string, type: 'success' | 'error') => {
        if (type === 'success') {
            toast.success(title);
        } else {
            toast.error(title);
        }
    };
    // Le serveur trie : l'ordre s'applique à toute la liste, et non aux dix
    // comptes de la page reçue — qui étaient, sans lui, les dix plus anciens.
    const listeTriee = (ordre: 'recent' | 'ancien') => `utilisateur/liste-utilisateurs?ordre=${ordre}`;

    const changerTri = (ordre: 'recent' | 'ancien') => {
        setTri(ordre);
        fetchUsers(listeTriee(ordre));
    };

    const fetchUsers = async (url: string = listeTriee(tri)) => {
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

    // Le serveur rend déjà la page dans l'ordre choisi ; ce tri local ne fait
    // que le maintenir après une modification. `created_at` manque sur
    // certains comptes, d'où le repli sur l'identifiant, qui croît dans le
    // même sens.
    const dateDeCreation = (u: any): number => {
        const t = u?.created_at ? Date.parse(u.created_at) : NaN;
        return Number.isNaN(t) ? Number(u?.id) || 0 : t;
    };

    const usersTries = React.useMemo(() => {
        const copie = [...users];
        copie.sort((a, b) => dateDeCreation(b) - dateDeCreation(a));
        return tri === 'recent' ? copie : copie.reverse();
    }, [users, tri]);

    // Les cinq boutons de la ligne étaient répartis sur deux colonnes, et
    // certains n'apparaissaient que pour un rôle : la largeur variait d'une
    // ligne à l'autre. Le menu les rassemble et garde les lignes alignées.
    const actionsUtilisateur = (user: any): ActionItem[] => {
        const nom = `${user.prenom ?? ''} ${user.nom ?? ''}`.trim();
        const items: ActionItem[] = [
            {
                label: "Ma fiche",
                icon: "badge",
                onClick: () => setCurrentData(user),
            },
            {
                label: "Notifier",
                icon: "notifications",
                onClick: () => notifier({ destinataires: [{ id: user.id, nom }] }),
            },
        ];

        if (user.role_id === 1) {
            items.push({
                label: "Nommer chauffeur",
                icon: "sports_motorsports",
                separatorBefore: true,
                onClick: () => { window.location.hash = `#/add-user-to-driver/${user.id}`; },
            });
        }

        if (user.is_agence == 0) {
            items.push({
                label: "Créer une agence",
                icon: "store",
                separatorBefore: items.length === 2,
                onClick: () => setCurrentData(user),
            });
        }

        if (user.role_id === 2) {
            // Ce bouton n'a jamais eu de gestionnaire : il ne faisait rien, en
            // silence. Désactivé, il dit au moins que l'action reste à câbler
            // côté API, au lieu de laisser croire à un échec.
            items.push({
                label: "Activer / Désactiver",
                icon: "toggle_on",
                danger: true,
                disabled: true,
                separatorBefore: true,
                onClick: () => {},
            });
        }

        return items;
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

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            {/* Le titre et les actions, sans fond ni fil d'Ariane. */}
            <div className="px-4 md:px-8 py-6 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Utilisateurs</h1>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button
                            onClick={generatePDF}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 justify-center"
                        >
                            <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                            PDF
                        </button>
                        <button className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 dark:bg-primary-container dark:hover:bg-primary-container/90 transition-colors disabled:opacity-40 flex items-center gap-2 w-full sm:w-auto justify-center">
                            <span className="material-symbols-outlined text-[20px]">add_circle</span>
                            Ajouter un utilisateur
                        </button>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="px-4 md:px-8 py-6">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center">
                    <SearchBar
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Rechercher par nom, email ou ID..."
                        minWidth={280}
                    />
                    <div className="flex flex-wrap gap-2">
                        <Select value={tri} onChange={(e) => changerTri(e.target.value as 'recent' | 'ancien')}>
                            <option value="recent">Plus récents d'abord</option>
                            <option value="ancien">Plus anciens d'abord</option>
                        </Select>
                        <Select defaultValue="">
                            <option value="">Rôle</option>
                            <option>Admin</option>
                            <option>Agent</option>
                            <option>Chauffeur</option>
                        </Select>
                        <Select defaultValue="">
                            <option value="">Statut</option>
                            <option>Actif</option>
                            <option>Inactif</option>
                            <option>Suspendu</option>
                        </Select>
                    </div>
                    <Button variant="ghost" size="sm" icon="tune" aria-label="Plus de filtres" />
                </div>
            </div>

            {/* User Table container */}
            <div className="px-4 md:px-8 pb-8">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className={entete}>Utilisateur</th>
                                    <th className={entete}>Contact</th>
                                    <th className={`${entete} text-right`}>Solde</th>
                                    <th className={entete}>Rôle</th>
                                    {/* L'en-tête commande le tri : c'est là qu'on le cherche,
                                        même si le sélecteur de la barre fait la même chose. */}
                                    <th className={entete}>
                                        <button
                                            type="button"
                                            onClick={() => changerTri(tri === 'recent' ? 'ancien' : 'recent')}
                                            title={tri === 'recent' ? "Trier du plus ancien au plus récent" : "Trier du plus récent au plus ancien"}
                                            className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-primary transition-colors"
                                        >
                                            Inscription
                                            <span className="material-symbols-outlined text-[16px]">
                                                {tri === 'recent' ? 'arrow_downward' : 'arrow_upward'}
                                            </span>
                                        </button>
                                    </th>
                                    <th className={`${entete} text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">Chargement en cours...</td>
                                    </tr>
                                ) : usersTries.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">Aucun utilisateur trouvé</td>
                                    </tr>
                                ) : (
                                    usersTries.map((user: any, index: number) => (
                                        <tr key={user.id || index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    {/* La photo reste cliquable pour la remplacer ;
                                                        l'icône au survol le dit, l'ancienne pastille
                                                        muette ne le laissait pas deviner. */}
                                                    <button
                                                        type="button"
                                                        title="Changer la photo de profil"
                                                        onClick={() => {
                                                            setCurrentData(user);
                                                            hiddenFileInput.current?.click();
                                                        }}
                                                        className="relative size-9 shrink-0 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group/photo"
                                                    >
                                                        <Avatar photo={user?.photo} nom={user?.nom || user?.prenom} className="text-base" />
                                                        <span className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-[16px] text-white">photo_camera</span>
                                                        </span>
                                                    </button>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm font-semibold text-slate-900 dark:text-white capitalize truncate leading-tight">
                                                            {[user.nom, user.prenom].filter(Boolean).join(' ') || 'Sans nom'}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400 font-mono leading-tight">#{user.id}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[13px] text-slate-700 dark:text-slate-300 truncate leading-tight">{user.email || '—'}</span>
                                                    <span className="text-[11px] text-slate-500 font-mono leading-tight">{user.telephone || '—'}</span>
                                                </div>
                                            </td>
                                            {/* `balance + ' FCFA'` affichait « null FCFA » quand le
                                                solde manquait : la concaténation est toujours vraie,
                                                donc le `|| 'N/A'` qui suivait ne servait à rien. */}
                                            <td className="px-4 py-2.5 text-right text-sm font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                                                {user.balance != null
                                                    ? `${Number(user.balance).toLocaleString('fr-FR')} FCFA`
                                                    : <span className="font-normal text-slate-400">—</span>}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${roleStyle(user.role_id)}`}>
                                                        {roleLabel(user.role_id)}
                                                    </span>
                                                    {user.is_agence == 1 && (
                                                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-primary/10 text-primary" title="Dispose d'une agence">
                                                            Agence
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                                                {user.created_at
                                                    ? new Date(user.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex justify-end">
                                                    <ActionsMenu items={actionsUtilisateur(user)} />
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
 ? 'bg-primary text-white dark:bg-primary-container font-bold'
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg w-96 relative">
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
                                {formik.errors.nom_utilisateur ? <div className="text-red-500 text-xs">{String(formik.errors.nom_utilisateur)}</div> : null}
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
                                {formik.errors.description ? <div className="text-red-500 text-xs">{String(formik.errors.description)}</div> : null}
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 dark:bg-primary-container dark:hover:bg-primary-container/90 transition-colors disabled:opacity-40"
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
