/**
 * Le ticket de caisse, au format des imprimantes thermiques (80 mm).
 *
 * Imprimé depuis un cadre caché plutôt qu'une nouvelle fenêtre : au comptoir,
 * un bloqueur de fenêtres qui avale le ticket, c'est un client qui attend.
 */

export interface EnTeteBoutique {
    name: string;
    address: string | null;
    city: string | null;
    phone: string | null;
}

export interface VenteImprimable {
    ticket_number: number;
    created_at: string;
    dining_mode: "dine_in" | "takeaway";
    table_number: string | null;
    customer_name: string | null;
    total: number;
    payment_method: "cash" | "mobile_money" | "card";
    amount_received: number | null;
    change_given: number | null;
    note: string | null;
    seller: string | null;
    canceled_at: string | null;
    items: { name: string; unit_price: number; quantity: number; options: string[]; line_total: number; note: string | null }[];
}

export const MODES_DE_PAIEMENT: Record<VenteImprimable["payment_method"], string> = {
    cash: "Espèces",
    mobile_money: "Mobile money",
    card: "Carte bancaire",
};

export const francs = (montant: number) => `${(montant ?? 0).toLocaleString("fr-FR")} F`;

const echapper = (texte: string | null | undefined) =>
    (texte ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** « 4 » devient « Table 4 » ; « Terrasse 2 » ou « Table 2 » restent tels quels. */
export const nomDeTable = (table: string) => (/^\d+$/.test(table.trim()) ? `Table ${table.trim()}` : table.trim());

export const lieuDeLaVente = (v: Pick<VenteImprimable, "dining_mode" | "table_number">) =>
    v.dining_mode === "takeaway" ? "À emporter" : v.table_number ? `Sur place · ${nomDeTable(v.table_number)}` : "Sur place";

export function imprimerTicket(vente: VenteImprimable, boutique: EnTeteBoutique) {
    const date = new Date(vente.created_at);
    const lignes = vente.items.map((l) => `
        <tr><td class="qte">${l.quantity}</td><td>${echapper(l.name)}</td><td class="mt">${francs(l.line_total)}</td></tr>
        ${l.options.map((o) => `<tr class="detail"><td></td><td colspan="2">+ ${echapper(o)}</td></tr>`).join("")}
        ${l.quantity > 1 ? `<tr class="detail"><td></td><td colspan="2">${francs(l.unit_price)} l'unité</td></tr>` : ""}
        ${l.note ? `<tr class="detail"><td></td><td colspan="2">« ${echapper(l.note)} »</td></tr>` : ""}
    `).join("");

    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Ticket ${vente.ticket_number}</title><style>
        @page { size: 80mm auto; margin: 0; }
        * { box-sizing: border-box; }
        body { width: 80mm; margin: 0; padding: 4mm 5mm 8mm; font-family: "Courier New", monospace; font-size: 12px; color: #000; }
        .c { text-align: center; } .b { font-weight: bold; }
        h1 { font-size: 16px; margin: 0 0 2px; text-align: center; }
        p { margin: 1px 0; }
        hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 1px 0; vertical-align: top; }
        .qte { width: 7mm; } .mt { text-align: right; white-space: nowrap; padding-left: 2mm; }
        .detail td { font-size: 11px; }
        .total td { font-size: 15px; font-weight: bold; padding-top: 3px; }
        .annule { border: 2px solid #000; text-align: center; font-weight: bold; font-size: 16px; padding: 3px; margin: 6px 0; }
    </style></head><body>
        <h1>${echapper(boutique.name)}</h1>
        ${boutique.address ? `<p class="c">${echapper(boutique.address)}${boutique.city ? `, ${echapper(boutique.city)}` : ""}</p>` : boutique.city ? `<p class="c">${echapper(boutique.city)}</p>` : ""}
        ${boutique.phone ? `<p class="c">Tél. ${echapper(boutique.phone)}</p>` : ""}
        <hr>
        <p class="b">Ticket n° ${vente.ticket_number}</p>
        <p>${date.toLocaleDateString("fr-FR")} à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
        <p>${lieuDeLaVente(vente)}</p>
        ${vente.customer_name ? `<p>Client : ${echapper(vente.customer_name)}</p>` : ""}
        ${vente.seller ? `<p>Caissier : ${echapper(vente.seller)}</p>` : ""}
        ${vente.canceled_at ? `<div class="annule">VENTE ANNULÉE</div>` : ""}
        <hr>
        <table>${lignes}</table>
        <hr>
        <table>
            <tr class="total"><td>TOTAL</td><td class="mt">${francs(vente.total)}</td></tr>
            <tr><td>Payé par</td><td class="mt">${MODES_DE_PAIEMENT[vente.payment_method]}</td></tr>
            ${vente.amount_received !== null ? `<tr><td>Reçu</td><td class="mt">${francs(vente.amount_received)}</td></tr>` : ""}
            ${vente.change_given !== null ? `<tr><td>Rendu</td><td class="mt">${francs(vente.change_given)}</td></tr>` : ""}
        </table>
        ${vente.note ? `<hr><p>${echapper(vente.note)}</p>` : ""}
        <hr>
        <p class="c">Merci de votre visite</p>
    </body></html>`;

    const cadre = document.createElement("iframe");
    cadre.setAttribute("aria-hidden", "true");
    cadre.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(cadre);

    const doc = cadre.contentDocument;
    if (!doc || !cadre.contentWindow) {
        cadre.remove();
        return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    // Le cadre se retire après l'impression ; une minute au plus, si le
    // navigateur ne prévient pas.
    const retirer = () => setTimeout(() => cadre.remove(), 500);
    cadre.contentWindow.addEventListener("afterprint", retirer);
    setTimeout(() => cadre.remove(), 60000);

    cadre.contentWindow.focus();
    cadre.contentWindow.print();
}
