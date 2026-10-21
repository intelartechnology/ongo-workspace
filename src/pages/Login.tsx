import React, { useState, useEffect } from 'react';
import { CarTaxiFront, Eye, EyeOff, HandCoins, LoaderCircle, ShieldCheck, Store, TriangleAlert, Users } from 'lucide-react';
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

/**
 * Où conduire celui qui vient de se connecter — calculé **avant** d'ouvrir la
 * session.
 *
 * Le même compte sert à commander une course et à tenir une boutique : rien
 * ne distingue un marchand d'un client tant qu'on n'a pas regardé ses
 * appartenances. C'est cette requête qui décide.
 */
interface CompteConnecte {
    role_id?: number | string;
    partner_short_id?: string | null;
    transport_short_id?: string | null;
    contributor?: boolean;
}

/** `null` : le compte n'a d'espace nulle part ici. */
async function espaceDe(compte: CompteConnecte): Promise<string | null> {
    try {
        const { data } = await new ApiService().getData("v3/merchant/me");

        const espaces: { short_id: string }[] = data?.success ? (data.data ?? []) : [];

        // Un marchand va dans son espace, qu'il en tienne un ou dix. Avec
        // plusieurs enseignes, il ouvre la première et change depuis son espace.
        if (espaces.length > 0) return `/merchant/${espaces[0].short_id}`;
    } catch {
        // Une appartenance illisible ne doit pas empêcher d'entrer : on passe
        // aux autres espaces.
    }

    // Un proprietaire de flotte, a la meme enseigne qu'un marchand.
    if (compte.partner_short_id) return `/partner/${compte.partner_short_id}`;

    // L'équipe d'un transporteur (bus, train) : l'écran des départs.
    if (compte.transport_short_id) return `/transport/${compte.transport_short_id}`;

    // Un contributeur : les vehicules qu'il a apportes a la flotte.
    if (compte.contributor) return "/contributor/dashboard";

    // Un administrateur ouvre le poste sur les courses : ce qui roule d'abord,
    // les totaux ensuite.
    if (Number(compte.role_id) === 4) return "/courses";

    return null;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [voirMotDePasse, setVoirMotDePasse] = useState(false);
    const [majuscules, setMajuscules] = useState(false);
    // Le refus du serveur s'affiche dans le formulaire, là où l'on regarde,
    // et non dans un toast qui disparaît.
    const [erreur, setErreur] = useState<string | null>(null);
    const Api = new ApiService();

    const formik = useFormik({
        initialValues: {
            tel: '',
            password: '',
        },
        validationSchema: Yup.object({
            tel: Yup.string().trim().required("Saisissez votre téléphone ou votre email"),
            password: Yup.string()
                .min(6, "Le mot de passe doit contenir au moins 6 caractères")
                .required("Saisissez votre mot de passe"),
        }),
        onSubmit: async (values) => {
            try {
                setLoading(true);
                setErreur(null);
                const formData = {
                    telephone: values.tel.trim(),
                    password: values.password,
                    isAdmin: true,
                };

                // Pas de journal de la réponse : elle porte le jeton de session.
                const response = await Api.postData('utilisateur/loginDash', formData);
                if (response.data.success) {
                    const userData = response.data.data;

                    /*
                     * La destination d'abord, la session ensuite.
                     *
                     * La session ouverte, la route `/login` bascule aussitôt :
                     * elle partait vers `/courses` le temps que la recherche de
                     * l'espace aboutisse, et un marchand ou un partenaire voyait
                     * le back-office d'Ongo — qui lançait au passage ses requêtes
                     * d'administration. Le jeton suffit à interroger l'API sans
                     * ouvrir la session ; on ne l'ouvre qu'une fois la
                     * destination connue, et elle part avec l'utilisateur.
                     */
                    localStorage.setItem('token', userData.token);
                    const espace = await espaceDe(userData);

                    /*
                     * Aucun espace : un client ou un chauffeur qui s'est trompé
                     * de porte. Il arrivait sur le back-office, dont l'API lui
                     * refusait chaque donnée. On le lui dit, et la session ne
                     * s'ouvre pas.
                     */
                    if (espace === null) {
                        localStorage.removeItem('token');
                        setLoading(false);
                        setErreur("Ce compte n'a accès à aucun espace ici. L'application Ongo reste disponible sur votre téléphone.");
                        return;
                    }

                    const connecte = { ...userData, espace };

                    localStorage.setItem('isAuthenticated', JSON.stringify(connecte));
                    dispatch(LOGIN_ACTION(connecte));
                    onLogin();

                    setLoading(false);
                    toast.success("Connexion réussie");
                    navigate(espace, { replace: true });
                } else {
                    setLoading(false);
                    setErreur(response.data.message || "Identifiants incorrects.");
                }
            } catch (error: unknown) {
                setLoading(false);
                const reponse = (error as { response?: { status?: number; data?: { message?: string } } })?.response;
                setErreur(
                    reponse?.data?.message
                        || (reponse ? "Connexion refusée." : "Le serveur ne répond pas. Vérifiez votre connexion et réessayez."),
                );
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

    const champ = (enErreur: boolean) =>
        `block w-full rounded-lg border bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:border-primary-fixed-dim ${enErreur ? 'border-rose-400 dark:border-rose-500' : 'border-slate-300 dark:border-slate-700'}`;

    /*
     * Ce que le back-office pilote, en clair.
     *
     * Le panneau promettait une « sécurité de niveau entreprise » et « des
     * milliers d'utilisateurs » : des phrases de modèle, en anglais. Il dit
     * désormais à quoi sert l'espace qu'on ouvre.
     */
    /*
     * À qui s'adresse cette porte : une seule connexion, et chacun arrive dans
     * son espace. Les messages qui défilent le disent à chaque public — un
     * marchand ou un propriétaire de flotte doit se reconnaître ici autant
     * qu'un administrateur.
     */
    const services = [
        { icone: ShieldCheck, titre: 'Administration Ongo', texte: 'Pilotez les courses, le covoiturage, Ongo Eat, la location et les finances.' },
        { icone: Store, titre: 'Marchands', texte: 'Gérez votre boutique, vos commandes, vos livreurs et vos revenus.' },
        { icone: CarTaxiFront, titre: 'Propriétaires de flotte', texte: 'Suivez vos chauffeurs, vos véhicules et votre commission.' },
        { icone: HandCoins, titre: 'Contributeurs', texte: "Suivez l'activité des véhicules que vous avez apportés à Ongo." },
        { icone: Users, titre: 'Vos équipes', texte: 'Vos collaborateurs entrent avec leur propre compte, selon les droits que vous leur donnez.' },
    ];

    return (
        <div className="flex min-h-screen w-full bg-white dark:bg-background-dark">
            <div className="flex flex-1 flex-col justify-center px-6 py-12 md:px-12 lg:px-20 xl:px-28">
                <div className="mx-auto w-full max-w-sm">

                    <h1 className="text-2xl md:text-[28px] font-bold tracking-tight text-slate-900 dark:text-white">Connexion</h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Une seule connexion pour tous : vous arrivez directement dans votre espace — administration, boutique ou flotte.
                    </p>

                    {erreur && (
                        <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                            <TriangleAlert className="size-4 mt-0.5 shrink-0" />
                            <span>{erreur}</span>
                        </div>
                    )}

                    <form onSubmit={formik.handleSubmit} noValidate className="mt-8 space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5" htmlFor="tel">
                                Téléphone ou email
                            </label>
                            <input
                                id="tel"
                                name="tel"
                                type="text"
                                autoComplete="username"
                                autoFocus
                                onChange={(e) => {
                                    setErreur(null);
                                    formik.handleChange(e);
                                }}
                                onBlur={formik.handleBlur}
                                value={formik.values.tel}
                                aria-invalid={Boolean(formik.touched.tel && formik.errors.tel)}
                                className={champ(Boolean(formik.touched.tel && formik.errors.tel))}
                                placeholder="6XX XX XX XX ou nom@exemple.com"
                            />
                            {formik.touched.tel && formik.errors.tel && (
                                <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{formik.errors.tel}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5" htmlFor="password">
                                Mot de passe
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={voirMotDePasse ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    onChange={(e) => {
                                        setErreur(null);
                                        formik.handleChange(e);
                                    }}
                                    onBlur={formik.handleBlur}
                                    // Prévenir des majuscules verrouillées : la cause la plus
                                    // fréquente d'un mot de passe « faux » qui est juste.
                                    onKeyUp={(e) => setMajuscules(e.getModifierState('CapsLock'))}
                                    value={formik.values.password}
                                    aria-invalid={Boolean(formik.touched.password && formik.errors.password)}
                                    className={`${champ(Boolean(formik.touched.password && formik.errors.password))} pr-11`}
                                    placeholder="Votre mot de passe"
                                />
                                <button
                                    type="button"
                                    onClick={() => setVoirMotDePasse((v) => !v)}
                                    aria-label={voirMotDePasse ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                    title={voirMotDePasse ? 'Masquer' : 'Afficher'}
                                    className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                >
                                    {voirMotDePasse ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                            </div>
                            {formik.touched.password && formik.errors.password && (
                                <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{formik.errors.password}</p>
                            )}
                            {majuscules && <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">Majuscules verrouillées.</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 dark:bg-primary-container dark:hover:bg-primary-container/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading && <LoaderCircle className="size-4 animate-spin" />}
                            {loading ? 'Connexion…' : 'Se connecter'}
                        </button>
                    </form>

                    <p className="mt-8 text-xs text-slate-400 dark:text-slate-500">
                        Mot de passe oublié ? Demandez sa réinitialisation à un administrateur d'Ongo.
                    </p>
                </div>
            </div>

            <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden bg-pattern items-center justify-center p-14">
                <div className="relative z-10 w-full max-w-md text-white">
                    {/* Le logo en blanc, sans fond : `logo-blanc.png` est tiré de
                        `logo.png`, dont le fond blanc n'est pas transparent. */}
                    <img src="/logo-blanc.png" alt="Ongo 237" className="h-14 w-auto" />
                    <h2 className="mt-8 text-[32px] font-bold leading-tight tracking-tight">
                        Un seul accès,
                        <br />
                        <span className="text-[#ffbd59]">chacun son espace.</span>
                    </h2>
                    {/*
                      * Les services, qui montent en boucle.
                      *
                      * Doublés pour que la boucle se referme sans saut ; le second
                      * exemplaire est caché aux lecteurs d'écran, qui n'ont pas à
                      * entendre la liste deux fois. Le survol met en pause.
                      */}
                    <div className="mt-10 h-[17rem] overflow-hidden fondu-vertical">
                        <ul className="defilement-vertical">
                            {[...services, ...services].map(({ icone: Icone, titre, texte }, i) => (
                                <li
                                    key={`${titre}-${i}`}
                                    aria-hidden={i >= services.length || undefined}
                                    className="flex items-start gap-4 py-2.5"
                                >
                                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                                        <Icone className="size-5" strokeWidth={1.75} />
                                    </span>
                                    <span>
                                        <span className="block text-sm font-semibold">{titre}</span>
                                        <span className="mt-0.5 block text-[13px] leading-snug text-white/75">{texte}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                {/* Le jaune ONGO, en halo discret : l'accent de la charte. */}
                <div aria-hidden className="absolute -bottom-32 -right-32 size-96 rounded-full bg-[#ffbd59] opacity-15 blur-3xl" />
            </div>
        </div>
    );
};

export default Login;
