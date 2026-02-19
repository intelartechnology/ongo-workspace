import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

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

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex w-full transition-colors duration-300">
            <Sidebar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                user={user}
                onLogout={onLogout}
            />

            {/* Main Content */}
            <main className="flex-1 lg:ml-72 flex flex-col min-h-screen transition-colors duration-300 min-w-0">
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
