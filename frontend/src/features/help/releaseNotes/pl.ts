import type { ReleaseNotes } from '../releases';

const notes: ReleaseNotes = {
  '1.1.0': {
    mcp: {
      title: 'Asystenci AI (MCP)',
      text: 'Asystenci AI, tacy jak Claude, mogą przeglądać, przeszukiwać i – za twoją zgodą – zmieniać twoje drzewa genealogiczne przez Model Context Protocol. Ty decydujesz dla każdego obszaru, co mogą robić; każda zmiana pojawia się w „Aktywność”.',
    },
    reports: {
      title: 'Raporty do druku i w PDF',
      text: 'Karta osoby, karta rodziny, wykaz przodków (Kekulé) i potomków (d’Aboville) – drukowane lub jako PDF, w aplikacji desktopowej od razu do pliku.',
    },
    checks: {
      title: 'Możliwe błędy',
      text: 'Nowa strona wymienia to, co jest dozwolone, ale rzadko prawdziwe – mężczyznę jako matkę, matkę w wieku 60 lat, ślub po śmierci, możliwe duplikaty i więcej – z linkami do osób; to, co się zgadza, można oznaczyć jako poprawne. Relacja, która wygląda na błędną, zostaje zapisana dopiero po pytaniu.',
    },
    statistics: {
      title: 'Statystyki do dalszych poszukiwań',
      text: 'Każda liczba w statystykach prowadzi do osób, które się za nią kryją – kliknięcie słupka otwiera listę osób z dokładnie tymi osobami. Można wybrać zakres: przodków lub potomków osoby, nazwisko, lata urodzenia. Analizy są podzielone na karty. „Czego jeszcze brakuje?” pokazuje stan badań i prowadzi do luk; „Przodkowie” pokazuje dla każdego pokolenia, ilu przodków znaleziono, zanik przodków i otwarte końce – od nowej osoby głównej drzewa. Oś czasu pokazuje urodzenia, zgony i śluby według dekad; „Życie na przestrzeni czasu” porównuje długość życia, wiek przy ślubie i przy pierwszym dziecku na przestrzeni stuleci. Do tego imiona i moda na nie, migracje rodziny z miejsca na miejsce oraz rekordy zmarłych. Wszystko można wydrukować jako raport, zapisać jako PDF lub skopiować jako CSV.',
    },
    places: {
      title: 'Podpowiedzi miejsc',
      text: 'Pola miejsca urodzenia, miejsca śmierci i miejsca wydarzenia podpowiadają miejsca, które już występują w drzewie genealogicznym, najczęstsze najpierw.',
    },
    dates: {
      title: 'Daty zapisane słownie',
      text: 'Pola daty przyjmują też daty zapisane słownie w każdym języku aplikacji, np. „2 października 1951” lub „maj 1951”, i zamieniają je na „02.10.1951” i „05.1951”.',
    },
    anniversaries: {
      title: 'Rocznice na stronie startowej',
      text: 'Strona startowa pokazuje urodziny, rocznice śmierci i ślubu z najbliższych 30 dni, z wiekiem lub liczbą lat.',
    },
    sources: {
      title: 'Źródła i przypisy',
      text: 'Jeden zbiór źródeł i archiwów dla wszystkich drzew genealogicznych: przypis zapisuje stronę, datę, transkrypcję, wiarygodność i skany i potwierdza dowolnie wiele faktów – imię, urodzenie, zgon, wydarzenia i relacje, także kilku osób. Strona źródła pokazuje według osób, co potwierdza każdy przypis; GEDCOM zachowuje źródła innych programów.',
    },
    files: {
      title: 'Przeglądanie plików',
      text: 'Obrazy, PDF, filmy, audio i pliki tekstowe, takie jak TXT, Markdown czy CSV, otwierają się w oknie z nazwą pliku w tytule; pozostałe pliki są od razu zapisywane. Pliki nie mają już limitu rozmiaru, zmieszczą się też długie filmy. Plik, który według nazwy jest obrazem lub PDF, a nim nie jest, zostaje odrzucony.',
    },
    activity: {
      title: 'Duże ilości danych i „Aktywność”',
      text: 'Eksport, import, kopia zapasowa i przywracanie radzą sobie z 50 GB i więcej przy małym zużyciu pamięci i najpierw sprawdzają wolne miejsce. „Aktywność” na pasku bocznym pokazuje postęp każdej długiej operacji; import i przywracanie można anulować.',
    },
    search: {
      title: 'Nazwiska cyrylicą',
      text: 'Wyszukiwanie traktuje nazwiska zapisane cyrylicą jak ich zapis łaciński: „Иванов” znajduje też „Iwanow” i „Ivanov”.',
    },
    'import-export': {
      title: 'Import w twoim języku',
      text: 'Import GEDCOM zapisuje tytuły wydarzeń, oznaczenia i przybliżone daty w języku interfejsu. Import i przywracanie ostrzegają, gdy ktoś byłby swoim własnym przodkiem, a bardzo długie notatki są dzielone zamiast utknąć. Eksport GEDCOM zapisuje chrzty, zawody i miejsca zamieszkania standardowymi znacznikami, które rozpoznają inne programy.',
    },
    relations: {
      title: 'Jaśniejsze relacje pochodne',
      text: 'Partner rodzica zostaje drugim rodzicem tylko wtedy, gdy rodzic ma dokładnie jednego partnera, a relacja rodzic-dziecko jest zapisywana razem z relacjami pochodnymi w całości albo wcale. Rodzeństwo powstałe tylko z usuniętej relacji rodzic–dziecko trafia razem z nią do kosza i razem z nią wraca; eksport GEDCOM pomija relacje z kosza.',
    },
    'desktop-app': {
      title: 'PostgreSQL 18',
      text: 'Aplikacja desktopowa korzysta z PostgreSQL 18; dane wersji 1.0.0 są automatycznie konwertowane przy pierwszym uruchomieniu, a stary folder bazy danych zostaje zachowany przez 30 dni.',
    },
    settings: {
      title: 'Pasek boczny w grupach',
      text: 'Pasek boczny grupuje obszary w sekcjach „Wprowadzanie”, „Analiza” i „Zarządzanie”; „Import/Eksport” jest teraz w sekcji „Zarządzanie”, a „Możliwe błędy” pokazuje, ile pozostało otwartych. „Aktywność”, „Kosz”, „Ustawienia” i „Pomoc” zostają na dole.',
    },
  },
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
