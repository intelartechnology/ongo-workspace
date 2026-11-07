/** « il y a 12 min », comme sur la liste des véhicules. */
export const ilYA = (valeur: string | null) => {
    if (!valeur) return "jamais";
    const minutes = Math.floor((Date.now() - new Date(valeur.replace(" ", "T")).getTime()) / 60_000);
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    const heures = Math.floor(minutes / 60);
    if (heures < 24) return `il y a ${heures} h`;
    const jours = Math.floor(heures / 24);
    if (jours < 30) return `il y a ${jours} j`;
    return `le ${new Date(valeur.replace(" ", "T")).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;
};

/** Une durée en secondes : « 32 h 15 », « 45 min », « 0 min ». */
export const duree = (secondes: number) => {
    const minutes = Math.floor(Math.max(0, secondes) / 60);
    const heures = Math.floor(minutes / 60);
    if (heures === 0) return `${minutes} min`;
    return `${heures} h ${String(minutes % 60).padStart(2, "0")}`;
};
