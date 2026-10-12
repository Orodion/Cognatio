import type { HelpSection } from '../types';

const help: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Pierwsze kroki',
    blocks: [
      {
        p: 'Cognatio zarządza Twoim drzewem genealogicznym: osobami, ich relacjami, wydarzeniami życiowymi, zdjęciami i dokumentami. Wybierz obszar po lewej stronie i wyszukuj osoby u góry. Przycisk ? w prawym górnym rogu otwiera pomoc do strony, na której jesteś.',
      },
      {
        steps: [
          'W sekcji „Osoby” kliknij „Nowa osoba”, wpisz co najmniej imię i zapisz.',
          'Na stronie osoby dodaj rodziców, dzieci, partnerów lub rodzeństwo w zakładce „Relacje” – wybierz istniejącą osobę lub utwórz nową od razu na miejscu.',
          'Zobacz wynik w sekcji „Drzewo genealogiczne”. Przy osobie centralnej drzewo pokazuje rodzinę z jej punktu widzenia.',
        ],
      },
      {
        p: 'Strona startowa pokazuje liczbę osób i podział według płci, szybkie przejścia do głównych obszarów, ostatnio dodane osoby i kilka wskazówek. Pomoc ma własne pole wyszukiwania nad rozdziałami.',
      },
      {
        p: 'Przykładowe drzewo: przy pierwszym uruchomieniu aplikacja desktopowa tworzy drzewo genealogiczne „Familie Kraft (Demo)” – dziesięć fikcyjnych osób w czterech pokoleniach, z relacjami, wydarzeniami życiowymi, notatkami i zdjęciami, abyś mógł od razu wypróbować każdy obszar. Jego treść jest po niemiecku. Aby zacząć od własnych danych, utwórz nowe drzewo w sekcji „Drzewa genealogiczne” i usuń przykład (trafia do kosza i nie wraca). Plik Cognatio-Demo-Familie-Kraft.zip znajduje się w folderze programu (folder „demo” w „resources”) oraz w folderze „demo” projektu; w Import/Eksport możesz zaimportować go ponownie jako nowe drzewo genealogiczne.',
      },
    ],
    link: { to: '/persons', label: 'Przejdź do osób' },
  },
  {
    id: 'persons',
    title: 'Osoby',
    blocks: [
      {
        p: 'Wymagane jest tylko imię. Jeśli jest nieznane, zaznacz „Imię nieznane” – aplikacja pokaże wtedy „(imię nieznane)”. Wpisuj daty tak dokładnie, jak je znasz: 04.01.1880 (dokładna), 01.1880 (miesiąc), 1880 (rok), „około 1880”, „przed 1880”, „po 1880” lub przedział „1880-1885”. Aplikacja sama rozpoznaje dokładność.',
      },
      {
        p: 'Podczas tworzenia osoby aplikacja wskazuje istniejące osoby o podobnym nazwisku i tym samym roku urodzenia – aby nie powstawały duplikaty.',
      },
      {
        list: [
          'Przegląd: dane osobowe, kontakt i pozostałe dane; „Edytuj” pozwala je zmienić.',
          'Oś czasu: wydarzenia takie jak narodziny, chrzest, ślub czy przeprowadzka, z datą i miejscem. Wydarzenie można powiązać z plikami – także z plikami innych osób, np. ze zdjęciem grupowym. Wydarzenia można sortować od najstarszych do najnowszych lub odwrotnie i wyświetlać jako oś czasu albo tabelę; wybór jest zapamiętywany.',
          'Relacje: zobacz sekcję „Relacje”.',
          'Notatki: dowolny tekst, np. opowieści lub źródła, każda do 10 000 znaków.',
          'Pliki: przesyłaj zdjęcia i dokumenty (do 50 MB na plik); obraz można ustawić jako zdjęcie profilowe. Ikona pobierania zapisuje plik pod jego pierwotną nazwą.',
          'Pliki można wyświetlać jako kafelki albo jako listę (przyciski nad plikami).',
          'Filtr: pole obok kart (poza „Przeglądem”) filtruje wpisy otwartej karty – życiorys, relacje, notatki lub pliki. Wielkość liter i akcenty nie mają znaczenia, przy kilku słowach muszą wystąpić wszystkie, a trafienia są podświetlone. Przeszukiwane są wszystkie teksty, np. tytuł, kategoria, data, miejsce, opis i nazwy plików. W relacjach wykres pokazuje też tylko pozostałe osoby. Tekst zostaje po zmianie karty; Esc lub X go czyści.',
        ],
      },
      { p: '„Usuń” przenosi osobę do kosza – można ją stamtąd przywrócić.' },
    ],
    link: { to: '/persons', label: 'Przejdź do osób' },
  },
  {
    id: 'relations',
    title: 'Relacje',
    blocks: [
      {
        p: 'Relacje dodajesz na stronie osoby w zakładce „Relacje” lub już podczas tworzenia osoby. Rodzaj relacji opisuje wybraną osobę z punktu widzenia bieżącej osoby: jeśli jesteś na stronie Anny i wybierzesz Maksa jako „Ojca”, Maks jest ojcem Anny. Odwrotny kierunek – Anna jest dzieckiem Maksa – wyświetla się automatycznie.',
      },
      {
        list: [
          'Rodzaje: matka, ojciec, dziecko, brat/siostra, mąż, żona, partner/ka życiowy/a, partner/ka, inne.',
          'Etykieta (opcjonalnie), np. „dziecko adoptowane” lub „ojczym”.',
          'Okres od – do, np. dla małżeństwa; w przypadku dziecka jako początek proponowana jest data urodzenia.',
          'Jeśli osoba jeszcze nie istnieje, wybierz „Nowa osoba” i utwórz ją bezpośrednio w oknie.',
          'Wykres: obok listy (na wąskich ekranach nad nią) relacje osoby są rysowane jako diagram – rodzice u góry, partnerzy obok, dzieci poniżej. Kliknięcie osoby otwiera ją; przyciskiem „Wykres” można go ukryć lub pokazać, wybór jest zapamiętywany.',
        ],
      },
      {
        p: 'Niektóre relacje są dodawane automatycznie: gdy połączy się rodzica z dzieckiem, partner rodzica również zostaje rodzicem dziecka (dopóki dziecko ma mniej niż dwoje rodziców; relacja zaczyna się od narodzin dziecka, jeśli są dokładnie znane), a pozostałe dzieci rodzica stają się rodzeństwem dziecka. Przycisk usuwania przy relacji usuwa tylko relację – osoby zostają.',
      },
    ],
  },
  {
    id: 'tree',
    title: 'Widok drzewa genealogicznego',
    blocks: [
      {
        list: [
          'Drzewo genealogiczne: wszystkie rodziny drzewa.',
          'Wykres przodków: rodzice, dziadkowie itd. osoby centralnej.',
          'Wykres potomków: dzieci, wnuki itd. osoby centralnej.',
          'Sieć relacji: wszystkie powiązania w postaci sieci.',
        ],
      },
      {
        p: 'Osoba centralna określa, od kogo rysowane jest drzewo; „Pokolenia” ograniczają głębokość. Powiększasz i pomniejszasz kółkiem myszy lub paskiem powiększenia; kliknięcie osoby otwiera jej stronę. Kolor obramowania wskazuje płeć. Bardzo duże drzewa (od 400 osób) nie są rysowane automatycznie – wybierz wtedy osobę centralną i mniej pokoleń.',
      },
      {
        p: '„Eksport” zapisuje drzewo jako PNG lub SVG albo drukuje je (także do PDF), opcjonalnie tylko widoczny obszar. Aplikacja zapamiętuje widok, pokolenia i osobę centralną; wartości domyślne ustawisz w „Ustawieniach”. Na stronie osoby „Pokaż drzewo” otwiera drzewo z tą osobą jako centralną.',
      },
    ],
    link: { to: '/tree', label: 'Przejdź do drzewa genealogicznego' },
  },
  {
    id: 'search',
    title: 'Wyszukiwanie',
    blocks: [
      {
        p: 'Pole wyszukiwania u góry przeszukuje otwarte drzewo genealogiczne: nazwiska – także podobną pisownię, więc „Meier” znajdzie też „Mayer” i „Maier” –, dane osobowe, takie jak miejsca i zawody, oś czasu oraz notatki. Przy każdym wyniku widać, po czym został znaleziony.',
      },
    ],
  },
  {
    id: 'statistics',
    title: 'Statystyki',
    blocks: [
      {
        p: 'Statystyki analizują otwarte drzewo genealogiczne (bez kosza): kluczowe liczby, takie jak liczba osób, płcie i średnia długość życia, rozkład wieku, najczęstsze nazwiska, najczęstsze miejsca urodzenia oraz przegląd pokoleń.',
      },
    ],
    link: { to: '/statistics', label: 'Przejdź do statystyk' },
  },
  {
    id: 'family-trees',
    title: 'Kilka drzew genealogicznych',
    blocks: [
      {
        p: 'Możesz prowadzić kilka oddzielnych drzew genealogicznych, np. rodzinę ze strony ojca i ze strony matki. Każda osoba należy do dokładnie jednego drzewa; wszystkie strony pokazują tylko otwarte drzewo. Przełączasz je wyborem „Otwarte drzewo genealogiczne” u góry paska bocznego.',
      },
      {
        p: 'Na stronie „Drzewa genealogiczne” tworzysz, zmieniasz nazwy, otwierasz lub usuwasz drzewa. Usunięte drzewo trafia do kosza wraz ze wszystkimi danymi; można usunąć także ostatnie – aplikacja zaproponuje wtedy utworzenie nowego, import pliku lub przywrócenie drzewa z kosza.',
      },
    ],
    link: { to: '/family-trees', label: 'Przejdź do drzew genealogicznych' },
  },
  {
    id: 'import-export',
    title: 'Import/Eksport',
    blocks: [
      {
        p: 'Eksport i import dotyczą otwartego drzewa genealogicznego. Eksport ZIP zawiera wszystkie dane i pliki – do kopii zapasowej lub dla innej instalacji Cognatio. GEDCOM (5.5.1 lub 7.0) to format wymiany innych programów genealogicznych, takich jak Ancestry, MyHeritage czy Gramps, w razie potrzeby z obrazami i dokumentami. Domyślnie jeden plik może mieć do 2 GB (zmienisz to w „Ustawienia → Dane i kopie zapasowe”); jeśli pliki drzewa są większe, wyeksportuj je bez plików.',
      },
      {
        steps: [
          'Wybierz plik (ZIP z tej aplikacji lub GEDCOM).',
          'Wybierz cel: otwarte lub nowe drzewo. Dla plików GEDCOM aplikacja proponuje nowe drzewo.',
          'Podgląd pokazuje, co się zmieni. Dla otwartego drzewa wybierz sposób postępowania.',
          '„Uruchom import”.',
        ],
      },
      {
        list: [
          'Scal – wygrywa nowsze: nowe osoby są dodawane; tam, gdzie dane się różnią, obowiązuje nowsza wersja.',
          'Scal – decyduj ręcznie: jak wyżej, ale tam, gdzie dane się różnią, decydujesz dla każdej osoby.',
          'Nadpisz: otwarte drzewo jest w całości zastępowane plikiem; pozostałe drzewa pozostają bez zmian.',
        ],
      },
      {
        p: 'Gdy plik GEDCOM jest importowany ponownie, aplikacja rozpoznaje istniejące osoby i nie tworzy ich drugi raz. Historia importów pokazuje wcześniejsze importy.',
      },
    ],
    link: { to: '/import-export', label: 'Przejdź do Importu/Eksportu' },
  },
  {
    id: 'backup',
    title: 'Kopia zapasowa',
    blocks: [
      {
        p: 'Serwer automatycznie tworzy kopie zapasowe bazy danych i plików, domyślnie codziennie. Ustawienia pokazują ostatnią kopię i ostrzegają, jeśli jest starsza niż trzy dni.',
      },
      {
        p: 'W „Ustawienia → Kopia zapasowa” przycisk „Pobierz kopię zapasową” pobiera jeden plik ze wszystkimi drzewami genealogicznymi, plikami, koszem i historią importów. Pojedyncze drzewa zapisujesz przez „Import/Eksport”. Kopia zapasowa większa niż limit rozmiaru zostanie zapisana, ale ta aplikacja nie może jej przywrócić – zapisz wtedy dodatkowo pojedyncze drzewa przez „Import/Eksport”.',
      },
      {
        steps: [
          'Wybierz „Przywróć kopię zapasową…” i wskaż plik kopii – zostanie najpierw sprawdzony, nic jeszcze się nie zmienia.',
          'Sprawdź zestawienie „Teraz / W kopii”.',
          'Wpisz „USUŃ”, aby potwierdzić, i wybierz „Przywróć”.',
        ],
      },
      {
        p: 'Wszystkie bieżące dane zostaną zastąpione kopią zapasową. Wcześniej serwer zapisuje bieżący stan jako plik „cognatio_before_restore_…zip” – za jego pomocą można cofnąć przywrócenie. Zachowywane są trzy ostatnie takie pliki; starsze serwer usuwa.',
      },
      {
        p: 'Limit rozmiaru: eksport, import, kopia zapasowa i przywracanie przetwarzają plik w pamięci, domyślnie do 2 GB. W „Ustawienia → Dane i kopie zapasowe → Limity rozmiaru” komputer z dużą ilością pamięci może zezwolić na większe pliki. Powyżej 4 GB wolne musi być co najmniej dwukrotnie więcej pamięci RAM niż rozmiar pliku; w przeciwnym razie aplikacja może bardzo zwolnić lub przestać działać; ustawienia ostrzegają o tym. Zbyt duży eksport zostanie odrzucony, zbyt duża kopia zapasowa zostanie utworzona z ostrzeżeniem.',
      },
    ],
    link: { to: '/settings', label: 'Przejdź do ustawień' },
  },
  {
    id: 'trash',
    title: 'Kosz',
    blocks: [
      {
        p: 'W koszu znajdują się usunięte osoby z otwartego drzewa genealogicznego oraz usunięte drzewa genealogiczne; liczba na pasku bocznym pokazuje, ile ich jest. „Przywróć” je przywraca. „Usuń trwale” usuwa także relacje, wydarzenia, notatki i pliki, a cofnąć to można tylko za pomocą kopii zapasowej.',
      },
    ],
    link: { to: '/trash', label: 'Przejdź do kosza' },
  },
  {
    id: 'settings',
    title: 'Ustawienia',
    blocks: [
      {
        p: 'Język (który zmienia się tylko tutaj), schemat kolorów i wartości domyślne drzewa genealogicznego (widok, pokolenia, osoba centralna dla każdego drzewa) obowiązują w tej przeglądarce. Kopia zapasowa i stan systemu dotyczą całej aplikacji.',
      },
      {
        list: [
          'Wygląd (bloki „Czcionka i kolory” oraz „Drzewo: wygląd”): czcionka i jej rozmiar, kolor akcentu, styl, grubość i kolor linii w drzewie, rozmiar i narożniki kart osób, zdjęcie, daty i czarna wstążka żałobna przy osobach zmarłych na kartach oraz kolory obramowania według płci – z podglądem na żywo i przyciskiem „Przywróć domyślne”.',
          'Drzewo: zachowanie: widok, liczba pokoleń i osoba centralna, z którymi drzewo się otwiera.',
          'Dane i kopie zapasowe: zapisywanie i przywracanie (zob. „Kopia zapasowa”).',
          'System (zawsze widoczny): język (także „Jak system operacyjny”), schemat kolorów, wersja i stan serwera oraz bazy danych, liczba osób i plików, poziom logowania, dziennik serwera i przeglądarki z eksportem do analizy błędów (nie zawiera danych drzewa), licencje oraz w aplikacji desktopowej aktualizacje programu (zob. „Aplikacja desktopowa”).',
        ],
      },
      {
        p: 'Bloki otwiera się i zamyka kliknięciem („Rozwiń wszystko” / „Zwiń wszystko”). Pole wyszukiwania nad nimi znajduje ustawienie, otwiera jego blok i przechodzi do pola. Wygląd, język i wartości domyślne drzewa są zapisywane w tej przeglądarce lub w tym oknie aplikacji.',
      },
    ],
    link: { to: '/settings', label: 'Przejdź do ustawień' },
  },
  {
    id: 'desktop-app',
    title: 'Aplikacja desktopowa (Windows, Linux)',
    blocks: [
      {
        p: 'Aplikacja desktopowa pokazuje Cognatio we własnym oknie – bez przeglądarki, Node i bazy danych do zainstalowania. Uruchamia w tle własną bazę danych i zatrzymuje ją, gdy zamkniesz okno lub wybierzesz „Zakończ” na dole paska bocznego. Naraz działa tylko jedna instancja.',
      },
      {
        list: [
          'Windows: zainstaluj za pomocą pliku instalacyjnego (dla użytkownika, bez uprawnień administratora) albo rozpakuj przenośny plik ZIP, który trzyma wszystkie dane w folderze „data” obok programu.',
          'Linux: AppImage to pojedynczy plik – nadaj mu prawo uruchamiania i uruchom, dodaje się sam do menu aplikacji. Pakiet Debian instaluje się poleceniem „sudo apt install ./Cognatio-….deb”. Jeśli zainstalowano go poleceniem „dpkg -i”, „sudo apt --fix-broken install” doinstaluje brakujące biblioteki i dokończy konfigurację – inaczej Cognatio się nie uruchomi.',
          'Twoje dane są w %APPDATA%\\Cognatio w systemie Windows i w ~/.config/Cognatio w systemie Linux, oddzielnie od programu: aktualizacja ani odinstalowanie nigdy ich nie usuwa. Program odinstalowujący w systemie Windows pyta, czy usunąć także dane – wcześniej pobierz kopię zapasową.',
          'Od czasu do czasu wykonaj kopię zapasową (Ustawienia → Kopia zapasowa) i przechowuj ją w innym miejscu. Aplikacja zapisuje też automatycznie swoją bazę danych przed każdą aktualizacją i raz dziennie.',
        ],
      },
      {
        p: 'W Ustawieniach → System → Aktualizacje programu Cognatio szuka nowej wersji mniej więcej raz dziennie (tam jest też przełącznik; „Sprawdź teraz” szuka od razu). Wysyłane jest tylko zapytanie o plik wersji. Nowa wersja jest pobierana w tle i instalowana po ponownym uruchomieniu; wcześniej baza danych jest zapisywana. „Także wersje testowe (beta)” oferuje wersje przed ich wydaniem; powrót do wydanych wersji nigdy nie instaluje starszej. Przenośnego pliku ZIP i pakietu Debian aplikacja nie aktualizuje – nową wersję zainstaluj samodzielnie.',
      },
    ],
    link: { to: '/settings', label: 'Przejdź do ustawień' },
  },
  {
    id: 'versions',
    title: 'Historia wersji',
    blocks: [{ p: 'Co zmieniło się w której wersji, od najnowszej. Kliknięcie funkcji przenosi do odpowiedniego rozdziału pomocy.' }],
  },
  {
    id: 'faq',
    title: 'Często zadawane pytania',
    blocks: [
      {
        faq: [
          { q: 'Przez pomyłkę usunąłem/usunęłam osobę.', a: 'Otwórz kosz i wybierz przy osobie „Przywróć”.' },
          { q: 'Znam datę tylko w przybliżeniu.', a: 'Wpisz ją tak dokładnie, jak ją znasz, np. „około 1880”, „przed 1900” lub „1880-1885”.' },
          {
            q: 'Jak przenieść drzewo genealogiczne z Ancestry, MyHeritage lub innego programu?',
            a: 'Wyeksportuj je tam jako plik GEDCOM (.ged) i zaimportuj w „Import/Eksport” jako nowe drzewo genealogiczne.',
          },
          {
            q: 'Osoba występuje dwa razy.',
            a: 'Uzupełnij brakujące dane i relacje przy jednej z nich, a drugą usuń.',
          },
          {
            q: 'Czy mogę obsługiwać aplikację bez myszy?',
            a: 'Tak: Tab i Shift+Tab przechodzą między elementami, Enter lub spacja je uruchamiają, Escape zamyka okna dialogowe. Pierwsze naciśnięcie Tab pokazuje „Przejdź do treści”.',
          },
          {
            q: 'Gdzie są zapisywane moje dane?',
            a: 'Na Twoim własnym komputerze. W aplikacji desktopowej w folderze %APPDATA%\\Cognatio (Windows) lub ~/.config/Cognatio (Linux), w wariancie przenośnym w folderze „data” obok programu; jeśli sam prowadzisz serwer, w jego bazie danych i folderze plików. Tylko język, schemat kolorów i ustawienia widoku są zapisane w przeglądarce lub w oknie aplikacji.',
          },
          {
            q: 'Jak przenieść dane na inny komputer?',
            a: 'W Ustawieniach → Kopia zapasowa wybierz „Pobierz kopię zapasową”, skopiuj plik na drugi komputer, zainstaluj tam Cognatio i wybierz „Przywróć kopię zapasową…”. Pojedyncze drzewo genealogiczne można przenieść eksportem i importem ZIP w „Import/Eksport”.',
          },
          {
            q: 'Jak zaktualizować aplikację?',
            a: 'Aplikacja desktopowa sama szuka aktualizacji (Ustawienia → System → Aktualizacje programu) i instaluje je po ponownym uruchomieniu. Przenośny plik ZIP i pakiet Debian aktualizuje się, instalując nową wersję; Twoje dane zostają.',
          },
        ],
      },
    ],
  },
];

export default help;
