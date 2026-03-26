import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import MainLayout from '../MainLayout';
import ApiService from '../../services/ApiService';
import { toast } from 'react-toastify';
import { useFormik } from 'formik';
import * as Yup from 'yup';

interface AddRentalCategoryProps {
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const AddRentalCategory: React.FC<AddRentalCategoryProps> = ({ onLogout, theme, toggleTheme }) => {
    const api = new ApiService();
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState<boolean>(false);
    const [initialValues, setInitialValues] = useState({
        libelle: '',
        description: '',
        img: ''
    });

    useEffect(() => {
        if (id) {
            fetchCategory();
        }
    }, [id]);

    const fetchCategory = async () => {
        setLoading(true);
        try {
            const response = await api.postData(`location/category/detail/${id}`, {});
            if (response.data.success) {
                const cat = response.data.data;
                setInitialValues({
                    libelle: cat.libelle || '',
                    description: cat.description || '',
                    img: cat.img || ''
                });
            }
        } catch (error) {
            toast.error("Erreur lors du chargement des détails");
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
            formik.setFieldValue('img', reader.result);
        };
        reader.readAsDataURL(file);
    };

    const formik = useFormik({
        initialValues,
        enableReinitialize: true,
        validationSchema: Yup.object({
            libelle: Yup.string().required('Le libellé est obligatoire'),
            description: Yup.string().required('La description est obligatoire'),
        }),
        onSubmit: async (values) => {
            setLoading(true);
            try {
                const url = id ? 'location/category/edit' : 'location/category/store';
                
                const formData = new FormData();
                if (id) formData.append('id', id);
                
                formData.append('libelle', values.libelle);
                formData.append('description', values.description);

                if (selectedFile) {
                    formData.append('file', selectedFile);
                } else {
                    formData.append('img', values.img);
                }

                const response = await api.postData(url, formData);
                if (response.data.success) {
                    toast.success(id ? "Catégorie mise à jour" : "Catégorie créée");
                    navigate('/rental-categories');
                } else {
                    toast.error(response.data.message || "Une erreur est survenue");
                }
            } catch (error) {
                toast.error("Erreur serveur/connexion");
            } finally {
                setLoading(false);
            }
        }
    });

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="bg-white dark:bg-slate-900 px-4 md:px-8 py-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sm text-slate-500 font-manrope mb-4">
                    <Link className="hover:text-primary transition-colors" to="/dashboard">Tableau de bord</Link>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                    <Link className="hover:text-primary transition-colors" to="/rental-categories">Catégories</Link>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold">{id ? 'Éditer' : 'Ajouter'} une catégorie</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#00327d] dark:text-white uppercase leading-none font-headline">
                    {id ? 'Mise à jour Catégorie' : 'Nouvelle Catégorie'}
                </h2>
            </div>

            <div className="p-4 md:p-8 flex justify-center">
                <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                    <form onSubmit={formik.handleSubmit} className="p-8 flex flex-col gap-6">
                        <div className="grid grid-cols-1 gap-6 font-manrope">
                            {/* Libellé */}
                            <div className="flex flex-col gap-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-[#00327d] dark:text-primary-container">Libellé de la catégorie</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">label</span>
                                    <input 
                                        type="text" 
                                        name="libelle"
                                        placeholder="Ex: Luxe, Economique, 4x4..."
                                        className={`w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 ${formik.touched.libelle && formik.errors.libelle ? 'border-rose-400' : 'border-transparent'} focus:border-primary focus:bg-white outline-none transition-all font-bold text-slate-700 dark:text-slate-200`}
                                        onChange={formik.handleChange}
                                        onBlur={formik.handleBlur}
                                        value={formik.values.libelle}
                                    />
                                </div>
                                {formik.touched.libelle && formik.errors.libelle && (
                                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tight">{formik.errors.libelle as string}</p>
                                )}
                            </div>

                            {/* Image Upload */}
                            <div className="flex flex-col gap-3">
                                <label className="text-[11px] font-black uppercase tracking-widest text-[#00327d] dark:text-primary-container">Image de la catégorie</label>
                                <div 
                                    className="relative group cursor-pointer aspect-video rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center hover:border-primary transition-all"
                                    onClick={() => (document.getElementById('cat-image-input') as HTMLInputElement)?.click()}
                                >
                                    {formik.values.img ? (
                                        <img src={formik.values.img} alt="Preview" className="absolute inset-0 w-full h-full object-cover group-hover:opacity-75 transition-opacity" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
                                            <p className="text-[10px] font-black uppercase tracking-widest">Choisir une image</p>
                                        </div>
                                    )}
                                    <input 
                                        id="cat-image-input"
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase text-center italic">Cliquez pour téléverser une illustration</p>
                            </div>

                            {/* Description */}
                            <div className="flex flex-col gap-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-[#00327d] dark:text-primary-container">Description</label>
                                <textarea 
                                    name="description"
                                    rows={4}
                                    placeholder="Décrivez les types de véhicules inclus dans cette catégorie..."
                                    className={`w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 ${formik.touched.description && formik.errors.description ? 'border-rose-400' : 'border-transparent'} focus:border-primary focus:bg-white outline-none transition-all font-bold text-slate-700 dark:text-slate-200 resize-none`}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.description}
                                ></textarea>
                                {formik.touched.description && formik.errors.description && (
                                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tight">{formik.errors.description as string}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-4">
                            <button 
                                type="button"
                                onClick={() => navigate('/rental-categories')}
                                className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest hover:bg-slate-200 transition-all text-xs"
                            >
                                Annuler
                            </button>
                            <button 
                                type="submit"
                                disabled={loading}
                                className="flex-[2] px-6 py-4 rounded-2xl bg-[#00327d] hover:bg-[#00327d]/90 text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-900/20 disabled:opacity-50 transition-all text-xs flex items-center justify-center gap-2"
                            >
                                {loading && <span className="material-symbols-outlined animate-spin">sync</span>}
                                {id ? 'Mettre à jour' : 'Enregistrer la catégorie'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </MainLayout>
    );
};

export default AddRentalCategory;
