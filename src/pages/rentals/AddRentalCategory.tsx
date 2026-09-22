import React, { useEffect, useRef, useState } from 'react';
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

const isDisplayableImage = (value: string) => /^(https?:\/\/|data:image\/|\/)/.test(value || '');

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 Mo
const DESCRIPTION_MAX = 300;

const AddRentalCategory: React.FC<AddRentalCategoryProps> = ({ onLogout, theme, toggleTheme }) => {
    const api = new ApiService();
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState<boolean>(false);
    const [fetching, setFetching] = useState<boolean>(!!id);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragging, setDragging] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const originalImg = useRef<string>('');
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
        setFetching(true);
        try {
            const response = await api.postData(`location/category/detail/${id}`, {});
            if (response.data.success && response.data.data) {
                const cat = response.data.data;
                originalImg.current = cat.img || '';
                setInitialValues({
                    libelle: cat.libelle || '',
                    description: cat.description || '',
                    img: cat.img || ''
                });
            } else {
                toast.error(response.data.message || "Catégorie introuvable");
                navigate('/rental-categories');
            }
        } catch (error) {
            toast.error("Erreur lors du chargement des détails");
        } finally {
            setFetching(false);
        }
    };

    const applyFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error("Le fichier doit être une image");
            return;
        }
        if (file.size > MAX_IMAGE_SIZE) {
            toast.error("L'image ne doit pas dépasser 2 Mo");
            return;
        }
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            formik.setFieldValue('img', reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        applyFile(e.target.files[0]);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            applyFile(e.dataTransfer.files[0]);
        }
    };

    const cancelSelection = () => {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        formik.setFieldValue('img', originalImg.current);
    };

    const formik = useFormik({
        initialValues,
        enableReinitialize: true,
        validationSchema: Yup.object({
            libelle: Yup.string().trim().required('Le libellé est obligatoire').max(60, '60 caractères maximum'),
            description: Yup.string().trim().required('La description est obligatoire').max(DESCRIPTION_MAX, `${DESCRIPTION_MAX} caractères maximum`),
        }),
        onSubmit: async (values) => {
            if (!id && !selectedFile) {
                toast.error("L'image de la catégorie est obligatoire");
                return;
            }
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
            } catch (error: any) {
                toast.error(error?.response?.data?.message || "Erreur serveur/connexion");
            } finally {
                setLoading(false);
            }
        }
    });

    const descriptionLength = (formik.values.description || '').length;
    const hasPreview = isDisplayableImage(formik.values.img);

    const fieldClass = (touched: boolean | undefined, error: string | undefined) =>
        `w-full rounded-xl bg-slate-50 dark:bg-slate-800 border-2 ${touched && error ? 'border-rose-400' : 'border-transparent'} focus:border-primary focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-semibold text-slate-700 dark:text-slate-200`;

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            {/* En-tête */}
            <div className="bg-white dark:bg-slate-900 px-4 md:px-8 py-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                    <Link className="hover:text-primary transition-colors" to="/dashboard">Tableau de bord</Link>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                    <Link className="hover:text-primary transition-colors" to="/rental-categories">Catégories</Link>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold">{id ? 'Modifier' : 'Nouvelle'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1.5">
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#00327d] dark:text-white uppercase leading-none font-headline">
                            {id ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {id
                                ? 'Mettez à jour le nom, la description ou le visuel de cette catégorie.'
                                : 'Trois informations suffisent : un nom, un visuel et une courte description.'}
                        </p>
                    </div>
                    <Link
                        to="/rental-categories"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm font-bold shrink-0"
                    >
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                        Retour à la liste
                    </Link>
                </div>
            </div>

            <div className="p-4 md:p-8">
                {fetching ? (
                    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="lg:col-span-3 h-[520px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse"></div>
                        <div className="lg:col-span-2 h-72 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse"></div>
                    </div>
                ) : (
                    <form onSubmit={formik.handleSubmit} className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Colonne formulaire */}
                        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-8 flex flex-col gap-7">
                            {/* Étape 1 - Libellé */}
                            <div className="flex flex-col gap-2.5">
                                <div className="flex items-center gap-2.5">
                                    <span className="size-6 rounded-lg bg-primary text-white text-[11px] font-black flex items-center justify-center shrink-0">1</span>
                                    <label htmlFor="libelle" className="text-sm font-black text-slate-800 dark:text-slate-100">
                                        Nom de la catégorie <span className="text-rose-500">*</span>
                                    </label>
                                </div>
                                <input
                                    id="libelle"
                                    type="text"
                                    name="libelle"
                                    placeholder="Ex. Berline, SUV, Utilitaire…"
                                    className={`${fieldClass(formik.touched.libelle, formik.errors.libelle as string)} px-4 py-3.5`}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.libelle}
                                />
                                {formik.touched.libelle && formik.errors.libelle ? (
                                    <p className="text-xs font-bold text-rose-500 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px]">error</span>
                                        {formik.errors.libelle as string}
                                    </p>
                                ) : (
                                    <p className="text-xs text-slate-400">Ce nom apparaît dans l'application et lors de l'ajout d'un véhicule.</p>
                                )}
                            </div>

                            {/* Étape 2 - Image */}
                            <div className="flex flex-col gap-2.5">
                                <div className="flex items-center gap-2.5">
                                    <span className="size-6 rounded-lg bg-primary text-white text-[11px] font-black flex items-center justify-center shrink-0">2</span>
                                    <label className="text-sm font-black text-slate-800 dark:text-slate-100">
                                        Visuel de la catégorie {!id && <span className="text-rose-500">*</span>}
                                    </label>
                                </div>

                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => fileInputRef.current?.click()}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                    onDragLeave={() => setDragging(false)}
                                    onDrop={handleDrop}
                                    className={`relative group cursor-pointer aspect-[16/9] rounded-2xl overflow-hidden border-2 border-dashed ${dragging ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'} flex flex-col items-center justify-center hover:border-primary transition-all`}
                                >
                                    {hasPreview ? (
                                        <>
                                            <img src={formik.values.img} alt="Aperçu" className="absolute inset-0 w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/50 transition-colors flex items-center justify-center">
                                                <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-white/95 text-slate-800 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
                                                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                                                    Changer l'image
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-slate-400 px-6 text-center">
                                            <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
                                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                                                Glissez une image ici, ou cliquez pour parcourir
                                            </p>
                                            <p className="text-xs">JPG, PNG ou WEBP · 2 Mo maximum</p>
                                        </div>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                </div>

                                {selectedFile ? (
                                    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                        <span className="flex items-center gap-2 min-w-0">
                                            <span className="material-symbols-outlined text-[18px] shrink-0">check_circle</span>
                                            <span className="text-xs font-bold truncate">{selectedFile.name}</span>
                                            <span className="text-[11px] opacity-70 shrink-0">({Math.round(selectedFile.size / 1024)} Ko)</span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={cancelSelection}
                                            className="text-[11px] font-black uppercase tracking-widest hover:underline shrink-0"
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                ) : id && !hasPreview ? (
                                    <p className="text-xs text-slate-400">Aucun visuel enregistré. Ajoutez-en un pour rendre la catégorie plus lisible.</p>
                                ) : null}
                            </div>

                            {/* Étape 3 - Description */}
                            <div className="flex flex-col gap-2.5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="size-6 rounded-lg bg-primary text-white text-[11px] font-black flex items-center justify-center shrink-0">3</span>
                                        <label htmlFor="description" className="text-sm font-black text-slate-800 dark:text-slate-100">
                                            Description <span className="text-rose-500">*</span>
                                        </label>
                                    </div>
                                    <span className={`text-[11px] font-bold tabular-nums ${descriptionLength > DESCRIPTION_MAX ? 'text-rose-500' : 'text-slate-400'}`}>
                                        {descriptionLength}/{DESCRIPTION_MAX}
                                    </span>
                                </div>
                                <textarea
                                    id="description"
                                    name="description"
                                    rows={4}
                                    maxLength={DESCRIPTION_MAX}
                                    placeholder="Décrivez les véhicules inclus dans cette catégorie…"
                                    className={`${fieldClass(formik.touched.description, formik.errors.description as string)} p-4 resize-none`}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    value={formik.values.description}
                                ></textarea>
                                {formik.touched.description && formik.errors.description && (
                                    <p className="text-xs font-bold text-rose-500 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px]">error</span>
                                        {formik.errors.description as string}
                                    </p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-5 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => navigate('/rental-categories')}
                                    disabled={loading}
                                    className="sm:flex-1 px-6 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-all text-xs"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="sm:flex-[2] px-6 py-3.5 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-lg shadow-primary/25 disabled:opacity-50 transition-all text-xs flex items-center justify-center gap-2"
                                >
                                    {loading
                                        ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                                        : <span className="material-symbols-outlined text-[18px]">{id ? 'save' : 'add'}</span>}
                                    {loading ? 'Enregistrement…' : id ? 'Enregistrer les modifications' : 'Créer la catégorie'}
                                </button>
                            </div>
                        </div>

                        {/* Colonne aperçu */}
                        <div className="lg:col-span-2 flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px] text-slate-400">visibility</span>
                                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Aperçu en direct</span>
                                </div>
                                <div className="p-5">
                                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                        <div className="aspect-[16/10] bg-slate-100 dark:bg-slate-800/60 relative">
                                            {hasPreview ? (
                                                <img src={formik.values.img} alt="Aperçu de la catégorie" className="absolute inset-0 w-full h-full object-cover" />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                                                    <span className="material-symbols-outlined text-5xl text-primary/30">directions_car</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-900/85 to-transparent"></div>
                                            <div className="absolute inset-x-0 bottom-0 p-4">
                                                <h3 className="font-black text-white text-lg tracking-tight uppercase leading-tight line-clamp-1 drop-shadow">
                                                    {formik.values.libelle || 'Nom de la catégorie'}
                                                </h3>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                                {formik.values.description || 'La description apparaîtra ici.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-primary/5 dark:bg-primary/10 rounded-3xl p-5 flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px] text-primary dark:text-primary-fixed-dim">lightbulb</span>
                                    <span className="text-[11px] font-black uppercase tracking-widest text-primary dark:text-primary-fixed-dim">Conseils</span>
                                </div>
                                <ul className="flex flex-col gap-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    <li className="flex gap-2">
                                        <span className="text-primary dark:text-primary-fixed-dim font-black">•</span>
                                        Gardez un nom court : il s'affiche sur les cartes véhicules.
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-primary dark:text-primary-fixed-dim font-black">•</span>
                                        Choisissez une photo horizontale, bien éclairée.
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-primary dark:text-primary-fixed-dim font-black">•</span>
                                        Une catégorie ne peut être supprimée que si aucun véhicule n'y est rattaché.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </MainLayout>
    );
};

export default AddRentalCategory;
