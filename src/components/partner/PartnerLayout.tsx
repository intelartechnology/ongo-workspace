import React, { useState } from 'react';
import PartnerSidebar from './PartnerSidebar';

interface PartnerLayoutProps {
    children: React.ReactNode;
    user: any;
    onLogout: () => void;
}

const PartnerLayout: React.FC<PartnerLayoutProps> = ({ children, user, onLogout }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="bg-background text-on-background antialiased flex min-h-screen">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <PartnerSidebar 
                onLogout={onLogout} 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
            />
            
            <main className="flex-1 lg:ml-64 min-h-screen relative flex flex-col w-full max-w-[100vw]">
                {/* TopAppBar Component */}
                <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white/80 backdrop-blur-md z-30 flex justify-between items-center px-4 md:px-8 shadow-sm">
                    <div className="flex items-center gap-4 lg:hidden">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                    </div>
                    <div className="hidden lg:flex items-center gap-8">
                    </div>
                    <div className="flex items-center gap-4 ml-auto">
                        <div className="flex items-center gap-2 sm:gap-3 pl-0 sm:pl-4 sm:border-l sm:border-slate-200">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-bold text-slate-900">{user?.nom} {user?.prenom}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Partner</p>
                            </div>
                            <img
                                alt="User Profile"
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-slate-200"
                                src={user?.photo || "https://lh3.googleusercontent.com/aida-public/AB6AXuD9Q87a4rq7V1eB3PgSbbmKJg71cC8pXY1NR4Iy89R7xL_ZpZDz1q02srnFrYf8053J_6xmgDwvxzmkADkn5nLme4OG-rRG55J4uVDI31TABpLQ7L9w63KddQkmrwVbzJHPx54UmgtSEqzzjC50kpMOhEEFGux3i4MrA8t9KBYIA81ZNL5jVdpC3Jl916Ak7mMHnJluR0Yz-DXIvys0lFGRlD6Rhx1-aaQJjD8_gTrDRIwHWyWvCmGH46iIXpVFQ6iDVzlvb46wjGc"}
                            />
                        </div>
                    </div>
                </header>

                <div className="pt-20 px-4 sm:px-8 pb-12 flex-1 w-full box-border">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default PartnerLayout;
