import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";

/**
 * Où Ongo Eat opère.
 *
 * Une ville absente de cette page n'est pas « vide » pour le client : elle
 * affiche « Ongo Eat n'est pas encore disponible ici », avec un bouton pour
 * changer d'adresse. C'est très différent d'un catalogue vide, qui laisse
 * croire que l'application est en panne.
 *
 * Le pays est au-dessus de la ville parce que la monnaie et l'heure changent
 * avec lui, jamais avec elle. Fermer un pays ferme toutes ses villes d'un
 * coup — c'est le geste qu'on veut le jour où l'on se retire d'un marché.
 */

interface Zone {
    id: number;
    country_id: number;
    name: string;
    latitude: number;
    longitude: number;
    radius_km: number | null;
    is_active: boolean;
}

interface Pays {
    id: number;
    code: string;
    name: string;
    currency: string;
    timezone: string;
    currency_decimals: number;
    is_active: boolean;
    areas: Zone[];
}

interface EatServiceAreasProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

const champ =
    "w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white";

/** Une zone vierge, rattachée au pays sous lequel on a cliqué. */
const zoneVierge = (paysId: number) => ({
    id: 0,
    country_id: paysId,
    name: "",
    latitude: "",
    longitude: "",
    radius_km: "",
    is_active: true,
});

const paysVierge = {
    id: 0,
    code: "",
    name: "",
    currency: "XAF",
    timezone: "Africa/Douala",
    currency_decimals: 0,
    is_active: true,
};

type FormZone = ReturnType<typeof zoneVierge>;
type FormPays = typeof paysVierge;

export default function EatServiceAreas({ onLogout, theme, toggleTheme }: EatServiceAreasProps) {
    const [pays, setPays] = useState<Pays[]>([]);
    const [rayonDefaut, setRayonDefaut] = useState(25);
    const [zone, setZone] = useState<FormZone | null>(null);
    const [fiche, setFiche] = useState<FormPays | null>(null);

    const api = new ApiService();

    const charger = async () => {
        try {
            const { data } = await api.getData("v3/admin/eat/service-areas");
            if (data.success) {
                setPays(data.data?.countries ?? []);
                setRayonDefaut(data.data?.default_radius_km ?? 25);
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Zones illisibles", text: String(erreur) });
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

    const enregistrerZone = async () => {
        if (!zone) return;

        const url = zone.id ? `v3/admin/eat/service-areas/${zone.id}` : "v3/admin/eat/service-areas";

        const { data } = await api.postData(url, {
            country_id: zone.country_id,
            name: zone.name,
            latitude: zone.latitude,
            longitude: zone.longitude,
            // Un champ vide vaut « prends le rayon général », pas « zéro ».
            radius_km: zone.radius_km === "" ? null : zone.radius_km,
            is_active: zone.is_active,
        });

        if (echec(data)) return;

        setZone(null);
        charger();
    };

    const enregistrerPays = async () => {
        if (!fiche) return;

        const url = fiche.id ? `v3/admin/eat/countries/${fiche.id}` : "v3/admin/eat/countries";

        const { data } = await api.postData(url, {
            code: fiche.code,
            name: fiche.name,
            currency: fiche.currency,
            timezone: fiche.timezone,
            currency_decimals: fiche.currency_decimals,
            is_active: fiche.is_active,
        });

        if (echec(data)) return;

        setFiche(null);
        charger();
    };

    const basculerZone = async (z: Zone) => {
        if (z.is_active) {
            const reponse = await Swal.fire({
                icon: "question",
                title: `Fermer ${z.name} ?`,
                text: "Les clients de cette ville verront « Ongo Eat n'est pas encore disponible ici ».",
                showCancelButton: true,
                confirmButtonText: "Fermer la ville",
                cancelButtonText: "Annuler",
            });

            if (!reponse.isConfirmed) return;
        }

        const { data } = await api.postData(`v3/admin/eat/service-areas/${z.id}/toggle`, {});
        if (!echec(data)) charger();
    };

    const basculerPays = async (p: Pays) => {
        if (p.is_active) {
            const reponse = await Swal.fire({
                icon: "warning",
                title: `Fermer ${p.name} ?`,
                text: `Les ${p.areas.length} ville(s) de ce pays fermeront avec lui.`,
                showCancelButton: true,
                confirmButtonText: "Fermer le pays",
                cancelButtonText: "Annuler",
            });

            if (!reponse.isConfirmed) return;
        }

        const { data } = await api.postData(`v3/admin/eat/countries/${p.id}/toggle`, {});
        if (!echec(data)) charger();
    };

    const supprimerZone = async (z: Zone) => {
        // Supprimer plutôt que fermer perd les coordonnées : on propose la
        // fermeture, qui se défait, avant la suppression, qui ne se défait pas.
        const reponse = await Swal.fire({
            icon: "warning",
            title: `Supprimer ${z.name} ?`,
            text: "Ses coordonnées seront perdues. Pour une pause, fermez-la plutôt.",
            showCancelButton: true,
            confirmButtonText: "Supprimer",
            cancelButtonText: "Annuler",
        });

        if (!reponse.isConfirmed) return;

        const { data } = await api.postData(`v3/admin/eat/service-areas/${z.id}/delete`, {});
        if (!echec(data)) charger();
    };

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Zones de service</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Où Ongo Eat livre. Hors de ces zones, le client lit « Ongo Eat n'est pas encore disponible ici »
                        plutôt qu'un catalogue vide. Sans rayon propre, une ville prend le rayon général ({rayonDefaut} km).
                    </p>
                </div>
                <button
                    onClick={() => setFiche({ ...paysVierge })}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium shrink-0 dark:bg-white dark:text-slate-900"
                >
                    Ajouter un pays
                </button>
            </header>

            <main className="px-8 py-8 max-w-4xl mx-auto space-y-6">
                {fiche && (
                    <div className="p-5 rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 space-y-3">
                        <p className="font-medium text-slate-900 dark:text-white">
                            {fiche.id ? "Modifier le pays" : "Nouveau pays"}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                                <span className="text-xs font-semibold uppercase text-slate-500">Nom</span>
                                <input
                                    className={champ}
                                    value={fiche.name}
                                    placeholder="Côte d'Ivoire"
                                    onChange={(e) => setFiche({ ...fiche, name: e.target.value })}
                                />
                            </label>
                            <label className="block">
                                <span className="text-xs font-semibold uppercase text-slate-500">Code ISO</span>
                                <input
                                    className={champ}
                                    value={fiche.code}
                                    maxLength={2}
                                    placeholder="CI"
                                    onChange={(e) => setFiche({ ...fiche, code: e.target.value.toUpperCase() })}
                                />
                            </label>
                            <label className="block">
                                <span className="text-xs font-semibold uppercase text-slate-500">Monnaie</span>
                                <input
                                    className={champ}
                                    value={fiche.currency}
                                    maxLength={3}
                                    placeholder="XOF"
                                    onChange={(e) => setFiche({ ...fiche, currency: e.target.value.toUpperCase() })}
                                />
                            </label>
                            <label className="block">
                                <span className="text-xs font-semibold uppercase text-slate-500">Fuseau horaire</span>
                                <input
                                    className={champ}
                                    value={fiche.timezone}
                                    placeholder="Africa/Abidjan"
                                    onChange={(e) => setFiche({ ...fiche, timezone: e.target.value })}
                                />
                            </label>
                        </div>
                        <p className="text-xs text-slate-400">
                            Le fuseau décide de l'heure à laquelle une boutique ouvre. La monnaie n'est pas encore convertie :
                            elle est enregistrée pour le jour où un second pays sera ouvert.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setFiche(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300">
                                Annuler
                            </button>
                            <button
                                onClick={enregistrerPays}
                                disabled={!fiche.name.trim() || fiche.code.length !== 2}
                                className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 dark:bg-white dark:text-slate-900"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </div>
                )}

                {pays.map((p) => (
                    <section
                        key={p.id}
                        className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                    >
                        <div className="p-5 flex items-start gap-4 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-slate-900 dark:text-white">{p.name}</p>
                                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-800">
                                        {p.code}
                                    </span>
                                    {!p.is_active && (
                                        <span className="text-xs px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                                            fermé
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-500 mt-1">
                                    {p.currency} · {p.timezone}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => setFiche({ ...p })}
                                    className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 dark:border-slate-700"
                                >
                                    Modifier
                                </button>
                                <button
                                    onClick={() => basculerPays(p)}
                                    className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 dark:border-slate-700"
                                >
                                    {p.is_active ? "Fermer" : "Ouvrir"}
                                </button>
                            </div>
                        </div>

                        <div className="p-5 space-y-3">
                            {p.areas.length === 0 && (
                                <p className="text-sm text-slate-400">
                                    Aucune ville. Tant qu'il n'y en a pas, ce pays ne couvre rien.
                                </p>
                            )}

                            {p.areas.map((z) =>
                                zone?.id === z.id ? (
                                    <FormulaireZone
                                        key={z.id}
                                        zone={zone}
                                        setZone={setZone}
                                        enregistrer={enregistrerZone}
                                        rayonDefaut={rayonDefaut}
                                    />
                                ) : (
                                    <div key={z.id} className="flex items-center gap-4 py-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-slate-900 dark:text-white">{z.name}</p>
                                                {!z.is_active && (
                                                    <span className="text-xs px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                                                        fermée
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {z.latitude}, {z.longitude} · rayon {z.radius_km ?? rayonDefaut} km
                                                {z.radius_km === null && " (général)"}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() =>
                                                    setZone({
                                                        ...z,
                                                        latitude: String(z.latitude),
                                                        longitude: String(z.longitude),
                                                        radius_km: z.radius_km === null ? "" : String(z.radius_km),
                                                    } as unknown as FormZone)
                                                }
                                                className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 dark:border-slate-700"
                                            >
                                                Modifier
                                            </button>
                                            <button
                                                onClick={() => basculerZone(z)}
                                                className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 dark:border-slate-700"
                                            >
                                                {z.is_active ? "Fermer" : "Ouvrir"}
                                            </button>
                                            <button
                                                onClick={() => supprimerZone(z)}
                                                className="px-3 py-1.5 rounded-lg text-sm text-rose-600 dark:text-rose-400"
                                            >
                                                Supprimer
                                            </button>
                                        </div>
                                    </div>
                                ),
                            )}

                            {zone?.id === 0 && zone.country_id === p.id ? (
                                <FormulaireZone
                                    zone={zone}
                                    setZone={setZone}
                                    enregistrer={enregistrerZone}
                                    rayonDefaut={rayonDefaut}
                                />
                            ) : (
                                <button
                                    onClick={() => setZone(zoneVierge(p.id))}
                                    className="text-sm text-slate-600 dark:text-slate-300 underline"
                                >
                                    Ajouter une ville
                                </button>
                            )}
                        </div>
                    </section>
                ))}
            </main>
        </MainLayout>
    );
}

/** Le formulaire d'une ville : centre, rayon, état. */
function FormulaireZone({
    zone,
    setZone,
    enregistrer,
    rayonDefaut,
}: {
    zone: FormZone;
    setZone: (z: FormZone | null) => void;
    enregistrer: () => void;
    rayonDefaut: number;
}) {
    return (
        <div className="p-4 rounded-lg border border-slate-300 dark:border-slate-700 space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <label className="block">
                    <span className="text-xs font-semibold uppercase text-slate-500">Ville</span>
                    <input
                        className={champ}
                        value={zone.name}
                        placeholder="Douala"
                        onChange={(e) => setZone({ ...zone, name: e.target.value })}
                    />
                </label>
                <label className="block">
                    <span className="text-xs font-semibold uppercase text-slate-500">Rayon (km)</span>
                    <input
                        className={champ}
                        value={zone.radius_km}
                        placeholder={`${rayonDefaut} (général)`}
                        onChange={(e) => setZone({ ...zone, radius_km: e.target.value })}
                    />
                </label>
                <label className="block">
                    <span className="text-xs font-semibold uppercase text-slate-500">Latitude</span>
                    <input
                        className={champ}
                        value={zone.latitude}
                        placeholder="4.0511"
                        onChange={(e) => setZone({ ...zone, latitude: e.target.value })}
                    />
                </label>
                <label className="block">
                    <span className="text-xs font-semibold uppercase text-slate-500">Longitude</span>
                    <input
                        className={champ}
                        value={zone.longitude}
                        placeholder="9.7679"
                        onChange={(e) => setZone({ ...zone, longitude: e.target.value })}
                    />
                </label>
            </div>
            <p className="text-xs text-slate-400">
                Le centre de la ville, et la distance au-delà de laquelle on ne livre plus. Laissez le rayon vide pour
                suivre le réglage général.
            </p>
            <div className="flex justify-end gap-3">
                <button onClick={() => setZone(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300">
                    Annuler
                </button>
                <button
                    onClick={enregistrer}
                    disabled={!zone.name.trim() || zone.latitude === "" || zone.longitude === ""}
                    className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 dark:bg-white dark:text-slate-900"
                >
                    Enregistrer
                </button>
            </div>
        </div>
    );
}
