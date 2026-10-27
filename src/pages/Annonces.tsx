import MainLayout from "./MainLayout";
import AnnoncesOngo from "./components/AnnoncesOngo";

interface Props {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

/** Les annonces de l'application, entrée à part du menu (table `annonce_ongo`). */
export default function Annonces({ onLogout, theme, toggleTheme }: Props) {
    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="px-8 py-6 max-w-7xl mx-auto">
                <AnnoncesOngo />
            </div>
        </MainLayout>
    );
}
