import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from 'react-router-dom';

import "react-toastify/dist/ReactToastify.css"; // Import toastify CSS

import MainLayout from './MainLayout';
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";
import { chargerCategories, estLivraison, type CategorieVehicule } from "../services/categories";
import DriverRequestDetailModal from "../components/DriverRequestDetailModal";
import { SearchBar, Select, Button } from "../components/ui";
import { Avatar } from "../components/ui";
import { notifier } from "../services/notifier";

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

// La date de dépôt dit depuis combien de temps une demande attend ; sans
// elle, rien ne distinguait un dossier de la veille d'un dossier de mars.
const dateDemande = (valeur?: string): string => {
  if (!valeur) return "—";
  const d = new Date(valeur);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
};

const heureDemande = (valeur?: string): string => {
  if (!valeur) return "";
  const d = new Date(valeur);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};

/*
 * La date de la demande, et non celle du compte.
 *
 * La colonne affichait `created_at` de l'utilisateur : un client inscrit en
 * 2023 qui demande à conduire aujourd'hui apparaissait en tête de liste —
 * triée par demande, à juste titre — avec « 2023 », et la liste semblait en
 * désordre. La demande, c'est le véhicule soumis, encore inactif.
 */
const dateDeLaDemande = (item: Utilisateur): string =>
  (item.vehicules.find((v) => v.statut === "INACTIF") ?? item.vehicules[0])?.created_at ?? item.created_at;

export default function DriversRequest({ onLogout, theme, toggleTheme }: DriversRequestProps) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur[]>([]);
  const [categories, setCategories] = useState<CategorieVehicule[]>([]);
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
    chargerCategories().then(setCategories);
  }, []);

  /**
   * Activer le compte d'un chauffeur.
   *
   * L'écriture du document Firestore se faisait **ici**, depuis le
   * navigateur, avant d'appeler l'API. Elle est désormais côté serveur, dans
   * `activateOrdesactivateCab` : une activation par un autre chemin — espace
   * partenaire, script — ne produisait sinon aucun document, et le chauffeur
   * restait invisible sur la carte sans que rien ne le signale.
   *
   * L'écran ne décide donc plus du suivi ; il rapporte ce que le serveur en
   * dit.
   */
  async function writeUserData(data: Vehicule) {
    /*
     * Classer au moment d'activer.
     *
     * La gamme déclarée par le demandeur se corrigeait en ouvrant la fiche du
     * véhicule, puis en revenant : deux changements de page pour un choix qui
     * se fait ici, les documents du dossier sous les yeux. Le classement est
     * donc posé dans le même geste.
     *
     * Reclasser depuis cet écran **verrouille** la gamme, comme partout
     * ailleurs : le partenaire ne pourra plus la changer.
     */
    const actuelle = data.categorie_id;

    const options = categories
      .map((c) => `<option value="${c.id}" ${c.id === actuelle ? "selected" : ""}>${c.libelle}${estLivraison(c) ? " — livraison" : ""}</option>`)
      .join("");

    const saisie = await Swal.fire({
      icon: "question",
      title: "Activer ce chauffeur ?",
      html:
        `<p style="font-size:13px;color:#64748b;text-align:left;margin-bottom:12px">` +
        `Son compte sera migré et son véhicule inscrit au suivi temps réel.</p>` +
        `<p style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;text-align:left">Gamme du véhicule</p>` +
        `<select id="gamme" class="swal2-input" style="margin-top:4px">${options}</select>` +
        `<p style="font-size:12px;color:#94a3b8;text-align:left;margin-top:8px">` +
        `Déclarée : <b>${categories.find((c) => c.id === actuelle)?.libelle ?? "—"}</b>. ` +
        `La modifier ici la verrouille : le partenaire ne pourra plus y revenir.</p>`,
      showCancelButton: true,
      confirmButtonText: "Activer",
      cancelButtonText: "Annuler",
      preConfirm: () => (document.getElementById("gamme") as HTMLSelectElement)?.value,
    });

    if (!saisie.isConfirmed) return;

    const choisie = Number(saisie.value);

    // Le reclassement d'abord : activer un véhicule puis changer sa gamme
    // laisserait le document de suivi annoncer l'ancienne le temps d'un appel.
    if (choisie && choisie !== actuelle) {
      try {
        const { data: r } = await Api.postData(`dashboard/vehicles/${data.id}/reclass`, {
          categorie_id: choisie,
        });

        if (!r.success) {
          handleData("Reclassement refusé", r.message || "La gamme n'a pas pu être changée.", "warning");
          return;
        }

        notify(r.message, "success");
      } catch {
        handleData("Erreur", "Connexion au serveur impossible", "warning");
        return;
      }
    }

    toggleActivate(String(data.id));
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
        // Le serveur dit si le document Firestore a bien été écrit. Sans
        // suivi, le chauffeur existe mais reste invisible sur la carte : le
        // taire ferait passer un demi-succès pour un succès.
        if (data.data?.tracking_enabled === false) {
          handleData(
            "Chauffeur activé",
            "Son véhicule n'a pas pu être inscrit au suivi temps réel. Il n'apparaîtra pas sur la carte.",
            "warning",
          );
        } else {
          notify("Chauffeur activé avec succès", "success");
        }
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
        <header className="px-8 py-4">
          <div className="flex justify-between items-center max-w-7xl mx-auto">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Demandes des Chauffeurs</h2>
            </div>
            <div className="flex items-center gap-4">

              <button
                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 dark:bg-primary-container dark:hover:bg-primary-container/90 transition-colors disabled:opacity-40 flex items-center gap-2"
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
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4">
            <SearchBar
              value={inputValue}
              onChange={setInputValue}
              onSearch={() => getFilter(inputValue, "utilisateur/become_driver-filter", false)}
              placeholder="Rechercher par nom, ID ou téléphone..."
              minWidth={300}
            />
            <div className="flex items-center gap-3">
              <Select defaultValue="">
                <option value="">Toutes les villes</option>
                <option>Yaoundé</option>
                <option>Douala</option>
                <option>Garoua</option>
              </Select>
              <Select defaultValue="">
                <option value="">Catégorie</option>
                <option>ECO</option>
                <option>BUSINESS</option>
                <option>PREMIUM</option>
              </Select>
              <Button icon="tune">Filtres</Button>
              <button className="size-9 flex items-center justify-center rounded-xl bg-primary/10 hover:bg-primary/20 transition-all text-primary">
                <span className="material-symbols-outlined">download</span>
              </button>
            </div>
          </div>
          {/* Data Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
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
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Demande</th>
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
                                <Avatar photo={item.photo} nom={item.nom || item.prenom} className="text-base" />
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
                              {/* La correspondance était écrite en dur, et fausse :
                                  2 est PREMIUM, pas BUSINESS. Tout ce qui
                                  n'était ni 1 ni 2 s'affichait « PREMIUM », y
                                  compris MOTO et FOURGON. */}
                              {categories.find((c) => c.id === item.vehicules[0]?.categorie_id)?.libelle ?? "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">{capitalizeAllLetter(item.vehicules[0]?.ville || "")}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-tight">{dateDemande(dateDeLaDemande(item))}</span>
                              <span className="text-[11px] text-slate-400 leading-tight">{heureDemande(dateDeLaDemande(item))}</span>
                            </div>
                          </td>
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
                              <button
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg transition-colors"
                                title="Notifier"
                                onClick={() => notifier({ destinataires: [{ id: item.id, nom: [item.nom, item.prenom].filter(Boolean).join(" ") }] })}
                              >
                                <span className="material-symbols-outlined text-[20px]">notifications</span>
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
                        <td colSpan={9} className="text-center py-4 text-slate-500">
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
 ? "bg-primary text-white dark:bg-primary-container"
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
