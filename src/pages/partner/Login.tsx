import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import ApiService from '../../services/ApiService';
import { LOGIN_ACTION } from '../../store/authReducers';

const PartnerLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const api = new ApiService();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.postData('utilisateur/loginDash', {
                telephone: email,
                password: password,
            });

            if (response.data.success) {
                const user = response.data.data;
                console.log(response.data.data)
                console.log(user)
                if (user.is_partner) {
                    localStorage.setItem('token', user.token);
                    localStorage.setItem('isAuthenticated', JSON.stringify(user));
                    dispatch(LOGIN_ACTION(user));
                    toast.success('Bienvenue dans votre espace partenaire');
                    navigate('/partner/dashboard');
                } else {
                    toast.error("Vous n'êtes pas autorisé à accéder à cet espace.");
                }
            } else {
                toast.error(response.data.message || 'Erreur de connexion');
            }
        } catch (error) {
            console.error('Login error:', error);
            toast.error('Une erreur est survenue lors de la connexion');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen bg-surface font-body">
            {/* Left Pane: The Action Area */}
            <section className="w-full md:w-[60%] bg-white flex flex-col justify-between px-8 py-10 md:px-24 md:py-16">
                {/* Brand Anchor */}
                <div className="flex items-center">
                    <span className="font-headline text-2xl font-black text-[#00327d] tracking-tight">Ongo 237</span>
                </div>

                {/* Login Form Container */}
                <div className="max-w-[400px] w-full mx-auto">
                    <header className="mb-10">
                        <h1 className="font-headline text-4xl font-extrabold text-[#191b22] tracking-tight mb-3">Accès Partenaire</h1>
                        <p className="text-[#434653] text-lg">Gérez votre activité et vos performances en un seul endroit.</p>
                    </header>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <label className="block font-medium text-sm text-[#434653]" htmlFor="email">Email professionnel ou Téléphone</label>
                            <div className="relative group">
                                <input
                                    className="w-full bg-[#f3f3fc] border-none rounded-md px-4 py-3.5 text-[#191b22] focus:ring-2 focus:ring-[#00327d] focus:bg-[#e2e2eb] transition-all duration-200 outline-none"
                                    id="email"
                                    name="email"
                                    placeholder="nom@entreprise.com"
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="block font-medium text-sm text-[#434653]" htmlFor="password">Mot de passe</label>
                                <a className="text-xs font-semibold text-[#651f00] hover:underline" href="#">Mot de passe oublié ?</a>
                            </div>
                            <div className="relative group">
                                <input
                                    className="w-full bg-[#f3f3fc] border-none rounded-md px-4 py-3.5 text-[#191b22] focus:ring-2 focus:ring-[#00327d] focus:bg-[#e2e2eb] transition-all duration-200 outline-none"
                                    id="password"
                                    name="password"
                                    placeholder="••••••••"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center">
                            <input className="w-4 h-4 text-[#00327d] bg-[#f3f3fc] border-none rounded focus:ring-[#00327d]" id="remember" type="checkbox" />
                            <label className="ml-2 text-sm text-[#434653] font-medium" htmlFor="remember">Se souvenir de moi</label>
                        </div>

                        <button
                            className="w-full bg-gradient-to-r from-[#00327d] to-[#0047ab] text-white font-bold py-4 rounded-full shadow-lg hover:brightness-110 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? 'Connexion...' : 'Connexion'}
                        </button>
                    </form>

                    <div className="mt-12 flex items-center justify-center space-x-4">
                        <span className="h-px bg-[#c3c6d5] opacity-20 flex-grow"></span>
                        <span className="text-xs font-bold text-[#737784] uppercase tracking-widest">Aide & Support</span>
                        <span className="h-px bg-[#c3c6d5] opacity-20 flex-grow"></span>
                    </div>

                  
                </div>

                {/* Footer micro-copy */}
                <footer className="flex justify-between items-center text-[10px] text-[#737784] font-semibold tracking-wider uppercase">
                    <span>© 2024 ONGO 237</span>
                    <div className="flex space-x-4">
                    </div>
                </footer>
            </section>

            {/* Right Pane: The Brand Anchor (Signature Blue Area) */}
            <section className="hidden md:flex md:w-[40%] bg-[#00327d] relative overflow-hidden flex-col justify-center items-center p-12 text-center">
                {/* Abstract Background Element */}
                <div className="absolute inset-0 z-0 opacity-40">
                    <img
                        className="w-full h-full object-cover mix-blend-overlay"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQ1V8pKNpZo9LafUS6wFhA3s2bYCTdehWewv6EmTAisupAACpA9YBDBCtkZdjIohMiBDRU45pETQcrGwu1XQjOgYnWeIZmr1hLUNKCrtKXESNiK_FemXXqvjRPqHJWgFGbaO0_Iq-xRpUa7DS24kGB6eFli4K1jn6xt0qZjmRQ5w31cBkpto6ZiHB8H3i3cQodcJBkYqzY__owpIL9JybUO1d7ptao-1Tcku8BbtTPoKlLYJ7JpRhD3TFMWAVccMMOEo_77No9ZjE"
                    />
                </div>
                {/* Gradient Overlay for Depth */}
                <div className="absolute inset-0 z-10 bg-gradient-to-br from-[#00327d] via-[#00327d]/80 to-[#0047ab]/90"></div>
                
                {/* Content Anchor */}
                <div className="relative z-20 max-w-sm space-y-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 mx-auto shadow-2xl">
                        <span className="material-symbols-outlined text-white text-4xl">handshake</span>
                    </div>
                    <div className="space-y-4">
                        <h2 className="font-headline text-4xl font-extrabold text-white leading-tight tracking-tight">
                            Propulsez votre activité avec Ongo 237
                        </h2>
                        <p className="text-blue-100 font-medium text-lg opacity-90 leading-relaxed">
                            Accédez à des outils analytiques de pointe et connectez-vous avec un écosystème de croissance exponentielle.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-8">
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/5 text-left">
                            <span className="material-symbols-outlined text-white mb-2 block">insights</span>
                            <span className="text-white text-xs font-bold uppercase tracking-wider">Analyses</span>
                            <p className="text-white/60 text-[10px] leading-tight mt-1">Données en temps réel sur vos ventes.</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/5 text-left">
                            <span className="material-symbols-outlined text-white mb-2 block">rocket_launch</span>
                            <span className="text-white text-xs font-bold uppercase tracking-wider">Croissance</span>
                            <p className="text-white/60 text-[10px] leading-tight mt-1">Outils d'optimisation de visibilité.</p>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-10 left-10 opacity-20">
                    <span className="font-headline text-8xl font-black text-white/10 select-none">ONGO</span>
                </div>
            </section>
        </main>
    );
};

export default PartnerLogin;
