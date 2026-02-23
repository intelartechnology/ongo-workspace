import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from 'react-router-dom';

import "react-toastify/dist/ReactToastify.css"; // Import toastify CSS

import { GeoPoint, doc, setDoc } from "firebase/firestore/lite";
import { db } from "../services/firebase.js";
import MainLayout from './MainLayout';
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";
import DriverRequestDetailModal from "../components/DriverRequestDetailModal";

// Define interfaces for type safety
interface Vehicule {
  id: number;
  uuid: string;
  matricule: string;
  carte: string | null;
  modele: string;
  image: string | null;
  lat: number | null;
  lng: number | null;
  lat_1000_floor: number | null;
  ville: string;
  position: string | null;
  categorie_id: number;
  chauffeur_id: number;
  statut: string;
  note: number;
  created_at: string;
  updated_at: string;
  is_online: number;
  color: string;
  is_favorite: number;
  categorie: {
    id: number;
    libelle: string;
    image: string;
    description: string;
    sub_description: string;
    base_price: number;
    km_price: number;
    created_at: string;
    updated_at: string;
  };
}

interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  email: string | null;
  photo: string | null;
  note: number;
  role_id: number;
  created_at: string;
  updated_at: string;
  balance: number;
  cashBalance: number;
  casDeposit: number;
  is_agence: boolean;
  vehicules: Vehicule[];
}

interface PaginationLink {
  url: string | null;
  label: string;
  active: boolean;
}

interface DriversRequestProps {
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export default function DriversRequest({ onLogout, theme, toggleTheme }: DriversRequestProps) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur[]>([]);
  const [load, setLoad] = useState<boolean>(true);
  const [pagination, setPaginate] = useState<PaginationLink[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [searchValue, setSearchValue] = useState<Utilisateur[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedDriver, setSelectedDriver] = useState<Utilisateur | null>(null);

  const Api = new ApiService();
  const navigate = useNavigate();

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

  const getAllUtilisateur = async (url: string, isPag: boolean) => {
    setLoad(true);
    try {
      const { data } = await Api.getDatawithPagination(url, isPag);
      if (data.success) {
        setUtilisateur(data.data.data);
        setSearchValue(data.data.data);
        setPaginate(data.data.links);
        setLoad(false);
      } else {
        handleData("Erreur", data.message, "warning");
      }
    } catch (err) {
      handleData("Connexion au serveur impossible ", String(err), "warning");
    }
  };

  useEffect(() => {
    getAllUtilisateur("utilisateur/become_driver-request", false);
  }, []);

  async function writeUserData(data: Vehicule) {
    if (
      window.confirm(
        "Êtes-vous certain(e) de vouloir procéder à la migration de ce compte en l'activant ?"
      )
    ) {
      const myGeoPoint = new GeoPoint(data.lat || 0, data.lng || 0); // Default to 0 if null

      const docRef = doc(db, "vehicules", String(data.id));
      try {
        await setDoc(docRef, {
          categorie_id: data.categorie_id,
          chauffeur_id: data.chauffeur_id,
          is_booked: false,
          is_online: false,
          lat: null,
          lng: null,
          matricule: data.matricule,
          vehicule_id: data.id,
          location: myGeoPoint,
        });
        if (docRef.id === null) {
          notify("Une erreur c'est produite", "error");
        } else {
          toggleActivate(String(data.id));
        }
      } catch (e) {
        console.error("Error adding document: ", e);
        notify("Une erreur c'est produite lors de l'ajout du document", "error");
      }
    }
  }

  const getFilter = async (val: string, url: string, isPag: boolean) => {
    setLoad(true);
    if (val === "") {
      getAllUtilisateur("utilisateur/become_driver-request", false);
      return;
    }
    if (url === "") {
      getAllUtilisateur("utilisateur/become_driver-request", false);
      return;
    }

    try {
      const { data } = await Api.getDatawithPagination(url + "/" + val, isPag);
      if (data.success) {
        setUtilisateur(data.data.data);
        setSearchValue(data.data.data);
        setPaginate(data.data.links);
        setLoad(false);
      } else {
        handleData("Erreur", data.message, "warning");
      }
    } catch (err) {
      handleData("Connexion au serveur impossible", String(err), "warning");
    }
  };

  const toggleActivate = async (id: string) => {
    var formData = {
      vehicule_id: id,
    };
    try {
      const { data } = await Api.postData("v2/vehicule/activate-or-desactivate-cab", formData);
      if (data.success) {
        notify("Chauffeur activer avec succès", "success");
        getAllUtilisateur("utilisateur/become_driver-request", false);
      } else {
        handleData("Erreur", data.message, "warning");
      }
    } catch (err) {
      handleData("Connexion au serveur impossible ", String(err), "warning");
    }
  };

  const capitalizeAllLetter = (str: string) => {
    if (!str) return "";
    return str.toUpperCase();
  };



  return (
    <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
      <ToastContainer />
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark">
        {/* Header */}
        <header className="bg-white/80 dark:bg-[#1a110c]/80 backdrop-blur-md sticky top-0 z-10 px-8 py-4 border-bottom border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center max-w-7xl mx-auto">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
                <span>Gestion</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-primary">Demandes des Chauffeurs</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight">Demandes des Chauffeurs</h2>
            </div>
            <div className="flex items-center gap-4">

              <button
                className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-[#137fec]/20"
                onClick={() => navigate('/add-driver')}
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>Nouveau Chauffeur</span>
              </button>
            </div>
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto space-y-6">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[300px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                placeholder="Rechercher par nom, ID ou téléphone..."
                type="text"
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    getFilter(inputValue, "utilisateur/become_driver-filter", false);
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-3">
              <select className="pl-4 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary transition-all appearance-none cursor-pointer">
                <option>Toutes les villes</option>
                <option>Yaoundé</option>
                <option>Douala</option>
                <option>Garoua</option>
              </select>
              <select className="pl-4 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary transition-all appearance-none cursor-pointer">
                <option>Catégorie</option>
                <option>ECO</option>
                <option>BUSINESS</option>
                <option>PREMIUM</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                <span className="material-symbols-outlined text-[20px]">tune</span>
                <span>Filtres</span>
              </button>
              <button className="size-9 flex items-center justify-center rounded-xl bg-primary/10 hover:bg-primary/20 transition-all text-[#137fec]">
                <span className="material-symbols-outlined">download</span>
              </button>
            </div>
          </div>
          {/* Data Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              {load ? (
                <Loading />
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-slate-800">
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Chauffeur</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Téléphone</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Véhicule</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Catégorie</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ville</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {utilisateur.length > 0 ? (
                      utilisateur.map((item: Utilisateur) => (
                        <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold text-slate-400">#{item.id}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                <img className="w-full h-full object-cover" data-alt={`Portrait of ${item.nom} ${item.prenom}`} src="https://via.placeholder.com/40" /> {/* Placeholder image */}
                              </div>
                              <span className="text-sm font-bold">{item.nom} {item.prenom}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium">{item.telephone}</td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-bold">{item.vehicules[0]?.modele}</p>
                              <p className="text-[10px] text-slate-500 uppercase">{item.vehicules[0]?.matricule}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-black uppercase">
                              {item.vehicules[0]?.categorie_id === 1 ? "ECO" : item.vehicules[0]?.categorie_id === 2 ? "BUSINESS" : "PREMIUM"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">{capitalizeAllLetter(item.vehicules[0]?.ville || "")}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-500 text-[11px] font-bold">
                              <span className="size-1.5 rounded-full bg-blue-500"></span> En attente
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors group-hover:scale-110"
                                title="Détails"
                                onClick={() => {
                                  setSelectedDriver(item);
                                  setIsModalOpen(true);
                                }}
                              >
                                <span className="material-symbols-outlined text-[20px]">visibility</span>
                              </button>
                              <button
                                className="p-2 hover:bg-green-100 dark:hover:bg-green-500/20 text-green-600 rounded-lg transition-colors"
                                title="Accepter"
                                onClick={() => writeUserData(item.vehicules[0])}
                              >
                                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                              </button>
                             {/*  <button className="p-2 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 rounded-lg transition-colors" title="Refuser">
                                 <span className="material-symbols-outlined text-[20px]">cancel</span>
                               </button> */}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="text-center py-4 text-slate-500">
                          Aucune demande de chauffeur trouvée.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
            {/* Pagination */}
            {pagination.length > 0 && (
              <div className="px-6 py-4 bg-slate-50 dark:bg-white/5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Affichage de <span className="font-bold text-slate-900 dark:text-white">1-{utilisateur.length}</span> sur <span className="font-bold text-slate-900 dark:text-white">{searchValue.length}</span> demandes
                </p>
                <div className="flex items-center gap-2">
                  {pagination.map((link, index) => (
                    <button
                      key={index}
                      className={`size-8 flex items-center justify-center rounded-lg border ${
                        link.active
                          ? "bg-primary text-white"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 hover:border-primary"
                      } ${!link.url ? "opacity-50 cursor-not-allowed" : ""}`}
                      disabled={!link.url}
                      onClick={() => link.url && getAllUtilisateur(link.url, true)}
                    >
                      {link.label.includes("Previous") ? (
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                      ) : link.label.includes("Next") ? (
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      ) : (
                        link.label
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
      <DriverRequestDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        driver={selectedDriver}
      />
    </MainLayout>
  );
}
