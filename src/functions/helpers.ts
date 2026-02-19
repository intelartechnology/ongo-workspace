export default class Helpers {
    capitalizeFirstLetter(string: string) {
        if (!string) return "";
        const trimmed = string.trim();
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }

    capitalizeAllLetter(string: string | null) {
        return string == null ? "" : string.toUpperCase();
    }

    formaatDate(date: string | Date) {
        if (!date) return "";
        return new Intl.DateTimeFormat('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(new Date(date));
    }
}
