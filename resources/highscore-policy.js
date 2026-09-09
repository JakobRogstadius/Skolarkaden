/* Shared by the browser and the generated Cloudflare Worker. Edit here, then
   run node cloudflare/build.cjs. This list is deliberately not shown in the UI. */
(function(root){
'use strict';
// Bump only the affected game's version when its scoring/rules change.
// Home stays on v1 during its initial tuning, by the owner's decision.
const versions=Object.freeze({city:'v2',food:'v2',garden:'v2',hive:'v2',paint:'v2',dinosaur:'v2',marshmallows:'v2',eggs:'v2',home:'v1'});
const mathExercises=Object.freeze(['math-addition','math-diagrams','math-addition-subtraction','math-simple-equations','math-large-numbers','math-multiplication','math-multiplication-division','math-equations']);
// Longer distinctive strings also match inside a name (including separated or
// simple leetspeak spellings). Short/ambiguous words only match complete tokens.
const substrings=`
fuck fucking fucker fuckers motherfuck motherfucker motherfucking clusterfuck
fuckface fuckhead fuckoff fuckyou fuckwit fucktard fuckboy fucknut
shithead shitface shitbag shitstain shitshow bullshit horseshit dipshit dumbshit
jackshit batshit asshat asshole arsehole asswipe assface dumbass jackass badarse
bitchface bitchass sonofabitch cockhead cocksucker cockface dickhead dickface
dickwad dickweed dickshit dickpic dickless pisshead pissface pissflap piss off
wanker wankstain wankface twatface twatwaffle douchebag douchecanoe scumbag
slutface whorehouse manwhore cumshot cumface cumdump cumslut cumstain
blowjob handjob rimjob deepthroat gangbang gangrape bukkake hentai
pornhub pornhub xxxporn hardcoreporn childporn kiddieporn sexvideo sextape
analrape buttplug buttsex analfist analfuck titfuck pussylick pussyeater
penis vagina clitoris testicle scrotum foreskin masturbation masturbate
orgasm ejaculation ejaculate erection dildo vibrator fellatio cunnilingus
pedophile paedophile pedophil paedophil necrophil zoophil bestiality
retarded retardation faggot fagotry nigga nigger chinkface whitepower
heilhitler siegheil hitler naziwhite killjews gasjews gas the jews
kill yourself kysyourself killallblacks rapevictim rapeyou schoolshooter
knulla knull knulled knullad knullare knullande knullat knullkompis
fitta fittor fittig fittans fittnylle fittunge fittskalle fittslick
kukhuvud kuksug kukhora kuken kukar kukjävel kukjavel kukfanskap
horunge horungar horjävel horjavel horhus horbock horfitta horaktig
skitstövel skitstovel skithög skithog skitunge skitjävel skitjavel skitfan
skitstövlar skitstovlar skitnödig skitnodig skitsnack skitansikte
rövknull rovknull rövhål rovhal rövslick rovslick rövskägg rovskagg
rövhuvud rovhuvud rövunge rovunge arsle arsel arselhål arselhal
helvete helvetes jävlar javlar jävla javla jävel javel jävlig javlig
jävul javul fanskap fanjävel fanjavel förbannad forbannad förbannat forbannat
runka runkar runkare runkig avsug avsugning ollon ollad ollning
sperma pungsvett pungkul pungpåse pungpase könsorgan konsorgan
knullfilm porrfilm porrhora porrstjärna porrstjarna barnporr
våldtäkt valdtakt våldta valdta våldtagen valdtagen våldtäktsman valdtaktsman
pedofil pedofili nekrofil zoofil tidelag knulla barn mörda morda
bögjävel bogjavel bögfan bogfan bögäckel bogackel bögunge bogunge
negerjävel negerjavel svartskalle blattejävel blattejavel blattehora
sieg heil heil hitler döda judar doda judar döda bögar doda bogar
ta livet av dig häng dig hang dig skjut dig döda dig doda dig
`.trim().split(/\n/).flatMap(line=>line.trim().split(/\s+/)).filter(Boolean);
// Phrases are separate entries so their individual words aren't overblocked.
const phrases=['piss off','gas the jews','kill yourself','knulla barn','sieg heil',
  'heil hitler','döda judar','döda bögar','ta livet av dig','häng dig','skjut dig','döda dig'];
const tokens=`ass arse shit piss crap bitch slut whore cock dick pussy cunt twat
fag homo retard nazi porn porno sex anal cum tits boob boobs titty titties
kuk röv rov bög bog hora horor fan satan skit bajs piss kiss porr sex
snopp snippa snoppis bröst brost blatte neger mongo cp`;
const normalize=value=>String(value).toLowerCase().normalize('NFKD')
  .replace(/\p{M}/gu,'').replace(/[013457@$!]/g,c=>({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','@':'a','$':'s','!':'i'}[c]));
const compact=value=>normalize(value).replace(/[^a-z]/g,'');
// Exclude phrase components from the substring list: e.g. ordinary names can
// contain "dig", "barn", "off", "the" or "heil" without being abusive.
const phraseParts=new Set(phrases.flatMap(p=>normalize(p).split(/\s+/)));
const fragments=[...new Set([...substrings.filter(s=>!phraseParts.has(normalize(s))),...phrases].map(compact))].filter(s=>s.length>=4);
const words=new Set(tokens.split(/\s+/).map(normalize));
function isBannedName(value){
  const normalized=normalize(value),joined=compact(value);
  return fragments.some(fragment=>joined.includes(fragment)) ||
    normalized.split(/[^a-z]+/).some(token=>words.has(token)) || words.has(joined);
}
root.SkolarkadenHighscorePolicy=Object.freeze({versions,mathExercises,isBannedName});
})(globalThis);
