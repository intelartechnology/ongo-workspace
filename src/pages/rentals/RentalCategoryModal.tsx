import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import ApiService from '../../services/ApiService';
import { Button, Input } from '../../components/ui';
import { champBase, champTaille } from '../../components/ui/tokens';

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const DESCRIPTION_MAX = 255;

const isDisplayableImage = (value: string) => /^(https?:\/\/|data:image\/|\/)/.test(value || '');

interface RentalCategoryModalProps {
    /** La catégorie à modifier, ou `null` pour une création. */
    category: any | null;
    open: boolean;
    onClose: () => void;
    /** Appelé après un enregistrement réussi, pour recharger la liste. */
    onSaved: () => void;
}

/**
 * Le formulaire de catégorie, en modale.
 *
 * Modifier une catégorie quittait la liste pour un écran séparé, puis y
 * revenait : trois chargements pour changer un libellé, et la position dans
 * la liste perdue au retour. La modale garde la liste derrière elle.
 *
 * Les valeurs initiales viennent de la ligne du tableau, déjà en mémoire ;
 * l'écran autonome, lui, redemandait le détail au serveur.
 */
const RentalCategoryModal: React.FC<RentalCategoryModalProps> = ({ category, open, onClose, onSaved }) => {
    const api = new ApiService();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imgOrigine = useRef<string>('');

    const [libelle, setLibelle] = useState('');
    const [description, setDescription] = useState('');
    const [img, setImg] = useState('');
    const [fichier, setFichier] = useState<File | null>(null);
    const [enCours, setEnCours] = useState(false);
    const [erreurs, setErreurs] = useState<{ libelle?: string; description?: string }>({});

    const edition = Boolean(category?.id);

    // Réamorcer à chaque ouverture : sans cela, la modale rouverte sur une
    // autre ligne gardait la saisie de la précédente.
    useEffect(() => {
        if (!open) return;
        imgOrigine.current = category?.img || '';
        setLibelle(category?.libelle || '');
        setDescription(category?.description || '');
        setImg(category?.img || '');
        setFichier(null);
        setErreurs({});
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [open, category]);

    useEffect(() => {
        if (!open) return;
        const auClavier = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !enCours) onClose();
        };
        window.addEventListener('keydown', auClavier);
        return () => window.removeEventListener('keydown', auClavier);
    }, [open, enCours, onClose]);

    const prendreFichier = (f: File) => {
        if (!f.type.startsWith('image/')) {
            toast.error("Le fichier doit être une image");
            return;
        }
        if (f.size > MAX_IMAGE_SIZE) {
            toast.error("L'image ne doit pas dépasser 2 Mo");
            return;
        }
        setFichier(f);
        const lecteur = new FileReader();
        lecteur.onloadend = () => setImg(String(lecteur.result || ''));
        lecteur.readAsDataURL(f);
    };

    const valider = () => {
        const e: typeof erreurs = {};
        if (!libelle.trim()) e.libelle = "Le libellé est obligatoire";
        else if (libelle.trim().length > 60) e.libelle = "60 caractères maximum";
        if (!description.trim()) e.description = "La description est obligatoire";
        else if (description.trim().length > DESCRIPTION_MAX) e.description = `${DESCRIPTION_MAX} caractères maximum`;
        setErreurs(e);
        return Object.keys(e).length === 0;
    };

    const enregistrer = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!valider()) return;
        // À la création, le serveur refuse une catégorie sans visuel : on
        // l'arrête ici plutôt que de lui faire perdre sa saisie.
        if (!edition && !fichier) {
            toast.error("L'image de la catégorie est obligatoire");
            return;
        }

        setEnCours(true);
        try {
            const donnees = new FormData();
            if (edition) donnees.append('id', String(category.id));
            donnees.append('libelle', libelle.trim());
            donnees.append('description', description.trim());
            if (fichier) donnees.append('file', fichier);
            else donnees.append('img', img);

            const reponse = await api.postData(edition ? 'location/category/edit' : 'location/category/store', donnees);
            if (reponse.data.success) {
                toast.success(edition ? "Catégorie mise à jour" : "Catégorie créée");
                onSaved();
                onClose();
            } else {
                toast.error(reponse.data.message || "Une erreur est survenue");
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Erreur serveur/connexion");
        } finally {
            setEnCours(false);
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !enCours) onClose();
            }}
        >
            <form
                onSubmit={enregistrer}
                role="dialog"
                aria-modal="true"
                aria-label={edition ? "Modifier la catégorie" : "Nouvelle catégorie"}
                className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] flex flex-col"
            >
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                    <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                        {edition ? `Modifier « ${category.libelle} »` : "Nouvelle catégorie"}
                    </h3>
                    <Button type="button" variant="ghost" size="sm" icon="close" aria-label="Fermer" onClick={onClose} disabled={enCours} />
                </div>

                <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Libellé</span>
                        <Input
                            value={libelle}
                            onChange={(e) => setLibelle(e.target.value)}
                            placeholder="Ex. Berline, SUV, Utilitaire…"
                            maxLength={60}
                            autoFocus
                        />
                        {erreurs.libelle && <span className="text-xs font-semibold text-error">{erreurs.libelle}</span>}
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex justify-between">
                            Description
                            <span className="tabular-nums">{description.length}/{DESCRIPTION_MAX}</span>
                        </span>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            maxLength={DESCRIPTION_MAX}
                            placeholder="Décrivez les véhicules inclus dans cette catégorie…"
                            className={`${champBase} ${champTaille.md} resize-none`}
                        />
                        {erreurs.description && <span className="text-xs font-semibold text-error">{erreurs.description}</span>}
                    </label>

                    <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Visuel {edition && <span className="normal-case font-semibold">(laisser tel quel pour conserver)</span>}
                        </span>
                        <div className="flex items-center gap-3">
                            <div className="size-20 shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                {isDisplayableImage(img) ? (
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-600">directions_car</span>
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && prendreFichier(e.target.files[0])}
                                />
                                <Button type="button" size="sm" icon="upload" onClick={() => fileInputRef.current?.click()}>
                                    Choisir une image
                                </Button>
                                {fichier && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        icon="undo"
                                        onClick={() => {
                                            setFichier(null);
                                            setImg(imgOrigine.current);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                    >
                                        Annuler le choix
                                    </Button>
                                )}
                                <span className="text-[11px] text-slate-400">JPG ou PNG, 2 Mo maximum.</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={enCours}>Annuler</Button>
                    <Button type="submit" variant="primary" loading={enCours} icon="check">
                        {edition ? "Enregistrer" : "Créer"}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default RentalCategoryModal;
