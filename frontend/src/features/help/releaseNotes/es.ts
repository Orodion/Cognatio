import type { ReleaseNotes } from '../releases';

const notes: ReleaseNotes = {
  '1.1.0': {
    mcp: {
      title: 'Asistentes de IA (MCP)',
      text: 'Los asistentes de IA como Claude pueden consultar, buscar y, con tu permiso, modificar tus árboles genealógicos mediante el Model Context Protocol. Tú decides por área qué pueden hacer; cada cambio aparece en «Actividad».',
    },
    reports: {
      title: 'Informes para imprimir y en PDF',
      text: 'Hoja de persona, hoja de familia, lista de antepasados (Kekulé) y de descendientes (d’Aboville): impresas o en PDF, en la aplicación de escritorio directamente en un archivo.',
    },
    checks: {
      title: 'Posibles errores',
      text: 'Una nueva página muestra lo que está permitido pero rara vez es cierto –un hombre como madre, una madre de 60 años, una boda después de la muerte, posibles duplicados y más– con enlaces a las personas; lo que es correcto se puede marcar como tal. Una relación que parece incorrecta solo se guarda tras preguntar.',
    },
    statistics: {
      title: 'Estadísticas para seguir investigando',
      text: 'Cada número de las estadísticas lleva a las personas que hay detrás: un clic en una barra abre la lista de personas con exactamente esas personas. Se puede elegir el alcance: antepasados o descendientes de una persona, un apellido, años de nacimiento. Los análisis se reparten en pestañas. «¿Qué falta todavía?» muestra el estado de la investigación y lleva a los huecos; «Antepasados» muestra por generación cuántos antepasados se han encontrado, la pérdida de antepasados y los cabos sueltos, a partir de la nueva persona principal del árbol. Una línea de tiempo muestra nacimientos, defunciones y bodas por década; «La vida a lo largo del tiempo» compara la duración de la vida, la edad al casarse y al primer hijo a lo largo de los siglos. Además, los nombres y su moda, la migración de la familia de lugar en lugar y los récords de los fallecidos. Todo se puede imprimir como informe, guardar como PDF o copiar como CSV.',
    },
    places: {
      title: 'Sugerencias de lugares',
      text: 'Los campos de lugar de nacimiento, de fallecimiento y de un acontecimiento proponen los lugares que ya aparecen en el árbol genealógico, los más usados primero.',
    },
    dates: {
      title: 'Fechas escritas',
      text: 'Los campos de fecha también aceptan fechas escritas en cualquier idioma de la aplicación, como «2 de octubre de 1951» o «mayo de 1951», y las convierten en «02.10.1951» y «05.1951».',
    },
    anniversaries: {
      title: 'Aniversarios en la página de inicio',
      text: 'La página de inicio muestra los cumpleaños, aniversarios de fallecimiento y de boda de los próximos 30 días, con la edad o los años transcurridos.',
    },
    sources: {
      title: 'Fuentes y citas',
      text: 'Una colección de fuentes y archivos para todos los árboles genealógicos: una cita recoge página, fecha, transcripción, fiabilidad y escaneos y respalda cualquier número de hechos (nombre, nacimiento, defunción, acontecimientos y relaciones, también de varias personas). La página de una fuente muestra por persona lo que respalda cada cita; GEDCOM conserva las fuentes de otros programas.',
    },
    files: {
      title: 'Ver archivos',
      text: 'Imágenes, PDF, vídeos, audio y archivos de texto como TXT, Markdown o CSV se abren en una ventana con el nombre del archivo como título; los demás archivos se guardan directamente. Los archivos ya no tienen límite de tamaño, así que también caben vídeos largos. Se rechaza un archivo cuyo nombre indica una imagen o un PDF que no lo es.',
    },
    activity: {
      title: 'Grandes volúmenes de datos y «Actividad»',
      text: 'Exportar, importar, hacer copias de seguridad y restaurar funcionan con 50 GB o más con poca memoria y comprueban antes el espacio libre. «Actividad» en la barra lateral muestra el progreso de cada operación larga; la importación y la restauración se pueden cancelar.',
    },
    search: {
      title: 'Nombres en cirílico',
      text: 'La búsqueda trata los nombres escritos en cirílico como su grafía latina: «Иванов» también encuentra «Iwanow» e «Ivanov».',
    },
    'import-export': {
      title: 'Importación en tu idioma',
      text: 'Una importación GEDCOM escribe los títulos de los acontecimientos, las etiquetas y las fechas aproximadas en el idioma de la interfaz. La importación y la restauración avisan cuando alguien sería su propio antepasado, y las notas muy largas se dividen en lugar de quedarse bloqueadas. La exportación GEDCOM escribe bautismos, ocupaciones y residencias con las etiquetas estándar que reconocen otros programas.',
    },
    relations: {
      title: 'Relaciones derivadas más claras',
      text: 'La pareja de un progenitor solo pasa a ser el segundo progenitor si este tiene exactamente una pareja, y una relación padre-hijo se guarda junto con sus relaciones derivadas por completo o no se guarda. Los hermanos que surgieron solo de una relación padre-hijo eliminada van con ella a la papelera y vuelven con ella; la exportación GEDCOM omite las relaciones de la papelera.',
    },
    'desktop-app': {
      title: 'PostgreSQL 18',
      text: 'La aplicación de escritorio usa PostgreSQL 18; los datos de la versión 1.0.0 se convierten automáticamente en el primer inicio y la carpeta antigua de la base de datos se conserva 30 días.',
    },
    settings: {
      title: 'Barra lateral por grupos',
      text: 'La barra lateral agrupa las áreas en «Registrar», «Analizar» y «Administrar»; «Importar/Exportar» está ahora en «Administrar» y «Posibles errores» muestra cuántos quedan abiertos. «Actividad», «Papelera», «Ajustes» y «Ayuda» siguen abajo.',
    },
  },
  '1.0.0': {
    persons: {
      title: 'Personas con eventos vitales y archivos',
      text: 'Personas con fechas flexibles (exacta, mes, año, «hacia 1880» o intervalo), eventos vitales con lugares, notas, y fotos y documentos.',
    },
    relations: {
      title: 'Relaciones',
      text: 'Vincula padres, hijos, parejas y hermanos. La relación inversa se crea sola; se admiten periodos y etiquetas como «hijo adoptivo».',
    },
    tree: {
      title: 'Vistas del árbol genealógico',
      text: 'Árbol genealógico, árbol de ascendientes, árbol de descendientes y red de relaciones, con zoom, persona de enfoque y exportación a PNG, SVG o PDF.',
    },
    search: {
      title: 'Búsqueda',
      text: 'Encuentra nombres incluso con grafías parecidas, además de lugares, profesiones, eventos vitales y notas.',
    },
    statistics: {
      title: 'Estadísticas',
      text: 'Cifras clave, distribución por edades, apellidos y lugares de nacimiento más frecuentes y un resumen de las generaciones.',
    },
    'family-trees': {
      title: 'Varios árboles genealógicos',
      text: 'Mantén árboles separados, por ejemplo para las dos ramas de la familia, y cambia entre ellos.',
    },
    'import-export': {
      title: 'Importar y exportar',
      text: 'Intercambia datos como ZIP (con archivos) o como GEDCOM 5.5.1 y 7.0 con otros programas de genealogía; importar de nuevo no crea duplicados.',
    },
    backup: {
      title: 'Copias de seguridad',
      text: 'Copias automáticas diarias, descarga de todos los datos y una restauración guiada que antes guarda el estado actual.',
    },
    trash: {
      title: 'Papelera',
      text: 'Las personas y los árboles eliminados se pueden restaurar.',
    },
    settings: {
      title: 'Idiomas y aspecto',
      text: 'Diez idiomas (la aplicación arranca en el idioma del sistema operativo), esquemas de color, tipografías y el aspecto del árbol.',
    },
    'desktop-app': {
      title: 'Aplicación de escritorio para Windows y Linux',
      text: 'Instalador de Windows o ZIP portátil, AppImage o paquete Debian para Linux: con base de datos propia, sin configuración, se inicia con un clic, guarda los datos antes de cada actualización y se actualiza sola (salvo el ZIP portátil y el paquete Debian).',
    },
  },
};

export default notes;
