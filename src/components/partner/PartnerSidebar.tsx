import React from 'react';
import { NavLink } from 'react-router-dom';

interface PartnerSidebarProps {
    onLogout: () => void;
}

const PartnerSidebar: React.FC<PartnerSidebarProps> = ({ onLogout }) => {
    const menuItems = [
        { icon: 'dashboard', label: 'Dashboard', path: '/partner/dashboard' },
        { icon: 'school', label: 'Courses', path: '/partner/courses' },
        { icon: 'directions_car', label: 'Vehicles', path: '/partner/vehicles' },

    ];

    return (
        <aside className="h-screen w-64 fixed left-0 top-0 border-r border-slate-200 bg-slate-50 flex flex-col py-8 px-4 z-50">
            <div className="mb-10 px-2">
                <h1 className="text-xl font-bold text-blue-900 tracking-tight">Ongo 237</h1>
                <p className="text-xs font-manrope text-slate-500 font-medium lowercase">Partner Portal</p>
            </div>
            <nav className="flex-1 space-y-1">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.label}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                isActive
                                    ? 'text-blue-700 font-bold border-r-4 border-blue-700 bg-slate-200/50'
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
    );
};

export default PartnerSidebar;
