// Optional audit-only preview. The distributed app still opens directly as a file.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://terminal.local');
  if(url.pathname==='/audit-refinements.html'){res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(path.join(root,'index.html'),'utf8').replace('<script defer src="resources/app.js">','<script defer src="resources/app.js"></script><script defer src="/refinements-fixture.js">'));return;}
  if(url.pathname==='/refinements-fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(__dirname,'refinements-fixture.js')));return;}
  if(url.pathname==='/audit-paint.html'){res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(path.join(root,'index.html'),'utf8').replace('<script defer src="resources/app.js">','<script defer src="resources/app.js"></script><script defer src="/paint-fixture.js">').replace('</head>',url.searchParams.has('narrow')?'<style>.shell{max-width:390px;padding:14px 10px}.arena.paint{height:700px}.game-picker,.setup-grid{grid-template-columns:1fr}.hud{padding:16px 10px;gap:7px}.hud strong{font-size:21px}.hud-objective span{font-size:10px}.hud .eyebrow{font-size:8px}.hud small{font-size:8px}.hud button{font-size:10px;padding:9px}#best{display:none}#answer-form{flex-wrap:wrap}#answer{width:100%;min-width:100%}</style></head>':'</head>'));return;}
  if(url.pathname==='/paint-fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(__dirname,'paint-fixture.js')));return;}
  if(url.pathname==='/audit-garden.html'){res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(path.join(__dirname,'garden-fixture.html')));return;}
  if(url.pathname==='/audit-speech.html'){
    res.setHeader('Content-Type','text/html');res.setHeader('Cache-Control','no-store');
    res.end(fs.readFileSync(path.join(root,'index.html'),'utf8').replace('<script defer src="resources/data.js">','<script src="/audit-speech-fixture.js"></script><script defer src="resources/data.js">'));return;
  }
  if(url.pathname==='/audit-speech-fixture.js'){
    res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(__dirname,'voice-fixture.js')));return;
  }
  if(url.pathname==='/audit-mobile.html'||url.pathname==='/audit-zoom.html'){
    const mobile=url.pathname.includes('mobile');
    res.setHeader('Content-Type','text/html');
    res.end('<!doctype html><html><body style="margin:0;background:#333"><iframe title="App test viewport" src="'+(url.searchParams.has('garden')?'/audit-garden.html':url.searchParams.has('paint')?'/audit-paint.html':'/')+'" style="display:block;border:0;width:'+(mobile?'390px':'640px')+';height:'+(mobile?'844px':'900px')+'"></iframe></body></html>');return;
  }
  const relative=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
  if(relative!=='index.html'&&!/^resources\/[\w.-]+$/.test(relative)){res.writeHead(404).end();return;}
  const file=path.join(root,relative);
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(data);});
}).listen(4173,'0.0.0.0');
