import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { useHylana } from './assistant/HylanaContext';
import { useMenuReduit, useSurvolMenu } from './components/menuReduit';

interface MainLayoutProps {
    children: React.ReactNode;
    onLogout: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, onLogout, theme, toggleTheme }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [user, setUser] = useState<any>(null);

    const loadUser = () => {
        const userData = localStorage.getItem('isAuthenticated');
        if (userData) {
            try {
                setUser(JSON.parse(userData));
            } catch (error) {
                console.error("Error parsing user data:", error);
            }
        }
    };

    useEffect(() => {
        loadUser();
    }, []);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    // Hylana en grand réduit le menu à sa colonne d'icônes ; à côté, elle
    // occupe 412 px à droite et la page se resserre pour rester lisible.
    const hylana = useHylana();
    const menuReduit = useMenuReduit();
    const survolMenu = useSurvolMenu();
    // Déplié au survol, le menu reprend sa place et pousse la page.
    const reduit = (menuReduit || Boolean(hylana?.ouverte && hylana.mode === 'grand')) && !survolMenu;
    const aCote = Boolean(hylana?.ouverte && hylana.mode === 'cote');

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex w-full transition-colors duration-300">
            <Sidebar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                user={user}
                onLogout={onLogout}
            />

            {/* Main Content */}
            <main className={`flex-1 ${reduit ? 'lg:ml-20' : 'lg:ml-[272px]'} ${aCote ? 'lg:pr-[412px]' : ''} flex flex-col min-h-screen transition-[margin,padding] duration-300 min-w-0`}>
                <Header
                    onToggleSidebar={toggleSidebar}
                    onToggleTheme={toggleTheme}
                    theme={theme}
                />

                {/* Content Area */}
                <div className="w-full">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
