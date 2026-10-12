import type { HelpSection } from '../types';

const help: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Premiers pas',
    blocks: [
      {
        p: 'Cognatio gère votre arbre généalogique : personnes, relations, événements de vie, photos et documents. Choisissez une zone à gauche et recherchez des personnes en haut. Le bouton ? en haut à droite ouvre l’aide de la page où vous vous trouvez.',
      },
      {
        steps: [
          'Sous « Personnes », cliquez sur « Nouvelle personne », saisissez au moins le prénom et enregistrez.',
          'Sur la page de la personne, ajoutez parents, enfants, partenaires ou frères et sœurs dans l’onglet « Relations » – choisissez une personne existante ou créez-en une nouvelle sur place.',
          'Regardez le résultat sous « Arbre généalogique ». Avec une personne centrale, l’arbre montre la famille du point de vue de cette personne.',
        ],
      },
      {
        p: 'La page d’accueil affiche le nombre de personnes et la répartition par sexe, des accès rapides aux principaux domaines, les personnes ajoutées en dernier et quelques conseils. L’aide a son propre champ de recherche au-dessus des chapitres.',
      },
      {
        p: 'Arbre d’exemple : au premier démarrage, l’application de bureau crée l’arbre généalogique « Familie Kraft (Demo) » – dix personnes fictives sur quatre générations, avec relations, événements de vie, notes et photos, pour essayer tout de suite chaque domaine. Son contenu est en allemand. Pour commencer avec vos données, créez un nouvel arbre généalogique sous « Arbres généalogiques » et supprimez l’exemple (il va dans la corbeille et ne revient pas). Le fichier Cognatio-Demo-Familie-Kraft.zip se trouve dans le dossier du programme (dossier « demo » dans « resources ») et dans le dossier « demo » du projet ; sous Import/Export, vous pouvez l’importer à nouveau comme un nouvel arbre généalogique.',
      },
    ],
    link: { to: '/persons', label: 'Aller aux personnes' },
  },
  {
    id: 'persons',
    title: 'Personnes',
    blocks: [
      {
        p: 'Seul le prénom est obligatoire. S’il est inconnu, cochez « Prénom inconnu » – l’application affiche alors « (prénom inconnu) ». Saisissez les dates dans la mesure où vous les connaissez : 04.01.1880 (exacte), 01.1880 (mois), 1880 (année), « vers 1880 », « avant 1880 », « après 1880 » ou la période « 1880-1885 ». L’application détecte elle-même la précision.',
      },
      {
        p: 'Lorsque vous créez une personne, l’application signale les personnes existantes ayant un nom proche et la même année de naissance – pour éviter les doublons.',
      },
      {
        list: [
          'Aperçu : données personnelles, contact et autres informations ; « Modifier » permet de les changer.',
          'Chronologie : événements comme la naissance, le baptême, le mariage ou un déménagement, avec date et lieu. Un événement peut être lié à des fichiers – y compris ceux d’autres personnes, p. ex. une photo de groupe. Les événements peuvent être triés du plus ancien au plus récent ou inversement et affichés en chronologie ou en tableau ; le choix est mémorisé.',
          'Relations : voir la section « Relations ».',
          'Notes : texte libre, p. ex. anecdotes ou sources, jusqu’à 10 000 caractères chacune.',
          'Médias : téléversez photos et documents (jusqu’à 50 Mo par fichier) ; une image peut être définie comme photo de profil. L’icône de téléchargement enregistre un fichier sous son nom d’origine.',
          'Les médias peuvent être affichés en vignettes ou en liste (boutons au-dessus des fichiers).',
          'Filtre : le champ à côté des onglets (sauf « Aperçu ») filtre les entrées de l’onglet ouvert – parcours, relations, notes ou médias. Majuscules et accents sont ignorés, avec plusieurs mots tous doivent apparaître, et les résultats sont surlignés. La recherche porte sur tous les textes, p. ex. titre, catégorie, date, lieu, description et noms de fichiers. Dans les relations, le graphique n’affiche aussi que les personnes restantes. Le texte est conservé quand vous changez d’onglet ; Échap ou la croix l’efface.',
        ],
      },
      { p: '« Supprimer » place la personne dans la corbeille – elle peut y être restaurée.' },
    ],
    link: { to: '/persons', label: 'Aller aux personnes' },
  },
  {
    id: 'relations',
    title: 'Relations',
    blocks: [
      {
        p: 'Vous ajoutez des relations sur la page d’une personne, dans l’onglet « Relations », ou dès la création de la personne. Le type de relation décrit la personne sélectionnée du point de vue de la personne actuelle : si vous êtes sur la page d’Anna et choisissez Max comme « Père », Max est le père d’Anna. Le sens inverse – Anna est l’enfant de Max – s’affiche automatiquement.',
      },
      {
        list: [
          'Types : mère, père, enfant, frère/sœur, mari, épouse, compagnon/compagne, partenaire, autre.',
          'Libellé (facultatif), p. ex. « enfant adopté » ou « beau-père ».',
          'Période de – à, p. ex. pour un mariage ; pour un enfant, la date de naissance est proposée comme début.',
          'Si la personne n’existe pas encore, choisissez « Nouvelle personne » et créez-la directement dans la boîte de dialogue.',
          'Graphique : à côté de la liste (au-dessus sur les écrans étroits), les relations de la personne sont dessinées sous forme de schéma – parents en haut, partenaires à côté, enfants en dessous. Un clic sur une personne l’ouvre ; le bouton « Graphique » le masque ou l’affiche, et le choix est mémorisé.',
        ],
      },
      {
        p: 'Certaines relations sont ajoutées automatiquement : quand un parent et un enfant sont reliés, le partenaire du parent devient aussi parent de l’enfant (tant que l’enfant a moins de deux parents ; la relation commence à la naissance de l’enfant si elle est connue précisément), et les autres enfants du parent deviennent frères et sœurs de l’enfant. Le bouton de suppression à côté d’une relation ne supprime que la relation – les personnes restent.',
      },
    ],
  },
  {
    id: 'tree',
    title: 'Vue de l’arbre généalogique',
    blocks: [
      {
        list: [
          'Arbre généalogique : toutes les familles de l’arbre.',
          'Arbre des ascendants : parents, grands-parents, etc. de la personne centrale.',
          'Arbre des descendants : enfants, petits-enfants, etc. de la personne centrale.',
          'Réseau de relations : toutes les connexions sous forme de réseau.',
        ],
      },
      {
        p: 'La personne centrale détermine à partir de qui l’arbre est dessiné ; « Générations » limite la profondeur. Vous zoomez avec la molette de la souris ou la barre de zoom ; un clic sur une personne ouvre sa page. La couleur de la bordure indique le sexe. Les très grands arbres (à partir de 400 personnes) ne sont pas dessinés automatiquement – choisissez alors une personne centrale et moins de générations.',
      },
      {
        p: '« Exporter » enregistre l’arbre en PNG ou SVG ou l’imprime (aussi en PDF), au choix uniquement la zone visible. L’application mémorise la vue, les générations et la personne centrale ; les valeurs par défaut se règlent sous « Paramètres ». Sur la page d’une personne, « Afficher l’arbre » ouvre l’arbre avec cette personne au centre.',
      },
    ],
    link: { to: '/tree', label: 'Aller à l’arbre généalogique' },
  },
  {
    id: 'search',
    title: 'Recherche',
    blocks: [
      {
        p: 'Le champ de recherche en haut parcourt l’arbre généalogique ouvert : les noms – y compris les orthographes proches, de sorte que « Meier » trouve aussi « Mayer » et « Maier » –, les données personnelles comme les lieux et les professions, la chronologie et les notes. Chaque résultat indique par quoi il a été trouvé.',
      },
    ],
  },
  {
    id: 'statistics',
    title: 'Statistiques',
    blocks: [
      {
        p: 'Les statistiques analysent l’arbre généalogique ouvert (hors corbeille) : chiffres clés comme le nombre de personnes, les sexes et la durée de vie moyenne, la répartition par âge, les noms de famille les plus fréquents, les lieux de naissance les plus fréquents et un aperçu des générations.',
      },
    ],
    link: { to: '/statistics', label: 'Aller aux statistiques' },
  },
  {
    id: 'family-trees',
    title: 'Plusieurs arbres généalogiques',
    blocks: [
      {
        p: 'Vous pouvez tenir plusieurs arbres généalogiques séparés, p. ex. la famille paternelle et la famille maternelle. Chaque personne appartient à un seul arbre ; toutes les pages n’affichent que celui qui est ouvert. On change d’arbre avec la sélection « Arbre généalogique ouvert » en haut de la barre latérale.',
      },
      {
        p: 'Sur la page « Arbres généalogiques », vous créez, renommez, ouvrez ou supprimez des arbres. Un arbre supprimé va dans la corbeille avec toutes ses données ; le dernier peut aussi être supprimé – l’application propose alors d’en créer un nouveau, d’importer un fichier ou de récupérer un arbre dans la corbeille.',
      },
    ],
    link: { to: '/family-trees', label: 'Aller aux arbres généalogiques' },
  },
  {
    id: 'import-export',
    title: 'Import/Export',
    blocks: [
      {
        p: 'L’export et l’import concernent l’arbre généalogique ouvert. L’export ZIP contient toutes les données et tous les médias – pour une sauvegarde ou pour une autre installation de Cognatio. GEDCOM (5.5.1 ou 7.0) est le format d’échange d’autres logiciels de généalogie comme Ancestry, MyHeritage ou Gramps, au besoin avec images et documents. Par défaut, un fichier peut atteindre 2 GB (modifiable sous « Paramètres → Données et sauvegarde ») ; si les médias d’un arbre sont plus volumineux, exportez sans les médias.',
      },
      {
        steps: [
          'Choisissez un fichier (ZIP de cette application ou GEDCOM).',
          'Choisissez la destination : l’arbre ouvert ou un nouvel arbre. Pour les fichiers GEDCOM, l’application propose un nouvel arbre.',
          'L’aperçu montre ce qui va changer. Pour l’arbre ouvert, choisissez la marche à suivre.',
          '« Lancer l’import ».',
        ],
      },
      {
        list: [
          'Fusionner – le plus récent l’emporte : les nouvelles personnes sont ajoutées ; en cas de différence, la version la plus récente l’emporte.',
          'Fusionner – décider manuellement : comme ci-dessus, mais en cas de différence, vous décidez personne par personne.',
          'Écraser : l’arbre ouvert est entièrement remplacé par le fichier ; les autres arbres restent inchangés.',
        ],
      },
      {
        p: 'Lorsqu’un fichier GEDCOM est importé à nouveau, l’application reconnaît les personnes existantes et ne les crée pas en double. L’historique des imports montre les imports précédents.',
      },
    ],
    link: { to: '/import-export', label: 'Aller à Import/Export' },
  },
  {
    id: 'backup',
    title: 'Sauvegarde',
    blocks: [
      {
        p: 'Le serveur sauvegarde automatiquement la base de données et les fichiers, chaque jour par défaut. Les paramètres affichent la dernière sauvegarde et avertissent si elle date de plus de trois jours.',
      },
      {
        p: 'Sous « Paramètres → Sauvegarde », « Télécharger la sauvegarde » télécharge un fichier contenant tous les arbres généalogiques, les médias, la corbeille et l’historique des imports. Les arbres individuels se sauvegardent via « Import/Export ». Une sauvegarde qui dépasse la limite de taille est bien enregistrée, mais cette application ne peut pas la restaurer – sauvegardez alors aussi les arbres un par un via « Import/Export ».',
      },
      {
        steps: [
          'Choisissez « Restaurer une sauvegarde… » et sélectionnez le fichier de sauvegarde – il est d’abord vérifié, rien n’est encore modifié.',
          'Vérifiez la comparaison « Actuel / Dans la sauvegarde ».',
          'Saisissez « SUPPRIMER » pour confirmer et choisissez « Restaurer ».',
        ],
      },
      {
        p: 'Toutes les données actuelles sont remplacées par la sauvegarde. Auparavant, le serveur enregistre l’état actuel dans un fichier « cognatio_before_restore_…zip » – il permet d’annuler la restauration. Les trois derniers de ces fichiers sont conservés ; le serveur supprime les plus anciens.',
      },
      {
        p: 'Limite de taille : l’export, l’import, la sauvegarde et la restauration traitent un fichier en mémoire, par défaut jusqu’à 2 GB. Sous « Paramètres → Données et sauvegarde → Limites de taille », un ordinateur disposant de beaucoup de mémoire peut autoriser des fichiers plus grands. Au-delà de 4 GB, il faut au moins le double de la taille du fichier en mémoire (RAM) libre ; sinon l’application peut devenir très lente ou s’arrêter ; les paramètres en avertissent. Un export trop volumineux est refusé, une sauvegarde trop volumineuse est créée avec un avertissement.',
      },
    ],
    link: { to: '/settings', label: 'Aller aux paramètres' },
  },
  {
    id: 'trash',
    title: 'Corbeille',
    blocks: [
      {
        p: 'La corbeille contient les personnes supprimées de l’arbre généalogique ouvert et les arbres généalogiques supprimés ; le nombre dans la barre latérale indique combien il y en a. « Restaurer » les récupère. « Supprimer définitivement » efface aussi les relations, événements, notes et médias et ne peut être annulé qu’avec une sauvegarde.',
      },
    ],
    link: { to: '/trash', label: 'Aller à la corbeille' },
  },
  {
    id: 'settings',
    title: 'Paramètres',
    blocks: [
      {
        p: 'La langue (qui ne se change qu’ici), le thème de couleurs et les valeurs par défaut de l’arbre généalogique (vue, générations, personne centrale par arbre) valent pour ce navigateur. La sauvegarde et l’état du système valent pour toute l’application.',
      },
      {
        list: [
          'Apparence (les blocs « Police et couleurs » et « Arbre : apparence ») : police et taille de police, couleur d’accentuation, style, épaisseur et couleur des lignes de l’arbre, taille et angles des fiches, photo, dates et ruban noir de deuil des personnes décédées sur les fiches et couleurs de bordure selon le sexe – avec aperçu en direct et « Rétablir les valeurs par défaut ».',
          'Arbre : comportement : la vue, le nombre de générations et la personne centrale avec lesquels l’arbre s’ouvre.',
          'Données et sauvegarde : sauvegarder et restaurer (voir « Sauvegarde »).',
          'Système (toujours visible) : langue (aussi « Comme le système d’exploitation »), thème de couleurs, version et état du serveur et de la base de données, nombre de personnes et de médias, niveau de journalisation, le journal du serveur et du navigateur avec un export pour l’analyse d’erreurs (il ne contient aucune donnée d’arbre), les licences et, dans l’application de bureau, les mises à jour du programme (voir « Application de bureau »).',
        ],
      },
      {
        p: 'Les blocs s’ouvrent et se ferment d’un clic (« Tout développer » / « Tout réduire »). Le champ de recherche au-dessus trouve un paramètre, ouvre son bloc et se place sur le champ. L’apparence, la langue et les valeurs par défaut de l’arbre sont enregistrées dans ce navigateur ou cette fenêtre de l’application.',
      },
    ],
    link: { to: '/settings', label: 'Aller aux paramètres' },
  },
  {
    id: 'desktop-app',
    title: 'Application de bureau (Windows, Linux)',
    blocks: [
      {
        p: 'L’application de bureau affiche Cognatio dans sa propre fenêtre – sans navigateur, sans Node, sans base de données à installer. Elle démarre sa propre base de données en arrière-plan et l’arrête quand vous fermez la fenêtre ou choisissez « Quitter » en bas de la barre latérale. Une seule instance fonctionne à la fois.',
      },
      {
        list: [
          'Windows : installer avec le fichier d’installation (par utilisateur, sans droits d’administrateur) ou décompresser le ZIP portable, qui range toutes les données dans un dossier « data » à côté du programme.',
          'Linux : l’AppImage est un fichier unique – le rendre exécutable et le lancer, il s’ajoute lui-même au menu des applications. Le paquet Debian s’installe avec « sudo apt install ./Cognatio-….deb ». S’il a été installé avec « dpkg -i », « sudo apt --fix-broken install » ajoute les bibliothèques manquantes et termine l’installation – sinon Cognatio ne démarre pas.',
          'Vos données se trouvent dans %APPDATA%\\Cognatio sous Windows et dans ~/.config/Cognatio sous Linux, séparées du programme : une mise à jour ou une désinstallation ne les supprime jamais. Le désinstalleur de Windows demande si les données doivent aussi être supprimées – téléchargez d’abord une sauvegarde.',
          'Faites de temps en temps une sauvegarde (Paramètres → Sauvegarde) et conservez-la ailleurs. L’application enregistre aussi sa base de données automatiquement avant chaque mise à jour et une fois par jour.',
        ],
      },
      {
        p: 'Sous Paramètres → Système → Mises à jour du programme, Cognatio cherche une nouvelle version environ une fois par jour (l’interrupteur s’y trouve ; « Vérifier maintenant » cherche tout de suite). Seule la demande du fichier de version est envoyée. Une nouvelle version est téléchargée en arrière-plan et installée au redémarrage ; la base de données est enregistrée auparavant. « Aussi les versions de test (bêta) » propose des versions avant leur publication ; revenir aux versions publiées n’installe jamais une version plus ancienne. Le ZIP portable et le paquet Debian ne sont pas mis à jour par l’application – installez vous-même la nouvelle version.',
      },
    ],
    link: { to: '/settings', label: 'Aller aux paramètres' },
  },
  {
    id: 'versions',
    title: 'Historique des versions',
    blocks: [{ p: 'Ce qui a changé dans chaque version, la plus récente en premier. Un clic sur une fonction mène au chapitre d’aide correspondant.' }],
  },
  {
    id: 'faq',
    title: 'Questions fréquentes',
    blocks: [
      {
        faq: [
          { q: 'J’ai supprimé une personne par erreur.', a: 'Ouvrez la corbeille et choisissez « Restaurer » pour la personne.' },
          {
            q: 'Je ne connais une date qu’approximativement.',
            a: 'Saisissez-la dans la mesure où vous la connaissez, p. ex. « vers 1880 », « avant 1900 » ou « 1880-1885 ».',
          },
          {
            q: 'Comment reprendre mon arbre généalogique d’Ancestry, de MyHeritage ou d’un autre logiciel ?',
            a: 'Exportez-le là-bas sous forme de fichier GEDCOM (.ged) et importez-le sous « Import/Export » comme nouvel arbre généalogique.',
          },
          {
            q: 'Une personne existe en double.',
            a: 'Complétez les informations et les relations manquantes sur l’une des deux et supprimez l’autre.',
          },
          {
            q: 'Puis-je utiliser l’application sans souris ?',
            a: 'Oui : Tab et Maj+Tab passent d’un élément à l’autre, Entrée ou Espace les activent, Échap ferme les boîtes de dialogue. Le premier appui sur Tab affiche « Aller au contenu ».',
          },
          {
            q: 'Où sont enregistrées mes données ?',
            a: 'Sur votre propre ordinateur. Dans l’application de bureau, dans le dossier %APPDATA%\\Cognatio (Windows) ou ~/.config/Cognatio (Linux), dans la variante portable dans le dossier « data » à côté du programme ; si vous exploitez vous-même le serveur, dans sa base de données et son dossier de téléversement. Seuls la langue, le thème de couleurs et les réglages d’affichage sont conservés dans le navigateur ou la fenêtre de l’application.',
          },
          {
            q: 'Comment transférer mes données vers un autre ordinateur ?',
            a: 'Sous Paramètres → Sauvegarde, choisissez « Télécharger la sauvegarde », copiez le fichier sur l’autre ordinateur, installez-y Cognatio et choisissez « Restaurer une sauvegarde… ». Un seul arbre généalogique peut être transféré avec l’export et l’import ZIP sous « Import/Export ».',
          },
          {
            q: 'Comment mettre l’application à jour ?',
            a: 'L’application de bureau cherche seule les mises à jour (Paramètres → Système → Mises à jour du programme) et les installe au redémarrage. Le ZIP portable et le paquet Debian se mettent à jour en installant la nouvelle version ; vos données sont conservées.',
          },
        ],
      },
    ],
  },
];

export default help;
