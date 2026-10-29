'use strict';
const assert=require('node:assert/strict');
const {boot}=require('../helpers/app.cjs');
(async()=>{
 const app=boot();await app.appReady;
 const {context,elements,recognitions,click,settle,start}=app,SC=context.Starlight;
 // Clicking a rendered multiplication image uses the actual app speech route,
 // suspends recognition, and resumes safely after playback, failure or muting.
 const spoken=[];context.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
 context.speechSynthesis={getVoices:()=>[{lang:'sv-SE'}],speak:u=>spoken.push(u),cancel(){}};
 elements['input-kind'].value='browser';await start('dinosaur','math-simple-multiplication');
 const grid=SC.makeMath(36,()=>0,SC.mathLevel('math-simple-multiplication'));app.currentGame.getTargets()[0].item=grid;
 const image={tagName:'CANVAS',width:224,height:160,closest:()=>null,getBoundingClientRect:()=>({left:20,top:30,width:112,height:80})};
 const imageContext=new Proxy({canvas:image,getTransform:()=>({a:2,b:0,c:0,d:2,e:0,f:0})},{get:(o,k)=>k in o?o[k]:()=>{}});
 SC.drawMathDiagram(imageContext,grid.diagram,{x:0,y:0,w:112,h:80});
 const imageClick=(target=image,detail=1,x=76,y=70)=>{const event=new Event('click');Object.defineProperties(event,{target:{value:target},detail:{value:detail},clientX:{value:x},clientY:{value:y}});elements.arena.dispatchEvent(event);};
 const listening=recognitions.at(-1),beforeReading=recognitions.length;
 imageClick();assert.equal(spoken.at(-1).text,'sex gånger sex');assert.equal(spoken.at(-1).lang,'sv-SE');assert(listening.aborted);
 listening.onresult({results:[Object.assign([{transcript:'sex',confidence:.9}],{isFinal:true})],resultIndex:0});assert.equal(app.currentGame.queue.length,0,'ignore synthesized factors');
 const oldSpeech=spoken.at(-1);imageClick();oldSpeech.onend();assert.equal(recognitions.length,beforeReading,'a replaced prompt cannot restart recognition');
 spoken.at(-1).onend();assert.equal(recognitions.length,beforeReading+1);
 const beforeOutside=spoken.length;imageClick(image,1,19,70);assert.equal(spoken.length,beforeOutside,'clicking outside the image is silent');
 const card={tagName:'BUTTON',querySelectorAll:()=>[image]};card.closest=()=>card;
 imageClick(card,0,0,0);assert.equal(spoken.length,beforeOutside+1,'keyboard activation of an image card also speaks');spoken.at(-1).onend();
 imageClick();let resumed=recognitions.length;click('sound');assert.equal(recognitions.length,resumed+1,'muting resumes answer input');
 const muted=spoken.length;imageClick();assert.equal(spoken.length,muted);click('sound');
 imageClick();resumed=recognitions.length;click('pause');spoken.at(-1).onend();imageClick();assert.equal(recognitions.length,resumed,'pause cannot restart recognition');
 click('resume');await settle();assert.equal(recognitions.length,resumed+1);
 const synth=context.speechSynthesis;context.speechSynthesis={...synth,speak(){throw Error('unavailable');}};
 resumed=recognitions.length;imageClick();assert.equal(recognitions.length,resumed+1,'failed playback resumes recognition');
 delete context.speechSynthesis;resumed=recognitions.length;imageClick();assert.equal(recognitions.length,resumed+1,'unsupported playback resumes recognition');context.speechSynthesis=synth;
 recognitions.at(-1).onresult({results:[Object.assign([{transcript:'trettiosex',confidence:.9}],{isFinal:true})],resultIndex:0});assert.equal(app.currentGame.queue.items[0].text,'trettiosex');
 imageClick();resumed=recognitions.length;click('pause-menu');spoken.at(-1).onend();assert.equal(recognitions.length,resumed,'leaving the game cannot restart recognition');
 elements['input-kind'].value='typing';
 console.log('PASS image/card read-aloud, Swedish factors, mute, recognition suspension/resumption, replacement races, pause/menu, unsupported and failed playback, and spoken products.');
})().catch(error=>{console.error(error);process.exitCode=1;});
