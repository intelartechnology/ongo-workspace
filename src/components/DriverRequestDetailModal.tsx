import React from 'react';

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

interface DriverRequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: Utilisateur | null;
}

const DriverRequestDetailModal: React.FC<DriverRequestDetailModalProps> = ({ isOpen, onClose, driver }) => {
  if (!isOpen || !driver) return null;

  const vehicle = driver.vehicules[0]; // Assuming one vehicle per driver for simplicity

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative p-8 border w-full max-w-2xl md:max-w-3xl shadow-lg rounded-md bg-white dark:bg-slate-800">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Détails de la Demande Chauffeur</h3>
        <button
          className="absolute top-4 right-4 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          onClick={onClose}
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Informations du Chauffeur</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>ID:</strong> {driver.id}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Nom:</strong> {driver.nom} {driver.prenom}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Téléphone:</strong> {driver.telephone}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Email:</strong> {driver.email || 'N/A'}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Note:</strong> {driver.note}</p>
            <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Membre depuis:</strong> {new Date(driver.created_at).toLocaleDateString()}</p>
          </div>

          {vehicle && (
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Informations du Véhicule</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300"><strong>ID Véhicule:</strong> {vehicle.id}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Modèle:</strong> {vehicle.modele}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Matricule:</strong> {vehicle.matricule}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Ville:</strong> {vehicle.ville}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Couleur:</strong> {vehicle.color}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Statut:</strong> {vehicle.statut}</p>
              {vehicle.categorie && (
                <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Catégorie:</strong> {vehicle.categorie.libelle}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverRequestDetailModal;
