// Optional audit-only preview. The distributed app still opens directly as a file.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://terminal.local');
  const historical=url.pathname.match(/^\/audit-source\/([a-f0-9]{7,40})\/(resources\/(?:[a-zA-Z0-9_-]+\/)*[\w.-]+)$/);
  if(historical){
    try{const data=execFileSync('git',['show',historical[1]+':'+historical[2]],{cwd:root,maxBuffer:8*1024*1024});res.setHeader('Content-Type',historical[2].endsWith('.js')?'text/javascript':historical[2].endsWith('.css')?'text/css':'application/octet-stream');res.end(data);}
    catch{res.writeHead(404).end();}return;
  }
  if(url.pathname==='/audit-glantan.html'){
    res.setHeader('Content-Type','text/html');res.setHeader('Cache-Control','no-store');
    const ref=url.searchParams.get('ref');
    if(ref&&!/^[a-f0-9]{7,40}$/.test(ref)){res.writeHead(400).end();return;}
    try{
      let html=ref?execFileSync('git',['show',ref+':index.html'],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,'index.html'),'utf8');
      html=html.replace(/(<script defer src="resources\/app\.js(?:\?[^"]*)?"><\/script>)/,'<script defer src="/glantan-fixture.js"></script>$1');
      if(ref)html=html.replace(/((?:src|href)=")resources\//g,'$1/audit-source/'+ref+'/resources/');
      res.end(html);
    }catch{res.writeHead(404).end();}return;
  }
  if(url.pathname==='/glantan-fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(__dirname,'glantan-fixture.js')));return;}
  if(url.pathname==='/audit-glantan-viewport.html'){
    const w=Math.max(320,Math.min(1360,Number(url.searchParams.get('width'))||390)),h=Math.max(350,Math.min(1000,Number(url.searchParams.get('height'))||844));
    res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#333"><iframe title="Klockgläntan test viewport" src="/audit-glantan.html?game=glantan" style="display:block;border:0;width:'+w+'px;height:'+h+'px"></iframe></body></html>');return;
  }
  if(url.pathname==='/audit-refinements.html'){res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/(<script defer src="resources\/app\.js(?:\?[^"]*)?"><\/script>)/,'$1<script defer src="/refinements-fixture.js"></script>'));return;}
  if(url.pathname==='/refinements-fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(__dirname,'refinements-fixture.js')));return;}
  if(url.pathname==='/audit-paint.html'){res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/(<script defer src="resources\/app\.js(?:\?[^"]*)?"><\/script>)/,'$1<script defer src="/paint-fixture.js"></script>').replace('</head>',url.searchParams.has('narrow')?'<style>.shell{max-width:390px;padding:14px 10px}.arena.paint{height:700px}.game-picker,.setup-grid{grid-template-columns:1fr}.hud{padding:16px 10px;gap:7px}.hud strong{font-size:21px}.hud-objective span{font-size:10px}.hud .eyebrow{font-size:8px}.hud small{font-size:8px}.hud button{font-size:10px;padding:9px}#best{display:none}#answer-form{flex-wrap:wrap}#answer{width:100%;min-width:100%}</style></head>':'</head>'));return;}
  if(url.pathname==='/paint-fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(__dirname,'paint-fixture.js')));return;}
  if(url.pathname==='/audit-garden.html'){res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(path.join(__dirname,'garden-fixture.html')));return;}
  if(url.pathname==='/audit-speech.html'){
    res.setHeader('Content-Type','text/html');res.setHeader('Cache-Control','no-store');
    res.end(fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/(<script defer src="resources\/data\.js(?:\?[^"]*)?">)/,'<script src="/audit-speech-fixture.js"></script>$1'));return;
  }
  if(url.pathname==='/audit-speech-fixture.js'){
    res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(__dirname,'voice-fixture.js')));return;
  }
  if(url.pathname==='/audit-mobile.html'||url.pathname==='/audit-zoom.html'){
    const mobile=url.pathname.includes('mobile');
    res.setHeader('Content-Type','text/html');
    res.end('<!doctype html><html><body style="margin:0;background:#333"><iframe title="App test viewport" src="'+(url.searchParams.has('garden')?'/audit-garden.html':url.searchParams.has('paint')?'/audit-paint.html':'/')+'" style="display:block;border:0;width:'+(mobile?'390px':'640px')+';height:'+(mobile?'844px':'900px')+'"></iframe></body></html>');return;
  }
  if(url.pathname==='/audit-bubblefish-viewport.html'){
    const w=Math.max(320,Math.min(1360,Number(url.searchParams.get('width'))||390)),h=Math.max(320,Math.min(1000,Number(url.searchParams.get('height'))||844));
    res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><body style="margin:0;background:#274652"><iframe title="Bubbelfisken viewport" src="/audit-bubblefish-mobile.html?game=bubblefish" style="border:0;width:'+w+'px;height:'+h+'px"></iframe></body></html>');return;
  }
  if(url.pathname==='/audit-bubblefish-mobile.html'){
    res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(path.join(root,'index.html'),'utf8').replace('</head>','<script>Object.defineProperty(navigator,"maxTouchPoints",{value:1});</script></head>'));return;
  }
  const relative=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
  if(!['index.html','statistics.html','homework.html','homework.json','language-exercises.json','dev/bubblefish-fixture.html','dev/bubblefish-fixture.js'].includes(relative)&&!/^resources\/(?:[a-zA-Z0-9_-]+\/)*[\w.-]+$/.test(relative)){res.writeHead(404).end();return;}
  const file=path.join(root,relative);
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':'text/html');res.end(data);});
}).listen(4173,'0.0.0.0');
