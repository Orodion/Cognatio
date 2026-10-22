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
        p: 'La page d’accueil affiche le nombre de personnes et la répartition par sexe, des accès rapides aux principaux domaines, les personnes ajoutées en dernier et quelques conseils. L’aide a son propre champ de recherche au-dessus des chapitres. La carte « Anniversaires » liste les anniversaires de naissance, de décès et de mariage des 30 prochains jours – pour les dates avec jour, mois et année ; un anniversaire de mariage est le début d’une relation époux/épouse.',
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
        p: 'Seul le prénom est obligatoire. S’il est inconnu, cochez « Prénom inconnu » – l’application affiche alors « (prénom inconnu) ». Saisissez les dates dans la mesure où vous les connaissez : 04.01.1880 (exacte), 01.1880 (mois), 1880 (année), « vers 1880 », « avant 1880 », « après 1880 » ou la période « 1880-1885 ». L’application détecte elle-même la précision. Une date écrite en toutes lettres, comme « 2 octobre 1880 », devient « 02.10.1880 ».',
      },
      {
        p: 'Lorsque vous créez une personne, l’application signale les personnes existantes ayant un nom proche et la même année de naissance – pour éviter les doublons. Les champs de lieu – naissance, décès et événements – proposent pendant la saisie les lieux déjà présents dans l’arbre généalogique ; tout autre lieu reste possible.',
      },
      {
        list: [
          'Aperçu : données personnelles, contact et autres informations ; « Modifier » permet de les changer.',
          'Chronologie : événements comme la naissance, le baptême, le mariage ou un déménagement, avec date et lieu. Un événement peut être lié à des fichiers – y compris ceux d’autres personnes, p. ex. une photo de groupe. Les événements peuvent être triés du plus ancien au plus récent ou inversement et affichés en chronologie ou en tableau ; le choix est mémorisé.',
          'Relations : voir la section « Relations ».',
          'Notes : texte libre, p. ex. anecdotes ou notes de recherche, jusqu’à 10 000 caractères chacune.',
          'Médias : téléversez photos et documents (aussi des vidéos, sans limite de taille par fichier) ; une image peut être définie comme photo de profil. L’icône de téléchargement enregistre un fichier sous son nom d’origine. Un clic sur un fichier l’affiche dans une fenêtre à part, avec son nom comme titre – images, PDF, vidéos, audio et fichiers texte (p. ex. TXT, Markdown, CSV) ; les autres fichiers, comme les ZIP, sont enregistrés directement.',
          'Les médias peuvent être affichés en vignettes ou en liste (boutons au-dessus des fichiers).',
          'Sources : les citations de la personne, de ses événements et de ses relations – voir la section « Sources et citations ».',
          'Filtre : le champ à côté des onglets (sauf « Aperçu ») filtre les entrées de l’onglet ouvert – parcours, relations, notes, médias ou sources. Majuscules et accents sont ignorés, avec plusieurs mots tous doivent apparaître, et les résultats sont surlignés. La recherche porte sur tous les textes, p. ex. titre, catégorie, date, lieu, description et noms de fichiers. Dans les relations, le graphique n’affiche aussi que les personnes restantes. Le texte est conservé quand vous changez d’onglet ; Échap ou la croix l’efface.',
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
        p: 'Certaines relations sont ajoutées automatiquement : quand un parent et un enfant sont reliés, le partenaire du parent devient aussi parent de l’enfant (si le parent a exactement un partenaire et que l’enfant n’a pas encore de second parent ; avec plusieurs partenaires, le second parent est à ajouter à la main ; la relation commence à la naissance de l’enfant si elle est connue précisément), et les autres enfants du parent deviennent frères et sœurs de l’enfant. Le bouton de suppression à côté d’une relation ne supprime que la relation – les personnes restent.',
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
    id: 'sources',
    title: 'Sources et citations',
    blocks: [
      {
        p: 'Une source est un document ou une œuvre d’où proviennent les données – un registre paroissial, un registre d’état civil, un recensement, une lettre, une pierre tombale, un site web ou un entretien. Une citation est un acte qu’elle contient : page ou numéro d’acte, date, l’acte mot pour mot, sa fiabilité et des scans. Une citation peut étayer un nombre quelconque de faits, p. ex. un acte de mariage l’époux, l’épouse, leurs parents, les témoins, les noces et le mariage.',
      },
      {
        p: 'Les sources, les dépôts et les citations forment une collection pour tous les arbres : une mairie ou un registre paroissial est créé une seule fois, et une citation peut étayer des faits de personnes de plusieurs arbres. Une modification d’une source s’applique partout.',
      },
      {
        list: [
          'Sur la page d’une personne, l’onglet « Sources » liste les citations de la personne, de ses événements et de ses relations, regroupées par fait. « Citer une source » choisit le fait, une source (ou en crée une) et une citation existante de celle-ci ou une nouvelle. Un petit livre à côté du nom, de la naissance, du décès, d’un événement ou d’une relation indique combien de citations il a ; un clic ouvre l’onglet.',
          '« Sources » dans la barre latérale liste les sources que l’arbre ouvert utilise et celles qui ne sont utilisées nulle part ; « Tous les arbres » affiche toute la collection. La page d’une source affiche ses champs, ses scans et ses citations avec les faits que chacune étaye, classés par personne avec les années de vie ; le × d’un fait supprime le lien ; « Lier des faits » lie une citation à d’autres personnes, l’une après l’autre.',
          'Les dépôts d’archives (mairie, archives paroissiales, bibliothèque, site web) se gèrent dans le deuxième onglet et se choisissent pour chaque source ; un nouveau peut aussi être créé directement dans le formulaire d’une source.',
          'La fiabilité suit les niveaux de GEDCOM : source primaire (l’acte original), source secondaire (rédigée plus tard), douteuse (p. ex. tradition orale), peu fiable ou estimée.',
          'Les scans appartiennent à toute la source (page de titre, pierre tombale) ou à une citation (la page précise).',
          'La recherche en haut trouve aussi les sources – par titre, auteur, dépôt, cote et les transcriptions de leurs citations ; elles sont listées au-dessus des personnes trouvées. Les statistiques montrent combien de personnes ont une citation et quelles sources sont les plus citées.',
          'GEDCOM : l’export écrit les dépôts et les sources comme enregistrements REPO et SOUR et chaque citation aux faits qu’elle étaye (page, date, transcription, fiabilité, scans dans le GEDZIP) ; l’import reprend aussi les sources d’autres logiciels – également sous les noms, les événements et les familles – et refait une seule citation des citations identiques.',
        ],
      },
      {
        p: 'Supprimer une source la déplace dans la corbeille avec ses citations : elles disparaissent de tous les faits et reviennent à sa restauration. Un dépôt dans la corbeille laisse ses sources sans dépôt jusqu’à sa restauration. La suppression définitive d’une personne, d’un événement, d’une relation ou d’un arbre ne retire que leurs liens ; les sources restent.',
      },
      {
        p: 'L’export d’un arbre contient les sources, dépôts et citations qu’utilisent ses personnes, avec leurs scans ; un import réutilise une source déjà présente au lieu de la copier. La transcription d’une citation peut nommer des personnes d’un autre arbre – elle fait partie de l’export. Un fichier d’export contenant des sources ne peut être lu que par cette version de Cognatio ou une version plus récente.',
      },
    ],
    link: { to: '/sources', label: 'Aller aux sources' },
  },
  {
    id: 'search',
    title: 'Recherche',
    blocks: [
      {
        p: 'Le champ de recherche en haut parcourt l’arbre généalogique ouvert : les noms – y compris les orthographes proches, de sorte que « Meier » trouve aussi « Mayer » et « Maier » –, les données personnelles comme les lieux et les professions, la chronologie et les notes. Chaque résultat indique par quoi il a été trouvé. Les noms écrits en cyrillique comptent comme leur graphie latine : « Иванов » trouve aussi « Iwanow » et « Ivanov ». Elle trouve aussi des sources, affichées au-dessus des personnes trouvées (voir « Sources et citations »).',
      },
    ],
  },
  {
    id: 'statistics',
    title: 'Statistiques',
    blocks: [
      {
        p: 'Les statistiques analysent l’arbre généalogique ouvert (hors corbeille), réparties en onglets : « Vue d’ensemble » avec des chiffres clés comme le nombre de personnes, les sexes et la durée de vie moyenne, « Vies » avec la répartition par âge, « Noms et lieux » avec les noms de famille et lieux de naissance les plus fréquents, « Ancêtres » avec l’aperçu des générations et « Sources » avec les sources utilisées, les personnes ayant au moins une citation et les sources les plus citées.',
      },
      {
        p: 'Chaque nombre qui compte des personnes est un lien : un clic sur un chiffre clé, une barre ou une génération ouvre la liste des personnes avec exactement ces personnes. Au-dessus de la liste figure la sélection dont elles proviennent ; le × affiche de nouveau toutes les personnes, « Retour aux statistiques » ramène à la page. Une recherche en haut ne porte alors que sur ces personnes.',
      },
      {
        p: 'Au-dessus des onglets se choisit le périmètre : tout l’arbre, les ancêtres ou les descendants d’une personne (elle-même comprise) ou toutes les personnes d’un nom de famille (aussi comme nom de naissance) – au besoin seulement celles nées certaines années. Tous les nombres et listes en tiennent compte ; seules les sources portent toujours sur tout l’arbre. Le dernier périmètre choisi est conservé pour chaque arbre.',
      },
      {
        p: '« Que manque-t-il encore ? » dans la vue d’ensemble indique pour la date et le lieu de naissance, la date et le lieu de décès (des décédés), le père, la mère, le partenaire (des décédés à partir de 18 ans), la photo et la source pour combien de personnes la donnée est saisie ; l’état des recherches est la moyenne de ces parts. Un clic sur les manquantes ouvre la liste des personnes pour lesquelles il reste quelque chose à faire.',
      },
      {
        p: '« Ancêtres » indique par génération combien des ancêtres possibles (2 parents, 4 grands-parents, 8 arrière-grands-parents …) sont trouvés, qui apparaît plusieurs fois (implexe) et les branches ouvertes – des ancêtres dont le père ou la mère manque encore. L’analyse commence par la personne principale de l’arbre, définie avec « Personne principale » sur la page d’une personne ; les rapports et l’arbre commencent aussi par elle.',
      },
      {
        p: 'La frise de la vue d’ensemble montre les naissances, les décès ou les mariages par décennie ; les décennies vides restent, pour que les lacunes de la recherche ressortent. Les mariages sont le début d’un mariage (relation époux/épouse) ou l’événement « mariage », une fois par couple et par année ; les concubins et partenaires ne comptent qu’avec cet événement.',
      },
      {
        p: '« Les vies au fil du temps », sous « Vies », montre par siècle de naissance, séparément pour les hommes et les femmes, la durée de vie moyenne – aussi de ceux seulement qui ont atteint 15 ans –, l’âge au premier mariage et à la naissance du premier enfant ; entre parenthèses, le nombre de personnes sur lequel repose la valeur, une moyenne de moins de 5 personnes n’est pas affichée. Ensuite le nombre d’enfants par couple et l’écart d’âge des partenaires.',
      },
      {
        p: '« Noms et lieux » montre aussi les prénoms les plus fréquents des hommes et des femmes – chaque prénom compte, « Johann Georg » donc pour Johann et pour Georg – et la mode des prénoms par siècle. « Migrations » montre qui est mort au lieu de naissance, les parcours les plus fréquents du lieu de naissance au lieu de décès en passant par les déménagements, et les lieux avec leurs personnes et la période des données qui s’y rapportent.',
      },
      {
        p: '« Records », sous « Vies », indique la vie la plus longue, le mariage le plus long, le plus d’enfants, de partenaires et de descendants, les parents les plus jeunes et les plus âgés lors d’une naissance et le plus grand écart d’âge d’un couple – uniquement pour les personnes décédées. Si un record est aussi une erreur possible, comme une mère de 61 ans, une indication avec lien l’accompagne.',
      },
      {
        p: '« Imprimer ou enregistrer en PDF » ouvre le rapport « Statistiques » avec tous les chiffres du périmètre choisi sous forme de tableaux. « Copier en CSV » sur chaque carte place ses chiffres dans le presse-papiers, pour les coller dans un tableur. Les assistants IA obtiennent les mêmes chiffres avec l’outil « get_statistics », aussi pour un périmètre.',
      },
    ],
    link: { to: '/statistics', label: 'Aller aux statistiques' },
  },
  {
    id: 'checks',
    title: 'Erreurs possibles',
    blocks: [
      {
        p: '« Erreurs possibles » liste les données de l’arbre ouvert qui sont permises mais rarement exactes – souvent une faute de frappe : un homme saisi comme mère ou une femme comme mari, des partenaires qui sont aussi parent et enfant ou frère et sœur, un enfant avec plus de deux parents, un parent de moins de 12 ans ou une mère de plus de 55 ans à la naissance, un parent mort avant la naissance, un couple qui commence avant la naissance ou après la mort d’un partenaire, un décès avant la naissance, une vie de plus de 110 ans ou une personne de plus de 110 ans sans date de décès, des événements avant la naissance ou après le décès, des doublons possibles et des personnes qui sont leurs propres ancêtres. Une date approximative comme « vers 1880 » compte cinq ans dans chaque sens : seul ce qui ne va sûrement pas est signalé.',
      },
      {
        p: 'Chaque entrée nomme les personnes avec un lien vers elles. Corrigez l’erreur là – l’entrée disparaît d’elle-même – ou cliquez sur « C’est exact » si la donnée est juste : l’entrée est alors masquée, même après une sauvegarde et une restauration. « Afficher aussi celles marquées comme exactes » les affiche à nouveau.',
      },
      {
        p: 'Si vous enregistrez une relation qui semble erronée, l’application indique pourquoi et demande si vous voulez l’enregistrer quand même. Les assistants IA doivent aussi vous demander avant d’enregistrer une telle relation.',
      },
    ],
    link: { to: '/checks', label: 'Aller aux erreurs possibles' },
  },
  {
    id: 'reports',
    title: 'Rapports',
    blocks: [
      {
        p: 'Sous « Rapports », les données de l’arbre généalogique ouvert peuvent être imprimées ou enregistrées en PDF : la fiche individuelle (toutes les données d’une personne avec ses proches, événements, notes, photos et les sources en notes de bas de page – aussi pour toutes les personnes à la fois), la fiche familiale (un couple avec mariage, parents et enfants), la liste d’ascendance avec numéros Sosa-Kekulé (père de n = 2n, mère = 2n + 1 ; un ancêtre présent deux fois renvoie au premier numéro) et la liste de descendance avec numéros d’Aboville (1, 1.1, 1.1.2 …). Le bouton « Rapport » sur la page d’une personne ouvre les rapports avec cette personne comme point de départ.',
      },
      {
        p: 'Au-dessus de l’aperçu, vous choisissez photos, notes, sources, coordonnées et si les personnes vivantes n’apparaissent qu’avec nom et année de naissance ; le choix est mémorisé. « Imprimer » ouvre la boîte de dialogue d’impression. « Enregistrer en PDF » demande dans l’application de bureau le nom du fichier et écrit le PDF lui-même ; dans un navigateur, choisissez « Enregistrer au format PDF » comme imprimante. Chaque fiche commence sur une nouvelle page et les pages sont numérotées.',
      },
    ],
    link: { to: '/reports', label: 'Aller aux rapports' },
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
        p: 'L’export et l’import concernent l’arbre généalogique ouvert. L’export ZIP contient toutes les données et tous les médias – pour une sauvegarde ou pour une autre installation de Cognatio. GEDCOM (5.5.1 ou 7.0) est le format d’échange d’autres logiciels de généalogie comme Ancestry, MyHeritage ou Gramps, au besoin avec images et documents. Les fichiers peuvent avoir n’importe quelle taille, aussi au-delà de 4 GB ; une limite maximale peut être fixée sous « Paramètres → Données et sauvegarde ».',
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
        p: 'Lorsqu’un fichier GEDCOM est importé à nouveau, l’application reconnaît les personnes existantes et ne les crée pas en double. L’historique des imports montre les imports précédents. Si, après l’importation, une personne était son propre ancêtre (un cycle dans les relations parent-enfant), l’aperçu nomme les personnes ; l’importation a lieu quand même et vous corrigez ensuite les relations à la main.',
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
        p: 'Sous « Paramètres → Sauvegarde », « Télécharger la sauvegarde » télécharge un fichier contenant tous les arbres généalogiques, les médias, la corbeille et l’historique des imports. Les arbres individuels se sauvegardent via « Import/Export ». Si une limite maximale est fixée sous « Limites de taille », une sauvegarde plus grande est tout de même enregistrée, mais ne peut être restaurée qu’après avoir relevé la limite.',
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
        p: 'Taille : l’export, l’import, la sauvegarde et la restauration lisent et écrivent les fichiers morceau par morceau – même de très gros fichiers (50 GB et plus) n’utilisent presque pas de mémoire. Auparavant, l’application vérifie que le lecteur dispose d’assez d’espace libre ; une restauration demande environ l’espace de la sauvegarde plus celui des données actuelles, car elle enregistre d’abord entièrement l’état actuel. « Activité » dans la barre latérale affiche la progression de ces opérations et des envois de médias, même si vous avez ouvert une autre page entre-temps, et liste les opérations terminées jusqu’à la fermeture de l’application ; l’import et la restauration peuvent y être annulés tant que les données ne sont pas remplacées. Sous « Paramètres → Données et sauvegarde → Limites de taille », une limite maximale peut être fixée (aucune par défaut). Les clés USB en FAT32 acceptent au plus 4 GB par fichier – pour les grosses sauvegardes, choisissez un lecteur en exFAT ou NTFS.',
      },
    ],
    link: { to: '/settings', label: 'Aller aux paramètres' },
  },
  {
    id: 'trash',
    title: 'Corbeille',
    blocks: [
      {
        p: 'La corbeille contient les personnes supprimées de l’arbre généalogique ouvert et les arbres généalogiques supprimés ; le nombre dans la barre latérale indique combien il y en a. « Restaurer » les récupère. « Supprimer définitivement » efface aussi les relations, événements, notes et médias et ne peut être annulé qu’avec une sauvegarde. En dessous, « Sources et dépôts d’archives » liste les sources et dépôts supprimés ; ils appartiennent à tous les arbres généalogiques, et une source emporte ses citations – une fois restaurée, elles reviennent à tous les faits.',
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
          'Assistants IA (MCP) : si les assistants IA peuvent agir et ce qu’ils peuvent faire (voir « Assistants IA (MCP) »).',
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
    id: 'ai-assistants',
    title: 'Assistants IA (MCP)',
    blocks: [
      {
        p: 'Les assistants IA comme Claude (Claude Desktop, Claude Code) et d’autres programmes qui parlent le Model Context Protocol (MCP) peuvent travailler avec vos arbres généalogiques : rechercher des personnes, répondre à des questions comme « Quels ancêtres venaient de Poméranie ? », signaler des lacunes et, si vous l’autorisez, saisir ce que vous dictez ou ce que dit un acte paroissial numérisé.',
      },
      {
        p: 'Il s’active dans Paramètres → « Assistants IA (MCP) ». L’application affiche alors l’adresse et un jeton – le jeton une seule fois – avec une commande prête pour Claude Code et un bloc de configuration pour d’autres programmes. Les assistants se connectent uniquement à cet ordinateur ; ce qu’ils lisent est transmis au fournisseur du modèle d’IA que vous utilisez.',
      },
      {
        steps: [
          'Paramètres → « Assistants IA (MCP) » : cochez « Autoriser les assistants IA ». L’adresse et le jeton apparaissent – le jeton seulement maintenant.',
          'Copiez « Commande pour Claude Code » et exécutez-la une fois dans un terminal (claude mcp add --transport http cognatio …). Avec « --scope user » après « --transport http », elle vaut dans tous les dossiers.',
          'Lancez Claude Code : « /mcp » affiche « cognatio » comme connecté, avec ses outils.',
          'Posez vos questions avec vos mots. Pour des modifications, cochez le niveau du domaine (p. ex. « Écrire » pour les personnes).',
        ],
      },
      {
        p: 'Vous pouvez par exemple demander :',
      },
      {
        list: [
          'Qui sont les ancêtres d’Anna Kraft jusqu’aux arrière-grands-parents, et lesquels venaient de Poméranie ?',
          'Quelles personnes sont nées entre 1850 et 1900 à Leipzig ? Y a-t-il des doublons possibles ?',
          'Avec « écrire » : « Ajoute un baptême d’Anna Kraft le 2 octobre 1951 à Leipzig. » ou « Saisis cet acte paroissial avec sa source. »',
          'Avec les autorisations pour les fichiers : « Exporte l’arbre en GEDCOM dans mon dossier Documents. » ou « Ajoute le scan …\\taufschein.jpg au baptême d’Anna. »',
        ],
      },
      {
        list: [
          'Autorisations par domaine : désactivé, lire, écrire (créer, modifier, mettre à la corbeille – annulable dans l’application) et supprimer (irréversible, p. ex. restaurer une sauvegarde). Après l’activation, chaque domaine est sur « lire » ; avant « écrire » ou « supprimer », l’application demande confirmation.',
          'Arbres généalogiques : un assistant ne voit que les arbres cochés ; les nouveaux arbres sont visibles.',
          'Les fichiers ne passent jamais par MCP : un assistant indique un fichier de cet ordinateur (dans votre dossier personnel, de données ou de sauvegarde), p. ex. un scan à ajouter, un fichier à importer ou un dossier pour un export.',
          'Chaque modification d’un assistant apparaît dans « Activité » ; le journal a le filtre « Assistants IA uniquement (MCP) ».',
          'Jeton perdu ? « Nouveau jeton » le remplace et l’ancien cesse de fonctionner. La désactivation rend le jeton invalide immédiatement.',
          'L’adresse contient le port de l’application, qui reste le même d’un démarrage à l’autre. Si l’application de bureau a dû en prendre un autre, la section l’indique – l’assistant a alors besoin de la nouvelle adresse.',
          'Un assistant ne peut jamais modifier lui-même les paramètres des assistants IA.',
        ],
      },
      {
        faq: [
          { q: 'L’assistant reçoit « 404 » ou « MCP est désactivé ».', a: 'Cochez « Autoriser les assistants IA » dans les paramètres.' },
          {
            q: 'L’assistant reçoit « 401 » ou « jeton manquant ou erroné ».',
            a: 'Le jeton a été remplacé ou MCP a été désactivé entre-temps. Créez un nouveau jeton et ajoutez à nouveau le serveur (« claude mcp remove cognatio », puis la nouvelle commande).',
          },
          {
            q: 'Un outil manque ou répond « NOT_ALLOWED ».',
            a: 'L’autorisation de son domaine est trop basse – relevez-la dans les paramètres ; dans Claude Code, « /mcp » relit les outils.',
          },
          {
            q: 'L’assistant ne parvient pas du tout à se connecter.',
            a: 'Cognatio doit être en cours d’exécution. Si les paramètres indiquent que le port a changé, ajoutez le serveur avec la nouvelle adresse.',
          },
        ],
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
