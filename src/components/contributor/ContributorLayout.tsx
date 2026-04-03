import React from 'react';
import ContributorSidebar from './ContributorSidebar';

interface ContributorLayoutProps {
    children: React.ReactNode;
    user: any;
    onLogout: () => void;
}

const ContributorLayout: React.FC<ContributorLayoutProps> = ({ children, user, onLogout }) => {
    return (
        <div className="bg-background text-on-background antialiased flex min-h-screen">
            <ContributorSidebar onLogout={onLogout} />

            <main className="flex-1 ml-64 min-h-screen relative">
                {/* TopAppBar */}
                <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 bg-white/80 backdrop-blur-md z-40 flex justify-between items-center px-8 shadow-sm">
                    <div className="flex items-center gap-8"></div>
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

                <div className="pt-24 px-8 pb-12">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default ContributorLayout;
