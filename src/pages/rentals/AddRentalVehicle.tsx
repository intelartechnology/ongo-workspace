import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../MainLayout';
import ApiService from '../../services/ApiService';
import { toast } from 'react-toastify';
import { useFormik } from 'formik';
import * as Yup from 'yup';

interface AddRentalVehicleProps {
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const AddRentalVehicle: React.FC<AddRentalVehicleProps> = ({ onLogout, theme, toggleTheme }) => {
    const api = new ApiService();
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState<boolean>(false);
    // const [uploading, setUploading] = useState<boolean>(false); // Removing this in next step or keeping for potential future use?
    // Actually the lint says setUploading is never read. But wait, I might use it for progress.
    // I'll just remove the unused setUploading or use it.
    const [categories, setCategories] = useState<any[]>([]);
    const [agencies, setAgencies] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [confirmerSuppression, setConfirmerSuppression] = useState<boolean>(false);
    const [suppression, setSuppression] = useState<boolean>(false);

    useEffect(() => {
        if (!confirmerSuppression) return;
        const auClavier = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !suppression) setConfirmerSuppression(false);
        };
        window.addEventListener('keydown', auClavier);
        return () => window.removeEventListener('keydown', auClavier);
    }, [confirmerSuppression, suppression]);

    const supprimer = async () => {
        if (!id) return;
        setSuppression(true);
        try {
            const response = await api.postData(`location/vehicule/delete/${id}`, {});
            if (response.data.success) {
                toast.success("Véhicule retiré de la flotte");
                navigate('/rental-vehicles');
            } else {
                toast.error(response.data.message || "Suppression refusée");
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Erreur lors de la suppression");
        } finally {
            setSuppression(false);
        }
    };

    const [initialValues, setInitialValues] = useState({
        libelle: '',
        description: '',
        matricule: '',
        is_auto: 0,
        is_clim: 0,
        nb_place: 4,
        modele: '',
        image: '',
        couleur: '',
        id_agence: '',
        id_categorie: '',
        montant: 0,
        montant_hors_ville: 0
    });

    useEffect(() => {
        fetchMetadata();
        if (id) {
            fetchVehicle();
        }
    }, [id]);

    const fetchMetadata = async () => {
        try {
            const [catRes, agRes] = await Promise.all([
                api.getData("location/category/all"),
                api.getData("location/agence/all")
            ]);
            if (catRes.data.success) setCategories(catRes.data.data);
            if (agRes.data.success) setAgencies(agRes.data.data);
        } catch (error) {
            console.error("Error fetching metadata", error);
        }
    };

    const fetchVehicle = async () => {
        setLoading(true);
        try {
            const response = await api.postData(`location/vehicule/detail/${id}`, {});
            if (response.data.success) {
                const v = response.data.data;
                setInitialValues({
                    libelle: v.libelle || '',
                    description: v.description || '',
                    matricule: v.matricule || '',
                    is_auto: v.is_auto || 0,
                    is_clim: v.is_clim || 0,
                    nb_place: v.nb_place || 4,
                    modele: v.modele || '',
                    image: v.image || '',
                    couleur: v.couleur || '',
                    id_agence: v.id_agence || '',
                    id_categorie: v.id_categorie || '',
                    montant: v.montant || 0,
                    montant_hors_ville: v.montant_hors_ville || 0
                });
            }
        } catch (error) {
            toast.error("Erreur lors du chargement du véhicule");
        } finally {
            setLoading(false);
        }
    };

    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        setSelectedFile(file);
        
        // Show preview
        const reader = new FileReader();
        reader.onloadend = () => {
            formik.setFieldValue('image', reader.result);
        };
        reader.readAsDataURL(file);
    };

    const formik = useFormik({
        initialValues,
        enableReinitialize: true,
        validationSchema: Yup.object({
            libelle: Yup.string().required('Le libellé est obligatoire'),
            modele: Yup.string().required('Le modèle est obligatoire'),
            matricule: Yup.string().required('Le matricule est obligatoire'),
            id_categorie: Yup.string().required('La catégorie est obligatoire'),
            id_agence: Yup.string().required('L\'agence est obligatoire'),
            montant: Yup.number().min(1, 'Le montant doit être supérieur à 0').required('Obligatoire'),
        }),
        onSubmit: async (values) => {
            setLoading(true);
            try {
                const url = id ? 'location/vehicule/edit' : 'location/vehicule/store';
                
                const formData = new FormData();
                if (id) formData.append('id_vehicule', id);
                
                Object.keys(values).forEach(key => {
                    if (key !== 'image') {
                        formData.append(key, (values as any)[key]);
                    }
                });

                if (selectedFile) {
                    formData.append('file', selectedFile);
                } else {
                    formData.append('image', values.image);
                }

                // We need to use a custom post call if ApiService.postData doesn't handle FormData with proper headers
                // But standard axios.post(url, formData) works.
                const response = await api.postData(url, formData);
                
                if (response.data.success) {
                    toast.success(id ? "Véhicule mis à jour" : "Véhicule créé");
                    navigate('/rental-vehicles');
                } else {
                    toast.error(response.data.message || "Erreur de sauvegarde");
                }
            } catch (error) {
                toast.error("Erreur serveur");
            } finally {
                setLoading(false);
            }
        }
    });

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="px-4 md:px-8 py-6">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {id ? 'Mise à jour Véhicule' : 'Nouveau Véhicule'}
                </h1>
            </div>

            <div className="p-4 md:p-8">
                <form onSubmit={formik.handleSubmit} className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Image & Basic Info */}
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div 
                                className="aspect-square bg-slate-50 dark:bg-slate-800/50 relative cursor-pointer group"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {formik.values.image ? (
                                    <img src={formik.values.image} alt="Preview" className="w-full h-full object-cover group-hover:opacity-75 transition-opacity" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                        <span className="material-symbols-outlined text-6xl">cloud_upload</span>
                                        <p className="text-[10px] uppercase font-black tracking-widest">Cliquez pour ajouter une photo</p>
                                    </div>
                                )}
                                {/* {uploading && (
                                    <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-10">
                                        <span className="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
                                    </div>
                                )} */}
                                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Formats: JPG, PNG, WEBP</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Libellé du Véhicule (Affichage)</label>
                                <input 
                                    type="text" 
                                    name="libelle"
                                    placeholder="Ex: SUV Luxe Noir"
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                                    onChange={formik.handleChange}
                                    value={formik.values.libelle}
                                />
                                {formik.errors.libelle && <p className="text-[9px] font-bold text-rose-400 uppercase">{formik.errors.libelle as string}</p>}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Modèle du Véhicule</label>
                                <input 
                                    type="text" 
                                    name="modele"
                                    placeholder="Ex: Toyota Prado 2023"
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                                    onChange={formik.handleChange}
                                    value={formik.values.modele}
                                />
                                {formik.errors.modele && <p className="text-[9px] font-bold text-rose-400 uppercase">{formik.errors.modele as string}</p>}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plaque d'immatriculation</label>
                                <input 
                                    type="text" 
                                    name="matricule"
                                    placeholder="Ex: LT 123 AA"
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                                    onChange={formik.handleChange}
                                    value={formik.values.matricule}
                                />
                                {formik.errors.matricule && <p className="text-[9px] font-bold text-rose-400 uppercase">{formik.errors.matricule as string}</p>}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description du Véhicule</label>
                                <textarea 
                                    name="description"
                                    rows={3}
                                    placeholder="Ex: Confortable, parfait pour les longs trajets..."
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary outline-none transition-all font-bold text-slate-700 dark:text-slate-200 resize-none"
                                    onChange={formik.handleChange}
                                    value={formik.values.description}
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Detailed Configuration */}
                    <div className="lg:col-span-2 flex flex-col gap-8">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col gap-8">
                            {/* Section 1: Classification */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#00327d] mb-6 flex items-center gap-2">
                                    <span className="size-2 rounded-full bg-primary"></span>
                                    Classification
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Catégorie de Location</label>
                                        <select 
                                            name="id_categorie"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary outline-none transition-all font-bold text-slate-700 dark:text-slate-200 appearance-none"
                                            onChange={formik.handleChange}
                                            value={formik.values.id_categorie}
                                        >
                                            <option value="">Sélectionner une catégorie</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Agence Propriétaire</label>
                                        <select 
                                            name="id_agence"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary outline-none transition-all font-bold text-slate-700 dark:text-slate-200 appearance-none"
                                            onChange={formik.handleChange}
                                            value={formik.values.id_agence}
                                        >
                                            <option value="">Sélectionner l'agence</option>
                                            {agencies.map(a => <option key={a.id} value={a.id}>{a.libelle}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Technical Specs */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#00327d] mb-6 flex items-center gap-2">
                                    <span className="size-2 rounded-full bg-primary"></span>
                                    Spécifications Techniques
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nb Places</label>
                                        <input type="number" name="nb_place" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent outline-none font-bold" onChange={formik.handleChange} value={formik.values.nb_place} />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Couleur</label>
                                        <input type="text" name="couleur" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent outline-none font-bold" onChange={formik.handleChange} value={formik.values.couleur} />
                                    </div>
                                    <div className="flex flex-col gap-2 justify-center">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input type="checkbox" name="is_clim" checked={formik.values.is_clim === 1} onChange={() => formik.setFieldValue('is_clim', formik.values.is_clim ? 0 : 1)} className="hidden" />
                                            <div className={`size-6 rounded-lg flex items-center justify-center transition-all ${formik.values.is_clim ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
                                                {formik.values.is_clim && <span className="material-symbols-outlined text-sm">check</span>}
                                            </div>
                                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 group-hover:text-primary transition-colors">Climatisé</span>
                                        </label>
                                    </div>
                                    <div className="flex flex-col gap-2 justify-center">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input type="checkbox" name="is_auto" checked={formik.values.is_auto === 1} onChange={() => formik.setFieldValue('is_auto', formik.values.is_auto ? 0 : 1)} className="hidden" />
                                            <div className={`size-6 rounded-lg flex items-center justify-center transition-all ${formik.values.is_auto ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'}`}>
                                                {formik.values.is_auto && <span className="material-symbols-outlined text-sm">check</span>}
                                            </div>
                                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 group-hover:text-primary transition-colors">Automatique</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Pricing */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#00327d] mb-6 flex items-center gap-2">
                                    <span className="size-2 rounded-full bg-primary"></span>
                                    Configuration Tarifaire
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-[#00327d]/5 dark:bg-slate-800/80 p-6 rounded-xl border border-[#00327d]/10 flex flex-col gap-4">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-primary">apartment</span>
                                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Tarif Ville (Journalier)</label>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                name="montant"
                                                className="w-full pl-6 pr-16 py-4 bg-white dark:bg-slate-900 border-2 border-transparent focus:border-primary rounded-xl outline-none font-black text-2xl text-[#00327d] dark:text-primary-container"
                                                onChange={formik.handleChange}
                                                value={formik.values.montant}
                                            />
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-xs text-slate-400">XAF</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-4 opacity-80">
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-emerald-500">travel_explore</span>
                                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Tarif Hors-Ville (Journalier)</label>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                name="montant_hors_ville"
                                                className="w-full pl-6 pr-16 py-4 bg-white dark:bg-slate-900 border-2 border-transparent focus:border-primary rounded-xl outline-none font-black text-2xl text-slate-700 dark:text-slate-300"
                                                onChange={formik.handleChange}
                                                value={formik.values.montant_hors_ville}
                                            />
                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-xs text-slate-400">XAF</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                                <button 
                                    type="button"
                                    onClick={() => navigate('/rental-vehicles')}
                                    className="px-8 py-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest hover:bg-slate-200 transition-all text-xs"
                                >
                                    Annuler
                                </button>
                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-8 py-4 rounded-xl bg-[#00327d] hover:bg-[#00327d]/90 text-white font-black uppercase tracking-widest disabled:opacity-50 transition-all text-xs flex items-center justify-center gap-3"
                                >
                                    {loading && <span className="material-symbols-outlined animate-spin">sync</span>}
                                    {id ? 'Mettre à jour le véhicule' : 'Enregistrer dans la flotte'}
                                </button>
                            </div>

                            {/* Suppression, à l'écart des boutons d'enregistrement : en
                                modification seulement, après confirmation. */}
                            {id && (
                                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Supprimer ce véhicule</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Il ne sera plus proposé à la location. Ses réservations passées restent consultables.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmerSuppression(true)}
                                        className="px-5 py-3 rounded-xl border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-sm hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-2 shrink-0"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                        Supprimer le véhicule
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            {confirmerSuppression && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
                    onClick={() => !suppression && setConfirmerSuppression(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-7 flex flex-col gap-5"
                    >
                        <div className="flex items-start gap-4">
                            <div className="size-12 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-rose-500 text-2xl">delete</span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                                    Retirer ce véhicule de la flotte ?
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                    «&nbsp;<span className="font-bold text-slate-700 dark:text-slate-200">{formik.values.modele || formik.values.libelle}</span>&nbsp;»
                                    {formik.values.matricule ? ` (${formik.values.matricule})` : ''} ne sera plus proposé à la location.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            <span className="material-symbols-outlined text-[20px] shrink-0">info</span>
                            <p className="text-xs font-semibold leading-relaxed">
                                Les réservations passées restent consultables. Son image est effacée du stockage seulement s'il n'a jamais été réservé.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmerSuppression(false)}
                                disabled={suppression}
                                className="flex-1 px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-all text-sm"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={supprimer}
                                disabled={suppression}
                                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                {suppression && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                                {suppression ? 'Suppression…' : 'Supprimer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};

export default AddRentalVehicle;
