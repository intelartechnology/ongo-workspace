import React from 'react';

/**
 * Le texte de Claude, mis en forme sans HTML : paragraphes, listes, titres
 * courts et gras. Rien n'est injecté tel quel dans la page.
 */
const enLigne = (texte: string): React.ReactNode[] =>
    texte.split(/(\*\*[^*]+\*\*)/g).map((morceau, i) =>
        morceau.startsWith('**') && morceau.endsWith('**') && morceau.length > 4
            ? <strong key={i} className="font-semibold text-slate-900 dark:text-white">{morceau.slice(2, -2)}</strong>
            : <React.Fragment key={i}>{morceau}</React.Fragment>,
    );

const Texte: React.FC<{ texte: string }> = ({ texte }) => {
    const blocs: React.ReactNode[] = [];
    let liste: { ordonnee: boolean; items: string[] } | null = null;

    const fermerListe = () => {
        if (!liste) return;
        const Balise = liste.ordonnee ? 'ol' : 'ul';
        blocs.push(
            <Balise key={blocs.length} className={`${liste.ordonnee ? 'list-decimal' : 'list-disc'} space-y-1 pl-5`}>
                {liste.items.map((item, i) => <li key={i}>{enLigne(item)}</li>)}
            </Balise>,
        );
        liste = null;
    };

    for (const brute of texte.split('\n')) {
        const ligne = brute.trimEnd();
        const puce = ligne.match(/^\s*[-*•]\s+(.*)$/);
        const numero = ligne.match(/^\s*\d+[.)]\s+(.*)$/);
        const titre = ligne.match(/^#{1,4}\s+(.*)$/);

        if (puce || numero) {
            const ordonnee = Boolean(numero);
            if (liste && liste.ordonnee !== ordonnee) fermerListe();
            liste ??= { ordonnee, items: [] };
            liste.items.push((puce ?? numero)![1]);
            continue;
        }

        fermerListe();

        if (titre) {
            blocs.push(<p key={blocs.length} className="pt-1 font-bold text-slate-900 dark:text-white">{enLigne(titre[1])}</p>);
        } else if (ligne.trim() !== '') {
            blocs.push(<p key={blocs.length}>{enLigne(ligne)}</p>);
        }
    }
    fermerListe();

    return <div className="space-y-2 text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">{blocs}</div>;
};

export default Texte;
