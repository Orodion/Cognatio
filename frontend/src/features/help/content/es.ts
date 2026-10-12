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
        p: 'La página de inicio muestra el número de personas y la distribución por sexo, accesos rápidos a las áreas principales, las personas añadidas más recientemente y algunos consejos. La ayuda tiene su propio campo de búsqueda sobre los capítulos.',
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
        p: 'Solo el nombre es obligatorio. Si se desconoce, marca «Nombre desconocido»: la aplicación mostrará «(nombre desconocido)». Introduce las fechas hasta donde las conozcas: 04.01.1880 (exacta), 01.1880 (mes), 1880 (año), «hacia 1880», «antes de 1880», «después de 1880» o el intervalo «1880-1885». La aplicación detecta la precisión por sí sola.',
      },
      {
        p: 'Al crear una persona, la aplicación avisa de las personas existentes con un nombre parecido y el mismo año de nacimiento, para que no se creen duplicados.',
      },
      {
        list: [
          'Resumen: datos personales, contacto y otros datos; «Editar» los modifica.',
          'Cronología: acontecimientos como nacimiento, bautismo, boda o mudanza, con fecha y lugar. Un acontecimiento puede vincularse a archivos, también de otras personas, p. ej. una foto de grupo. Los sucesos se pueden ordenar del más antiguo al más reciente o al revés y mostrar como cronología o como tabla; la elección se recuerda.',
          'Relaciones: consulta la sección «Relaciones».',
          'Notas: texto libre, p. ej. historias o fuentes, de hasta 10.000 caracteres cada una.',
          'Archivos: sube fotos y documentos (hasta 50 MB por archivo); una imagen puede usarse como foto de perfil. El icono de descarga guarda un archivo con su nombre original.',
          'Los archivos se pueden ver como mosaico o como lista (botones sobre los archivos).',
          'Filtro: el campo junto a las pestañas (excepto «Resumen») filtra las entradas de la pestaña abierta: cronología, relaciones, notas o archivos. Se ignoran mayúsculas y acentos, con varias palabras deben aparecer todas, y las coincidencias se resaltan. Se busca en todos los textos, p. ej. título, categoría, fecha, lugar, descripción y nombres de archivo. En las relaciones, el gráfico muestra solo las personas restantes. El texto se conserva al cambiar de pestaña; Esc o la X lo borra.',
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
        p: 'Algunas relaciones se añaden automáticamente: al vincular a un progenitor con un hijo, la pareja del progenitor también pasa a ser progenitor del hijo (mientras el hijo tenga menos de dos progenitores; la relación empieza con el nacimiento del hijo si se conoce con exactitud) y los demás hijos del progenitor pasan a ser hermanos del hijo. El botón de eliminar junto a una relación solo quita la relación; las personas permanecen.',
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
    id: 'search',
    title: 'Búsqueda',
    blocks: [
      {
        p: 'El campo de búsqueda de la parte superior busca en el árbol genealógico abierto: nombres (también grafías parecidas, de modo que «Meier» encuentra «Mayer» y «Maier»), datos personales como lugares y profesiones, la cronología y las notas. En cada resultado se indica por qué se ha encontrado.',
      },
    ],
  },
  {
    id: 'statistics',
    title: 'Estadísticas',
    blocks: [
      {
        p: 'Las estadísticas analizan el árbol genealógico abierto (sin la papelera): cifras clave como el número de personas, los sexos y la duración media de vida, la distribución por edades, los apellidos más frecuentes, los lugares de nacimiento más frecuentes y un resumen de las generaciones.',
      },
    ],
    link: { to: '/statistics', label: 'Ir a las estadísticas' },
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
        p: 'La exportación y la importación se aplican al árbol genealógico abierto. La exportación ZIP contiene todos los datos y archivos: sirve para hacer una copia de seguridad o para otra instalación de Cognatio. GEDCOM (5.5.1 o 7.0) es el formato de intercambio de otros programas de genealogía como Ancestry, MyHeritage o Gramps, si se desea con imágenes y documentos. De forma predeterminada, un archivo puede tener hasta 2 GB (se cambia en «Ajustes → Datos y copias de seguridad»); si los archivos de un árbol son más grandes, exporta sin archivos.',
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
        p: 'Si se vuelve a importar un archivo GEDCOM, la aplicación reconoce las personas existentes y no las crea dos veces. El historial de importaciones muestra las importaciones anteriores.',
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
        p: 'En «Ajustes → Copia de seguridad», «Descargar copia de seguridad» descarga un archivo con todos los árboles genealógicos, archivos, la papelera y el historial de importaciones. Los árboles individuales se guardan mediante «Importar/Exportar». Una copia de seguridad que supera el límite de tamaño se guarda, pero esta aplicación no puede restaurarla: guarda entonces además los árboles por separado mediante «Importar/Exportar».',
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
        p: 'Límite de tamaño: la exportación, la importación, la copia de seguridad y la restauración procesan un archivo en la memoria, por defecto de hasta 2 GB. En «Ajustes → Datos y copias de seguridad → Límites de tamaño», un equipo con mucha memoria puede permitir archivos mayores. Por encima de 4 GB debe haber libre como mínimo el doble del tamaño del archivo en memoria (RAM); de lo contrario, la aplicación puede volverse muy lenta o cerrarse; los ajustes avisan de ello. Una exportación demasiado grande se rechaza; una copia de seguridad demasiado grande se crea con una advertencia.',
      },
    ],
    link: { to: '/settings', label: 'Ir a los ajustes' },
  },
  {
    id: 'trash',
    title: 'Papelera',
    blocks: [
      {
        p: 'La papelera contiene las personas eliminadas del árbol genealógico abierto y los árboles genealógicos eliminados; el número de la barra lateral indica cuántos hay. «Restaurar» los recupera. «Eliminar definitivamente» borra también relaciones, acontecimientos, notas y archivos, y solo se puede deshacer con una copia de seguridad.',
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
