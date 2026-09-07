# Skolarkaden

Åtta små lärspel för tangentbord eller mikrofon. Träna bokstäver, läsning, uttal och enkel matematik på svenska, engelska och mandarin.

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
| Marshmallows | Ta in gyllene marshmallows innan solen går upp. |
| Äggröra | Bränn spruckna rymdägg och rymdkryp för att skydda besättningen. |

Alla övningar kan användas i alla spel. Att byta spel ändrar inte vald övning eller valt språk. Matövningen innehåller 70 svenska matord och väljs precis som övriga övningar.

## Så svarar du

- **Tangentbord:** skriv ett svar och tryck Enter. Enstaka bokstäver och bopomofo skickas direkt. Pågående IME-inmatning väntar tills tecknet är färdigt.
- **Mikrofon:** säg svaren efter varandra. Spelet lyssnar kontinuerligt och skickar kända svar så snart de transkriberas.
- **Paus:** använd pausknappen eller Escape. Att byta fönster eller flik pausar också spelet. Fortsätt återupptar spelet och mikrofonen.

Under spel visas bara svarsfältet under spelplanen; i talläge visas inget svarsfält. Köade och påbörjade uppgifter markeras i själva spelen. Matbilens väntande tallrikar är tomma och står bredvid rätten som lagas.

Svar behandlas i ordning. Upprepningar hoppas över om det inte finns ytterligare lediga mål med samma svar. Högst två olika felsvar får vänta samtidigt. I övriga spel kostar fel svar arbetstid; de har ingen tidslucka att tajma. I Marshmallows reagerar varje pinne direkt när svaret hämtas ur kön, och marshmallowen ska vara gyllene då.

Tangentbordsfokus hålls i svarsfältet under aktivt spel. Tab och Shift+Tab flyttar inte fokus, och oavsiktliga klick utanför fältet tar inte fokus. Paus- och verktygsknappar går fortfarande att klicka på. Menyer, dialoger, webbläsargenvägar, markörflyttning och IME behåller sina vanliga funktioner.

## Övningar

Svenska och engelska har korta och längre ord. Bokstavsövningen väljer ett slumpmässigt block av tangenter för varje omgång: 3 × 3, 2 × 5 eller en hel bokstavsrad. Svenska använder svensk QWERTY med å, ä och ö. Latinska övningar visar antingen stora eller små bokstäver under hela omgången; båda accepteras som svar.

Matte börjar med addition inom 0–5. Svårigheten höjs gradvis efter lyckade svar och sänks vid upprepade fel, långsammare svar eller för många obesvarade uppgifter. Högsta nivån är addition och subtraktion inom 0–20. Anpassningen återställs varje omgång och påverkar inte poängen.

I kinesiska teckenövningar visas pinyin automatiskt efter fem sekunder om tecknet ännu inte har besvarats. Tiden räknas från att uppgiften syns, och paus räknas inte. Köade och pågående korrekta svar behöver ingen ny ledtråd; en redan visad ledtråd ligger kvar tills uppgiften försvinner. Tal jämförs som pinyin utan toner; till exempel kan 是 eller 事 matcha 十. Olika stavelser som `si` och `shi` skiljs åt. I kinesiska teckenövningar kan en transkription som `38` bli två svar, medan `10` hålls ihop. Mattesvar delas inte på det sättet. Bopomofo har tangentkonvertering och en tangenthjälp under **Så spelar du**.

Svenskt tal kan delas upp när tjänsten skriver ihop två eller tre aktuella mål, exempelvis `hundmat`. Detta gäller inte matte. Vanliga engelska homofoner har uttryckliga talalias, exempelvis `see / sea / c`. Tangentbordsläget kräver korrekt stavning.

## Bikupans äng

Blommorna står utspridda på en ny, oregelbunden äng varje omgång. Växterna delar modell med Ordträdgården: fyra stamformer, fem bladformer och sex blomformer kombineras med olika höjd, färg, bredd och antal blommor. Torr jord blir ljusare och plantan slokar, näringsbrist bleker bladverket och ohyra syns som allt fler och större kryp.

De första blommorna öppnar efter ungefär en sekund. En del sommarplantor håller kvar knoppar för en senare höstblomning; avlägsna höstblommor öppnar tidigare så att bina hinner tur och retur. När inga svar finns att ge, kön är tom och alla fem bin är hemma går årstiden fyra gånger fortare. Så snart en blomma öppnar återgår tiden till normal takt. Synliga uppgifters livslängd och pågående flygningar snabbas aldrig upp. Matte behåller sin längre speltid och blomningstid.

Varje leverans efter att kupan blivit full ger en synlig honungsburk. Burkarna staplas bredvid kupan och finns kvar under vinterfirandet. Poängregeln är oförändrad: 100 poäng per leverans. Nektar som fortfarande är ute när vintern börjar räknas inte.

Uppgiftsbubblorna anpassar bredden efter ordet, tecknet och eventuell pinyin i samtliga spel. Bikupan behåller placeringen när en uppgift bara byter köstatus och söker fria platser runt växterna om etiketter annars skulle överlappa.

## Marshmallows

En omgång varar i två minuter, följt av sex sekunders soluppgång. Svårigheten styr bara antalet samtidiga pinnar: 2, 4 eller 6. Elden svalnar under natten, vilket gör grillningen långsammare. Gyllene marshmallows har en tydlig grön kant runt ordet och ger 100 poäng var. Marshmallowens egen färg och form visar grillningen: först blek och mjuk, sedan gyllene med rostade fläckar, till sist svartnad och sprucken. Etiketterna har mörk bakgrund. Inga grillmätare, färdighalor eller tidsmätare visas. Nya pinnar slutar komma när det inte finns tid att grilla dem före morgonen.

Ett för tidigt svar vrider underarmen och pinnen runt armbågen för en titt och återför pinnen med ett nytt ord. Grillningen står still under denna rörelse. Brända marshmallows kan börja brinna och kastas sedan tillbaka på marken, där de ligger kvar. Felmatchade svar ger en kort frågebubbla och hindrar inte andra pinnar. Omgången kan inte förloras.

Alla övningar fungerar, inklusive bokstäver utan Enter, kontinuerligt tal och fem sekunders fördröjd pinyin. Den gyllene tidsluckan är drygt sju sekunder vid stark eld och blir längre när elden svalnar. Matte förlänger både natten och grillningstiden med 30 procent; avsiktlig väntan på grillningen räknas inte som långsamma mattesvar.

Stjärnor, moln, träd, växter, eldflugor, eld, armar och campingprylar ritas lokalt med Canvas. Växternas storlek följer avståndet i scenen, och förgrundsträden har kraftigare stammar utan lodräta ljusstreck. Sprakande ved, syrsor, antändning och tuppgalning syntetiseras utan inspelningar eller nedladdningar. Eldljudet tonar ned med elden och stängs av vid paus, meny, ljud av eller avslut. Alla nya ljud dämpas vid talinmatning.

## Ordträdgården

Trädgårdsmästaren går med 20 procent av sin tidigare hastighet. Varje planta börjar med oberoende slumpmässiga hälsoavdrag på 10–35 procent för vatten, näring och ohyra, fortfarande på den friska sidan av uppgiftströskeln på 40 procent. Nya behov uppstår därför tidigare. Behovstakten har ökats med 30 procent; färdiga eller döda plantor behåller inte sin andel av nya behov.

En planta kan vissna utan att avsluta omgången. Döda plantor får inga fler uppgifter och kan inte återupplivas; påbörjad skötsel av dem avbryts. Omgången slutar när varje planta antingen blommar eller är död. Resultatet visar båda antalen. Finns minst en blommande planta firas resultatet, annars slutar spelet med en förlust.

## Äggröra

En besättning på sex människor, inklusive spelaren med eldkastare, kommer in i ett mörkt rymdskepp med slemmiga ägg, kåda och våta nät. Vännerna strövar omkring och undersöker rummet. Lugn, Lagom och Utmaning ger 8, 12 respektive 16 ägg. Äggen spricker och kläcks vid olika slumpmässiga tider. Sprickor och öppnade äggflikar visar kläckningen; inga förloppsmätare visas.

Äggets första sprickor gör det till ett mål. Ett kläckt kryp behåller exakt samma mål, ord, köreservation och ledtrådstid. Krypen vandrar omkring, jagar människor i närheten med dubbla flykthastigheten och fäster sig vid ansiktet när de kommer ikapp. Människorna hoppar till och flyr, utom spelaren. En oavbruten attack får människan att falla huvudlös i en blodpöl, varefter krypet fortsätter söka.

Ett rätt svar riktar eldkastaren mot målet och stoppar krypet omedelbart, även om det redan sitter på någon. Ägg och kryp brinner kort och blir grå. Döende kryp hoppar en gång och vänder sig på rygg. Varje förstört ägg eller kryp ger 100 poäng; samma ägg kan inte ge poäng en gång till efter kläckning. Brännande mål kan avsluta sin animation medan nästa svar behandlas.

Spelet vinns när alla ägg och kryp är döda. Det förloras först när hela besättningen, inklusive spelaren, är död. Om spelaren dör fortsätter övriga människor försöka komma undan, och inmatningen stängs av. Överlevande människor gör tre segerhopp vid vinst; kvarvarande kryp gör det vid förlust. Alla övningar, talmatchning, köregler och fördröjd pinyin används. Matte ger 40 procent längre tider och långsammare rörelser, med samma relativa hastigheter och poäng.

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
| `resources/game.js`, `foodtruck.js`, `garden.js`, `beehive.js`, `paint.js`, `dinosaur.js`, `marshmallows.js`, `eggs.js` | Åtta separata simuleringar och canvas-renderare. |
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
