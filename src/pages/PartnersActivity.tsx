import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";
import { SearchBar, Button, Select, DateField } from "../components/ui";

interface PartnersActivityProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const entete = "px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500";

const francs = (v: number | null | undefined): string =>
    v == null ? "—" : `${Number(v).toLocaleString("fr-FR")} FCFA`;

const nombre = (v: number | null | undefined): string =>
    v == null ? "—" : Number(v).toLocaleString("fr-FR");

const debutDuMois = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const aujourdhui = (): string => new Date().toISOString().slice(0, 10);

/**
 * Depuis combien de temps ce partenaire n'a-t-il rien produit ?
 *
 * Un partenaire sans course sur la période n'appelle pas la même réaction
 * selon qu'il a roulé la semaine dernière ou jamais : le premier décroche,
 * le second n'a jamais démarré.
 */
const inactivite = (derniere?: string | null): { texte: string; alerte: boolean } => {
    if (!derniere) return { texte: "Jamais", alerte: true };

    const d = new Date(derniere);
    if (Number.isNaN(d.getTime())) return { texte: "—", alerte: false };

    const jours = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (jours <= 0) return { texte: "Aujourd'hui", alerte: false };
    if (jours === 1) return { texte: "Hier", alerte: false };
    if (jours < 30) return { texte: `Il y a ${jours} j`, alerte: jours > 14 };
    return { texte: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }), alerte: true };
};

/**
 * Le suivi de tous les partenaires, sur une période.
 *
 * L'admin suivait jusqu'ici les partenaires un par un, en ouvrant l'espace
 * de chacun. Cet écran répond aux deux questions qu'on ne pouvait pas poser
 * autrement : combien Ongo doit-il en commissions ce mois-ci, et quels
 * partenaires ne produisent plus.
 *
 * Les totaux viennent du serveur et ne sont pas resommés depuis les lignes :
 * celles-ci sont paginées, et un total qui ne tombe pas juste sur un écran
 * financier coûte plus de confiance qu'il ne fait gagner de temps.
 */
export default function PartnersActivity({ onLogout, theme, toggleTheme }: PartnersActivityProps) {
    const navigate = useNavigate();
    const api = new ApiService();

    const [lignes, setLignes] = useState<any[]>([]);
    const [totaux, setTotaux] = useState<any>(null);
    const [pagination, setPagination] = useState<any[]>([]);
    const [chargement, setChargement] = useState(true);
    const [erreur, setErreur] = useState<string | null>(null);

    const [du, setDu] = useState(debutDuMois());
    const [au, setAu] = useState(aujourdhui());
    const [recherche, setRecherche] = useState("");
    const [statut, setStatut] = useState("");
    const [tri, setTri] = useState("commission");

    const charger = async (url?: string) => {
        if (du && au && du > au) {
            toast.error("La date de début est postérieure à la date de fin");
            return;
        }

        setChargement(true);
        setErreur(null);
        try {
            const { data } = url
                ? await api.getDatawithPagination(url, true)
                : await api.getData("dashboard/partners/activity", {
                    du, au,
                    ...(recherche ? { q: recherche } : {}),
                    ...(statut ? { statut } : {}),
                    tri,
                });

            if (data.success) {
                setLignes(data.data?.data ?? []);
                setTotaux(data.data?.totaux ?? null);
                setPagination(data.data?.links ?? []);
            } else {
                setErreur(data.message || "Chargement impossible");
            }
        } catch (e: any) {
            setErreur(
                e?.response?.status === 403
                    ? "Cet écran est réservé aux administrateurs."
                    : "Connexion au serveur impossible.",
            );
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => { charger(); }, [tri, statut]);

    const tuile = (libelle: string, valeur: string, icone: string, detail?: string, accent?: boolean) => (
        <div className={`p-5 rounded-2xl border shadow-sm ${accent
            ? "bg-primary text-white border-primary"
            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}>
            <div className="flex items-start justify-between">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${accent ? "text-white/70" : "text-slate-400"}`}>
                    {libelle}
                </p>
                <span className={`material-symbols-outlined text-[20px] ${accent ? "text-white/40" : "text-slate-300 dark:text-slate-600"}`}>
                    {icone}
                </span>
            </div>
            <p className={`text-2xl font-black mt-2 tabular-nums ${accent ? "text-white" : "text-slate-900 dark:text-white"}`}>
                {valeur}
            </p>
            {detail && (
                <p className={`text-[11px] mt-1 ${accent ? "text-white/70" : "text-slate-500"}`}>{detail}</p>
            )}
        </div>
    );

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-background-dark">

                <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-4">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        <button className="hover:text-primary" onClick={() => navigate("/partners")}>Partenaires</button>
                        <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                        <span className="text-primary">Suivi d'activité</span>
                    </div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Activité des partenaires</h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Ce que chaque partenaire a produit sur la période, et ce qu'Ongo lui doit.
                    </p>
                </header>

                <div className="flex-1 p-4 md:p-8 flex flex-col gap-5">

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-end gap-3">
                        <SearchBar
                            size="sm"
                            value={recherche}
                            onChange={setRecherche}
                            onSearch={() => charger()}
                            placeholder="Rechercher un partenaire…"
                            minWidth={220}
                        />
                        <DateField size="sm" label="Du" value={du} onChange={(e) => setDu(e.target.value)} />
                        <DateField size="sm" label="Au" value={au} onChange={(e) => setAu(e.target.value)} />
                        <Select size="sm" value={statut} onChange={(e) => setStatut(e.target.value)}>
                            <option value="">Tous</option>
                            <option value="actif">Actifs</option>
                            <option value="suspendu">Suspendus</option>
                            <option value="inactif">Sans activité</option>
                        </Select>
                        <Select size="sm" value={tri} onChange={(e) => setTri(e.target.value)}>
                            <option value="commission">Commission décroissante</option>
                            <option value="chiffre_affaires">Chiffre d'affaires</option>
                            <option value="courses">Courses</option>
                            <option value="nom">Nom</option>
                        </Select>
                        <Button variant="primary" icon="filter_list" onClick={() => charger()} loading={chargement}>
                            Appliquer
                        </Button>
                    </div>

                    {erreur ? (
                        <div className="py-16 flex flex-col items-center gap-3 text-center">
                            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700">query_stats</span>
                            <p className="text-sm text-slate-500 max-w-sm">{erreur}</p>
                            <Button icon="refresh" onClick={() => charger()}>Réessayer</Button>
                        </div>
                    ) : (
                        <>
                            {totaux && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                                    {tuile(
                                        "Commission due",
                                        francs(totaux.commission_due),
                                        "account_balance_wallet",
                                        "ce qu'Ongo doit aux partenaires",
                                        true,
                                    )}
                                    {tuile("Chiffre d'affaires", francs(totaux.chiffre_affaires), "payments", "encaissé par les chauffeurs")}
                                    {tuile("Courses", nombre(totaux.courses), "route")}
                                    {tuile(
                                        "Partenaires",
                                        nombre(totaux.partenaires),
                                        "handshake",
                                        `${nombre(totaux.partenaires_actifs)} actifs · ${nombre(totaux.chauffeurs)} chauffeurs`,
                                    )}
                                </div>
                            )}

                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[940px]">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                                <th className={entete}>Partenaire</th>
                                                <th className={`${entete} text-center`}>Taux</th>
                                                <th className={`${entete} text-center`}>Chauffeurs</th>
                                                <th className={`${entete} text-right`}>Courses</th>
                                                <th className={`${entete} text-right`}>Chiffre d'affaires</th>
                                                <th className={`${entete} text-right`}>Commission due</th>
                                                <th className={entete}>Dernière course</th>
                                                <th className={`${entete} text-right`}></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {chargement ? (
                                                <tr><td colSpan={8} className="py-10"><Loading /></td></tr>
                                            ) : lignes.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="py-12 text-center text-sm text-slate-500">
                                                        Aucun partenaire ne correspond à ces critères.
                                                    </td>
                                                </tr>
                                            ) : lignes.map((p: any) => {
                                                const inact = inactivite(p.derniere_course);
                                                return (
                                                    <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">
                                                                        {p.name}
                                                                    </span>
                                                                    <span className="text-[11px] text-slate-400 font-mono leading-tight">#{p.id}</span>
                                                                </div>
                                                                {!p.is_active && (
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 shrink-0">
                                                                        Suspendu
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-center">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums ${p.commission_invalid
                                                                ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                                                                : (p.commission_rate ?? 0) > 0
                                                                    ? "bg-primary/10 text-primary"
                                                                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                                                                {p.commission_invalid && <span className="material-symbols-outlined text-[14px]">warning</span>}
                                                                {p.commission_rate ?? 0} %
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-center text-sm tabular-nums text-slate-700 dark:text-slate-300">
                                                            {nombre(p.drivers_active)}
                                                            <span className="text-slate-400"> / {nombre(p.drivers_total)}</span>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-700 dark:text-slate-300">
                                                            {nombre(p.courses)}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                            {francs(p.chiffre_affaires)}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right text-sm font-bold tabular-nums text-primary whitespace-nowrap">
                                                            {francs(p.commission)}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <span className={`text-xs font-semibold ${inact.alerte ? "text-amber-600 dark:text-amber-400" : "text-slate-500"}`}>
                                                                {inact.alerte && (
                                                                    <span className="material-symbols-outlined text-[14px] align-middle mr-0.5">schedule</span>
                                                                )}
                                                                {inact.texte}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right">
                                                            <Button
                                                                size="sm"
                                                                icon="open_in_new"
                                                                onClick={() => navigate(`/partner/${p.uuid ?? p.id}`)}
                                                            >
                                                                Espace
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {pagination.length > 0 && (
                                    <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-1 justify-end">
                                        {pagination.map((lien: any, i: number) => (
                                            <button
                                                key={i}
                                                disabled={!lien.url || lien.active}
                                                onClick={() => lien.url && charger(lien.url)}
                                                className={`px-3 py-1.5 rounded-md text-xs font-medium ${lien.active
                                                    ? "bg-primary text-white font-bold"
                                                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"} ${!lien.url ? "opacity-50 cursor-not-allowed" : ""}`}
                                                dangerouslySetInnerHTML={{ __html: lien.label }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
