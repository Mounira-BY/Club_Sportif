/**
 * AbonnementsManager - Gestion centralisée des abonnements via localStorage
 * Les données sont partagées entre la page admin et la page pricing.
 */

const STORAGE_KEY = 'club_abonnements';

const DEFAULT_ABONNEMENTS = {
    gym: [
        { id: 1, nom: "Mensuel", prix: 80, duree: "Mois", description: "Accès illimité à la salle de gym pendant 1 mois." },
        { id: 2, nom: "Trimestriel", prix: 220, duree: "3 Mois", description: "Accès illimité à la salle de gym pendant 3 mois." },
        { id: 3, nom: "Annuel", prix: 750, duree: "An", description: "Accès illimité à la salle de gym pendant 1 an." }
    ],
    coaching: [
        { id: 1, nom: "Individuel", prix: 30, duree: "Séance", description: "", pack10: 250 },
        { id: 2, nom: "Groupe de 2", prix: 50, duree: "Séance", description: "", pack10: 400 },
        { id: 3, nom: "Groupe de 3", prix: 60, duree: "Séance", description: "", pack10: 480 },
        { id: 4, nom: "Groupe de 4", prix: 70, duree: "Séance", description: "", pack10: 560 }
    ],
    acces: [
        { id: 1, nom: "Adultes", prix: 40, duree: "Séance", description: "", pack10: 300 },
        { id: 2, nom: "Enfants", prix: 20, duree: "Séance", description: "", pack10: 150 }
    ],
    padel: [
        { id: 1, nom: "Location Terrain", prix: 100, duree: "Séance", description: "80DT + 4x 5DT par raquette / 80DT sans raquettes" },
        { id: 2, nom: "Pack de 5 Match", prix: 340, duree: "Pack", description: "" },
        { id: 3, nom: "Pack de 10 Match", prix: 540, duree: "Pack", description: "" }
    ],
    basketball: [
        { id: 1, nom: "Location Terrain", prix: 100, duree: "Séance", description: "" },
        { id: 2, nom: "Pack de 5 Match", prix: 350, duree: "Pack", description: "" },
        { id: 3, nom: "Pack de 10 Match", prix: 550, duree: "Pack", description: "" }
    ]
};

const abonnementsManager = {

    /**
     * Charge les données depuis localStorage.
     * Si aucune donnée n'existe, initialise avec les données par défaut.
     */
    getData() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Erreur lors du chargement des abonnements:', e);
                return JSON.parse(JSON.stringify(DEFAULT_ABONNEMENTS));
            }
        }
        // Première visite : initialiser avec les données par défaut
        const defaults = JSON.parse(JSON.stringify(DEFAULT_ABONNEMENTS));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
        return defaults;
    },

    /**
     * Sauvegarde les données dans localStorage.
     */
    saveData(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },

    /**
     * Retourne tous les abonnements d'une catégorie.
     */
    getAbonnementsByCategory(category) {
        const data = this.getData();
        return data[category] || [];
    },

    /**
     * Retourne un abonnement par son id dans une catégorie.
     */
    getAbonnementById(category, id) {
        const abonnements = this.getAbonnementsByCategory(category);
        return abonnements.find(a => a.id === id) || null;
    },

    /**
     * Ajoute un nouvel abonnement dans une catégorie.
     */
    addAbonnement(category, abonnement) {
        const data = this.getData();
        if (!data[category]) data[category] = [];

        // Générer un nouvel id unique
        const maxId = data[category].reduce((max, a) => Math.max(max, a.id), 0);
        abonnement.id = maxId + 1;

        data[category].push(abonnement);
        this.saveData(data);
        return abonnement;
    },

    /**
     * Met à jour un abonnement existant.
     */
    updateAbonnement(category, id, updatedAbonnement) {
        const data = this.getData();
        if (!data[category]) return false;

        const index = data[category].findIndex(a => a.id === id);
        if (index === -1) return false;

        data[category][index] = { ...data[category][index], ...updatedAbonnement, id };
        this.saveData(data);
        return true;
    },

    /**
     * Supprime un abonnement par son id dans une catégorie.
     */
    deleteAbonnement(category, id) {
        const data = this.getData();
        if (!data[category]) return false;

        const index = data[category].findIndex(a => a.id === id);
        if (index === -1) return false;

        data[category].splice(index, 1);
        this.saveData(data);
        return true;
    },

    /**
     * Réinitialise toutes les données aux valeurs par défaut.
     */
    resetToDefaults() {
        const defaults = JSON.parse(JSON.stringify(DEFAULT_ABONNEMENTS));
        this.saveData(defaults);
        return defaults;
    }
};