import type { HelpSection } from '../types';

const help: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Primeros pasos',
    blocks: [
      {
        p: 'Cognatio gestiona tu árbol genealógico: personas, sus relaciones, acontecimientos de la vida, fotos y documentos. Elige un área a la izquierda y busca personas en la parte superior. El botón ? de arriba a la derecha abre la ayuda de la página en la que estás.',
      },
      {
        steps: [
          'En «Personas», pulsa «Nueva persona», introduce al menos el nombre y guarda.',
          'En la página de la persona, añade padres, hijos, parejas o hermanos en la pestaña «Relaciones»: elige una persona existente o crea una nueva allí mismo.',
          'Mira el resultado en «Árbol genealógico». Con una persona central, el árbol muestra la familia desde el punto de vista de esa persona.',
        ],
      },
      {
        p: 'La página de inicio muestra el número de personas y la distribución por sexo, accesos rápidos a las áreas principales, las personas añadidas más recientemente y algunos consejos. La ayuda tiene su propio campo de búsqueda sobre los capítulos. La tarjeta «Aniversarios» muestra los cumpleaños, aniversarios de fallecimiento y de boda de los próximos 30 días, para fechas con día, mes y año; un aniversario de boda es el inicio de una relación esposo/esposa.',
      },
      {
        p: 'Árbol de ejemplo: en el primer inicio, la aplicación de escritorio crea el árbol genealógico «Familie Kraft (Demo)»: diez personas ficticias en cuatro generaciones con relaciones, eventos de vida, notas y fotos, para que pruebes cada área enseguida. Su contenido está en alemán. Para empezar con tus datos, crea un árbol genealógico nuevo en «Árboles genealógicos» y elimina el ejemplo (va a la papelera y no vuelve a aparecer). El archivo Cognatio-Demo-Familie-Kraft.zip está en la carpeta del programa (carpeta «demo» dentro de «resources») y en la carpeta «demo» del proyecto; en Importar/Exportar puedes importarlo de nuevo como un árbol genealógico nuevo.',
      },
    ],
    link: { to: '/persons', label: 'Ir a personas' },
  },
  {
    id: 'persons',
    title: 'Personas',
    blocks: [
      {
        p: 'Solo el nombre es obligatorio. Si se desconoce, marca «Nombre desconocido»: la aplicación mostrará «(nombre desconocido)». Introduce las fechas hasta donde las conozcas: 04.01.1880 (exacta), 01.1880 (mes), 1880 (año), «hacia 1880», «antes de 1880», «después de 1880» o el intervalo «1880-1885». La aplicación detecta la precisión por sí sola. Una fecha escrita, como «2 de octubre de 1880», se convierte en «02.10.1880».',
      },
      {
        p: 'Al crear una persona, la aplicación avisa de las personas existentes con un nombre parecido y el mismo año de nacimiento, para que no se creen duplicados. Los campos de lugar – nacimiento, fallecimiento y acontecimientos – proponen al escribir los lugares que ya aparecen en el árbol genealógico; se puede seguir introduciendo cualquier otro lugar.',
      },
      {
        list: [
          'Resumen: datos personales, contacto y otros datos; «Editar» los modifica.',
          'Cronología: acontecimientos como nacimiento, bautismo, boda o mudanza, con fecha y lugar. Un acontecimiento puede vincularse a archivos, también de otras personas, p. ej. una foto de grupo. Los sucesos se pueden ordenar del más antiguo al más reciente o al revés y mostrar como cronología o como tabla; la elección se recuerda.',
          'Relaciones: consulta la sección «Relaciones».',
          'Notas: texto libre, p. ej. historias o apuntes de investigación, de hasta 10.000 caracteres cada una.',
          'Archivos: sube fotos y documentos (también vídeos, sin límite de tamaño por archivo); una imagen puede usarse como foto de perfil. El icono de descarga guarda un archivo con su nombre original. Al hacer clic en un archivo se muestra en una ventana propia con su nombre como título: imágenes, PDF, vídeos, audio y archivos de texto (p. ej. TXT, Markdown, CSV); otros archivos, como ZIP, se guardan directamente.',
          'Los archivos se pueden ver como mosaico o como lista (botones sobre los archivos).',
          'Fuentes: las citas de la persona, de sus acontecimientos y de sus relaciones; consulta la sección «Fuentes y citas».',
          'Filtro: el campo junto a las pestañas (excepto «Resumen») filtra las entradas de la pestaña abierta: cronología, relaciones, notas, archivos o fuentes. Se ignoran mayúsculas y acentos, con varias palabras deben aparecer todas, y las coincidencias se resaltan. Se busca en todos los textos, p. ej. título, categoría, fecha, lugar, descripción y nombres de archivo. En las relaciones, el gráfico muestra solo las personas restantes. El texto se conserva al cambiar de pestaña; Esc o la X lo borra.',
        ],
      },
      { p: '«Eliminar» mueve la persona a la papelera, de donde se puede restaurar.' },
    ],
    link: { to: '/persons', label: 'Ir a personas' },
  },
  {
    id: 'relations',
    title: 'Relaciones',
    blocks: [
      {
        p: 'Las relaciones se añaden en la página de una persona, en la pestaña «Relaciones», o ya al crear la persona. El tipo de relación describe a la persona seleccionada desde el punto de vista de la persona actual: si estás en la página de Ana y eliges a Max como «Padre», Max es el padre de Ana. La dirección contraria (Ana es hija de Max) se muestra automáticamente.',
      },
      {
        list: [
          'Tipos: madre, padre, hijo/a, hermano/a, marido, esposa, compañero/a de vida, pareja, otro.',
          'Etiqueta (opcional), p. ej. «hijo adoptivo» o «padrastro».',
          'Periodo desde – hasta, p. ej. para un matrimonio; para un hijo se sugiere la fecha de nacimiento como inicio.',
          'Si la persona aún no existe, elige «Persona nueva» y créala en el propio cuadro de diálogo.',
          'Gráfico: junto a la lista (encima en pantallas estrechas), las relaciones de la persona se dibujan como un diagrama: padres arriba, parejas al lado, hijos debajo. Un clic en una persona la abre; el botón «Gráfico» lo oculta o lo muestra, y la elección se recuerda.',
        ],
      },
      {
        p: 'Algunas relaciones se añaden automáticamente: al vincular a un progenitor con un hijo, la pareja del progenitor también pasa a ser progenitor del hijo (si el progenitor tiene exactamente una pareja y el hijo aún no tiene un segundo progenitor; con varias parejas, el segundo progenitor se añade a mano; la relación empieza con el nacimiento del hijo si se conoce con exactitud) y los demás hijos del progenitor pasan a ser hermanos del hijo. El botón de eliminar junto a una relación solo quita la relación; las personas permanecen.',
      },
    ],
  },
  {
    id: 'tree',
    title: 'Vista del árbol genealógico',
    blocks: [
      {
        list: [
          'Árbol genealógico: todas las familias del árbol.',
          'Gráfico de ascendientes: padres, abuelos, etc. de la persona central.',
          'Gráfico de descendientes: hijos, nietos, etc. de la persona central.',
          'Red de relaciones: todas las conexiones en forma de red.',
        ],
      },
      {
        p: 'La persona central determina desde quién se dibuja el árbol; «Generaciones» limita la profundidad. Puedes acercar y alejar con la rueda del ratón o la barra de zoom; un clic en una persona abre su página. El color del borde indica el sexo. Los árboles muy grandes (a partir de 400 personas) no se dibujan automáticamente: elige una persona central y menos generaciones.',
      },
      {
        p: '«Exportar» guarda el árbol como PNG o SVG o lo imprime (también como PDF), a elección solo el área visible. La aplicación recuerda la vista, las generaciones y la persona central; los valores predeterminados se ajustan en «Ajustes». En la página de una persona, «Mostrar árbol» abre el árbol con ella como persona central.',
      },
    ],
    link: { to: '/tree', label: 'Ir al árbol genealógico' },
  },
  {
    id: 'sources',
    title: 'Fuentes y citas',
    blocks: [
      {
        p: 'Una fuente es un documento u obra del que proceden los datos: un libro parroquial, un registro civil, un censo, una carta, una lápida, un sitio web o una entrevista. Una cita es una entrada en ella: página o número de entrada, fecha, la entrada palabra por palabra, su fiabilidad y escaneos. Una cita puede respaldar cualquier número de hechos; p. ej., una partida de matrimonio, al novio, la novia, sus padres, los testigos, la boda y el matrimonio.',
      },
      {
        p: 'Las fuentes, los archivos y las citas forman una colección para todos los árboles: un registro civil o un libro parroquial se crea una vez, y una cita puede respaldar hechos de personas de varios árboles. Un cambio en una fuente se aplica en todas partes.',
      },
      {
        list: [
          'En la página de una persona, la pestaña «Fuentes» muestra las citas de la persona, de sus acontecimientos y de sus relaciones, agrupadas por hecho. «Citar fuente» elige el hecho, una fuente (o crea una) y una cita existente de ella o una nueva. Un pequeño libro junto al nombre, el nacimiento, la defunción, un acontecimiento o una relación muestra cuántas citas tiene; un clic abre la pestaña.',
          '«Fuentes» en la barra lateral muestra las fuentes que usa el árbol abierto y las que no se usan en ninguna parte; «Todos los árboles» muestra la colección entera. La página de una fuente muestra sus campos, escaneos y citas con los hechos que respalda cada una, ordenados por persona y con los años de vida; la × de un hecho quita el vínculo; «Vincular hechos» vincula una cita con más personas, una tras otra.',
          'Los archivos (registro civil, archivo parroquial, biblioteca, sitio web) se gestionan en la segunda pestaña y se eligen en cada fuente; también se puede crear uno nuevo directamente en el formulario de una fuente.',
          'La fiabilidad sigue los niveles de GEDCOM: fuente primaria (la entrada original), fuente secundaria (escrita más tarde), dudosa (p. ej., tradición oral), poco fiable o estimada.',
          'Los escaneos pertenecen a toda la fuente (portada, lápida) o a una cita (la página concreta).',
          'La búsqueda de arriba también encuentra fuentes, por título, autor, archivo, signatura y las transcripciones de sus citas; aparecen encima de las personas encontradas. Las estadísticas muestran cuántas personas tienen una cita y qué fuentes son las más citadas.',
          'GEDCOM: la exportación escribe los archivos y las fuentes como registros REPO y SOUR, y cada cita en los hechos que respalda (página, fecha, transcripción, fiabilidad, escaneos en GEDZIP); la importación también recoge las fuentes de otros programas, incluso bajo nombres, acontecimientos y familias, y vuelve a unir las citas iguales en una.',
        ],
      },
      {
        p: 'Al eliminar una fuente, pasa a la papelera junto con sus citas: desaparecen de todos los hechos y vuelven al restaurarla. Un archivo en la papelera deja sus fuentes sin archivo hasta que se restaure. Si se elimina definitivamente una persona, un acontecimiento, una relación o un árbol, solo desaparecen sus vínculos; las fuentes se conservan.',
      },
      {
        p: 'La exportación de un árbol contiene las fuentes, los archivos y las citas que usan sus personas, con sus escaneos; una importación reutiliza una fuente que ya existe en lugar de copiarla. La transcripción de una cita puede nombrar a personas de otro árbol, y se incluye en la exportación. Un archivo de exportación con fuentes solo lo puede leer esta versión de Cognatio o una más reciente.',
      },
    ],
    link: { to: '/sources', label: 'Ir a las fuentes' },
  },
  {
    id: 'search',
    title: 'Búsqueda',
    blocks: [
      {
        p: 'El campo de búsqueda de la parte superior busca en el árbol genealógico abierto: nombres (también grafías parecidas, de modo que «Meier» encuentra «Mayer» y «Maier»), datos personales como lugares y profesiones, la cronología y las notas. En cada resultado se indica por qué se ha encontrado. Los nombres escritos en cirílico cuentan como su grafía latina: «Иванов» también encuentra «Iwanow» e «Ivanov». También encuentra fuentes, que aparecen encima de las personas encontradas (consulta «Fuentes y citas»).',
      },
    ],
  },
  {
    id: 'statistics',
    title: 'Estadísticas',
    blocks: [
      {
        p: 'Las estadísticas analizan el árbol genealógico abierto (sin la papelera), repartidas en pestañas: «Resumen» con cifras clave como el número de personas, los sexos y la duración media de vida, «Vidas» con la distribución por edad, «Nombres y lugares» con los apellidos y lugares de nacimiento más frecuentes, «Antepasados» con el resumen de las generaciones y «Fuentes» con las fuentes usadas, las personas con al menos una cita y las fuentes más citadas.',
      },
      {
        p: 'Cada número que cuenta personas es un enlace: un clic en una cifra clave, una barra o una generación abre la lista de personas con exactamente esas personas. Encima de la lista se indica de qué selección proceden; la × vuelve a mostrar a todas, «Volver a las estadísticas» regresa. Una búsqueda arriba busca entonces solo entre esas personas.',
      },
      {
        p: 'Encima de las pestañas se elige el alcance: todo el árbol, los antepasados o los descendientes de una persona (incluida ella misma) o todas las personas de un apellido (también como apellido de nacimiento) y, si se desea, solo las nacidas en ciertos años. Todos los números y listas lo siguen; solo las fuentes se refieren siempre a todo el árbol. El último alcance elegido se conserva para cada árbol.',
      },
      {
        p: '«¿Qué falta todavía?» en el resumen muestra para la fecha y el lugar de nacimiento, la fecha y el lugar de defunción (de los fallecidos), el padre, la madre, la pareja (de los fallecidos desde los 18), la foto y la fuente en cuántas personas está registrado el dato; el estado de la investigación es la media de esas proporciones. Un clic en los que faltan abre la lista de personas en las que queda algo por hacer.',
      },
      {
        p: '«Antepasados» muestra por generación cuántos de los antepasados posibles (2 padres, 4 abuelos, 8 bisabuelos…) se han encontrado, quién aparece varias veces (pérdida de antepasados) y los cabos sueltos: antepasados a los que todavía les falta el padre o la madre. Empieza por la persona principal del árbol, que se fija con «Persona principal» en la página de una persona; los informes y el árbol también empiezan por ella.',
      },
      {
        p: 'La línea de tiempo del resumen muestra nacimientos, defunciones o bodas por década; las décadas vacías se mantienen para que destaquen los huecos de la investigación. Las bodas son el inicio de un matrimonio (relación esposo/esposa) o el acontecimiento «boda», una vez por pareja y año; las parejas de hecho y las parejas solo cuentan con ese acontecimiento.',
      },
      {
        p: '«La vida a lo largo del tiempo», en «Vidas», muestra por siglo de nacimiento, por separado para hombres y mujeres, la duración media de la vida –también solo de quienes cumplieron 15–, la edad en la primera boda y al nacer el primer hijo; entre paréntesis, en cuántas personas se basa el valor, y una media de menos de 5 personas no se muestra. Además, el número de hijos por pareja y la diferencia de edad en la pareja.',
      },
      {
        p: '«Nombres y lugares» muestra también los nombres más frecuentes de hombres y mujeres –cuenta cada nombre, así que «Johann Georg» para Johann y para Georg– y la moda de los nombres por siglo. «Migración» muestra quién murió en su lugar de nacimiento, los caminos más frecuentes del lugar de nacimiento, pasando por las mudanzas, al lugar de defunción, y los lugares con sus personas y el periodo de los datos allí.',
      },
      {
        p: '«Récords», en «Vidas», nombra la vida más larga, el matrimonio más largo, la mayor cantidad de hijos, parejas y descendientes, los padres más jóvenes y de más edad en un nacimiento y la mayor diferencia de edad de una pareja, solo de personas fallecidas. Si un récord es también un posible error, como una madre de 61 años, aparece un aviso con enlace.',
      },
      {
        p: '«Imprimir o guardar como PDF» abre el informe «Estadísticas» con todas las cifras del alcance elegido en tablas. «Copiar como CSV» en cada tarjeta copia sus cifras al portapapeles para pegarlas en una hoja de cálculo. Los asistentes de IA obtienen las mismas cifras con la herramienta «get_statistics», también para un alcance.',
      },
    ],
    link: { to: '/statistics', label: 'Ir a las estadísticas' },
  },
  {
    id: 'checks',
    title: 'Posibles errores',
    blocks: [
      {
        p: '«Posibles errores» muestra los datos del árbol abierto que están permitidos pero rara vez son ciertos, a menudo un error de escritura: un hombre como madre o una mujer como esposo, parejas que además son progenitor e hijo o hermanos, un hijo con más de dos progenitores, un progenitor menor de 12 o una madre mayor de 55 años al nacer el hijo, un progenitor que murió antes del nacimiento, una relación de pareja que empieza antes del nacimiento o después de la muerte de uno de ellos, una muerte antes del nacimiento, una vida de más de 110 años o una persona de más de 110 sin fecha de defunción, eventos antes del nacimiento o después de la muerte, posibles duplicados y personas que son sus propios antepasados. Una fecha aproximada como «hacia 1880» cuenta cinco años en cada dirección: solo se indica lo que seguro no encaja.',
      },
      {
        p: 'Cada entrada nombra a las personas con un enlace. Corrige el error allí –la entrada desaparece sola– o pulsa «Es correcto» si el dato es cierto: la entrada se oculta, también tras una copia de seguridad y su restauración. «Mostrar también los marcados como correctos» vuelve a mostrarlas.',
      },
      {
        p: 'Si guardas una relación que parece incorrecta, la aplicación indica el motivo y pregunta si quieres guardarla de todos modos. Los asistentes de IA también tienen que preguntarte antes de guardar una relación así.',
      },
    ],
    link: { to: '/checks', label: 'Ir a los posibles errores' },
  },
  {
    id: 'reports',
    title: 'Informes',
    blocks: [
      {
        p: 'En «Informes» los datos del árbol genealógico abierto se pueden imprimir o guardar como PDF: la hoja de persona (todos los datos de una persona con familiares, acontecimientos, notas, fotos y las fuentes como notas al pie, también para todas las personas a la vez), la hoja de familia (una pareja con boda, padres e hijos), la lista de antepasados con números Kekulé (padre de n = 2n, madre = 2n + 1; un antepasado que aparece dos veces remite al primer número) y la lista de descendientes con números d’Aboville (1, 1.1, 1.1.2 …). El botón «Informe» de la página de una persona abre los informes con esa persona como inicio.',
      },
      {
        p: 'Encima de la vista previa eliges fotos, notas, fuentes, datos de contacto y si las personas vivas aparecen solo con nombre y año de nacimiento; la elección se recuerda. «Imprimir» abre el diálogo de impresión. «Guardar como PDF» pide en la aplicación de escritorio el nombre del archivo y escribe el PDF; en un navegador elige «Guardar como PDF» como impresora en el diálogo de impresión. Cada hoja empieza en una página nueva y las páginas están numeradas.',
      },
    ],
    link: { to: '/reports', label: 'Ir a informes' },
  },
  {
    id: 'family-trees',
    title: 'Varios árboles genealógicos',
    blocks: [
      {
        p: 'Puedes llevar varios árboles genealógicos por separado, p. ej. la familia paterna y la materna. Cada persona pertenece a un único árbol genealógico; todas las páginas muestran solo el que está abierto. Se cambia con el selector «Árbol genealógico abierto» de la parte superior de la barra lateral.',
      },
      {
        p: 'En la página «Árboles genealógicos» puedes crear, renombrar, abrir o eliminar árboles. Un árbol eliminado va a la papelera con todos sus datos; también se puede eliminar el último: la aplicación ofrece entonces crear uno nuevo, importar un archivo o recuperar un árbol de la papelera.',
      },
    ],
    link: { to: '/family-trees', label: 'Ir a los árboles genealógicos' },
  },
  {
    id: 'import-export',
    title: 'Importar/Exportar',
    blocks: [
      {
        p: 'La exportación y la importación se aplican al árbol genealógico abierto. La exportación ZIP contiene todos los datos y archivos: sirve para hacer una copia de seguridad o para otra instalación de Cognatio. GEDCOM (5.5.1 o 7.0) es el formato de intercambio de otros programas de genealogía como Ancestry, MyHeritage o Gramps, si se desea con imágenes y documentos. Los archivos pueden tener cualquier tamaño, también más de 4 GB; en «Ajustes → Datos y copias de seguridad» se puede fijar un límite máximo.',
      },
      {
        steps: [
          'Elige un archivo (ZIP de esta aplicación o GEDCOM).',
          'Elige el destino: el árbol abierto o uno nuevo. Para los archivos GEDCOM, la aplicación propone un árbol nuevo.',
          'La vista previa muestra qué cambiará. En el árbol abierto, elige cómo proceder.',
          '«Ejecutar importación».',
        ],
      },
      {
        list: [
          'Combinar: gana lo más reciente: se añaden las personas nuevas y, cuando hay diferencias, vale la versión más reciente.',
          'Combinar: decidir manualmente: igual que arriba, pero cuando hay diferencias decides tú por cada persona.',
          'Sobrescribir: el árbol abierto se sustituye por completo por el archivo; los demás árboles no cambian.',
        ],
      },
      {
        p: 'Si se vuelve a importar un archivo GEDCOM, la aplicación reconoce las personas existentes y no las crea dos veces. El historial de importaciones muestra las importaciones anteriores. Si tras la importación alguien fuera su propio antepasado (un ciclo en las relaciones de padres e hijos), la vista previa nombra a las personas; la importación se realiza igualmente y después corriges las relaciones a mano.',
      },
    ],
    link: { to: '/import-export', label: 'Ir a Importar/Exportar' },
  },
  {
    id: 'backup',
    title: 'Copia de seguridad',
    blocks: [
      {
        p: 'El servidor hace copias de seguridad de la base de datos y de los archivos automáticamente, por defecto cada día. Los ajustes muestran la última copia y avisan si tiene más de tres días.',
      },
      {
        p: 'En «Ajustes → Copia de seguridad», «Descargar copia de seguridad» descarga un archivo con todos los árboles genealógicos, archivos, la papelera y el historial de importaciones. Los árboles individuales se guardan mediante «Importar/Exportar». Si en «Límites de tamaño» hay un límite máximo, una copia de seguridad mayor se guarda igualmente, pero solo se puede restaurar tras subir el límite.',
      },
      {
        steps: [
          'Elige «Restaurar copia de seguridad…» y selecciona el archivo de copia: primero se comprueba y todavía no cambia nada.',
          'Revisa la comparación «Ahora / En la copia».',
          'Escribe «ELIMINAR» para confirmar y elige «Restaurar».',
        ],
      },
      {
        p: 'Todos los datos actuales se sustituyen por la copia de seguridad. Antes, el servidor guarda el estado actual como un archivo «cognatio_before_restore_…zip», con el que se puede deshacer la restauración. Se conservan los tres últimos de estos archivos; el servidor elimina los más antiguos.',
      },
      {
        p: 'Tamaño: la exportación, la importación, la copia de seguridad y la restauración leen y escriben los archivos por partes; incluso los muy grandes (50 GB o más) apenas necesitan memoria. Antes, la aplicación comprueba que la unidad tenga suficiente espacio libre; una restauración necesita aproximadamente el espacio de la copia de seguridad más el de los datos actuales, porque primero guarda el estado actual completo. «Actividad» en la barra lateral muestra el progreso de estas operaciones y de las subidas de archivos, también si mientras tanto has abierto otra página, y enumera las terminadas hasta que se cierra la aplicación; allí se pueden cancelar la importación y la restauración hasta que se sustituyen los datos. En «Ajustes → Datos y copias de seguridad → Límites de tamaño» se puede fijar un límite máximo (de forma predeterminada, ninguno). Las memorias USB con FAT32 admiten como máximo 4 GB por archivo: para copias grandes elige una unidad con exFAT o NTFS.',
      },
    ],
    link: { to: '/settings', label: 'Ir a los ajustes' },
  },
  {
    id: 'trash',
    title: 'Papelera',
    blocks: [
      {
        p: 'La papelera contiene las personas eliminadas del árbol genealógico abierto y los árboles genealógicos eliminados; el número de la barra lateral indica cuántos hay. «Restaurar» los recupera. «Eliminar definitivamente» borra también relaciones, acontecimientos, notas y archivos, y solo se puede deshacer con una copia de seguridad. Debajo, «Fuentes y archivos» lista las fuentes y los archivos eliminados; pertenecen a todos los árboles genealógicos, y una fuente se lleva sus citas: al restaurarla vuelven a todos los hechos.',
      },
    ],
    link: { to: '/trash', label: 'Ir a la papelera' },
  },
  {
    id: 'settings',
    title: 'Ajustes',
    blocks: [
      {
        p: 'El idioma (que solo se cambia aquí), el esquema de colores y los valores predeterminados del árbol genealógico (vista, generaciones, persona central por árbol) se aplican a este navegador. La copia de seguridad y el estado del sistema se aplican a toda la aplicación.',
      },
      {
        list: [
          'Apariencia (los bloques «Fuente y colores» y «Árbol: apariencia»): fuente y tamaño de letra, color de acento, estilo, grosor y color de las líneas del árbol, tamaño y esquinas de las fichas, foto, fechas y el lazo negro de luto de las personas fallecidas en las fichas y colores del borde según el sexo, con vista previa en directo y «Restablecer valores».',
          'Árbol: comportamiento: la vista, el número de generaciones y la persona central con los que se abre el árbol.',
          'Datos y copias de seguridad: guardar y restaurar (véase «Copia de seguridad»).',
          'Asistentes de IA (MCP): si los asistentes de IA pueden actuar y qué pueden hacer (véase «Asistentes de IA (MCP)»).',
          'Sistema (siempre visible): idioma (también «Igual que el sistema operativo»), esquema de colores, versión y estado del servidor y de la base de datos, número de personas y archivos, nivel de registro, el registro del servidor y del navegador con una exportación para el análisis de errores (no contiene datos del árbol), las licencias y, en la aplicación de escritorio, las actualizaciones del programa (véase «Aplicación de escritorio»).',
        ],
      },
      {
        p: 'Los bloques se abren y se cierran con un clic («Expandir todo» / «Contraer todo»). El campo de búsqueda situado encima encuentra un ajuste, abre su bloque y salta al campo. La apariencia, el idioma y los valores predeterminados del árbol se guardan en este navegador o en esta ventana de la aplicación.',
      },
    ],
    link: { to: '/settings', label: 'Ir a los ajustes' },
  },
  {
    id: 'ai-assistants',
    title: 'Asistentes de IA (MCP)',
    blocks: [
      {
        p: 'Los asistentes de IA como Claude (Claude Desktop, Claude Code) y otros programas que hablan el Model Context Protocol (MCP) pueden trabajar con tus árboles genealógicos: buscar personas, responder preguntas como «¿Qué antepasados venían de Pomerania?», señalar lagunas y, si lo permites, introducir lo que dictes o lo que dice una partida parroquial escaneada.',
      },
      {
        p: 'Se activa en Ajustes → «Asistentes de IA (MCP)». La aplicación muestra entonces la dirección y un token (el token solo una vez), con un comando listo para Claude Code y un bloque de configuración para otros programas. Los asistentes solo se conectan a este ordenador; lo que leen llega al proveedor del modelo de IA que utilizas.',
      },
      {
        steps: [
          'Ajustes → «Asistentes de IA (MCP)»: marca «Permitir asistentes de IA». Aparecen la dirección y el token (el token solo ahora).',
          'Copia «Comando para Claude Code» y ejecútalo una vez en un terminal (claude mcp add --transport http cognatio …). Con «--scope user» tras «--transport http» sirve en cualquier carpeta.',
          'Inicia Claude Code: «/mcp» muestra «cognatio» como conectado, con sus herramientas.',
          'Pregunta con tus propias palabras. Para cambios, marca el nivel del área (p. ej. «Escribir» en personas).',
        ],
      },
      {
        p: 'Por ejemplo, puedes preguntar:',
      },
      {
        list: [
          '¿Quiénes son los antepasados de Anna Kraft hasta los bisabuelos y cuáles venían de Pomerania?',
          '¿Qué personas nacieron entre 1850 y 1900 en Leipzig? ¿Hay posibles duplicados?',
          'Con «escribir»: «Añade un bautismo de Anna Kraft el 2 de octubre de 1951 en Leipzig.» o «Introduce esta partida parroquial con su fuente.»',
          'Con los permisos de archivos: «Exporta el árbol como GEDCOM a mi carpeta Documentos.» o «Añade el escaneo …\\taufschein.jpg al bautismo de Anna.»',
        ],
      },
      {
        list: [
          'Permisos por área: desactivado, leer, escribir (crear, modificar, mover a la papelera; se puede deshacer en la aplicación) y borrar (no se puede deshacer, p. ej. restaurar una copia de seguridad). Al activarlo, cada área está en «leer»; antes de «escribir» o «borrar» la aplicación pregunta.',
          'Árboles genealógicos: un asistente solo ve los árboles marcados; los árboles nuevos son visibles.',
          'Los archivos nunca pasan por MCP: un asistente indica un archivo de este ordenador (en tu carpeta personal, de datos o de copias de seguridad), p. ej. un escaneo para añadir, un archivo para importar o una carpeta para una exportación.',
          'Cada cambio de un asistente aparece en «Actividad»; el registro tiene el filtro «Solo asistentes de IA (MCP)».',
          '¿Has perdido el token? «Nuevo token» lo sustituye y el anterior deja de funcionar. Al desactivarlo, el token deja de valer al instante.',
          'La dirección contiene el puerto de la aplicación, que se mantiene entre inicios. Si la aplicación de escritorio tuvo que usar otro, la sección lo indica; el asistente necesita entonces la nueva dirección.',
          'Un asistente nunca puede cambiar por sí mismo los ajustes de los asistentes de IA.',
        ],
      },
      {
        faq: [
          { q: 'El asistente recibe «404» o «MCP está desactivado».', a: 'Marca «Permitir asistentes de IA» en los ajustes.' },
          {
            q: 'El asistente recibe «401» o «token ausente o incorrecto».',
            a: 'El token se sustituyó o MCP se desactivó entretanto. Crea un token nuevo y vuelve a añadir el servidor («claude mcp remove cognatio» y luego el nuevo comando).',
          },
          {
            q: 'Falta una herramienta o responde «NOT_ALLOWED».',
            a: 'El permiso de su área es demasiado bajo: súbelo en los ajustes; en Claude Code «/mcp» vuelve a listar las herramientas.',
          },
          {
            q: 'El asistente no consigue conectarse.',
            a: 'Cognatio debe estar en marcha. Si los ajustes indican que el puerto cambió, añade el servidor de nuevo con la nueva dirección.',
          },
        ],
      },
    ],
    link: { to: '/settings', label: 'Ir a los ajustes' },
  },
  {
    id: 'desktop-app',
    title: 'Aplicación de escritorio (Windows, Linux)',
    blocks: [
      {
        p: 'La aplicación de escritorio muestra Cognatio en su propia ventana, sin navegador, Node ni base de datos que instalar. Inicia su propia base de datos en segundo plano y la detiene al cerrar la ventana o al elegir «Salir» al final de la barra lateral. Solo se ejecuta una instancia a la vez.',
      },
      {
        list: [
          'Windows: instala con el archivo de instalación (por usuario, sin derechos de administrador) o descomprime el ZIP portátil, que guarda todos los datos en una carpeta «data» junto al programa.',
          'Linux: el AppImage es un único archivo; hazlo ejecutable e inícialo, se añade solo al menú de aplicaciones. El paquete Debian se instala con «sudo apt install ./Cognatio-….deb». Si se instaló con «dpkg -i», «sudo apt --fix-broken install» añade las bibliotecas que faltan y termina la configuración; si no, Cognatio no se inicia.',
          'Tus datos están en %APPDATA%\\Cognatio en Windows y en ~/.config/Cognatio en Linux, separados del programa: actualizar o desinstalar nunca los borra. El desinstalador de Windows pregunta si también se deben borrar los datos; descarga antes una copia de seguridad.',
          'Haz de vez en cuando una copia de seguridad (Ajustes → Copia de seguridad) y guárdala en otro lugar. La aplicación también guarda su base de datos automáticamente antes de cada actualización y una vez al día.',
        ],
      },
      {
        p: 'En Ajustes → Sistema → Actualizaciones del programa, Cognatio busca una versión nueva aproximadamente una vez al día (allí está el interruptor; «Comprobar ahora» busca de inmediato). Solo se envía la petición del archivo de versión. Una versión nueva se descarga en segundo plano y se instala al reiniciar; antes se guarda la base de datos. «También versiones de prueba (beta)» ofrece versiones antes de su publicación; volver a las versiones publicadas nunca instala una más antigua. El ZIP portátil y el paquete Debian no los actualiza la aplicación: instala tú la versión nueva.',
      },
    ],
    link: { to: '/settings', label: 'Ir a los ajustes' },
  },
  {
    id: 'versions',
    title: 'Historial de versiones',
    blocks: [{ p: 'Qué cambió en cada versión, la más reciente primero. Un clic en una función lleva al capítulo de ayuda correspondiente.' }],
  },
  {
    id: 'faq',
    title: 'Preguntas frecuentes',
    blocks: [
      {
        faq: [
          { q: 'He eliminado una persona por error.', a: 'Abre la papelera y elige «Restaurar» en esa persona.' },
          { q: 'Solo conozco una fecha de forma aproximada.', a: 'Introdúcela hasta donde la conozcas, p. ej. «hacia 1880», «antes de 1900» o «1880-1885».' },
          {
            q: '¿Cómo traigo mi árbol genealógico de Ancestry, MyHeritage u otro programa?',
            a: 'Expórtalo allí como archivo GEDCOM (.ged) e impórtalo en «Importar/Exportar» como un árbol genealógico nuevo.',
          },
          {
            q: 'Una persona está duplicada.',
            a: 'Completa los datos y las relaciones que falten en una de las dos y elimina la otra.',
          },
          {
            q: '¿Puedo usar la aplicación sin ratón?',
            a: 'Sí: Tab y Mayús+Tab se mueven entre los elementos, Intro o la barra espaciadora los activan y Escape cierra los cuadros de diálogo. Al pulsar Tab por primera vez aparece «Saltar al contenido».',
          },
          {
            q: '¿Dónde se guardan mis datos?',
            a: 'En tu propio ordenador. En la aplicación de escritorio, en la carpeta %APPDATA%\\Cognatio (Windows) o ~/.config/Cognatio (Linux); en la variante portátil, en la carpeta «data» junto al programa; si ejecutas el servidor tú mismo, en su base de datos y su carpeta de subidas. Solo el idioma, el esquema de colores y los ajustes de vista se guardan en el navegador o en la ventana de la aplicación.',
          },
          {
            q: '¿Cómo traslado mis datos a otro ordenador?',
            a: 'En Ajustes → Copia de seguridad elige «Descargar copia de seguridad», copia el archivo al otro ordenador, instala allí Cognatio y elige «Restaurar copia de seguridad…». Un solo árbol genealógico se puede trasladar con la exportación e importación ZIP de «Importar/Exportar».',
          },
          {
            q: '¿Cómo actualizo la aplicación?',
            a: 'La aplicación de escritorio busca actualizaciones por sí sola (Ajustes → Sistema → Actualizaciones del programa) y las instala al reiniciar. El ZIP portátil y el paquete Debian se actualizan instalando la versión nueva; tus datos se conservan.',
          },
        ],
      },
    ],
  },
];

export default help;
