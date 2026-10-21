import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Plus } from "lucide-react";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";
import { ActionsMenu, Button, Input, Select } from "../components/ui";

interface CodePromo {
    id: number;
    code: string;
    description: string | null;
    type: "percent" | "fixed";
    value: number;
    max_discount: number | null;
    min_amount: number;
    mode: "bus" | "train" | null;
    operator_id: string | null;
    operator_name: string | null;
    starts_at: string | null;
    ends_at: string | null;
    max_uses: number | null;
    max_uses_per_user: number;
    is_active: boolean;
    show_in_app: boolean;
    uses: number;
    badge: string;
    in_force: boolean;
}

interface Transporteur { short_id: string; name: string }

interface Props {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

type Brouillon = {
    id?: number;
    code: string;
    description: string;
    type: "percent" | "fixed";
    value: string;
    max_discount: string;
    min_amount: string;
    mode: "" | "bus" | "train";
    operator_id: string;
    starts_at: string;
    ends_at: string;
    max_uses: string;
    max_uses_per_user: string;
    show_in_app: boolean;
};

const VIDE: Brouillon = {
    code: "", description: "", type: "percent", value: "", max_discount: "", min_amount: "", mode: "", operator_id: "",
    starts_at: "", ends_at: "", max_uses: "", max_uses_per_user: "1", show_in_app: true,
};

const etiquette = "text-[11px] font-bold uppercase tracking-wider text-slate-400";
const entete = "px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500";

const fcfa = (n: number) => `${n.toLocaleString("fr-FR").replace(/\s/g, " ")} F`;
const versChamp = (d: string | null) => (d ? d.replace(" ", "T").slice(0, 16) : "");
const nombreOuNul = (s: string) => (s.trim() === "" ? null : Number(s));

/**
 * Les codes promo des billets de bus et de train.
 *
 * Ongo les crée et les paie : la remise sort de son compte quand le billet est
 * réglé. Elle ne porte que sur les billets — les frais de service se paient
 * toujours — et le transporteur ne la voit pas : il touche le prix plein.
 */
export default function TransportPromoCodes({ onLogout, theme, toggleTheme }: Props) {
    const [codes, setCodes] = useState<CodePromo[]>([]);
    const [transporteurs, setTransporteurs] = useState<Transporteur[]>([]);
    const [chargement, setChargement] = useState(true);
    const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
    const [envoi, setEnvoi] = useState(false);

    const charger = async () => {
        setChargement(true);
        try {
            const api = new ApiService();
            const [c, t] = await Promise.all([api.getData("v3/admin/transport/promo-codes"), api.getData("v3/admin/transport/operators")]);
            if (c.data.success) setCodes(c.data.data);
            else toast.error(c.data.message || "Chargement impossible");
            if (t.data.success) setTransporteurs(t.data.data);
        } catch {
            toast.error("Connexion au serveur impossible");
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => { charger(); }, []);

    const changer = <K extends keyof Brouillon>(cle: K, valeur: Brouillon[K]) => setBrouillon((b) => (b ? { ...b, [cle]: valeur } : b));

    const envoyer = async (url: string, corps: Record<string, unknown>, succes: string) => {
        try {
            const { data } = await new ApiService().postData(url, corps);
            if (data.success) {
                toast.success(succes);
                return true;
            }
            const details = data.data && typeof data.data === "object" ? Object.values(data.data as Record<string, string[]>).flat()[0] : null;
            toast.error(details || data.message || "Enregistrement refusé");
        } catch {
            toast.error("Connexion au serveur impossible");
        }
        return false;
    };

    const enregistrer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!brouillon) return;
        setEnvoi(true);
        const corps = {
            code: brouillon.code.trim(),
            description: brouillon.description.trim() || null,
            type: brouillon.type,
            value: Number(brouillon.value),
            max_discount: brouillon.type === "percent" ? nombreOuNul(brouillon.max_discount) : null,
            min_amount: nombreOuNul(brouillon.min_amount) ?? 0,
            mode: brouillon.mode || null,
            operator_id: brouillon.operator_id || null,
            starts_at: brouillon.starts_at || null,
            ends_at: brouillon.ends_at || null,
            max_uses: nombreOuNul(brouillon.max_uses),
            max_uses_per_user: Number(brouillon.max_uses_per_user || 1),
            show_in_app: brouillon.show_in_app,
        };
        const ok = await envoyer(
            brouillon.id ? `v3/admin/transport/promo-codes/${brouillon.id}` : "v3/admin/transport/promo-codes",
            corps,
            brouillon.id ? "Code promo modifié" : "Code promo créé",
        );
        setEnvoi(false);
        if (ok) {
            setBrouillon(null);
            charger();
        }
    };

    const basculer = async (c: CodePromo, champ: "is_active" | "show_in_app") => {
        const libelle = champ === "is_active" ? (c.is_active ? "Code désactivé" : "Code activé") : (c.show_in_app ? "Code retiré de l'application" : "Code affiché dans l'application");
        if (await envoyer(`v3/admin/transport/promo-codes/${c.id}`, { [champ]: !c[champ] }, libelle)) charger();
    };

    const modifier = (c: CodePromo) => setBrouillon({
        id: c.id,
        code: c.code,
        description: c.description ?? "",
        type: c.type,
        value: String(c.value),
        max_discount: c.max_discount ? String(c.max_discount) : "",
        min_amount: c.min_amount ? String(c.min_amount) : "",
        mode: c.mode ?? "",
        operator_id: c.operator_id ?? "",
        starts_at: versChamp(c.starts_at),
        ends_at: versChamp(c.ends_at),
        max_uses: c.max_uses ? String(c.max_uses) : "",
        max_uses_per_user: String(c.max_uses_per_user),
        show_in_app: c.show_in_app,
    });

    const conditions = (c: CodePromo) => [
        c.type === "percent" && c.max_discount ? `jusqu'à ${fcfa(c.max_discount)}` : null,
        c.min_amount > 0 ? `dès ${fcfa(c.min_amount)} de billets` : null,
        c.mode ? (c.mode === "train" ? "train seulement" : "bus seulement") : null,
        c.operator_name ? `chez ${c.operator_name}` : null,
        c.ends_at ? `jusqu'au ${new Date(c.ends_at.replace(" ", "T")).toLocaleDateString("fr-FR")}` : null,
    ].filter(Boolean).join(" · ") || "Sur tous les billets";

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header>
                <div className="px-8 py-6 max-w-7xl mx-auto flex flex-wrap items-end gap-4">
                    <div className="mr-auto">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Codes promo transport</h1>
                        <p className="text-sm text-slate-500 mt-1 max-w-3xl">
                            Offerts par Ongo, sur les billets seulement : les frais de service se paient toujours. La remise sort du compte Ongo ; le transporteur touche le prix plein et ne voit pas le code.
                        </p>
                    </div>
                    {!brouillon && <Button variant="primary" onClick={() => setBrouillon({ ...VIDE })}><Plus className="size-4" /> Nouveau code</Button>}
                </div>
            </header>

            <div className="px-8 pb-10 max-w-7xl mx-auto flex flex-col gap-4">
                {brouillon && (
                    <form onSubmit={enregistrer} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 grid gap-4 md:grid-cols-3">
                        <h3 className="md:col-span-3 text-base font-bold">{brouillon.id ? `Modifier ${brouillon.code}` : "Nouveau code promo"}</h3>
                        <label className="flex flex-col gap-1.5"><span className={etiquette}>Code</span>
                            <Input required value={brouillon.code} onChange={(e) => changer("code", e.target.value.toUpperCase())} placeholder="Lettres et chiffres, sans espace" />
                        </label>
                        <label className="flex flex-col gap-1.5 md:col-span-2"><span className={etiquette}>Description (interne)</span>
                            <Input value={brouillon.description} onChange={(e) => changer("description", e.target.value)} placeholder="À quoi sert ce code" />
                        </label>
                        <label className="flex flex-col gap-1.5"><span className={etiquette}>Remise</span>
                            <Select value={brouillon.type} onChange={(e) => changer("type", e.target.value as Brouillon["type"])}>
                                <option value="percent">En pourcentage</option>
                                <option value="fixed">Montant fixe</option>
                            </Select>
                        </label>
                        <label className="flex flex-col gap-1.5"><span className={etiquette}>{brouillon.type === "percent" ? "Pourcentage" : "Montant (F)"}</span>
                            <Input type="number" min={1} max={brouillon.type === "percent" ? 100 : undefined} required value={brouillon.value} onChange={(e) => changer("value", e.target.value)} />
                        </label>
                        {brouillon.type === "percent" ? (
                            <label className="flex flex-col gap-1.5"><span className={etiquette}>Remise maximale (F)</span>
                                <Input type="number" min={1} value={brouillon.max_discount} onChange={(e) => changer("max_discount", e.target.value)} placeholder="Sans plafond" />
                            </label>
                        ) : <div />}
                        <label className="flex flex-col gap-1.5"><span className={etiquette}>Billets minimum (F)</span>
                            <Input type="number" min={0} value={brouillon.min_amount} onChange={(e) => changer("min_amount", e.target.value)} placeholder="Aucun minimum" />
                        </label>
                        <label className="flex flex-col gap-1.5"><span className={etiquette}>Mode</span>
                            <Select value={brouillon.mode} onChange={(e) => changer("mode", e.target.value as Brouillon["mode"])}>
                                <option value="">Bus et train</option>
                                <option value="bus">Bus seulement</option>
                                <option value="train">Train seulement</option>
                            </Select>
                        </label>
                        <label className="flex flex-col gap-1.5"><span className={etiquette}>Transporteur</span>
                            <Select value={brouillon.operator_id} onChange={(e) => changer("operator_id", e.target.value)}>
                                <option value="">Tous les transporteurs</option>
                                {transporteurs.map((t) => <option key={t.short_id} value={t.short_id}>{t.name}</option>)}
                            </Select>
                        </label>
                        <label className="flex flex-col gap-1.5"><span className={etiquette}>Début</span>
                            <Input type="datetime-local" value={brouillon.starts_at} onChange={(e) => changer("starts_at", e.target.value)} />
                        </label>
                        <label className="flex flex-col gap-1.5"><span className={etiquette}>Fin</span>
                            <Input type="datetime-local" value={brouillon.ends_at} onChange={(e) => changer("ends_at", e.target.value)} />
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="flex flex-col gap-1.5"><span className={etiquette}>Utilisations max.</span>
                                <Input type="number" min={1} value={brouillon.max_uses} onChange={(e) => changer("max_uses", e.target.value)} placeholder="Illimité" />
                            </label>
                            <label className="flex flex-col gap-1.5"><span className={etiquette}>Par personne</span>
                                <Input type="number" min={1} max={100} required value={brouillon.max_uses_per_user} onChange={(e) => changer("max_uses_per_user", e.target.value)} />
                            </label>
                        </div>
                        <label className="md:col-span-3 flex items-center gap-2 text-sm">
                            <input type="checkbox" className="size-4 accent-primary" checked={brouillon.show_in_app} onChange={(e) => changer("show_in_app", e.target.checked)} />
                            Afficher dans l'application, sur les départs où il s'applique (comme sur Ongo Eat). Décoché, le code reste valable pour qui le connaît.
                        </label>
                        <div className="md:col-span-3 flex justify-end gap-2">
                            <Button type="button" onClick={() => setBrouillon(null)}>Annuler</Button>
                            <Button type="submit" variant="primary" disabled={envoi}>{envoi ? "Enregistrement…" : "Enregistrer"}</Button>
                        </div>
                    </form>
                )}

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[820px]">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className={entete}>Code</th><th className={entete}>Remise</th><th className={entete}>Conditions</th><th className={entete}>Utilisations</th><th className={entete}>État</th><th className={`${entete} text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {chargement ? (
                                    <tr><td colSpan={6} className="py-10"><Loading /></td></tr>
                                ) : codes.length === 0 ? (
                                    <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-500">Aucun code promo pour l'instant.</td></tr>
                                ) : codes.map((c) => (
                                    <tr key={c.id}>
                                        <td className="px-4 py-3">
                                            <p className="font-mono font-bold tracking-wide">{c.code}</p>
                                            {c.description && <p className="text-[11px] text-slate-500">{c.description}</p>}
                                        </td>
                                        <td className="px-4 py-3"><span className="inline-flex rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-2.5 py-1 text-sm font-bold">{c.badge}</span></td>
                                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{conditions(c)}</td>
                                        <td className="px-4 py-3 text-sm">{c.uses}{c.max_uses ? ` / ${c.max_uses}` : ""}<span className="block text-[11px] text-slate-500">{c.max_uses_per_user} par personne</span></td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.in_force ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                                                {c.in_force ? "En vigueur" : c.is_active ? "Hors période ou épuisé" : "Désactivé"}
                                            </span>
                                            {!c.show_in_app && <span className="block text-[11px] text-slate-500 mt-1">Non affiché dans l'application</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end">
                                                <ActionsMenu items={[
                                                    { label: "Modifier", icon: "edit", onClick: () => modifier(c) },
                                                    { label: c.show_in_app ? "Ne plus afficher dans l'app" : "Afficher dans l'app", icon: c.show_in_app ? "visibility_off" : "visibility", onClick: () => basculer(c, "show_in_app") },
                                                    { label: c.is_active ? "Désactiver" : "Activer", icon: c.is_active ? "block" : "check_circle", danger: c.is_active, separatorBefore: true, onClick: () => basculer(c, "is_active") },
                                                ]} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
