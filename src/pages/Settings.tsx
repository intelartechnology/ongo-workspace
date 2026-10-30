import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import ImageField from "./components/ImageField";
import { estDetouree } from "../services/images";
import { envoyerSiBesoin } from "../services/images";
import MainLayout from "./MainLayout";
import ApiService from "../services/ApiService";
import Loading from "../components/Loading";
import TarifsCourses from "./components/TarifsCourses";

/**
 * Les réglages de la plateforme.
 *
 * Un taux de commission était jusqu'ici une constante de classe : le changer
 * demandait un déploiement, et il vivait à cinq endroits avec trois valeurs
 * différentes. Il se règle maintenant ici.
 *
 * L'écran ne connaît aucun réglage à l'avance — il affiche ce que l'API lui
 * envoie, avec son libellé, son explication et ses bornes. Un réglage nouveau
 * apparaît donc par le seul fait d'une migration, sans toucher à ce fichier.
 *
 * Les bornes ne sont pas décoratives : une part chauffeur saisie à 8 au lieu
 * de 80 ne se verrait nulle part, sinon sur la fiche de paie d'un chauffeur
 * en fin de mois. Le serveur refuse, et l'écran le dit.
 */

interface Reglage {
    cle: string;
    valeur: string;
    type: string;
    groupe: string;
    libelle: string;
    description: string | null;
    minimum: string | null;
    maximum: string | null;
    updated_at: string | null;
}

interface SettingsProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

/** Ce que valent les groupes techniques, en français. */
const TITRES: Record<string, string> = {
    commission: "Partage des recettes",
    courses: "Attribution des courses",
    boost: "Boost des chauffeurs",
    eat: "Ongo Eat",
    transport: "Transport",
    general: "Général",
};

const EXPLICATIONS: Record<string, string> = {
    commission:
        "Le pourcentage indiqué est ce que garde le prestataire. La plateforme prend le reste — les deux ne peuvent pas diverger.",
    eat: "Les règles de la commande en ligne. Elles s'appliquent à tous les marchands, sauf réglage propre à une boutique.",
    transport: "Les frais de service du bus et du train, fixes et non remboursables.",
    courses: "Qui reçoit une course : jusqu'où on cherche un chauffeur, et lesquels sont tenus pour joignables.",
    boost: "La prime qu'Ongo ajoute à une course difficile à prendre, payée par Ongo et sans commission. Chaque part s'ajoute aux autres ; le total reste plafonné.",
};

/**
 * Les sous-parties d'un groupe, d'après le début des clés.
 *
 * Ongo Eat compte plus de vingt réglages : à la suite, on ne s'y retrouve
 * pas. Une clé qu'aucune règle ne reconnaît tombe dans « Autres réglages »,
 * pour qu'un réglage nouveau reste visible sans toucher à ce fichier.
 */
const SOUS_PARTIES: Record<string, { titre: string; cles: RegExp }[]> = {
    boost: [
        { titre: "Approche longue", cles: /^boost\.approche_/ },
        { titre: "Distance d'approche", cles: /^distance\./ },
    ],
    eat: [
        { titre: "Commandes et zone de service", cles: /^eat\.(acceptance_delay_minutes|search_radius_km)$/ },
        { titre: "Frais de livraison et de service", cles: /^eat\.(delivery\.|service_fee|small_order_)/ },
        { titre: "Espèces et versements", cles: /^eat\.(cash_ceiling\.|payout_delay_days|advance_on_delivery)/ },
        { titre: "Accueil de l'application", cles: /^eat\.(tile_|mosaic_)/ },
        { titre: "Commande à table", cles: /^eat\.dine_in_/ },
    ],
};

const sousParties = (groupe: string, lignes: Reglage[]): { titre: string | null; lignes: Reglage[] }[] => {
    const regles = SOUS_PARTIES[groupe];
    if (!regles) return [{ titre: null, lignes }];

    const parties = regles.map((r) => ({ titre: r.titre as string | null, lignes: lignes.filter((l) => r.cles.test(l.cle)) }));
    const rangees = new Set(parties.flatMap((p) => p.lignes.map((l) => l.cle)));
    parties.push({ titre: "Autres réglages", lignes: lignes.filter((l) => !rangees.has(l.cle)) });

    return parties.filter((p) => p.lignes.length > 0);
};

/**
 * Le premier onglet, avant les groupes envoyés par le serveur. Il porte les
 * tarifs, puis le groupe de réglages du même nom : le rayon d'attribution.
 */
const COURSES = "courses";

export default function Settings({ onLogout, theme, toggleTheme }: SettingsProps) {
    const [groupes, setGroupes] = useState<Record<string, Reglage[]>>({});
    const [brouillon, setBrouillon] = useState<Record<string, string>>({});
    const [chargement, setChargement] = useState<boolean>(true);
    const [enregistrement, setEnregistrement] = useState<string | null>(null);

    /** Les fichiers choisis sur l'ordinateur, pas encore envoyés. */
    const [fichiers, setFichiers] = useState<Record<string, File | null>>({});

    const api = new ApiService();

    // L'onglet est dans l'adresse : une page rechargée ou un lien envoyé
    // ouvre le bon. Un onglet inconnu retombe sur les courses.
    const [parametres, setParametres] = useSearchParams();
    const demande = parametres.get("onglet") ?? COURSES;
    const onglet = demande === COURSES || groupes[demande] || chargement ? demande : COURSES;
    const choisir = (cle: string) => setParametres(cle === COURSES ? {} : { onglet: cle }, { replace: true });

    const charger = async () => {
        setChargement(true);

        try {
            const { data } = await api.getData("v3/admin/settings");

            if (data.success) {
                const recus: Record<string, Reglage[]> = data.data ?? {};
                setGroupes(recus);

                // Le brouillon part de ce que dit le serveur : tant qu'on n'a
                // rien tapé, l'écran montre la vérité.
                const depart: Record<string, string> = {};
                Object.values(recus).forEach((lignes) =>
                    lignes.forEach((ligne) => {
                        depart[ligne.cle] = ligne.valeur;
                    })
                );
                setBrouillon(depart);
            }
        } catch (erreur) {
            Swal.fire({ icon: "warning", title: "Réglages illisibles", text: String(erreur) });
        }

        setChargement(false);
    };

    useEffect(() => {
        charger();
    }, []);

    const enregistrer = async (ligne: Reglage) => {
        let valeur = brouillon[ligne.cle];

        if (valeur === undefined || (valeur === ligne.valeur && !fichiers[ligne.cle])) return;

        setEnregistrement(ligne.cle);

        try {
            // Une image choisie sur l'ordinateur part d'abord dans la
            // galerie : ce qu'on enregistre est toujours une adresse.
            if (ligne.type === "image" || ligne.type === "decoupe") {
                valeur = (await envoyerSiBesoin(fichiers[ligne.cle] ?? null, valeur)) ?? "";
            }

            const { data } = await api.postData("v3/admin/settings", { cle: ligne.cle, valeur });

            if (data.success) {
                await charger();
                Swal.fire({
                    icon: "success",
                    title: "Enregistré",
                    // Une adresse d'image fait une ligne illisible dans une
                    // bulle : le libellé suffit à dire ce qui a été posé.
                    text: ligne.type === "image" || ligne.type === "decoupe"
                        ? ligne.libelle
                        : `${ligne.libelle} : ${valeur}`,
                    timer: 1600,
                    showConfirmButton: false,
                });
            } else {
                // Le serveur dit pourquoi il refuse ; on le répète tel quel.
                Swal.fire({ icon: "error", title: "Refusé", text: data.message });
                setBrouillon((precedent) => ({ ...precedent, [ligne.cle]: ligne.valeur }));
            }
        } catch (erreur) {
            Swal.fire({ icon: "error", title: "Enregistrement impossible", text: String(erreur) });
        }

        setEnregistrement(null);
    };

    // Un fichier fraîchement choisi compte comme une modification : son
    // adresse n'existera qu'une fois envoyé, et le bouton doit être vivant
    // avant cela.
    const modifie = (ligne: Reglage) =>
        (brouillon[ligne.cle] !== undefined && brouillon[ligne.cle] !== ligne.valeur) || Boolean(fichiers[ligne.cle]);

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header>
                <div className="px-8 py-6 max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Réglages</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Ce qui se changeait par un déploiement se change ici. Les valeurs prennent effet en une minute.
                    </p>
                </div>
            </header>

            <div className="px-8 py-6 max-w-7xl mx-auto">
                {/* Un onglet par domaine. Les tarifs des courses en tête : c'est le
                    réglage qui pèse le plus sur chaque course. Les autres suivent les
                    groupes du serveur : un groupe nouveau fait un onglet de plus. */}
                <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800" aria-label="Domaines de réglages">
                    {[COURSES, ...Object.keys(groupes).filter((g) => g !== COURSES)].map((cle) => {
                        const actif = cle === onglet;
                        const nombre = cle === COURSES ? undefined : groupes[cle]?.length;
                        return (
                            <button
                                key={cle}
                                type="button"
                                onClick={() => choisir(cle)}
                                aria-current={actif ? "page" : undefined}
                                className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm transition-colors ${
                                    actif
                                        ? "border-primary font-bold text-primary dark:border-blue-300 dark:text-blue-300"
                                        : "border-transparent font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                {cle === COURSES ? "Courses" : TITRES[cle] ?? cle}
                                {nombre !== undefined && (
                                    <span className={`rounded-full px-2 py-px text-[11px] tabular-nums ${actif ? "bg-primary/10 text-primary dark:bg-blue-300/15 dark:text-blue-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>
                                        {nombre}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {onglet === COURSES && <TarifsCourses />}

                {chargement ? (
                    <Loading />
                ) : (
                    groupes[onglet] && (
                        <section key={onglet} className="mb-10">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {TITRES[onglet] ?? onglet}
                            </h2>

                            {EXPLICATIONS[onglet] && (
                                <p className="text-sm text-slate-500 mt-1 mb-4 max-w-2xl">{EXPLICATIONS[onglet]}</p>
                            )}

                            <div className="flex flex-col gap-6">
                                {sousParties(onglet, groupes[onglet]).map((partie) => (
                                    <div key={partie.titre ?? "tout"}>
                                        {partie.titre && (
                                            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">{partie.titre}</h3>
                                        )}
                                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
                                            {partie.lignes.map((ligne) => (
                                                <div key={ligne.cle} className="p-5 flex items-start gap-6">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-slate-900 dark:text-white">{ligne.libelle}</p>

                                                        {ligne.description && (
                                                            <p className="text-sm text-slate-500 mt-1">{ligne.description}</p>
                                                        )}

                                                        <p className="text-xs text-slate-400 mt-2 font-mono">{ligne.cle}</p>
                                                    </div>

                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="text-right">
                                                            {/*
                                                                Un texte ne se saisit pas dans un champ de
                                                                nombre. La phrase lue par le client dans
                                                                l'application tient sur plusieurs lignes :
                                                                il faut la voir en entier pour la relire.
                                                            */}
                                                            {ligne.type === "decoupe" || ligne.type === "image" ? (
                                                                // Le même champ que les bannières : aperçu,
                                                                // choix dans la galerie, téléversement. Coller
                                                                // une adresse à l'aveugle puis découvrir le
                                                                // résultat sur un téléphone n'est pas une
                                                                // façon de régler une image.
                                                                <div
                                                                    className="w-72 text-left p-2 rounded-lg"
                                                                    style={
                                                                        ligne.type === "decoupe"
                                                                            ? { background: "linear-gradient(150deg,#FBE7C8,#F2D3A4)" }
                                                                            : undefined
                                                                    }
                                                                >
                                                                    <ImageField
                                                                        label=""
                                                                        adresse={brouillon[ligne.cle] ?? ""}
                                                                        fichier={fichiers[ligne.cle] ?? null}
                                                                        forme="aspect-square"
                                                                        onChange={(adresse, fichier) => {
                                                                            setBrouillon((precedent) => ({ ...precedent, [ligne.cle]: adresse }));
                                                                            setFichiers((precedent) => ({ ...precedent, [ligne.cle]: fichier }));
                                                                        }}
                                                                    />
                                                                </div>
                                                            ) : null}

                                                            {/*
                                                              * Dire ce qui est ignoré, et pourquoi.
                                                              *
                                                              * Sans ça, l'image s'affiche ici et pas dans
                                                              * l'application, et personne ne peut relier les
                                                              * deux. L'adresse reste montrée : elle est
                                                              * conservée, elle se récupère et se retravaille.
                                                              */}
                                                            {ligne.type === "decoupe" &&
                                                                (brouillon[ligne.cle] ?? "") !== "" &&
                                                                !fichiers[ligne.cle] &&
                                                                !estDetouree(brouillon[ligne.cle]) && (
                                                                    <div className="mt-2 w-72 text-left p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30">
                                                                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                                                                            Cette image n'est pas affichée
                                                                        </p>
                                                                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                                                            Son fond n'est pas transparent, donc son rectangle se
                                                                            verrait sur la teinte de la tuile. L'application montre
                                                                            le dessin livré à la place. Elle est conservée ici :
                                                                            récupérez-la, détourez-la, et reposez un PNG.
                                                                        </p>
                                                                        <a
                                                                            href={brouillon[ligne.cle]}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="text-xs underline text-amber-800 dark:text-amber-300 break-all mt-2 inline-block"
                                                                        >
                                                                            Ouvrir l'image
                                                                        </a>
                                                                    </div>
                                                                )}

                                                            {ligne.type === "couleur" ? (
                                                                /*
                                                                 * La pastille et le code, cote a cote.
                                                                 *
                                                                 * Le selecteur du navigateur sert a
                                                                 * chercher une teinte ; le champ texte
                                                                 * sert a en coller une qu'on a deja. L'un
                                                                 * sans l'autre oblige soit a deviner un
                                                                 * hexadecimal, soit a viser a la souris une
                                                                 * couleur qu'on connait par coeur.
                                                                 */
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="color"
                                                                        value={/^#[0-9a-fA-F]{6}$/.test(brouillon[ligne.cle] ?? "") ? (brouillon[ligne.cle] as string) : "#FFFFFF"}
                                                                        onChange={(evenement) =>
                                                                            setBrouillon((precedent) => ({
                                                                                ...precedent,
                                                                                [ligne.cle]: evenement.target.value.toUpperCase(),
                                                                            }))
                                                                        }
                                                                        className="h-10 w-12 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent p-1 cursor-pointer"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={brouillon[ligne.cle] ?? ""}
                                                                        onChange={(evenement) =>
                                                                            setBrouillon((precedent) => ({
                                                                                ...precedent,
                                                                                [ligne.cle]: evenement.target.value.toUpperCase(),
                                                                            }))
                                                                        }
                                                                        placeholder="#FBE7C8"
                                                                        spellCheck={false}
                                                                        className="w-28 px-3 py-2 text-left font-mono text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                                    />
                                                                </div>
                                                            ) : ligne.type === "interrupteur" ? (
                                                                // Deux états, pas un nombre à taper : 1 allume, 0 éteint.
                                                                <select
                                                                    value={brouillon[ligne.cle] === "1" ? "1" : "0"}
                                                                    onChange={(evenement) =>
                                                                        setBrouillon((precedent) => ({
                                                                            ...precedent,
                                                                            [ligne.cle]: evenement.target.value,
                                                                        }))
                                                                    }
                                                                    className="w-40 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                                >
                                                                    <option value="1">Activé</option>
                                                                    <option value="0">Désactivé</option>
                                                                </select>
                                                            ) : ligne.type === "texte" ? (
                                                                <textarea
                                                                    rows={4}
                                                                    maxLength={255}
                                                                    value={brouillon[ligne.cle] ?? ""}
                                                                    onChange={(evenement) =>
                                                                        setBrouillon((precedent) => ({
                                                                            ...precedent,
                                                                            [ligne.cle]: evenement.target.value,
                                                                        }))
                                                                    }
                                                                    className="w-96 max-w-full px-3 py-2 text-left rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                                />
                                                            ) : (
                                                                <input
                                                                    type="number"
                                                                    value={brouillon[ligne.cle] ?? ""}
                                                                    onChange={(evenement) =>
                                                                        setBrouillon((precedent) => ({
                                                                            ...precedent,
                                                                            [ligne.cle]: evenement.target.value,
                                                                        }))
                                                                    }
                                                                    className="w-24 px-3 py-2 text-right rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                                />
                                                            )}

                                                            {ligne.type !== "interrupteur" && (ligne.minimum !== null || ligne.maximum !== null) && (
                                                                <p className="text-xs text-slate-400 mt-1">
                                                                    entre {Number(ligne.minimum)} et {Number(ligne.maximum)}
                                                                </p>
                                                            )}
                                                        </div>

                                                        <button
                                                            onClick={() => enregistrer(ligne)}
                                                            disabled={!modifie(ligne) || enregistrement === ligne.cle}
                                                            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white disabled:bg-slate-200 disabled:text-slate-400 dark:bg-primary-container dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
                                                        >
                                                            {enregistrement === ligne.cle ? "…" : "Enregistrer"}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )
                )}
            </div>
        </MainLayout>
    );
}
