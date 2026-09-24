import { useState } from "react";
import MainLayout from "./MainLayout";
import MediaGallery from "./components/MediaGallery";
import { GALERIE_ONGO } from "../services/images";

/**
 * La galerie d'Ongo Eat.
 *
 *   - **Ongo** : les visuels des bannières, campagnes et cuisines, créés par
 *     Ongo. C'est là qu'on importe les images de la régie publicitaire.
 *   - **Marchands** : logos, bannières de boutiques, photos de produits —
 *     chacune rangée chez son marchand.
 *
 * Chaque image dit où elle sert ; une image utilisée ne se supprime pas.
 */

interface EatGalleryProps {
    onLogout: () => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
}

export default function EatGallery({ onLogout, theme, toggleTheme }: EatGalleryProps) {
    const [rayon, setRayon] = useState<"ongo" | "merchants">("ongo");

    return (
        <MainLayout onLogout={onLogout} theme={theme} toggleTheme={toggleTheme}>
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="px-8 py-6 max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Galerie</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Importez, réutilisez, faites le ménage. Une image utilisée ne peut pas être supprimée : la galerie dit où elle sert.
                    </p>
                    <nav className="flex gap-6 mt-5">
                        {([["ongo", "Ongo"], ["merchants", "Marchands"]] as const).map(([cle, libelle]) => (
                            <button
                                key={cle}
                                onClick={() => setRayon(cle)}
                                className={`pb-2 text-sm font-medium border-b-2 ${rayon === cle ? "border-slate-900 text-slate-900 dark:border-white dark:text-white" : "border-transparent text-slate-500"}`}
                            >
                                {libelle}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            <main className="px-8 py-8 max-w-7xl mx-auto">
                {rayon === "merchants" && (
                    <p className="text-sm text-slate-500 mb-4">Les images des marchands s'importent depuis leur espace ou leur fiche boutique : elles y sont rangées chez eux.</p>
                )}
                <MediaGallery key={rayon} galerie={GALERIE_ONGO} owner={rayon} />
            </main>
        </MainLayout>
    );
}
