// Gestionnaire d'abonnements partagé
class AbonnementsManager {
    constructor() {
        this.storageKey = 'club_sportif_abonnements';
        this.initializeDefaultData();
    }

    // Initialiser les données par défaut si elles n'existent pas
    initializeDefaultData() {
        if (!localStorage.getItem(this.storageKey)) {
            const defaultAbonnements = {
                gym: [
                    { id: 1, nom: 'Mensuel', prix: 180, duree: 'Mois', description: 'Accès illimité à la salle de gym' },
                    { id: 2, nom: 'Trimestriel', prix: 450, duree: '3 Mois', description: 'Accès illimité + coaching personnalisé' },
                    { id: 3, nom: 'Semestriel', prix: 750, duree: '6 Mois', description: 'Accès illimité + coaching + nutrition' },
                    { id: 4, nom: 'Annuel', prix: 1300, duree: 'An', description: 'Accès complet + tous les services' }
                ],
                coaching: [
                    { id: 5, nom: 'Individuel', prix: 30, duree: 'Séance', description: 'Coaching privé individuel', pack10: 250 },
                    { id: 6, nom: 'Groupe de 2', prix: 50, duree: 'Séance', description: 'Coaching en groupe de 2 personnes', pack10: 400 }
                ],
                padel: [
                    { id: 7, nom: 'Heure', prix: 25, duree: 'Heure', description: 'Location terrain padel' },
                    { id: 8, nom: 'Pack 5h', prix: 100, duree: '5 Heures', description: 'Pack de 5 heures de padel' }
                ],
                basketball: [
                    { id: 9, nom: 'Heure', prix: 20, duree: 'Heure', description: 'Location terrain basketball' },
                    { id: 10, nom: 'Pack 5h', prix: 80, duree: '5 Heures', description: 'Pack de 5 heures de basketball' }
                ]
            };
            localStorage.setItem(this.storageKey, JSON.stringify(defaultAbonnements));
        }
    }

    // Récupérer tous les abonnements
    getAllAbonnements() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : {};
    }

    // Récupérer les abonnements d'une catégorie
    getAbonnementsByCategory(category) {
        const all = this.getAllAbonnements();
        return all[category] || [];
    }

    // Ajouter un abonnement
    addAbonnement(category, abonnement) {
        const all = this.getAllAbonnements();
        if (!all[category]) all[category] = [];

        // Générer un ID unique
        const maxId = Math.max(...all[category].map(a => a.id), 0);
        abonnement.id = maxId + 1;

        all[category].push(abonnement);
        localStorage.setItem(this.storageKey, JSON.stringify(all));
        return abonnement;
    }

    // Modifier un abonnement
    updateAbonnement(category, id, updatedAbonnement) {
        const all = this.getAllAbonnements();
        if (!all[category]) return false;

        const index = all[category].findIndex(a => a.id === id);
        if (index === -1) return false;

        all[category][index] = { ...all[category][index], ...updatedAbonnement };
        localStorage.setItem(this.storageKey, JSON.stringify(all));
        return true;
    }

    // Supprimer un abonnement
    deleteAbonnement(category, id) {
        const all = this.getAllAbonnements();
        if (!all[category]) return false;

        const index = all[category].findIndex(a => a.id === id);
        if (index === -1) return false;

        all[category].splice(index, 1);
        localStorage.setItem(this.storageKey, JSON.stringify(all));
        return true;
    }

    // Récupérer un abonnement par ID
    getAbonnementById(category, id) {
        const categoryAbonnements = this.getAbonnementsByCategory(category);
        return categoryAbonnements.find(a => a.id === id);
    }
}

// Instance globale
const abonnementsManager = new AbonnementsManager();