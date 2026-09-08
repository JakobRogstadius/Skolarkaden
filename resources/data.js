(function(root){
  'use strict';
  const SC = root.Starlight = root.Starlight || {};
  SC.normalize = v => String(v ?? '').normalize('NFC').toLowerCase().trim().replace(/[.,!?。，！？]+$/g,'').trim().replace(/\s+/g,' ');
  SC.pinyin = v => SC.normalize(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[1-5]/g,'').replace(/\s/g,'');
  const word = label => ({id:label,label,answer:label,speak:label,hint:'',aliases:[]});
  SC.tonelessPinyinNumber=value=>{
    const marks={'\u0304':1,'\u0301':2,'\u030c':3,'\u0300':4},tone=Array.from(value.normalize('NFD')).find(c=>marks[c]);
    const base=value.normalize('NFD').replace(/[\u0300\u0301\u0304\u030c]/g,'').normalize('NFC');return base+(tone?marks[tone]:5);
  };
  SC.modes={};
  const lesson=(name,lang,items,description,icon='Aa')=>({name,lang,items,description,icon,color:'#c4afff',placeholder:'Skriv svaret…'});
  SC.modes.letters=lesson('Bokstäver','sv-SE',Array.from('abcdefghijklmnopqrstuvwxyzåäö',word),'Träna en grupp tangenter på tangentbordet');
  SC.modes.swedish=lesson('Svenska ord - korta','sv-SE','sol måne hus bil båt bok katt hund ko häst fisk fågel mus boll mat ost ägg mjölk is snö sjö hav skog träd röd blå grön gul vit svart stor liten glad hej ja nej barn mamma pappa bror hand fot ben arm mun näsa öga öra hår tand hals mage rygg huvud stol bord säng dörr tak golv vägg rum kök skola penna pärm väska sko hatt mössa tröja byxa socka jacka regn vind moln gräs löv sten sand jord väg bro tåg buss cykel lek spel sång dans kram vän hem dag natt ljus mörk varm kall'.split(' ').map(word),'100 ord att läsa och skriva');
  SC.modes.swedishLong=lesson('Svenska ord - långa','sv-SE','kaninen fjäril nyckel cykeln moroten tomaten gurkan jordgubbe hallonen potatis fönster dörren gardinen kudden strumpa stövlar regnjacka snögubbe sommaren vintern höstlöv skolgård kompis vänskap kalaset födelsedag stjärna solstråle månsken regnbåge blommor trädgård vattenkanna lekplats skogsmark äpplet apelsin bananen fågelbo utflykt skattkista sagoboken brandstation bibliotek äventyr elefant giraff pingvin delfin hamster lejonet tigern björnen rävarna sköldpadda krokodil nyckelpiga fjärilen gräshoppa myrstack ekorre blåbär lingon körsbär vattenmelon frukost smörgås pannkaka köttbullar spagetti grönsaker choklad yoghurt kastrull tallrik skedarna gaffel servett kylskåp köksbord badrummet tandborste handduk tvättmaskin sovrum skrivbord bokhylla taklampa ficklampa ryggsäck gymnastik bokstav siffror läxboken klassrum läraren suddgummi pennskrin pussel ritpapper'.split(' ').map(word),'100 ord att läsa och skriva');
  SC.modes.english=lesson('Engelska ord - korta','en-US','sun moon star sky cat dog bird fish cow horse fox bear bee tree leaf rain snow sea boat car bus bike book ball home bed hat cup egg milk red blue green big small happy apple pear plum grape peach lemon bread rice soup meat cake water juice spoon fork table chair door floor wall roof room house light dark warm cold hand foot leg arm head face eye ear nose mouth hair tooth boy girl baby mum dad play jump run walk swim sing dance smile grass stone sand farm park class pen bag coat shoe sock dress'.split(' ').map(word),'100 ord att läsa och skriva');
  SC.modes.englishLong=lesson('Engelska ord - långa','en-US','rabbit butterfly rainbow sunshine moonlight starlight flower garden watering kitchen carrot potato tomato cucumber strawberry raspberry pancake breakfast sandwich window curtain pillow blanket bedroom jacket mitten jumper winter summer autumn snowman playground friendship birthday present family animal forest seaside bicycle journey treasure adventure library picture storybook elephant giraffe penguin dolphin crocodile tortoise squirrel ladybird dragonfly grasshopper hedgehog chicken feather whiskers monkey purple yellow orange chocolate broccoli coconut cherry banana lettuce mushroom pumpkin spaghetti yoghurt biscuit cheese dinner supper thirsty hungry delicious saucepan kettle cupboard bathroom toothbrush hairbrush wardrobe bookcase notebook pencil rubber crayon scissors teacher student classroom homework alphabet numbers'.split(' ').map(word),'100 ord att läsa och skriva');
  // Standard Zhuyin layout; ASCII conversion also works with a Swedish keyboard.
  SC.bopomofoKeys=Object.fromEntries(Array.from('1qaz2wsxedcrfv5tgbyhnujm8ik,9ol.0p;/-').map((key,i)=>[key,Array.from('ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ')[i]]));
  SC.modes.bopomofo=lesson('Bopomofo','zh-TW',Object.entries(SC.bopomofoKeys).map(([key,label])=>({...word(label),key,hint:'Tangent '+key.toUpperCase()})),'Träna 37 kinesiska ljudtecken','ㄅ');
  // Cumulative single-character starters, then compounds with a familiar half.
  // Curated lists and readings: dev/mandarin-levels.md. Compound readings derive
  // from phrase-pinyin-data (MIT, copyright 2017 mozillazg); see phrase-pinyin-LICENSE.txt.
  const mandarinLessons=[
    // 30 starter characters.
    [["一","一","yī"],["二","二","èr"],["三","三","sān"],["四","四","sì"],["五","五","wǔ"],["六","六","liù"],["七","七","qī"],["八","八","bā"],["九","九","jiǔ"],["十","十","shí"],["零","零","líng"],["人","人","rén"],["大","大","dà"],["小","小","xiǎo"],["上","上","shàng"],["下","下","xià"],["中","中","zhōng"],["口","口","kǒu"],["手","手","shǒu"],["日","日","rì"],["月","月","yuè"],["山","山","shān"],["水","水","shuǐ"],["火","火","huǒ"],["木","木","mù"],["土","土","tǔ"],["天","天","tiān"],["我","我","wǒ"],["你","你","nǐ"],["好","好","hǎo"]],
    // 50 more single characters.
    [["不","不","bù"],["了","了","le"],["的","的","de"],["是","是","shì"],["有","有","yǒu"],["在","在","zài"],["也","也","yě"],["他","他","tā"],["她","她","tā"],["它","它","tā"],["子","子","zǐ"],["女","女","nǚ"],["男","男","nán"],["爸","爸","bà"],["媽","妈","mā"],["哥","哥","gē"],["姐","姐","jiě"],["弟","弟","dì"],["妹","妹","mèi"],["友","友","yǒu"],["多","多","duō"],["少","少","shǎo"],["幾","几","jǐ"],["這","这","zhè"],["那","那","nà"],["哪","哪","nǎ"],["什","什","shén"],["麼","么","me"],["嗎","吗","ma"],["呢","呢","ne"],["來","来","lái"],["去","去","qù"],["出","出","chū"],["回","回","huí"],["走","走","zǒu"],["吃","吃","chī"],["看","看","kàn"],["要","要","yào"],["用","用","yòng"],["打","打","dǎ"],["今","今","jīn"],["明","明","míng"],["早","早","zǎo"],["年","年","nián"],["白","白","bái"],["耳","耳","ěr"],["目","目","mù"],["牛","牛","niú"],["羊","羊","yáng"],["米","米","mǐ"]],
    // 75 new two-character words; at least one character comes from levels 1–2.
    [["你好","你好","nǐ hǎo"],["大家","大家","dà jiā"],["我們","我们","wǒ men"],["你們","你们","nǐ men"],["他們","他们","tā men"],["她們","她们","tā men"],["爸爸","爸爸","bà ba"],["媽媽","妈妈","mā ma"],["哥哥","哥哥","gē ge"],["姐姐","姐姐","jiě jie"],["弟弟","弟弟","dì di"],["妹妹","妹妹","mèi mei"],["朋友","朋友","péng you"],["家人","家人","jiā rén"],["回家","回家","huí jiā"],["兒子","儿子","ér zi"],["女兒","女儿","nǚ ér"],["小孩","小孩","xiǎo hái"],["老人","老人","lǎo rén"],["今天","今天","jīn tiān"],["明天","明天","míng tiān"],["今年","今年","jīn nián"],["明年","明年","míng nián"],["早上","早上","zǎo shàng"],["上午","上午","shàng wǔ"],["中午","中午","zhōng wǔ"],["下午","下午","xià wǔ"],["晚上","晚上","wǎn shang"],["生日","生日","shēng rì"],["多少","多少","duō shǎo"],["什麼","什么","shén me"],["哪個","哪个","nǎ ge"],["這個","这个","zhè ge"],["那個","那个","nà ge"],["幾個","几个","jǐ gè"],["一半","一半","yí bàn"],["一起","一起","yì qǐ"],["一天","一天","yì tiān"],["中文","中文","zhōng wén"],["大字","大字","dà zì"],["名人","名人","míng rén"],["小心","小心","xiǎo xīn"],["開口","开口","kāi kǒu"],["入口","入口","rù kǒu"],["出口","出口","chū kǒu"],["門口","门口","mén kǒu"],["上車","上车","shàng chē"],["下車","下车","xià chē"],["車子","车子","chē zi"],["看書","看书","kàn shū"],["吃飯","吃饭","chī fàn"],["牛奶","牛奶","niú nǎi"],["白飯","白饭","bái fàn"],["大米","大米","dà mǐ"],["水果","水果","shuǐ guǒ"],["白菜","白菜","bái cài"],["小花","小花","xiǎo huā"],["羊毛","羊毛","yáng máo"],["上衣","上衣","shàng yī"],["耳朵","耳朵","ěr duo"],["目光","目光","mù guāng"],["牛肉","牛肉","niú ròu"],["手指","手指","shǒu zhǐ"],["左手","左手","zuǒ shǒu"],["右手","右手","yòu shǒu"],["大雨","大雨","dà yǔ"],["下雨","下雨","xià yǔ"],["天氣","天气","tiān qì"],["火山","火山","huǒ shān"],["山羊","山羊","shān yáng"],["河水","河水","hé shuǐ"],["海水","海水","hǎi shuǐ"],["大海","大海","dà hǎi"],["白色","白色","bái sè"],["好吃","好吃","hǎo chī"]],
    // 100 new two-character words; at least one character comes from levels 1–3.
    [["名字","名字","míng zi"],["文字","文字","wén zì"],["兒女","儿女","ér nǚ"],["家門","家门","jiā mén"],["家裡","家里","jiā lǐ"],["家長","家长","jiā zhǎng"],["老師","老师","lǎo shī"],["上學","上学","shàng xué"],["下課","下课","xià kè"],["書本","书本","shū běn"],["書包","书包","shū bāo"],["讀書","读书","dú shū"],["寫字","写字","xiě zì"],["圖書","图书","tú shū"],["語文","语文","yǔ wén"],["明白","明白","míng bai"],["不同","不同","bù tóng"],["現在","现在","xiàn zài"],["有時","有时","yǒu shí"],["每天","每天","měi tiān"],["昨天","昨天","zuó tiān"],["前天","前天","qián tiān"],["後天","后天","hòu tiān"],["春天","春天","chūn tiān"],["夏天","夏天","xià tiān"],["秋天","秋天","qiū tiān"],["冬天","冬天","dōng tiān"],["月亮","月亮","yuè liang"],["下雪","下雪","xià xuě"],["大風","大风","dà fēng"],["白雲","白云","bái yún"],["樹木","树木","shù mù"],["花草","花草","huā cǎo"],["花朵","花朵","huā duǒ"],["河流","河流","hé liú"],["海邊","海边","hǎi biān"],["天空","天空","tiān kōng"],["小狗","小狗","xiǎo gǒu"],["小貓","小猫","xiǎo māo"],["小鳥","小鸟","xiǎo niǎo"],["小魚","小鱼","xiǎo yú"],["小馬","小马","xiǎo mǎ"],["小兔","小兔","xiǎo tù"],["小雞","小鸡","xiǎo jī"],["小豬","小猪","xiǎo zhū"],["黃牛","黄牛","huáng niú"],["雞肉","鸡肉","jī ròu"],["米飯","米饭","mǐ fàn"],["白糖","白糖","bái táng"],["喝水","喝水","hē shuǐ"],["開水","开水","kāi shuǐ"],["熱水","热水","rè shuǐ"],["冷水","冷水","lěng shuǐ"],["水杯","水杯","shuǐ bēi"],["杯子","杯子","bēi zi"],["桌子","桌子","zhuō zi"],["椅子","椅子","yǐ zi"],["房子","房子","fáng zi"],["屋子","屋子","wū zi"],["帽子","帽子","mào zi"],["褲子","裤子","kù zi"],["鞋子","鞋子","xié zi"],["葉子","叶子","yè zi"],["袋子","袋子","dài zi"],["鼻子","鼻子","bí zi"],["肚子","肚子","dù zi"],["洗手","洗手","xǐ shǒu"],["洗衣","洗衣","xǐ yī"],["起床","起床","qǐ chuáng"],["上床","上床","shàng chuáng"],["開門","开门","kāi mén"],["關門","关门","guān mén"],["走路","走路","zǒu lù"],["跳水","跳水","tiào shuǐ"],["好看","好看","hǎo kàn"],["好玩","好玩","hǎo wán"],["好笑","好笑","hǎo xiào"],["開心","开心","kāi xīn"],["愛心","爱心","ài xīn"],["放心","放心","fàng xīn"],["小聲","小声","xiǎo shēng"],["大聲","大声","dà shēng"],["午飯","午饭","wǔ fàn"],["晚飯","晚饭","wǎn fàn"],["晚安","晚安","wǎn ān"],["早安","早安","zǎo ān"],["左右","左右","zuǒ yòu"],["出去","出去","chū qù"],["出來","出来","chū lái"],["進來","进来","jìn lái"],["進去","进去","jìn qù"],["回來","回来","huí lai"],["回去","回去","huí qu"],["坐下","坐下","zuò xia"],["站起","站起","zhàn qǐ"],["起立","起立","qǐ lì"],["身上","身上","shēn shàng"],["身子","身子","shēn zi"],["木頭","木头","mù tou"],["點心","点心","diǎn xin"]],
  ];
  SC.mandarinCompoundHints=Object.fromEntries(mandarinLessons.slice(2).flat().flatMap(([trad,simpl,hint])=>[[trad,hint],[simpl,hint]]));
  for(const traditional of [true,false])for(let level=0;level<4;level++){
    const id=traditional?(level?'chineseTrad'+(level+1):'chinese'):'chineseSimpl'+(level+1);
    const items=mandarinLessons.slice(0,level+1).flat().map(pair=>{
      const label=pair[traditional?0:1],hint=pair[2],numbered=hint.split(' ').map(SC.tonelessPinyinNumber),plain=numbered.map(s=>s.slice(0,-1));
      return {...word(label),hint,aliases:[...new Set([hint,hint.replace(/ /g,''),plain.join(' '),plain.join(''),numbered.join(' '),numbered.join('')])]};
    });
    const description=level<2?`${items.length} tecken${level?' · 50 nya':' · tal och grunder'}`:`80 tecken + ${items.length-80} ord`;
    SC.modes[id]={...lesson((traditional?'傳統中文 (trad.) ':'简体中文 (simpl.) ')+(level+1),traditional?'zh-TW':'zh-CN',items,description+' · pinyin efter fem sekunder','字'),type:'chinese'};
  }
  const mathNames=['Matematik 1 (+)','Matematik 2 (+ och -)','Matematik 3 (10-100)','Matematik 4 (x)','Matematik 5 (x och /)','Matematik 6 (ekvationer)'];
  const mathDescriptions=['Addition med talen 0–10','Addition och subtraktion inom 0–20','Addition och subtraktion med talen 10–100','Multiplikationstabellerna 1–10','Multiplikation och division i tabellerna 1–10','Skriv det positiva heltal som x står för'];
  mathNames.forEach((name,i)=>{SC.modes[i?'math'+(i+1):'math']={...lesson(name,'sv-SE',[],mathDescriptions[i],'±'),type:'math',mathLevel:i};});
  SC.isMath=mode=>SC.modes[mode]?.type==='math';
  SC.isChinese=mode=>SC.modes[mode]?.type==='chinese';
  SC.mathLevel=mode=>SC.modes[mode].mathLevel;
  SC.toBopomofo=value=>Array.from(value).map(c=>SC.bopomofoKeys[c.toLowerCase()]||c).join('');
  SC.latinMode=mode=>['letters','swedish','swedishLong','english','englishLong'].includes(mode);
  SC.lessonLabel=(label,mode,uppercase)=>SC.latinMode(mode)?(uppercase?label.toLocaleUpperCase('sv-SE'):label.toLocaleLowerCase('sv-SE')):label;
  // Spoken numbers are aliases; text answers remain decimal integers.
  SC.numberWords = {
    'en-US': {eight:8,eighteen:18,eleven:11,fifteen:15,five:5,four:4,fourteen:14,nine:9,nineteen:19,one:1,seven:7,seventeen:17,six:6,sixteen:16,ten:10,thirteen:13,three:3,twelve:12,twenty:20,two:2,zero:0},
    'sv-SE': {'åtta':8,'arton':18,'elva':11,'ett':1,'en':1,'fem':5,'femton':15,'fjorton':14,'fyra':4,'nio':9,'nitton':19,'noll':0,'sex':6,'sexton':16,'sju':7,'sjutton':17,'tio':10,'tjugo':20,'tolv':12,'tre':3,'tretton':13,'två':2},
    'zh-CN': {'八':8,'十八':18,'十一':11,'十五':15,'五':5,'四':4,'十四':14,'九':9,'十九':19,'一':1,'七':7,'十七':17,'六':6,'十六':16,'十':10,'十三':13,'三':3,'十二':12,'二十':20,'二':2,'两':2,'零':0}
  };
  const englishTens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  const swedishTens=['','','tjugo','trettio','fyrtio','femtio','sextio','sjuttio','åttio','nittio'];
  const originalName=(n,lang)=>Object.keys(SC.numberWords[lang]).find(k=>SC.numberWords[lang][k]===n);
  const englishNumber=n=>n<20?originalName(n,'en-US'):n<100?englishTens[Math.floor(n/10)]+(n%10?' '+englishNumber(n%10):''):englishNumber(Math.floor(n/100))+' hundred'+(n%100?' '+englishNumber(n%100):'');
  const swedishNumber=n=>n<20?originalName(n,'sv-SE'):n<100?swedishTens[Math.floor(n/10)]+(n%10?swedishNumber(n%10):''):(n<200?'':swedishNumber(Math.floor(n/100)))+'hundra'+(n%100?swedishNumber(n%100):'');
  const chineseNumber=n=>n<10?'零一二三四五六七八九'[n]:n<100?(n<20?'':chineseNumber(Math.floor(n/10)))+'十'+(n%10?chineseNumber(n%10):''):chineseNumber(Math.floor(n/100))+'百'+(n%100?(n%100<10?'零':'')+(n%100>=10&&n%100<20?'一':'')+chineseNumber(n%100):'');
  for(let n=21;n<=200;n++){
    const en=englishNumber(n),sv=swedishNumber(n),zh=chineseNumber(n);
    SC.numberWords['en-US'][en]=n;SC.numberWords['en-US'][en.replace(/ /g,'-')]=n;
    if(n>100&&n%100)SC.numberWords['en-US'][en.replace('hundred ','hundred and ')]=n;
    SC.numberWords['sv-SE'][sv]=n;
    SC.numberWords['sv-SE'][sv.replace(/(hundra|tjugo|trettio|fyrtio|femtio|sextio|sjuttio|åttio|nittio)/g,'$1 ').trim()]=n;
    if(n>=100&&n<200){SC.numberWords['sv-SE']['ett'+sv]=n;SC.numberWords['sv-SE']['ett '+sv]=n;SC.numberWords['sv-SE']['ett '+sv.replace(/(hundra|tjugo|trettio|fyrtio|femtio|sextio|sjuttio|åttio|nittio)/g,'$1 ').trim()]=n;}
    SC.numberWords['zh-CN'][zh]=n;
  }
  SC.numberWords['zh-CN']['兩']=2;
  SC.numberWords['zh-TW']=SC.numberWords['zh-CN'];
  SC.numberName = (n,lang) => {
    const words=SC.numberWords[lang]||SC.numberWords['sv-SE'];
    return Object.keys(words).find(k=>words[k]===n)||String(n);
  };
  SC.vocabulary=(mode,lang)=>SC.isMath(mode)?Array.from(SC.mathPool(SC.mathLevel(mode)).keys(),n=>({...word(String(n)),speak:SC.numberName(n,lang),hint:SC.numberName(n,lang)})):SC.modes[mode].items;
  SC.keyboardRows=lang=>lang.startsWith('sv')?['qwertyuiopå','asdfghjklöä','zxcvbnm']:['qwertyuiop','asdfghjkl','zxcvbnm'];
  SC.letterSubset=function(lang,rng=Math.random){
    const rows=SC.keyboardRows(lang),shape=Math.floor(rng()*3),choices=[];
    if(shape===2)choices.push(...rows);
    else{
      const height=shape===0?3:2,width=shape===0?3:5;
      for(let y=0;y<=rows.length-height;y++)for(let x=0;x<=Math.min(...rows.slice(y,y+height).map(row=>row.length))-width;x++)
        choices.push(rows.slice(y,y+height).map(row=>row.slice(x,x+width)).join(''));
    }
    return Array.from(choices[Math.floor(rng()*choices.length)],word);
  };
  // Speech aliases are explicit homophones, never fuzzy spelling guesses.
  SC.speechGroups={'en-US':[['sea','see','c'],['bee','be','b'],['sun','son'],['blue','blew'],['red','read'],['rain','reign','rein'],['flower','flour'],['eye','i'],['right','write','rite'],['night','knight'],['pair','pear'],['new','knew']]};
  SC.letterNames={
    'sv-SE':{a:'a',be:'b',ce:'c',se:'c',de:'d',e:'e',eff:'f',ge:'g',hå:'h',i:'i',ji:'j',kå:'k',ell:'l',emm:'m',enn:'n',o:'o',pe:'p',ku:'q',ärr:'r',ess:'s',te:'t',u:'u',ve:'v','dubbel ve':'w',dubbelve:'w',ex:'x',y:'y',säta:'z','å':'å','ä':'ä','ö':'ö'},
    'en-US':{ay:'a',bee:'b',be:'b',see:'c',sea:'c',dee:'d',ee:'e',eff:'f',gee:'g',aitch:'h',eye:'i',jay:'j',kay:'k',el:'l',em:'m',en:'n',oh:'o',pea:'p',pee:'p',cue:'q',queue:'q',are:'r',ess:'s',tea:'t',tee:'t',you:'u',vee:'v','double you':'w',doubleyou:'w',ex:'x',why:'y',zed:'z',zee:'z'}
  };
  SC.speechNormalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('sv-SE').trim().replace(/^["“”'‘’«»(\[]+|["“”'‘’«»)\],.!?;:。！？、，]+$/gu,'').trim().replace(/\s+/g,' ');
  SC.tonelessPinyin=function(value){
    // Preserve vowels, but accept spaced/joined syllables and per-syllable tones.
    const v=SC.speechNormalize(value).replace(/u:/g,'ü').replace(/v/g,'ü').normalize('NFD').replace(/[\u0300\u0301\u0304\u030c]/g,'').normalize('NFC');
    if(!/^[a-züê0-5]+(?:[ '’]+[a-züê0-5]+)*$/.test(v))return null;
    const key=v.replace(/[0-5 '’]/g,'');return /^[a-züê]+$/.test(key)?key:null;
  };
  SC.chineseSpeechPinyin=function(value){
    let v=SC.speechNormalize(value);
    if(/^\d+$/.test(v)){const n=Number(v);if(n>10)return null;v=SC.numberName(n,'zh-CN');}
    // ASR sometimes mixes digits and Hanzi, e.g. 1天 for 一天.
    if(/[\p{Script=Han}]/u.test(v))v=v.replace(/\d+/g,n=>Number(n)<=10?SC.numberName(Number(n),'zh-CN'):n).replace(/\s/g,'');
    const phrase=SC.mandarinCompoundHints?.[v];if(phrase)return SC.tonelessPinyin(phrase);
    if(/^\p{Script=Han}+$/u.test(v)){
      const readings=Array.from(v,c=>SC.mandarinPinyin[c]);return readings.every(Boolean)?readings.join(''):null;
    }
    return SC.tonelessPinyin(v);
  };
  // Standalone Zhuyin names, not keyboard keys or arbitrary syllable initials.
  // Mandarin ASR normally returns Hanzi, e.g. 波坡摸佛, rather than ㄅㄆㄇㄈ.
  const bopomofoSounds='bo po mo fo de te ne le ge ke he ji qi xi zhi chi shi ri zi ci si yi wu yu a o e ê ai ei ao ou an en ang eng er'.split(' ');
  const bopomofoSymbols=Array.from('ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄧㄨㄩㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦ');
  const bopomofoNames=Object.fromEntries(bopomofoSounds.map((sound,i)=>[sound,bopomofoSymbols[i]]));
  for(const [i,initial] of 'b p m f d t n l g k h j q x zh ch sh r z c s i u ü'.split(' ').entries())bopomofoNames[initial]=bopomofoSymbols[i];
  // ㄝ has no ordinary standalone word. Also accept the familiar ye sound
  // (也 / 耶) as an explicit speech-service fallback; keep e, ê and ei distinct.
  bopomofoNames.ye='ㄝ';
  const bopomofoReadings={'佛':'fo','勒':'le','樂':'le','乐':'le','嗯':'en'};
  SC.bopomofoSpeechSymbol=function(value){
    const v=SC.speechNormalize(value).replace(/[ˉˊˇˋ˙]/g,'');
    if(bopomofoSymbols.includes(v))return v;
    return bopomofoNames[bopomofoReadings[v]||SC.chineseSpeechPinyin(v)]||null;
  };
  SC.spokenNumber=function(value,lang,source='speech'){
    const v=SC.speechNormalize(value),names=SC.numberWords[lang]||{};
    if(Object.hasOwn(names,v))return names[v];
    if(source==='speech'&&lang==='en-US'){
      const aliases={to:2,too:2,for:4,fore:4,ate:8,won:1,oh:0,o:0};if(Object.hasOwn(aliases,v))return aliases[v];
    }
    // Strict whole-string integer parsing: never parseFloat('2cats') or '-2' as 2.
    if(/^\+?\d+(?:[.,]0+)?$/.test(v)){const n=Number(v.replace(',','.'));return Number.isSafeInteger(n)&&n>=0&&n<=200?n:null;}
    const decimal=v.match(/^(.+) (?:point|komma|punkt) (.+)$/);
    if(decimal&&SC.spokenNumber(decimal[2],lang,source)===0)return SC.spokenNumber(decimal[1],lang,source);
    return null;
  };
  SC.speechIdentity=function(value,mode,lang){
    const v=SC.speechNormalize(value);
    if(SC.isMath(mode)){const n=SC.spokenNumber(v,lang);return n===null?v:'#'+n;}
    if(mode==='letters')return SC.letterNames[lang]?.[v]||v;
    if(mode==='bopomofo')return SC.bopomofoSpeechSymbol(v)||v;
    if(SC.isChinese(mode)){
      const item=SC.modes[mode].items.find(item=>item.answer===v),pinyin=item?SC.tonelessPinyin(item.hint):SC.chineseSpeechPinyin(v);return pinyin?'pinyin:'+pinyin:v;
    }
    return SC.speechGroups[lang]?.find(group=>group.includes(v))?.[0]||v;
  };
  SC.matches = function(value,item,mode,lang='sv-SE',source='text'){
    const v=source==='speech'?SC.speechNormalize(value):SC.normalize(value);
    if(!v)return false;
    if(v===SC.normalize(item.answer))return true;
    if(SC.isMath(mode)){const n=SC.spokenNumber(v,lang,source);return n!==null&&String(n)===item.answer;}
    if(SC.isChinese(mode)){
      if(item.aliases?.some(a=>SC.normalize(a)===v))return true;
      if(source==='speech'){
        const heard=SC.chineseSpeechPinyin(v),expected=SC.tonelessPinyin(item.hint)||SC.chineseSpeechPinyin(item.answer);
        return heard!==null&&heard===expected;
      }
      return false;
    }
    if(source==='speech'){
      if(item.speechAliases?.some(a=>SC.speechNormalize(a)===v))return true;
      return SC.speechIdentity(v,mode,lang)===SC.speechIdentity(item.answer,mode,lang);
    }
    return false;
  };
  SC.sameInput=(a,b,mode,lang)=>{
    const identity=e=>{
      if(SC.isMath(mode))return SC.spokenNumber(e.text,lang,e.source)??SC.normalize(e.text);
      if(e.source==='speech')return SC.speechIdentity(e.text,mode,lang);
      if(SC.isChinese(mode)){
        const item=SC.modes[mode].items.find(item=>SC.matches(e.text,item,mode,lang,e.source));
        if(item)return SC.speechIdentity(item.answer,mode,lang);
      }
      return SC.normalize(e.text);
    };
    return identity(a)===identity(b);
  };
  // Fixed lesson pools: selecting an answer first keeps simultaneous targets
  // distinguishable. Arithmetic difficulty never observes answers or game time.
  const mathPools=new Map();
  SC.mathPool=function(level=0){
    if(mathPools.has(level))return mathPools.get(level);
    const pool=new Map(),add=(answer,label)=>{if(!Number.isInteger(answer)||answer<0||answer>200)return;if(!pool.has(answer))pool.set(answer,[]);pool.get(answer).push(label);};
    const op=(a,o,b)=>o==='+'?a+b:o==='−'?a-b:o==='×'?a*b:a/b;
    if(level<=2){
      const low=level===2?10:0,high=level===2?100:level===1?20:10;
      for(let a=low;a<=high;a++)for(let b=low;b<=high;b++){
        if(level!==1||a+b<=20)add(a+b,a+' + '+b);
        if(level>0)add(a-b,a+' − '+b);
      }
    }else if(level<=4){
      for(let a=1;a<=10;a++)for(let b=1;b<=10;b++){
        add(a*b,a+' × '+b);if(level===4)add(a,a*b+' ÷ '+b);
      }
    }else if(level===5){
      const operators=['+','−','×','÷'];
      // One occurrence of x and positive constants make every generated
      // expression strictly monotone in positive x, hence the solution is unique.
      for(let n=1;n<=20;n++)for(let a=1;a<=10;a++)for(const first of operators){
        for(const left of [true,false]){const value=left?op(n,first,a):op(a,first,n);if(value>0&&Number.isInteger(value))add(n,(left?'x':a)+' '+first+' '+(left?a:'x')+' = '+value);}
        for(let b=1;b<=10;b++)for(const second of operators)for(let position=0;position<3;position++){
          const terms=[a,b];terms.splice(position,0,n);
          const [u,v,w]=terms,high=o=>o==='×'||o==='÷';
          const value=!high(first)&&high(second)?op(u,first,op(v,second,w)):op(op(u,first,v),second,w);
          if(!(value>0&&value<=200&&Number.isInteger(value)))continue;
          const labels=[a,b];labels.splice(position,0,'x');add(n,labels[0]+' '+first+' '+labels[1]+' '+second+' '+labels[2]+' = '+value);
        }
      }
    }else throw new RangeError('Unknown mathematics lesson');
    // Keep one-operator equations as common as two-operator equations.
    if(level===5)for(const [n,labels] of pool){const simple=labels.filter(label=>label.split(' = ')[0].split(' ').length===3),complex=labels.filter(label=>label.split(' = ')[0].split(' ').length===5);pool.set(n,[simple,complex]);}
    mathPools.set(level,pool);return pool;
  };
  SC.makeMath=function(answer,rng=Math.random,level=0){
    let choices=SC.mathPool(level).get(Number(answer));
    if(!choices)throw new RangeError('Answer outside selected mathematics lesson');
    if(level===5)choices=choices[rng()<.5?0:1];
    return {...word(String(answer)),label:choices[Math.floor(rng()*choices.length)],mathLevel:level};
  };
  SC.beginPractice=(game,items)=>items||(game.mode==='letters'?SC.letterSubset(game.lang,game.random):SC.vocabulary(game.mode,game.lang));
  SC.practiceItems=game=>game.items;
})(globalThis);
