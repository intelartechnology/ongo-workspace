import React, { useState } from 'react';
import MainLayout from './MainLayout';
import { ToastContainer, toast } from "react-toastify";
import Swal from "sweetalert2";
import ApiService from "../services/ApiService";

interface AddDriverProps {
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

interface DriverFormData {
  modele: string | number | readonly string[] | undefined;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  cni: string;
  matricule: string;
  modele_id: string | number;
  categorie_id: string | number;
}

const AddDriver: React.FC<AddDriverProps> = ({ onLogout, theme, toggleTheme }) => {
  const [formData, setFormData] = useState<DriverFormData>({
    modele: '',
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    cni: '',
    matricule: '',
    modele_id: '',
    categorie_id: '',
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);

  const Api = new ApiService();

  const loadCategory = async () => {
    try {
      const { data } = await Api.getData("categorie-vehicule/liste");
      if (data.success) {
        setCategories(data.data);
        if (data.data.length > 0) {
          setFormData((prevData) => ({
            ...prevData,
            categorie_id: data.data[0].id,
          }));
        }
      } else {
        handleData("Erreur", data.message, "warning");
      }
    } catch (err: any) {
      handleData(
        "Connexion au serveur impossible",
        "Verifier votre connexion internet",
        "warning"
      );
    }
  };

  const loadModele = async () => {
    try {
      const { data } = await Api.getData("modele/liste");
      if (data.success) {
        setModels(data.data);
        if (data.data.length > 0) {
          setFormData((prevData) => ({
            ...prevData,
            modele_id: data.data[0].id,
          }));
        }
      } else {
        notify("Impossible de charger les modèles", "error");
      }
    } catch (err: any) {
      handleData("Connexion au serveur impossible", String(err), "warning");
    }
  };

  React.useEffect(() => {
    loadCategory();
    loadModele();
  }, []);

  const notify = (title: string, type: "success" | "error") => {
    toast[type]("🦄 " + title, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  };

  const handleData = (title: string, text: string, iconText: "warning" | "error" | "success") => {
    Swal.fire({
      showCancelButton: false,
      showConfirmButton: true,
      icon: iconText,
      title: title,
      text: text,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Simple validation for required fields
    if (
      !formData.nom ||
      !formData.prenom ||
      !formData.email ||
      !formData.telephone ||
      !formData.cni ||
      !formData.matricule ||
      !formData.modele_id ||
      !formData.categorie_id
    ) {
      handleData("Champs requis", "Veuillez remplir tous les champs obligatoires.", "warning");
      return;
    }

    try {
      const payload = {
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        telephone: formData.telephone,
        matricule: formData.matricule,
        modele: formData.modele_id,
        categorie: formData.categorie_id,
        carte: "carte", // Default value as seen in addChauffeur.tsx
        cni: formData.cni,
        password: "carExpress", // Default password
        role_id: 2, // Default role_id for drivers
      };

      const { data } = await Api.postData("utilisateur/registerDriver", payload);
      if (data.success) {
        notify("Chauffeur ajouté avec succès", "success");
        setFormData({
          modele: '',
          nom: '',
          prenom: '',
          email: '',
          telephone: '',
          cni: '',
          matricule: '',
          modele_id: models.length > 0 ? models[0].id : '',
          categorie_id: categories.length > 0 ? categories[0].id : '',
        });
      } else {
        handleData("Erreur", data.message, "warning");
      }
    } catch (err) {
      handleData("Connexion au serveur impossible", String(err), "warning");
    }
  };

  return (
    <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
      <ToastContainer />
      <main className="flex-1 overflow-y-auto flex flex-col bg-background-light dark:bg-background-dark">
        <header className="px-8 pt-8 pb-4">
          <nav className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
            <a className="hover:text-primary transition-colors" href="#">Dashboard</a>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-slate-900 dark:text-white">Ajouter un chauffeur</span>
          </nav>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Chauffeur</h1>
        </header>
        <div className="px-8 pb-8 flex-1">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden max-w-5xl">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Ajouter un chauffeur</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Veuillez remplir les informations ci-dessous pour enregistrer un nouveau chauffeur.</p>
            </div>
            <form className="p-8 space-y-8" onSubmit={handleSubmit}>
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-primary">person_outline</span>
                  <h3 className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-xs">Détails du chauffeur</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="nom">Nom du chauffeur (Nom)</label>
                    <input
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                      id="nom"
                      name="nom"
                      placeholder="Entrez le nom"
                      type="text"
                      value={formData.nom}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="prenom">Prenom du chauffeur (Prenom)</label>
                    <input
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                      id="prenom"
                      name="prenom"
                      placeholder="Entrez le prénom"
                      type="text"
                      value={formData.prenom}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="email">Email du chauffeur (Email)</label>
                    <input
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                      id="email"
                      name="email"
                      placeholder="exemple@ongo237.cm"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="telephone">Téléphone du chauffeur (Telephone)</label>
                    <input
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                      id="telephone"
                      name="telephone"
                      placeholder="+237 6XX XXX XXX"
                      type="tel"
                      value={formData.telephone}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="cni">CNI du chauffeur (Cni)</label>
                    <input
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                      id="cni"
                      name="cni"
                      placeholder="Numéro de la carte d'identité"
                      type="text"
                      value={formData.cni}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
              <hr className="border-slate-100 dark:border-slate-800"/>
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-primary">minor_crash</span>
                  <h3 className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-xs">Détails du véhicule</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="matricule">Matricule du véhicule (Matericule)</label>
                    <input
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                      id="matricule"
                      name="matricule"
                      placeholder="Ex: LT 123 AB"
                      type="text"
                      value={formData.matricule}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="modele">Modèle du véhicule (test)</label>
                    <input
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                      id="modele"
                      name="modele"
                      placeholder="Ex: Toyota Yaris"
                      type="text"
                      value={formData.modele}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="categorie_id">Catégorie du véhicule</label>
                    <select
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                      id="categorie_id"
                      name="categorie_id"
                      value={formData.categorie_id}
                      onChange={handleChange}
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.libelle}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-4 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                <button className="px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" type="button">
                  Fermer
                </button>
                <button className="px-8 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm shadow-primary/20 transition-all flex items-center gap-2" type="submit">
                  <span className="material-symbols-outlined text-sm">save</span>
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
          <div className="mt-6 text-center text-slate-400 dark:text-slate-500 text-xs">
            © 2024 Ongo 237 - Plateforme de Gestion des Transports.
          </div>
        </div>
      </main>
    </MainLayout>
  );
};

export default AddDriver;
