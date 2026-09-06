# Skolarkaden

Sex små lärspel för tangentbord eller mikrofon. Träna bokstäver, läsning, uttal och enkel matematik på svenska, engelska och mandarin.

**Öppna `index.html` i Chrome.** Behåll `resources` bredvid HTML-filen. Ingen installation, byggprocess eller webbserver behövs. Om du laddar ned projektet som ZIP: packa upp hela filen först.

All grafik ritas med geometriska former. Ljudeffekterna syntetiseras lokalt, och tangentbordsläget fungerar helt utan internet.

## Spelen

| Spel | Uppdrag |
| --- | --- |
| Stjärnförsvaret | Låt tre lasrar skydda staden från 40 kometer. |
| Stjärnköket | Servera hungriga gäster i 90 sekunder. |
| Ordträdgården | Hjälp alla plantor att blomma. |
| Bikupan | Samla tillräckligt med honung före vintern. |
| Färgballonger | Träffa så många av de 40 förbipasserande som möjligt. |
| Hungrig dinosaurie | Fånga så många av de 40 små figurerna som möjligt. |

Alla övningar kan användas i alla spel. Att byta spel ändrar inte vald övning eller valt språk. Matövningen innehåller 70 svenska matord och väljs precis som övriga övningar.

## Så svarar du

- **Tangentbord:** skriv ett svar och tryck Enter. Enstaka bokstäver och bopomofo skickas direkt. Pågående IME-inmatning väntar tills tecknet är färdigt.
- **Mikrofon:** säg svaren efter varandra. Spelet lyssnar kontinuerligt och skickar kända svar så snart de transkriberas.
- **Paus:** använd pausknappen eller Escape. Att byta fönster eller flik pausar också spelet. Fortsätt återupptar spelet och mikrofonen.

Under spel visas bara svarsfältet under spelplanen; i talläge visas inget svarsfält. Köade och påbörjade uppgifter markeras i själva spelen. Matbilens väntande tallrikar är tomma och står bredvid rätten som lagas.

Svar behandlas i ordning. Upprepningar hoppas över om det inte finns ytterligare lediga mål med samma svar. Högst två olika felsvar får vänta samtidigt. Fel svar kostar arbetstid; inget särskilt ögonblick behöver tajmas.

Tangentbordsfokus hålls i svarsfältet under aktivt spel. Tab och Shift+Tab flyttar inte fokus, och oavsiktliga klick utanför fältet tar inte fokus. Paus- och verktygsknappar går fortfarande att klicka på. Menyer, dialoger, webbläsargenvägar, markörflyttning och IME behåller sina vanliga funktioner.

## Övningar

Svenska och engelska har korta och längre ord. Bokstavsövningen väljer ett slumpmässigt block av tangenter för varje omgång: 3 × 3, 2 × 5 eller en hel bokstavsrad. Svenska använder svensk QWERTY med å, ä och ö. Latinska övningar visar antingen stora eller små bokstäver under hela omgången; båda accepteras som svar.

Matte börjar med addition inom 0–5. Svårigheten höjs gradvis efter lyckade svar och sänks vid upprepade fel, långsammare svar eller för många obesvarade uppgifter. Högsta nivån är addition och subtraktion inom 0–20. Anpassningen återställs varje omgång och påverkar inte poängen.

Mandarin har valbar pinyin-hjälp. Tal jämförs som pinyin utan toner; till exempel kan 是 eller 事 matcha 十. Olika stavelser som `si` och `shi` skiljs åt. I kinesiska teckenövningar kan en transkription som `38` bli två svar, medan `10` hålls ihop. Mattesvar delas inte på det sättet. Bopomofo har tangentkonvertering och en tangenthjälp under **Så spelar du**.

Svenskt tal kan delas upp när tjänsten skriver ihop två eller tre aktuella mål, exempelvis `hundmat`. Detta gäller inte matte. Vanliga engelska homofoner har uttryckliga talalias, exempelvis `see / sea / c`. Tangentbordsläget kräver korrekt stavning.

## Bikupans äng

Blommorna står utspridda på en ny, oregelbunden äng varje omgång. Växterna delar modell med Ordträdgården: fyra stamformer, fem bladformer och sex blomformer kombineras med olika höjd, färg, bredd och antal blommor. Torr jord blir ljusare och plantan slokar, näringsbrist bleker bladverket och ohyra syns som allt fler och större kryp.

De första blommorna öppnar efter ungefär en sekund. En del sommarplantor håller kvar knoppar för en senare höstblomning; avlägsna höstblommor öppnar tidigare så att bina hinner tur och retur. När inga svar finns att ge, kön är tom och alla fem bin är hemma går årstiden fyra gånger fortare. Så snart en blomma öppnar återgår tiden till normal takt. Synliga uppgifters livslängd och pågående flygningar snabbas aldrig upp. Matte behåller sin längre speltid och blomningstid.

Varje leverans efter att kupan blivit full ger en synlig honungsburk. Burkarna staplas bredvid kupan och finns kvar under vinterfirandet. Poängregeln är oförändrad: 100 poäng per leverans. Nektar som fortfarande är ute när vintern börjar räknas inte.

Uppgiftsbubblorna anpassar bredden efter ordet, tecknet och eventuell pinyin i samtliga spel. Bikupan behåller placeringen när en uppgift bara byter köstatus och söker fria platser runt växterna om etiketter annars skulle överlappa.

## Mikrofon

Två tallägen finns:

- **Mikrofon · internet:** webbläsarens taltjänst transkriberar ljudet.
- **Mikrofon · lokalt:** webbläsarens installerade språkpaket transkriberar lokalt. Paketets tillgänglighet beror på webbläsare och språk. Första nedladdningen kräver internet. Ingen automatisk växling till internettjänsten sker.

Appens talläge kräver stöd för `SpeechRecognition.start(audioTrack)` och kontrollerar att Chrome är minst version 135. Mikrofonens godkända grundanslutning återanvänds mellan talavsnitt och pauser. Ett nytt tillstånd kan behövas när sidan öppnas på nytt eller mikrofonen uttryckligen stängts av.

Mikrofonknappen öppnar enhetsval, ljudbehandling, nivåmätare och inspelningstest. Transkriptioner och diagnostik är dolda under den hopfällda delen **Felsökning av tal**. Där kan loggen kopieras; en rapport kan också kopieras från mikrofoninställningarna. Vid ett talfel som stoppar lyssningen pausas spelet med ett felmeddelande och möjlighet att försöka igen.

Logg och rullande testljud sparas bara i minnet. Appen har inga konton, analysverktyg eller egen server. Vald internettaltjänst tar emot ljud för transkribering. Ljudeffekter dämpas när mikrofonen lyssnar. Rekord sparas lokalt i webbläsaren; de befintliga lagringsnycklarna är bevarade vid namnbytet.

## Kod och tester

Klassiska skript används så att `file://` fungerar utan modulladdare, externa bibliotek eller byggsteg. Det interna namnutrymmet `Starlight` är bevarat för kompatibilitet.

| Fil | Ansvar |
| --- | --- |
| `resources/input.js` | Återanvändbar svarskö, text- och talinmatning samt valbar fokusbevakning. |
| `resources/speech.js` | Tidig köning, rättningar, orddelning och deduplicering av tal. |
| `resources/voice.js` | Mikrofonens livscykel och lokala språkpaket. |
| `resources/data.js`, `pinyin.js` | Övningar, ordböcker, matteanpassning och svarsmatchning. |
| `resources/game.js`, `foodtruck.js`, `garden.js`, `beehive.js`, `paint.js`, `dinosaur.js` | Sex separata simuleringar och canvas-renderare. |
| `resources/people.js`, `plants.js`, `sounds.js` | Gemensamma figurer, växter och syntetiska ljud. |
| `resources/app.js` | Menyer, paus, HUD och anslutning av modulerna. |

`AnswerQueue` innehåller `{id, text, source}`. Spelen tar emot kön via konstruktorn och hämtar svar med `take()`. En policy anger aktuella mål, redan påbörjade svar och matchningsregler. `AnswerInput` behöver ett textfält, ett formulär, en mikrofon och en kö; knappar är valfria. Värden kan aktivera fokusbevakning med `retainFocus`, som ska vara sann endast under aktivt spel utan öppna dialoger.

Testerna använder endast Node.js standardbibliotek:

```sh
npm test
```

`npm run dev` startar en valfri lokal granskningsserver med testfixturer. Den behövs inte för att spela. Se `AUDIT.md` för kontroller och kända verifieringsbegränsningar.

## Licens

Spelet omfattas av repositoryts befintliga BSD 2-Clause-licens i `LICENSE`. Den lokala pinyintabellen kommer från [mozillazg/pinyin-data](https://github.com/mozillazg/pinyin-data/tree/923b108dc5d45dee061324c011b478fb649f8b73) och omfattas av MIT-licensen i `resources/pinyin-LICENSE.txt`.
