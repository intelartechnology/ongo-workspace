import React from 'react';

interface HeaderProps {
    onToggleSidebar: () => void;
    onToggleTheme: () => void;
    theme: 'light' | 'dark';
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onToggleTheme, theme }) => {
    return (
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40 transition-colors duration-300">
            <div className="flex items-center gap-2 md:gap-4 flex-1">
                {/* Mobile Menu Toggle */}
                <button onClick={onToggleSidebar} className="lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                    <span className="material-symbols-outlined">menu</span>
                </button>
                <h2 className="text-base md:text-xl font-bold text-slate-900 dark:text-white truncate">Tableau de bord</h2>
                <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
                <div className="hidden lg:flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <span className="material-symbols-outlined text-lg">calendar_today</span>
                    <span className="whitespace-nowrap">12 Octobre 2023</span>
                </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
                <div className="hidden sm:relative sm:block group">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input className="pl-10 pr-4 py-1.5 md:py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary w-32 md:w-48 lg:w-64 transition-all" placeholder="Rechercher..." type="text" />
                </div>

                {/* Theme Toggle Button */}
                <button
                    onClick={onToggleTheme}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-300 flex items-center justify-center"
                    title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                >
                    <span className="material-symbols-outlined">
                        {theme === 'light' ? 'dark_mode' : 'light_mode'}
                    </span>
                </button>

                <button className="relative p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">notifications</span>
                    <span className="absolute top-2 right-2.5 size-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                </button>
            </div>
        </header>
    );
};

export default Header;
