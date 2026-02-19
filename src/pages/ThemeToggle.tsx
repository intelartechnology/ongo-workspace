import React from 'react';

interface ThemeToggleProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme, className = "" }) => {
    return (
        <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors flex items-center justify-center ${className}`}
            aria-label="Toggle Theme"
        >
            <span className="material-symbols-outlined">
                {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
        </button>
    );
};

export default ThemeToggle;
