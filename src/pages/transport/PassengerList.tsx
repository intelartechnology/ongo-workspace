import { useEffect, useState } from "react";
import { Bus, Phone, Printer, TicketCheck, TrainFront, X } from "lucide-react";
import ApiService from "../../services/ApiService";
import Loading from "../../components/Loading";
import { Avatar } from "../../components/ui";
import { fcfa, heureDe, pieceLisible } from "./transportDonnees";
import type { Billet, Depart, ListeVoyageurs, Passage, TrajetBillet } from "./transportDonnees";

interface Props {
    operatorId: string;
    operatorName: string;
    depart: Depart;
    passage: Passage;
    onClose: () => void;
}

const echapper = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/**
 * Les voyageurs d'un départ dans une gare : ceux qui y montent.
 *
 * La liste que l'agent a sous les yeux pour préparer l'embarquement. La photo
 * est celle du titulaire du compte, qu'on reconnaît à la montée ; ses
 * accompagnateurs n'ont que leur nom. Elle s'imprime pour le chauffeur.
 */
export default function PassengerList({ operatorId, operatorName, depart, passage, onClose }: Props) {
    const [liste, setListe] = useState<ListeVoyageurs | null>(null);
    const [erreur, setErreur] = useState<string | null>(null);
    const [billet, setBillet] = useState<Billet | null>(null);

    useEffect(() => {
        let actif = true;
        (async () => {
            try {
                const { data } = await new ApiService().getData(`v3/transport/${operatorId}/departures/${depart.id}/passengers`, { station_id: passage.station_id });
                if (!actif) return;
                if (data.success) setListe(data.data);
                else setErreur(data.message || "Lecture impossible");
            } catch {
                if (actif) setErreur("Connexion au serveur impossible.");
            }
        })();
        return () => { actif = false; };
    }, [operatorId, depart.id, passage.station_id]);

    useEffect(() => {
        // Échap ferme d'abord le billet ouvert, puis la liste.
        const fermer = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            if (billet) setBillet(null);
            else onClose();
        };
        window.addEventListener("keydown", fermer);
        return () => window.removeEventListener("keydown", fermer);
    }, [onClose, billet]);

    const titre = `${heureDe(passage.passes_at)} ${depart.class.name} → ${depart.line.destination}`;

    const imprimer = () => {
        if (!liste) return;
        const lignes = liste.list.flatMap((r) => r.passengers.map((p, i) => `<tr><td>${i === 0 ? echapper(r.code) : ""}</td><td>${echapper(p.full_name)}${p.is_account_holder ? " (titulaire)" : ""}</td><td>${echapper(pieceLisible(p))}</td><td>${i === 0 ? echapper(r.phone ?? "") : ""}</td><td>${i === 0 && r.is_return ? "retour" : ""}</td><td class="case"></td></tr>`)).join("");
        const fenetre = window.open("", "_blank", "width=900,height=700");
        if (!fenetre) return;
        fenetre.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${echapper(titre)}</title><style>
            body{font-family:Arial,sans-serif;margin:24px;color:#0f172a} h1{font-size:20px;margin:0} p{margin:4px 0 16px;color:#475569}
            table{width:100%;border-collapse:collapse;font-size:14px} th,td{border:1px solid #cbd5e1;padding:8px;text-align:left} th{background:#f1f5f9}
            .case{width:70px}</style></head><body>
            <h1>${echapper(operatorName)} · ${echapper(titre)}</h1>
            <p>${echapper(passage.station_name)} · ${liste.seats} place(s), ${liste.bookings} réservation(s) en ligne · imprimé le ${new Date().toLocaleString("fr-FR")}</p>
            <table><thead><tr><th>Code</th><th>Voyageur</th><th>Pièce d'identité</th><th>Téléphone</th><th></th><th>Monté</th></tr></thead><tbody>${lignes}</tbody></table>
            </body></html>`);
        fenetre.document.close();
        fenetre.focus();
        fenetre.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label={`Voyageurs du ${titre}`}>
            <button aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-slate-900/50" />
            <aside className="relative w-full max-w-[520px] h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
                <header className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="text-xl font-bold">{titre}</p>
                        <p className="text-sm text-slate-500">
                            {passage.station_name}
                            {liste ? ` · ${liste.seats} place${liste.seats > 1 ? "s" : ""} vendue${liste.seats > 1 ? "s" : ""} en ligne, ${liste.bookings} réservation${liste.bookings > 1 ? "s" : ""}` : ""}
                        </p>
                    </div>
                    <button onClick={imprimer} disabled={!liste || liste.list.length === 0} className="h-10 px-3 flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-semibold disabled:opacity-40">
                        <Printer className="size-4" /> Imprimer la liste
                    </button>
                    <button onClick={onClose} title="Fermer" className="size-10 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X className="size-5" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-5">
                    {erreur ? (
                        <p className="text-sm text-rose-700">{erreur}</p>
                    ) : !liste ? (
                        <Loading />
                    ) : liste.list.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-slate-500">
                            <p className="font-semibold text-slate-700 dark:text-slate-200">Aucune réservation en ligne dans cette gare.</p>
                            <p className="mt-1 text-sm">Les voyageurs qui réservent dans l'application Ongo apparaissent ici, avec leur code de billet.</p>
                        </div>
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {liste.list.map((r) => (
                                <li key={r.code} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="size-12 shrink-0 rounded-full overflow-hidden">
                                            <Avatar photo={r.holder_photo} nom={r.passengers[0]?.full_name} className="size-12 rounded-full text-base" />
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-mono text-lg font-bold tracking-wider">{r.code}</p>
                                            <p className="text-xs text-slate-500">
                                                {r.seats} place{r.seats > 1 ? "s" : ""}{r.is_return ? " · retour d'un aller-retour" : r.trip_type === "round_trip" ? " · aller-retour" : ""}
                                                {r.paid_at ? ` · payé à ${heureDe(r.paid_at)}` : ""}
                                            </p>
                                        </div>
                                        {r.phone && <a href={`tel:${r.phone}`} className="text-sm font-semibold text-primary whitespace-nowrap">{r.phone}</a>}
                                    </div>
                                    <div className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm"><span className="text-slate-500">Montant</span> <strong className="text-base">{fcfa(r.amount)}</strong></p>
                                            <p className="text-xs text-slate-500">{r.seats} billet{r.seats > 1 ? "s" : ""} × {fcfa(r.ticket.unit_price)}</p>
                                        </div>
                                        <button onClick={() => setBillet(r.ticket)} className="shrink-0 h-8 px-3 flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-semibold hover:bg-white dark:hover:bg-slate-800">
                                            <TicketCheck className="size-4" /> Voir le billet
                                        </button>
                                    </div>
                                    <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                                        {r.passengers.map((p, i) => (
                                            <li key={i} className="py-1.5 flex items-center gap-2 text-[15px]">
                                                <span className="flex-1 min-w-0">
                                                    <span className="font-medium">{p.full_name}{p.is_account_holder && <span className="ml-2 text-[11px] font-semibold uppercase text-slate-400">titulaire</span>}</span>
                                                    {p.id_number && <span className="block text-xs text-slate-500 font-mono">{pieceLisible(p)}</span>}
                                                </span>
                                                {p.boarded_at && <span className="text-xs font-semibold text-emerald-700">monté à {p.boarded_at}</span>}
                                                {/* Le titulaire est celui qu'on joint : le bouton est sur sa ligne. */}
                                                {p.is_account_holder && r.phone && (
                                                    <a href={`tel:${r.phone}`} title={r.phone} className="shrink-0 h-8 px-3 flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary dark:text-primary-fixed-dim text-sm font-semibold hover:bg-primary/15">
                                                        <Phone className="size-3.5" /> Appeler
                                                    </a>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </aside>

            {billet && <BilletOuvert billet={billet} onClose={() => setBillet(null)} />}
        </div>
    );
}

/** Le billet du voyageur, tel qu'il le reçoit dans l'application. */
function BilletOuvert({ billet, onClose }: { billet: Billet; onClose: () => void }) {
    const Icone = billet.operator.mode === "train" ? TrainFront : Bus;
    const jour = (d: string | null) => (d ? new Date(d.replace(" ", "T")).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : "");
    const confirme = billet.status === "confirmed";

    const trajet = (t: TrajetBillet, titre: string) => (
        <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titre} · <span className="normal-case first-letter:uppercase">{jour(t.boarding.passes_at)}</span> · {t.class}</p>
            <div className="flex gap-3">
                <div className="flex flex-col items-center pt-1.5">
                    <span className="size-2.5 rounded-full border-[2.5px] border-primary" />
                    <span className="w-0.5 flex-1 min-h-6 bg-slate-200 dark:bg-slate-700" />
                    <span className="size-2.5 rounded-full bg-primary" />
                </div>
                <div className="flex-1 flex flex-col gap-3">
                    <div className="flex justify-between gap-2"><span className="font-semibold">{t.boarding.name}{t.boarding.landmark && <span className="block text-xs font-normal text-slate-500">{t.boarding.landmark}</span>}</span><span className="font-bold text-slate-500 tabular-nums">{t.boarding.passes_at ? heureDe(t.boarding.passes_at) : ""}</span></div>
                    <div className="flex justify-between gap-2"><span className="font-semibold">{t.alighting.name}</span><span className="font-bold text-slate-500 tabular-nums">{t.alighting.arrives_at ? heureDe(t.alighting.arrives_at) : ""}</span></div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="dialog" aria-label={`Billet ${billet.code}`}>
            <button aria-label="Fermer le billet" onClick={onClose} className="absolute inset-0 bg-slate-900/60" />
            <div className="relative w-full max-w-[420px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className={`px-5 py-2.5 text-xs font-semibold ${confirme ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"}`}>
                    {confirme ? "Billet confirmé · payé" : "Billet annulé"}
                </div>
                <div className="p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <span className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center"><Icone className="size-5" /></span>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold truncate">{billet.operator.name}</p>
                            <p className="text-xs text-slate-500">{billet.seats} place{billet.seats > 1 ? "s" : ""}{billet.trip_type === "round_trip" ? " · aller-retour" : ""}</p>
                        </div>
                        <button onClick={onClose} title="Fermer" className="size-9 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="size-5" /></button>
                    </div>

                    <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-3 text-center">
                        <p className="text-xs text-slate-500">Code de montée</p>
                        <p className="font-mono text-3xl font-bold tracking-[0.2em]">{billet.code}</p>
                    </div>

                    {billet.outbound && trajet(billet.outbound, "Aller")}
                    {billet.return && trajet(billet.return, "Retour")}

                    <div className="flex flex-col gap-1 border-t border-slate-200 dark:border-slate-800 pt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Voyageurs</p>
                        {billet.passengers.map((p, i) => (
                            <div key={i}>
                                <p className="text-[15px]">{p.full_name}{p.is_account_holder && <span className="ml-2 text-[11px] font-semibold uppercase text-slate-400">titulaire</span>}</p>
                                {p.id_number && <p className="text-xs text-slate-500 font-mono">{pieceLisible(p)}</p>}
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-1 border-t border-slate-200 dark:border-slate-800 pt-3 text-sm">
                        <div className="flex justify-between items-baseline"><span className="text-slate-500">Billets · {billet.seats} × {fcfa(billet.unit_price)}</span><strong className="text-lg text-primary dark:text-primary-fixed-dim">{fcfa(billet.amount)}</strong></div>
                        {billet.paid_at && <p className="text-xs text-slate-500">Payé le {new Date(billet.paid_at.replace(" ", "T")).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
