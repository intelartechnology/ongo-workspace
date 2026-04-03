import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import ApiService from '../../services/ApiService';
import { LOGIN_ACTION } from '../../store/authReducers';

const ContributorLogin: React.FC = () => {
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
                if (user.contributor) {
                    localStorage.setItem('token', user.token);
                    localStorage.setItem('isAuthenticated', JSON.stringify(user));
                    dispatch(LOGIN_ACTION(user));
                    toast.success('Bienvenue dans votre espace contributeur');
                    navigate('/contributor/dashboard');
                } else {
                    toast.error("Vous n'avez aucune contribution enregistrée dans le système.");
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
            {/* Left Pane */}
            <section className="w-full md:w-[60%] bg-white flex flex-col justify-between px-8 py-10 md:px-24 md:py-16">
                <div className="flex items-center">
                    <span className="font-headline text-2xl font-black text-emerald-800 tracking-tight">Ongo 237</span>
                </div>

                <div className="max-w-[400px] w-full mx-auto">
                    <header className="mb-10">
                        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
                            <span className="material-symbols-outlined text-sm">verified</span>
                            Contributor Access
                        </div>
                        <h1 className="font-headline text-4xl font-extrabold text-[#191b22] tracking-tight mb-3">
                            Espace Contributeur
                        </h1>
                        <p className="text-[#434653] text-lg">
                            Suivez vos véhicules, vos chauffeurs et vos revenus en temps réel.
                        </p>
                    </header>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <label className="block font-medium text-sm text-[#434653]" htmlFor="email">
                                Email ou Téléphone
                            </label>
                            <div className="relative group">
                                <input
                                    className="w-full bg-[#f3f3fc] border-none rounded-md px-4 py-3.5 text-[#191b22] focus:ring-2 focus:ring-emerald-600 focus:bg-emerald-50/30 transition-all duration-200 outline-none"
                                    id="email"
                                    name="email"
                                    placeholder="nom@email.com ou +237..."
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block font-medium text-sm text-[#434653]" htmlFor="password">
                                Mot de passe
                            </label>
                            <input
                                className="w-full bg-[#f3f3fc] border-none rounded-md px-4 py-3.5 text-[#191b22] focus:ring-2 focus:ring-emerald-600 focus:bg-emerald-50/30 transition-all duration-200 outline-none"
                                id="password"
                                name="password"
                                placeholder="••••••••"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            className="w-full bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-bold py-4 rounded-full shadow-lg hover:brightness-110 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                    </svg>
                                    Connexion...
                                </span>
                            ) : 'Se connecter'}
                        </button>
                    </form>

                    <div className="mt-10 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-medium">
                        <span className="material-symbols-outlined text-sm align-middle mr-1">info</span>
                        Seuls les utilisateurs ayant au moins un véhicule sous contribution peuvent accéder à cet espace.
                    </div>
                </div>

                <footer className="flex justify-between items-center text-[10px] text-[#737784] font-semibold tracking-wider uppercase">
                    <span>© 2026 ONGO 237</span>
                    
                </footer>
            </section>

            {/* Right Pane */}
            <section className="hidden md:flex md:w-[40%] bg-emerald-800 relative overflow-hidden flex-col justify-center items-center p-12 text-center">
                <div className="absolute inset-0 z-0 opacity-10">
                    <div className="w-full h-full" style={{
                        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)'
                    }}/>
                </div>
                <div className="absolute inset-0 z-10 bg-gradient-to-br from-emerald-800 via-emerald-800/90 to-emerald-600/80"/>

                <div className="relative z-20 max-w-sm space-y-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 mx-auto shadow-2xl">
                        <span className="material-symbols-outlined text-white text-4xl">directions_car</span>
                    </div>
                    <div className="space-y-4">
                        <h2 className="font-headline text-4xl font-extrabold text-white leading-tight tracking-tight">
                            Gérez votre flotte Ongo 237
                        </h2>
                        <p className="text-emerald-100 font-medium text-lg opacity-90 leading-relaxed">
                            Suivez les performances de chaque véhicule, vos revenus et l'activité de vos chauffeurs.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-8">
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10 text-left">
                            <span className="material-symbols-outlined text-white mb-2 block">local_taxi</span>
                            <span className="text-white text-xs font-bold uppercase tracking-wider">Véhicules</span>
                            <p className="text-white/60 text-[10px] leading-tight mt-1">Suivi de chaque voiture en temps réel.</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-xl border border-white/10 text-left">
                            <span className="material-symbols-outlined text-white mb-2 block">payments</span>
                            <span className="text-white text-xs font-bold uppercase tracking-wider">Revenus</span>
                            <p className="text-white/60 text-[10px] leading-tight mt-1">Historique complet de vos gains.</p>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-10 left-10 opacity-10">
                    <span className="font-headline text-8xl font-black text-white select-none">ONGO</span>
                </div>
            </section>
        </main>
    );
};

export default ContributorLogin;
