import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PartnerLayout from '../../components/partner/PartnerLayout';
import ApiService from '../../services/ApiService';
import GoogleMapReact from 'google-map-react';

// Helper components for Google Maps
const CourseMarker: React.FC<{ lat: number; lng: number; label: string; color: string }> = ({ label, color }) => (
    <div className="relative -translate-x-1/2 -translate-y-full flex flex-col items-center animate-in zoom-in duration-500">
        <div className="bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg shadow-xl border border-outline-variant/10 text-[10px] font-black mb-1 whitespace-nowrap text-primary uppercase tracking-wider">
            {label}
        </div>
        <div className="w-4 h-4 rounded-full border-2 border-white shadow-lg flex items-center justify-center" style={{ backgroundColor: color }}>
             <div className="w-1.5 h-1.5 rounded-full bg-white/50"></div>
        </div>
    </div>
);

const CourseMap: React.FC<{ course: any }> = ({ course }) => {
    let departCoords: [number, number] = [0, 0];
    let arriveeCoords: [number, number] = [0, 0];

    try {
        if (course.latLngDepart) departCoords = JSON.parse(course.latLngDepart);
        if (course.latLngArriver) arriveeCoords = JSON.parse(course.latLngArriver);
    } catch (e) {
        console.warn("Error parsing coordinates:", e);
    }

    const defaultCenter = { lat: 3.848, lng: 11.502 }; // Yaoundé
    const center = departCoords[0] ? { lat: (departCoords[0] + (arriveeCoords[0] || departCoords[0]))/2, lng: (departCoords[1] + (arriveeCoords[1] || departCoords[1]))/2 } : defaultCenter;

    return (
        <div className="w-full h-full grayscale-[0.2] brightness-[1.05]">
            <GoogleMapReact
                bootstrapURLKeys={{ key: "AIzaSyCoK5wBInRF7Uj6jx8AEt1t4UrqiQPFKxs" }}
                center={center}
                defaultZoom={13}
                options={{
                    disableDefaultUI: true,
                    styles: [
                        {
                            "featureType": "all",
                            "elementType": "geometry",
                            "stylers": [{ "color": "#f5f5f5" }]
                        },
                        {
                            "featureType": "water",
                            "elementType": "geometry",
                            "stylers": [{ "color": "#e9e9e9" }]
                        }
                    ]
                }}
            >
                {departCoords[0] !== 0 && (
                    <CourseMarker
                        lat={departCoords[0]}
                        lng={departCoords[1]}
                        label="DÉPART"
                        color="#0061A4"
                    />
                )}
                {arriveeCoords[0] !== 0 && (
                    <CourseMarker
                        lat={arriveeCoords[0]}
                        lng={arriveeCoords[1]}
                        label="ARRIVÉE"
                        color="#BA1A1A"
                    />
                )}
            </GoogleMapReact>
        </div>
    );
};

interface Course {
    id: number;
    code: string;
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
    categorie_vehicule?: {
        id: number;
        libelle: string;
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

    const handlePrint = () => {
        if (course) {
            sessionStorage.setItem(`course_detail_${id}`, JSON.stringify(course));
            window.open(`/courses/${id}/print`, '_blank');
        }
    };

    if (loading) {
        return (
            <PartnerLayout user={user} onLogout={onLogout}>
                <div className="flex flex-col items-center justify-center min-h-[70vh]">
                     <div className="relative w-20 h-20">
                        <div className="absolute inset-0 rounded-full border-4 border-primary/10"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-6 text-outline font-medium animate-pulse">Chargement de la course...</p>
                </div>
            </PartnerLayout>
        );
    }

    if (!course) {
        return (
            <PartnerLayout user={user} onLogout={onLogout}>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-on-surface-variant">
                    <div className="w-20 h-20 rounded-full bg-error/10 flex items-center justify-center text-error mb-6">
                        <span className="material-symbols-outlined text-4xl">warning</span>
                    </div>
                    <h2 className="text-2xl font-black text-on-surface">Course introuvable</h2>
                    <p className="text-outline mt-2 mb-8">La course que vous recherchez n'existe pas ou a été supprimée.</p>
                    <button 
                        onClick={() => navigate('/partner/courses')}
                        className="px-8 py-3 bg-primary text-on-primary rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                    >
                        Retour à la liste
                    </button>
                </div>
            </PartnerLayout>
        );
    }

    const driver = course.attributions?.[0]?.chauffeurs;

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'TERMINEE': return 'bg-green-500/10 text-green-600 border border-green-500/20';
            case 'ANNULEE': return 'bg-error/10 text-error border border-error/20';
            case 'EN_COURS': return 'bg-primary/10 text-primary border border-primary/20';
            default: return 'bg-outline/10 text-outline border border-outline/20';
        }
    };

    return (
        <PartnerLayout user={user} onLogout={onLogout}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 font-body animate-in fade-in duration-700">
                
                {/* --- HERO HEADER --- */}
                <div className="relative mb-12 p-8 rounded-[2rem] bg-gradient-to-br from-primary to-primary-fixed overflow-hidden shadow-2xl shadow-primary/30">
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-white/5 skew-x-[-20deg] translate-x-20"></div>
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                    
                    <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-2 text-white/70 text-xs font-black uppercase tracking-[0.2em]">
                                <button onClick={() => navigate('/partner/courses')} className="hover:text-white transition-colors py-1">Courses</button>
                                <span className="material-symbols-outlined text-[10px] md:text-[12px]">chevron_right</span>
                                <span className="text-white py-1">Détails de la course</span>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shrink-0">
                                    <span className="material-symbols-outlined text-2xl md:text-3xl">route</span>
                                </div>
                                <div>
                                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-black text-white tracking-tight leading-tight break-all">
                                        #{course.code || course.id}
                                    </h1>
                                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-2 md:mt-3">
                                        <span className={`px-3 md:px-4 py-1.5 rounded-full text-[9px] md:text-[10px] font-black tracking-widest uppercase ${getStatusStyle(course.statut)} bg-white/20 text-white border-white/20`}>
                                            {course.statut}
                                        </span>
                                        <div className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 rounded-full bg-black/10 text-white/90 text-[10px] md:text-xs font-bold border border-white/10">
                                            <span className="material-symbols-outlined text-[14px] md:text-[16px]">event</span>
                                            {course.date_depart}
                                            <span className="w-1 h-1 rounded-full bg-white/30 hidden sm:block"></span>
                                            <span className="hidden sm:inline">{course.heure_depart}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 rounded-full bg-black/10 text-white/90 text-[10px] md:text-xs font-bold border border-white/10 sm:hidden">
                                            <span className="material-symbols-outlined text-[14px] md:text-[16px]">schedule</span>
                                            {course.heure_depart}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto mt-6 lg:mt-0">
                            <button 
                                onClick={handlePrint}
                                className="flex-1 sm:flex-none justify-center px-8 py-3.5 bg-white text-primary rounded-2xl font-black text-sm shadow-xl hover:bg-surface-container-highest transition-all flex items-center gap-3 group"
                            >
                                <span className="material-symbols-outlined text-xl group-hover:rotate-12 transition-transform">print</span>
                                Imprimer la Fiche
                            </button>
                            <button className="flex-1 sm:flex-none justify-center px-8 py-3.5 bg-white/10 text-white backdrop-blur-md rounded-2xl font-black text-sm border border-white/20 hover:bg-white/20 transition-all flex items-center gap-3">
                                <span className="material-symbols-outlined text-xl">share</span>
                                Partager
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- MAIN CONTENT BENTO --- */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Column: Trip Process & Details */}
                    <div className="lg:col-span-8 space-y-8">
                        
                        {/* Tab Switcher */}
                        <div className="p-1.5 bg-surface-container-low rounded-2xl flex gap-1 w-full overflow-x-auto no-scrollbar border border-outline-variant/10 shadow-inner">
                            {[
                                { id: 'details', label: 'Trajet', icon: 'route' },
                                { id: 'client', label: 'Client', icon: 'person' },
                                { id: 'driver', label: 'Chauffeur', icon: 'local_taxi' },
                                { id: 'review', label: 'Avis', icon: 'star' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap flex-shrink-0 ${
                                        activeTab === tab.id 
                                        ? 'bg-white shadow-lg text-primary border border-outline-variant/5' 
                                        : 'text-outline hover:bg-surface-container-high'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {activeTab === 'details' && (
                                <div className="space-y-8">
                                    <div className="bg-white rounded-[2rem] p-6 md:p-10 shadow-sm border border-outline-variant/5 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-6 md:p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <span className="material-symbols-outlined text-6xl md:text-8xl text-primary">directions_car</span>
                                        </div>
                                        
                                        <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-12 mb-12 md:mb-16 relative">
                                            <div className="flex-1 space-y-10 md:space-y-12">
                                                {/* Departure */}
                                                <div className="relative pl-10">
                                                    <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center ring-8 ring-primary/5">
                                                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                                                    </div>
                                                    <p className="text-[10px] font-black text-outline uppercase tracking-[0.2em] mb-2 leading-none">Départ</p>
                                                    <h3 className="text-lg md:text-xl font-bold text-on-surface line-clamp-2">{course.lieu_depart}</h3>
                                                </div>

                                                {/* Vertical Connector */}
                                                <div className="absolute left-4 top-10 bottom-10 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-error rounded-full"></div>

                                                {/* Arrival */}
                                                <div className="relative pl-10">
                                                    <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-error/10 flex items-center justify-center ring-8 ring-error/5">
                                                        <span className="material-symbols-outlined text-error text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                                                    </div>
                                                    <p className="text-[10px] font-black text-outline uppercase tracking-[0.2em] mb-2 leading-none">Destination</p>
                                                    <h3 className="text-lg md:text-xl font-bold text-on-surface line-clamp-2">{course.lieu_arrive}</h3>
                                                </div>
                                            </div>

                                            <div className="w-full md:w-64 space-y-1 relative mt-6 md:mt-0">
                                                <div className="p-6 bg-surface-container-low rounded-3xl border border-outline-variant/10 text-center flex flex-col items-center">
                                                    <span className="text-[10px] font-black text-outline uppercase tracking-[0.2em] mb-4">Montant Total</span>
                                                    <div className="text-4xl font-black text-primary font-headline">
                                                        {course.montant.toLocaleString()}
                                                    </div>
                                                    <span className="text-xs font-bold text-outline uppercase tracking-widest mt-1">FCFA</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 pt-10 border-t border-outline-variant/10">
                                            <div className="space-y-1">
                                                <p className="text-[9px] md:text-[10px] font-black text-outline uppercase tracking-widest break-words">Type</p>
                                                <p className="text-sm md:text-base font-bold text-on-surface flex flex-wrap items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-sm text-secondary">category</span>
                                                    {course.categorie_vehicule?.libelle || "COURSE"}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] md:text-[10px] font-black text-outline uppercase tracking-widest break-words">Distance</p>
                                                <p className="text-sm md:text-base font-bold text-on-surface flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-sm text-secondary">analytics</span>
                                                    {course.distance || '—'} KM
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] md:text-[10px] font-black text-outline uppercase tracking-widest break-words">Durée</p>
                                                <p className="text-sm md:text-base font-bold text-on-surface flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-sm text-secondary">timer</span>
                                                    {course.duree || '—'} MIN
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[9px] md:text-[10px] font-black text-outline uppercase tracking-widest break-words">Paiement</p>
                                                <p className="text-sm md:text-base font-bold text-on-surface flex flex-wrap items-center gap-1.5">
                                                    <span className={`material-symbols-outlined text-sm ${course.statut === 'TERMINEE' ? 'text-green-500' : 'text-error'}`}>check_circle</span>
                                                    {course.statut === 'TERMINEE' ? 'Vérifié' : 'En attente'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Map Component */}
                                    <div className="bg-white rounded-[2rem] h-[300px] md:h-[450px] overflow-hidden shadow-sm border border-outline-variant/5 relative group">
                                         <CourseMap course={course} />
                                         <div className="absolute top-6 left-6 p-4 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-outline-variant/10 flex items-center gap-3">
                                             <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                                 <span className="material-symbols-outlined text-xl animate-pulse">radar</span>
                                             </div>
                                             <div>
                                                 <p className="text-[10px] font-black text-outline uppercase tracking-widest">Suivi Carte</p>
                                                 <p className="text-xs font-bold text-on-surface">Course active</p>
                                             </div>
                                         </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'client' && (
                                <div className="bg-white rounded-[2rem] p-6 md:p-12 shadow-sm border border-outline-variant/5 text-center flex flex-col items-center">
                                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] md:rounded-[2.5rem] bg-surface-container-high flex items-center justify-center text-3xl md:text-4xl font-headline font-black text-primary shadow-xl border-4 border-white mb-6 md:mb-8">
                                        {course.client ? `${course.client.prenom[0]}${course.client.nom[0]}` : "?"}
                                    </div>
                                    <h3 className="text-2xl md:text-3xl font-black text-on-surface mb-2">{course.client?.prenom} {course.client?.nom}</h3>
                                    <p className="text-outline font-bold tracking-widest uppercase text-xs mb-8 md:mb-10">Identifiant Client: #{course.client?.id}</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                                        <div className="p-5 md:p-6 bg-surface-container-low rounded-3xl border border-outline-variant/10 text-left group hover:bg-primary/5 transition-all">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm mb-4">
                                                <span className="material-symbols-outlined text-xl">alternate_email</span>
                                            </div>
                                            <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">Email</p>
                                            <p className="font-bold text-on-surface text-base md:text-lg break-all">{course.client?.email || 'Non renseigné'}</p>
                                        </div>
                                        <div className="p-5 md:p-6 bg-surface-container-low rounded-3xl border border-outline-variant/10 text-left group hover:bg-primary/5 transition-all">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm mb-4">
                                                <span className="material-symbols-outlined text-xl">call</span>
                                            </div>
                                            <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">Téléphone</p>
                                            <p className="font-bold text-on-surface text-base md:text-lg break-all">{course.client?.telephone || 'Non renseigné'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'driver' && (
                                <div className="bg-white rounded-[2rem] p-6 md:p-12 shadow-sm border border-outline-variant/5">
                                    {driver ? (
                                        <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center md:items-start text-center md:text-left">
                                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] md:rounded-[3rem] bg-secondary-container flex items-center justify-center text-4xl md:text-5xl font-headline font-black text-primary shadow-2xl border-8 border-white ring-8 ring-primary/5 flex-shrink-0">
                                                {driver.prenom[0]}{driver.nom[0]}
                                            </div>
                                            <div className="flex-1 space-y-6 md:space-y-8 mt-2 md:mt-4">
                                                <div>
                                                    <h3 className="text-3xl md:text-4xl font-headline font-black text-on-surface">{driver.prenom} {driver.nom}</h3>
                                                    <p className="text-outline font-bold tracking-[0.2em] uppercase text-xs">Identifiant Chauffeur: #{driver.id}</p>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="p-5 bg-surface-container-low rounded-3xl border border-outline-variant/10">
                                                        <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">Véhicule</p>
                                                        <p className="font-bold text-on-surface flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-sm">directions_car</span>
                                                            {driver.vehicules?.[0]?.modele || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div className="p-5 bg-surface-container-low rounded-3xl border border-outline-variant/10">
                                                        <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">Immatriculation</p>
                                                        <p className="font-black text-primary font-mono text-lg flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-sm">badge</span>
                                                            {driver.vehicules?.[0]?.matricule || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div className="p-5 bg-surface-container-low rounded-3xl border border-outline-variant/10 col-span-1 sm:col-span-2">
                                                        <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">Téléphone</p>
                                                        <p className="font-bold text-on-surface flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-sm text-primary">call</span>
                                                            {driver.telephone}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-20 text-center flex flex-col items-center">
                                            <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center text-outline mb-4">
                                                <span className="material-symbols-outlined text-4xl">person_off</span>
                                            </div>
                                            <p className="text-outline font-bold italic tracking-wide uppercase text-xs">Aucun chauffeur n'est encore attribué à cette course</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'review' && (
                                <div className="bg-white rounded-[2rem] py-20 md:py-32 shadow-sm border border-outline-variant/5 text-center flex flex-col items-center px-4">
                                    <div className="w-20 h-20 rounded-3xl bg-surface-container-high flex items-center justify-center text-surface-dim mb-8">
                                        <span className="material-symbols-outlined text-4xl">rate_review</span>
                                    </div>
                                    <p className="text-xl md:text-2xl font-bold text-outline/40 italic">Aucune note laissée pour cette course</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Actions & Context */}
                    <div className="lg:col-span-4 space-y-8">
                        
                        {/* Transaction Card */}
                        <div className="bg-on-surface rounded-[2rem] p-8 text-surface shadow-2xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[60px] group-hover:bg-primary/40 transition-all duration-700"></div>
                           <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                               <span className="material-symbols-outlined text-primary text-[16px]">receipt_long</span>
                               Résumé Financier
                           </h4>
                           
                           <div className="space-y-6">
                               <div className="flex justify-between items-center py-3 border-b border-white/5">
                                   <span className="text-xs text-white/50 font-bold">Frais de service</span>
                                   <span className="text-sm font-black text-white">0 FCFA</span>
                               </div>
                               <div className="flex justify-between items-center py-3">
                                   <span className="text-xs text-white/50 font-bold">Base tarifaire</span>
                                   <span className="text-sm font-black text-white">{course.montant.toLocaleString()} FCFA</span>
                               </div>
                               
                               <div className="mt-6 md:mt-8 p-5 md:p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
                                   <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Montant à encaisser</p>
                                   <div className="flex flex-wrap items-baseline gap-2">
                                       <span className="text-3xl sm:text-4xl font-headline font-black text-white">{course.montant.toLocaleString()}</span>
                                       <span className="text-[10px] md:text-xs font-black text-white/40">F.CFA</span>
                                   </div>
                               </div>
                           </div>
                        </div>

                        {/* Fast Actions */}
                        <div className="bg-white rounded-[2rem] p-8 border border-outline-variant/10 shadow-sm space-y-6">
                            <h4 className="text-[10px] font-black text-outline uppercase tracking-[0.3em] flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-primary text-[14px]">bolt</span>
                                Actions Centrales
                            </h4>
                            
                            <div className="space-y-3">
                                <button 
                                    onClick={handlePrint}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-surface-container-low hover:bg-primary/5 border border-outline-variant/5 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all transform group-hover:scale-110">
                                        <span className="material-symbols-outlined text-xl">print</span>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-black text-on-surface">Générer la Fiche</p>
                                        <p className="text-[10px] text-outline font-bold">Export PDF / Impression</p>
                                    </div>
                                </button>

                                <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-surface-container-low hover:bg-error/5 border border-outline-variant/5 transition-all group">
                                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-error group-hover:bg-error group-hover:text-white transition-all transform group-hover:scale-110 font-bold">
                                         <span className="material-symbols-outlined text-xl">report</span>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-black text-on-surface">Signaler Litige</p>
                                        <p className="text-[10px] text-outline font-bold">Contester cette course</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </PartnerLayout>
    );
};

export default CourseDetail;
