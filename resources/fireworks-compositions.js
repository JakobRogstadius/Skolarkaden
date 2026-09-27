/* Fresh visual studies built on the original particle model.
 * Research and the distinction between observations and artistic choices are
 * documented in dev/highscore-fireworks.md. All luminous material falls under
 * gravity; curl shapes launch distributions, not an upward force field. */
(function(root){
  'use strict';
  const TAU=Math.PI*2;
  const STUDIES={
    bloom:{label:'Solblomma',detail:'Oregelbundna kronblad öppnar sig kring en spiral av gyllene pollen.',rise:255},
    corona:{label:'Solbågar',detail:'Silkestunna bågar stiger, vänder och löses upp i pärlande regn.',rise:310},
    nebula:{label:'Slöjnebulosa',detail:'Flätade trådar av turkos, pärlemor och glödande koppar faller isär.',rise:260},
    seeds:{label:'Frökapslar',detail:'Gyllene kapslar brister och släpper färgade, snurrande frön.',rise:245},
    lanterns:{label:'Ljusvandring',detail:'Ljusvågor vandrar genom långsamt sjunkande moln av glödande pärlor.',rise:210}
  };
  const mix=(a,b,t)=>a.map((v,i)=>v*(1-t)+b[i]*t);
  function compose(type,{seed,size=1,position=[0,450,0],palette,wind=4,rng,motion,flight}){
    const random=rng(seed^0x638ca0b1),r=(a,b)=>a+(b-a)*random(),n=(a,b)=>Math.floor(r(a,b+1)),stars=[];
    const gold=[1,.62,.21],pearl=[.73,.87,1],colors=palette,primary=colors[n(0,colors.length-1)],accent=colors[n(0,colors.length-1)];
    const rotation=r(-.28,.28),cs=Math.cos(rotation),sn=Math.sin(rotation),depth=r(-.3,.3);
    const turn=v=>[v[0]*cs-v[1]*sn,v[0]*sn+v[1]*cs,v[2]+v[0]*depth];
    const add=(velocity,color,life,opts={},origin=position)=>{
      const s={parent:-1,p:[...origin],v:velocity.map(v=>v*size),color,life,opts:{delay:0,drag:.48,gravity:25,rate:9,trailLife:.9,trailMin:.2,width:4,tail:color,end:color,shimmer:.3,flutter:[0,0,.3,0],light:[0,0,0,1],...opts}};
      s.opts.flutter=[...s.opts.flutter];s.opts.flutter[0]*=size;stars.push(s);return s;
    };
    const at=(s,t)=>flight(s.p,s.v,t,s.opts.drag,s.opts.gravity,wind,s.opts.flutter);
    const release=(parent,t,velocity,color,life,opts={})=>{
      const m=at(parent,t),{inherit=.4,...particleOpts}=opts;
      const child=add(velocity.map((v,i)=>v+m.v[i]*inherit/size),color,life,{...particleOpts,delay:parent.opts.delay+t},m.p);
      child.parent=stars.indexOf(parent);child.releaseTime=t;return child;
    };
    // Curl of a smooth 2D scalar potential. Analytic partial derivatives keep
    // the field divergence-free. It is sampled in LAUNCH-VELOCITY space.
    function curl(x,y,phase){
      const a=x*.016+phase,b=y*.014-phase*.3,c=x*.029+y*.023+phase*1.7;
      return [Math.sin(a)*Math.cos(b)+.46*Math.cos(c),-(8/7)*Math.cos(a)*Math.sin(b)-.58*Math.cos(c)];
    }
    if(type==='bloom'){
      const petals=n(8,18),whorls=n(2,3),phase=r(0,TAU),width=r(.55,1.2),flatten=r(.65,1.05),skew=r(-.18,.18);
      const crest=random()<.38?r(15,55):0;
      for(let layer=0;layer<whorls;layer++)for(let petal=0;petal<petals;petal++){
        const angle=phase+petal/petals*TAU+layer*2.39996323,reach=r(150,222)*Math.pow(.74,layer);
        const spread=TAU/petals*width*r(.65,1.3),bend=r(-.17,.17),opening=.11+layer*.22+r(0,.12),samples=n(18,25),sharpness=r(.5,1.5);
        const tint=mix(primary,layer%2?accent:gold,r(.12,.5));
        for(let j=0;j<samples;j++){
          const u=j/(samples-1),radius=25+reach*Math.pow(Math.sin(Math.PI*u),sharpness);
          const theta=angle+(u-.5)*spread+bend*Math.sin(Math.PI*u);
          const v=turn([Math.cos(theta)*radius+skew*radius+crest*Math.tanh(Math.cos(theta)*3),Math.sin(theta)*radius*flatten,r(-7,7)+layer*12]);
          const life=r(3.5,4.7),centre=motion(position,[0,9*size,0],opening,.35,25,wind).p;
          const petalStar=add(v,mix(tint,pearl,.14),life,{delay:opening,drag:.53,gravity:25,width:r(3.3,4.3),rate:5,trailLife:.72,tail:tint,end:gold,shimmer:.45,tag:'petal'},centre);
          if(layer===0&&j===Math.floor(samples*.5))for(let q=0;q<5;q++)release(petalStar,r(1.65,2.1),[r(-15,15),r(-20,8),r(-10,10)],mix(tint,pearl,.6),r(2.3,3.6),{inherit:.65,drag:.9,gravity:17,rate:3,trailLife:.5,width:r(2.4,3.5),end:gold,tag:'shed'});
        }
      }
      // Phyllotaxis is perturbed and warped as one seed head, not a perfect logo.
      const count=n(170,235),stretch=r(.78,1.15),warp=r(.03,.19);
      for(let i=0;i<count;i++){
        const a=i*2.3999632297+phase,rad=69*Math.sqrt((i+.5)/count),offset=1+warp*Math.cos(a*3+phase);
        add(turn([Math.cos(a)*rad*stretch*offset,Math.sin(a)*rad/stretch,r(-18,18)]),i%7?gold:pearl,r(3.1,4.2),{delay:.36,drag:.72,gravity:25,width:r(2.3,3.9),rate:0,shimmer:.7,tag:'pollen'});
      }
    }else if(type==='corona'){
      const arches=n(6,9),spread=r(190,240),lean=r(-20,20),height=r(172,205);
      for(let j=0;j<arches;j++){
        const x=j/(arches-1)*2-1,v=[x*spread+lean,height*(1-.16*x*x)*r(.92,1.07),r(-45,45)];
        const tint=mix(gold,primary,.15+.65*j/(arches-1));
        for(let strand=0;strand<4;strand++)for(let bead=0;bead<5;bead++){
          const delay=bead*.12+Math.abs(x)*.15,life=r(4.5,5.3),source=motion(position,[0,0,0],delay,.4,25,wind).p;
          const s=add(v.map((q,k)=>q+r(-.9,.9)*(k===2?5:1)),tint,life,{delay,drag:.22,gravity:57,width:3.1,rate:24,trailLife:3.0,trailMin:1.2,tail:tint,end:pearl,shimmer:.25,tag:'arch'},source);
          if(strand===0&&bead%2===0){
            const fall=r(1.9,2.6);
            for(let k=0;k<4;k++)release(s,fall,[r(-12,12),r(-25,-8),r(-9,9)],mix(primary,pearl,.65),r(2.4,3.4),{inherit:.25,drag:.45,gravity:37,width:r(3,4.7),rate:13,trailLife:1.2,tail:gold,end:gold,tag:'rain'});
          }
        }
      }
    }else if(type==='nebula'){
      const filaments=n(19,26),steps=n(42,58),phase=r(0,TAU),curlScale=r(2.7,4.2),tilt=r(.5,.85);
      for(let f=0;f<filaments;f++){
        const a=f/filaments*TAU,band=f%3;let x=Math.cos(a)*r(70,135),y=Math.sin(a)*r(85,145);
        const tint=mix(primary,band===0?gold:pearl,band===0?.62:.45),life=r(4.2,5.6);
        for(let k=0;k<steps;k++){
          const flow=curl(x,y,phase),dt=curlScale*(f%2?1:-1);x+=flow[0]*dt;y+=flow[1]*dt;
          const vel=turn([x,y*tilt+24,Math.sin(k*.065+a)*45]);
          add(vel,mix(tint,accent,k/steps*.45),life+r(-.2,.2),{delay:band*.12,drag:.53,gravity:23,width:r(2.0,3.2),rate:2.7,trailLife:1.2,trailMin:.65,tail:tint,end:band===0?gold:primary,shimmer:.6,light:[0,0,0,.82],tag:'filament'});
        }
      }
      for(let i=0;i<120;i++)add([r(-150,150),r(-70,120),r(-90,90)],mix(primary,accent,random()),r(3.7,5.4),{drag:.65,gravity:23,width:r(1.6,2.7),rate:0,light:[0,0,0,.32],tag:'dust'});
    }else if(type==='seeds'){
      const pods=n(7,11),phase=r(0,TAU);
      for(let j=0;j<pods;j++){
        const a=phase+j/pods*TAU,burst=r(1.1,1.9),v=turn([Math.cos(a)*r(110,150),Math.sin(a)*r(75,130)+55,r(-60,60)]);
        const pod=add(v,gold,burst,{drag:.37,gravity:30,rate:28,trailLife:1.1,width:5,tag:'pod'});
        const seeds=n(5,9),direction=r(0,TAU),spin=random()<.5?-1:1;
        for(let i=0;i<seeds;i++){
          const angle=direction+i/seeds*TAU,sp=r(33,64),tint=colors[(j+i)%colors.length];
          const seed=release(pod,burst,[Math.cos(angle)*sp,Math.sin(angle)*sp*.7-8,r(-18,18)],mix(tint,pearl,.2),r(4.8,6.3),{
            inherit:.5,drag:r(.48,.7),gravity:r(20,28),rate:r(52,70),trailLife:r(1.9,2.7),trailMin:.8,width:r(3.6,5),tail:mix(tint,gold,.3),end:gold,
            flutter:[r(10,19),spin*r(3.8,6.5),r(.11,.22),r(0,TAU)],shimmer:.6,tag:'seed'});
          if(i%3===0)for(let k=0;k<5;k++)release(seed,r(2.4,3.4),[r(-13,13),r(-12,8),r(-13,13)],pearl,r(.6,1.3),{inherit:.55,drag:1.1,gravity:20,rate:0,width:2.9,end:gold,tag:'glitter'});
        }
      }
    }else if(type==='lanterns'){
      const clusters=n(3,5),phase=r(0,TAU),period=r(2.3,3.1),lean=r(-25,25);
      for(let cluster=0;cluster<clusters;cluster++){
        const centre=[(cluster/(clusters-1)-.5)*280+lean,r(50,125),r(-80,80)],tint=colors[cluster%colors.length],count=n(75,105);
        for(let i=0;i<count;i++){
          const a=r(0,TAU),radius=Math.sqrt(random()),vel=[centre[0]+Math.cos(a)*radius*110,centre[1]+Math.sin(a)*radius*70,r(-70,70)+centre[2]];
          add(vel,mix(tint,pearl,r(.05,.5)),r(7.5,9.5),{drag:r(.75,.95),gravity:r(10,15),rate:0,width:r(3.2,6.5),end:mix(gold,tint,.65),
            flutter:[r(2,7),r(.8,1.6),.2,r(0,TAU)],light:[.9,period,phase+vel[0]*.022+cluster*.55,1.15],shimmer:.1,tag:'lantern'});
        }
      }
      for(let i=0;i<75;i++){const a=i/75*TAU;add([Math.cos(a)*130,Math.sin(a)*80+30,r(-50,50)],gold,r(1.2,1.9),{rate:7,trailLife:.5,width:2.5,tag:'ignition'});}
    }
    const cost=stars.reduce((n,s)=>n+s.life*.88*s.opts.rate,0),detail=Math.min(1,52000/Math.max(1,cost));
    stars.forEach(s=>{s.opts.rate*=detail;});
    return stars;
  }
  const api={STUDIES,compose};
  if(typeof module!=='undefined')module.exports=api;else root.FireworkCompositions=api;
})(typeof window==='undefined'?globalThis:window);
