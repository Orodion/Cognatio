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
        p: 'Strona startowa pokazuje liczbę osób i podział według płci, szybkie przejścia do głównych obszarów, ostatnio dodane osoby i kilka wskazówek. Pomoc ma własne pole wyszukiwania nad rozdziałami. Karta „Rocznice” pokazuje urodziny, rocznice śmierci i ślubu z najbliższych 30 dni – dla dat z dniem, miesiącem i rokiem; rocznica ślubu to początek relacji mąż/żona.',
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
        p: 'Wymagane jest tylko imię. Jeśli jest nieznane, zaznacz „Imię nieznane” – aplikacja pokaże wtedy „(imię nieznane)”. Wpisuj daty tak dokładnie, jak je znasz: 04.01.1880 (dokładna), 01.1880 (miesiąc), 1880 (rok), „około 1880”, „przed 1880”, „po 1880” lub przedział „1880-1885”. Aplikacja sama rozpoznaje dokładność. Data zapisana słownie, np. „2 października 1880”, zmienia się w „02.10.1880”.',
      },
      {
        p: 'Podczas tworzenia osoby aplikacja wskazuje istniejące osoby o podobnym nazwisku i tym samym roku urodzenia – aby nie powstawały duplikaty. Pola miejsca – urodzenia, śmierci i wydarzeń – podczas pisania podpowiadają miejsca, które już występują w drzewie genealogicznym; nadal można wpisać dowolne inne miejsce.',
      },
      {
        list: [
          'Przegląd: dane osobowe, kontakt i pozostałe dane; „Edytuj” pozwala je zmienić.',
          'Oś czasu: wydarzenia takie jak narodziny, chrzest, ślub czy przeprowadzka, z datą i miejscem. Wydarzenie można powiązać z plikami – także z plikami innych osób, np. ze zdjęciem grupowym. Wydarzenia można sortować od najstarszych do najnowszych lub odwrotnie i wyświetlać jako oś czasu albo tabelę; wybór jest zapamiętywany.',
          'Relacje: zobacz sekcję „Relacje”.',
          'Notatki: dowolny tekst, np. opowieści lub notatki z badań, każda do 10 000 znaków.',
          'Pliki: przesyłaj zdjęcia i dokumenty (także filmy, bez limitu rozmiaru na plik); obraz można ustawić jako zdjęcie profilowe. Ikona pobierania zapisuje plik pod jego pierwotną nazwą. Kliknięcie pliku pokazuje go w osobnym oknie z jego nazwą jako tytułem – obrazy, PDF, filmy, dźwięk i pliki tekstowe (np. TXT, Markdown, CSV); inne pliki, np. ZIP, są od razu zapisywane.',
          'Pliki można wyświetlać jako kafelki albo jako listę (przyciski nad plikami).',
          'Źródła: przypisy osoby, jej wydarzeń i relacji – zobacz sekcję „Źródła i przypisy”.',
          'Filtr: pole obok kart (poza „Przeglądem”) filtruje wpisy otwartej karty – życiorys, relacje, notatki, pliki lub źródła. Wielkość liter i akcenty nie mają znaczenia, przy kilku słowach muszą wystąpić wszystkie, a trafienia są podświetlone. Przeszukiwane są wszystkie teksty, np. tytuł, kategoria, data, miejsce, opis i nazwy plików. W relacjach wykres pokazuje też tylko pozostałe osoby. Tekst zostaje po zmianie karty; Esc lub X go czyści.',
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
        p: 'Niektóre relacje są dodawane automatycznie: gdy połączy się rodzica z dzieckiem, partner rodzica również zostaje rodzicem dziecka (jeśli rodzic ma dokładnie jednego partnera, a dziecko nie ma jeszcze drugiego rodzica; przy kilku partnerach drugiego rodzica dodaje się ręcznie; relacja zaczyna się od narodzin dziecka, jeśli są dokładnie znane), a pozostałe dzieci rodzica stają się rodzeństwem dziecka. Przycisk usuwania przy relacji usuwa tylko relację – osoby zostają.',
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
    id: 'sources',
    title: 'Źródła i przypisy',
    blocks: [
      {
        p: 'Źródło to dokument lub dzieło, z którego pochodzą dane – księga metrykalna, akta stanu cywilnego, spis ludności, list, nagrobek, strona internetowa albo wywiad. Przypis to wpis w nim: strona lub numer wpisu, data, wpis słowo w słowo, jego wiarygodność i skany. Jeden przypis może poświadczać dowolnie wiele faktów, np. akt małżeństwa – pana młodego, pannę młodą, ich rodziców, świadków, ślub i małżeństwo.',
      },
      {
        p: 'Źródła, archiwa i przypisy tworzą jeden zbiór dla wszystkich drzew: urząd stanu cywilnego czy księgę metrykalną tworzy się raz, a przypis może poświadczać fakty dotyczące osób w kilku drzewach. Zmiana źródła obowiązuje wszędzie.',
      },
      {
        list: [
          'Na stronie osoby karta „Źródła” pokazuje przypisy osoby, jej wydarzeń i relacji, pogrupowane według faktów. „Zacytuj źródło” wybiera fakt, źródło (albo je tworzy) i istniejący już przypis z niego lub nowy. Mała książka przy imieniu i nazwisku, narodzinach, śmierci, wydarzeniu lub relacji pokazuje, ile ma przypisów; kliknięcie otwiera kartę.',
          '„Źródła” na pasku bocznym pokazują źródła używane przez otwarte drzewo oraz te nieużywane nigdzie; „Wszystkie drzewa” pokazuje cały zbiór. Strona źródła pokazuje jego pola, skany i przypisy z faktami, które każdy z nich poświadcza, uporządkowanymi według osób, z latami życia; × przy fakcie usuwa powiązanie; „Powiąż fakty” wiąże przypis kolejno z dalszymi osobami.',
          'Archiwami (urząd stanu cywilnego, archiwum parafialne, biblioteka, strona internetowa) zarządza się na drugiej karcie i wybiera je przy każdym źródle; nowe można też utworzyć od razu w formularzu źródła.',
          'Wiarygodność odpowiada poziomom GEDCOM: źródło pierwotne (oryginalny wpis), źródło wtórne (spisane później), wątpliwe (np. przekaz ustny), niewiarygodne lub szacunkowe.',
          'Skany należą do całego źródła (strona tytułowa, nagrobek) albo do przypisu (pojedyncza strona).',
          'Wyszukiwarka u góry znajduje także źródła – po tytule, autorze, archiwum, sygnaturze i transkrypcjach ich przypisów; są wymienione nad znalezionymi osobami. Statystyki pokazują, ile osób ma przypis i które źródła są cytowane najczęściej.',
          'GEDCOM: eksport zapisuje archiwa i źródła jako rekordy REPO i SOUR, a każdy przypis przy faktach, które poświadcza (strona, data, transkrypcja, wiarygodność, skany w GEDZIP); import przejmuje też źródła z innych programów – również pod imionami, wydarzeniami i rodzinami – i łączy jednakowe przypisy z powrotem w jeden.',
        ],
      },
      {
        p: 'Usunięcie źródła przenosi je do kosza razem z jego przypisami: znikają ze wszystkich faktów i wracają po przywróceniu. Archiwum w koszu zostawia swoje źródła bez archiwum aż do przywrócenia. Trwałe usunięcie osoby, wydarzenia, relacji lub drzewa usuwa tylko ich powiązania; źródła pozostają.',
      },
      {
        p: 'Eksport drzewa zawiera źródła, archiwa i przypisy, których używają jego osoby, wraz ze skanami; import wykorzystuje istniejące już źródło zamiast je kopiować. Transkrypcja przypisu może wymieniać osoby z innego drzewa – trafia razem z eksportem. Plik eksportu ze źródłami może odczytać tylko ta lub nowsza wersja Cognatio.',
      },
    ],
    link: { to: '/sources', label: 'Przejdź do źródeł' },
  },
  {
    id: 'search',
    title: 'Wyszukiwanie',
    blocks: [
      {
        p: 'Pole wyszukiwania u góry przeszukuje otwarte drzewo genealogiczne: nazwiska – także podobną pisownię, więc „Meier” znajdzie też „Mayer” i „Maier” –, dane osobowe, takie jak miejsca i zawody, oś czasu oraz notatki. Przy każdym wyniku widać, po czym został znaleziony. Nazwiska zapisane cyrylicą liczą się jak ich zapis łaciński: „Иванов” znajduje też „Iwanow” i „Ivanov”. Znajduje też źródła – są wymienione nad znalezionymi osobami (zobacz „Źródła i przypisy”).',
      },
    ],
  },
  {
    id: 'statistics',
    title: 'Statystyki',
    blocks: [
      {
        p: 'Statystyki analizują otwarte drzewo genealogiczne (bez kosza), podzielone na karty: „Przegląd” z kluczowymi liczbami, takimi jak liczba osób, płeć i średnia długość życia, „Życie” z rozkładem wieku, „Nazwiska i miejsca” z najczęstszymi nazwiskami i miejscami urodzenia, „Przodkowie” z przeglądem pokoleń oraz „Źródła” z użytymi źródłami, osobami z co najmniej jednym przypisem i najczęściej cytowanymi źródłami.',
      },
      {
        p: 'Każda liczba, która liczy osoby, jest linkiem: kliknięcie kluczowej liczby, słupka lub pokolenia otwiera listę osób z dokładnie tymi osobami. Nad listą widać, z jakiego wyboru pochodzą; × ponownie pokazuje wszystkie osoby, „Wróć do statystyk” prowadzi z powrotem. Wyszukiwanie u góry szuka wtedy tylko wśród tych osób.',
      },
      {
        p: 'Nad kartami wybiera się zakres: całe drzewo, przodków lub potomków osoby (wraz z nią samą) albo wszystkie osoby o danym nazwisku (także jako nazwisku rodowym) – w razie potrzeby tylko urodzone w określonych latach. Wszystkie liczby i listy się do niego stosują; tylko źródła dotyczą zawsze całego drzewa. Ostatnio wybrany zakres jest zapamiętywany dla każdego drzewa.',
      },
      {
        p: '„Czego jeszcze brakuje?” w przeglądzie pokazuje dla daty i miejsca urodzenia, daty i miejsca śmierci (u zmarłych), ojca, matki, partnera (u zmarłych od 18 lat), zdjęcia i źródła, u ilu osób zapisano daną informację; stan badań to średnia tych odsetków. Kliknięcie brakujących otwiera listę osób, przy których zostało coś do zrobienia.',
      },
      {
        p: '„Przodkowie” pokazuje dla każdego pokolenia, ilu z możliwych przodków (2 rodziców, 4 dziadków, 8 pradziadków …) znaleziono, kto występuje kilka razy (zanik przodków) i otwarte końce – przodków, którym brakuje jeszcze ojca lub matki. Analiza zaczyna się od osoby głównej drzewa, ustawianej przyciskiem „Osoba główna” na stronie osoby; raporty i drzewo też zaczynają się od niej.',
      },
      {
        p: 'Oś czasu w przeglądzie pokazuje urodzenia, zgony lub śluby według dekad; puste dekady zostają, aby luki w badaniach rzucały się w oczy. Śluby to początek małżeństwa (relacja mąż/żona) lub wydarzenie „ślub”, raz na parę i rok; partnerzy życiowi i partnerzy liczą się tylko z tym wydarzeniem.',
      },
      {
        p: '„Życie na przestrzeni czasu” w karcie „Życie” pokazuje według stulecia urodzenia, osobno dla mężczyzn i kobiet, średnią długość życia – także tylko tych, którzy dożyli 15 lat –, wiek przy pierwszym ślubie i przy narodzinach pierwszego dziecka; w nawiasie liczba osób, na których opiera się wartość, średniej z mniej niż 5 osób się nie pokazuje. Do tego liczba dzieci na parę i różnica wieku partnerów.',
      },
      {
        p: '„Nazwiska i miejsca” pokazuje też najczęstsze imiona mężczyzn i kobiet – liczy się każde imię, więc „Johann Georg” dla Johanna i dla Georga – oraz modę na imiona według stuleci. „Migracje” pokazują, kto zmarł w miejscu urodzenia, najczęstsze drogi od miejsca urodzenia przez przeprowadzki do miejsca śmierci oraz miejsca z ich osobami i okresem danych.',
      },
      {
        p: '„Rekordy” w karcie „Życie” podają najdłuższe życie, najdłuższe małżeństwo, najwięcej dzieci, partnerów i potomków, najmłodszych i najstarszych rodziców przy narodzinach oraz największą różnicę wieku w parze – tylko osób zmarłych. Jeśli rekord jest też możliwym błędem, np. matka w wieku 61 lat, obok stoi uwaga z linkiem.',
      },
      {
        p: '„Drukuj lub zapisz jako PDF” otwiera raport „Statystyki” ze wszystkimi liczbami wybranego zakresu w tabelach. „Kopiuj jako CSV” na każdej karcie umieszcza jej liczby w schowku, do wklejenia w arkuszu kalkulacyjnym. Asystenci AI otrzymują te same liczby narzędziem „get_statistics”, także dla zakresu.',
      },
    ],
    link: { to: '/statistics', label: 'Przejdź do statystyk' },
  },
  {
    id: 'checks',
    title: 'Możliwe błędy',
    blocks: [
      {
        p: '„Możliwe błędy” wymienia dane otwartego drzewa, które są dozwolone, ale rzadko prawdziwe – często to literówka: mężczyzna wpisany jako matka albo kobieta jako mąż, partnerzy będący też rodzicem i dzieckiem lub rodzeństwem, dziecko z więcej niż dwojgiem rodziców, rodzic poniżej 12 lat lub matka powyżej 55 lat przy narodzinach, rodzic zmarły przed narodzinami, związek zaczynający się przed narodzinami lub po śmierci partnera, śmierć przed narodzinami, życie dłuższe niż 110 lat lub osoba powyżej 110 lat bez daty śmierci, wydarzenia przed narodzinami lub po śmierci, możliwe duplikaty i osoby będące swoimi własnymi przodkami. Data przybliżona, np. „ok. 1880”, liczy się z tolerancją pięciu lat w każdą stronę – zgłaszane jest tylko to, co na pewno się nie zgadza.',
      },
      {
        p: 'Każdy wpis wymienia osoby z linkiem do nich. Popraw tam błąd – wpis zniknie sam – albo kliknij „Jest poprawne”, jeśli dane się zgadzają: wpis zostanie ukryty, także po kopii zapasowej i przywróceniu. „Pokaż też oznaczone jako poprawne” pokazuje je ponownie.',
      },
      {
        p: 'Gdy zapisujesz relację, która wygląda na błędną, aplikacja podaje powód i pyta, czy mimo to ją zapisać. Asystenci AI też muszą cię zapytać, zanim zapiszą taką relację.',
      },
    ],
    link: { to: '/checks', label: 'Przejdź do możliwych błędów' },
  },
  {
    id: 'reports',
    title: 'Raporty',
    blocks: [
      {
        p: 'W części „Raporty” dane otwartego drzewa genealogicznego można wydrukować lub zapisać jako PDF: kartę osoby (wszystkie dane osoby z krewnymi, wydarzeniami, notatkami, zdjęciami i źródłami jako przypisami – także dla wszystkich osób naraz), kartę rodziny (para ze ślubem, rodzicami i dziećmi), wykaz przodków z numeracją Kekulégo (ojciec n = 2n, matka = 2n + 1; przodek występujący dwukrotnie odsyła do pierwszego numeru) oraz wykaz potomków z numeracją d’Aboville’a (1, 1.1, 1.1.2 …). Przycisk „Raport” na stronie osoby otwiera raporty z tą osobą jako początkiem.',
      },
      {
        p: 'Nad podglądem wybierasz zdjęcia, notatki, źródła, dane kontaktowe oraz czy osoby żyjące pojawiają się tylko z imieniem i rokiem urodzenia; wybór jest zapamiętywany. „Drukuj” otwiera okno drukowania. „Zapisz jako PDF” w aplikacji desktopowej pyta o nazwę pliku i sam zapisuje PDF; w przeglądarce wybierz w oknie drukowania drukarkę „Zapisz jako PDF”. Każda karta zaczyna się na nowej stronie, a strony są numerowane.',
      },
    ],
    link: { to: '/reports', label: 'Przejdź do raportów' },
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
        p: 'Eksport i import dotyczą otwartego drzewa genealogicznego. Eksport ZIP zawiera wszystkie dane i pliki – do kopii zapasowej lub dla innej instalacji Cognatio. GEDCOM (5.5.1 lub 7.0) to format wymiany innych programów genealogicznych, takich jak Ancestry, MyHeritage czy Gramps, w razie potrzeby z obrazami i dokumentami. Pliki mogą mieć dowolny rozmiar, także powyżej 4 GB; w „Ustawienia → Dane i kopie zapasowe” można ustawić górny limit.',
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
        p: 'Gdy plik GEDCOM jest importowany ponownie, aplikacja rozpoznaje istniejące osoby i nie tworzy ich drugi raz. Historia importów pokazuje wcześniejsze importy. Jeśli po imporcie ktoś byłby własnym przodkiem (cykl w relacjach rodzic–dziecko), podgląd wymienia te osoby; import i tak zostanie wykonany, a relacje poprawiasz potem ręcznie.',
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
        p: 'W „Ustawienia → Kopia zapasowa” przycisk „Pobierz kopię zapasową” pobiera jeden plik ze wszystkimi drzewami genealogicznymi, plikami, koszem i historią importów. Pojedyncze drzewa zapisujesz przez „Import/Eksport”. Jeśli w „Limity rozmiaru” ustawiono górny limit, większa kopia zapasowa i tak zostanie zapisana, ale da się ją przywrócić dopiero po podniesieniu limitu.',
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
        p: 'Rozmiar: eksport, import, kopia zapasowa i przywracanie czytają i zapisują pliki po kawałku – nawet bardzo duże (50 GB i więcej) prawie nie zajmują pamięci. Wcześniej aplikacja sprawdza, czy na dysku jest dość wolnego miejsca; przywracanie potrzebuje mniej więcej miejsca kopii zapasowej oraz miejsca bieżących danych, bo najpierw w całości zapisuje bieżący stan. „Aktywność” na pasku bocznym pokazuje postęp tych operacji i przesyłania plików, także gdy w międzyczasie otworzysz inną stronę, oraz wymienia zakończone do zamknięcia aplikacji; import i przywracanie można tam przerwać, dopóki dane nie zostaną zastąpione. W „Ustawienia → Dane i kopie zapasowe → Limity rozmiaru” można ustawić górny limit (domyślnie brak). Pendrive’y z FAT32 przyjmują najwyżej 4 GB na plik – dla dużych kopii wybierz dysk z exFAT lub NTFS.',
      },
    ],
    link: { to: '/settings', label: 'Przejdź do ustawień' },
  },
  {
    id: 'trash',
    title: 'Kosz',
    blocks: [
      {
        p: 'W koszu znajdują się usunięte osoby z otwartego drzewa genealogicznego oraz usunięte drzewa genealogiczne; liczba na pasku bocznym pokazuje, ile ich jest. „Przywróć” je przywraca. „Usuń trwale” usuwa także relacje, wydarzenia, notatki i pliki, a cofnąć to można tylko za pomocą kopii zapasowej. Poniżej, w części „Źródła i archiwa”, są usunięte źródła i archiwa; należą do wszystkich drzew genealogicznych, a źródło zabiera ze sobą swoje przypisy – po przywróceniu wracają one do wszystkich faktów.',
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
          'Asystenci AI (MCP): czy i co mogą robić asystenci AI (zob. „Asystenci AI (MCP)”).',
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
    id: 'ai-assistants',
    title: 'Asystenci AI (MCP)',
    blocks: [
      {
        p: 'Asystenci AI, tacy jak Claude (Claude Desktop, Claude Code), i inne programy obsługujące Model Context Protocol (MCP) mogą pracować z twoimi drzewami genealogicznymi: wyszukiwać osoby, odpowiadać na pytania typu „Którzy przodkowie pochodzili z Pomorza?”, wskazywać luki i – jeśli na to pozwolisz – wprowadzać to, co dyktujesz, lub to, co mówi zeskanowany wpis z księgi parafialnej.',
      },
      {
        p: 'Włącza się to w Ustawienia → „Asystenci AI (MCP)”. Aplikacja pokazuje wtedy adres i token – token tylko raz – wraz z gotowym poleceniem dla Claude Code i blokiem konfiguracji dla innych programów. Asystenci łączą się tylko z tym komputerem; to, co odczytają, trafia do dostawcy modelu AI, z którego korzystasz.',
      },
      {
        steps: [
          'Ustawienia → „Asystenci AI (MCP)”: zaznacz „Zezwól na asystentów AI”. Pojawią się adres i token – token tylko teraz.',
          'Skopiuj „Polecenie dla Claude Code” i uruchom je raz w terminalu (claude mcp add --transport http cognatio …). Z „--scope user” po „--transport http” działa w każdym folderze.',
          'Uruchom Claude Code: „/mcp” pokazuje „cognatio” jako połączone, wraz z narzędziami.',
          'Pytaj własnymi słowami. Do zmian zaznacz poziom obszaru (np. „Zapis” przy osobach).',
        ],
      },
      {
        p: 'Możesz na przykład zapytać:',
      },
      {
        list: [
          'Kim są przodkowie Anny Kraft aż do pradziadków i którzy z nich pochodzili z Pomorza?',
          'Które osoby urodziły się w latach 1850–1900 w Lipsku? Czy są możliwe duplikaty?',
          'Z „zapisem”: „Dodaj chrzest Anny Kraft 2 października 1951 w Lipsku.” albo „Wprowadź ten wpis z księgi parafialnej wraz ze źródłem.”',
          'Z uprawnieniami do plików: „Wyeksportuj drzewo jako GEDCOM do mojego folderu Dokumenty.” albo „Dodaj skan …\\taufschein.jpg do chrztu Anny.”',
        ],
      },
      {
        list: [
          'Uprawnienia dla każdego obszaru: wyłączone, odczyt, zapis (tworzenie, zmiana, przenoszenie do kosza – do cofnięcia w aplikacji) i usuwanie (nie do cofnięcia, np. przywrócenie kopii zapasowej). Po włączeniu każdy obszar ma „odczyt”; przed „zapisem” lub „usuwaniem” aplikacja pyta.',
          'Drzewa genealogiczne: asystent widzi tylko zaznaczone drzewa; nowe drzewa są widoczne.',
          'Pliki nigdy nie przechodzą przez MCP: asystent wskazuje plik na tym komputerze (w folderze użytkownika, danych lub kopii zapasowych), np. skan do dodania, plik do importu lub folder na eksport.',
          'Każda zmiana asystenta pojawia się w „Aktywność”; logi mają filtr „Tylko asystenci AI (MCP)”.',
          'Zgubiony token? „Nowy token” go zastępuje, a stary przestaje działać. Wyłączenie natychmiast unieważnia token.',
          'Adres zawiera port aplikacji, który między uruchomieniami pozostaje taki sam. Jeśli aplikacja na komputer musiała użyć innego, sekcja o tym informuje – asystent potrzebuje wtedy nowego adresu.',
          'Asystent nigdy nie może sam zmienić ustawień asystentów AI.',
        ],
      },
      {
        faq: [
          { q: 'Asystent dostaje „404” lub „MCP jest wyłączone”.', a: 'Zaznacz „Zezwól na asystentów AI” w ustawieniach.' },
          {
            q: 'Asystent dostaje „401” lub „brak tokenu albo błędny token”.',
            a: 'Token został zastąpiony albo MCP w międzyczasie wyłączono. Utwórz nowy token i dodaj serwer ponownie („claude mcp remove cognatio”, potem nowe polecenie).',
          },
          {
            q: 'Brakuje narzędzia albo odpowiada „NOT_ALLOWED”.',
            a: 'Uprawnienie jego obszaru jest za niskie – podnieś je w ustawieniach; w Claude Code „/mcp” ponownie wczyta narzędzia.',
          },
          {
            q: 'Asystent w ogóle nie może się połączyć.',
            a: 'Cognatio musi być uruchomione. Jeśli ustawienia informują o zmianie portu, dodaj serwer ponownie z nowym adresem.',
          },
        ],
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
