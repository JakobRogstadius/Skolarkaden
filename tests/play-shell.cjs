'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const events=new EventTarget(),viewport=Object.assign(new EventTarget(),{height:700,offsetTop:0,scale:1});
const styles=new Map(),classes=new Set(),timers=new Map();let id=0;
const doc={documentElement:{style:{setProperty:(k,v)=>styles.set(k,v)}},body:{classList:{toggle:(k,on)=>on?classes.add(k):classes.delete(k)}}};
const context=vm.createContext({Starlight:{},navigator:{maxTouchPoints:5},innerHeight:1000,visualViewport:viewport,document:doc,
 addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),requestAnimationFrame:f=>{timers.set(++id,f);return id;},cancelAnimationFrame:id=>timers.delete(id)});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/play-shell.js'),'utf8'),context);
const SC=context.Starlight,v=new SC.PlayViewport();assert(classes.has('mobile-play'));assert.equal(styles.get('--play-height'),'700px');
viewport.height=410;viewport.offsetTop=34;viewport.dispatchEvent(new Event('resize'));viewport.dispatchEvent(new Event('scroll'));assert.equal(timers.size,1,'coalesce viewport animation');
for(const f of timers.values())f();timers.clear();assert.equal(styles.get('--play-height'),'410px');assert.equal(styles.get('--play-top'),'34px');
viewport.scale=2;viewport.height=205;v.update();assert.equal(styles.get('--play-height'),'410px','pinch zoom must not reflow the game');v.destroy();
let stack=[{external:true},{otherState:'preserved'}],at=1,backs=0,menus=0;
const history={get state(){return stack[at];},replaceState(s){stack[at]=s;},pushState(s){stack=stack.slice(0,at+1);stack.push(s);at++;},back(){at--;events.dispatchEvent(new Event('popstate'));}};
const nav=new SC.GameNavigation({history,target:events,onBack:()=>backs++});assert.equal(history.state.otherState,'preserved');
for(let round=0;round<3;round++){
 nav.enter();nav.enter();assert.equal(stack.length,3,'one game history entry per visit');assert.equal(at,2);
 history.back();assert.equal(at,2,'Back restores the guard before asking');assert.equal(backs,round*2+1);assert(nav.active);
 history.back();assert.equal(backs,round*2+2,'cancelling permits another attempt');assert.equal(stack.length,3);
 nav.leave(()=>menus++);assert.equal(at,1);assert.equal(history.state.skolarkaden,'menu');assert.equal(menus,round+1);
}
// Forward cannot resurrect an abandoned game; another Back can leave the site.
at++;events.dispatchEvent(new Event('popstate'));assert.equal(history.state.skolarkaden,'menu');history.back();history.back();assert(history.state.external);nav.destroy();
SC.foodSceneHeight=(w,last)=>540+Math.floor(last/Math.max(2,Math.floor(w/180)))*200;
for(const viewportKind of ['city','food','garden','hive','paint','dinosaur','marshmallows','eggs','home']){
 const game={viewportKind,customers:Array.from({length:12},(_,slot)=>({slot}))},size=SC.fitSceneSize(378,360,game);
 assert(Math.abs(size.width*size.scale-378)<1e-8);assert(Math.abs(size.height*size.scale-360)<1e-8);assert(size.scale>0&&size.scale<=1);
 if(viewportKind==='food')assert(size.height>=SC.foodSceneHeight(size.width,11),'all customer rows fit');
}
console.log('PASS Back/cancel/confirm history, repeated games, forward safety, keyboard viewport, pinch zoom and fitted scenes.');
