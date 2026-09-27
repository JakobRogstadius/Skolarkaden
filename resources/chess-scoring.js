/* Move-choice points, material and match result; no time or streak bonuses. */
(function(root){
'use strict';const SC=root.Starlight;
const pieceValues=Object.freeze({p:1,n:3,b:3,r:5,q:9,k:0});
// Each side can lose at most 103 material units, including eight promoted queens.
const maxMaterial=103,maxScore=1000000;
const resultText=score=>score===.5?'½':String(score);
function choicePoints(offered,move,correct){
 if(!correct)return -10;
 const key=SC.ChessEngine.key,chosen=offered.find(m=>key(m)===key(move));
 if(!chosen||!Number.isFinite(chosen.value))return 0;
 // Rank within the offered choices. Equal evaluations earn equal points.
 const better=offered.filter(m=>m.value>chosen.value).length;
 return [10,5,0][Math.min(2,better)];
}
function calculate({won=false,draw=false,turns=0,capturedMaterial=0,lostMaterial=0,movePoints=0}={}){
 const result=won?1000:draw?400:0;
 const captures=10*Math.max(0,Math.min(maxMaterial,capturedMaterial));
 const losses=-10*Math.max(0,Math.min(maxMaterial,lostMaterial));
 const quality=movePoints;
 const efficiency=won?Math.round(6000/(20+Math.max(0,turns))):0;
 const total=Math.max(0,Math.min(maxScore,result+captures+losses+quality+efficiency));
 return {result,captures,losses,quality,efficiency,total};
}
function rows(parts){return [['Resultat',parts.result],['Slagna pjäser',parts.captures],['Förlorade pjäser',parts.losses],['Dragkvalitet',parts.quality],['Få drag vid vinst',parts.efficiency]];}
function summary(parts){return rows(parts).map(([label,value])=>label+' '+(value<0?'−':'')+Math.abs(value).toLocaleString('sv-SE')).join(' · ')+'. Totalt '+parts.total.toLocaleString('sv-SE')+' poäng.';}
SC.ChessScoring={pieceValues,maxMaterial,maxScore,resultText,choicePoints,calculate,rows,summary};
})(globalThis);
