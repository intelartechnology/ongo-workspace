import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import ApiService from '../services/ApiService';
import { LOGIN_ACTION, INIT_ACTION } from '../store/authReducers';

interface LoginProps {
    onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const Api = new ApiService();

    const notify = (title: string, type: 'success' | 'error') => {
        if (type === 'success') {
            toast.success(`🦄 ${title}`);
        } else {
            toast.error(`🦄 ${title}`);
        }
    };

    const formik = useFormik({
        initialValues: {
            tel: '',
            password: '',
        },
        validationSchema: Yup.object({
            tel: Yup.string().required("L'email ou téléphone est obligatoire"),
            password: Yup.string()
                .min(6, "Le mot de passe doit contenir au moins 6 caractères")
                .required("Le mot de passe est obligatoire"),
        }),
        onSubmit: async (values) => {
            try {
                setLoading(true);
                const formData = {
                    telephone: values.tel,
                    password: values.password,
                    isAdmin: true,
                };

                const response = await Api.postData('utilisateur/loginDash', formData);

                if (response.data.success) {
                    const userData = response.data.data;

                    localStorage.setItem('isAuthenticated', JSON.stringify(userData));
                    localStorage.setItem('token', userData.token);

                    dispatch(LOGIN_ACTION(userData));
                    onLogin();

                    setLoading(false);
                    notify("Utilisateur connecté avec succès", "success");
                    navigate('/dashboard');
                } else {
                    setLoading(false);
                    notify(response.data.message || "Erreur lors de la connexion", "error");
                }
            } catch (error: any) {
           
                setLoading(false);
                const errorMsg = error.response?.data?.message || "Erreur lors de la connexion";
                notify(errorMsg, "error");
            }
        },
    });

    useEffect(() => {
        const userdata = localStorage.getItem("isAuthenticated");
        if (userdata) {
            dispatch(LOGIN_ACTION(JSON.parse(userdata)));
        } else {
            dispatch(INIT_ACTION());
        }
    }, [dispatch]);

    return (
        <div className="flex min-h-screen w-full">
            {/* Left Side: Login Form */}
            <div className="flex flex-1 flex-col justify-center px-6 py-12 md:px-12 lg:px-24 xl:px-32 bg-white dark:bg-background-dark transition-colors duration-300">
                <div className="mx-auto w-full max-w-sm lg:max-w-md">
                    {/* Logo & Heading */}
                    <div className="flex items-center gap-2 mb-8 lg:mb-10">
                        <img src="/logo.png" alt="Ongo 237" className="h-10 w-auto object-contain" />
                        <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Ongo 237</span>
                    </div>
                    <div className="mb-6 lg:mb-8">
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-2">Welcome back to Ongo 237</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base">Please enter your details to access your account.</p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={formik.handleSubmit} className="space-y-5 lg:space-y-6">
                        <div>
                            <label className="block text-sm font-semibold leading-6 text-gray-900 dark:text-white mb-2" htmlFor="tel">Email or Phone</label>
                            <input
                                id="tel"
                                name="tel"
                                type="text"
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                value={formik.values.tel}
                                className={`block w-full rounded-lg border-0 py-2.5 md:py-3 text-gray-900 shadow-sm ring-1 ring-inset ${formik.touched.tel && formik.errors.tel ? 'ring-red-500' : 'ring-gray-300'} placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-gray-800 dark:text-white dark:ring-gray-700 sm:text-sm sm:leading-6 transition-all`}
                                placeholder="Enter your email or phone"
                            />
                            {formik.touched.tel && formik.errors.tel && (
                                <p className="mt-1 text-xs text-red-500 font-medium">{formik.errors.tel}</p>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-semibold leading-6 text-gray-900 dark:text-white" htmlFor="password">Password</label>
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                onChange={formik.handleChange}
                                onBlur={formik.handleBlur}
                                value={formik.values.password}
                                className={`block w-full rounded-lg border-0 py-2.5 md:py-3 text-gray-900 shadow-sm ring-1 ring-inset ${formik.touched.password && formik.errors.password ? 'ring-red-500' : 'ring-gray-300'} placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-gray-800 dark:text-white dark:ring-gray-700 sm:text-sm sm:leading-6 transition-all`}
                                placeholder="Enter your password"
                            />
                            {formik.touched.password && formik.errors.password && (
                                <p className="mt-1 text-xs text-red-500 font-medium">{formik.errors.password}</p>
                            )}
                        </div>
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex w-full justify-center items-center gap-3 rounded-lg bg-primary px-3 py-3 text-sm font-bold leading-6 text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading && (
                                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                )}
                                Login
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            {/* Right Side: Visual Image/Pane */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-pattern items-center justify-center p-12">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary via-transparent to-background-dark/30 opacity-60"></div>
                <div className="relative z-10 max-w-lg text-center">
                    <div className="mb-8 inline-flex items-center justify-center p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl">
                        <div className="bg-white p-6 rounded-xl">
                            <img src="/logo.png" alt="Ongo 237" className="size-16 object-contain" />
                        </div>
                    </div>
                    <h2 className="text-4xl font-black text-white mb-4 leading-tight">Fast, Reliable, & Efficient</h2>
                    <p className="text-white/80 text-lg">Join thousands of users who trust Ongo 237 for their daily professional needs.</p>
                    <div className="mt-12 flex flex-col gap-4 max-w-sm mx-auto">
                        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                            <span className="material-symbols-outlined text-white">verified_user</span>
                            <span className="text-white text-sm font-medium">Enterprise-grade security</span>
                        </div>
                        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                            <span className="material-symbols-outlined text-white">bolt</span>
                            <span className="text-white text-sm font-medium">Real-time performance analytics</span>
                        </div>
                    </div>
                </div>
                <div className="absolute -bottom-24 -right-24 size-96 bg-primary-dark rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
                <div className="absolute -top-24 -left-24 size-96 bg-white rounded-full mix-blend-screen filter blur-3xl opacity-10"></div>
            </div>
        </div>
    );
};

export default Login;
