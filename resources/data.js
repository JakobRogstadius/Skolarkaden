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
  // Paired scripts with an explicit teaching pronunciation. Pinyin comes from
  // the same pinned, MIT-licensed pinyin-data source as resources/pinyin.js.
  const characters=[
    [["一","一","yī"],["二","二","èr"],["三","三","sān"],["四","四","sì"],["五","五","wǔ"],["六","六","liù"],["七","七","qī"],["八","八","bā"],["九","九","jiǔ"],["十","十","shí"],["人","人","rén"],["山","山","shān"],["水","水","shuǐ"],["火","火","huǒ"],["日","日","rì"],["月","月","yuè"],["大","大","dà"],["小","小","xiǎo"],["口","口","kǒu"],["手","手","shǒu"],["上","上","shàng"],["下","下","xià"],["左","左","zuǒ"],["右","右","yòu"],["中","中","zhōng"],["前","前","qián"],["後","后","hòu"],["裡","里","lǐ"],["外","外","wài"],["東","东","dōng"],["西","西","xī"],["南","南","nán"],["北","北","běi"],["天","天","tiān"],["土","土","tǔ"],["木","木","mù"],["金","金","jīn"],["石","石","shí"],["田","田","tián"],["雨","雨","yǔ"],["雪","雪","xuě"],["風","风","fēng"],["雲","云","yún"],["花","花","huā"],["草","草","cǎo"],["樹","树","shù"],["葉","叶","yè"],["林","林","lín"],["森","森","sēn"],["河","河","hé"],["海","海","hǎi"],["湖","湖","hú"],["江","江","jiāng"],["牛","牛","niú"],["羊","羊","yáng"],["馬","马","mǎ"],["鳥","鸟","niǎo"],["魚","鱼","yú"],["蟲","虫","chóng"],["狗","狗","gǒu"],["貓","猫","māo"],["兔","兔","tù"],["雞","鸡","jī"],["鴨","鸭","yā"],["鵝","鹅","é"],["虎","虎","hǔ"],["龍","龙","lóng"],["象","象","xiàng"],["熊","熊","xióng"],["鹿","鹿","lù"],["鼠","鼠","shǔ"],["猴","猴","hóu"],["豬","猪","zhū"],["爸","爸","bà"],["媽","妈","mā"],["哥","哥","gē"],["姐","姐","jiě"],["弟","弟","dì"],["妹","妹","mèi"],["兒","儿","ér"],["女","女","nǚ"],["男","男","nán"],["子","子","zi"],["父","父","fù"],["母","母","mǔ"],["我","我","wǒ"],["你","你","nǐ"],["他","他","tā"],["她","她","tā"],["它","它","tā"],["們","们","men"],["自","自","zì"],["己","己","jǐ"],["誰","谁","shuí"],["什","什","shén"],["麼","么","me"],["哪","哪","nǎ"],["這","这","zhè"],["那","那","nà"],["多","多","duō"]],
    [["少","少","shǎo"],["幾","几","jǐ"],["百","百","bǎi"],["千","千","qiān"],["萬","万","wàn"],["零","零","líng"],["個","个","gè"],["隻","只","zhī"],["本","本","běn"],["張","张","zhāng"],["條","条","tiáo"],["雙","双","shuāng"],["頭","头","tóu"],["歲","岁","suì"],["年","年","nián"],["今","今","jīn"],["明","明","míng"],["昨","昨","zuó"],["早","早","zǎo"],["晚","晚","wǎn"],["午","午","wǔ"],["時","时","shí"],["間","间","jiān"],["分","分","fēn"],["秒","秒","miǎo"],["春","春","chūn"],["夏","夏","xià"],["秋","秋","qiū"],["冬","冬","dōng"],["星","星","xīng"],["期","期","qī"],["生","生","shēng"],["現","现","xiàn"],["在","在","zài"],["過","过","guò"],["去","去","qù"],["以","以","yǐ"],["眼","眼","yǎn"],["耳","耳","ěr"],["鼻","鼻","bí"],["舌","舌","shé"],["牙","牙","yá"],["齒","齿","chǐ"],["腳","脚","jiǎo"],["足","足","zú"],["腿","腿","tuǐ"],["身","身","shēn"],["心","心","xīn"],["毛","毛","máo"],["皮","皮","pí"],["臉","脸","liǎn"],["髮","发","fà"],["脖","脖","bó"],["背","背","bèi"],["肚","肚","dù"],["血","血","xuè"],["骨","骨","gǔ"],["體","体","tǐ"],["白","白","bái"],["黑","黑","hēi"],["紅","红","hóng"],["黃","黄","huáng"],["藍","蓝","lán"],["綠","绿","lǜ"],["青","青","qīng"],["紫","紫","zǐ"],["色","色","sè"],["光","光","guāng"],["亮","亮","liàng"],["暗","暗","àn"],["圓","圆","yuán"],["方","方","fāng"],["長","长","cháng"],["短","短","duǎn"],["高","高","gāo"],["低","低","dī"],["胖","胖","pàng"],["瘦","瘦","shòu"],["新","新","xīn"],["舊","旧","jiù"],["冷","冷","lěng"],["熱","热","rè"],["乾","干","gān"],["濕","湿","shī"],["好","好","hǎo"],["壞","坏","huài"],["快","快","kuài"],["慢","慢","màn"],["開","开","kāi"],["關","关","guān"],["進","进","jìn"],["出","出","chū"],["回","回","huí"],["來","来","lái"],["到","到","dào"],["走","走","zǒu"],["跑","跑","pǎo"],["跳","跳","tiào"],["坐","坐","zuò"],["站","站","zhàn"]],
    [["睡","睡","shuì"],["醒","醒","xǐng"],["吃","吃","chī"],["喝","喝","hē"],["看","看","kàn"],["聽","听","tīng"],["說","说","shuō"],["讀","读","dú"],["寫","写","xiě"],["畫","画","huà"],["唱","唱","chàng"],["笑","笑","xiào"],["哭","哭","kū"],["想","想","xiǎng"],["知","知","zhī"],["道","道","dào"],["會","会","huì"],["能","能","néng"],["要","要","yào"],["有","有","yǒu"],["無","无","wú"],["是","是","shì"],["的","的","de"],["不","不","bù"],["也","也","yě"],["很","很","hěn"],["都","都","dōu"],["和","和","hé"],["與","与","yǔ"],["還","还","hái"],["再","再","zài"],["就","就","jiù"],["才","才","cái"],["家","家","jiā"],["房","房","fáng"],["屋","屋","wū"],["門","门","mén"],["窗","窗","chuāng"],["床","床","chuáng"],["桌","桌","zhuō"],["椅","椅","yǐ"],["燈","灯","dēng"],["車","车","chē"],["船","船","chuán"],["飛","飞","fēi"],["機","机","jī"],["路","路","lù"],["街","街","jiē"],["店","店","diàn"],["校","校","xiào"],["書","书","shū"],["筆","笔","bǐ"],["紙","纸","zhǐ"],["字","字","zì"],["文","文","wén"],["語","语","yǔ"],["話","话","huà"],["名","名","míng"],["學","学","xué"],["老","老","lǎo"],["師","师","shī"],["友","友","yǒu"],["朋","朋","péng"],["同","同","tóng"],["班","班","bān"],["課","课","kè"],["習","习","xí"],["題","题","tí"],["問","问","wèn"],["答","答","dá"],["圖","图","tú"],["音","音","yīn"],["樂","乐","lè"],["歌","歌","gē"],["故","故","gù"],["事","事","shì"],["包","包","bāo"],["衣","衣","yī"],["褲","裤","kù"],["裙","裙","qún"],["鞋","鞋","xié"],["襪","袜","wà"],["帽","帽","mào"],["巾","巾","jīn"],["杯","杯","bēi"],["碗","碗","wǎn"],["盤","盘","pán"],["刀","刀","dāo"],["叉","叉","chā"],["勺","勺","sháo"],["筷","筷","kuài"],["鍋","锅","guō"],["飯","饭","fàn"],["米","米","mǐ"],["麵","面","miàn"],["肉","肉","ròu"],["蛋","蛋","dàn"],["奶","奶","nǎi"],["茶","茶","chá"],["湯","汤","tāng"]],
    [["油","油","yóu"],["鹽","盐","yán"],["糖","糖","táng"],["菜","菜","cài"],["瓜","瓜","guā"],["果","果","guǒ"],["桃","桃","táo"],["李","李","lǐ"],["梨","梨","lí"],["棗","枣","zǎo"],["豆","豆","dòu"],["麥","麦","mài"],["玉","玉","yù"],["竹","竹","zhú"],["蘋","苹","píng"],["香","香","xiāng"],["蕉","蕉","jiāo"],["葡","葡","pú"],["萄","萄","táo"],["橘","橘","jú"],["檸","柠","níng"],["檬","檬","méng"],["莓","莓","méi"],["愛","爱","ài"],["喜","喜","xǐ"],["歡","欢","huān"],["謝","谢","xiè"],["請","请","qǐng"],["對","对","duì"],["起","起","qǐ"],["沒","没","méi"],["幫","帮","bāng"],["給","给","gěi"],["拿","拿","ná"],["放","放","fàng"],["找","找","zhǎo"],["帶","带","dài"],["買","买","mǎi"],["賣","卖","mài"],["送","送","sòng"],["用","用","yòng"],["做","做","zuò"],["玩","玩","wán"],["洗","洗","xǐ"],["穿","穿","chuān"],["脫","脱","tuō"],["打","打","dǎ"],["拉","拉","lā"],["推","推","tuī"],["抱","抱","bào"],["親","亲","qīn"],["拍","拍","pāi"],["捉","捉","zhuō"],["掃","扫","sǎo"],["擦","擦","cā"],["刷","刷","shuā"],["切","切","qiè"],["煮","煮","zhǔ"],["炒","炒","chǎo"],["烤","烤","kǎo"],["燒","烧","shāo"],["種","种","zhǒng"],["養","养","yǎng"],["騎","骑","qí"],["游","游","yóu"],["泳","泳","yǒng"],["爬","爬","pá"],["躲","躲","duǒ"],["等","等","děng"],["停","停","tíng"],["始","始","shǐ"],["結","结","jié"],["束","束","shù"],["準","准","zhǔn"],["備","备","bèi"],["認","认","rèn"],["真","真","zhēn"],["努","努","nǔ"],["力","力","lì"],["成","成","chéng"],["功","功","gōng"],["輸","输","shū"],["贏","赢","yíng"],["錯","错","cuò"],["正","正","zhèng"],["更","更","gèng"],["最","最","zuì"],["每","每","měi"],["各","各","gè"],["從","从","cóng"],["為","为","wèi"],["因","因","yīn"],["所","所","suǒ"],["但","但","dàn"],["如","如","rú"],["讓","让","ràng"],["被","被","bèi"],["把","把","bǎ"],["著","着","zhe"],["了","了","le"]],
  ];
  for(const traditional of [true,false])for(let level=0;level<4;level++){
    const id=traditional?(level?'chineseTrad'+(level+1):'chinese'):'chineseSimpl'+(level+1);
    const items=characters[level].map(pair=>{const label=pair[traditional?0:1],hint=pair[2];return {...word(label),hint,aliases:[hint,SC.tonelessPinyinNumber(hint).slice(0,-1),SC.tonelessPinyinNumber(hint)]};});
    SC.modes[id]={...lesson((traditional?'傳統中文 (trad.) ':'简体中文 (simpl.) ')+(level+1),traditional?'zh-TW':'zh-CN',items,'100 tecken · pinyin visas efter fem sekunder','字'),type:'chinese'};
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
    // Remove tones, not vowels: lü stays different from lu. Accept the usual
    // keyboard spellings lv / lu: as well as accented and numbered pinyin.
    const v=SC.speechNormalize(value).replace(/u:/g,'ü').replace(/v/g,'ü').normalize('NFD').replace(/[\u0300\u0301\u0304\u030c]/g,'').normalize('NFC').replace(/[0-5]$/,'');
    return /^[a-züê]+$/.test(v)?v:null;
  };
  SC.chineseSpeechPinyin=function(value){
    let v=SC.speechNormalize(value);
    if(/^\d+$/.test(v)){const n=Number(v);if(n>10)return null;v=SC.numberName(n,'zh-CN');}
    return SC.mandarinPinyin[v]||SC.tonelessPinyin(v);
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
