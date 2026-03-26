import React from 'react';
import PartnerSidebar from './PartnerSidebar';

interface PartnerLayoutProps {
    children: React.ReactNode;
    user: any;
    onLogout: () => void;
}

const PartnerLayout: React.FC<PartnerLayoutProps> = ({ children, user, onLogout }) => {
    return (
        <div className="bg-background text-on-background antialiased flex min-h-screen">
            <PartnerSidebar onLogout={onLogout} />
            
            <main className="flex-1 ml-64 min-h-screen relative">
                {/* TopAppBar Component */}
                <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 bg-white/80 backdrop-blur-md z-40 flex justify-between items-center px-8 shadow-sm">
                    <div className="flex items-center gap-8">
                    
                      
                    </div>
                    <div className="flex items-center gap-4">
                      
                        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-900">{user?.nom} {user?.prenom}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Partner</p>
                            </div>
                            <img
                                alt="User Profile"
                                className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                src={user?.photo || "https://lh3.googleusercontent.com/aida-public/AB6AXuD9Q87a4rq7V1eB3PgSbbmKJg71cC8pXY1NR4Iy89R7xL_ZpZDz1q02srnFrYf8053J_6xmgDwvxzmkADkn5nLme4OG-rRG55J4uVDI31TABpLQ7L9w63KddQkmrwVbzJHPx54UmgtSEqzzjC50kpMOhEEFGux3i4MrA8t9KBYIA81ZNL5jVdpC3Jl916Ak7mMHnJluR0Yz-DXIvys0lFGRlD6Rhx1-aaQJjD8_gTrDRIwHWyWvCmGH46iIXpVFQ6iDVzlvb46wjGc"}
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

export default PartnerLayout;
