import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";
import Trajet from "./components/Trajet";
import { StatCard } from "../components/ui";

/**
 * Les boosts de course : ce qu'ils ont coûté à Ongo.
 *
 * Le boost est décidé par le code — la politique de boost, au rang du
 * chauffeur sollicité —, jamais posé d'ici : cette page le montre, elle n'en
 * pose pas. Chaque ligne est une course terminée dont le boost a été versé au
 * chauffeur, sans commission.
 */

interface Versement {
    course_id: number;
    montant: number;
    verse_at: string;
    course: any | null;
}

interface EtatDesBoosts {
    total: number;
    nombre: number;
    versements: Versement[];
}

interface BoostsProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const francs = (montant: number) => `${(montant ?? 0).toLocaleString("fr-FR")} F`;

const moisCourant = () => {
    const aujourdHui = new Date();

    return {
        du: new Date(aujourdHui.getFullYear(), aujourdHui.getMonth(), 1).toISOString().slice(0, 10),
        au: aujourdHui.toISOString().slice(0, 10),
    };
};

export default function Boosts({ onLogout, theme, toggleTheme }: BoostsProps) {
    const [etat, setEtat] = useState<EtatDesBoosts | null>(null);
    const [bornes, setBornes] = useState(moisCourant());
    const [chargement, setChargement] = useState(true);
    const navigate = useNavigate();

    const api = new ApiService();

    const charger = async () => {
        setChargement(true);

        try {
            const { data } = await api.getData("v3/admin/boosts", { du: bornes.du, au: bornes.au });

            if (data.success) setEtat(data.data);
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Boosts illisibles", text: String(erreur) });
        }

        setChargement(false);
    };

    useEffect(() => {
        charger();
    }, [bornes.du, bornes.au]);

    // La fiche d'une course se dessine depuis l'objet que la liste lui laisse :
    // on le lui laisse ici aussi, sans quoi elle s'ouvrirait vide.
    const ouvrir = (v: Versement) => {
        if (v.course) sessionStorage.setItem(`course_detail_${v.course_id}`, JSON.stringify(v.course));

        navigate(`/courses/${v.course_id}`);
    };

    const moyenne = etat && etat.nombre > 0 ? Math.round(etat.total / etat.nombre) : 0;

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header>
                <div className="px-8 py-6 max-w-7xl mx-auto flex items-end justify-between gap-6 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Boosts</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Ce qu'Ongo a ajouté au gain des chauffeurs pour que les courses trouvent preneur.
                        </p>
                    </div>

                    <div className="flex items-end gap-3">
                        <label className="text-xs text-slate-500">
                            Du
                            <input
                                type="date"
                                value={bornes.du}
                                onChange={(e) => setBornes({ ...bornes, du: e.target.value })}
                                className="block mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm text-slate-900 dark:text-white"
                            />
                        </label>
                        <label className="text-xs text-slate-500">
                            Au
                            <input
                                type="date"
                                value={bornes.au}
                                onChange={(e) => setBornes({ ...bornes, au: e.target.value })}
                                className="block mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm text-slate-900 dark:text-white"
                            />
                        </label>
                    </div>
                </div>
            </header>

            <div className="px-8 py-8 max-w-7xl mx-auto space-y-8">
                {chargement || !etat ? (
                    <Loading />
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <StatCard label="Coût pour Ongo" value={francs(etat.total)} note="Versé aux chauffeurs, sans commission" />
                            <StatCard label="Courses boostées" value={etat.nombre} note="Terminées, boost versé" />
                            <StatCard label="Boost moyen" value={francs(moyenne)} note="Par course" />
                        </div>

                        {etat.versements.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-12">Aucun boost versé sur cette période.</p>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3">Course</th>
                                            <th className="px-4 py-3">Client</th>
                                            <th className="px-4 py-3">Trajet</th>
                                            <th className="px-4 py-3">Prix client</th>
                                            <th className="px-4 py-3">Boost</th>
                                            <th className="px-4 py-3">Versé le</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {etat.versements.map((v) => (
                                            <tr
                                                key={v.course_id}
                                                onClick={() => ouvrir(v)}
                                                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                            >
                                                <td className="px-4 py-4 text-sm font-semibold">
                                                    {v.course?.code ?? "—"}
                                                    <span className="block text-xs text-slate-500">#{v.course_id}</span>
                                                </td>
                                                <td className="px-4 py-4 text-sm">
                                                    {v.course?.client ? `${v.course.client.prenom ?? ""} ${v.course.client.nom ?? ""}`.trim() : "—"}
                                                    <span className="block text-xs text-slate-500">{v.course?.client?.telephone ?? ""}</span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    {v.course ? <Trajet depart={v.course.lieu_depart} arrivee={v.course.lieu_arrive} largeur="max-w-[220px]" /> : "—"}
                                                </td>
                                                <td className="px-4 py-4 text-sm whitespace-nowrap">{v.course ? francs(Number(v.course.montant)) : "—"}</td>
                                                <td className="px-4 py-4 text-sm font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">+{francs(v.montant)}</td>
                                                <td className="px-4 py-4 text-sm text-slate-500 whitespace-nowrap">
                                                    {new Date(v.verse_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </MainLayout>
    );
}
