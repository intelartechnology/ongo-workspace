import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import ApiService from "../../services/ApiService";

/**
 * L'équipe du marchand : qui a accès à cet espace, et à quoi.
 *
 *   - **Propriétaire** : tout ; ajoute et retire gérants et équipe.
 *   - **Gérant** : tout sauf l'équipe de direction ; ajoute et retire l'équipe.
 *   - **Équipe** : les commandes et l'ouverture du jour, rien d'autre.
 *
 * Chacun se connecte avec son propre compte Ongo : on l'ajoute par son
 * numéro, jamais en partageant un mot de passe.
 */

interface Membre {
    user_id: number;
    role: "owner" | "manager" | "staff";
    store_id: number | null;
    prenom: string | null;
    nom: string | null;
    telephone: string | null;
}

interface TeamProps {
    merchantId: string;
}

const ROLES: Record<Membre["role"], string> = { owner: "Propriétaire", manager: "Gérant", staff: "Équipe" };
const champ = "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white";

export default function Team({ merchantId }: TeamProps) {
    const [membres, setMembres] = useState<Membre[]>([]);
    const [moi, setMoi] = useState<{ id: number; role: string }>({ id: 0, role: "staff" });
    const [boutiques, setBoutiques] = useState<{ id: number; name: string }[]>([]);
    const [ajout, setAjout] = useState<{ phone: string; role: "manager" | "staff"; store_id: string } | null>(null);

    const api = new ApiService();
    const base = `v3/merchant/${merchantId}/team`;

    const charger = async () => {
        try {
            const { data } = await api.getData(base);

            if (!data.success) return Swal.fire({ icon: "error", title: data.message });

            setMembres(data.data.members ?? []);
            setMoi({ id: data.data.me, role: data.data.role });
            setBoutiques(data.data.stores ?? []);
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Équipe illisible", text: String(erreur) });
        }
    };

    useEffect(() => {
        charger();
    }, [merchantId]);

    const peutGerer = (role: string) => (moi.role === "owner" ? role !== "owner" : moi.role === "manager" ? role === "staff" : false);

    const ajouter = async () => {
        if (!ajout) return;

        const { data } = await api.postData(base, { phone: ajout.phone, role: ajout.role, store_id: ajout.store_id ? Number(ajout.store_id) : null });

        if (!data.success) return Swal.fire({ icon: "error", title: data.message });

        Swal.fire({ icon: "success", title: data.message, timer: 1400, showConfirmButton: false });
        setAjout(null);
        charger();
    };

    const retirer = async (m: Membre) => {
        const nom = [m.prenom, m.nom].filter(Boolean).join(" ") || m.telephone;
        const reponse = await Swal.fire({ icon: "question", title: `Retirer l'accès de ${nom} ?`, showCancelButton: true, confirmButtonText: "Retirer", cancelButtonText: "Annuler" });

        if (!reponse.isConfirmed) return;

        const { data } = await api.postData(`${base}/remove`, { user_id: m.user_id });

        if (!data.success) return Swal.fire({ icon: "error", title: data.message });

        charger();
    };

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 max-w-xl">
                    Chacun se connecte avec son propre compte Ongo. L'équipe voit les commandes et l'ouverture du jour ; le gérant voit tout, sauf la direction de l'équipe.
                </p>
                {moi.role !== "staff" && !ajout && (
                    <button onClick={() => setAjout({ phone: "", role: "staff", store_id: "" })} className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 shrink-0">
                        Ajouter un membre
                    </button>
                )}
            </div>

            {ajout && (
                <div className="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <label>
                        <span className="text-xs font-semibold uppercase text-slate-500">Téléphone du compte Ongo</span>
                        <input className={champ} value={ajout.phone} placeholder="6 90 00 00 00" onChange={(e) => setAjout({ ...ajout, phone: e.target.value })} />
                    </label>
                    <label>
                        <span className="text-xs font-semibold uppercase text-slate-500">Rôle</span>
                        <select className={champ} value={ajout.role} onChange={(e) => setAjout({ ...ajout, role: e.target.value as "manager" | "staff" })}>
                            <option value="staff">Équipe</option>
                            {moi.role === "owner" && <option value="manager">Gérant</option>}
                        </select>
                    </label>
                    <label>
                        <span className="text-xs font-semibold uppercase text-slate-500">Boutique</span>
                        <select className={champ} value={ajout.store_id} onChange={(e) => setAjout({ ...ajout, store_id: e.target.value })}>
                            <option value="">Toutes</option>
                            {boutiques.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </label>
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setAjout(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300">
                            Annuler
                        </button>
                        <button onClick={ajouter} disabled={ajout.phone.replace(/\D/g, "").length < 9} className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 dark:bg-white dark:text-slate-900">
                            Ajouter
                        </button>
                    </div>
                </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                {membres.map((m) => (
                    <div key={m.user_id} className="p-4 flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                                {[m.prenom, m.nom].filter(Boolean).join(" ") || "Sans nom"}
                                {m.user_id === moi.id && <span className="text-xs text-slate-400"> · vous</span>}
                            </p>
                            <p className="text-sm text-slate-500">
                                {m.telephone ?? "—"}
                                {m.store_id ? ` · ${boutiques.find((b) => b.id === m.store_id)?.name ?? "une boutique"}` : ""}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{ROLES[m.role] ?? m.role}</span>
                            {m.user_id !== moi.id && peutGerer(m.role) && (
                                <button onClick={() => retirer(m)} className="text-sm text-rose-600">
                                    Retirer
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
