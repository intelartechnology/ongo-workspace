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
            const timeout = setTimeout(() => window.print(), 400);
            return () => clearTimeout(timeout);
        }
    }, [course]);

    if (!course) {
        return (
            <div style={{ padding: 40, fontFamily: "Inter, sans-serif", color: "#333" }}>
                <p>Données introuvables pour la course #{id}.</p>
            </div>
        );
    }

    const paidLabel = course.is_paid
        ? course.transaction_type === "CASH"
            ? "CASH"
            : "PAYÉ"
        : "NON PAYÉ";

    return (
        <>
            {/* Print-only global styles */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Inter', sans-serif; background: #fff; color: #111; }
                @media print {
                    @page { size: A4; margin: 18mm; }
                    .no-print { display: none !important; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #e5e7eb; padding: 8px 12px; font-size: 13px; text-align: left; }
                th { background: #f8fafc; font-weight: 700; color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: .04em; }
            `}</style>

            <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px" }}>

                {/* Print button — hidden during actual print */}
                <div className="no-print" style={{ marginBottom: 20, display: "flex", gap: 10 }}>
                    <button
                        onClick={() => window.print()}
                        style={{
                            padding: "8px 18px", background: "#137fec", color: "#fff",
                            border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 6
                        }}
                    >
                        🖨️ Imprimer / Exporter PDF
                    </button>
                    <button
                        onClick={() => window.close()}
                        style={{
                            padding: "8px 18px", background: "#f1f5f9", color: "#475569",
                            border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer"
                        }}
                    >
                        Fermer
                    </button>
                </div>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, paddingBottom: 20, borderBottom: "2px solid #137fec" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                            <img src="/logo.png" alt="Ongo 237" style={{ height: 40, width: "auto", objectFit: "contain" }} />
                            <div>
                                <div style={{ fontWeight: 900, fontSize: 18, color: "#137fec" }}>Ongo 237</div>
                                <div style={{ fontSize: 11, color: "#94a3b8" }}>Super Admin Dashboard</div>
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 900, fontSize: 22 }}>Course #{course.id}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                            {course.date_depart} — {course.heure_depart}
                        </div>
                        <div style={{
                            display: "inline-block", marginTop: 6, padding: "2px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                            background: course.statut === "ANNULEE" ? "#fee2e2" : course.statut === "TERMINEE" ? "#dcfce7" : "#dbeafe",
                            color: course.statut === "ANNULEE" ? "#dc2626" : course.statut === "TERMINEE" ? "#16a34a" : "#2563eb",
                        }}>
                            {course.statut}
                        </div>
                    </div>
                </div>

                {/* ── Section 1: Course Info ── */}
                <Section title="Informations sur la Course">
                    <TwoCol>
                        <Field label="Code" value={course.code} />
                        <Field label="Type" value={course.type || "COURSE"} />
                        <Field label="Catégorie" value={course.categorie_vehicule?.libelle || "N/A"} />
                        <Field label="Statut" value={course.statut} />
                        <Field label="Date départ" value={course.date_depart} />
                        <Field label="Heure départ" value={course.heure_depart} />
                    </TwoCol>
                </Section>

                {/* ── Section 2: Itinerary ── */}
                <Section title="Itinéraire">
                    <TwoCol>
                        <Field label="🟢 Lieu de départ" value={course.lieu_depart} />
                        <Field label="🔴 Lieu d'arrivée" value={course.lieu_arrive} />
                    </TwoCol>
                </Section>

                {/* ── Section 3: Payment ── */}
                <Section title="Paiement">
                    <TwoCol>
                        <Field label="Montant" value={`${course.montant} Fcfa`} highlight />
                        <Field label="Statut paiement" value={paidLabel} />
                        <Field label="Mode de paiement" value={course.transaction_type || "N/A"} />
                    </TwoCol>
                </Section>

                {/* ── Section 4: Client ── */}
                <Section title="Client">
                    <TwoCol>
                        <Field label="ID" value={course.client?.id || "—"} />
                        <Field
                            label="Nom complet"
                            value={course.client ? `${course.client.prenom} ${course.client.nom}` : "Inconnu"}
                        />
                        <Field label="Téléphone" value={course.client?.telephone || "—"} />
                        <Field label="Email" value={course.client?.email || "—"} />
                    </TwoCol>
                </Section>

                {/* ── Section 5: Attributions / Chauffeurs ── */}
                <Section title={`Attributions / Chauffeurs (${course.attributions?.length || 0})`}>
                    {course.attributions?.length > 0 ? (
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Chauffeur</th>
                                    <th>Téléphone</th>
                                    <th>Véhicule</th>
                                    <th>Matricule</th>
                                    <th>Solde</th>
                                    <th>Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                {course.attributions.map((attr: any) => {
                                    const balance = attr.chauffeurs?.balance ?? 0;
                                    return (
                                        <tr key={attr.id}>
                                            <td>{attr.chauffeurs?.id}</td>
                                            <td>{attr.chauffeurs?.prenom} {attr.chauffeurs?.nom}</td>
                                            <td>{attr.chauffeurs?.telephone || "—"}</td>
                                            <td>{attr.chauffeurs?.vehicules?.[0]?.modele || "—"}</td>
                                            <td>{attr.chauffeurs?.vehicules?.[0]?.matricule || "—"}</td>
                                            <td style={{ color: balance < 0 ? "#dc2626" : "#16a34a", fontWeight: 700 }}>
                                                {balance} Fcfa
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                                                    background: attr.statut === "CONFIRMEE" ? "#dcfce7" : "#fee2e2",
                                                    color: attr.statut === "CONFIRMEE" ? "#16a34a" : "#dc2626",
                                                }}>
                                                    {attr.statut}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <p style={{ color: "#94a3b8", fontSize: 13 }}>Aucune attribution pour cette course.</p>
                    )}
                </Section>

                {/* Footer */}
                <div style={{ marginTop: 40, paddingTop: 16, borderTop: "1px solid #e2e8f0", fontSize: 11, color: "#94a3b8", display: "flex", justifyContent: "space-between" }}>
                    <span>Ongo 237 — Document généré automatiquement</span>
                    <span>Course #{course.id} — {new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
            </div>
        </>
    );
}

// ── Helper components ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                {title}
            </div>
            {children}
        </div>
    );
}

function TwoCol({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
            {children}
        </div>
    );
}

function Field({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
    return (
        <div style={{ padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>{label}</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: highlight ? "#137fec" : "#111" }}>{value}</div>
        </div>
    );
}
