import { useEffect, useState } from "react";
import GoogleMapReact from "google-map-react";

import ApiService from "../services/ApiService";

import { ToastContainer, toast } from "react-toastify";

import Loading from "../components/Loading";
import MainLayout from "./MainLayout";
import CourseDetailsModal from "./components/CourseDetailsModal";

interface RaseProps {
    onLogout?: () => void;
    theme?: 'light' | 'dark';
    toggleTheme?: () => void;
}

export default function Rase({ onLogout = () => { }, theme = 'light', toggleTheme = () => { } }: RaseProps) {
    const [courses, setCourses] = useState<any>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [pagination, setPagination] = useState<any>([]);
    const [meta, setMeta] = useState<any>(null);

    // Filter states
    const [dateDebut, setDateDebut] = useState<string>("");
    const [dateFin, setDateFin] = useState<string>("");
    const [statut, setStatut] = useState<string>("Tous les statuts");
    const [search, setSearch] = useState<string>("");

    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

    const [isMapOpen, setIsMapOpen] = useState<boolean>(false);
    const [selectedMapCourse, setSelectedMapCourse] = useState<any>(null);

    const Api = new ApiService();


    const notify = (title: string, type: string) => {
        if (type === "success") {
            toast.success(title);
        } else if (type === "error") {
            toast.error(title);
        }
    };

    const fetchCourses = async (url: string = "list-course-dash", isPag: boolean = false) => {
        setLoading(true);
        try {
            const { data } = await Api.getDatawithPagination(url, isPag);
            if (data.success) {
                console.log(data);
                setCourses(data.data.data);
                setPagination(data.data.links);
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
    };

    const handleFilter = async () => {
        setLoading(true);
        const postData: any = {};

        if (dateDebut) postData.debut = dateDebut;
        if (dateFin) postData.fin = dateFin;
        if (statut !== "Tous les statuts") postData.statut = statut;
        if (search) postData.search = search;

        // If searching by text (ID, Code, Client)
        // Note: The original code had separate search logic. 
        // We might need to combine or handle separately depending on API.
        // Assuming 'filter-course' endpoint handles date and status.

        try {
            const { data } = await Api.postData("filter-course", postData);
            if (data.success) {
                setCourses(data.data.data);
                setPagination(data.data.links);
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
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    const openDetails = (course: any) => {
        setSelectedCourse(course);
        setIsDetailOpen(true);
    };

    const closeDetails = () => {
        setIsDetailOpen(false);
        setSelectedCourse(null);
    };

    const openMap = (course: any) => {
        setSelectedMapCourse(course);
        setIsMapOpen(true);
    };

    const closeMap = () => {
        setIsMapOpen(false);
        setSelectedMapCourse(null);
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
                        <div className="flex items-center gap-3">
                            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">file_download</span>
                                Exporter
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
                                <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                                Imprimer PDF
                            </button>
                        </div>
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
                                <div className="space-y-1.5">
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
                                </div>
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
                                                        <td className="px-4 py-4 whitespace-nowrap sticky right-0 bg-white dark:bg-slate-900">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                                    onClick={() => openDetails(course)}
                                                                    title="Détails"
                                                                >
                                                                    <span className="material-symbols-outlined text-[20px]">visibility</span>
                                                                </button>
                                                                <button
                                                                    className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                                    onClick={() => openMap(course)}
                                                                    title="Voir sur la carte"
                                                                >
                                                                    <span className="material-symbols-outlined text-[20px]">map</span>
                                                                </button>
                                                                <button
                                                                    className="p-1.5 rounded-lg text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                                                                    onClick={() => {
                                                                        sessionStorage.setItem(`course_detail_${course.id}`, JSON.stringify(course));
                                                                        window.open(`/courses/${course.id}`, "_blank");
                                                                    }}
                                                                    title="Voir les détails complets"
                                                                >
                                                                    <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                                                                </button>
                                                                {/* <button className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors" title="Appeler">
                                                                    <span className="material-symbols-outlined text-[20px]">call</span>
                                                                </button> */}
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
