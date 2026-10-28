/* Mahjong solitaire: geometry and exercise matching, independent of DOM/input. */
(function(root){
'use strict';
const SC=root.Starlight;
const shuffle=(values,random)=>{const copy=[...values];for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;};
const layouts=Object.freeze([
  {id:'square',name:'Kvadraten'},
  {id:'igloo',name:'Igloon'},
  {id:'pyramid',name:'Pyramiden'},
  {id:'snake',name:'Ormen'},
  {id:'bridge',name:'Bron'},
  {id:'v',name:'V:et'}
]);
// Approved 40/60/80-tile boards. Coordinates describe table footprints,
// before the renderer applies perspective. Shells and bridges may overhang.
const layoutBoards={
  square:{
    gentle:{tiles:[
      [-1.5,-1.5,0],[-0.5,-1.5,0],[0.5,-1.5,0],[1.5,-1.5,0],[-1.5,-0.5,0],[-0.5,-0.5,0],[0.5,-0.5,0],[1.5,-0.5,0],[-1.5,0.5,0],[-0.5,0.5,0],[0.5,0.5,0],[1.5,0.5,0],[-1.5,1.5,0],[-0.5,1.5,0],[0.5,1.5,0],[1.5,1.5,0],
      [-1.0,-1.0,1],[0.0,-1.0,1],[1.0,-1.0,1],[-1.0,0.0,1],[0.0,0.0,1],[1.0,0.0,1],[-1.0,1.0,1],[0.0,1.0,1],[1.0,1.0,1],
      [-1.0,-1.0,2],[0.0,-1.0,2],[1.0,-1.0,2],[-1.0,0.0,2],[0.0,0.0,2],[1.0,0.0,2],[-1.0,1.0,2],[0.0,1.0,2],[1.0,1.0,2],
      [0.0,0.0,3],[0.0,1.0,3],[0.0,-1.0,3],[1.0,0.0,3],[-1.0,0.0,3],[1.0,-1.0,3]
    ],solution:[[37,33],[36,24],[26,15],[34,17],[39,35],[25,27],[30,29],[18,21],[7,31],[16,22],[32,12],[23,11],[14,1],[38,0],[28,2],[19,20],[4,8],[5,6],[3,9],[13,10]]},
    steady:{tiles:[
      [-2.0,-2.0,0],[-1.0,-2.0,0],[0.0,-2.0,0],[1.0,-2.0,0],[2.0,-2.0,0],[-2.0,-1.0,0],[-1.0,-1.0,0],[0.0,-1.0,0],[1.0,-1.0,0],[2.0,-1.0,0],[-2.0,0.0,0],[-1.0,0.0,0],[0.0,0.0,0],[1.0,0.0,0],[2.0,0.0,0],[-2.0,1.0,0],[-1.0,1.0,0],[0.0,1.0,0],[1.0,1.0,0],[2.0,1.0,0],[-2.0,2.0,0],[-1.0,2.0,0],[0.0,2.0,0],[1.0,2.0,0],[2.0,2.0,0],
      [-1.5,-1.5,1],[-0.5,-1.5,1],[0.5,-1.5,1],[1.5,-1.5,1],[-1.5,-0.5,1],[-0.5,-0.5,1],[0.5,-0.5,1],[1.5,-0.5,1],[-1.5,0.5,1],[-0.5,0.5,1],[0.5,0.5,1],[1.5,0.5,1],[-1.5,1.5,1],[-0.5,1.5,1],[0.5,1.5,1],[1.5,1.5,1],
      [-1.5,-1.5,2],[-0.5,-1.5,2],[0.5,-1.5,2],[1.5,-1.5,2],[-1.5,-0.5,2],[-0.5,-0.5,2],[0.5,-0.5,2],[1.5,-0.5,2],[-1.5,0.5,2],[-0.5,0.5,2],[0.5,0.5,2],[1.5,0.5,2],[-1.5,1.5,2],[-0.5,1.5,2],[0.5,1.5,2],[1.5,1.5,2],
      [0.0,0.0,3],[1,0,3],[-1.0,0.0,3]
    ],solution:[[55,43],[54,27],[41,38],[53,39],[59,22],[44,57],[45,42],[50,28],[58,56],[37,26],[48,47],[49,51],[31,46],[52,33],[36,30],[40,32],[23,24],[35,20],[34,9],[13,18],[25,3],[15,0],[19,12],[21,2],[7,29],[4,8],[11,6],[5,1],[17,10],[14,16]]},
    brave:{tiles:[
      [-0.5,-0.5,0],[0.5,0.5,0],[-0.5,0.5,0],[0.5,-0.5,0],[-1.5,-0.5,0],[-1.5,0.5,0],[1.5,-1.5,0],[-0.5,-1.5,0],[-1.5,-1.5,0],[1.5,1.5,0],[1.5,0.5,0],[1.5,-0.5,0],[-1.5,1.5,0],[-0.5,1.5,0],[0.5,-1.5,0],[0.5,1.5,0],[1.5,2.5,0],[2.5,-2.5,0],[0.5,-2.5,0],[-2.5,1.5,0],[2.5,2.5,0],[2.5,1.5,0],[-2.5,2.5,0],[2.5,-0.5,0],[-2.5,-1.5,0],[-1.5,2.5,0],[-2.5,-0.5,0],[0.5,2.5,0],[-0.5,2.5,0],[-0.5,-2.5,0],[-2.5,-2.5,0],[2.5,-1.5,0],[2.5,0.5,0],[-1.5,-2.5,0],[-2.5,0.5,0],[1.5,-2.5,0],
      [0.0,0.0,1],[0.0,-1.0,1],[1.0,0.0,1],[-1.0,-1.0,1],[0.0,1.0,1],[-1.0,0.0,1],[-1.0,1.0,1],[1.0,1.0,1],[1.0,-1.0,1],[2.0,1.0,1],[0.0,-2.0,1],[2.0,2.0,1],[-1.0,2.0,1],[-2.0,1.0,1],[-1.0,-2.0,1],[2.0,-1.0,1],[-2.0,2.0,1],[2.0,-2.0,1],[2.0,0.0,1],[-2.0,0.0,1],[1.0,-2.0,1],[0.0,2.0,1],[-2.0,-2.0,1],[1.0,2.0,1],[-2.0,-1.0,1],
      [0.0,0.5,2],[0.0,-0.5,2],[1.0,-0.5,2],[-1.0,0.5,2],[1.0,0.5,2],[-1.0,-0.5,2],[0.0,1.5,2],[-1.0,1.5,2],[1.0,-1.5,2],[1.0,1.5,2],[-1.0,-1.5,2],[0.0,-1.5,2],[-2.0,-0.5,2],
      [0,0,3],
      [-2.0,1.5,2],[2.0,-0.5,2],[-2.0,0.5,2],[2.0,1.5,2],[2.0,0.5,2]
    ],solution:[[74,65],[73,58],[63,53],[68,60],[78,17],[64,75],[62,52],[76,47],[70,51],[72,66],[59,46],[37,22],[20,48],[77,71],[50,25],[31,49],[24,67],[33,79],[39,57],[27,8],[54,41],[69,23],[56,16],[38,19],[29,45],[44,7],[28,61],[32,11],[14,35],[18,36],[43,6],[40,9],[10,3],[55,1],[4,21],[34,15],[0,26],[42,30],[12,5],[2,13]]},
  },
  igloo:{
    gentle:{tiles:[
      [-1.0,-3.0,0],[0.0,-3.0,0],[1.0,-3.0,0],[-2.0,-2.0,0],[2.0,-2.0,0],[-3.0,-1.0,0],[3.0,-1.0,0],[-3.0,0.0,0],[3.0,0.0,0],[-3.0,1.0,0],[3.0,1.0,0],[-2.0,2.0,0],[2.0,2.0,0],[-1.0,3.0,0],[0.0,3.0,0],[1.0,3.0,0],
      [-1.1,-2.2,1],[0.0,-2.2,1],[1.1,-2.2,1],[-2.2,-1.1,1],[2.2,-1.1,1],[-2.2,0.0,1],[2.2,0.0,1],[-2.2,1.1,1],[2.2,1.1,1],[-1.1,2.2,1],[0.0,2.2,1],[1.1,2.2,1],
      [-1.3,-1.3,2],[0.0,-1.3,2],[1.3,-1.3,2],[-1.3,0.0,2],[1.3,0.0,2],[-1.3,1.3,2],[0.0,1.3,2],[1.3,1.3,2],
      [-0.55,-0.55,3],[0.55,-0.55,3],[-0.55,0.55,3],[0.55,0.55,3]
    ],solution:[[39,36],[38,28],[19,16],[33,0],[3,5],[34,31],[23,26],[14,35],[25,21],[27,37],[30,24],[15,29],[13,11],[9,17],[1,18],[10,20],[32,2],[22,6],[8,4],[12,7]]},
    steady:{tiles:[
      [-1.521429,-3.55,0],[-0.507143,-3.55,0],[0.507143,-3.55,0],[1.521429,-3.55,0],[-2.535714,-2.535714,0],[2.535714,-2.535714,0],[-3.55,-1.521429,0],[3.55,-1.521429,0],[-3.55,-0.507143,0],[3.55,-0.507143,0],[-3.55,0.507143,0],[3.55,0.507143,0],[-3.55,1.521429,0],[3.55,1.521429,0],[-2.535714,2.535714,0],[2.535714,2.535714,0],[-1.521429,3.55,0],[-0.507143,3.55,0],[0.507143,3.55,0],[1.521429,3.55,0],
      [-1.016667,-3.05,1],[0.0,-3.05,1],[1.016667,-3.05,1],[-2.033333,-2.033333,1],[2.033333,-2.033333,1],[-3.05,-1.016667,1],[3.05,-1.016667,1],[-3.05,0.0,1],[3.05,0.0,1],[-3.05,1.016667,1],[3.05,1.016667,1],[-2.033333,2.033333,1],[2.033333,2.033333,1],[-1.016667,3.05,1],[0.0,3.05,1],[1.016667,3.05,1],
      [-1.125,-2.25,2],[0.0,-2.25,2],[1.125,-2.25,2],[-2.25,-1.125,2],[2.25,-1.125,2],[-2.25,0.0,2],[2.25,0.0,2],[-2.25,1.125,2],[2.25,1.125,2],[-1.125,2.25,2],[0.0,2.25,2],[1.125,2.25,2],
      [-1.5,-1.5,3],[0.0,-1.5,3],[1.5,-1.5,3],[-1.5,0.0,3],[1.5,0.0,3],[-1.5,1.5,3],[0.0,1.5,3],[1.5,1.5,3],
      [-0.5,-0.5,4],[0.5,-0.5,4],[-0.5,0.5,4],[0.5,0.5,4]
    ],solution:[[50,51],[56,59],[38,52],[49,53],[37,58],[43,55],[57,22],[41,45],[27,40],[48,54],[44,24],[26,21],[47,5],[46,36],[3,31],[35,20],[42,0],[30,34],[29,19],[7,32],[13,18],[39,2],[12,1],[28,33],[14,10],[9,16],[23,25],[4,15],[17,8],[6,11]]},
    brave:{tiles:[
      [-2.1,-4.2,0],[-1.05,-4.2,0],[0.0,-4.2,0],[1.05,-4.2,0],[2.1,-4.2,0],[-3.15,-3.15,0],[3.15,-3.15,0],[-4.2,-2.1,0],[4.2,-2.1,0],[-4.2,-1.05,0],[4.2,-1.05,0],[-4.2,0.0,0],[4.2,0.0,0],[-4.2,1.05,0],[4.2,1.05,0],[-4.2,2.1,0],[4.2,2.1,0],[-3.15,3.15,0],[3.15,3.15,0],[-2.1,4.2,0],[-1.05,4.2,0],[0.0,4.2,0],[1.05,4.2,0],[2.1,4.2,0],
      [-1.671429,-3.9,1],[-0.557143,-3.9,1],[0.557143,-3.9,1],[1.671429,-3.9,1],[-2.785714,-2.785714,1],[2.785714,-2.785714,1],[-3.9,-1.671429,1],[3.9,-1.671429,1],[-3.9,-0.557143,1],[3.9,-0.557143,1],[-3.9,0.557143,1],[3.9,0.557143,1],[-3.9,1.671429,1],[3.9,1.671429,1],[-2.785714,2.785714,1],[2.785714,2.785714,1],[-1.671429,3.9,1],[-0.557143,3.9,1],[0.557143,3.9,1],[1.671429,3.9,1],
      [-1.0,-3.0,2],[0.0,-3.0,2],[1.0,-3.0,2],[-2.0,-2.0,2],[2.0,-2.0,2],[-3.0,-1.0,2],[3.0,-1.0,2],[-3.0,0.0,2],[3.0,0.0,2],[-3.0,1.0,2],[3.0,1.0,2],[-2.0,2.0,2],[2.0,2.0,2],[-1.0,3.0,2],[0.0,3.0,2],[1.0,3.0,2],
      [-0.666667,-2.0,3],[0.666667,-2.0,3],[-2.0,-0.666667,3],[2.0,-0.666667,3],[-2.0,0.666667,3],[2.0,0.666667,3],[-0.666667,2.0,3],[0.666667,2.0,3],
      [-1.15,-1.15,4],[0.0,-1.15,4],[1.15,-1.15,4],[-1.15,0.0,4],[1.15,0.0,4],[-1.15,1.15,4],[0.0,1.15,4],[1.15,1.15,4],
      [-0.5,-0.5,5],[0.5,-0.5,5],[-0.5,0.5,5],[0.5,0.5,5]
    ],solution:[[77,46],[76,27],[51,44],[58,24],[78,70],[0,48],[54,50],[37,71],[53,29],[59,57],[52,41],[73,45],[43,40],[25,16],[69,4],[42,68],[19,62],[22,36],[15,34],[33,49],[21,6],[60,32],[79,20],[72,11],[47,23],[28,63],[64,1],[35,75],[31,12],[8,26],[65,61],[3,13],[74,56],[10,55],[14,66],[5,67],[30,38],[2,17],[39,7],[9,18]]},
  },
  pyramid:{
    gentle:{tiles:[
      [-2.6,-2.6,0],[-1.56,-2.6,0],[-0.52,-2.6,0],[0.52,-2.6,0],[1.56,-2.6,0],[2.6,-2.6,0],[-2.6,-1.56,0],[2.6,-1.56,0],[-2.6,-0.52,0],[2.6,-0.52,0],[-2.6,0.52,0],[2.6,0.52,0],[-2.6,1.56,0],[2.6,1.56,0],[-2.6,2.6,0],[-1.56,2.6,0],[-0.52,2.6,0],[0.52,2.6,0],[1.56,2.6,0],[2.6,2.6,0],
      [-1.65,-1.65,1],[0.0,-1.65,1],[1.65,-1.65,1],[-1.65,0.0,1],[1.65,0.0,1],[-1.65,1.65,1],[0.0,1.65,1],[1.65,1.65,1],
      [-1.0,-1.0,2],[0.0,-1.0,2],[1.0,-1.0,2],[-1.0,0.0,2],[1.0,0.0,2],[-1.0,1.0,2],[0.0,1.0,2],[1.0,1.0,2],
      [-0.5,-0.5,3],[0.5,-0.5,3],[-0.5,0.5,3],[0.5,0.5,3]
    ],solution:[[39,36],[38,28],[31,20],[33,0],[37,34],[1,25],[30,23],[12,26],[10,32],[22,15],[35,17],[29,27],[19,18],[13,14],[16,5],[24,4],[11,6],[9,21],[2,7],[3,8]]},
    steady:{tiles:[
      [-3.0,-3.0,0],[-2.0,-3.0,0],[-1.0,-3.0,0],[0.0,-3.0,0],[1.0,-3.0,0],[2.0,-3.0,0],[3.0,-3.0,0],[-3.0,-2.0,0],[3.0,-2.0,0],[-3.0,-1.0,0],[3.0,-1.0,0],[-3.0,0.0,0],[3.0,0.0,0],[-3.0,1.0,0],[3.0,1.0,0],[-3.0,2.0,0],[3.0,2.0,0],[-3.0,3.0,0],[-2.0,3.0,0],[-1.0,3.0,0],[0.0,3.0,0],[1.0,3.0,0],[2.0,3.0,0],[3.0,3.0,0],
      [-2.3,-2.3,1],[-0.766667,-2.3,1],[0.766667,-2.3,1],[2.3,-2.3,1],[-2.3,-0.766667,1],[2.3,-0.766667,1],[-2.3,0.766667,1],[2.3,0.766667,1],[-2.3,2.3,1],[-0.766667,2.3,1],[0.766667,2.3,1],[2.3,2.3,1],
      [-1.9,-1.9,2],[-0.633333,-1.9,2],[0.633333,-1.9,2],[1.9,-1.9,2],[-1.9,-0.633333,2],[1.9,-0.633333,2],[-1.9,0.633333,2],[1.9,0.633333,2],[-1.9,1.9,2],[-0.633333,1.9,2],[0.633333,1.9,2],[1.9,1.9,2],
      [-1.5,-1.5,3],[0.0,-1.5,3],[1.5,-1.5,3],[-1.5,0.0,3],[1.5,0.0,3],[-1.5,1.5,3],[0.0,1.5,3],[1.5,1.5,3],
      [-0.5,-0.5,4],[0.5,-0.5,4],[-0.5,0.5,4],[0.5,0.5,4]
    ],solution:[[54,50],[55,39],[47,27],[46,6],[59,53],[5,35],[48,34],[22,57],[49,21],[56,52],[41,36],[58,51],[40,43],[38,42],[31,28],[26,37],[23,14],[8,44],[4,29],[45,10],[16,33],[12,30],[20,13],[19,11],[9,25],[32,2],[3,18],[15,24],[0,1],[17,7]]},
    brave:{tiles:[
      [-4.025,-4.025,0],[-2.875,-4.025,0],[-1.725,-4.025,0],[-0.575,-4.025,0],[0.575,-4.025,0],[1.725,-4.025,0],[2.875,-4.025,0],[4.025,-4.025,0],[-4.025,-2.875,0],[4.025,-2.875,0],[-4.025,-1.725,0],[4.025,-1.725,0],[-4.025,-0.575,0],[4.025,-0.575,0],[-4.025,0.575,0],[4.025,0.575,0],[-4.025,1.725,0],[4.025,1.725,0],[-4.025,2.875,0],[4.025,2.875,0],[-4.025,4.025,0],[-2.875,4.025,0],[-1.725,4.025,0],[-0.575,4.025,0],[0.575,4.025,0],[1.725,4.025,0],[2.875,4.025,0],[4.025,4.025,0],
      [-3.06,-3.06,1],[-1.836,-3.06,1],[-0.612,-3.06,1],[0.612,-3.06,1],[1.836,-3.06,1],[3.06,-3.06,1],[-3.06,-1.836,1],[3.06,-1.836,1],[-3.06,-0.612,1],[3.06,-0.612,1],[-3.06,0.612,1],[3.06,0.612,1],[-3.06,1.836,1],[3.06,1.836,1],[-3.06,3.06,1],[-1.836,3.06,1],[-0.612,3.06,1],[0.612,3.06,1],[1.836,3.06,1],[3.06,3.06,1],
      [-2.095,-2.095,2],[-0.698333,-2.095,2],[0.698333,-2.095,2],[2.095,-2.095,2],[-2.095,-0.698333,2],[2.095,-0.698333,2],[-2.095,0.698333,2],[2.095,0.698333,2],[-2.095,2.095,2],[-0.698333,2.095,2],[0.698333,2.095,2],[2.095,2.095,2],
      [-1.745,-1.745,3],[-0.581667,-1.745,3],[0.581667,-1.745,3],[1.745,-1.745,3],[-1.745,-0.581667,3],[1.745,-0.581667,3],[-1.745,0.581667,3],[1.745,0.581667,3],[-1.745,1.745,3],[-0.581667,1.745,3],[0.581667,1.745,3],[1.745,1.745,3],
      [-0.745,-0.745,4],[0.745,-0.745,4],[-0.745,0.745,4],[0.745,0.745,4],
      [-0.5,-0.5,5],[0.5,-0.5,5],[-0.5,0.5,5],[0.5,0.5,5]
    ],solution:[[77,62],[76,50],[65,78],[53,63],[60,73],[72,79],[75,68],[31,51],[61,37],[33,70],[69,32],[64,48],[66,71],[67,52],[54,36],[13,6],[5,55],[9,59],[29,47],[7,35],[34,41],[12,4],[74,58],[56,17],[19,38],[11,49],[26,42],[46,39],[57,2],[45,21],[24,25],[14,44],[27,15],[28,23],[8,30],[3,40],[1,43],[10,20],[0,16],[18,22]]},
  },
  snake:{
    gentle:{tiles:[
      [0,0,0],[0,0,1],[0,0,2],[0,0,3],[1,0,0],[1,0,1],[1,0,2],[1,0,3],[2,0,0],[2,0,1],
      [2,0,2],[2,0,3],[2,1,0],[2,1,1],[2,1,2],[2,1,3],[2,2,0],[2,2,1],[2,2,2],[1,2,0],
      [1,2,1],[1,2,2],[0,2,0],[0,2,1],[0,2,2],[0,2,3],[0,3,0],[0,3,1],[0,3,2],[0,3,3],
      [0,4,0],[0,4,1],[0,4,2],[1,4,0],[1,4,1],[1,4,2],[0.5,4.0,3],[0.5,4.0,4],[1.5,2.0,3],[1.5,2.0,4]
    ],solution:[[37,7],[36,3],[11,2],[25,6],[39,1],[15,35],[24,14],[34,10],[32,13],[33,29],[31,23],[28,5],[4,22],[0,30],[27,38],[26,9],[12,21],[8,18],[20,17],[16,19]]},
    steady:{tiles:[
      [0,0,0],[0,0,1],[0,0,2],[0,0,3],[0,0,4],[1,0,0],[1,0,1],[1,0,2],[1,0,3],[2,0,0],
      [2,0,1],[2,0,2],[3,0,0],[3,0,1],[3,0,2],[3,1,0],[3,1,1],[3,1,2],[3,1,3],[3,2,0],
      [3,2,1],[3,2,2],[3,2,3],[2,2,0],[2,2,1],[2,2,2],[1,2,0],[1,2,1],[1,2,2],[0,2,0],
      [0,2,1],[0,2,2],[0,2,3],[0,2,4],[0,3,0],[0,3,1],[0,3,2],[0,3,3],[0,4,0],[0,4,1],
      [0,4,2],[0,4,3],[1,4,0],[1,4,1],[1,4,2],[1,4,3],[2,4,0],[2,4,1],[2,4,2],[2,4,3],
      [3,4,0],[3,4,1],[3,4,2],[3,4,3],[2.5,0.0,3],[3,2,4],[1.5,2.0,3],[2,4,4],[0.5,4.0,4],[3,4,4]
    ],solution:[[8,59],[53,57],[7,37],[54,18],[36,56],[52,58],[11,14],[10,51],[9,50],[45,6],[33,44],[17,4],[35,49],[41,32],[13,43],[25,34],[42,5],[16,3],[24,12],[2,28],[48,31],[47,1],[55,27],[23,40],[46,30],[39,26],[0,22],[21,15],[20,29],[19,38]]},
    brave:{tiles:[
      [0,0,0],[0,0,1],[0,0,2],[0,0,3],[0,0,4],[1,0,0],[1,0,1],[1,0,2],[1,0,3],[2,0,0],
      [2,0,1],[2,0,2],[3,0,0],[3,0,1],[3,0,2],[4,0,0],[4,0,1],[4,0,2],[4,0,3],[5,0,0],
      [5,0,1],[5,0,2],[5,1,0],[5,1,1],[5,1,2],[5,2,0],[5,2,1],[5,2,2],[5,2,3],[5,2,4],
      [4,2,0],[4,2,1],[4,2,2],[4,2,3],[4,2,4],[3,2,0],[3,2,1],[3,2,2],[3,2,3],[2,2,0],
      [2,2,1],[2,2,2],[2,2,3],[1,2,0],[1,2,1],[1,2,2],[1,2,3],[0,2,0],[0,2,1],[0,2,2],
      [0,2,3],[0,3,0],[0,3,1],[0,3,2],[0,3,3],[0,4,0],[0,4,1],[0,4,2],[0,4,3],[1,4,0],
      [1,4,1],[1,4,2],[1,4,3],[2,4,0],[2,4,1],[2,4,2],[2,4,3],[3,4,0],[3,4,1],[3,4,2],
      [3,4,3],[3,4,4],[4,4,0],[4,4,1],[4,4,2],[4,4,3],[2.5,0.0,3],[1,4,4],[5.0,0.5,3],[0,3,4]
    ],solution:[[76,34],[71,8],[29,7],[46,14],[79,4],[38,70],[42,33],[69,28],[58,37],[75,54],[57,50],[32,11],[78,6],[45,68],[10,18],[44,9],[41,36],[49,21],[5,67],[35,56],[13,40],[17,74],[20,48],[73,47],[3,27],[26,31],[12,77],[66,30],[65,62],[72,16],[25,53],[19,52],[24,39],[23,61],[22,60],[55,2],[51,59],[15,1],[43,64],[0,63]]},
  },
  // The bridge deck spans the open gap between two separate supports.
  bridge:{
    gentle:{tiles:[
      [-2.5,-0.5,0],[-2.5,0.5,0],[2.5,-0.5,0],[2.5,0.5,0],
      [-2.5,-0.5,1],[-2.5,0.5,1],[2.5,-0.5,1],[2.5,0.5,1],
      [-2.5,-0.5,2],[-2.5,0.5,2],[-1.5,-0.5,2],[-1.5,0.5,2],[-0.5,-0.5,2],[-0.5,0.5,2],[0.5,-0.5,2],[0.5,0.5,2],[1.5,-0.5,2],[1.5,0.5,2],[2.5,-0.5,2],[2.5,0.5,2],
      [-2.0,-0.5,3],[-2.0,0.5,3],[-1.0,-0.5,3],[-1.0,0.5,3],[0.0,-0.5,3],[0.0,0.5,3],[1.0,-0.5,3],[1.0,0.5,3],[2.0,-0.5,3],[2.0,0.5,3],
      [-1.0,-0.5,4],[-1.0,0.5,4],[0.0,-0.5,4],[0.0,0.5,4],[1.0,-0.5,4],[1.0,0.5,4],
      [-0.5,-0.5,5],[-0.5,0.5,5],[0.5,-0.5,5],[0.5,0.5,5]
    ],solution:[[38,21],[37,9],[28,5],[31,1],[39,34],[18,20],[36,23],[26,33],[11,30],[22,29],[35,32],[24,16],[19,8],[6,12],[2,14],[10,4],[7,27],[0,3],[25,17],[13,15]]},
    steady:{tiles:[
      [-3.0,-1.0,0],[-3.0,0.0,0],[-3.0,1.0,0],[3.0,-1.0,0],[3.0,0.0,0],[3.0,1.0,0],
      [-3.0,-1.0,1],[-3.0,0.0,1],[-3.0,1.0,1],[3.0,-1.0,1],[3.0,0.0,1],[3.0,1.0,1],
      [-3.0,-1.0,2],[-3.0,0.0,2],[-3.0,1.0,2],[-2.0,-1.0,2],[-2.0,0.0,2],[-2.0,1.0,2],[-1.0,-1.0,2],[-1.0,0.0,2],[-1.0,1.0,2],[0.0,-1.0,2],[0.0,0.0,2],[0.0,1.0,2],[1.0,-1.0,2],[1.0,0.0,2],[1.0,1.0,2],[2.0,-1.0,2],[2.0,0.0,2],[2.0,1.0,2],[3.0,-1.0,2],[3.0,0.0,2],[3.0,1.0,2],
      [-1.5,-1.0,3],[-1.5,0.0,3],[-1.5,1.0,3],[-0.5,-1.0,3],[-0.5,0.0,3],[-0.5,1.0,3],[0.5,-1.0,3],[0.5,0.0,3],[0.5,1.0,3],[1.5,-1.0,3],[1.5,0.0,3],[1.5,1.0,3],
      [-1.0,-1.0,4],[-1.0,0.0,4],[-1.0,1.0,4],[0.0,-1.0,4],[0.0,0.0,4],[0.0,1.0,4],[1.0,-1.0,4],[1.0,0.0,4],[1.0,1.0,4],
      [-0.5,-1.0,5],[-0.5,0.0,5],[-0.5,1.0,5],[0.5,-1.0,5],[0.5,0.0,5],[0.5,1.0,5]
    ],solution:[[54,14],[45,8],[13,2],[32,12],[57,6],[30,51],[31,11],[48,7],[56,55],[36,9],[59,58],[52,42],[53,46],[49,39],[40,24],[37,21],[5,47],[1,35],[0,44],[29,43],[10,17],[28,4],[50,25],[27,41],[22,3],[38,26],[20,23],[33,34],[15,16],[19,18]]},
    brave:{tiles:[
      [-2.5,-1.5,0],[-2.5,-0.5,0],[-2.5,0.5,0],[-2.5,1.5,0],[2.5,-1.5,0],[2.5,-0.5,0],[2.5,0.5,0],[2.5,1.5,0],
      [-2.5,-1.56,1],[-2.5,-0.52,1],[-2.5,0.52,1],[-2.5,1.56,1],[2.5,-1.56,1],[2.5,-0.52,1],[2.5,0.52,1],[2.5,1.56,1],
      [-2.5,-1.62,2],[-2.5,-0.54,2],[-2.5,0.54,2],[-2.5,1.62,2],[2.5,-1.62,2],[2.5,-0.54,2],[2.5,0.54,2],[2.5,1.62,2],
      [-2.5,-1.68,3],[-2.5,-0.56,3],[-2.5,0.56,3],[-2.5,1.68,3],[-1.5,-1.68,3],[-1.5,-0.56,3],[-1.5,0.56,3],[-1.5,1.68,3],[-0.5,-1.68,3],[-0.5,-0.56,3],[-0.5,0.56,3],[-0.5,1.68,3],[0.5,-1.68,3],[0.5,-0.56,3],[0.5,0.56,3],[0.5,1.68,3],[1.5,-1.68,3],[1.5,-0.56,3],[1.5,0.56,3],[1.5,1.68,3],[2.5,-1.68,3],[2.5,-0.56,3],[2.5,0.56,3],[2.5,1.68,3],
      [-2.0,-1.74,4],[-2.0,-0.58,4],[-2.0,0.58,4],[-2.0,1.74,4],[-1.0,-1.74,4],[-1.0,-0.58,4],[-1.0,0.58,4],[-1.0,1.74,4],[0.0,-1.74,4],[0.0,-0.58,4],[0.0,0.58,4],[0.0,1.74,4],[1.0,-1.74,4],[1.0,-0.58,4],[1.0,0.58,4],[1.0,1.74,4],[2.0,-1.74,4],[2.0,-0.58,4],[2.0,0.58,4],[2.0,1.74,4],
      [-1.0,-1.8,5],[-1.0,-0.6,5],[-1.0,0.6,5],[-1.0,1.8,5],[0.0,-1.8,5],[0.0,-0.6,5],[0.0,0.6,5],[0.0,1.8,5],[1.0,-1.8,5],[1.0,-0.6,5],[1.0,0.6,5],[1.0,1.8,5]
    ],solution:[[73,64],[72,48],[56,44],[68,50],[78,20],[65,75],[59,52],[71,45],[79,67],[49,70],[76,77],[57,60],[74,51],[28,24],[69,16],[54,63],[21,26],[43,13],[39,36],[55,58],[25,8],[66,62],[32,18],[53,12],[30,5],[47,31],[29,33],[10,61],[42,34],[46,41],[4,23],[38,17],[37,35],[40,9],[1,27],[2,0],[19,15],[11,22],[14,3],[7,6]]},
  },
  // Each higher V flares outward, with a forward lean to balance exposure.
  v:{
    gentle:{tiles:[
      [-0.5,0,0],[-1.0,-1,0],[0.5,0,0],[1.0,-1,0],
      [-0.5,0.5,1],[-1.0,-0.5,1],[-1.5,-1.5,1],[0.5,0.5,1],[1.0,-0.5,1],[1.5,-1.5,1],
      [-0.5,1,2],[-1.0,0,2],[-1.5,-1,2],[-2.0,-2,2],[0.5,1,2],[1.0,0,2],[1.5,-1,2],[2.0,-2,2],
      [-0.5,2,3],[-1.0,1,3],[-1.5,0,3],[-2.0,-1,3],[-2.5,-2,3],[0.5,2,3],[1.0,1,3],[1.5,0,3],[2.0,-1,3],[2.5,-2,3],
      [-0.5,3,4],[-1.0,2,4],[-1.5,1,4],[-2.0,0,4],[-2.5,-1,4],[-3.0,-2,4],[0.5,3,4],[1.0,2,4],[1.5,1,4],[2.0,0,4],[2.5,-1,4],[3.0,-2,4]
    ],solution:[[38,36],[37,26],[34,25],[30,16],[29,39],[28,19],[10,33],[24,32],[15,21],[14,31],[18,20],[35,22],[7,11],[12,13],[4,27],[8,5],[6,17],[1,9],[2,0],[3,23]]},
    steady:{tiles:[
      [-0.5,0,0],[-1.0,-1,0],[-1.5,-2,0],[-2.0,-3,0],[0.5,0,0],[1.0,-1,0],[1.5,-2,0],[2.0,-3,0],
      [-0.5,0.5,1],[-1.0,-0.5,1],[-1.5,-1.5,1],[-2.0,-2.5,1],[-2.5,-3.5,1],[0.5,0.5,1],[1.0,-0.5,1],[1.5,-1.5,1],[2.0,-2.5,1],[2.5,-3.5,1],
      [-0.5,1.5,2],[-1.0,0.5,2],[-1.5,-0.5,2],[-2.0,-1.5,2],[-2.5,-2.5,2],[-3.0,-3.5,2],[0.5,1.5,2],[1.0,0.5,2],[1.5,-0.5,2],[2.0,-1.5,2],[2.5,-2.5,2],[3.0,-3.5,2],
      [-0.5,2.5,3],[-1.0,1.5,3],[-1.5,0.5,3],[-2.0,-0.5,3],[-2.5,-1.5,3],[-3.0,-2.5,3],[-3.5,-3.5,3],[0.5,2.5,3],[1.0,1.5,3],[1.5,0.5,3],[2.0,-0.5,3],[2.5,-1.5,3],[3.0,-2.5,3],[3.5,-3.5,3],
      [-0.5,3.5,4],[-1.0,2.5,4],[-1.5,1.5,4],[-2.0,0.5,4],[-2.5,-0.5,4],[-3.0,-1.5,4],[-3.5,-2.5,4],[-4.0,-3.5,4],[0.5,3.5,4],[1.0,2.5,4],[1.5,1.5,4],[2.0,0.5,4],[2.5,-0.5,4],[3.0,-1.5,4],[3.5,-2.5,4],[4.0,-3.5,4]
    ],solution:[[57,46],[56,31],[47,58],[32,42],[40,54],[18,28],[48,41],[27,53],[44,19],[51,50],[36,26],[52,49],[59,35],[38,37],[43,34],[22,23],[33,16],[14,11],[55,8],[29,45],[15,21],[10,20],[5,12],[17,6],[39,3],[30,2],[25,7],[9,13],[1,0],[4,24]]},
    brave:{tiles:[
      [-0.5,0,0],[-1.0,-1,0],[-1.5,-2,0],[-2.0,-3,0],[-2.5,-4,0],[-3.0,-5,0],[0.5,0,0],[1.0,-1,0],[1.5,-2,0],[2.0,-3,0],[2.5,-4,0],[3.0,-5,0],
      [-0.5,1,1],[-1.0,0,1],[-1.5,-1,1],[-2.0,-2,1],[-2.5,-3,1],[-3.0,-4,1],[-3.5,-5,1],[0.5,1,1],[1.0,0,1],[1.5,-1,1],[2.0,-2,1],[2.5,-3,1],[3.0,-4,1],[3.5,-5,1],
      [-0.5,2,2],[-1.0,1,2],[-1.5,0,2],[-2.0,-1,2],[-2.5,-2,2],[-3.0,-3,2],[-3.5,-4,2],[-4.0,-5,2],[0.5,2,2],[1.0,1,2],[1.5,0,2],[2.0,-1,2],[2.5,-2,2],[3.0,-3,2],[3.5,-4,2],[4.0,-5,2],
      [-0.5,3,3],[-1.0,2,3],[-1.5,1,3],[-2.0,0,3],[-2.5,-1,3],[-3.0,-2,3],[-3.5,-3,3],[-4.0,-4,3],[-4.5,-5,3],[0.5,3,3],[1.0,2,3],[1.5,1,3],[2.0,0,3],[2.5,-1,3],[3.0,-2,3],[3.5,-3,3],[4.0,-4,3],[4.5,-5,3],
      [-0.5,4,4],[-1.0,3,4],[-1.5,2,4],[-2.0,1,4],[-2.5,0,4],[-3.0,-1,4],[-3.5,-2,4],[-4.0,-3,4],[-4.5,-4,4],[-5.0,-5,4],[0.5,4,4],[1.0,3,4],[1.5,2,4],[2.0,1,4],[2.5,0,4],[3.0,-1,4],[3.5,-2,4],[4.0,-3,4],[4.5,-4,4],[5.0,-5,4]
    ],solution:[[74,77],[61,62],[42,65],[57,43],[75,71],[79,69],[46,72],[70,54],[76,68],[39,60],[50,78],[36,56],[51,49],[23,52],[59,55],[26,41],[64,67],[9,20],[45,33],[58,73],[25,32],[34,63],[40,66],[38,47],[29,18],[44,22],[6,14],[53,24],[48,11],[27,8],[5,31],[16,10],[3,17],[30,35],[12,19],[28,1],[4,13],[37,0],[21,15],[7,2]]},
  },
};
const pairCounts=Object.freeze({gentle:20,steady:30,brave:40});
const overlap=(a,b)=>Math.abs(a.x-b.x)<.99&&Math.abs(a.y-b.y)<.99;
function isFree(tile,tiles){
  return !tile.removed&&!tiles.some(other=>!other.removed&&other.z>tile.z&&overlap(tile,other));
}
function supportedPositions(below){
  const candidates=new Map();
  for(const tile of below)for(const dx of [-.5,0,.5])for(const dy of [-.5,0,.5]){
    const x=tile.x+dx,y=tile.y+dy;
    const support=below.reduce((area,t)=>area+Math.max(0,1-Math.abs(t.x-x))*Math.max(0,1-Math.abs(t.y-y)),0);
    if(support===1)candidates.set(x+','+y,{x,y});
  }
  return [...candidates.values()];
}
function layoutSlots(id,pace){
  const layout=layouts.find(l=>l.id===id);
  if(!layout||!pairCounts[pace])throw new Error('Okänd klossbana eller svårighet.');
  return layoutBoards[id][pace].tiles.map(([x,y,z],id)=>({x,y,z,id}));
}
function removalOrder(slots,random=Math.random){
  // Try varied paths through the stack before using the verified solution.
  // Odd-sized tiers and hollow shells cannot be solved by peeling whole layers.
  for(let attempt=0;attempt<16;attempt++){
    const tiles=slots.map(p=>({...p,removed:false})),order=[];
    while(order.length*2<tiles.length){
      const free=tiles.filter(t=>isFree(t,tiles));
      if(free.length<2)break;
      const [a,b]=shuffle(free,random);a.removed=b.removed=true;order.push([a.id,b.id]);
    }
    if(order.length*2===tiles.length)return order;
  }
  const board=Object.values(layoutBoards).flatMap(paces=>Object.values(paces)).find(board=>
    board.tiles.length===slots.length&&board.tiles.every(([x,y,z],i)=>slots[i].x===x&&slots[i].y===y&&slots[i].z===z));
  return board?board.solution.map(([a,b])=>[slots[a].id,slots[b].id]):null;
}
const readingKey=text=>String(text).normalize('NFC').toLocaleLowerCase('sv-SE').trim().replace(/\s+/g,' ');
const letterSpeech=(text,lang)=>/^\p{Script=Latin}$/u.test(text.normalize('NFC'))?{text:text.toLocaleUpperCase(lang),lang}:null;
function pairFor(item,mode,random,lang){
  if(SC.isMath(mode)){
    const problem=SC.makeMath(item.answer,random,SC.mathLevel(mode));
    return {problem,answer:String(problem.answer),key:'math:'+problem.answer};
  }
  if(SC.isChinese(mode)){
    if(!item.hint)throw new Error('Uppgiften saknar pinyin.');
    const chinese={pinyin:item.hint,translation:item.translation?.trim()||''};
    const speech=/^\p{Script=Han}{1,2}$/u.test(item.label)?{text:item.label,lang:SC.modes[mode].lang}:null;
    return {problem:{label:item.label,speech,tooltip:chinese.translation},answer:item.hint,chinese,key:'pinyin:'+readingKey(item.hint)};
  }
  if(mode==='bopomofo'){
    const pinyin=SC.bopomofoPinyin[item.label];
    if(!pinyin)throw new Error('Bopomofotecknet saknar pinyin.');
    return {problem:{label:item.label,speech:{audio:'resources/audio/bopomofo/'+item.label.codePointAt(0).toString(16)+'.mp3'}},answer:pinyin,key:'bopomofo:'+item.label};
  }
  if(SC.isWordPair(mode)){
    const promptLang=SC.isTranslation(mode)?(item.answerLang==='en-US'?'sv-SE':'en-US'):item.answerLang;
    return {problem:{label:item.label.toLocaleUpperCase('sv-SE'),speech:letterSpeech(item.label,promptLang)},answer:item.answer.toLocaleLowerCase('sv-SE'),answerSpeech:letterSpeech(item.answer,item.answerLang),key:'word:'+SC.pairAnswerKey(item.answer,item.answerLang)};
  }
  const speech=letterSpeech(item.label,lang);
  return {problem:{label:item.label.toLocaleUpperCase('sv-SE'),speech},answer:item.label.toLocaleLowerCase('sv-SE'),answerSpeech:speech,key:'case:'+readingKey(item.label)};
}
function makePairs(items,mode,count,random,lang){
  let pool=items;
  if(SC.isWordPair(mode)){
    // Avoid overlapping synonym/translation answer sets across different keys.
    // Every displayed valid answer stays interchangeable; no invisible pair IDs.
    pool=[];const used=new Set();
    for(const item of shuffle(items,random)){
      const keys=item.answerKeys||[SC.pairAnswerKey(item.answer,item.answerLang)];
      if(keys.some(k=>used.has(k)))continue;
      pool.push(item);keys.forEach(k=>used.add(k));
    }
  }
  if(!pool.length)throw new Error('Övningen behöver minst ett par.');
  const pairs=[];let bag=[];
  while(pairs.length<count){if(!bag.length)bag=shuffle(pool,random);pairs.push(pairFor(bag.pop(),mode,random,lang));}
  return pairs;
}
function matches(a,b){return a!==b&&a.side!==b.side&&a.key===b.key;}
function score(pairs,seconds){
  // No deadline. The completion bonus declines with average seconds per pair.
  return pairs*100+Math.round(pairs*400/(1+Math.max(0,seconds)/(pairs*6)));
}
class KlossarGame{
  constructor({queue=new SC.AnswerQueue(),onEvent=()=>{},random=Math.random}={}){Object.assign(this,{queue,onEvent,random,width:1000,height:700});this.menu();}
  emit(type,detail={}){this.onEvent({type,...detail});}
  menu(){Object.assign(this,{state:'menu',clock:0,elapsed:0,score:0,hits:0,shots:0,mistakes:0,reshuffles:0,selected:[],tiles:[],effects:[],feedback:null,hint:null,hintPenalty:0,revision:0});}
  start({mode='swedish',pace='gentle',lang='sv-SE',items=null,layout=null}={}){
    this.menu();this.queue.clear();Object.assign(this,{mode,pace,lang,uppercase:false,chineseDisplay:'pinyin'});
    this.total=pairCounts[pace];if(!this.total)throw new Error('Okänd svårighet.');
    this.items=SC.beginPractice(this,items);
    this.layout=layouts.find(l=>l.id===layout)||layouts[Math.floor(this.random()*layouts.length)];
    this.slots=layoutSlots(this.layout.id,pace);this.order=removalOrder(this.slots,this.random);
    if(!this.order)throw new Error('Kunde inte lägga ut klossarna.');
    const pairs=makePairs(this.items,mode,this.total,this.random,lang);
    this.tiles=this.slots.map(p=>({...p,removed:false}));
    this.order.forEach(([first,second],i)=>{
      const [a,b]=this.random()<.5?[first,second]:[second,first],p=pairs[i];
      Object.assign(this.tiles[a],{side:'problem',key:p.key,item:p.problem,chinese:p.chinese});
      Object.assign(this.tiles[b],{side:'answer',key:p.key,item:{label:p.answer,speech:p.answerSpeech},chinese:p.chinese});
    });
    this.state='playing';this.revision++;this.emit('start');
  }
  resize(width,height){this.width=width;this.height=height;}
  getTargets(){return this.tiles.filter(t=>!t.removed);}
  getAvailableTargets(){return this.getTargets().filter(t=>isFree(t,this.tiles));}
  getActiveEntries(){return [];}
  free(tile){return this.tiles.includes(tile)&&isFree(tile,this.tiles);}
  hasMove(){const free=this.getAvailableTargets();return free.some((a,i)=>free.slice(i+1).some(b=>matches(a,b)));}
  requestHint(){
    if(this.state!=='playing'||this.feedback||this.hint)return false;
    const free=this.getAvailableTargets();
    // Prefer a match for the selected tile, if one is currently available.
    const preferred=this.selected[0];
    const a=preferred&&free.some(b=>matches(preferred,b))?preferred:free.find(a=>free.some(b=>matches(a,b)));
    if(!a)return false;
    const b=free.find(b=>matches(a,b));
    this.selected=[];this.hint=[a.id,b.id];this.hintPenalty+=100;this.score-=100;this.revision++;
    this.emit('klossar-hint');return true;
  }
  canTranslate(){return SC.isChinese(this.mode)&&this.tiles.every(t=>!t.chinese||!!t.chinese.translation);}
  updateChineseTile(tile){
    if(!tile.chinese)return;
    const display=this.chineseDisplay;
    tile.key=display+':'+readingKey(tile.chinese[display]);
    if(tile.side==='answer')tile.item.label=tile.chinese[display];
    else tile.item.tooltip=tile.chinese[display==='pinyin'?'translation':'pinyin'];
  }
  setChineseDisplay(display){
    if(!SC.isChinese(this.mode)||this.state!=='playing'||!['pinyin','translation'].includes(display)||display===this.chineseDisplay||display==='translation'&&!this.canTranslate())return false;
    this.chineseDisplay=display;this.selected=[];this.feedback=null;this.hint=null;
    this.tiles.forEach(tile=>this.updateChineseTile(tile));this.revision++;
    if(!this.hasMove())this.reshuffle();
    this.emit('klossar-display');return true;
  }
  select(id){
    if(this.state!=='playing'||this.feedback)return false;
    const tile=this.tiles.find(t=>t.id===id);
    if(!tile||!this.free(tile))return false;
    this.hint=null;
    const selected=this.selected.indexOf(tile);
    if(selected>=0){this.selected.splice(selected,1);this.revision++;return true;}
    this.selected.push(tile);this.revision++;
    if(this.selected.length<2){this.emit('klossar-select',{tile});this.emit('lock');return true;}
    const [a,b]=this.selected;this.shots++;
    if(matches(a,b)){
      if(a.chinese&&a.chinese!==b.chinese){
        const [problem,answer]=a.side==='problem'?[a,b]:[b,a];
        // Equal pinyin can have different meanings (他/她/它). Rebind the
        // surviving answer so both display modes retain complete pairs.
        const companion=this.tiles.find(t=>!t.removed&&t.side==='answer'&&t.chinese===problem.chinese);
        companion.chinese=answer.chinese;this.updateChineseTile(companion);
      }
      a.removed=b.removed=true;this.selected=[];this.hits++;this.score=this.hits*100-this.hintPenalty;
      this.effects.push({id:a.id,x:a.x,y:a.y,z:a.z,age:0},{id:b.id,x:b.x,y:b.y,z:b.z,age:0});
      this.emit('hit',{target:a,points:100});
      if(this.hits===this.total){this.score=Math.max(0,score(this.total,this.elapsed)-this.hintPenalty);this.state='celebrating';this.endingLeft=.85;this.emit('celebrate');}
      else if(!this.hasMove())this.reshuffle();
    }else{this.mistakes++;this.feedback={ids:[a.id,b.id],left:.42};this.emit('miss');}
    this.emit('klossar-select',{tile});
    return true;
  }
  reshuffle(){
    const remaining=this.getTargets(),groups=new Map();
    for(const tile of remaining){if(!groups.has(tile.key))groups.set(tile.key,{problem:[],answer:[]});groups.get(tile.key)[tile.side].push(tile);}
    const pairs=[];for(const group of groups.values())while(group.problem.length)pairs.push([group.problem.pop(),group.answer.pop()]);
    // A valid cross-match can leave a single stack with no free pair. Moving the
    // remaining tiles to the suffix of the original solution also repairs that
    // geometry, preserving every remaining problem/answer and the pair count.
    const order=this.order.slice(-pairs.length),mixed=shuffle(pairs,this.random);
    order.forEach(([a,b],i)=>{const pair=this.random()<.5?mixed[i]:[...mixed[i]].reverse();pair.forEach((tile,j)=>{const slot=this.slots[j?b:a];Object.assign(tile,{x:slot.x,y:slot.y,z:slot.z});});});
    this.selected=[];this.hint=null;this.reshuffles++;this.revision++;this.emit('klossar-shuffle');
  }
  pause(){if(this.state==='playing'){this.state='paused';this.emit('pause');}}
  resume(){if(this.state==='paused'){this.state='playing';this.emit('resume');}}
  update(dt){
    if(!Number.isFinite(dt)||dt<=0||!['playing','celebrating'].includes(this.state))return;
    this.clock+=dt;
    for(const effect of this.effects)effect.age+=dt;
    this.effects=this.effects.filter(e=>e.age<.85);
    if(this.state==='celebrating'){
      this.endingLeft-=dt;
      if(this.endingLeft<=0){this.state='won';this.emit('end',{won:true,score:this.score,hits:this.hits,shots:this.shots,elapsed:this.elapsed});}
      return;
    }
    this.elapsed+=dt;
    if(this.feedback){this.feedback.left-=dt;if(this.feedback.left<=0){this.feedback=null;this.selected=[];this.revision++;}}
  }
}
Object.assign(SC,{KlossarGame,makeMatchingPairs:makePairs,klossarLayouts:layouts,klossarPairCounts:pairCounts,klossarLayout:layoutSlots,klossarSupportedPositions:supportedPositions,klossarRemovalOrder:removalOrder,klossarIsFree:isFree,klossarMatches:matches,klossarScore:score});
})(globalThis);
