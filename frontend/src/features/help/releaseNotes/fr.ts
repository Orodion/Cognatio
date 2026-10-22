import type { ReleaseNotes } from '../releases';

const notes: ReleaseNotes = {
  '1.1.0': {
    mcp: {
      title: 'Assistants IA (MCP)',
      text: 'Les assistants IA comme Claude peuvent consulter, rechercher et, avec votre autorisation, modifier vos arbres généalogiques grâce au Model Context Protocol. Vous décidez par domaine ce qu’ils peuvent faire ; chaque modification apparaît dans « Activité ».',
    },
    reports: {
      title: 'Rapports à imprimer et en PDF',
      text: 'Fiche individuelle, fiche familiale, liste d’ascendance (Kekulé) et de descendance (d’Aboville) – imprimées ou en PDF, dans l’application de bureau directement dans un fichier.',
    },
    checks: {
      title: 'Erreurs possibles',
      text: 'Une nouvelle page liste ce qui est permis mais rarement exact – un homme comme mère, une mère de 60 ans, un mariage après le décès, des doublons possibles et plus – avec des liens vers les personnes ; ce qui est exact peut être marqué comme tel. Une relation qui semble erronée n’est enregistrée qu’après confirmation.',
    },
    statistics: {
      title: 'Des statistiques pour poursuivre les recherches',
      text: 'Chaque nombre des statistiques mène aux personnes concernées – un clic sur une barre ouvre la liste des personnes avec exactement ces personnes. Le périmètre peut être choisi : ancêtres ou descendants d’une personne, un nom de famille, des années de naissance. Les analyses sont réparties en onglets. « Que manque-t-il encore ? » montre l’état des recherches et mène aux lacunes ; « Ancêtres » montre par génération combien d’ancêtres sont trouvés, l’implexe et les branches ouvertes – à partir de la nouvelle personne principale de l’arbre. Une frise montre les naissances, décès et mariages par décennie ; « Les vies au fil du temps » compare la durée de vie, l’âge au mariage et au premier enfant au fil des siècles. Ainsi que les prénoms et leur mode, les migrations de la famille d’un lieu à l’autre et les records des personnes décédées. Tout peut être imprimé sous forme de rapport, enregistré en PDF ou copié en CSV.',
    },
    places: {
      title: 'Suggestions de lieux',
      text: 'Les champs lieu de naissance, lieu de décès et lieu d’un événement proposent les lieux déjà présents dans l’arbre généalogique, les plus utilisés d’abord.',
    },
    dates: {
      title: 'Dates écrites en toutes lettres',
      text: 'Les champs de date acceptent aussi les dates écrites dans toute langue de l’application, comme « 2 octobre 1951 » ou « mai 1951 », et les transforment en « 02.10.1951 » et « 05.1951 ».',
    },
    anniversaries: {
      title: 'Anniversaires sur la page d’accueil',
      text: 'La page d’accueil liste les anniversaires de naissance, de décès et de mariage des 30 prochains jours, avec l’âge ou le nombre d’années.',
    },
    sources: {
      title: 'Sources et citations',
      text: 'Une collection de sources et de dépôts d’archives pour tous les arbres généalogiques : une citation note la page, la date, la transcription, la fiabilité et les scans et étaye autant de faits que nécessaire – nom, naissance, décès, événements et relations, aussi de plusieurs personnes. La page d’une source montre par personne ce que chaque citation étaye ; GEDCOM conserve les sources des autres logiciels.',
    },
    files: {
      title: 'Afficher les fichiers',
      text: 'Images, PDF, vidéos, audio et fichiers texte comme TXT, Markdown ou CSV s’ouvrent dans une fenêtre portant le nom du fichier ; les autres fichiers sont enregistrés directement. Les médias n’ont plus de limite de taille par fichier, les longues vidéos passent aussi. Un fichier nommé comme une image ou un PDF qui n’en est pas un est refusé.',
    },
    activity: {
      title: 'Gros volumes de données et « Activité »',
      text: 'Export, import, sauvegarde et restauration gèrent 50 Go et plus avec peu de mémoire et vérifient d’abord l’espace libre. « Activité » dans la barre latérale montre la progression de chaque opération longue ; l’import et la restauration peuvent être annulés.',
    },
    search: {
      title: 'Noms en cyrillique',
      text: 'La recherche traite les noms écrits en cyrillique comme leur graphie latine : « Иванов » trouve aussi « Iwanow » et « Ivanov ».',
    },
    'import-export': {
      title: 'Import dans votre langue',
      text: 'Un import GEDCOM écrit les titres des événements, les libellés et les dates approximatives dans la langue de l’interface. L’import et la restauration avertissent quand une personne serait son propre ancêtre, et les notes très longues sont découpées au lieu de rester bloquées. L’export GEDCOM écrit les baptêmes, professions et résidences avec les balises standard que reconnaissent les autres programmes.',
    },
    relations: {
      title: 'Relations déduites plus claires',
      text: 'Le partenaire d’un parent ne devient second parent que si ce parent a exactement un partenaire, et une relation parent-enfant est enregistrée avec ses relations déduites en entier ou pas du tout. Les frères et sœurs issus uniquement d’une relation parent-enfant supprimée vont avec elle à la corbeille et reviennent avec elle ; l’export GEDCOM omet les relations de la corbeille.',
    },
    'desktop-app': {
      title: 'PostgreSQL 18',
      text: 'L’application de bureau utilise PostgreSQL 18 ; les données de la version 1.0.0 sont converties automatiquement au premier démarrage, et l’ancien dossier de la base est conservé 30 jours.',
    },
    settings: {
      title: 'Barre latérale par groupes',
      text: 'La barre latérale regroupe les rubriques sous « Saisir », « Analyser » et « Gérer » ; « Import/Export » se trouve désormais sous « Gérer », et « Erreurs possibles » indique combien restent ouvertes. « Activité », « Corbeille », « Paramètres » et « Aide » restent en bas.',
    },
  },
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
