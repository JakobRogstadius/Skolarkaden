/* Chess performance only: no answer, streak, difficulty or time inputs. */
(function(root){
'use strict';const SC=root.Starlight;
const pieceValues=Object.freeze({p:1,n:3,b:3,r:5,q:9,k:0});
// Each side can lose at most 103 material units, including eight promoted queens.
const maxMaterial=103,maxScore=2430;
const resultText=score=>score===.5?'½':String(score);
function qualityValue(value){
 // A mate score is an ordering sentinel, not 1,000 pawns. Preserve mate-distance
 // ordering without letting that sentinel erase the entire quality bonus.
 if(Math.abs(value)>=90000)return Math.sign(value)*(5000-10*Math.min(99,100000-Math.abs(value)));
 return Math.max(-4000,Math.min(4000,value));
}
function moveLoss(ranked,move){
 const key=SC.ChessEngine.key,chosen=ranked?.find(m=>key(m)===key(move));
 if(!chosen||!Number.isFinite(chosen.value))return 0;
 const best=Math.max(...ranked.filter(m=>Number.isFinite(m.value)).map(m=>qualityValue(m.value)));
 return Math.max(0,best-qualityValue(chosen.value));
}
function calculate({won=false,draw=false,turns=0,capturedMaterial=0,lostMaterial=0,qualityLoss=0}={}){
 const result=won?1000:draw?400:0;
 const captures=10*Math.max(0,Math.min(maxMaterial,capturedMaterial));
 const losses=-10*Math.max(0,Math.min(maxMaterial,lostMaterial));
 // Cumulative regret: quiet/best/forced moves never replenish spent quality.
 const quality=Math.round(100*Math.exp(-Math.max(0,qualityLoss)/1000));
 const efficiency=won?Math.round(6000/(20+Math.max(0,turns))):0;
 const total=Math.max(0,result+captures+losses+quality+efficiency);
 return {result,captures,losses,quality,efficiency,total};
}
function rows(parts){return [['Resultat',parts.result],['Slagna pjäser',parts.captures],['Förlorade pjäser',parts.losses],['Dragkvalitet',parts.quality],['Få drag vid vinst',parts.efficiency]];}
function summary(parts){return rows(parts).map(([label,value])=>label+' '+(value<0?'−':'')+Math.abs(value).toLocaleString('sv-SE')).join(' · ')+'. Totalt '+parts.total.toLocaleString('sv-SE')+' poäng.';}
SC.ChessScoring={pieceValues,maxMaterial,maxScore,resultText,qualityValue,moveLoss,calculate,rows,summary};
})(globalThis);
