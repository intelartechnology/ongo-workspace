import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ApiService from "../../services/ApiService";
import Loading from "../../components/Loading";

interface Annonce {
    id: number;
    emplacement: string;
    libelle: string;
    texte_fr: string;
    texte_en: string | null;
    actif: boolean;
    updated_at: string | null;
}

const MAX = 255;

/**
 * Les annonces de l'application (table `annonce_ongo`) : les messages que voient
 * tous les utilisateurs, comme la bande défilante.
 *
 * L'application redemande le texte à chaque affichage : un changement se voit
 * au prochain chargement, sans mise à jour de l'application. Désactivée, une
 * annonce laisse place au texte d'origine.
 */
export default function AnnoncesOngo() {
    const api = new ApiService();
    const [annonces, setAnnonces] = useState<Annonce[] | null>(null);
    const [brouillon, setBrouillon] = useState<Record<number, Annonce>>({});
    const [enCours, setEnCours] = useState<number | null>(null);

    const charger = async () => {
        try {
            const { data } = await api.getData("v3/admin/annonces");
            if (!data.success) throw new Error(data.message);
            setAnnonces(data.data);
            setBrouillon(Object.fromEntries(data.data.map((a: Annonce) => [a.id, a])));
        } catch {
            toast.error("Les annonces n'ont pas pu être chargées");
            setAnnonces([]);
        }
    };

    useEffect(() => {
        charger();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const modifier = (id: number, champ: Partial<Annonce>) => setBrouillon((b) => ({ ...b, [id]: { ...b[id], ...champ } }));

    const change = (a: Annonce) => {
        const b = brouillon[a.id];
        return b && (b.texte_fr !== a.texte_fr || (b.texte_en ?? "") !== (a.texte_en ?? "") || b.actif !== a.actif);
    };

    const enregistrer = async (a: Annonce) => {
        const b = brouillon[a.id];
        if (!b.texte_fr.trim()) {
            toast.error("Le texte en français est obligatoire");
            return;
        }
        setEnCours(a.id);
        try {
            const { data } = await api.updateData(`v3/admin/annonces/${a.id}`, {
                texte_fr: b.texte_fr.trim(),
                texte_en: (b.texte_en ?? "").trim() || null,
                actif: b.actif,
            });
            if (data.success) {
                toast.success(`${a.libelle} enregistrée`);
                charger();
            } else {
                toast.error(data.message || "Enregistrement refusé");
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.message || "Connexion au serveur impossible");
        } finally {
            setEnCours(null);
        }
    };

    if (annonces === null) return <Loading />;

    const champ = "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm";

    return (
        <section className="mb-10">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Annonces</h1>
            <p className="text-sm text-slate-500 mt-1 mb-4 max-w-2xl">
                Les messages que voient tous les utilisateurs de l'application. Un changement s'affiche au prochain chargement, sans mise à jour de l'application.
            </p>

            {annonces.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune annonce. La table `annonce_ongo` n'est peut-être pas encore migrée.</p>
            ) : (
                <div className="flex flex-col gap-4">
                    {annonces.map((a) => {
                        const b = brouillon[a.id] ?? a;
                        return (
                            <div key={a.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col gap-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">{a.libelle}</p>
                                        {a.updated_at && (
                                            <p className="text-xs text-slate-400">Modifiée le {new Date(a.updated_at).toLocaleString("fr-FR")}</p>
                                        )}
                                    </div>
                                    <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                        <input type="checkbox" checked={b.actif} onChange={(e) => modifier(a.id, { actif: e.target.checked })} className="size-4" />
                                        Affichée
                                    </label>
                                </div>

                                {/* L'aperçu tel que la bande défile : une ligne, coupée au besoin. */}
                                <div className="rounded-lg bg-primary text-white px-4 py-2 text-sm overflow-hidden whitespace-nowrap text-ellipsis">
                                    {b.actif ? b.texte_fr || "—" : "Désactivée : l'application affiche le texte d'origine."}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-xs font-medium text-slate-500 flex justify-between">
                                            Français <span className="tabular-nums">{b.texte_fr.length}/{MAX}</span>
                                        </span>
                                        <textarea rows={3} maxLength={MAX} value={b.texte_fr} onChange={(e) => modifier(a.id, { texte_fr: e.target.value })} className={champ} />
                                    </label>
                                    <label className="flex flex-col gap-1.5">
                                        <span className="text-xs font-medium text-slate-500 flex justify-between">
                                            Anglais <span className="tabular-nums">{(b.texte_en ?? "").length}/{MAX}</span>
                                        </span>
                                        <textarea rows={3} maxLength={MAX} value={b.texte_en ?? ""} onChange={(e) => modifier(a.id, { texte_en: e.target.value })} className={champ} placeholder="Vide : le texte français est affiché" />
                                    </label>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => enregistrer(a)}
                                        disabled={!change(a) || enCours === a.id}
                                        className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
                                    >
                                        {enCours === a.id ? "…" : "Enregistrer"}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
