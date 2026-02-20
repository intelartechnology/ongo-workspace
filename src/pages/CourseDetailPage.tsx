import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "./MainLayout";

interface CourseDetailPageProps {
    onLogout?: () => void;
    theme?: "light" | "dark";
    toggleTheme?: () => void;
}

type Tab = "course" | "client" | "chauffeur" | "avis";

export default function CourseDetailPage({
    onLogout = () => { },
    theme = "light",
    toggleTheme = () => { },
}: CourseDetailPageProps) {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [course, setCourse] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<Tab>("course");

    useEffect(() => {
        const stored = sessionStorage.getItem(`course_detail_${id}`);
        if (stored) {
            try {
                setCourse(JSON.parse(stored));
            } catch {
                console.error("Failed to parse course data");
            }
        }
    }, [id]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "TERMINEE":
            case "CONFIRMEE":
                return (
                    <span className="px-3 py-1 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold rounded-full">
                        {status}
                    </span>
                );
            case "ANNULEE":
                return (
                    <span className="px-3 py-1 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold rounded-full">
                        {status}
                    </span>
                );
            case "EN COURS":
                return (
                    <span className="px-3 py-1 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold rounded-full">
                        {status}
                    </span>
                );
            default:
                return (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-xs font-bold rounded-full">
                        {status}
                    </span>
                );
        }
    };

    const tabs: { key: Tab; label: string; icon: string }[] = [
        { key: "course", label: "Course", icon: "route" },
        { key: "client", label: "Client", icon: "person" },
        { key: "chauffeur", label: "Chauffeur", icon: "assignment_ind" },
        { key: "avis", label: "Avis", icon: "reviews" },
    ];

    if (!course) {
        return (
            <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
                <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                    <span className="material-symbols-outlined text-5xl text-slate-300">search_off</span>
                    <p className="text-slate-500 font-medium">Données de la course introuvables.</p>
                    <button
                        onClick={() => navigate("/courses")}
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold"
                    >
                        Retour aux courses
                    </button>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display">
                {/* Breadcrumb header */}
                <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>Tableau de bord</span>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        <button onClick={() => navigate("/courses")} className="hover:underline">
                            Courses
                        </button>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        <span className="text-slate-900 dark:text-slate-100 font-medium">
                            Détails #{course.id}
                        </span>
                    </div>
                    <div className="flex gap-2">

                        <button
                            onClick={() => window.open(`/courses/${course.id}/print`, "_blank")}
                            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">print</span>
                            Exporter PDF
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 lg:p-10">
                    <div className="max-w-6xl mx-auto space-y-8">
                        {/* Page title */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                                        Course #{course.id}
                                    </h2>
                                    {getStatusBadge(course.statut)}
                                </div>
                                <p className="text-slate-500">
                                    Détails complets de la course du {course.date_depart} à {course.heure_depart}
                                </p>
                            </div>
                        </div>

                        {/* Tabbed Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            {/* Tab Bar */}
                            <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 overflow-x-auto">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`px-6 py-4 text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-colors border-b-2 ${activeTab === tab.key
                                            ? "border-primary text-primary"
                                            : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            <div className="p-8">
                                {/* ── Course Tab ── */}
                                {activeTab === "course" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        {/* Left: General Info + Payment */}
                                        <div className="space-y-8">
                                            <div>
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                                                    Informations Générales
                                                </h3>
                                                <div className="space-y-3">
                                                    {[
                                                        { label: "ID", value: `#${course.id}` },
                                                        { label: "Code", value: course.code },
                                                        { label: "Type", value: course.type || "COURSE" },
                                                        {
                                                            label: "Date & Heure",
                                                            value: `${course.date_depart} - ${course.heure_depart}`,
                                                        },
                                                        {
                                                            label: "Catégorie",
                                                            value: course.categorie_vehicule?.libelle || "N/A",
                                                        },
                                                    ].map((row) => (
                                                        <div
                                                            key={row.label}
                                                            className="flex justify-between py-2 border-b border-slate-50 dark:border-slate-800"
                                                        >
                                                            <span className="text-slate-500">{row.label}</span>
                                                            <span className="font-bold">{row.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                                                    Paiement
                                                </h3>
                                                <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/10">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-xs text-primary font-bold uppercase">
                                                                Montant Total
                                                            </p>
                                                            <p className="text-2xl font-black text-primary">
                                                                {course.montant} Fcfa
                                                            </p>
                                                        </div>
                                                        <span
                                                            className={`px-3 py-1 text-xs font-bold rounded-full ${course.is_paid
                                                                ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                                                : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                                                }`}
                                                        >
                                                            {course.is_paid
                                                                ? course.transaction_type === "CASH"
                                                                    ? "CASH"
                                                                    : "PAYÉ"
                                                                : "NON PAYÉ"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Itinerary */}
                                        <div>
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                                                Itinéraire
                                            </h3>
                                            <div className="flex gap-4">
                                                <div className="flex flex-col items-center">
                                                    <span className="material-symbols-outlined text-primary">
                                                        radio_button_checked
                                                    </span>
                                                    <div className="w-0.5 h-12 bg-slate-200 dark:bg-slate-700" />
                                                    <span className="material-symbols-outlined text-red-500">
                                                        location_on
                                                    </span>
                                                </div>
                                                <div className="flex-1 space-y-6">
                                                    <div>
                                                        <p className="text-xs text-slate-400 font-bold uppercase">
                                                            Départ
                                                        </p>
                                                        <p className="font-bold text-slate-900 dark:text-white">
                                                            {course.lieu_depart}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-400 font-bold uppercase">
                                                            Destination
                                                        </p>
                                                        <p className="font-bold text-slate-900 dark:text-white">
                                                            {course.lieu_arrive}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── Client Tab ── */}
                                {activeTab === "client" && (
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
                                            Détails du Client
                                        </h3>
                                        <div className="flex flex-col md:flex-row gap-8 items-start">
                                            <div className="bg-primary/10 rounded-full p-4 flex-shrink-0">
                                                <span className="material-symbols-outlined text-primary text-4xl">
                                                    person_2
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 flex-1">
                                                {[
                                                    {
                                                        label: "Nom complet",
                                                        value: course.client
                                                            ? `${course.client.prenom} ${course.client.nom}`
                                                            : "Inconnu",
                                                    },
                                                    { label: "ID Client", value: course.client?.id || "—" },
                                                    {
                                                        label: "Téléphone",
                                                        value: course.client?.telephone || "—",
                                                        highlight: true,
                                                    },
                                                    { label: "Email", value: course.client?.email || "—" },
                                                ].map((item) => (
                                                    <div key={item.label}>
                                                        <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                                                        <p
                                                            className={`font-bold text-lg ${item.highlight ? "text-primary" : ""
                                                                }`}
                                                        >
                                                            {item.value}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── Chauffeur Tab ── */}
                                {activeTab === "chauffeur" && (
                                    <div>
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                Attributions / Chauffeurs
                                            </h3>
                                            <span className="text-xs text-slate-500">
                                                {course.attributions?.length || 0} attribution(s)
                                            </span>
                                        </div>
                                        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 dark:bg-slate-800/50">
                                                    <tr className="text-slate-500 text-xs font-bold uppercase">
                                                        <th className="py-3 px-6">Chauffeur</th>
                                                        <th className="py-3 px-6">Téléphone</th>
                                                        <th className="py-3 px-6">Véhicule</th>
                                                        <th className="py-3 px-6">Solde</th>
                                                        <th className="py-3 px-6">Statut</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                    {course.attributions?.length > 0 ? (
                                                        course.attributions.map((attr: any) => {
                                                            const initials = `${(attr.chauffeurs?.prenom || "?")[0]}${(
                                                                attr.chauffeurs?.nom || "?"
                                                            )[0]}`.toUpperCase();
                                                            const balance = attr.chauffeurs?.balance ?? 0;
                                                            return (
                                                                <tr key={attr.id}>
                                                                    <td className="py-4 px-6">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-600">
                                                                                {initials}
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-bold text-sm">
                                                                                    {attr.chauffeurs?.prenom}{" "}
                                                                                    {attr.chauffeurs?.nom}
                                                                                </p>
                                                                                <p className="text-[10px] text-slate-500">
                                                                                    ID: {attr.chauffeurs?.id}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-4 px-6 text-sm">
                                                                        {attr.chauffeurs?.telephone || "—"}
                                                                    </td>
                                                                    <td className="py-4 px-6 text-sm">
                                                                        {attr.chauffeurs?.vehicules?.[0]?.modele || "—"}{" "}
                                                                        <span className="text-slate-500">
                                                                            {attr.chauffeurs?.vehicules?.[0]
                                                                                ?.matricule || ""}
                                                                        </span>
                                                                    </td>
                                                                    <td
                                                                        className={`py-4 px-6 text-sm font-medium ${balance < 0
                                                                            ? "text-red-500"
                                                                            : "text-primary"
                                                                            }`}
                                                                    >
                                                                        {balance} Fcfa
                                                                    </td>
                                                                    <td className="py-4 px-6">
                                                                        <span
                                                                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${attr.statut === "CONFIRMEE"
                                                                                ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                                                                : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                                                                }`}
                                                                        >
                                                                            {attr.statut}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr>
                                                            <td
                                                                colSpan={5}
                                                                className="py-10 text-center text-slate-400"
                                                            >
                                                                Aucune attribution pour cette course
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* ── Avis Tab ── */}
                                {activeTab === "avis" && (
                                    <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                                        <span className="material-symbols-outlined text-slate-300 text-5xl mb-4">
                                            rate_review
                                        </span>
                                        <p className="text-slate-500 font-medium">
                                            Aucune note pour cette course
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
