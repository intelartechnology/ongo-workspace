import { useCallback, useEffect, useMemo, useState } from "react";
import GoogleMapReact from "google-map-react";

import ApiService from "../services/ApiService";

import { ToastContainer, toast } from "react-toastify";

import Loading from "../components/Loading";
import MainLayout from "./MainLayout";
import CourseDetailsModal from "./components/CourseDetailsModal";

interface Categorie {
    id: number;
    libelle: string;
    image: string;
    description: string;
    sub_description: string;
    base_price: number;
    km_price: number;
    created_at: string;
    updated_at: string;
}

interface Chauffeur {
    id: number;
    nom: string;
    prenom: string;
    telephone: string;
    email: string;
    photo: string;
    note: number;
    role_id: number;
    created_at: string;
    updated_at: string;
    balance: number;
    cashBalance: number;
    casDeposit: number;
    is_agence: boolean;
    device: {
        id: number;
        user_id: number;
        device_token: string;
        platform: string;
        created_at: string;
        updated_at: string;
    };
}

interface Vehicle {
    id: number;
    uuid: string;
    matricule: string;
    carte: string | null;
    modele: string;
    image: string | null;
    lat: number;
    lng: number;
    lat_1000_floor: number;
    ville: string;
    position: string;
    categorie_id: number;
    chauffeur_id: number;
    statut: string;
    note: number;
    created_at: string;
    updated_at: string;
    is_online: number;
    color: string;
    is_favorite: number;
    chauffeur: Chauffeur;
    categorie: Categorie;
}

interface Client {
    id: number;
    prenom: string;
    nom: string;
    telephone: string;
    // Add other client properties if they exist in the API response
}

interface CategorieVehicule {
    id: number;
    libelle: string;
    // Add other category properties
}

interface Course {
    id: number;
    code: string;
    type: string;
    client: Client;
    categorie_vehicule: CategorieVehicule;
    lieu_depart: string;
    lieu_arrive: string;
    date_depart: string;
    heure_depart: string;
    montant: string; // Assuming montant can be a string with currency
    is_paid: boolean;
    transaction_type: string;
    statut: string;
    // Add other course properties
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Meta {
    current_page: number;
    from: number;
    to: number;
    total: number;
    last_page: number;
}

interface RaseProps {
    onLogout?: () => void;
    theme?: 'light' | 'dark';
    toggleTheme?: () => void;
}

export default function Rase({ onLogout = () => { }, theme = 'light', toggleTheme = () => { } }: RaseProps) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [pagination, setPagination] = useState<PaginationLink[]>([]);
    const [meta, setMeta] = useState<Meta | null>(null);

    // Filter states
    const [dateDebut, setDateDebut] = useState<string>("");
    const [dateFin, setDateFin] = useState<string>("");
    const [statut, setStatut] = useState<string>("Tous les statuts");
    const [search, setSearch] = useState<string>("");

    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

    const [isMapOpen, setIsMapOpen] = useState<boolean>(false);
    const [selectedMapCourse, setSelectedMapCourse] = useState<Course | null>(null);

    const Api = useMemo(() => new ApiService(), []);


    const notify = useCallback((title: string, type: string) => {
        if (type === "success") {
            toast.success(title);
        } else if (type === "error") {
            toast.error(title);
        }
    }, []);

    const fetchCourses = useCallback(async (url: string = "list-course-dash", isPag: boolean = false) => {
        setLoading(true);
        try {
            const { data } = await Api.getDatawithPagination(url, isPag);
            if (data.success) {
                console.log(data);
                setCourses(data.data.data as Course[]);
                setPagination(data.data.links as PaginationLink[]);
                setMeta({
                    current_page: data.data.current_page,
                    from: data.data.from,
                    to: data.data.to,
                    total: data.data.total,
                    last_page: data.data.last_page
                });
            } else {
                notify(data.message || "Erreur lors du chargement des courses", "error");
            }
        } catch (error: any) {
            notify("Connexion au serveur impossible", "error");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [Api, notify]);

    const handleFilter = useCallback(async () => {
        setLoading(true);
        const postData: { debut?: string; fin?: string; statut?: string; search?: string } = {};

        if (dateDebut) postData.debut = dateDebut;
        if (dateFin) postData.fin = dateFin;
        if (statut !== "Tous les statuts") postData.statut = statut;
        if (search) postData.search = search;

        try {
            const { data } = await Api.postData("filter-course", postData);
            if (data.success) {
                setCourses(data.data.data as Course[]);
                setPagination(data.data.links as PaginationLink[]);
                setMeta({
                    current_page: data.data.current_page,
                    from: data.data.from,
                    to: data.data.to,
                    total: data.data.total,
                    last_page: data.data.last_page
                });
            } else {
                notify("Erreur lors du filtrage", "error");
            }
        } catch (error) {
            console.error(error);
            notify("Erreur serveur", "error");
        } finally {
            setLoading(false);
        }
    }, [Api, dateDebut, dateFin, statut, search, notify]);

    useEffect(() => {
        fetchCourses();
    }, [fetchCourses]);

    const openDetails = (course: Course) => {
        setSelectedCourse(course);
        setIsDetailOpen(true);
    };

    const closeDetails = () => {
        setIsDetailOpen(false);
        setSelectedCourse(null);
    };

    const openMap = (course: Course) => {
        setSelectedMapCourse(course);
        setIsMapOpen(true);
    };

    const closeMap = () => {
        setIsMapOpen(false);
        setSelectedMapCourse(null);
    };

    // Reattribution Modal States and Functions
    const [isReattributionModalOpen, setIsReattributionModalOpen] = useState<boolean>(false);
    const [courseToReattribute, setCourseToReattribute] = useState<Course | null>(null);
    const [vehicles, setVehicles] = useState<any[]>([]); // Define a proper interface for Vehicle
    const [chauffeurs, setChauffeurs] = useState<any[]>([]); // Define a proper interface for Chauffeur
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [selectedAttribution, setSelectedAttribution] = useState<any>(null); // Can be Vehicle or Chauffeur
    const [attributionType, setAttributionType] = useState<"vehicle" | "chauffeur">("vehicle");

    const openReattributionModal = (course: Course) => {
        setCourseToReattribute(course);
        setIsReattributionModalOpen(true);
        setSelectedAttribution(null); // Reset selected attribution
        setSearchTerm(""); // Reset search term
        setAttributionType("vehicle"); // Default to vehicle
    };

    const closeReattributionModal = () => {
        setIsReattributionModalOpen(false);
        setCourseToReattribute(null);
    };
  const getFilter = async (val: any, url: string, isPag: boolean) => {
    console.log("data availlable");
    console.log(val);

    setLoading(true);

    await Api.getDatawithPagination(url + "/" + val, isPag)
      .then(({ data }) => {
        if (data.success) {
            console.log(data.data.data)
          setLoading(false);
          setVehicles(data.data.data);
        } else {
          notify(data.message, "error");
        }
      })
      .catch((err) => {
            notify("Erreur serveur lors de la recherche", "error");
      });
  };
 



    const handleSelectAttribution = (item: any, type: "vehicle" | "chauffeur") => {
        setSelectedAttribution(item);
        setAttributionType(type);
    };

    const handleReattribution = async () => {
        console.log(courseToReattribute)
        console.log(selectedAttribution)
      
        if (!courseToReattribute || !selectedAttribution) {
            notify("Veuillez sélectionner une course et une attribution.", "error");
            return;
        }

        setLoading(true);
        try {

            const payload = {
                course_id: courseToReattribute.id,
                chauffeur_id: selectedAttribution.chauffeur_id,
                vehicule_id: selectedAttribution.id,
            };
            const { data } = await Api.postData("attribuer-course", payload);
            if (data.success) {
                notify("Course réattribuée avec succès!", "success");
                closeReattributionModal();
                fetchCourses(); // Refresh courses
            } else {
                notify(data.message || "Erreur lors de la réattribution de la course", "error");
            }
        } catch (error) {
            console.error(error);
            notify("Erreur serveur lors de la réattribution", "error");
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "TERMINEE":
            case "CONFIRMEE":
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{status}</span>;
            case "ANNULEE":
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{status}</span>;
            case "EN COURS":
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{status}</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">{status}</span>;
        }
    };



    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
                <ToastContainer />

                {/* Header */}
                <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6">
                    <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Gestion des Courses</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Gérez et suivez toutes les activités des courses sur la plateforme en temps réel.</p>
                        </div>
                       {/*  <div className="flex items-center gap-3">
                            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">file_download</span>
                                Exporter
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
                                <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                                Imprimer PDF
                            </button>
                        </div> */}
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    <div className="max-w-[1400px] mx-auto space-y-6">

                        {/* Filters Bar */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date début</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">calendar_today</span>
                                        <input
                                            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-primary focus:border-primary text-sm"
                                            type="date"
                                            onChange={(e) => setDateDebut(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date fin</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">calendar_today</span>
                                        <input
                                            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-primary focus:border-primary text-sm"
                                            type="date"
                                            onChange={(e) => setDateFin(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Statut de la course</label>
                                    <select
                                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-primary focus:border-primary text-sm"
                                        onChange={(e) => setStatut(e.target.value)}
                                        value={statut}
                                    >
                                        <option>Tous les statuts</option>
                                        <option value="TERMINEE">Terminée</option>
                                        <option value="ANNULEE">Annulée</option>
                                        <option value="EN COURS">En cours</option>
                                        <option value="EN ATTENTE">En attente</option>
                                    </select>
                                </div>
                              {/*   <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recherche</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                                        <input
                                            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-primary focus:border-primary text-sm"
                                            placeholder="ID, Client, Code..."
                                            type="text"
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                    </div>
                                </div> */}
                                <div>
                                    <button
                                        className="w-full py-2 bg-primary/10 text-primary font-bold rounded-lg text-sm hover:bg-primary/20 transition-colors h-[38px] flex items-center justify-center gap-2"
                                        onClick={handleFilter}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">filter_list</span>
                                        Appliquer les filtres
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Data Table */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto custom-scrollbar">
                                {loading ? (
                                    <Loading />
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">ID Course</th>
                                                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Code</th>
                                                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Type</th>
                                                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Client</th>
                                                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Catégorie</th>
                                                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Départ / Arrivée</th>
                                                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date & Heure</th>
                                                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Montant</th>
                                                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Payé?</th>
                                                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Statut</th>
                                                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap sticky right-0 bg-slate-50 dark:bg-slate-800">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {courses.length > 0 ? (
                                                courses.map((course: any) => (
                                                    <tr key={course.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="px-4 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">#{course.id}</td>
                                                        <td className="px-4 py-4 text-sm text-primary font-bold">{course.code}</td>
                                                        <td className="px-4 py-4 text-sm">{course.type || "Course Simple"}</td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-semibold">{course.client ? `${course.client.prenom} ${course.client.nom}` : "Inconnu"}</span>
                                                                <span className="text-xs text-slate-500">{course.client?.telephone || "N/A"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-sm">{course.categorie_vehicule?.libelle || "N/A"}</td>
                                                        <td className="px-4 py-4">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-1.5 text-xs">
                                                                    <span className="material-symbols-outlined text-[14px] text-green-500">location_on</span>
                                                                    <span className="truncate max-w-[150px]" title={course.lieu_depart}>{course.lieu_depart}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 text-xs">
                                                                    <span className="material-symbols-outlined text-[14px] text-red-500">location_on</span>
                                                                    <span className="truncate max-w-[150px]" title={course.lieu_arrive}>{course.lieu_arrive}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <div className="text-sm">{course.date_depart}</div>
                                                            <div className="text-xs text-slate-500">{course.heure_depart}</div>
                                                        </td>
                                                        <td className="px-4 py-4 text-sm font-bold">{course.montant} FCFA</td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${course.is_paid ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                                {course.transaction_type || "CASH"}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            {getStatusBadge(course.statut)}
                                                        </td>
                                                        <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap sticky right-0 bg-white dark:bg-slate-900">
                                                            <div className="flex items-center space-x-2">
                                                                <button
                                                                    className="flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900"
                                                                    onClick={() => openDetails(course)}
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">info</span>
                                                                    Détails
                                                                </button>
                                                                <button
                                                                    className="flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900"
                                                                    onClick={() => openMap(course)}
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">map</span>
                                                                    Carte
                                                                </button>
                                                                  <button   className="p-1.5 rounded-lg text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                                                                    onClick={() => {
                                                                        sessionStorage.setItem(`course_detail_${course.id}`, JSON.stringify(course));
                                                                        window.open(`/courses/${course.id}`, "_blank");
                                                                    }}
                                                                    title="Voir les détails complets"
                                                                >
                                                                    <span className="material-symbols-outlined text-[20px]">open_in_new</span> </button>
                                                                <button
                                                                    className="flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900"
                                                                    onClick={() => openReattributionModal(course)}
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                                                                    Réattribuer
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={11} className="px-4 py-8 text-center text-slate-500">Aucune course trouvée</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Pagination */}
                            {pagination && pagination.length > 0 && (
                                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                    <p className="text-sm text-slate-500">
                                        Affichage de {meta?.from || 0} à {meta?.to || 0} sur {meta?.total || 0} courses
                                    </p>
                                    <div className="flex items-center gap-2 overflow-x-auto max-w-[500px]">
                                        {pagination.map((item: any, index: number) => {
                                            // Handling previous/next buttons labels
                                            let label = item.label;
                                            if (label.includes('&laquo;')) label = 'chevron_left';
                                            if (label.includes('&raquo;')) label = 'chevron_right';

                                            const isIcon = label === 'chevron_left' || label === 'chevron_right';

                                            return (
                                                <button
                                                    key={index}
                                                    onClick={() => item.url && fetchCourses(item.url, true)}
                                                    disabled={!item.url}
                                                    className={`
                                                        ${isIcon ? 'p-2' : 'size-8'} 
                                                        ${item.active ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'} 
                                                        rounded-lg text-sm font-medium transition-colors
                                                        ${!item.url ? 'opacity-50 cursor-not-allowed' : ''}
                                                    `}
                                                >
                                                    {isIcon ? (
                                                        <span className="material-symbols-outlined text-[20px]">{label}</span>
                                                    ) : (
                                                        <span dangerouslySetInnerHTML={{ __html: item.label }}></span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>


            {isDetailOpen && selectedCourse && (
                <CourseDetailsModal
                    selectedCourse={selectedCourse}
                    closeDetails={closeDetails}
                />
            )}

            {/* Map View Modal */}
            {isMapOpen && selectedMapCourse && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={closeMap}
                >
                    <div
                        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Carte du trajet</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    <span className="text-green-500 font-semibold">Départ :</span> {selectedMapCourse.lieu_depart}
                                    &nbsp;&nbsp;→&nbsp;&nbsp;
                                    <span className="text-red-500 font-semibold">Arrivée :</span> {selectedMapCourse.lieu_arrive}
                                </p>
                            </div>
                            <button
                                onClick={closeMap}
                                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[22px]">close</span>
                            </button>
                        </div>
                        {/* Map */}
                        <div className="h-[520px] w-full">
                            <CourseMap course={selectedMapCourse} />
                        </div>
                    </div>
                </div>
            )}

            {/* Reattribution Modal */}
            {isReattributionModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Réattribuer la Course #{courseToReattribute?.id}</h3>
                            <button onClick={closeReattributionModal} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rechercher Véhicule ou Chauffeur</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
                                    placeholder="Nom, Prénom, Marque, Modèle..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <button
                                   onClick={() =>
                                          getFilter(
                                            searchTerm,
                                            "vehicule/vehicule-filtre",
                                            false
                                          )
                                        }
                                    className="mt-2 w-full py-2 px-4 bg-primary text-white font-semibold rounded-md hover:bg-primary/90 transition-colors"
                                >
                                    Rechercher
                                </button>
                            </div>

                            {loading ? (
                                <Loading />
                            ) : (
                                <div className="space-y-4">
                                    {/* Vehicles List */}
                                    <div>
                                        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Véhicules</h4>
                                        {vehicles.length > 0 ? (
                                            <div className="border border-slate-200 dark:border-slate-700 rounded-md max-h-48 overflow-y-auto">
                                                {vehicles.map((vehicle) => (
                                                    <div
                                                        key={vehicle.id}
                                                        className={`p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 ${selectedAttribution?.id === vehicle.id && attributionType === "vehicle" ? "bg-blue-200 dark:bg-blue-800/50 ring-2 ring-blue-500" : ""}`}
                                                        onClick={() => handleSelectAttribution(vehicle, "vehicle")}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <p className="font-medium text-slate-900 dark:text-white">{vehicle.marque} {vehicle.modele} ({vehicle.matricule})</p>
                                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${vehicle.statut === "LIBRE" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                                                                {vehicle.statut}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400">Catégorie: {vehicle.categorie?.libelle || "N/A"} - Couleur: {vehicle.color || "N/A"}</p>
                                                        {vehicle.chauffeur && (
                                                            <p className="text-sm text-slate-500 dark:text-slate-400">Chauffeur: {vehicle.chauffeur.prenom} {vehicle.chauffeur.nom} ({vehicle.chauffeur.telephone})</p>
                                                        )}
                                                        <p className="text-sm text-slate-500 dark:text-slate-400">Ville: {vehicle.ville || "N/A"}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-slate-500 dark:text-slate-400">Aucun véhicule trouvé.</p>
                                        )}
                                    </div>

                                 
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                            <button
                                onClick={closeReattributionModal}
                                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleReattribution}
                                disabled={!selectedAttribution}
                                className={`px-4 py-2 ${selectedAttribution ? "bg-primary hover:bg-primary/90" : "bg-gray-400 cursor-not-allowed"} text-white font-semibold rounded-md transition-colors`}
                            >
                                Confirmer Réattribution
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}

// ─── Inline map components (ported from ongo-dashboard SingleMAp) ─────────────

interface CourseMapProps {
    course: any;
}

function CourseMap({ course }: CourseMapProps) {
    let departCoords: [number, number] = [0, 0];
    let arriveeCoords: [number, number] = [0, 0];

    try {
        departCoords = JSON.parse(course.latLngDepart);
    } catch {
        console.warn("Invalid latLngDepart JSON");
    }

    try {
        arriveeCoords = JSON.parse(course.latLngArriver ?? course.latLngArrivee ?? "[]");
    } catch {
        console.warn("Invalid latLngArriver JSON");
    }

    const center = { lat: departCoords[0] || 3.848, lng: departCoords[1] || 11.502 };

    return (
        <div style={{ height: "100%", width: "100%" }}>
            <GoogleMapReact
                bootstrapURLKeys={{ key: "AIzaSyCoK5wBInRF7Uj6jx8AEt1t4UrqiQPFKxs" }}
                defaultCenter={center}
                defaultZoom={12}
            >
                {departCoords[0] !== 0 && (
                    <CourseMarker
                        lat={departCoords[0]}
                        lng={departCoords[1]}
                        label="Départ"
                        color="#22c55e"
                    />
                )}
                {arriveeCoords[0] !== 0 && (
                    <CourseMarker
                        lat={arriveeCoords[0]}
                        lng={arriveeCoords[1]}
                        label="Arrivée"
                        color="#ef4444"
                    />
                )}
            </GoogleMapReact>
        </div>
    );
}

interface CourseMarkerProps {
    lat: number;
    lng: number;
    label: string;
    color: string;
}

function CourseMarker({ label, color }: CourseMarkerProps) {
    return (
        <div style={{ position: "absolute", top: "-60px", left: "-20px", textAlign: "center" }}>
            <img src="/car.png" alt="marker" height={48} style={{ mixBlendMode: "multiply" }} />
            <div
                style={{
                    background: color,
                    color: "#fff",
                    borderRadius: "6px",
                    padding: "2px 8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    marginTop: "4px",
                    whiteSpace: "nowrap",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                }}
            >
                {label}
            </div>
        </div>
    );
}
