import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";

/**
 * La modération des comptes, en un seul endroit.
 *
 * Avertir, bloquer et rendre un compte sont trois moments d'une même décision :
 * les répartir sur trois écrans obligeait à reconstituer de tête ce qui avait
 * déjà été fait. Ici, on choisit un compte et l'on voit son dossier — ce qu'on
 * lui a déjà reproché, quand il l'a lu — avant d'agir.
 *
 * Le blocage n'est donc pas le premier geste : l'avertissement dit ce qu'on
 * reproche sans rien couper, et la plupart des dossiers se règlent là.
 */

interface Compte {
    id: number;
    nom: string | null;
    prenom: string | null;
    telephone: string | null;
    blocked_at: string | null;
    blocked_reason: string | null;
    blocked_by: number | null;
}

interface Mesure {
    id: number;
    kind: "avertissement" | "blocage" | "deblocage";
    motif: string | null;
    auteur: string | null;
    acknowledged_at: string | null;
    created_at: string | null;
}

interface ModerationProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

export default function Moderation({ onLogout, theme, toggleTheme }: ModerationProps) {
    const [recherche, setRecherche] = useState<string>("");
    const [resultats, setResultats] = useState<Compte[]>([]);
    const [bloques, setBloques] = useState<Compte[]>([]);
    const [choisi, setChoisi] = useState<Compte | null>(null);
    const [registre, setRegistre] = useState<Mesure[]>([]);
    const [chargement, setChargement] = useState<boolean>(true);

    const api = new ApiService();

    /** La liste de gauche : les comptes bloqués tant qu'on ne cherche rien. */
    const chargerBloques = async () => {
        setChargement(true);

        try {
            const { data } = await api.getData("v3/admin/users/blocked");

            if (data.success) setBloques(data.data ?? []);
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Serveur injoignable", text: String(erreur) });
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => {
        chargerBloques();
    }, []);

    // La recherche part du serveur : le back-office ne tient pas la liste des
    // comptes en mémoire, et c'est le téléphone qu'un signalement donne.
    useEffect(() => {
        if (recherche.trim().length < 2) {
            setResultats([]);

            return;
        }

        const minuteur = setTimeout(async () => {
            try {
                const { data } = await api.getData("v3/admin/users/search", { q: recherche.trim() });

                if (data.success) setResultats(data.data ?? []);
            } catch {
                // Une frappe de plus relancera la recherche : inutile d'alerter.
            }
        }, 350);

        return () => clearTimeout(minuteur);
    }, [recherche]);

    const ouvrir = async (compte: Compte) => {
        setChoisi(compte);
        setRegistre([]);

        try {
            const { data } = await api.getData("v3/admin/users/notices", { user_id: compte.id });

            if (data.success) setRegistre(data.data ?? []);
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Dossier illisible", text: String(erreur) });
        }
    };

    /** Rafraîchir le compte ouvert et tout ce qui l'affiche. */
    const rafraichir = async (compte: Compte) => {
        await chargerBloques();

        if (recherche.trim().length >= 2) {
            const { data } = await api.getData("v3/admin/users/search", { q: recherche.trim() });

            if (data.success) {
                setResultats(data.data ?? []);
                const remis = (data.data ?? []).find((ligne: Compte) => ligne.id === compte.id);

                if (remis) setChoisi(remis);
            }
        }

        await ouvrir(choisi && choisi.id === compte.id ? { ...compte } : compte);
    };

    const agir = async (compte: Compte, action: "warn" | "block" | "unblock", motif?: string) => {
        try {
            const { data } = await api.postData(`v3/admin/users/${action}`, { user_id: compte.id, motif });

            if (data.success) {
                Swal.fire({ icon: "success", title: "C'est fait", text: data.message, timer: 1800, showConfirmButton: false });

                if (action === "unblock") {
                    setChoisi({ ...compte, blocked_at: null, blocked_reason: null, blocked_by: null });
                } else if (action === "block") {
                    setChoisi({ ...compte, blocked_at: new Date().toISOString(), blocked_reason: motif ?? null });
                }

                await rafraichir(compte);

                return;
            }

            Swal.fire({ icon: "error", title: "Refusé", text: data.message });
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Serveur injoignable", text: String(erreur) });
        }
    };

    /**
     * Demander le motif.
     *
     * Il part tel quel dans l'application : c'est lui que la personne lit.
     * « Non précisé » ne lui laisse que l'appel au support.
     */
    const demanderMotif = async (titre: string, bouton: string, exemple: string) => {
        const { value, isConfirmed } = await Swal.fire({
            icon: "warning",
            title: titre,
            input: "text",
            inputLabel: "Motif, tel qu'il sera lu par la personne",
            inputPlaceholder: exemple,
            showCancelButton: true,
            confirmButtonText: bouton,
            cancelButtonText: "Annuler",
            inputValidator: (valeur) => (valeur.trim() === "" ? "Indiquez un motif" : null),
        });

        return isConfirmed ? String(value).trim() : null;
    };

    const avertir = async (compte: Compte) => {
        const motif = await demanderMotif("Avertir ce compte ?", "Avertir", "Trois annulations tardives cette semaine…");

        if (motif) agir(compte, "warn", motif);
    };

    const bloquer = async (compte: Compte) => {
        const motif = await demanderMotif("Bloquer ce compte ?", "Bloquer", "Impayés répétés…");

        if (motif) agir(compte, "block", motif);
    };

    const debloquer = async (compte: Compte) => {
        const confirmation = await Swal.fire({
            icon: "question",
            title: "Rendre ce compte ?",
            text: `${compte.prenom ?? ""} ${compte.nom ?? ""} pourra de nouveau utiliser Ongo.`,
            showCancelButton: true,
            confirmButtonText: "Débloquer",
            cancelButtonText: "Annuler",
        });

        if (confirmation.isConfirmed) agir(compte, "unblock");
    };

    const nom = (compte: Compte) => `${compte.prenom ?? ""} ${compte.nom ?? ""}`.trim() || "Sans nom";

    const date = (valeur: string | null) =>
        valeur
            ? new Date(valeur).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
            : "—";

    const allure: Record<Mesure["kind"], { libelle: string; classe: string }> = {
        avertissement: { libelle: "Avertissement", classe: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
        blocage: { libelle: "Blocage", classe: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
        deblocage: { libelle: "Déblocage", classe: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
    };

    const liste = recherche.trim().length >= 2 ? resultats : bloques;

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-8 py-6 max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Modération</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Avertir avant de bloquer : le dossier d'un compte se lit ici, en entier.
                    </p>
                </div>
            </header>

            <div className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input
                            type="text"
                            value={recherche}
                            onChange={(evenement) => setRecherche(evenement.target.value)}
                            placeholder="Téléphone ou nom…"
                            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#137fec]"
                        />
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            {recherche.trim().length >= 2 ? "Résultats" : "Comptes bloqués"}
                        </div>

                        {chargement ? (
                            <Loading />
                        ) : liste.length > 0 ? (
                            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                {liste.map((compte) => (
                                    <li key={compte.id}>
                                        <button
                                            onClick={() => ouvrir(compte)}
                                            className={`w-full text-left px-5 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${
                                                choisi?.id === compte.id ? "bg-slate-50 dark:bg-white/5" : ""
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-sm font-bold truncate">{nom(compte)}</div>
                                                    <div className="text-xs text-slate-500">{compte.telephone ?? "—"}</div>
                                                </div>

                                                {compte.blocked_at && (
                                                    <span className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">
                                                        Bloqué
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="px-5 py-10 text-center text-sm text-slate-500">
                                {recherche.trim().length >= 2 ? "Aucun compte trouvé." : "Aucun compte bloqué."}
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2">
                    {choisi === null ? (
                        <div className="h-full min-h-[300px] flex items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-500">
                            Choisissez un compte pour voir son dossier.
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-bold">{nom(choisi)}</h2>
                                        <p className="text-sm text-slate-500">
                                            #{choisi.id} · {choisi.telephone ?? "—"}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {choisi.blocked_at ? (
                                            <button
                                                onClick={() => debloquer(choisi)}
                                                className="px-3 py-2 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
                                            >
                                                Débloquer
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => avertir(choisi)}
                                                    className="px-3 py-2 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all"
                                                >
                                                    Avertir
                                                </button>
                                                <button
                                                    onClick={() => bloquer(choisi)}
                                                    className="px-3 py-2 rounded-lg text-xs font-bold border border-red-500 text-red-500 hover:bg-red-50 transition-all"
                                                >
                                                    Bloquer
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {choisi.blocked_at && (
                                    <div className="mt-5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4">
                                        <div className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
                                            Bloqué le {date(choisi.blocked_at)}
                                        </div>
                                        <div className="text-sm mt-1">{choisi.blocked_reason ?? "Aucun motif"}</div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    Dossier
                                </div>

                                {registre.length > 0 ? (
                                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {registre.map((mesure) => (
                                            <li key={mesure.id} className="px-6 py-4">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${allure[mesure.kind].classe}`}>
                                                        {allure[mesure.kind].libelle}
                                                    </span>
                                                    <span className="text-xs text-slate-500">{date(mesure.created_at)}</span>
                                                    {mesure.auteur && <span className="text-xs text-slate-400">par {mesure.auteur}</span>}

                                                    {mesure.kind === "avertissement" && (
                                                        <span
                                                            className={`ml-auto text-[11px] font-semibold ${
                                                                mesure.acknowledged_at ? "text-emerald-600" : "text-amber-600"
                                                            }`}
                                                        >
                                                            {mesure.acknowledged_at ? `Lu le ${date(mesure.acknowledged_at)}` : "Pas encore lu"}
                                                        </span>
                                                    )}
                                                </div>

                                                {mesure.motif && <div className="text-sm mt-2">{mesure.motif}</div>}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="px-6 py-10 text-center text-sm text-slate-500">
                                        Rien n'a encore été décidé sur ce compte.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
