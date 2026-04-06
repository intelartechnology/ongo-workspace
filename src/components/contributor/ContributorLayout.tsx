import React, { useState } from 'react';
import ContributorSidebar from './ContributorSidebar';

interface ContributorLayoutProps {
    children: React.ReactNode;
    user: any;
    onLogout: () => void;
}

const ContributorLayout: React.FC<ContributorLayoutProps> = ({ children, user, onLogout }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="bg-background text-on-background antialiased flex min-h-screen">
            <ContributorSidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
                onLogout={onLogout} 
            />

            <main className="flex-1 w-full lg:ml-64 min-h-screen relative flex flex-col max-w-[100vw] overflow-x-hidden">
                {/* TopAppBar */}
                <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white/80 backdrop-blur-md z-30 flex justify-between items-center px-4 md:px-8 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center justify-center transition-colors items-center"
                        >
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-900">{user?.nom} {user?.prenom}</p>
                                <p className="text-[10px] text-emerald-600 uppercase tracking-widest font-semibold">Contributor</p>
                            </div>
                            <img
                                alt="User Profile"
                                className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                src={user?.photo || `https://ui-avatars.com/api/?name=${user?.nom}+${user?.prenom}&background=059669&color=fff`}
                            />
                        </div>
                    </div>
                </header>

                <div className="pt-24 px-4 sm:px-8 pb-12 flex-1 w-full box-border">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default ContributorLayout;
