import React from 'react';
import { NavLink } from 'react-router-dom';

interface ContributorSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onLogout: () => void;
}

const ContributorSidebar: React.FC<ContributorSidebarProps> = ({ isOpen, onClose, onLogout }) => {
    const menuItems = [
        { icon: 'dashboard', label: 'Dashboard', path: '/contributor/dashboard' },
        { icon: 'directions_car', label: 'Mes Véhicules', path: '/contributor/vehicles' },
        { icon: 'receipt_long', label: 'Courses', path: '/contributor/rides' }
    ];

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
                    onClick={onClose}
                />
            )}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-slate-50 border-r border-slate-200 flex flex-col py-8 px-4 transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="mb-10 px-2 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-emerald-800 tracking-tight">Ongo 237</h1>
                        <p className="text-xs font-manrope text-slate-500 font-medium lowercase">Contributor Portal</p>
                    </div>
                    <button onClick={onClose} className="lg:hidden p-2 text-slate-500 hover:bg-slate-200 rounded-lg">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <nav className="flex-1 space-y-1">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.label}
                            to={item.path}
                            onClick={onClose}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                    isActive
                                        ? 'text-emerald-700 font-bold border-r-4 border-emerald-700 bg-emerald-50'
                                        : 'text-slate-500 hover:bg-slate-200/50'
                                }`
                            }
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            <span className="font-manrope text-sm tracking-tight">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
                <div className="mt-auto space-y-1 pt-6 border-t border-slate-200/50">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:bg-slate-200/50 transition-colors"
                    >
                        <span className="material-symbols-outlined">logout</span>
                        <span className="font-manrope text-sm tracking-tight">Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default ContributorSidebar;

