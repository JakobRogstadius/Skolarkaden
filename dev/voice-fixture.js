// Development-only speech harness. No real microphone or speech service.
(()=>{
  const contexts=[];let current,opens=0,starts=0,results=[];
  const counts=()=>{const el=document.getElementById('fixture-counts');if(el)el.textContent='Mikrofonöppningar: '+opens+' · talsessioner: '+starts;};
  Object.defineProperty(navigator,'mediaDevices',{value:{enumerateDevices:async()=>[],getUserMedia:async()=>{
    opens++;counts();const ac=new AudioContext();contexts.push(ac);await ac.resume();const osc=ac.createOscillator(),gain=ac.createGain(),output=ac.createMediaStreamDestination();gain.gain.value=.1;osc.frequency.value=350;osc.connect(gain).connect(output);osc.start();return output.stream;
  }}});
  class Recognition{
    static async available(){return 'available';}
    start(){current=this;results=[];starts++;counts();this.onstart?.();this.onresult?.({results:[Object.assign([{transcript:'preliminär testsignal',confidence:.1}],{isFinal:false})],resultIndex:0});}
    stop(){this.onend?.();if(current===this)current=null;}
    abort(){if(current===this)current=null;}
  }
  Recognition.prototype.processLocally=false;window.SpeechRecognition=Recognition;
  addEventListener('pagehide',()=>contexts.forEach(ac=>ac.close()));
  addEventListener('DOMContentLoaded',()=>{
    const panel=document.createElement('div');panel.style.cssText='margin:8px auto;padding:12px;max-width:1000px;background:#263442;border:1px solid #daba77';
    const note=document.createElement('p');note.textContent='SIMULERAD TALIGENKÄNNING · INGEN RIKTIG MIKROFON';panel.append(note);
    const text=document.createElement('input');text.id='fixture-words';text.setAttribute('aria-label','Simulerad transkription');text.value='SOL! katt katt felord';panel.append(text);
    for(const [title,action] of [['Visa preliminärt tal',()=>{if(current)current.onresult?.({results:[...results,Object.assign([{transcript:text.value,confidence:.5}],{isFinal:false})],resultIndex:results.length});}],['Skicka simulerat tal',()=>{if(!current)return;results.push(Object.assign([{transcript:text.value,confidence:.7}],{isFinal:true}));current.onresult?.({results:[...results],resultIndex:results.length-1});}],['Upprepa resultatcallback',()=>current?.onresult?.({results:[...results],resultIndex:0})],['Avsluta simulerad session',()=>{current?.onend?.();current=null;}]]){const b=document.createElement('button');b.textContent=title;b.onclick=action;panel.append(b);}
    const count=document.createElement('p');count.id='fixture-counts';panel.append(count);document.body.prepend(panel);counts();
  });
})();
// Authored gameplay fixtures exercise the real composition root and result overlays.
addEventListener('DOMContentLoaded',()=>{
  let garden,food;
  for(const [Game,set] of [[Starlight.GardenGame,g=>garden=g],[Starlight.FoodTruckGame,g=>food=g]]){
    const start=Game.prototype.start;Game.prototype.start=function(...args){const result=start.apply(this,args);set(this);return result;};
  }
  const panel=document.createElement('div');panel.className='button-row';document.body.prepend(panel);
  for(const [name,run] of [
    ['Fyll trädgårdskön',()=>{if(!garden)return;garden.queue.clear();garden.job=null;garden.pots.forEach((p,i)=>{Object.assign(p,{growth:.35+i*.04,moisture:.6,nutrition:1,infection:0,bloom:false,dead:false,requests:{}});garden.syncRequests(p);});for(const t of garden.getTargets().slice(0,4))garden.queue.enqueue(t.item.answer);garden.work(.05);garden.state='paused';}],
    ['Visa trädgårdsförlust',()=>{if(!garden)return;garden.state='playing';garden.pots[2].moisture=0;garden.update(.05);}],
    ['Visa köksvinst',()=>{if(!food)return;food.state='playing';food.elapsed=89.95;food.timeLeft=.05;food.update(.05);}]
  ]){const b=document.createElement('button');b.textContent=name;b.onclick=run;panel.append(b);}
});
addEventListener('DOMContentLoaded',()=>{
 let hive,food;for(const [Game,set] of [[Starlight.BeehiveGame,g=>hive=g],[Starlight.FoodTruckGame,g=>food=g]]){const start=Game.prototype.start;Game.prototype.start=function(...args){const v=start.apply(this,args);set(this);return v;};}
 const panel=document.createElement('div');panel.className='button-row';document.body.prepend(panel);
 const controls=[['Visa sommaräng',()=>{if(!hive)return;hive.elapsed=hive.duration*.45;hive.plants=[];hive.spawned=0;hive.queue.clear();for(let i=0;i<18;i++){hive.spawn();const p=hive.plants.at(-1);p.age=p.youngFor;if(i<16)hive.bloom(p);else p.growth=.6;}for(const p of hive.getTargets().slice(0,8))hive.queue.enqueue(p.item.answer);hive.work(.05);hive.state='paused';hive.honey=12;}],['Visa höst',()=>{if(!hive)return;hive.elapsed=hive.duration*.88;hive.state='paused';}],['Visa vintervinst',()=>{if(!hive)return;hive.elapsed=hive.duration-.05;hive.honey=hive.honeyGoal;hive.state='playing';hive.update(.05);}],['Visa vinterförlust',()=>{if(!hive)return;hive.elapsed=hive.duration-.05;hive.honey=0;hive.state='playing';hive.update(.05);}],['Sällsynt gäst',()=>{if(!food)return;const c=food.customers[0];let first=true;c.look=Starlight.makePerson(()=>{if(first){first=false;return .995;}return .18;});c.status='waiting';c.wait=0;c.patience=1000;food.emit('rare-arrival',{look:c.look});}]];
 for(const [name,run] of controls){const b=document.createElement('button');b.textContent=name;b.onclick=run;panel.append(b);}
});
