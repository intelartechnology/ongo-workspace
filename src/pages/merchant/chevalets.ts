import QRCode from "qrcode";

/**
 * Les chevalets à poser sur les tables : quatre par feuille A4, chacun au
 * format A6, avec le QR code de la table.
 *
 * Imprimés depuis un cadre caché, comme le ticket de caisse : un bloqueur de
 * fenêtres ne doit pas avaler l'impression.
 */

export interface TableImprimable {
    name: string;
    link: string;
}

const echapper = (texte: string) =>
    texte.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

export async function imprimerChevalets(restaurant: string, tables: TableImprimable[]) {
    const cartes = await Promise.all(tables.map(async (t) => {
        const qr = await QRCode.toString(t.link, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0f2f66", light: "#ffffff" } });
        return `<section class="carte">
            <h1>${echapper(restaurant)}</h1>
            <p class="sous">Commandez depuis votre table</p>
            <div class="qr">${qr}</div>
            <p class="table">${echapper(t.name)}</p>
            <ol>
                <li><b>1.</b> Ouvrez l'application Ongo</li>
                <li><b>2.</b> Eat › touchez l'icône de scan</li>
                <li><b>3.</b> Commandez : on vous sert à table</li>
            </ol>
            <p class="pied">Pas encore l'application ? Scannez avec l'appareil photo.</p>
        </section>`;
    }));

    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>QR codes · ${echapper(restaurant)}</title><style>
        @page { size: A4; margin: 8mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #0f172a; }
        .feuille { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
        .carte { height: 136mm; border: 1px dashed #94a3b8; border-radius: 4mm; padding: 7mm 6mm; display: flex; flex-direction: column; align-items: center; text-align: center; break-inside: avoid; }
        h1 { font-size: 18pt; margin: 0; }
        .sous { margin: 2mm 0 4mm; color: #475569; font-size: 11pt; }
        .qr { width: 52mm; height: 52mm; border: 1.2mm solid #0f2f66; border-radius: 4mm; padding: 2mm; }
        .qr svg { width: 100%; height: 100%; display: block; }
        .table { font-size: 26pt; font-weight: 900; color: #0f2f66; margin: 4mm 0 2mm; }
        ol { list-style: none; padding: 0; margin: 0; text-align: left; font-size: 9.5pt; line-height: 1.6; }
        .pied { margin-top: auto; font-size: 8pt; color: #94a3b8; }
    </style></head><body><div class="feuille">${cartes.join("")}</div></body></html>`;

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

    cadre.contentWindow.addEventListener("afterprint", () => setTimeout(() => cadre.remove(), 500));
    setTimeout(() => cadre.remove(), 120000);

    cadre.contentWindow.focus();
    cadre.contentWindow.print();
}
