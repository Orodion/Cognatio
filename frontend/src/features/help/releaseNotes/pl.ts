import type { ReleaseNotes } from '../releases';

const notes: ReleaseNotes = {
  '1.0.0': {
    persons: {
      title: 'Osoby ze zdarzeniami życiowymi i plikami',
      text: 'Osoby z elastycznymi datami (dokładna, miesiąc, rok, „około 1880” lub przedział), zdarzenia życiowe z miejscami, notatki oraz zdjęcia i dokumenty.',
    },
    relations: {
      title: 'Relacje',
      text: 'Łącz rodziców, dzieci, partnerów i rodzeństwo. Relacja odwrotna powstaje automatycznie; możliwe są okresy i określenia takie jak „dziecko adoptowane”.',
    },
    tree: {
      title: 'Widoki drzewa genealogicznego',
      text: 'Drzewo genealogiczne, drzewo przodków, drzewo potomków i sieć powiązań z powiększaniem, osobą wiodącą i eksportem do PNG, SVG lub PDF.',
    },
    search: {
      title: 'Wyszukiwanie',
      text: 'Znajduje nazwiska także przy podobnej pisowni oraz miejsca, zawody, zdarzenia życiowe i notatki.',
    },
    statistics: {
      title: 'Statystyki',
      text: 'Kluczowe liczby, rozkład wieku, najczęstsze nazwiska i miejsca urodzenia oraz przegląd pokoleń.',
    },
    'family-trees': {
      title: 'Wiele drzew genealogicznych',
      text: 'Prowadź oddzielne drzewa, na przykład dla obu stron rodziny, i przełączaj się między nimi.',
    },
    'import-export': {
      title: 'Import i eksport',
      text: 'Wymieniaj dane jako ZIP (z plikami) lub GEDCOM 5.5.1 i 7.0 z innymi programami genealogicznymi; ponowny import nie tworzy duplikatów.',
    },
    backup: {
      title: 'Kopie zapasowe',
      text: 'Automatyczne codzienne kopie, pobieranie wszystkich danych i kierowane przywracanie, które najpierw zapisuje stan bieżący.',
    },
    trash: {
      title: 'Kosz',
      text: 'Usunięte osoby i drzewa można przywrócić.',
    },
    settings: {
      title: 'Języki i wygląd',
      text: 'Dziesięć języków (aplikacja uruchamia się w języku systemu operacyjnego), schematy kolorów, czcionki i wygląd drzewa.',
    },
    'desktop-app': {
      title: 'Aplikacja desktopowa dla Windows i Linuksa',
      text: 'Instalator dla Windows lub przenośny ZIP, AppImage albo pakiet Debian dla Linuksa: z własną bazą danych, bez konfiguracji, uruchamiana jednym kliknięciem, z kopią danych przed każdą aktualizacją i automatycznymi aktualizacjami (poza przenośnym ZIP i pakietem Debian).',
    },
  },
};

export default notes;
