import React from 'react';
import { useLocation, Link } from 'react-router-dom';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    user: any;
    onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, user, onLogout }) => {
    const location = useLocation();

    const menuGroups = [
        {
            title: 'Pilotage',
            items: [
           /*      { icon: 'bar_chart', label: 'Statistiques', path: '/stats' },
                { icon: 'visibility', label: 'Aperçu', path: '/overview' },
                { icon: 'map', label: 'Map', path: '/map' },
                { icon: 'navigation', label: 'Race Position', path: '/race-position' }, */
            ]
        },
        {
            title: 'Utilisateurs',
            items: [
                { icon: 'group', label: 'Utilisateurs', path: '/users' },
             /*    { icon: 'admin_panel_settings', label: 'Administrateurs', path: '/admins' },
                { icon: 'business_center', label: 'Commerciaux', path: '/sales' },
                { icon: 'handshake', label: 'Partenaires', path: '/partners' }, */
            ]
        },
        {
            title: 'Exploitation',
            items: [
                { icon: 'directions_car', label: 'Courses', path: '/courses' },
              /*   { icon: 'event_available', label: 'Réservation', path: '/reservations' },
                { icon: 'location_on', label: 'Location', path: '/rentals' }, */
            ]
        },
        {
            title: 'Flotte',
            items: [
                { icon: 'car_rental', label: 'Véhicules', path: '/vehicles' },
                { icon: 'person_outline', label: 'Chauffeurs', path: '/drivers' },
                { icon: 'person_search', label: 'Demandes', path: '/requests' },
             /*    { icon: 'category', label: 'Modèles', path: '/models' }, */
            ]
        }/* ,
        {
            title: 'Support & Litiges',
            items: [
                { icon: 'warning', label: 'Litiges', path: '/disputes' },
                { icon: 'help', label: 'Raisons', path: '/reasons' },
            ]
        } */
    ];

    return (
        <>
            {/* Sidebar Overlay (Mobile only) */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 lg:hidden transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Navigation */}
            <aside className={`
                w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 
                flex flex-col fixed h-full z-[60] transition-all duration-300
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-6 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Ongo 237" className="h-10 w-auto object-contain" />
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">Ongo 237</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-semibold">Super Admin</p>
                        </div>
                    </div>
                    {/* Close Sidebar (Mobile only) */}
                    <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* Primary Dashboard Link */}
                    <div className="space-y-1">
                        <Link
                            to="/dashboard"
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group font-medium ${location.pathname === '/dashboard'
                                ? 'bg-primary text-white shadow-sm shadow-primary/20'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[20px]">grid_view</span>
                            <span className="text-sm">Tableau de bord</span>
                        </Link>
                    </div>

                    {menuGroups.map((group) => (
                        <div key={group.title} className="space-y-1">
                            <h3 className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                                {group.title}
                            </h3>
                            {group.items.map((item) => (
                                <Link
                                    key={item.label}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group font-medium ${location.pathname === item.path
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary'
                                        }`}
                                >
                                    <span className={`material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform ${location.pathname === item.path ? 'fill-1' : ''}`}
                                        style={{ fontVariationSettings: location.pathname === item.path ? "'FILL' 1" : "'FILL' 0" }}
                                    >
                                        {item.icon}
                                    </span>
                                    <span className="text-sm">{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    ))}
                </nav>
                <div className="p-3 md:p-4 border-t border-slate-200 dark:border-slate-800 transition-colors duration-300">
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 transition-colors duration-300">
                        <div className="size-10 rounded-full bg-slate-300 overflow-hidden bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC14Liz0AzEVQJFmePmumr1iV43lKqVH_zoyWDOBXbt0uLg-4l3hcE621Zbt9QuqPsEq-kjHY2GW8u_i5BvxQkTot9e3vEY9rG_4VwFn7SxUFqK6FvPQ1NXT1-9OK5J5sWU2lN5Ky_hD6XpV4RxxThvO14bztidPZzljEAc474Op3GqF0CZ-Xq9-3QVzY8AHV7eaSYgAGupYIrFzdJtOruYcJkpXFx2x8cotjQ28k2C7xR0Pm4_yclHCMOS8zTXtgswze_ijD622pc')" }}></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                {user ? `${user.nom} ${user.prenom || ''}` : 'Ongo Admin'}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                                {user ? user.email : 'admin@ongo237.com'}
                            </p>
                        </div>
                        <button onClick={onLogout} className="text-slate-400 hover:text-slate-600">
                            <span className="material-symbols-outlined text-xl">logout</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
