import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import Swal from "sweetalert2";
import { Button, Input } from "../components/ui";

interface PartnerAddProps {
    onLogout?: () => void;
    theme?: "light" | "dark";
    toggleTheme?: () => void;
}

/** Ce que la recherche par téléphone a trouvé — ou pas. */
type Resultat =
    | { etat: "vierge" }
    | { etat: "recherche" }
    | { etat: "trouve"; user: any; dejaPartenaire: boolean }
    | { etat: "absent"; telephone: string };

const TEL = /^[0-9+\s]{8,15}$/;

/**
 * La création d'un partenaire.
 *
 * L'écran partait d'une liste d'utilisateurs à parcourir : il fallait déjà
 * savoir que la personne avait un compte, et la retrouver parmi tous les
 * autres. On part maintenant du numéro de téléphone, qui est ce que l'admin
 * a réellement sous la main. Deux issues : le compte existe et on le
 * rattache, ou il n'existe pas et on le crée dans la foulée — sans quitter
 * l'écran ni perdre la saisie.
 */
export default function PartnerAdd({ onLogout = () => { }, theme = "light", toggleTheme = () => { } }: PartnerAddProps) {
    const navigate = useNavigate();
    const Api = new ApiService();

    const [telephone, setTelephone] = useState("");
    const [resultat, setResultat] = useState<Resultat>({ etat: "vierge" });

    const [nom, setNom] = useState("");
    const [prenom, setPrenom] = useState("");
    const [email, setEmail] = useState("");

    const [nomFlotte, setNomFlotte] = useState("");
    const [commission, setCommission] = useState("0");
    const [envoi, setEnvoi] = useState(false);
    /** Vrai quand la recherche a dû se rabattre faute de route dédiée. */
    const [replii, setReplii] = useState(false);

    /**
     * Le repli sur la recherche d'utilisateurs générique.
     *
     * `dashboard/partner/lookup` est la route voulue : elle sait dire si le
     * compte est déjà partenaire. Tant qu'elle n'existe pas côté API,
     * `dashboard/users/search` — qui tourne déjà — permet au moins de
     * retrouver le compte par son numéro.
     *
     * La recherche générique est floue : elle rend tout ce qui ressemble au
     * terme. On ne retient donc qu'une correspondance **exacte** du numéro,
     * chiffres comparés à chiffres, pour ne pas rattacher le mauvais compte.
     */
    const chercherParRepli = async (tel: string) => {
        const { data } = await Api.getData(`dashboard/users/search?q=${encodeURIComponent(tel)}`);
        if (!data.success) throw new Error(data.message || "Recherche impossible");

        const liste: any[] = data.data?.data ?? data.data ?? [];
        const chiffres = (v: unknown) => String(v ?? "").replace(/\D/g, "");
        const vise = chiffres(tel);

        return liste.find((u) => chiffres(u?.telephone) === vise) ?? null;
    };

    const chercher = async () => {
        const tel = telephone.trim();
        if (!TEL.test(tel)) {
            toast.error("Numéro de téléphone invalide");
            return;
        }

        const retenir = (u: any, dejaPartenaire: boolean) => {
            setResultat({ etat: "trouve", user: u, dejaPartenaire });
            // Le nom de flotte reprend celui de la personne par défaut :
            // c'est presque toujours ce que l'admin allait taper.
            setNomFlotte((v) => v || [u?.prenom, u?.nom].filter(Boolean).join(" "));
        };

        setResultat({ etat: "recherche" });
        try {
            const { data } = await Api.postData("dashboard/partner/lookup", { phone: tel });

            if (!data.success) {
                toast.error(data.message || "Recherche impossible");
                setResultat({ etat: "vierge" });
                return;
            }

            if (data.data?.found) retenir(data.data.user, Boolean(data.data.already_partner));
            else setResultat({ etat: "absent", telephone: tel });
        } catch (err: any) {
            const code = err?.response?.status;

            // 404 ou 405 : la route dédiée n'est pas déployée. Ce n'est pas
            // une panne, on se rabat. Toute autre erreur reste une erreur.
            if (code === 404 || code === 405) {
                try {
                    const u = await chercherParRepli(tel);
                    if (u) {
                        // Le repli ne sait pas si le compte est déjà
                        // partenaire : on laisse passer, et c'est le serveur
                        // qui refusera à la création s'il l'est.
                        retenir(u, false);
                        setReplii(true);
                    } else {
                        setResultat({ etat: "absent", telephone: tel });
                        setReplii(true);
                    }
                    return;
                } catch {
                    toast.error("Recherche impossible");
                    setResultat({ etat: "vierge" });
                    return;
                }
            }

            // Un 403 n'est pas une panne : le serveur a répondu, il refuse.
            // Le confondre avec une coupure réseau envoie chercher le
            // problème du mauvais côté.
            toast.error(
                code === 403
                    ? (err?.response?.data?.message || "Votre compte n'est pas autorisé à effectuer cette recherche.")
                    : code === 401
                        ? "Session expirée, reconnectez-vous."
                        : (err?.response?.data?.message || "Connexion au serveur impossible"),
            );
            setResultat({ etat: "vierge" });
        }
    };

    const reinitialiser = () => {
        setResultat({ etat: "vierge" });
        setNom(""); setPrenom(""); setEmail("");
    };

    const creer = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nomFlotte.trim()) {
            toast.error("Le nom du partenaire est obligatoire");
            return;
        }

        const taux = Number(commission);
        if (Number.isNaN(taux) || taux < 0 || taux > 100) {
            toast.error("La commission doit être un pourcentage entre 0 et 100");
            return;
        }

        // Le corps diffère selon que le compte existe : `user_id` pour un
        // rattachement, `new_user` pour une création. Jamais les deux — le
        // serveur refuse.
        let corps: Record<string, unknown>;

        if (resultat.etat === "trouve") {
            corps = {
                name: nomFlotte.trim(),
                user_id: resultat.user.id,
                contact: resultat.user.telephone || telephone.trim(),
                commission_rate: taux,
            };
        } else if (resultat.etat === "absent") {
            if (!nom.trim() || !prenom.trim()) {
                toast.error("Le nom et le prénom du partenaire sont obligatoires");
                return;
            }
            corps = {
                name: nomFlotte.trim(),
                contact: resultat.telephone,
                commission_rate: taux,
                new_user: {
                    nom: nom.trim(),
                    prenom: prenom.trim(),
                    telephone: resultat.telephone,
                    email: email.trim() || undefined,
                },
            };
        } else {
            toast.error("Recherchez d'abord un numéro de téléphone");
            return;
        }

        setEnvoi(true);
        try {
            const { data } = await Api.postData("dashboard/partner", corps);
            if (data.success) {
                // Un compte neuf ne sert à rien si personne ne sait s'y
                // connecter. Le serveur rend le mot de passe une seule fois ;
                // s'il n'en rend pas, on le dit plutôt que de laisser l'admin
                // supposer qu'un SMS est parti.
                const motDePasse = data.data?.password;
                const identifiant = data.data?.user?.telephone ?? corps.contact;

                if (corps.new_user) {
                    await Swal.fire({
                        icon: motDePasse ? "success" : "warning",
                        title: "Partenaire créé",
                        html: motDePasse
                            ? `<p style="font-size:14px">Identifiant <b>${identifiant}</b></p>` +
                            `<p style="font-size:28px;font-weight:800;letter-spacing:4px;margin:12px 0">${motDePasse}</p>` +
                            `<p style="font-size:13px;color:#b91c1c">Notez-le maintenant : il ne s'affichera plus. Transmettez-le au partenaire, qui le changera à la première connexion.</p>`
                            : `<p style="font-size:14px">Identifiant <b>${identifiant}</b></p>` +
                            `<p style="font-size:13px;color:#b45309;margin-top:10px">Le serveur n'a pas renvoyé de mot de passe. Vérifiez comment le partenaire doit recevoir ses accès avant de lui annoncer son espace.</p>`,
                        confirmButtonText: "J'ai noté",
                    });
                } else {
                    toast.success("Partenaire créé");
                }

                // L'espace du partenaire est l'endroit utile juste après :
                // c'est là qu'on lui ajoute ses premiers chauffeurs.
                const cle = data.data?.uuid ?? data.data?.id;
                navigate(cle ? `/partner/${cle}` : "/partners");
            } else {
                toast.error(data.message || "Erreur lors de la création");
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Connexion au serveur impossible");
        } finally {
            setEnvoi(false);
        }
    };

    const peutCreer = resultat.etat === "trouve"
        ? !resultat.dejaPartenaire
        : resultat.etat === "absent" && !replii;

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-background-dark font-display">
                <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 md:px-8 py-4 flex items-center gap-3">
                    <Button variant="ghost" size="sm" icon="arrow_back" aria-label="Retour" onClick={() => navigate("/partners")} />
                    <div>
                        <nav className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            <button className="hover:text-primary" onClick={() => navigate("/partners")}>Partenaires</button>
                            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                            <span className="text-primary">Nouveau</span>
                        </nav>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Ajouter un partenaire</h2>
                    </div>
                </header>

                <div className="flex-1 p-4 md:p-8 flex justify-center">
                    <form onSubmit={creer} className="w-full max-w-2xl flex flex-col gap-5">

                        {/* ---------- 1. le numéro ---------- */}
                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col gap-4">
                            <div className="flex items-start gap-3">
                                <span className="size-7 rounded-lg bg-primary text-white text-xs font-black flex items-center justify-center shrink-0">1</span>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Qui est le partenaire ?</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Son numéro de téléphone suffit. S'il a déjà un compte Ongo, on le rattache ; sinon on le crée.</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Input
                                    value={telephone}
                                    onChange={(e) => { setTelephone(e.target.value); if (resultat.etat !== "vierge") reinitialiser(); }}
                                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); chercher(); } }}
                                    placeholder="6XX XX XX XX"
                                    inputMode="tel"
                                    autoFocus
                                />
                                <Button
                                    type="button"
                                    variant="primary"
                                    icon="search"
                                    onClick={chercher}
                                    loading={resultat.etat === "recherche"}
                                    className="shrink-0"
                                >
                                    Chercher
                                </Button>
                            </div>

                            {/* Deux situations très différentes sous le même repli :
                                avec un compte existant on peut aller au bout,
                                sans compte la création échouera côté serveur. Les
                                confondre enverrait l'admin dans une impasse. */}
                            {replii && resultat.etat === "trouve" && (
                                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                    <span className="material-symbols-outlined text-[20px] shrink-0">info</span>
                                    <p className="text-xs font-semibold leading-relaxed">
                                        Recherche en mode dégradé : <code>dashboard/partner/lookup</code> n'est pas déployée.
                                        Le rattachement fonctionne, mais impossible de vérifier d'ici si ce compte est déjà partenaire —
                                        le serveur refusera la création le cas échéant.
                                    </p>
                                </div>
                            )}

                            {replii && resultat.etat === "absent" && (
                                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400">
                                    <span className="material-symbols-outlined text-[20px] shrink-0">block</span>
                                    <p className="text-xs font-semibold leading-relaxed">
                                        Aucun compte sur ce numéro, et la création de compte n'est pas encore possible :
                                        <code> POST dashboard/partner</code> n'accepte pas encore le champ <code>new_user</code>.
                                        Créez d'abord l'utilisateur depuis l'écran Utilisateurs, puis revenez le rattacher ici.
                                    </p>
                                </div>
                            )}

                            {resultat.etat === "trouve" && (
                                <div className={`flex items-start gap-3 p-4 rounded-xl border ${resultat.dejaPartenaire
                                    ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20"
                                    : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"}`}>
                                    <span className={`material-symbols-outlined ${resultat.dejaPartenaire ? "text-amber-600" : "text-emerald-600"}`}>
                                        {resultat.dejaPartenaire ? "warning" : "how_to_reg"}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                                            {[resultat.user.prenom, resultat.user.nom].filter(Boolean).join(" ") || "Compte sans nom"}
                                        </p>
                                        <p className="text-xs text-slate-500 font-mono">{resultat.user.telephone}{resultat.user.email ? ` · ${resultat.user.email}` : ""}</p>
                                        <p className={`text-xs font-semibold mt-1 ${resultat.dejaPartenaire ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                                            {resultat.dejaPartenaire
                                                ? "Ce compte est déjà partenaire — impossible de le créer deux fois."
                                                : "Compte trouvé. Il sera rattaché à ce partenaire."}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {resultat.etat === "absent" && (
                                <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px] text-slate-400">person_add</span>
                                        Aucun compte sur {resultat.telephone}. Renseignez son identité, le compte sera créé.
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom *" />
                                        <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom *" />
                                    </div>
                                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail (facultatif)" type="email" />
                                </div>
                            )}
                        </section>

                        {/* ---------- 2. la flotte et la commission ---------- */}
                        <section className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col gap-4 transition-opacity ${peutCreer ? "" : "opacity-50 pointer-events-none"}`}>
                            <div className="flex items-start gap-3">
                                <span className="size-7 rounded-lg bg-primary text-white text-xs font-black flex items-center justify-center shrink-0">2</span>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Le partenariat</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Le nom affiché dans le tableau de bord, et ce qu'il touche sur les courses de ses chauffeurs.</p>
                                </div>
                            </div>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Nom du partenaire *</span>
                                <Input value={nomFlotte} onChange={(e) => setNomFlotte(e.target.value)} placeholder="Ex. Flotte Mbarga" />
                            </label>

                            <label className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Commission sur chaque course</span>
                                <div className="relative max-w-[160px]">
                                    <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step="0.1"
                                        value={commission}
                                        onChange={(e) => setCommission(e.target.value)}
                                        className="pr-8"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 pointer-events-none">%</span>
                                </div>
                                {/* Le taux se prend sur la part Ongo, jamais sur celle du
                                    chauffeur. L'exemple chiffré évite la lecture inverse,
                                    qui ferait croire à une ponction sur le chauffeur. */}
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Prélevé <strong className="text-slate-700 dark:text-slate-300">sur la part Ongo</strong>, pas sur celle du chauffeur.
                                    {Number(commission) > 0 && (
                                        <> Sur 10 000 FCFA de course, il touche{" "}
                                            <strong className="text-primary">
                                                {Math.round(10000 * Number(commission) / 100).toLocaleString("fr-FR")} FCFA
                                            </strong>.
                                        </>
                                    )}
                                    {Number(commission) === 0 && " À 0 %, il ne touche rien — ajustable à tout moment."}
                                </p>
                            </label>
                        </section>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => navigate("/partners")}>Annuler</Button>
                            <Button type="submit" variant="primary" icon="check" loading={envoi} disabled={!peutCreer}>
                                Créer le partenaire
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </MainLayout>
    );
}
