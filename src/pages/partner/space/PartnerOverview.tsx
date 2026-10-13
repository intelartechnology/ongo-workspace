import React from "react";
import { Button } from "../../../components/ui";
import type { Partenaire } from "../PartnerSpace";
import { StatCard } from "../../../components/ui";
import { Banknote, Bike, Route, Wallet, type LucideIcon } from "lucide-react";

const francs = (v: number | null | undefined): string =>
    v == null ? "—" : `${Number(v).toLocaleString("fr-FR")} FCFA`;

interface Props {
    partenaire: Partenaire;
    onVoirChauffeurs: () => void;
}

/**
 * L'aperçu du mois.
 *
 * Le chiffre d'affaires et la commission sont affichés côte à côte parce
 * qu'ils se confondent facilement : le premier est ce que les chauffeurs ont
 * encaissé, le second ce que le partenaire touche. Les montants viennent du
 * serveur et ne sont pas recalculés ici — le taux a pu changer en cours de
 * mois, et un recalcul au taux courant réécrirait le passé.
 */
const PartnerOverview: React.FC<Props> = ({ partenaire, onVoirChauffeurs }) => {
    const s = partenaire.stats;

    const tuile = (libelle: string, valeur: string, icone: LucideIcon, detail?: string) => (
        <StatCard label={libelle} value={valeur} icon={icone} note={detail} />
    );

    if (!s) {
        return (
            <div className="py-16 text-center">
                <p className="text-sm text-slate-500">Les statistiques ne sont pas encore disponibles pour ce partenaire.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {tuile("Chauffeurs", String(s.drivers_total), Bike, `${s.drivers_active} actif${s.drivers_active > 1 ? "s" : ""}`)}
                {tuile("Courses ce mois", s.courses_month.toLocaleString("fr-FR"), Route)}
                {tuile("Chiffre d'affaires", francs(s.revenue_month), Banknote, "encaissé par les chauffeurs")}
                {/* `commission_month` est nul pour un membre d'equipe : le
                    serveur ne le lui envoie pas. Afficher un tiret laisserait
                    croire a zero franc gagne. */}
                {s.commission_month != null &&
                    tuile("Votre commission", francs(s.commission_month), Wallet, `${partenaire.commission_rate} % des courses`)}
            </div>

            {s.drivers_total === 0 && (
                <div className="py-14 px-6 bg-white dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-3">
                    <span className="material-symbols-outlined text-5xl text-primary/30">person_add</span>
                    <p className="font-black text-base uppercase tracking-tight text-slate-800 dark:text-slate-100">Aucun chauffeur</p>
                    <p className="text-sm text-slate-500 max-w-sm">
                        Ajoutez vos chauffeurs pour qu'ils commencent à rouler. Vous toucherez {partenaire.commission_rate} % sur chacune de leurs courses.
                    </p>
                    <Button variant="primary" icon="add" className="mt-2" onClick={onVoirChauffeurs}>
                        Ajouter un chauffeur
                    </Button>
                </div>
            )}

            {partenaire.commission_rate === 0 && s.drivers_total > 0 && (
                <div className="flex items-start gap-2.5 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                    <span className="material-symbols-outlined text-[20px] shrink-0">info</span>
                    <p className="text-xs font-semibold leading-relaxed">
                        Votre commission est fixée à 0 %. Vos chauffeurs roulent, mais vous ne percevez rien sur leurs courses.
                        Le taux est défini par Ongo et peut être ajusté à tout moment.
                    </p>
                </div>
            )}
        </div>
    );
};

export default PartnerOverview;
