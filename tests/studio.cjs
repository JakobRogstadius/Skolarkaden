'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context=vm.createContext({Event,EventTarget,CustomEvent,console,performance});
for(const name of ['pinyin','data','language-exercises-data','language-exercises','homework','voice','speech','input','game','studio'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../resources/'+name+'.js'),'utf8'),context);
const SC=context.Starlight,events=[],g=new SC.StudioGame({random:()=>.4,onEvent:e=>events.push(e.type)});
g.start({mode:'math-addition'});assert.equal(g.paint,0);g.choose('color',2);assert.equal(g.color,0,'choosing a colour does not unlock it');
g.queue.enqueue('wrong');g.update(.1);assert.equal(g.paint,0);assert.equal(g.color,0);assert(g.canAnswer());
g.queue.enqueue(g.targets[0].item.answer);g.update(.1);assert.equal(g.color,2);assert.equal(g.paint,1);assert(!g.canAnswer());
g.consume(.7);assert(Math.abs(g.paint-.3)<1e-9);g.update(100000);assert(Math.abs(g.paint-.3)<1e-9,'paint never expires with time');
g.choose('tool','bucket');assert.equal(g.tool,'small');g.cancelQuestion();assert.equal(g.tool,'small');assert(Math.abs(g.paint-.3)<1e-9);
g.choose('tool','bucket');g.queue.enqueue(g.targets[0].item.answer);g.update(.1);assert.equal(g.tool,'bucket');
for(let i=0;i<5;i++)g.consume(.2);assert.equal(g.paint,0,'exactly five fills');
g.choose('color',2);g.pause();const clock=g.clock;g.update(20);assert.equal(g.clock,clock);g.resume();g.queue.enqueue(g.targets[0].item.answer);g.update(.1);assert.equal(g.paint,1,'reselect current colour to refill');
assert.equal(g.state,'playing');assert(!events.includes('end'));assert.equal(g.score,undefined);
for(const mode of Object.keys(SC.modes).filter(m=>m!=='homework'))for(const lang of SC.isTranslation(mode)?['sv-SE','en-US']:[SC.modes[mode].lang]){
 g.start({mode,lang});g.choose('tool','large');assert.equal(g.targets.length,1);g.queue.enqueue(g.targets[0].item.answer);g.update(.1);assert.equal(g.tool,'large',mode);assert.equal(g.paint,1,mode);
}
g.start({mode:'homework',lang:'sv-SE',items:[{answer:'hej',label:'hej'}]});g.choose('color',4);g.queue.enqueue('hej');g.update(.1);assert.equal(g.color,4,'one-answer homework works');
g.start({mode:'chinese',lang:'zh-TW',items:[{answer:'你',label:'你',hint:'nǐ',translation:'du'}]});
for(const answer of ['du','ni','你']){g.choose('color',6);g.queue.enqueue(answer);g.update(.1);assert.equal(g.paint,1,answer);g.consume(1);}
const image={width:7,height:5,data:new Uint8ClampedArray(7*5*4).fill(255)};
for(let y=0;y<5;y++)image.data.set([0,0,0,255],(y*7+3)*4);
assert.equal(SC.studioFill(image,1,2,'#e64b4b'),15);assert.deepEqual([...image.data.slice(0,4)],[230,75,75,255]);assert.deepEqual([...image.data.slice(16,20)],[255,255,255,255]);
assert.equal(SC.studioFill(image,1,2,'#e64b4b'),0,'same-colour fill costs no paint');assert.equal(SC.studioFill(image,-1,0,'#000000'),0);
assert.equal(SC.studioFill(image,6,4,'#4088ce'),15,'region remains bounded by brush stroke');
const large={width:960,height:640,data:new Uint8ClampedArray(960*640*4).fill(255)};assert.equal(SC.studioFill(large,959,639,'#263238'),960*640,'whole-paper fill without stack overflow');
console.log('PASS studio selection, refills, exercises/aliases, no scoring and bounded fill');
