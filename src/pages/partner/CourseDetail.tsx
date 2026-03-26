import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PartnerLayout from '../../components/partner/PartnerLayout';
import ApiService from '../../services/ApiService';

interface Course {
    id: number;
    lieu_depart: string;
    lieu_arrive: string;
    montant: number;
    statut: string;
    date_depart: string;
    heure_depart: string;
    distance?: string;
    duree?: string;
    client?: {
        id: number;
        nom: string;
        prenom: string;
        telephone: string;
        email: string;
    };
    attributions?: Array<{
        id: number;
        chauffeurs: {
            id: number;
            nom: string;
            prenom: string;
            telephone: string;
            vehicules: Array<{
                modele: string;
                matricule: string;
            }>;
        };
    }>;
}

interface PartnerCourseDetailProps {
    onLogout: () => void;
    user: any;
}

const CourseDetail: React.FC<PartnerCourseDetailProps> = ({ onLogout, user }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'details' | 'client' | 'driver' | 'review'>('details');
    const api = new ApiService();

    useEffect(() => {
        if (id) {
            fetchCourseDetail();
        }
    }, [id]);

    const fetchCourseDetail = async () => {
        try {
            const response = await api.getData(`utilisateur/get-partner-course-detail/${id}?user_id=${user.id}`);
            if (response.data.success) {
                setCourse(response.data.data);
            }
        } catch (error) {
            console.error("Error fetching course detail:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <PartnerLayout user={user} onLogout={onLogout}>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </PartnerLayout>
        );
    }

    if (!course) {
        return (
            <PartnerLayout user={user} onLogout={onLogout}>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-on-surface-variant">
                    <span className="material-symbols-outlined text-6xl mb-4">error</span>
                    <h2 className="text-xl font-bold">Course non trouvée</h2>
                    <button 
                        onClick={() => navigate('/partner/courses')}
                        className="mt-4 px-6 py-2 bg-primary text-on-primary rounded-full font-bold"
                    >
                        Retour aux courses
                    </button>
                </div>
            </PartnerLayout>
        );
    }

    const driver = course.attributions?.[0]?.chauffeurs;

    return (
        <PartnerLayout user={user} onLogout={onLogout}>
            <div className="pb-12">
                {/* Hero Header Section */}
                <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                                course.statut === 'TERMINEE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                                {course.statut}
                            </span>
                            <span className="text-on-surface-variant text-sm font-medium">Recorded on {course.date_depart}</span>
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-on-surface">Course ID: {course.id}</h1>
                        <p className="mt-2 text-on-surface-variant flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">location_on</span>
                            {course.lieu_depart} <span className="material-symbols-outlined text-xs">arrow_forward</span> {course.lieu_arrive}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium text-on-surface-variant mb-1 uppercase tracking-widest">Total Amount</p>
                        <div className="text-4xl font-black text-primary">{course.montant} FCFA</div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-8 border-b border-outline-variant/20 mb-8 overflow-x-auto">
                    <button 
                        onClick={() => setActiveTab('details')}
                        className={`pb-4 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'details' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}
                    >
                        Trip Details
                    </button>
                    <button 
                        onClick={() => setActiveTab('client')}
                        className={`pb-4 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'client' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}
                    >
                        Client Info
                    </button>
                    <button 
                        onClick={() => setActiveTab('driver')}
                        className={`pb-4 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'driver' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}
                    >
                        Driver Info
                    </button>
                    <button 
                        onClick={() => setActiveTab('review')}
                        className={`pb-4 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'review' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}
                    >
                        Review
                    </button>
                </div>

                {/* Bento Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left/Middle Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {activeTab === 'details' && (
                            <>
                                {/* Map Section Placeholder */}
                                <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm ring-1 ring-outline-variant/10">
                                    <div className="p-6 flex justify-between items-center border-b border-surface-container">
                                        <h3 className="font-headline font-bold text-lg">Route Visualization</h3>
                                        <button className="text-primary text-sm font-semibold flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">fullscreen</span>
                                            Expand Map
                                        </button>
                                    </div>
                                    <div className="h-96 relative bg-surface-container flex items-center justify-center">
                                        <span className="material-symbols-outlined text-6xl text-outline-variant/30">map</span>
                                        <div className="absolute top-4 left-4 space-y-2">
                                            <div className="bg-white/90 backdrop-blur p-3 rounded-lg shadow-md max-w-xs ring-1 ring-black/5">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1 w-2 h-2 rounded-full bg-blue-600"></div>
                                                    <div>
                                                        <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">Pickup</p>
                                                        <p className="text-xs font-bold text-on-surface">{course.lieu_depart}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-white/90 backdrop-blur p-3 rounded-lg shadow-md max-w-xs ring-1 ring-black/5">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1 w-2 h-2 rounded-full bg-red-600"></div>
                                                    <div>
                                                        <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">Destination</p>
                                                        <p className="text-xs font-bold text-on-surface">{course.lieu_arrive}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Timeline Section */}
                                <div className="bg-white rounded-xl shadow-sm ring-1 ring-outline-variant/10 p-8">
                                    <h3 className="font-headline font-bold text-xl mb-8">Course Timeline</h3>
                                    <div className="relative flex justify-between items-start">
                                        <div className="absolute top-5 left-0 w-full h-0.5 bg-surface-container-high z-0"></div>
                                        
                                        <div className="relative z-10 flex flex-col items-center gap-3 max-w-[150px] text-center">
                                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-lg ring-4 ring-white">
                                                <span className="material-symbols-outlined text-base">near_me</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-on-surface">Requested</p>
                                                <p className="text-[10px] text-on-surface-variant font-medium">{course.heure_depart}</p>
                                            </div>
                                        </div>

                                        <div className="relative z-10 flex flex-col items-center gap-3 max-w-[150px] text-center">
                                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-lg ring-4 ring-white">
                                                <span className="material-symbols-outlined text-base">directions_car</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-on-surface">Trip Started</p>
                                                <p className="text-[10px] text-on-surface-variant font-medium">---</p>
                                            </div>
                                        </div>

                                        <div className="relative z-10 flex flex-col items-center gap-3 max-w-[150px] text-center">
                                            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white shadow-lg ring-4 ring-white">
                                                <span className="material-symbols-outlined text-base">check_circle</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-on-surface">Completed</p>
                                                <p className="text-[10px] text-on-surface-variant font-medium">---</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'client' && (
                            <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm ring-1 ring-outline-variant/10">
                                <h3 className="font-headline font-bold text-xl mb-6">Client Information</h3>
                                {course.client ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-primary text-3xl">person</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-on-surface-variant uppercase">Full Name</p>
                                                <p className="text-lg font-bold text-on-surface">{course.client.prenom} {course.client.nom}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-xs font-bold text-on-surface-variant uppercase">Phone Number</p>
                                                <p className="text-on-surface font-semibold">{course.client.telephone}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-on-surface-variant uppercase">Email Address</p>
                                                <p className="text-on-surface font-semibold">{course.client.email || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-on-surface-variant">No client information available</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'driver' && (
                            <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm ring-1 ring-outline-variant/10">
                                <h3 className="font-headline font-bold text-xl mb-6">Driver Information</h3>
                                {driver ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-tertiary/10 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-tertiary text-3xl">directions_car</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-on-surface-variant uppercase">Driver Name</p>
                                                <p className="text-lg font-bold text-on-surface">{driver.prenom} {driver.nom}</p>
                                                <p className="text-xs text-on-surface-variant">ID: {driver.id}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-xs font-bold text-on-surface-variant uppercase">Vehicle</p>
                                                <p className="text-on-surface font-semibold">
                                                    {driver.vehicules?.[0]?.modele || 'N/A'} ({driver.vehicules?.[0]?.matricule || 'N/A'})
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-on-surface-variant uppercase">Contact</p>
                                                <p className="text-on-surface font-semibold">{driver.telephone}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-on-surface-variant">No driver assigned yet</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'review' && (
                            <div className="bg-surface-container-lowest rounded-xl p-16 shadow-sm ring-1 ring-outline-variant/10 flex flex-col items-center justify-center">
                                <span className="material-symbols-outlined text-slate-300 text-6xl mb-4">rate_review</span>
                                <p className="text-on-surface-variant font-medium text-lg">Aucune note pour cette course</p>
                            </div>
                        )}
                    </div>

                    {/* Sidebar Stats */}
                    <div className="space-y-6">
                        <div className="bg-primary text-on-primary p-6 rounded-xl shadow-lg relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                            <h3 className="font-headline font-bold text-lg mb-4">Trip Summary</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                    <span className="text-on-primary/70 text-sm">Distance</span>
                                    <span className="font-bold">{course.distance || '--'} km</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                    <span className="text-on-primary/70 text-sm">Duration</span>
                                    <span className="font-bold">{course.duree || '--'} min</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-on-primary/70 text-sm capitalize">Fare</span>
                                    <span className="font-bold">{course.montant} FCFA</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-surface-container-low p-6 rounded-xl ring-1 ring-outline-variant/10">
                            <h4 className="text-xs font-black text-on-surface-variant uppercase tracking-widest mb-4">Payment Method</h4>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-8 bg-surface-container-highest rounded flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-on-surface">Payment</p>
                                    <p className="text-xs text-on-surface-variant">Confirmed</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-2 rounded-xl border border-surface-container space-y-1">
                            <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-container-low transition-colors group">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-slate-400 group-hover:text-primary">receipt_long</span>
                                    <span className="text-sm font-semibold text-on-surface">Download Invoice</span>
                                </div>
                                <span className="material-symbols-outlined text-sm text-slate-300">chevron_right</span>
                            </button>
                            <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-container-low transition-colors group">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-slate-400 group-hover:text-primary">support_agent</span>
                                    <span className="text-sm font-semibold text-on-surface">Report an Issue</span>
                                </div>
                                <span className="material-symbols-outlined text-sm text-slate-300">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </PartnerLayout>
    );
};

export default CourseDetail;
