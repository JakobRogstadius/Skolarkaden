# Skolarkaden

Nio små lärspel för tangentbord eller mikrofon. Träna bokstäver, läsning, uttal och enkel matematik på svenska, engelska och mandarin.

**Öppna `index.html` i Chrome.** Behåll `resources` bredvid HTML-filen. Ingen installation, byggprocess eller webbserver behövs. Om du laddar ned projektet som ZIP: packa upp hela filen först.

All grafik ritas med geometriska former. Ljudeffekterna syntetiseras lokalt, och tangentbordsläget fungerar helt utan internet.

Ordövningarna omfattar även svenska och engelska synonymer och motsatser samt tre nivåer av översättning svenska–engelska, med 50 ordpar i varje lista. Varje ordpar har två huvudord och separata listor med godkända alternativa svar i båda riktningarna. Uppgiften visar bara huvudordet. Ett svar visas med mindre text efter fem sekunder. För översättning väljer du svarsspråk med **Översätt till**, även med tangentbord. Konstruktion och underhåll beskrivs i [dev/word-pairs.md](dev/word-pairs.md).

## Gemensamma topplistor

**Topplista** i menyn visar de 10 högsta resultaten för valt spel och dess aktuella poängversion, gemensamt för alla övningar och svårighetsgrader. Kolumnerna visar placering, namn, övning, nivå och poäng i samma versala LED-typsnitt. Namnkolumnen rymmer tio tecken; på smala skärmar går tabellen att rulla i sidled.
Omgångens slut visar samma topplista, med spelarens egen placering på en extra rad om den är lägre än tio. Namnfältet får fokus direkt och behåller text och markör när poängen hämtas. Namnet är valfritt: högst tio bokstäver i versaler, annars ANONYM. Enter i namnfältet sparar; Spela igen och Till menyn sparar innan de fortsätter. Att stänga webbläsaren skickar inget resultat.
Tangentbord och röst delar topplista. Varje spel har en separat intern poängversion.
Varje nytt resultat behåller även omgångens inställningar: spel och version, övning, svårighet, tangentbord/röst, valt talspråk och faktiskt övningsspråk, stora/små bokstäver, den lottade bokstavsuppsättningen, ljud och minskad rörelse. Databasens befintliga poängnycklar ändras inte. Inställningarna kräver den extra kolumnen och Worker-uppdateringen i installationsanvisningen; äldre resultat bevaras med tidigare okända inställningar tomma.
Topplistor och sparande kräver internet. Om sparandet misslyckas stannar slutdialogen kvar så att samma resultat kan skickas igen utan dubbletter.

API:t använder Cloudflare Worker + D1. Installationssteg och underhåll finns i
[cloudflare/README.md](cloudflare/README.md). IP-adresser sparas för framtida moderering
men visas aldrig i topplistan. En gemensam svensk/engelsk namnspärr finns i
`resources/highscore-policy.js` och tillämpas både i spelet och i API:t.

## Meteorregns poäng

Varje meteor börjar på 30 poäng och tappar en poäng per hel sekund från att den syns till att den skjuts, som lägst noll. Kö- och siktetid räknas, men paus gör det inte. Sviten ger +0 för första meteoren, sedan +1, +2 och så vidare upp till +5 från den sjätte. Sviten bryts av ett missat skott eller en förstörd byggnad/kanon. Vid omgångens slut ger varje kvarvarande byggnad och kanon 30 bonuspoäng, även vid förlust. Meteorregn använder poängversion v2.

Varje omgång släpper exakt 40 meteorer. Mellan meteor 1–34 är medelintervallet 5 sekunder på Lätt, 3 på Medel och 1,5 på Svår. Intervallen varierar slumpmässigt ±25 procent. De sista sex meteorerna kommer dubbelt så tätt: medelintervallet är då 2,5, 1,5 respektive 0,75 sekunder. Den första meteoren kommer efter 0,65 sekunder. Antalet samtidiga meteorer begränsar inte släpptakten. Om alla övningens svar redan är aktiva kan ett svar återanvändas.

Omgången avslutas när alla 40 meteorer har skjutits ned eller landat, även om staden förstörs tidigare. Minst en kvarvarande byggnad ger vinst. Räknaren visar avklarade meteorer av 40, inklusive dem som landat; poängen räknar fortfarande träffar och sviter.

## Laga mats poäng

Varje serverad måltid ger 10 poäng plus 0–10 i dricks, avrundat efter gästens återstående tålamod vid servering. Sviten ger +0 för första måltiden, +1 för nästa och upp till +5 från den sjätte. Felaktiga beställningar och gäster som går utan mat bryter sviten. En exotisk gäst ger ytterligare 40 poäng. Ingen slutbonus tillkommer. Laga mat använder poängversion v2. Varje omgång har 40 gäster. Den första finns från start; därefter används Meteorregns slumpmässiga intervall: i medeltal 5/3/1,5 sekunder på Lätt/Medel/Svår, ±25 procent, med halva intervallet för de sista sex gästerna. Gäster fortsätter komma även om fem har gått utan mat. Omgången slutar när alla gäster har lämnat och kocken är klar; färre än fem förlorade gäster ger vinst. Köade uppgifter har grön fyllning, mörkgrön kant och märket KÖ; pågående matlagning är gul.

## Odla blommors poäng

Varje slutförd skötselåtgärd ger 10 poäng. Flera åtgärder av samma typ i följd ger 10, 15, 20 poäng och så vidare utan tak. Byte av åtgärdstyp eller ett felaktigt svar återställer följden. Varje överlevande planta ger 20 poäng vid omgångens slut; blomning ger ingen separat bonus. Poängversionen är v2.

## Spelen

| Spel | Uppdrag |
| --- | --- |
| Meteorregn | Låt tre lasrar skydda staden från 40 kometer. |
| Laga mat | Servera 40 hungriga gäster. |
| Odla blommor | Hjälp alla plantor att blomma. |
| Bikupan | Samla tillräckligt med honung före vintern. |
| Färgballonger | Träffa så många av de 40 förbipasserande som möjligt. |
| Hungrig dinosaurie | Fånga så många av de 40 små figurerna som möjligt. |
| Marshmallows | Ta in gyllene marshmallows innan solen går upp. |
| Äggröra | Bränn spruckna rymdägg och rymdkryp för att skydda besättningen. |
| Städa hemmet | Städa 40 hushållsuppgifter och gör sedan klart det sista tillsammans. |

Alla övningar kan användas i alla spel. Att byta spel ändrar inte vald övning eller valt språk.

## Så svarar du

- **Tangentbord:** skriv ett svar och tryck Enter. Enstaka bokstäver och bopomofo skickas direkt. Pågående IME-inmatning väntar tills tecknet är färdigt.
- **Mikrofon:** säg svaren efter varandra. Spelet lyssnar kontinuerligt och skickar kända svar så snart de transkriberas.
- **Paus:** använd pausknappen eller Escape. Att byta fönster eller flik pausar också spelet. Fortsätt återupptar spelet och mikrofonen.

Under spel visas bara svarsfältet under spelplanen; i talläge visas inget svarsfält. Köade och påbörjade uppgifter markeras i själva spelen. Matbilens väntande tallrikar är tomma och står bredvid rätten som lagas.

Svar behandlas i ordning. Upprepningar hoppas över om det inte finns ytterligare lediga mål med samma svar. Högst två olika felsvar får vänta samtidigt. I övriga spel kostar fel svar arbetstid; de har ingen tidslucka att tajma. I Marshmallows reagerar varje pinne direkt när svaret hämtas ur kön, och marshmallowen ska vara gyllene då.

Tangentbordsfokus hålls i svarsfältet under aktivt spel. Tab och Shift+Tab flyttar inte fokus, och oavsiktliga klick utanför fältet tar inte fokus. Paus- och verktygsknappar går fortfarande att klicka på. Menyer, dialoger, webbläsargenvägar, markörflyttning och IME behåller sina vanliga funktioner.

## Övningar

Svenska och engelska har korta och längre ord. Bokstavsövningen väljer ett slumpmässigt block av tangenter för varje omgång: 3 × 3, 2 × 5 eller en hel bokstavsrad. Svenska använder svensk QWERTY med å, ä och ö. Latinska övningar visar antingen stora eller små bokstäver under hela omgången; båda accepteras som svar.

Varje svensk och engelsk ordlista innehåller 100 olika ord. Korta ord har högst fem bokstäver och långa ord har 6–12. Kinesiska har fyra kumulativa nivåer i traditionell respektive förenklad skrift. Nivå 1 innehåller 30 enkla tecken och nivå 2 lägger till 50 tecken. Nivå 3 och 4 lägger sedan till 75 respektive 100 tvåteckensord, där minst ett tecken redan förekommer på en lägre nivå. Tidigare uppgifter finns kvar: totalt 30, 80, 155 och 255 uppgifter, varav de två högsta nivåerna blandar tecken och ord. Exempel är 牛奶 och 朋友 i nivå 3, 老師 och 書包 i nivå 4. Tangentbord och tal kan ange hela orden, även med pinyin. [Alla uppgifter och urvalsprinciper](dev/mandarin-levels.md). De båda skrifterna har motsvarande tecken och samma pinyin. Val av talspråk ändrar inte tecknens skrift.

Matematiken har åtta fasta nivåer. Nivån ändras aldrig under en omgång och ger inte högre poäng för svårare uppgifter.

| Övning | Uppgifter |
| --- | --- |
| Matematik 1 (+) | Addition med två tal 0–10; svar 0–20. |
| Matematik 2 (+ och −) | Addition och subtraktion inom 0–20; inga negativa svar. |
| Matematik 3 (enkla diagram) | Tvådelade cirkeldiagram med summa 4, eller lika stora delar med jämn summa 2–10. Lodräta/vågräta staplar med storleksförhållande 1, 1,5, 2, 3 eller 4. Prickar och tallinjer med steg 1, 3–4 inre markeringar och ändpunkter inom 0–10. Svar 1–10; diagramtypen väljs bland dem som kan visa det aktuella svaret. |
| Matematik 4 (enkla ekvationer) | Två tal 0–9 till vänster: a + b = 10 + ? eller a + b = 10 − ?. Svar 0–10. |
| Matematik 5 (10–100) | Två tal 10–100 med addition eller subtraktion; svar 0–200. |
| Matematik 6 (×) | Multiplikationstabellerna 1–10. |
| Matematik 7 (× och ÷) | Multiplikation och exakt division i tabellerna 1–10. |
| Matematik 8 (ekvationer) | Lös x med en eller två av +, −, × och ÷, utan parenteser. Vanlig prioriteringsordning gäller. x är ett entydigt positivt heltal 1–20. |

Menyn visar övning, tangentbord/röst, talspråk och svårighet i den ordningen. Talspråk är avstängt vid tangentbordsinmatning. Lätt, Medel och Svår styr spelets utmaning. Matematikens befintliga extra speltid gäller på alla åtta nivåer.

Talade heltal upp till 200 stöds på svenska, engelska och mandarin. Uttryck som ”one hundred twenty three” och ”ett hundra tjugo tre” hålls ihop. I Matematik 5–7 väntar det sista preliminära talet på nästa svar eller slutlig transkription, så att ”one” inte skickas innan det hinner bli ”one hundred”.

I mandarinövningarna visas pinyin ovanför svaret och en svensk betydelse under det efter fem sekunder om uppgiften ännu inte har besvarats. Tecknet eller ordet ligger centrerat mellan ledtrådarna. Rutan växer runt sin tidigare mittpunkt där det finns plats; vid skärmkanter eller trängsel flyttas den för att undvika överlappning. Tiden räknas från att uppgiften syns, och paus räknas inte. Köade och pågående korrekta svar behöver ingen ny ledtråd; en redan visad ledtråd ligger kvar tills uppgiften försvinner. Tal jämförs som pinyin utan toner; till exempel kan 是 eller 事 matcha 十. Olika stavelser som `si` och `shi` skiljs åt. I kinesiska teckenövningar kan en transkription som `38` bli två svar, medan `10` hålls ihop. Mattesvar delas inte på det sättet. Bopomofo har tangentkonvertering och en tangenthjälp under **Så spelar du**. I röstläge jämförs symbolernas uttal med transkriberade kinesiska tecken eller pinyin, till exempel 波 / bo → ㄅ, 佛 / fo → ㄈ och 是 / shi → ㄕ. Toner ignoreras, men olika ljud som si / shi och en / eng hålls isär. För ㄝ accepteras även ye (也 / 耶), eftersom ljudet ê saknar ett vanligt fristående ord för taltjänsten. En följd som 波坡摸佛 blir fyra svar; rättningar till pinyin eller symboler skapar inga extra handlingar. Tangentbordets teckenkonvertering påverkas inte.

Svenskt tal kan delas upp när tjänsten skriver ihop två eller tre aktuella mål, exempelvis `hundmat`. Detta gäller inte matte. Vanliga engelska homofoner har uttryckliga talalias, exempelvis `see / sea / c`. Tangentbordsläget kräver korrekt stavning.

## Hungrig dinosauries poäng

Varje skrämsel ger 5 poäng och varje uppäten person ger 10 poäng. Båda beloppen multipliceras med fem för exotiska personer: 25 respektive 50 poäng. Även förbipasserande som skräms ger poäng, och en ny skrämsel efter återhämtning räknas igen. Ingen svit- eller slutbonus tillkommer. Hungrig dinosaurie använder poängversion v2.

## Färgballongernas poäng

Träffar ger 10, 11, 12 poäng och så vidare i en obruten svit utan tak. En exotisk person ger ytterligare 50 poäng. Felaktiga svar och personer som går förbi utan att träffas bryter sviten; redan målade personer kan lämna utan att bryta den. Ingen slutbonus tillkommer. Färgballonger använder poängversion v2.

## Bikupans äng

Blommorna står utspridda på en ny, oregelbunden äng varje omgång. Växterna delar modell med Odla blommor: fyra stamformer, fem bladformer och sex blomformer kombineras med olika höjd, färg, bredd och antal blommor. Torr jord blir ljusare och plantan slokar, näringsbrist bleker bladverket och ohyra syns som allt fler och större kryp.

De första blommorna öppnar efter ungefär en sekund. En del sommarplantor håller kvar knoppar för en senare höstblomning; avlägsna höstblommor öppnar tidigare så att bina hinner tur och retur. När inga svar finns att ge, kön är tom och alla fem bin är hemma går årstiden fyra gånger fortare. Så snart en blomma öppnar återgår tiden till normal takt. Synliga uppgifters livslängd och pågående flygningar snabbas aldrig upp. Matte behåller sin längre speltid och blomningstid.

Varje leverans efter att kupan blivit full ger en synlig honungsburk. Burkarna staplas bredvid kupan och finns kvar under vinterfirandet. Leveranser till kupan ger 10 poäng och varje överskottsburk ger 15 poäng. När den sista nektarn har samlats in och alla bin är hemma ges en engångsbonus på 1 poäng per återstående hel tiondels sekund innan tiden snabbspolas. Tillfälliga tomrum före nya blommor och vissnade oskördade slutblommor ger ingen tidsbonus. Bikupan använder poängversion v2. Nektar som fortfarande är ute när vintern börjar räknas inte.

Uppgiftsbubblorna anpassar bredden efter ordet, tecknet och eventuell pinyin och svensk betydelse i samtliga spel. Bikupan behåller placeringen när en uppgift bara byter köstatus och söker fria platser runt växterna om etiketter annars skulle överlappa.

## Marshmallows

En omgång innehåller exakt 40 pinnar. När den sista har tagits in eller brunnit upp följer sex sekunders soluppgång med ett tuppgal. Svårigheten styr bara antalet samtidiga pinnar: 2, 4 eller 6. Elden svalnar i takt med att pinnar blir klara. Varje ny pinne behåller sin grillhastighet, så sena pinnar grillas långsammare. Gyllene marshmallows har en tydlig grön kant runt ordet och ger 25–50 poäng beroende på svarstid: 50 mitt i det godkända tidsfönstret och linjärt avtagande till 25 vid kanterna, avrundat till heltal. Varje pinne får hela sitt grillfönster innan soluppgången. Marshmallows använder poängversion v2. Marshmallowens egen färg och form visar grillningen: först blek och mjuk, sedan gyllene med rostade fläckar, till sist svartnad och sprucken. Etiketterna har mörk bakgrund. Inga grillmätare, färdighalor eller tidsmätare visas. Inga fler pinnar kommer efter den fyrtionde. För tidiga svar byter uppgift på samma pinne och räknas inte som en ny pinne.

Ett för tidigt svar vrider underarmen och pinnen runt armbågen för en titt och återför pinnen med ett nytt ord. Grillningen står still under denna rörelse. Brända marshmallows kan börja brinna och kastas sedan tillbaka på marken, där de ligger kvar. Felmatchade svar ger en kort frågebubbla och hindrar inte andra pinnar. Omgången kan inte förloras.

Alla övningar fungerar, inklusive bokstäver utan Enter, kontinuerligt tal och fem sekunders fördröjd pinyin. Den gyllene tidsluckan är drygt sju sekunder vid stark eld och blir längre när elden svalnar. Matte förlänger både natten och grillningstiden med 30 procent.

Stjärnor, moln, träd, växter, eldflugor, eld, armar och campingprylar ritas lokalt med Canvas. Växternas storlek följer avståndet i scenen, och förgrundsträden har kraftigare stammar utan lodräta ljusstreck. Sprakande ved, syrsor, antändning och tuppgalning syntetiseras utan inspelningar eller nedladdningar. Eldljudet tonar ned med elden och stängs av vid paus, meny, ljud av eller avslut. Alla nya ljud dämpas vid talinmatning.

## Odla blommor

Trädgårdsmästaren går med 20 procent av sin tidigare hastighet. Varje planta börjar med oberoende slumpmässiga hälsoavdrag på 10–35 procent för vatten, näring och ohyra, fortfarande på den friska sidan av uppgiftströskeln på 40 procent. Nya behov uppstår därför tidigare. Behovstakten är jämn genom hela omgången: ungefär ett nytt skötselbehov per minut och levande planta. Med 6, 9 respektive 12 plantor på Lätt, Medel och Svår motsvarar det i genomsnitt ett behov var 10:e, 6,7:e respektive 5:e sekund när alla plantor fortfarande växer. Matematik ger dubbelt så lång tid. Slumpen och de inledande hälsoavdragen ger variation; färdiga eller döda plantor behåller inte sin andel av nya behov.

En planta kan vissna utan att avsluta omgången. Döda plantor får inga fler uppgifter och kan inte återupplivas; påbörjad skötsel av dem avbryts. Omgången slutar när varje planta antingen blommar eller är död. Resultatet visar båda antalen. Finns minst en blommande planta firas resultatet, annars slutar spelet med en förlust.

## Städa hemmet

En lägenhet i isometrisk genomskärning har kök/matplats, vardagsrum, föräldrasovrum, barnrum och badrum/tvätt, med en förbindande hall. Två föräldrar och 1, 2 eller 3 barn bor där på Lätt, Medel respektive Svår. Barnrummet har samma antal barnsängar. Familjen använder de gemensamma personmodellerna. Föräldrarna har olika kön i 90 procent av omgångarna och samma kön i 10 procent; spelarföräldern är lika ofta kvinna som man. Barnen går 50 procent snabbare än tidigare, även när de hämtar mat och lämnar disk. De vuxnas hastigheter är oförändrade. Alla går genom dörröppningar och runt möbler; fönsterstorleken ändrar inte vägar eller gångtider.

Familjen använder rummen och lämnar kläder, leksaker, disk, sopor och öppna skåp eller lådor, eller blir hungrig. När högst tre uppgifter finns hoppar alla andra familjemedlemmar över vilopauserna och väljer genast nästa lediga aktivitet. För varje ytterligare uppgift återgår en familjemedlem till slumpmässiga vilopauser; de fortsätter alltså skapa stök, men mindre ofta. Roller roterar när nytt stök uppstår, och redan påbörjade aktiviteter fortsätter. Skåp, lådor och golvplatser reserveras under promenaden, så flera personer inte försöker skapa samma stök. Det finns 16 golvplatser och 10 fasta stationer, inklusive tre separata diskplatser. Minst tio fysiska uppgifter kan uppstå samtidigt om ilskans hjälpinsatser räknas bort.

Nya aktiviteter väljs i den del av hemmet som hittills fått minst stök. Alla fem rum och hallen räknas separat, med en jämn fördelning på ungefär en sjättedel vardera som mål. Även pågående aktiviteter och kommande tvätt och disk räknas in, så att följduppgifter inte tränger undan hallen och sovrummen.

Spelarföräldern springer snabbare när stöket växer: grundhastigheten multipliceras med `1 + 0,7 × antal olösta uppgifter`. Fyra uppgifter ger 3,8 gånger grundhastigheten, sex ger 5,2 gånger. Detta gäller även leveranser av kläder och tvätt, men ändrar inte arbetstid, bonus eller gångvägar. Ansiktsuttrycket blir proportionellt argare fram till sjugränsen. Under familjens hjälpinsats syns ett grått tecknat åskmoln med blixtar ovanför föräldern, som fortsätter hoppa tills alla hjälpare är klara.

Ett svar räcker till en uppgift. Kläder bärs till tvättkorgen; tre plagg skapar en separat tvättuppgift, som bärs till maskinen. Nya plagg i korgen under en pågående tvätt blir kvar. Disk uppstår bara genom två matkedjor: någon hämtar ett mellanmål i kylskåpet, lämnar dörren öppen, äter och bär förpackningen till en köksbänk; eller en hungrig person får mat lagad, hämtar tallriken, äter och bär den smutsiga tallriken till bänken. Matlagning och disk är separata uppgifter. Högar, fulla korgar och fulla soptunnor har en uppgift var. Disk som är på väg försvinner inte om en hög börjar diskas, och avbrutna måltider återupptar rätt gångväg efter en hjälpinsats. Felaktiga svar ger en kort funderandepaus.

Varje uppgift som spelaren gör ger 10 poäng plus en bonus som minskar linjärt från 10 till 0 under de första tio sekunderna. Bonusen avrundas till heltal och låses när rätt svar tas emot, så att gångavstånd och kötid inte sänker den. En liten poängtext ersätter den slutförda uppgiftsbubblan. Matematik ger 50 procent längre brukstid per aktivitet och längre slumpmässiga vilopauser för dem som inte längre är kontinuerligt aktiva, med samma gånghastigheter och bonusregel.

Vid sju olösta uppgifter blir spelarföräldern genast arg och fortsätter hoppa tills det inte finns något stök kvar, utan förvarning. De andra ser rädda ut under hela ilskeinsatsen och springer för att hjälpa till utan poäng. Uppgifter fördelas till närmaste lediga familjemedlem efter gångvägen genom dörröppningarna. En ledig person kan ta över en uppgift från någon som fortfarande går dit om personen kan nå fram snabbare; påbörjad städning och transporter av burna föremål avbryts inte. De kan ta över köade uppgifter: exakt det tillhörande svaret tas då bort, medan andra svar för likadana ord eller homofoner behålls. Även spelarens påbörjade uppgift tas över utan poäng. Om föräldern bär kläder eller tvätt går en hjälpare fram och hämtar dem, och fortsätter till korgen eller maskinen. Hjälparna tar nya uppgifter tills allt är klart, inklusive efterföljande tvätt och delvis fyllda korgar eller soptunnor. Familjen skapar inget nytt vardagsstök under hjälpinsatsen; pågående måltider väntar tills alla hjälpare är klara. Hjälpinsatsen fullföljs även om den fyrtionde uppgiften blir klar under tiden.

Efter 40 avklarade uppgifter, oavsett vem som gjort dem, upphör nytt vardagsstök. Familjen hjälper till tills kvarvarande uppgifter, pågående måltider och delvis fyllda korgar och soptunnor är klara. Spelaren kan fortsätta svara och få poäng under denna avslutning. Därför kan slutantalet bli högre än 40. När hemmet är färdigstädat gör familjen tre glada hopp, medan spelarföräldern lägger sig på golvet precis där hen står, med 40 procent argt ansiktsuttryck. Spelet kan inte förloras. Paus och omstart använder samma funktioner som övriga spel.

Matönskemål fästs vid en tom dukning på bordet. Burna föremål får ingen uppgift förrän de har lagts ned. Etiketterna håller sig på plats när människor passerar; kraftigare linjer med ljus kontur pekar ut stöket och ritas bakom texten. Sängbordets låda syns framför garderoben. Toaletten följer rummets perspektiv, och köksskåp, kylskåp, matstolar och soffans armstöd ritas i rätt ordning. Korta syntetiserade ljud följer skåpdörrar, disk, förpackningar, kläder, leksaker, diskning, matlagning, hunger och arga nedstamp. Ljuden dämpas vid talinmatning.

Kläder, leksaker, disk och matförpackningar är större och färgstarkare. Tvätt och sopor sticker upp tydligare, öppna lådor dras längre ut och disken har synliga matrester. En varm kontur markerar varje stökplats; den blir grön när uppgiften tas om hand. Etiketternas placering undviker själva stöket och ett kort glitter visar när städningen är klar. Minskad rörelse behåller de tydliga markeringarna utan puls eller hopp.

Spelet behåller den lagrade topplistenyckeln `v1:home:<övning>:<svårighet>` under den första intrimningen. Visningen slår samman alla övningar och svårigheter. Familjerutinerna ändrar inte poängnyckeln; lagring av alla omgångsinställningar kräver den gemensamma Worker-uppdateringen ovan.

## Äggröra

En besättning på sex människor, inklusive spelaren med eldkastare, kommer in i ett mörkt rymdskepp med slemmiga ägg, kåda och våta nät. Vännerna strövar omkring och undersöker rummet. Lätt, Medel och Svår ger 10, 16 respektive 21 ägg (cirka 30 procent fler). Äggen står slumpmässigt utspridda med avstånd mellan varandra, utan rutnätsrader. De spricker vid olika slumpmässiga tider och kläcks 15 procent snabbare: tiden från första sprickan till kläckning är 9–15 sekunder delat med 1,15. Sprickor och öppnade äggflikar visar kläckningen; inga förloppsmätare visas.

Äggets första sprickor gör det till ett mål. Ett kläckt kryp behåller exakt samma mål, ord, köreservation och ledtrådstid. Krypen vandrar omkring, jagar människor i närheten med dubbla flykthastigheten och fäster sig vid ansiktet när de kommer ikapp. Människorna hoppar till och flyr, utom spelaren. En oavbruten attack får människan att falla huvudlös i en blodpöl, varefter krypet fortsätter söka.

Ett rätt svar reserverar målet. Spelaren går närmare tills målet är inom eldkastarens räckvidd på 130 skalade pixlar från mynningen, hälften av det tidigare gångavståndet på 260. Först då avfyras elden och stoppar krypet, även om det redan sitter på någon. Målet förblir reserverat under gång och kläckning. Ägg och kryp brinner kort och blir grå. Döende kryp hoppar en gång och vänder sig på rygg. Ett bränt ägg ger 10 poäng och ett bränt kryp 15. Om krypet tuggar på en besättningsmedlem när elden träffar ger det totalt 20 poäng, eller 30 om det tuggar på spelaren. Vid omgångens slut tillkommer 20 poäng per överlevande, inklusive spelaren. Samma mål ger bara poäng en gång. Äggröra använder poängversion v2; övriga spels versioner ändras inte. Brännande mål kan avsluta sin animation medan nästa svar behandlas.

Spelet vinns när alla ägg och kryp är döda. Det förloras först när hela besättningen, inklusive spelaren, är död. Om spelaren dör fortsätter övriga människor försöka komma undan, och inmatningen stängs av. Överlevande människor gör tre segerhopp vid vinst; kvarvarande kryp gör det vid förlust. Alla övningar, talmatchning, köregler och fördröjd pinyin används. Matte ger 40 procent längre tider och långsammare rörelser, med samma relativa hastigheter och poäng.

## Mikrofon

Röstläget använder alltid webbläsarens taltjänst över internet (`processLocally = false`). Lokala språkpaket och valet av talmotor är borttagna.

Appens talläge kräver stöd för `SpeechRecognition.start(audioTrack)` och kontrollerar att Chrome är minst version 135. Mikrofonens godkända grundanslutning återanvänds mellan talavsnitt och pauser. Ett nytt tillstånd kan behövas när sidan öppnas på nytt eller mikrofonen uttryckligen stängts av.

För bokstäver, korta svenska/engelska ord, bopomofo och mandarinövningar där flertalet svar är enstaka tecken begär appen `noiseSuppression: false`. Samma inställning används för de korta talsvaren (0–20) i Matematik 1–4 och 8. Ekodämpning och automatisk nivå behålls om ljudbehandling är påslagen. Övriga övningar återgår till normal brusreducering. Inställningen tillämpas före taligenkänning, även när mikrofonen återanvänds; enhetsvalet och användarens avstängning av all ljudbehandling bevaras. Sessionsloggen visar ljudspårets faktiska inställningar, eftersom enheter kan ignorera önskemålet.

Detta är en möjlig förbättring för korta, svaga ljud, inte en verifierad lösning på igenkänningsproblemen. [Media Capture API](https://w3c.github.io/mediacapture-main/#dom-mediatrackconstraintset-noisesuppression) styr mikrofonens brusreducering; [Web Speech API](https://webaudio.github.io/web-speech-api/#speechreco-attributes) har ingen inställning för taldetekteringens känslighet eller minsta yttrandelängd. Kontinuerlig lyssning och preliminära resultat är redan aktiverade.

Mikrofonknappen öppnar enhetsval, ljudbehandling, nivåmätare och inspelningstest. Transkriptioner och diagnostik är dolda under den hopfällda delen **Felsökning av tal**. Där kan loggen kopieras; en rapport kan också kopieras från mikrofoninställningarna. Vid ett talfel som stoppar lyssningen pausas spelet med ett felmeddelande och möjlighet att försöka igen.

Logg och rullande testljud sparas bara i minnet. Appen har inga konton, analysverktyg eller egen server. Vald internettaltjänst tar emot ljud för transkribering. Ljudeffekter dämpas när mikrofonen lyssnar. Rekord sparas lokalt i webbläsaren; de befintliga lagringsnycklarna är bevarade vid namnbytet.

## Kod och tester

Klassiska skript används så att `file://` fungerar utan modulladdare, externa bibliotek eller byggsteg. Det interna namnutrymmet `Starlight` är bevarat för kompatibilitet.

| Fil | Ansvar |
| --- | --- |
| `resources/input.js` | Återanvändbar svarskö, text- och talinmatning samt valbar fokusbevakning. |
| `resources/speech.js` | Tidig köning, rättningar, orddelning och deduplicering av tal. |
| `resources/voice.js` | Mikrofonens livscykel. |
| `resources/data.js`, `pinyin.js` | Övningar, ordböcker, fasta matematiknivåer och svarsmatchning. |
| `resources/game.js`, `foodtruck.js`, `garden.js`, `beehive.js`, `paint.js`, `dinosaur.js`, `marshmallows.js`, `eggs.js`, `home.js`, `home-renderer.js` | Nio separata simuleringar och canvas-renderare. |
| `resources/people.js`, `plants.js`, `sounds.js` | Gemensamma figurer, växter och syntetiska ljud. |
| `resources/app.js` | Menyer, paus, HUD och anslutning av modulerna. |

`AnswerQueue` innehåller `{id, text, source}`. Spelen tar emot kön via konstruktorn och hämtar svar med `take()`. En policy anger aktuella mål, redan påbörjade svar och matchningsregler. `AnswerInput` behöver ett textfält, ett formulär, en mikrofon och en kö; knappar är valfria. Värden kan aktivera fokusbevakning med `retainFocus`, som ska vara sann endast under aktivt spel utan öppna dialoger.

Testerna använder endast Node.js standardbibliotek (Node 22.13+ för SQLite-testet):

```sh
npm test
```

Efter ändringar i `resources`: kör `npm run assets` och checka in den uppdaterade `index.html` tillsammans med filerna. Skript och stilmallar får innehållsbaserade versionsnycklar så att webbläsaren hämtar rätt version efter en uppdatering. `npm test` kontrollerar att nycklarna är aktuella. Spelens poängversioner påverkas inte.

`npm run dev` startar en valfri lokal granskningsserver med testfixturer. Den behövs inte för att spela. Se `AUDIT.md` för kontroller och kända verifieringsbegränsningar.

## Licens

Spelet omfattas av repositoryts befintliga BSD 2-Clause-licens i `LICENSE`. Den lokala pinyintabellen kommer från [mozillazg/pinyin-data](https://github.com/mozillazg/pinyin-data/tree/923b108dc5d45dee061324c011b478fb649f8b73) och omfattas av MIT-licensen i `resources/pinyin-LICENSE.txt`.

Slutförda uppgifter ersätts kort av en diskret text med det faktiskt tilldelade antalet poäng (”N poäng”), som tonar bort efter cirka 1,35 sekunder. Texten följer respektive spels färgskala och pausar tillsammans med spelet. Skrämselpoäng visas intill den fortfarande aktiva uppgiften. Poängregler och spelversioner påverkas inte.
