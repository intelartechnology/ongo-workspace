import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function CoursePrintPage() {
    const { id } = useParams<{ id: string }>();
    const [course, setCourse] = useState<any>(null);

    useEffect(() => {
        const stored = sessionStorage.getItem(`course_detail_${id}`);
        if (stored) {
            try {
                const data = JSON.parse(stored);
                setCourse(data);
            } catch {
                console.error("Failed to parse course data");
            }
        }
    }, [id]);

    // Auto-print once course data is loaded
    useEffect(() => {
        if (course) {
            const timeout = setTimeout(() => {
                window.print();
            }, 800);
            return () => clearTimeout(timeout);
        }
    }, [course]);

    if (!course) {
        return (
            <div className="p-20 font-sans text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500 font-bold">Préparation de la fiche de course #{id}...</p>
            </div>
        );
    }

    const driver = course.attributions?.[0]?.chauffeurs;
    const vehicle = driver?.vehicules?.[0];

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Inter', sans-serif; background: #fff; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                @media print {
                    @page { size: A4; margin: 15mm; }
                    .no-print { display: none !important; }
                    body { font-size: 11pt; }
                }
                .sheet-container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #eee; position: relative; }
                .header { border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
                .logo-box { display: flex; align-items: center; gap: 15px; }
                .logo-text { font-weight: 900; fontSize: 24px; text-transform: uppercase; letter-spacing: -1px; }
                .stamp { position: absolute; top: 150px; right: 50px; transform: rotate(-15deg); border: 4px solid #1a56db; color: #1a56db; padding: 10px 20px; font-weight: 900; border-radius: 10px; opacity: 0.2; text-transform: uppercase; pointer-events: none; }
                
                .section-title { font-weight: 900; font-size: 14px; text-transform: uppercase; color: #333; margin-bottom: 15px; display: flex; items: center; gap: 8px; border-left: 4px solid #000; padding-left: 10px; }
                .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                .data-item { padding: 8px 0; border-bottom: 1px dashed #ddd; }
                .label { font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; margin-bottom: 3px; }
                .value { font-size: 14px; font-weight: 700; color: #111; }
                
                .amount-box { background: #f8fafc; padding: 25px; border: 2px solid #000; border-radius: 15px; display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
                .amount-label { font-weight: 900; font-size: 16px; }
                .amount-value { font-weight: 900; font-size: 32px; color: #1a56db; }
                
                .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; display: flex; justify-content: space-between; font-size: 10px; color: #999; }
                .sig-box { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 100px; text-align: center; }
                .sig-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 10px; font-size: 11px; font-weight: 700; }
            `}</style>

            <div className="sheet-container">
                <div className="no-print" style={{ position: "fixed", bottom: 20, right: 20, zIndex: 100, display: "flex", gap: 10 }}>
                    <button onClick={() => window.print()} style={{ padding: "12px 24px", background: "#000", color: "#fff", border: "none", borderRadius: 12, fontWeight: 900, cursor: "pointer", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>IMPRIMER</button>
                    <button onClick={() => window.close()} style={{ padding: "12px 24px", background: "#fff", color: "#000", border: "2px solid #000", borderRadius: 12, fontWeight: 900, cursor: "pointer" }}>FERMER</button>
                </div>

                <div className="stamp">{course.statut === 'TERMINEE' ? 'VERIFIÉ' : 'EN COURS'}</div>

                <div className="header">
                    <div className="logo-box">
                        <div style={{ padding: 10, background: "#000", borderRadius: 12 }}>
                            <span style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>O</span>
                        </div>
                        <div>
                            <div className="logo-text">ONGO <span style={{ color: "#1a56db" }}>237</span></div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#666", letterSpacing: 2 }}>FICHE DE COURSE OFFICIELLE</div>
                        </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#888" }}>DOCUMENT REF:</div>
                        <div style={{ fontSize: 20, fontStyle: "italic", fontWeight: 900 }}>#{course.code || course.id}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>Généré le {new Date().toLocaleDateString('fr-FR')}</div>
                    </div>
                </div>

                {/* --- COURSE INFO --- */}
                <div className="section-title">Détails du Trajet</div>
                <div className="data-grid">
                    <div className="data-item">
                        <div className="label">Lieu de Départ</div>
                        <div className="value">{course.lieu_depart}</div>
                    </div>
                    <div className="data-item">
                        <div className="label">Destination</div>
                        <div className="value">{course.lieu_arrive}</div>
                    </div>
                    <div className="data-item">
                        <div className="label">Date & Heure</div>
                        <div className="value">{course.date_depart} à {course.heure_depart}</div>
                    </div>
                    <div className="data-item">
                        <div className="label">Type de Service</div>
                        <div className="value">{course.categorie_vehicule?.libelle || "COURSE STANDARD"}</div>
                    </div>
                </div>

                {/* --- CHAUFFEUR & VEHICULE --- */}
                <div className="section-title">Attribution Chauffeur</div>
                <div className="data-grid">
                    <div className="data-item">
                        <div className="label">Nom du Chauffeur</div>
                        <div className="value">{driver ? `${driver.prenom} ${driver.nom}` : "NON ATTRIBUÉ"}</div>
                    </div>
                    <div className="data-item">
                        <div className="label">Téléphone Chauffeur</div>
                        <div className="value">{driver?.telephone || "—"}</div>
                    </div>
                    <div className="data-item">
                        <div className="label">Véhicule / Modèle</div>
                        <div className="value">{vehicle?.modele || "—"}</div>
                    </div>
                    <div className="data-item">
                        <div className="label">Immatriculation / Plaque</div>
                        <div className="value" style={{ fontFamily: "monospace", fontSize: 16 }}>{vehicle?.matricule || "—"}</div>
                    </div>
                </div>

                {/* --- CLIENT INFO --- */}
                <div className="section-title">Informations Client</div>
                <div className="data-grid">
                    <div className="data-item">
                        <div className="label">Nom du Client</div>
                        <div className="value">{course.client ? `${course.client.prenom} ${course.client.nom}` : "ANONYME"}</div>
                    </div>
                    <div className="data-item">
                        <div className="label">Contact Client</div>
                        <div className="value">{course.client?.telephone || "—"}</div>
                    </div>
                </div>

                {/* --- FINANCIALS --- */}
                <div className="amount-box">
                    <div>
                        <div className="amount-label text-gray-500 uppercase tracking-widest text-[10px]">TOTAL À PERCEVOIR</div>
                        <div style={{ fontWeight: 800 }}>Règlement par {course.transaction_type || "ESPESES"}</div>
                    </div>
                    <div className="amount-value">
                        {course.montant.toLocaleString()} <span style={{ fontSize: 16 }}>FCFA</span>
                    </div>
                </div>

                <div className="sig-box">
                    <div className="sig-line">VISA PARTENAIRE / AGENCE</div>
                    <div className="sig-line">SIGNATURE CHAUFFEUR</div>
                </div>

                <div className="footer">
                    <div>Ongo 237 S.A.R.L - Yaoundé, Cameroun</div>
                    <div>Page 1 sur 1 - ID: {id}</div>
                    <div style={{ fontWeight: 900 }}>DOCUMENT AUTHENTIQUE</div>
                </div>
            </div>
        </>
    );
}
