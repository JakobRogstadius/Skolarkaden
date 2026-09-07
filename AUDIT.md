# Marshmallows: lägereld från natt till morgon

2026-09-07.

Det sjunde spelet har två minuters natt, 2/4/6 samtidiga pinnar och sex sekunders soluppgång. Varje pinne reagerar direkt på sitt svar från den gemensamma kön. För tidiga svar lyfter pinnen för en titt, pausar grillningen och ger ett nytt ord vid återkomsten. Gyllene marshmallows ger 100 poäng. Brända marshmallows antänds om de lämnas kvar, dras ut och kastas tillbaka på marken där de ligger kvar hela omgången. Ingen förlustgräns finns.

Elden blir svagare och grillningen långsammare under natten. Nya pinnar slutar komma när återstående tid inte räcker för grillning. Vid gryningen låses inmatningen, solen stiger, himlen ljusnar och elden slocknar innan resultatet visas. Matte får 30 procent längre natt och grillningstid; avsiktlig väntan på en gyllene marshmallow påverkar inte mattens bedömning av svarstakt eller obesvarad arbetsmängd. De andra spelens bedömning är oförändrad.

Skogen, delade växtmodeller, stjärnor, moln, eldflugor, armar, eld, ångande kopp och campingprylar ritas med Canvas. Ett separat scenfrö gör att rendering och storleksändring inte påverkar spelutfallet. Reducerad rörelse dämpar dekorativ animation. Sprakande ved använder en enda återanvänd ljudslinga; syrsor, antändning och tuppgalning syntetiseras lokalt. Paus, meny, ljud av och avslut stänger lägerljuden. Talläget dämpar dem.

**Verifiering:** `npm test` passerar **18 av 18 testsviter**. Tolv nya kontrollgrupper i `tests/marshmallows.cjs` täcker samtidiga pinnar och svar, exakta grillgränser, nya etiketter och pinyintider, antändning, bestående rester, paus, omstart, köpolicy, alla övningar och exakt slutgräns. 48 fullständiga nätter kombinerar tre svårigheter, svenska/matte, två slumpfrön och fyra svarsstrategier. `tests/camp-sounds.cjs` kontrollerar ljudsignaler, tuppens fem fraser, slingåteranvändning, dämpning och städning av ljudnoder. Appintegration täcker tangentbord, tidiga taltranskriptioner, paus, gryning, resultat, omstart och byte mellan alla sju spel. Pinyintesterna omfattar nu också Marshmallows.

Natt, sex samtidiga pinnar, inspektion och gryning har granskats med den faktiska Canvas-renderaren vid 1100 och 370 pixlars bredd. Etiketter kontrolleras även vid 320 pixlars bredd med långa ord och blandad pinyin. Ingen ny körningsresurs eller webbserver krävs. **Begränsning:** testerna kördes i Node/native Canvas och med DOM-/talstand-ins; fysisk mikrofon, faktisk ljudåtergivning och Chrome på Windows har inte manuellt provats i denna uppdatering.

---

# Fördröjd pinyin i alla sex spel

2026-09-07.

Pinyinvalet är borttaget ur startmenyn och spelens startalternativ. Varje synlig kinesisk uppgift får i stället en egen femsekundersfördröjning. Kundens ankomst, blommans öppning, ett nytt växtbehov eller figurens inträde på spelplanen startar tiden. Pauser räknas inte, och Bikupans accelererade årstid påverkar inte fördröjningen.

En gemensam regel reserverar ett mål per köat svar med samma matchning som spelen, inklusive tonfri pinyin och talalias. Aktiva jobb och redan köade korrekta svar får ingen ny ledtråd. Felsvar döljer inte ledtrådar. Om ett väntande svar rättas till något annat kan den obesvarade uppgiften visa pinyin. Redan visad pinyin behålls tills uppgiften försvinner, så att kömarkeringar inte krymper bubblor. Omstart och återkommande växtbehov får nya fördröjningar.

Bubblorna mäts efter den pinyin som faktiskt visas, var för sig. Bikupans placeringscache uppdateras när en ledtråd tillkommer. Den dolda textmotsvarigheten för hjälpmedel använder samma regel.

**Verifiering:** `npm test` passerar **16 av 16 testsviter**. `tests/pinyin-delay.cjs` täcker gränsen vid fem sekunder, paus, köer, aktiva jobb, homofoner, felsvar/rättningar, dubbletter, entréer från sidan och nederkanten, blomning, nya växtbehov, samtliga renderare, omstart och övriga övningar. Appintegrationstestet kontrollerar borttaget menyval och att hjälpmedelstexten följer fördröjningen. Befintliga trånga layouttester kontrollerar fortfarande synlig pinyin.

Blandade scener med och utan ledtrådar har granskats i native Canvas vid 1100 och 370 pixlars bredd. Testmiljön saknar kinesiska teckensnitt, så teckeninnehållet verifierades som Unicode-strängar i testerna; bildgranskningen gäller pinyin och bubblornas placering. Chrome på Windows har inte manuellt provats i denna uppdatering.

---

# Bikupan: växter, speltempo och tydligare uppgifter

2026-09-06.

- Ängen använder 24 oregelbundet spridda växtplatser med avstånd mellan plantorna. Ett separat slumpfrö gör placeringen stabil vid storleksändringar utan att förbruka spelets slumpföljd. Även fullvuxna växter får marginal till bildkanterna.
- Bikupan och Ordträdgården använder samma växtmodell: fyra stamformer, fem bladformer och sex blomformer samt varierad höjd, bredd, färg och blomantal. Torrhet ger slokande stjälkar och blad samt ljusare jord. Näringsbrist minskar färgmättnaden. Infektion ger fler, större kryp som följer stjälkarna. Tillväxt, knoppar, blomning och död fungerar med samtliga former.
- Första uppgiften kommer efter cirka en sekund. Sommarplantor kan vänta med att blomma till hösten; avlägsna blommor öppnar tidigare för att lämna tid för kö och tur-och-retur-flygning. Besökta blommor lämnar plats för nya plantor. Lagom och Snabb får två respektive tre extra sekunders vanlig blomningstid för den utspridda ängen. Honungsmål, säsongslängder, flyghastighet och poäng är oförändrade.
- Helt tomma perioder går fyra gånger fortare, bara om inga uppgifter finns, kön är tom och alla bin är hemma. Synliga uppgifter och pågående flygningar behåller normal tid. Paus fryser även detta förlopp. Vintern är fortfarande en strikt leveransgräns.
- Bina landar nu på den aktuella växtmodellens blomhuvud i stället för på en fast höjd. Varje leverans efter full kupa lägger till en honungsburk bredvid kupan; burkarna finns kvar under vinterfirandet. Nektar som fortfarande flygs hem räknas inte i förväg.
- Uppgiftsbubblor i samtliga sex spel mäts efter text och eventuell pinyin med mindre sidmarginaler. Trädgårdens verktygsikoner får eget utrymme. Bikupans etiketter undviker varandra, växter och rekvisita när utrymmet tillåter; kömarkeringar ändrar inte deras placering.

**Verifiering:** `npm test` passerar **15 av 15 testsviter**. De sju nya kontrollgrupperna i `tests/beehive-polish.cjs` omfattar spridning, skärmmarginaler, stabil storleksändring, alla växtfamiljer, separata hälsosignaler, tidig vår, höstknoppar, säker tidsacceleration, blomlandning, burkarnas leveransvillkor, vinter/omstart och kompakta etiketter med långa ord och pinyin.

72 kalibrerade omgångar passerar: sex slumpfrön × tre svårigheter × svenska/matte × desktop/smal skärm. En separat simulering med svarstakt efter verklig speltid passerar samma 72 kombinationer med 10 procent felsvar. Första uppgiften kommer efter 1,0–1,1 sekunder i stället för i genomsnitt 6,3–8,8 sekunder i jämförelseversionen. Denna automatiska spelare prioriterar de mest brådskande lediga målen; resultatet är inte ett användartest med barn.

De faktiska Canvas-renderarna har granskats vid 1100 och 370 pixlars bredd samt i separata växt- och hälsoscener. Ingen ny körningsresurs, server eller extern anslutning behövs. **Begränsning:** rendering och speltester kördes i Node/native Canvas; fysisk mikrofon och Chrome på Windows har inte manuellt provats i denna uppdatering.

---

# Skolarkaden: förenklad spelvy och fokus

2026-09-06.

- Appen heter Skolarkaden. Övning och språk behålls när spel väljs, även till och från Stjärnköket. Matordboken har 70 unika svenska ord.
- Spelvyn har ett enda svarsfält under canvas; talläge döljer fältet. Separata kö-, arbetsstatus- och uppgiftspaneler är borttagna. Uppgiftsorden och kömarkeringarna finns kvar i spelen, med en osynlig textmotsvarighet för hjälpmedel.
- Bin, krukor, tomma tallrikar och lediga lasrar har inga nummer. Kundbubblornas extra statusord är borttagna; ansikten, färg och tålamodsstaplar visar tillståndet. Uppgiftsord och pinyin behålls.
- Taldiagnostik finns endast i en hopfälld del av mikrofoninställningarna. Stoppande talfel pausar spelet med ett synligt fel och en återupptagningsknapp.
- Fokusbevakningen är aktiv endast under spel utan dialog. Tab/Shift+Tab och primära pekartryck utanför fältet flyttar inte fokus. Oavsiktlig oskärpa återställs. Menyer, paus, resultat, dialoger, andra fönster, IME och webbläsargenvägar undantas.

`npm test`: **14 av 14 testsviter godkända**. Nya tester täcker fokusets livscykel, knapplösa formulär, dold talinmatning, transkription till kön, synliga nätverksfel och återupptagning, övningsval samt matordbokens integritet. Befintliga simuleringar, adaptiv matte, kinesisk matchning, talrättningar och mikrofonägande ingår.

Canvas-rendering har granskats för matbil, trädgård och bikupa vid 1100 och 370 pixlars bredd med de faktiska renderarna och native Canvas. HTML har kontrollerats för unika ID:n, lokala resurser och rätt placering av fält och dold diagnostik.

**Begränsning:** fokus- och appintegrationstesterna använder DOM- och talstand-ins i Node. De verifierar inte webbläsarens egna standardhandlingar, fysisk mikrofon eller fysisk touchpad. Ingen Chrome-binär fanns tillgänglig och försöket att hämta Chromium misslyckades. Chrome på Windows och fullständig DOM/CSS-rendering har därför inte manuellt verifierats i denna uppdatering.

---

## Tidigare kontroller

# Kontroll av köversionen med Bikupan och nya figurer

2026-09-06. Gäller även Bikupan, viktad figurfördelning och sällsynta besökare samt tidig talinmatning, svarsmatchning, separerad siktning, 40 kometer, lugnare 6/9/12 krukor, tallrikskö, längre ord och tydligare avslut.

## Reproducerade problem och ändringar

Tidigare väntade alla svar på `isFinal`, trots att preliminär text redan visades. Nu skickas ord som matchar aktuella mål direkt. Okända ord före ett känt ord följer med i ordning; en okänd avslutning väntar på slutlig text. Väntande svar kan uppdateras vid en rättning, men påbörjade spelhandlingar tas inte tillbaka. Samma talavsnitt ger inte nya jobb när det rättas eller slutligen bekräftas.

Det fanns konkreta strängmatchningsluckor: `see` och `c` matchade bokstaven C men inte ordet `sea`; matte accepterade inte `02`, `2.0` eller traditionella kinesiska `兩` som 2. Dessa fall ingår nu i regressionstesterna. Talalias är uttryckliga och gäller bara tal, inte fri stavningslikhet. Numerisk parsning kontrollerar hela strängen.

Svenska sammanskrivningar kan delas i två eller tre delar om delarna matchar aktuella mål. Regeln är avstängd för matte. Historik för redan skickade delar förhindrar att en senare sammanskrivning skickar samma del igen.

Lasrarna har nu separata steg för siktning, stabil låsning och skott. Tidigaste låsning är efter 0,4 sekunder; låsningen måste sedan hållas minst 0,28 sekunder. Nästa jobb väntar längre än den gamla laserstrålens livslängd.

## Bikupan och nya figurer

`tests/beehive.cjs`: tio nya kontrollgrupper.

- Exakt kategorifördelning vid 10 000 jämnt fördelade slumputfall: 4 000 män, 4 000 kvinnor, 950 pojkar, 950 flickor och 100 sällsynta figurer. Alla åtta sällsynta typer kan väljas.
- Sällsynt kund ger precis en bonus på 500 poäng efter servering, aldrig bara vid avfärd.
- Fem samtidiga bin reserverar olika blommor; nektar räknas först vid hemkomst.
- Felaktiga svar kostar flygtid, inte honung eller poäng.
- Vissning både före ankomst och under insamling ger tom återresa.
- Gula markeringar följer kö, bokning, talalias och rättningar.
- Paus fryser året, växter, bin och kö. Hösten stoppar nya plantor; matte förlänger året och växternas tid med 40 procent.
- Vintern är en strikt leveransgräns. Ingen förtida vinst; fördröjda resultat skickas exakt en gång.
- 72 kompletta omgångar: sex frön × tre svårigheter × svenska/matte × två skärmbredder. Alla vanns vid kalibrerade svarstakter och 10 procent fel.

Kalibrering mot Stjärnförsvaret kördes med samma svarstakter, 10 procent fel och tolv frön per villkor. På svenska klarade Bikupan Lugn med ett svar var tredje sekund och Lagom med ett svar varannan sekund i samtliga tolv frön. Stjärnförsvaret var hårdare vid samma takt. Sluttestet för Bikupan använder 3/2/1,5 sekunder per svar, respektive 30 procent mer tid per mattesvar. Det är en automatisk spelare som väljer de mest brådskande lediga målen.

De befintliga spelkontrollerna kördes om efter att gemensam växt- och personrendering ändrats.

## Automatiserade kontroller

Porträttalbumet, dess menyknapp, dialog, räknare och lagring är borttagna. Den tidigare lagringsnyckeln rensas vid start. Sällsynta figurer och bonuspoäng finns kvar. JavaScript-syntax och samtliga DOM-referenser kontrollerades efter borttagningen.

`tests/check.cjs`: 26 grupper av spel- och kökontroller.

- FIFO, återlämnade laserjobb, paus och oförändrade projektilbanor.
- Tre samtidiga lasrar, skild siktning/låsning/skott och stilla pipa under strålens uttoning.
- Felaktiga svar kostar enbart arbetstid. En kock, automatisk servering, bestående uppochnedvänd mat och rätt hantering när en kund går under tillagningen.
- Fullständiga 40-träffars vinster och 90-sekunders matomgångar på alla tre svårigheter.
- 6/9/12 krukor och ett gemensamt slumpförsök varje 0,1 sekund: högst en egenskap på en planta försämras. Matte halverar sannolikheten; färdiga plantor minskar den totala belastningen.
- Statistisk kontroll av uppgiftsinflödet vid tre svårigheter, två övningstyper och tre speltider, med 2 000 simulerade sekunder per kombination. Inflödet ligger inom 13 procent från Stjärnförsvarets motsvarande takt före dess träffbonus, efter omedelbar skötsel.
- En separat svårighetsjämförelse med två sekunder mellan svar klarade alla 90 omgångar med det valda lugnare tempot (30 frön per svårighet).
- Verktygsbyte på aktuell position, återanvändning av buret verktyg, återställning av rätt egenskap, funderpaus, tillväxt, blomning, död och paus.
- 45 lyckade trädgårdssimuleringar: 15 frön för vardera 6, 9 och 12 krukor. Testspelaren prioriterar mest akut behov när arbetaren är ledig.
- Fullvuxna plantors marginaler vid tre skärmstorlekar och åtta frön per svårighet; stabil placering vid upprepad storlekskontroll.
- Genomsnittlig hälsa styr ansiktet. Fyra sekunders vinstfirande i trädgården och matbilen innan resultatet, med fryst simulering och svarskö.
- Döda plantor visas i tre sekunder före förlustresultatet. Resultat skickas exakt en gång.
- Gröna markeringar följer väntande svar, aktiv skötsel, homofoner, dubbla svar, rättningar och tömd kö.
- Två separata längre ordlistor, unika ord med 6–12 bokstäver och rätt versal-/gemenhantering i alla spel.
- Fullständiga matteomgångar i samtliga tre spelmotorer med talord som inmatning.

`tests/speech-stream.cjs`: 14 grupper av strömmande tal- och matchningskontroller.

- Omedelbara förväntade preliminära ord; ordning för okända prefix; inget dubbelskick vid upprepade callbacks eller slutlig text.
- Ändrad text, tillfälligt indragna ord, flytt mellan resultatgränser och tomt slutligt resultat.
- Rättning av ett väntande köobjekt, men ingen omskrivning av en redan påbörjad handling.
- Två- och treordssammansättningar på svenska, historik för konsumerade prefix, ett giltigt långt helt ord har företräde, ingen delning på engelska eller i matte.
- Homofoner i ord- och bokstavsövningar; inga sådana stavningsalias i tangentbordsläget.
- Alla tal 0–20 i svenska, engelska och båda kinesiska språkvalen: talord, siffror, ledande nollor och decimalnollor. Även fullbreddssiffror och `兩`.
- Negativa tal, bråk, icke-heltalsdecimaler, extra bokstäver och tal utanför övningsintervallet avvisas.
- Tidiga matematiska talord som senare blir siffror, samlade negativa-/decimalfraser samt bokstavsnamn med mellanslag.

`tests/browser-speech.cjs` och `tests/microphone-ui.cjs` verifierar fortsatt sessionsåterstart, explicit stopp, sena callbacks efter paus, lokalt talläge, nätverksfel, IME, återanvänd mikrofonanslutning, rullande ljudbuffert, byte av ljudbehandling och enhet samt explicit avstängning.

## Kontroller i Chrome-gränssnittet

- De fyra figurkategorierna granskades med tre varianter var, samt alla åtta sällsynta typer i ett separat utvecklingsgalleri.
- Bikupans vårscen, sommaräng med 16 blommande uppgifter och långa svenska ord, gula kömarkeringar, honungsfylld genomskärning, höstlöv och vintersnö granskades visuellt. Vintervinst pausade inmatningen och visade resultatet efter firandet.
- En robotkund serverades genom svarsfältet och Enter. Poängen blev 699 (199 för serveringen och 500 i bonus).

- Tolv spridda krukor med längre svenska ord, fullt utvuxna blommor och 36 samtidiga önskemål på desktop. Ord och kruknummer är läsbara.
- Vinstfirandet startades genom en separat utvecklingsfixture och dess fyra sekunder följdes till avslut.
- Simulerad kontinuerlig taligenkänning i riktiga spelgränssnittet: preliminära `16.0` besvarade `12 + 4`, gav 100 poäng och loggades som `TIDIGT → KÖ` innan något slutligt resultat skickats. Slutliga `16` och en upprepad callback gav ingen ny köpost.
- Tolv matord matades in med Enter. En rätt lagades medan väntande ord visades som numrerade tomma tallrikar både på matbilen och i den större kön under fältet.
- Köade trädgårdsuppgifter och aktiv skötsel kontrollerades i samma gränssnitt: fyra tydligt gröna bubblor och motsvarande uppgiftskort, varav tre väntande och ett aktivt.
- Förlusten visade en brun, inringad planta med kruknummer och orsak medan svarsfältet var inaktiverat och resultatdialogen dold. Resultatet kom efter pausen.
- Matbilens kock visade en uppsträckt vinkande hand och ”Tack för idag!” medan resultatdialogen var dold och inmatningen stoppad. Resultatet visades efter firandet.
- Ingen extern mikrofon användes i dessa tester. Utvecklingsfixturer använder syntetiskt ljud och kontrollerade textförslag; de ingår inte i den levererade ZIP-filen.

## Praktiska begränsningar

Verkliga talmotorers igenkänningsgrad och deras val av preliminära ord kan inte bevisas med simulerade textförslag. Den snabbare inmatningen kan starta ett jobb på ett ord som taltjänsten senare ändrar. Detta är avsiktligt: väntande svar rättas, men spelhistoriken skrivs inte om. Loggen visar transkriptioner och rättningar för fortsatt felsökning.

Gränssnittet granskades via en tillfällig utvecklingsförhandsvisning. Appen har fortfarande bara relativa klassiska skript och lokala resurser och behöver ingen webbserver. Lokala talpaket beror på Chrome och valt språk. Alla källfiler och regressionstester ingår.


## Färgballonger

Det femte spelet återanvänder den befintliga svarskön, talmatchningen och personrenderingen. En separat barnväljare garanterar ett barn på taket utan att ändra sannolikheterna för övriga figurer. Sällsynta fotgängare ger samma enda poäng som alla andra.

`tests/paint.cjs`: 11 grupper av kontroller:

- Enbart barn på taket, med 50/50 pojke/flicka över 10 000 jämnt fördelade urval.
- Rätt svar bokar en person som håller på att lämna bilden; barnet hoppar och landar innan det kastar. Personen stannar vid kanten tills träffen. Ändrad skärmstorlek under hoppet bryter inte träffen.
- Exakt tre fullständiga arga hopp före utgång, bestående färg på kroppen, en enda poäng och en enda räknad avfärd.
- FIFO med en ballong åt gången. Felaktiga svar träffar ingen person, sänker inga poäng och lämnar oberoende färgfläckar på marken.
- Sällsynta figurer ger exakt en poäng. Kömarkeringar följer talalias och rättningar, och ett dubbelt svar kan inte boka samma person igen.
- Paus fryser gång, takhopp, ballongflygning och väntande svar.
- Varje övning kan besvaras, inklusive längre ord, bopomofo och matematiska talord på svenska, engelska och båda mandarinvalen.
- 36 fullständiga omgångar: fyra slumpfrön på tre svårigheter med antingen inga svar, korrekta svar eller bara fel. Alla avslutas med exakt 40 avfärder och positivt avslut, utan någon 41:a fotgängare. Högre svårigheter har större uppmätt folkmängd och kortare omgångar vid passivt spel.
- En sista ballong får landa före avslutet; överblivna köposter hindrar inte resultatet. Resultat skickas en gång efter två sekunders firande. Omstart nollställer poäng och fläckar.
- Åtta samtidiga etiketter kontrolleras under rörelse med långa svenska ord och mandarin med pinyin, vid 320/368/390/640/1000 pixlars bredd och tolv slumpfrön. Etiketterna stannar inom spelplanen utan att överlappa varandra. En upptäckt kollision på smalare ytor rättades genom ordnade etikettplatser.

Alla tidigare spel-, talströmnings- och mikrofonlivscykeltester kördes utan fel efter integrationen. JavaScript-syntax och relativa resursreferenser kontrollerades.

I Chrome-förhandsvisningen granskades femspelsmenyn, den fasta gatan, åtta etiketter med längre ord, färg på arga hoppande personer, markfläckar och barnets takhopp. Ett korrekt ord och ett felord skickades genom det riktiga svarsfältet med Enter: det första gav en poäng och nästa hanterades separat som en miss. Nollpoängsresultatet efter 40 visades korrekt, följt av fungerande ”En gång till”. En separat 368 pixlar bred canvas granskades med åtta läsbara etiketter och noll överlappningar efter rättningen. Inga fel från appens egen adress registrerades i webbläsaren. Utvecklingsfixturer ingår inte i ZIP-filen.


## Direkt bokstavsinmatning, kögräns och visuella rättningar

Bokstavspatrullen och bopomofo skickar tecken direkt från inmatningsfältet. Ord, pinyin och matematik behåller Enter. Delvis färdiga IME-tecken skickas inte. Svarskön ansluts till varje spels lediga uppgifter och behåller högst två väntande svar utan matchning. En uppgift kan täckas av ett väntande svar; extra upprepningar räknas mot felgränsen. Väntande svar omprövas vid ny inmatning, talrättningar, konsumtion och uppdatering av spelstatus. Transkriptionsloggen behåller även överhoppade ord, och samma avvisade talspann skickas inte igen vid upprepade callbacks.

`tests/refinements.cjs`: tio grupper kontrollerar direkt inmatning, inklistring, IME, paus, bibehållen Enter i andra övningar, 1 000 felaktiga svar i en burst, korrekta svar efter full felkö, dubbla svar, försvunna mål, transkriptionsrättningar, deduplicering av avvisat tal och undantag för påbörjade jobb i alla fem spel. Därutöver kontrolleras barnfrisyrer/skägg, sena blommors överlevnad och pensionering efter besök, långsammare böjda biflygningar med fungerande landning, samt ballongrutornas innehållsberoende bredd.

Den gamla kocken med vit mössa har återställts från tidigare källkod, inklusive den befintliga fyra sekunder långa vinkningen. Den extra armen från personrenderingen används inte längre. Kötallrikarna står bredvid den pågående tallriken, med identisk basgeometri och skala 0,8; bara den pågående tallriken har mat. Serverade och bortkastade rätter flyger från tallrikens faktiska nya position. Kastrullen flyttades något uppåt för att lämna köetiketterna fria.

Binas nominella flyghastighet minskades från 0,185 till 0,15 i simuleringens normaliserade mått. Två sidledssvängningar med olika frekvens, individuell fas och mindre fartvariation gör banorna oregelbundna. Svängningarna avtar nära målet. Det kontrollerade testflyget tar över 20 procent längre tid än den tidigare raka flygningen och landar ändå exakt. En äldre kontrolls tidsgräns för fem återvändande bin förlängdes för att motsvara den avsiktligt långsammare flygningen. Befintliga fullständiga bikuperundor klarar fortfarande den tidigare kalibreringen vid tre svårigheter, två skärmbredder och svenska/matte med 10 procent avsiktligt fel.

Blommor som slår ut efter halva året får en livstid som räcker till vintern. Tidiga blommor vissnar enligt samma schema som tidigare. Besökta sena blommor vissnar inom fyra säsongssekunder. Vintern är fortfarande en strikt leveransgräns. Både vanliga och förlängda matteår kontrollerades.

I Chrome-gränssnittet skickades 28 felaktiga bokstäver och en giltig bokstav i samma inmatning utan Enter. Kön innehöll exakt två fel och rätt bokstav, som kocken därefter började laga. Kocken, den höga vita mössan, fyra tomma kötallrikar intill rätten och vinkningen granskades visuellt. Ballongrutorna för A, B, KO och SKOG fick tydligt kortare bredder. En sen höstscen visade kvarvarande blommor och fem aktiva bin med 15 sekunder kvar till vintern. Inga fel från appens egen adress registrerades. Utvecklingsfixturer ingår inte i leveransen.


## Avgränsad uppdatering: dubbletter, bokstäver och adaptiv matte

Endast de fem begärda ändringarna ingår: inga överskjutande dubbletter i kön, åäö i svensk bokstavsträning, borttagna uppläsningsknappar, adaptiv matte inom varje omgång och slumpmässiga tangentblock i latinsk bokstavsträning. Bopomofo behåller sin separata teckenuppsättning.

`tests/practice.cjs` verifierar 13 scenarier: lediga kontra pågående mål; identiska felsvar; talalias, pinyin och olika skrivsätt för tal; rättningar och återställda jobb; sammanhängande tangentblock och täckning av åäö; korrekta uttryck på alla mattenivåer; höjning efter lyckade svar; sänkning vid fel, långsammare svar och obesvarat arbete; skydd mot upprepade sänkningar för samma gamla svåra uppgifter; paus och återställning; köade/pågående uppgifter och inaktiv tid; transkriptionsskurar; integration i alla fem spel; borttagen syntetisk uppläsning. De befintliga dubblettesterna har uppdaterats till det nya kontraktet.

Spelmotorernas befintliga regressionstester, talströmstester, mikrofonlivscykel och simulerade webbläsartal kördes också. Hela matematikomgångar simulerades med snabb korrekt inmatning och med långsammare/felaktiga svar på svårare uttryck. Ingen poängregel har ändrats och ingen mattenivå sparas mellan omgångar. Dessa kontroller använder Node och simulerad inmatning; den här uppdateringen har inte provats med en fysisk mikrofon i Chrome på Windows.


## Kinesiska sifferföljder i tal

Felet reproducerades: transkriptionen `38` blev ett enda svar som varken matchade 三 eller 八. Talbearbetningen delar nu sammanhängande sifferföljder i kinesiska teckenövningar, med `10` som en enhet för 十. Fullbreddssiffror och omgivande skiljetecken behålls. Ursprunglig transkription loggas fortfarande separat. Gemensamma identiteter för siffror, hanzi och pinyin hindrar dubbelskick när transkriptionen ändrar form. Mattetal, pinyin med tonsiffra och decimaltal delas inte i siffror.

`tests/speech-stream.cjs` har 18 godkända kontroller, inklusive fyra nya för sifferföljder och rättningar. `tests/chinese-numbers.cjs` har tio godkända integrationer: fem spel gånger zh-CN/zh-TW. Varje integration skickar 三, börjar utföra dess handling, rättar transkriptionen till 38, sedan 三八 och 38 igen, och verifierar exakt två lyckade handlingar. Befintliga tester för webbläsartal, övningsanpassning och dubblettbegränsning passerar också.


## Tonfri pinyinmatchning för kinesiskt tal

En lokal MIT-licensierad tabell från mozillazg/pinyin-data har lagts till (44 435 tecken; källrevision 923b108dc5d45dee061324c011b478fb649f8b73). Tecknens första angivna mandarinläsning används. Toner tas bort, medan ü och andra fonetiska skillnader behålls. Uppgifternas pinyinledtråd anger det förväntade uttalet. Matchning, tidig köning, transkriptionsrättningar och dubblettkontroll använder samma tonfria nycklar; råtexten ändras inte till pinyin. Tabellen laddas som lokal klassisk JavaScript före data.js. Ingen extern resurs hämtas när spelet körs.

`tests/chinese-pinyin.cjs` har 15 kontroller: homofoner för alla befintliga uppgifter, förenklade och traditionella tecken, numrerade/markerade toner och Unicode-normalisering, negativa fall med skilda stavelser, lu/lü, oförändrad text- och mattematchning, råtext och dubbletter vid rättningar samt fem spel gånger två mandarinval. Dessa spelkontroller skickar 是, därefter 事睡, sedan 10 水 och 十水, och kräver exakt två lyckade handlingar utan missar. Tidigare sifferföljdstester körs också.


## Hungrig dinosaurie

2026-09-06. Ett sjätte fristående spel använder samma svarskö, övningar och figurfördelning. Inmatningsmodulen har inte ändrats. Delad figurrendering har fått frivilliga parametrar för rädsla och skugga; tidigare spel behåller standarduttrycken. Meny, HUD, uppgiftsmarkeringar, resultat och syntetiska ljud är anslutna.

`tests/dinosaur.cjs` verifierar 14 kontrollgrupper: exakt dubbla flykthastigheten i olika riktningar och bildformat; lodrätt överraskningshopp för mål och förbipasserande; flykt och efterföljande vila; samtalsringar och avbrutna samtal; en arbetare och ordnad felhantering; reservation och poäng först efter sväljning; gemensamma kögränser och tonfri kinesisk talmatchning; figurfördelning och samma poäng för alla åtta sällsynta typer; paus under jakt, samtal, hopp och sväljning; fångst vid båda skärmkanterna; alla övningar och talade mattesvar i fyra språkval; avslut och omstart; läsbara, åtskilda etiketter med korta bokstäver, långa ord och pinyin.

Hela omgångar simuleras i 54 kombinationer: tre svårigheter, tre inmatningsstrategier (tystnad, rätta svar och bara felsvar), två bildbredder och tre slumpfrön. Varje omgång ska avslutas exakt en gång med 40 hanterade figurer och utan förlust. Separata kontroller säkerställer att ett nära mål hinner både hoppa och börja fly innan fångsten, och att dinosaurien samt benen i munnen ryms vid skärmkanterna.

`tests/dinosaur-ui.cjs` läser den faktiska HTML-filens skriptordning och kör appen med DOM- och Canvas-ersättningar. Kontrollen omfattar spelval, start, textkö, poängvisning, paus/fortsättning, firande, resultat, omstart, bokstäver utan Enter och byte till vart och ett av de fem tidigare spelen. De tio tidigare testsviterna passerar också.

Canvas-scener på dator- och telefonbredd, rädda ansikten och munanimationen har renderats med @napi-rs/canvas och granskats visuellt. Det är inte ett fullständigt Chrome-test: Chromium kunde inte hämtas i denna miljö. En fysisk mikrofon och Chrome på Windows har inte provats i den här uppdateringen. Inga nya externa körningsberoenden eller nätanrop har införts.


## Dinosaurien: säkra entréer, fler samtal och nya ljud

Entrévalet kontrollerade tidigare varken dinosauriens position eller gångvägen in på planen. Nu väljs entréer från vänster, höger och nederkanten bland de vägar som håller minst 215 skalade figurenheter från dinosauriens skrämselcentrum; själva skrämselradien är fortsatt 110. Kontrollen omfattar både punkten utanför bilden och sträckan in på fältet. Upptagna entréer undantas också, och om ingen entré är säker skjuts ankomsten upp. En ankomst som misslyckas förbrukar ingen av de 40 figurerna. Figurer som kommer underifrån går först uppåt, sedan åt sidan. De kan besvaras när de kommit in i bilden. Rörelsegränserna har anpassats så att tidiga fångster inte flyttar dem uppåt i ett hopp.

Samtalsradien ökade från 100 till 180 figurenheter. Samtalens normala längd är oförändrad, men gränsen för att hinna gå ihop till en ring ger nu utrymme för den längre vägen. Ett nytt giltigt mål ger ett kvadratiskt, raspigt rytande. Skrämselhoppet ger en ljus, darrande skriksekvens. Fångsten ger tre nom-stavelser under tuggningen, före den befintliga klunken. De tre sekvenserna varar cirka 0,46, 0,28 respektive 0,82 sekunder och använder den befintliga volymminskningen vid talinmatning.

Dinosauriesviten passerar nu 18 kontrollgrupper. Nya kontroller omfattar parkerade dinosaurier vid olika kanter, säkra gångsträckor för samtliga föreslagna entréer, alla tre entrériktningar, uppskjuten ankomst, nederkantsinträde utan omedelbar skrämsel eller positionshopp, fångst och normal avfärd underifrån, samtal på det utökade avståndet samt rätt ordning för rytande, skrik, tuggning och poäng. De 54 fullständiga omgångarna passerar. Appens DOM/Canvas-test passerar också; väntan på den medvetet begränsade HUD-uppdateringstakten har gjorts oberoende av bildrutans fas. Ljudens Web Audio-schemaläggning, positiva frekvenser, kvadratvågor, längd och sänkt talvolym har kontrollerats med en ersättningskontext. Nederkantsankomster har granskats i renderade bilder vid 1100 och 370 pixlars bredd. Fysisk ljuduppspelning i Windows Chrome har inte provats här.


## Dinosaurieljud med tydligare röstkaraktär

De tre grova fyrkantstonsekvenserna ersattes med lokal röstsyntes: en tonkälla med övertoner formas av rörliga vokalresonanser, mjuka ljudförlopp och lågmäld andnings-/halsstruktur. Rytandet får låg grundton och ojämn halsklang, skriket får en högre ah-vokal med vibrato, och tuggningen får tre avrundade nom-stavelser med mjuka läppljud. Grundlängderna är 0,74/0,46/0,86 sekunder. Rytande och skrik varierar lite i tonhöjd mellan uppspelningar. De genererade 24 kHz-buffertarna sparas i minnet efter första användningen. De distribueras inte som inspelningar eller ljudresurser och kräver ingen server. Spelregler och ljudhändelser är oförändrade.

`tests/dinosaur-sounds.cjs` kontrollerar verkligt genererade ljuddata: ändliga och nivåbegränsade sampel, mjuk början och slut, tre åtskilda stavelser, längd före sväljningen, återanvändning av buffertar, 23 procents ljudvolym i talläge, liten tonhöjdsvariation och frigörande av uppspelningsnoder. `tests/dinosaur-ui.cjs` passerar också. Kontrollen är programmatisk; de nya ljuden har inte provlyssnats i Windows Chrome här.
