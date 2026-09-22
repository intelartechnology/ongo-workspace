/**
 * Le ticket d'un code promo, en petit — tel que l'application le dessine.
 *
 * Partagé par les codes d'Ongo et ceux des marchands. Le ticket s'ouvre
 * depuis une bannière d'entrée qui vise le code.
 */

export interface TicketForm {
    code: string;
    type: "percent" | "amount";
    value: string;
    max_discount: string;
    ticket_headline: string;
    ticket_text: string;
    ticket_color: string;
}

/** Ce que le serveur écrit sur le ticket quand rien n'est saisi — même règle. */
export const titreParDefaut = (f: TicketForm) => {
    const n = (v: string) => Number(v || 0).toLocaleString("fr-FR");

    if (f.type === "percent") return f.max_discount ? { surtitre: "Jusqu'à", titre: `−${n(f.max_discount)} CFA` } : { surtitre: null, titre: `−${f.value || 0} %` };

    return { surtitre: null, titre: `−${n(f.value)} CFA` };
};

export default function PromoTicketPreview({ form }: { form: TicketForm }) {
    const defaut = titreParDefaut(form);
    const titre = form.ticket_headline || defaut.titre;
    const surtitre = form.ticket_headline ? null : defaut.surtitre;
    const texte = form.ticket_text || "Déduit des règles du code (première commande, panier minimum, date de fin…).";

    return (
        <div className="relative mx-auto rounded-[28px] text-white text-center overflow-hidden" style={{ width: 220, height: 366, background: form.ticket_color || "#FF1A1A" }}>
            <div className="absolute inset-x-4 top-0 flex flex-col items-center justify-center" style={{ height: 241 }}>
                {surtitre && <p className="text-xl font-black uppercase leading-none">{surtitre}</p>}
                <p className="text-4xl font-black uppercase leading-tight tracking-tight">{titre}</p>
                <p className="mt-2 text-[11px] font-semibold leading-snug">{texte}</p>
            </div>
            <span className="absolute -left-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900" style={{ top: 225 }} />
            <span className="absolute -right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900" style={{ top: 225 }} />
            <div className="absolute inset-x-8 flex justify-between" style={{ top: 236 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                    <span key={i} className="w-2 h-2 rounded-full bg-slate-100 dark:bg-slate-900" />
                ))}
            </div>
            <div className="absolute inset-x-4 bottom-0 flex flex-col items-center justify-center" style={{ top: 250 }}>
                <p className="text-xs">code promo</p>
                <p className="text-3xl font-black uppercase tracking-tight">{form.code || "CODE"}</p>
            </div>
        </div>
    );
}
