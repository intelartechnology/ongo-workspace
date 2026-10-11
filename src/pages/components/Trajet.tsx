import React from 'react';

interface TrajetProps {
    depart?: string | null;
    arrivee?: string | null;
    /** Largeur maximale des libellés. Au-delà, l'adresse est coupée. */
    largeur?: string;
}

/**
 * Un trajet : d'où l'on part, où l'on va, reliés par un trait.
 *
 * **Le même dessin que les cartes de covoiturage de l'application.** Un anneau
 * pour le départ, un disque plein pour l'arrivée, et un filet vertical entre
 * les deux : on voit la route avant de lire les adresses.
 *
 * Et non « Départ → Arrivée » sur une ligne : à Yaoundé, deux adresses tiennent
 * rarement dans une colonne de tableau, et la flèche se retrouve au milieu
 * d'une chaîne tronquée où l'on ne distingue plus laquelle est laquelle.
 *
 * Écrit une fois, utilisé partout : le tableau de bord, la gestion des courses
 * et les covoiturages montrent le même fait, il doit se lire de la même façon.
 */
const Trajet: React.FC<TrajetProps> = ({ depart, arrivee, largeur = 'max-w-[240px]' }) => (
    <div className="flex items-stretch gap-2.5">
        <div className="flex flex-col items-center pt-[5px]">
            <span className="size-2 shrink-0 rounded-full border-2 border-primary bg-white dark:bg-slate-900" />
            {/* Le filet prend ce qui reste : deux adresses sur deux lignes
                l'allongent, une seule le raccourcit, sans valeur à régler. */}
            <span className="my-1 w-px flex-1 bg-slate-200 dark:bg-slate-700" />
            {/* Pas de vert : le depart et l'arrivee ne sont pas deux etats, ce
                sont deux points d'un meme trajet. La couleur de marque les
                tient ensemble ; l'anneau et le disque disent lequel est lequel. */}
            <span className="mb-[5px] size-2 shrink-0 rounded-full bg-primary" />
        </div>

        <div className={`min-w-0 space-y-1.5 ${largeur}`}>
            <p className="truncate text-[13px] font-medium text-slate-900 dark:text-white" title={depart ?? undefined}>
                {depart || '—'}
            </p>
            <p className="truncate text-[13px] text-slate-600 dark:text-slate-300" title={arrivee ?? undefined}>
                {arrivee || '—'}
            </p>
        </div>
    </div>
);

export default Trajet;
