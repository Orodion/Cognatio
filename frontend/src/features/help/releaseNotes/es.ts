import type { ReleaseNotes } from '../releases';

const notes: ReleaseNotes = {
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
