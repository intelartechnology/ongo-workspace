
import moment from 'moment';
import "./CourseDetailsModal.css";

const ExtrackTime = (dateTimeString: string) => {
  if (!dateTimeString) return "N/A";
  return moment(dateTimeString).format("HH:mm");
};

interface Vehicule {
  modele: string;
  matricule: string;
  updated_at: string;
  lat: number;
  lng: number;
}

interface Chauffeur {
  nom: string;
  prenom: string;
  telephone: string;
  balance: number;
  statut: string;
  vehicules: Vehicule[];
}

interface Attribution {
  id: number;
  statut: string;
  chauffeurs: Chauffeur;
  created_at?: string | null;
  distance?: string | number | null;
  unite?: string | null;
  duree?: string | number | null;
  source_distance?: string | null;
  /** Le boost proposé à ce chauffeur, selon sa distance et son rang. */
  boost_propose?: number | null;
}

/**
 * La distance entre le chauffeur et le client au moment où la course lui a été
 * proposée, en mètres — et si elle est sûre.
 *
 * La recherche actuelle l'écrit en mètres (`unite` « m ») : elle est fiable.
 * Les anciens chemins écrivaient « km » sans s'y tenir — 1.00 ou 4.20 en
 * kilomètres, mais aussi 5200 ou 13873 qui sont des mètres. On les lit au
 * mieux, et on le dit (« ≈ »). Zéro ou vide : inconnue.
 */
const priseEnCharge = (a: Attribution): { metres: number; sure: boolean } | null => {
  const valeur = Number(a.distance);
  if (!Number.isFinite(valeur) || valeur <= 0) return null;
  if (a.unite === "m") return { metres: valeur, sure: true };
  return { metres: valeur >= 50 ? valeur : valeur * 1000, sure: false };
};

const formaterDistance = ({ metres, sure }: { metres: number; sure: boolean }) =>
  `${sure ? "" : "≈ "}${metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`}`;

/** Par la route si Google l'a donnée, à vol d'oiseau sinon. */
const sourceDistance = (a: Attribution) => (a.source_distance === "route" ? "par la route" : "à vol d'oiseau");

/** Le délai estimé, en secondes, que seule la recherche actuelle écrit. */
const formaterDelai = (a: Attribution) => {
  const secondes = Number(a.duree);
  return a.unite === "m" && Number.isFinite(secondes) && secondes > 0 ? `≈ ${Math.max(1, Math.round(secondes / 60))} min` : null;
};

interface Course {
  id: number;
  attributions: Attribution[];
  lieu_depart: string;
  lieu_arrive: string;
  montant: number;
  categorie_vehicule: {
    libelle: string;
  };
  date_depart: string;
  heure_depart: string;
  statut: string;
}

interface CourseDetailsModalProps {
  selectedCourse: Course | null;
  closeDetails: () => void;
}

const CourseDetailsModal: React.FC<CourseDetailsModalProps> = ({ selectedCourse, closeDetails }) => {
  if (!selectedCourse) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[90vh] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">directions_car</span>
              Détails de la course #{selectedCourse.id}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wider">Consultation des attributions et du trajet</p>
          </div>
          <button
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-500 hover:text-slate-900 dark:hover:text-white"
            onClick={closeDetails}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* BODY - SCROLLABLE */}
        <div className="overflow-y-auto flex-1 p-6 space-y-8">
          
          {/* SECTION 1: ATTRIBUTIONS */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Chauffeurs Sollicités</h4>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold">
                {selectedCourse.attributions?.length || 0} Attribution(s)
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                {selectedCourse.attributions && selectedCourse.attributions.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50">
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Chauffeur</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Véhicule</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-center">Balance</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Mise à jour</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-center">Statut</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Position</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Attribution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedCourse.attributions.map((attribution: Attribution) => (
                        <tr 
                          key={attribution.id} 
                          className={`group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
 attribution.statut === 'CONFIRMEE' ? 'confirmed-row' : ''
 }`}
                        >
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">
                                {attribution.chauffeurs?.nom} {attribution.chauffeurs?.prenom}
                              </span>
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                {attribution.chauffeurs?.telephone || "N/A"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {attribution.chauffeurs?.vehicules?.[0]?.modele || "N/A"}
                              </span>
                              <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded w-fit mt-1">
                                {attribution.chauffeurs?.vehicules?.[0]?.matricule || "N/A"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`text-sm font-bold ${attribution.chauffeurs?.balance < 0 ? "text-red-500" : "text-green-600"}`}>
                              {attribution.chauffeurs?.balance?.toLocaleString()} <small>FCFA</small>
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-[11px] leading-tight text-slate-500">
                              <div className="font-bold text-slate-700 dark:text-slate-300">
                                {moment(attribution.chauffeurs?.vehicules?.[0]?.updated_at).fromNow()}
                              </div>
                              <div>{moment(attribution.chauffeurs?.vehicules?.[0]?.updated_at).format("DD MMM YYYY")}</div>
                              <div className="opacity-70">{ExtrackTime(attribution.chauffeurs?.vehicules?.[0]?.updated_at)}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
 attribution.statut === "CONFIRMEE" 
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            }`}>
                              {attribution.statut}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                             <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                               <span className="material-symbols-outlined text-sm">location_on</span>
                               {attribution.chauffeurs?.vehicules?.[0]?.lat?.toFixed(4)} / {attribution.chauffeurs?.vehicules?.[0]?.lng?.toFixed(4)}
                             </div>
                          </td>
                          <td className="px-4 py-4">
                            {/* Quand la course lui a été proposée, et à quelle distance du client il était. */}
                            <div className="text-[11px] leading-tight text-slate-500">
                              <div className="font-bold text-slate-700 dark:text-slate-300">
                                {attribution.created_at ? moment(attribution.created_at).format("DD MMM YYYY à HH:mm:ss") : "N/A"}
                              </div>
                              {(() => {
                                const distance = priseEnCharge(attribution);
                                const delai = formaterDelai(attribution);
                                return distance ? (
                                  <div className="flex items-center gap-1 mt-1">
                                    <span className="material-symbols-outlined text-sm">near_me</span>
                                    {formaterDistance(distance)} du client, {sourceDistance(attribution)}{delai ? ` · ${delai}` : ""}
                                  </div>
                                ) : (
                                  <div className="mt-1 opacity-70">Distance non enregistrée</div>
                                );
                              })()}
                              {Number(attribution.boost_propose ?? 0) > 0 && (
                                <div className="flex items-center gap-1 mt-1 font-bold text-amber-600 dark:text-amber-400">
                                  <span className="material-symbols-outlined text-sm">bolt</span>
                                  Boost proposé : +{Number(attribution.boost_propose).toLocaleString("fr-FR")} F
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-300">person_off</span>
                    <p className="mt-2 text-slate-500 font-medium">Aucun chauffeur attribué pour le moment</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* SECTION 2: COURSE SUMMARY */}
          <section>
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Détails du Trajet & Facturation</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Itinéraire</p>
                <div className="space-y-2">
                  <div className="flex gap-2 items-start">
                    <span className="size-2 mt-1.5 rounded-full bg-blue-500 shrink-0"></span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">
                      {selectedCourse.lieu_depart}
                    </p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="size-2 mt-1.5 rounded-full bg-red-500 shrink-0"></span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">
                      {selectedCourse.lieu_arrive}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Prix de la course</p>
                <p className="text-2xl font-black text-red-500">
                  {selectedCourse.montant?.toLocaleString()} <span className="text-sm">FCFA</span>
                </p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{selectedCourse.categorie_vehicule?.libelle}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Planification</p>
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shrink-0">
                      <span className="material-symbols-outlined text-primary">calendar_today</span>
                   </div>
                   <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedCourse.date_depart}</p>
                      <p className="text-xs font-medium text-slate-500">{selectedCourse.heure_depart}</p>
                   </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col justify-center items-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">État Actuel</p>
                <span className="px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-tighter">
                  {STATUTS_FR[selectedCourse.statut] ?? selectedCourse.statut}
                </span>
              </div>

            </div>

            {/* Les écarts entre la course commandée et la course faite, et ce
                qu'ils coûtent ou auraient coûté. */}
            <Supplements course={selectedCourse} />
          </section>
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3 sticky bottom-0">
          <button
            className="px-6 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            onClick={closeDetails}
          >
            Fermer l'aperçu
          </button>
          <button className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 dark:bg-primary-container dark:hover:bg-primary-container/90 transition-colors disabled:opacity-40 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">chat</span>
            Contacter Chauffeur
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailsModal;

const francs = (n: unknown) => `${Number(n ?? 0).toLocaleString("fr-FR")} FCFA`;
const metres = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km` : `${n} m`);

/**
 * Les suppléments d'une course : changement de destination, dépassement à la
 * dépose.
 *
 * Le dépassement est **mesuré** à chaque fin de course (`debordement_metres`)
 * et son prix **calculé** au tarif kilométrique de la catégorie
 * (`debordement_supplement`), mais il n'est facturé que si la facturation des
 * dépassements est activée sur le serveur. On dit donc lequel des deux : un
 * montant calculé n'est pas un montant payé.
 */
function Supplements({ course }: { course: any }) {
  const ecart: number | null = course.debordement_metres ?? null;
  const supplement: number | null = course.debordement_supplement ?? null;
  const arrivee = Boolean(course.arrivee_detectee_a);
  const changement = Boolean(course.lieu_arrive_origine || course.destination_modifiee_le);
  const origine = course.montant_origine != null ? Number(course.montant_origine) : null;

  // Facturé : le montant a monté exactement du supplément depuis le prix d'origine.
  const facture = supplement != null && supplement > 0 && origine != null && Number(course.montant) - origine === supplement;

  let depassement: { texte: string; detail: string; ton: string };
  if (ecart === null) {
    depassement = { texte: "Non mesuré", detail: "Course non terminée, ou application chauffeur antérieure à la mesure.", ton: "text-slate-500" };
  } else if (!arrivee) {
    depassement = { texte: "Aucun supplément", detail: `Dépose à ${metres(ecart)} du point prévu, mais l'arrivée n'a pas été détectée : le client est descendu avant.`, ton: "text-slate-500" };
  } else if (supplement === null) {
    depassement = { texte: "Hors barème", detail: `Écart de ${metres(ecart)} : trop grand pour un dépassement (course poursuivie ailleurs ou GPS aberrant). Jamais facturé.`, ton: "text-amber-600 dark:text-amber-400" };
  } else if (supplement === 0) {
    depassement = { texte: "Aucun supplément", detail: `Dépose à ${metres(ecart)} du point prévu, dans la tolérance.`, ton: "text-emerald-600 dark:text-emerald-400" };
  } else {
    depassement = {
      texte: `${francs(supplement)}${facture ? " facturé" : " calculé"}`,
      detail: facture
        ? `Dépose à ${metres(ecart)} au-delà du point prévu : ajouté au prix de la course.`
        : `Dépose à ${metres(ecart)} au-delà du point prévu. Non facturé : la facturation des dépassements est désactivée.`,
      ton: facture ? "text-red-500" : "text-amber-600 dark:text-amber-400",
    };
  }

  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Dépassement à la dépose</p>
        <p className={`text-lg font-black ${depassement.ton}`}>{depassement.texte}</p>
        <p className="text-xs text-slate-500 mt-1 leading-snug">{depassement.detail}</p>
      </div>

      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Changement de destination</p>
        {changement ? (
          <>
            <p className="text-lg font-black text-slate-800 dark:text-slate-100">
              {origine != null ? `${francs(origine)} → ${francs(course.montant)}` : "Oui"}
            </p>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              Destination commandée : {course.lieu_arrive_origine || "—"}. Nouveau prix accepté par le client.
            </p>
          </>
        ) : (
          <p className="text-lg font-black text-slate-500">Aucun</p>
        )}
      </div>

    </div>
  );
}

/** Les statuts tels que la base les écrit, en français. */
const STATUTS_FR: Record<string, string> = {
  "EN ATTENTE": "En attente",
  "RESERVEE": "Réservée",
  "EN COURS": "En cours",
  "TRANSPORTEE": "Client à bord",
  "TERMINEE": "Terminée",
  "ANNULEE": "Annulée",
  "ANNULEE AUTO": "Annulée (auto)",
  "NO DRIVER FOUND": "Aucun chauffeur",
};
