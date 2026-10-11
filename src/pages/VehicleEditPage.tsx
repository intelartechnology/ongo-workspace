import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "./MainLayout";
import VehicleEditModal from "./components/VehicleEditModal";

interface VehicleEditPageProps {
    onLogout?: () => void;
    theme?: "light" | "dark";
    toggleTheme?: () => void;
}

/**
 * L'édition d'un véhicule atteinte par son URL.
 *
 * L'écran vit désormais dans [VehicleEditModal], ouvert depuis la liste : on
 * ne perd plus la pagination et les filtres pour changer une couleur.
 *
 * Cette page reste pour les liens déjà distribués — `/vehicles/edit/:id` et
 * `/vehicle-edit/:id`. Elle n'est qu'une enveloppe : dupliquer le formulaire
 * aurait garanti que les deux divergent à la première correction.
 *
 * Au passage, elle fonctionne enfin en accès direct. L'ancienne version lisait
 * le véhicule dans `sessionStorage` et affichait « Données introuvables » dès
 * qu'on ouvrait l'URL sans passer par la liste — en parlant d'un véhicule qui
 * existait.
 */
export default function VehicleEditPage({
    onLogout = () => { },
    theme = "light",
    toggleTheme = () => { },
}: VehicleEditPageProps) {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <VehicleEditModal
                vehicleId={id ?? null}
                onClose={() => navigate("/vehicles")}
            />
        </MainLayout>
    );
}
