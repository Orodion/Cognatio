import type { ReleaseNotes } from '../releases';

const notes: ReleaseNotes = {
  '1.0.0': {
    persons: {
      title: 'Personnes avec événements de vie et fichiers',
      text: 'Personnes avec des dates flexibles (exacte, mois, année, « vers 1880 » ou période), événements de vie avec lieux, notes, ainsi que photos et documents.',
    },
    relations: {
      title: 'Relations',
      text: 'Reliez parents, enfants, partenaires et frères et sœurs. La relation inverse est créée automatiquement ; périodes et libellés comme « enfant adopté » possibles.',
    },
    tree: {
      title: 'Vues de l’arbre généalogique',
      text: 'Arbre généalogique, arbre des ascendants, arbre des descendants et réseau de relations, avec zoom, personne au centre et export en PNG, SVG ou PDF.',
    },
    search: {
      title: 'Recherche',
      text: 'Trouve les noms même avec une orthographe proche, ainsi que les lieux, professions, événements de vie et notes.',
    },
    statistics: {
      title: 'Statistiques',
      text: 'Chiffres clés, répartition par âge, noms de famille et lieux de naissance les plus fréquents, et aperçu des générations.',
    },
    'family-trees': {
      title: 'Plusieurs arbres généalogiques',
      text: 'Gérez des arbres séparés, par exemple pour les deux côtés de la famille, et passez de l’un à l’autre.',
    },
    'import-export': {
      title: 'Import et export',
      text: 'Échangez des données en ZIP (avec les fichiers) ou en GEDCOM 5.5.1 et 7.0 avec d’autres logiciels de généalogie ; un nouvel import ne crée pas de doublons.',
    },
    backup: {
      title: 'Sauvegardes',
      text: 'Sauvegardes automatiques quotidiennes, téléchargement de toutes les données et restauration guidée qui enregistre d’abord l’état actuel.',
    },
    trash: {
      title: 'Corbeille',
      text: 'Les personnes et arbres supprimés peuvent être restaurés.',
    },
    settings: {
      title: 'Langues et apparence',
      text: 'Dix langues (l’application démarre dans la langue du système d’exploitation), thèmes de couleurs, polices et apparence de l’arbre.',
    },
    'desktop-app': {
      title: 'Application de bureau pour Windows et Linux',
      text: 'Installateur Windows ou ZIP portable, AppImage ou paquet Debian pour Linux : avec sa propre base de données, sans configuration, lancée en un clic, avec sauvegarde des données avant chaque mise à jour et mises à jour automatiques (sauf pour le ZIP portable et le paquet Debian).',
    },
  },
};

export default notes;
