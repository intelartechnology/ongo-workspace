import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";

/**
 * Les moyens de paiement d'Ongo Eat.
 *
 * Ongo n'en crée pas d'ici : chacun demande du code — un portefeuille, une
 * banque. Ce qui se règle ici, c'est ce que le client lit et ce qui lui est
 * proposé : le titre, la phrase qui l'explique, et l'ouverture du moyen pour
 * toute la plateforme.
 *
 * Un moyen fermé disparaît de toutes les caisses, même chez les marchands
 * qui l'avaient accepté. Chaque marchand choisit ensuite les siens parmi ceux
 * qui restent, dans sa fiche.
 */

interface Moyen {
    id: number;
    code: string;
    title: string;
    description: string | null;
    icon: string | null;
    is_active: boolean;
    position: number;
    stores_count: number;
}

interface EatPaymentMethodsProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const champ =
    "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white";

export default function EatPaymentMethods({ onLogout, theme, toggleTheme }: EatPaymentMethodsProps) {
    const [moyens, setMoyens] = useState<Moyen[]>([]);
    const [form, setForm] = useState<{ id: number; title: string; description: string } | null>(null);

    const api = new ApiService();

    const charger = async () => {
        try {
            const { data } = await api.getData("v3/admin/eat/payment-methods");
            if (data.success) setMoyens(data.data ?? []);
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Moyens illisibles", text: String(erreur) });
        }
    };

    useEffect(() => {
        charger();
    }, []);

    const echec = (data: { success: boolean; message: string }) => {
        if (data.success) return false;
        Swal.fire({ icon: "error", title: data.message });
        return true;
    };

    const enregistrer = async () => {
        if (!form) return;

        const { data } = await api.postData(`v3/admin/eat/payment-methods/${form.id}`, {
            title: form.title,
            description: form.description,
        });

        if (echec(data)) return;

        setForm(null);
        charger();
    };

    const basculer = async (m: Moyen) => {
        // Fermer un moyen le retire de toutes les caisses : on le dit avant.
        if (m.is_active) {
            const reponse = await Swal.fire({
                icon: "question",
                title: `Ne plus proposer « ${m.title} » ?`,
                text: "Aucun client ne pourra plus le choisir, quelle que soit la boutique.",
                showCancelButton: true,
                confirmButtonText: "Fermer ce moyen",
                cancelButtonText: "Annuler",
            });

            if (!reponse.isConfirmed) return;
        }

        const { data } = await api.postData(`v3/admin/eat/payment-methods/${m.id}/toggle`, {
            is_active: !m.is_active,
        });

        if (!echec(data)) charger();
    };

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="px-8 py-6 border-b border-slate-200 dark:border-slate-800">
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Moyens de paiement</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Ce que le client lit à la caisse. Chaque marchand accepte ensuite les siens parmi ceux qui sont ouverts ;
                    tant qu'il n'a rien décoché, il les accepte tous.
                </p>
            </header>

            <main className="px-8 py-8 max-w-4xl mx-auto space-y-4">
                {moyens.map((m) => (
                    <div
                        key={m.id}
                        className="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                    >
                        {form?.id === m.id ? (
                            <div className="space-y-3">
                                <label className="block">
                                    <span className="text-xs font-semibold uppercase text-slate-500">Titre</span>
                                    <input
                                        className={champ}
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-xs font-semibold uppercase text-slate-500">Description</span>
                                    <input
                                        className={champ}
                                        value={form.description}
                                        placeholder="Ce que le client comprend en le choisissant"
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    />
                                </label>
                                <div className="flex justify-end gap-3">
                                    <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300">
                                        Annuler
                                    </button>
                                    <button
                                        onClick={enregistrer}
                                        disabled={!form.title.trim()}
                                        className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 dark:bg-white dark:text-slate-900"
                                    >
                                        Enregistrer
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-slate-900 dark:text-white">{m.title}</p>
                                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-800">
                                            {m.code}
                                        </span>
                                        {!m.is_active && (
                                            <span className="text-xs px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                                                fermé
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">{m.description || "Sans description"}</p>
                                    {m.stores_count > 0 && (
                                        <p className="text-xs text-slate-400 mt-2">
                                            {m.stores_count} boutique(s) ont fait une sélection qui l'inclut ou l'exclut
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => setForm({ id: m.id, title: m.title, description: m.description ?? "" })}
                                        className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 dark:border-slate-700"
                                    >
                                        Modifier
                                    </button>
                                    <button
                                        onClick={() => basculer(m)}
                                        className={`px-3 py-1.5 rounded-lg text-sm ${
                                            m.is_active
                                                ? "border border-slate-300 dark:border-slate-700"
                                                : "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                        }`}
                                    >
                                        {m.is_active ? "Fermer" : "Ouvrir"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </main>
        </MainLayout>
    );
}
