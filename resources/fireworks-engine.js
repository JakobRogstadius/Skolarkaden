/* Procedural fireworks, recovered from the visual study; see dev/highscore-fireworks.md.
 * No images, video, external libraries, or frame-persistence tricks. Positions are evaluated
 * analytically in 3D; every ember has its own birth time, drag and finite lifetime. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2, STRIDE=28;
  const {STUDIES,compose}=root.FireworkCompositions||(typeof require==='function'?require('./fireworks-compositions.js'):{});
  const TYPES = ['chrysanthemum', 'willow', 'peony', 'palm', 'saturn', 'crossette', 'ghost', 'bouquet',...Object.keys(STUDIES)];
  const LABELS = ['Krysantemum', 'Guldregn', 'Pion', 'Palm', 'Saturnus', 'Korsetter', 'Färgskifte', 'Blombukett',...Object.values(STUDIES).map(s=>s.label)];
  const PALETTES = {
    jewel: [[1,.12,.3],[.10,.67,1],[.63,.28,1],[.1,1,.6]],
    gold: [[1,.57,.16],[1,.78,.36],[1,.92,.69]],
    ice: [[.16,.52,1],[.26,.92,1],[.77,.9,1]],
    rose: [[1,.09,.25],[1,.27,.51],[.78,.29,1]],
    aurora: [[.13,1,.5],[.1,.75,1],[.7,.25,1]]
  };
  const GOLD = [1,.57,.15], SILVER = [.75,.86,1];
  function rng(seed) { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function motion(p, v, age, drag, gravity, wind) {
    const decay = Math.exp(-drag * age), f = (1 - decay) / drag;
    return { p: [p[0] + v[0]*f + wind*(age-f), p[1] + (v[1]+gravity/drag)*f - gravity/drag*age, p[2]+v[2]*f], v: [v[0]*decay+wind*(1-decay), (v[1]+gravity/drag)*decay-gravity/drag,v[2]*decay] };
  }
  // Finite, local flutter around a gravity-led trajectory. Both position and
  // velocity are analytic; no rotating world coordinate system or upward bias.
  function flight(p,v,t,drag,gravity,wind,flutter=[0,0,.3,0]) {
    const m=motion(p,v,t,drag,gravity,wind),[amplitude,frequency,decay,phase]=flutter;
    if(!amplitude)return m;
    const rise=1-Math.exp(-3*t),fade=Math.exp(-decay*t),a=amplitude*rise*rise*fade;
    const da=amplitude*fade*(6*rise*Math.exp(-3*t)-decay*rise*rise),q=phase+frequency*t;
    const shape=[Math.cos(q),.18*Math.sin(2*q),Math.sin(q)],derivative=[-frequency*Math.sin(q),.36*frequency*Math.cos(2*q),frequency*Math.cos(q)];
    for(let i=0;i<3;i++){m.p[i]+=a*shape[i];m.v[i]+=da*shape[i]+a*derivative[i];}
    return m;
  }
  const VERT = `#version 300 es
  precision highp float;
  layout(location=0) in vec3 aPos;
  layout(location=1) in vec3 aVel;
  layout(location=2) in vec4 aTime;
  layout(location=3) in vec3 aColor;
  layout(location=4) in vec4 aExtra;
  layout(location=5) in vec3 aEnd;
  layout(location=6) in vec4 aFlutter;
  layout(location=7) in vec4 aLight;
  uniform float uTime, uScale, uAspect, uReflect, uWind, uPointMax, uTransparent;
  uniform vec2 uResolution;
  out vec3 vColor;
  out vec4 vData;
  out vec2 vDir;
  out float vLength;
  out float vReflect;
  vec3 position(float t) {
    float d=aTime.z, f=(1.-exp(-d*t))/d;
    vec3 p=aPos+vec3(aVel.x*f+uWind*(t-f),(aVel.y+aExtra.x/d)*f-aExtra.x/d*t,aVel.z*f);
    float rise=1.-exp(-3.*t),a=aFlutter.x*rise*rise*exp(-aFlutter.z*t),q=aFlutter.w+aFlutter.y*t;
    return p+a*vec3(cos(q),.18*sin(2.*q),sin(q));
  }
  vec2 project(vec3 p) {
    float perspective=1600./(1600.+p.z);
    vec2 q=vec2(p.x*perspective,p.y*perspective);
    if(uReflect>.5) {
      q.y*=-.48;
      q.x+=sin(q.y*.24+uTime*1.1)*3.+sin(q.y*.63-uTime*.8)*1.3;
    }
    return vec2(q.x/450./uAspect, (uTransparent>.5?-1.:-.76)+q.y/450.);
  }
  void main(){
    float age=uTime-aTime.x, life=aTime.y;
    if(age<0. || age>life) {gl_Position=vec4(4.,4.,0.,1.); gl_PointSize=1.; return;}
    vec3 p=position(age); if(p.y<0.){gl_Position=vec4(4.,4.,0.,1.);gl_PointSize=1.;return;} vec2 q=project(p);
    vec2 prev=project(position(max(0.,age-.018)));
    vec2 delta=(q-prev)*uResolution*.5;
    float streak=min(length(delta),18.*uScale);
    float size=aTime.w*uScale*1600./(1600.+p.z);
    if(aExtra.y==2.) streak=0.;
    gl_PointSize=clamp(size+streak,1.,uPointMax);
    gl_Position=vec4(q,0.,1.);
    float progress=age/life;
    float change=smoothstep(.40,.59,progress);
    vColor=mix(aColor,aEnd,change);
    float light=pow(max(0.,1.-progress),.35)*smoothstep(0.,.035,age);
    // Seeded shimmer: local embers, never a whole-screen strobe.
    if(aExtra.z>0.) light*=mix(1.,.28+.72*pow(.5+.5*sin(age*18.+aExtra.w),5.),aExtra.z*smoothstep(.32,.7,progress));
    if(aExtra.y>2.5) light*=1.-.97*exp(-pow((progress-.47)/.065,2.));
    if(aExtra.y>1.5 && aExtra.y<2.5) light=smoothstep(0.,.22,progress)*pow(1.-progress,1.8)*.08;
    if(aLight.x>0.){
      float wave=pow(.5+.5*sin(age*aLight.y+aLight.z),4.);
      light*=mix(1.,.10+.90*wave,aLight.x);
    }
    light*=aLight.w;
    if(uReflect>.5) light*=.24;
    vData=vec4(light,aExtra.y,gl_PointSize,size);
    vDir=length(delta)>.001?delta/length(delta):vec2(1.,0.);
    vLength=streak;
    vReflect=uReflect;
  }`;
  const FRAG = `#version 300 es
  precision highp float;
  in vec3 vColor; in vec4 vData; in vec2 vDir; in float vLength,vReflect;
  out vec4 frag;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
  void main(){
    vec2 p=(gl_PointCoord-.5)*vData.z; p.y=-p.y;
    if(vData.y>1.5 && vData.y<2.5){
      vec2 q=gl_PointCoord-.5;float n=noise(q*6.)*.55+noise(q*13.)*.3+noise(q*27.)*.15;
      float a=exp(-dot(q,q)*11.)*smoothstep(.12,.7,n)*vData.x;
      frag=vec4(vColor*a,a);return;
    }
    float along=clamp(dot(p,vDir),-vLength*.5,vLength*.5);
    float d=length(p-vDir*along);
    float width=max(.50,vData.w*.145);
    float core=exp(-d*d/(width*width));
    float halo=exp(-d*d/(width*width*12.))*.14;
    float a=(core+halo)*vData.x;
    if(vReflect>.5) a*=.35+.65*pow(.5+.5*sin(gl_FragCoord.y*1.9),2.);
    vec3 color=vColor*(core*1.9+halo*1.3)+vec3(core*core*.28);
    float edge=1.-smoothstep(vData.z*.34,vData.z*.5,length(p));
    frag=vec4(color*vData.x*edge,a*edge);
  }`;
  const QUAD = `#version 300 es
  precision highp float;
  out vec2 uv;
  void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
  const BLUR = `#version 300 es
  precision highp float;
  in vec2 uv; uniform sampler2D uImage; uniform vec2 uStep; out vec4 frag;
  void main(){frag=texture(uImage,uv)*.227027;frag+=(texture(uImage,uv+uStep*1.384615)+texture(uImage,uv-uStep*1.384615))*.316216;frag+=(texture(uImage,uv+uStep*3.230769)+texture(uImage,uv-uStep*3.230769))*.070270;}`;
  const COMPOSITE = `#version 300 es
  precision highp float;
  in vec2 uv; uniform sampler2D uImage,uBloom,uWide; uniform vec2 uResolution; uniform float uTime,uGlow,uTransparent; out vec4 frag;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(float p){float i=floor(p),f=fract(p);return mix(hash(vec2(i,3.)),hash(vec2(i+1.,3.)),f*f*(3.-2.*f));}
  void main(){
    vec3 light=texture(uImage,uv).rgb+uGlow*(texture(uBloom,uv).rgb*.8+texture(uWide,uv).rgb*.22);
    if(uTransparent>.5){
      vec3 color=pow(max(vec3(0.),vec3(1.)-exp(-light*1.12)),vec3(.4545));
      // Premultiplied alpha preserves coloured glow over the existing game.
      frag=vec4(color,max(color.r,max(color.g,color.b)));return;
    }
    float y=uv.y,aspect=uResolution.x/uResolution.y;
    vec3 sky=mix(vec3(.0009,.0015,.004),vec3(.004,.009,.023),exp(-pow((y-.14)*4.,2.)));
    vec2 st=uv*vec2(aspect,1.)*680.;vec2 cell=floor(st);vec2 f=fract(st)-.5;
    float star=step(.9965,hash(cell))*exp(-dot(f,f)*75.)*(.35+.3*hash(cell+5.))*smoothstep(.18,.5,y);
    sky+=vec3(.28,.36,.55)*star;
    float mountain=.125+noise(uv.x*13.)*.018+noise(uv.x*39.)*.006;
    if(y<mountain && y>.12) sky=vec3(.0006,.0011,.0023);
    if(y<.12) sky=mix(vec3(.0005,.0011,.0027),vec3(.002,.004,.009),y/.12);
    vec3 color=vec3(1.)-exp(-(light+sky)*1.12);
    color=pow(max(color,vec3(0.)),vec3(.4545));
    float vignette=1.-.19*pow(length((uv-.5)*vec2(1.,.8)),1.3);
    frag=vec4(color*vignette,1.);
  }`;
  function program(gl,vs,fs){
    const shaders=[gl.VERTEX_SHADER,gl.FRAGMENT_SHADER].map((kind,i)=>{const s=gl.createShader(kind);gl.shaderSource(s,i?fs:vs);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;});
    const p=gl.createProgram();shaders.forEach(s=>gl.attachShader(p,s));gl.linkProgram(p);shaders.forEach(s=>gl.deleteShader(s));if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;
  }
  class Fireworks {
    constructor(canvas,options={}) {
      this.canvas=canvas;this.transparent=Boolean(options.transparent);this.detail=options.detail??1;
      this.gl=canvas.getContext('webgl2',{alpha:this.transparent,premultipliedAlpha:true,antialias:false,powerPreference:'high-performance'});
      if(!this.gl) throw Error('WebGL 2 behövs för att visa fyrverkerierna. Kontrollera att grafikacceleration är aktiverad i webbläsaren.');
      this.time=0;this.speed=1;this.paused=false;this.wind=4;this.glow=1;this.batches=[];this.queue=[];this.events=0;this.onBurst=options.onBurst||(()=>{});
      const gl=this.gl;
      this.particleProgram=program(gl,VERT,FRAG);this.blurProgram=program(gl,QUAD,BLUR);this.compositeProgram=program(gl,QUAD,COMPOSITE);
      this.quadVAO=gl.createVertexArray();this.targets=[];
      this.hdr=!!gl.getExtension('EXT_color_buffer_float');this.pointMax=gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1];
      this.last=performance.now();this.disposed=false;this.lost=false;
      this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
      this.onLost=e=>{e.preventDefault();this.lost=true;this.paused=true;options.onError?.('Grafiken avbröts. Ladda om sidan för att fortsätta.');};
      canvas.addEventListener('webglcontextlost',this.onLost);
      this.resize();this.tick=this.tick.bind(this);this.frame=requestAnimationFrame(this.tick);
    }
    resize(){
      const rect=this.canvas.getBoundingClientRect();this.width=Math.max(1,rect.width);this.height=Math.max(1,rect.height);
      this.dpr=Math.min(devicePixelRatio||1,1.5,1800/this.width);this.density=(this.width<650?.6:1)*this.detail;
      const w=Math.round(this.width*this.dpr),h=Math.round(this.height*this.dpr);
      if(this.canvas.width===w&&this.canvas.height===h&&this.targets.length)return;
      this.canvas.width=w;this.canvas.height=h;
      const gl=this.gl;this.targets.forEach(t=>{gl.deleteTexture(t.texture);gl.deleteFramebuffer(t.fbo);});this.targets=[];
      for(const divisor of [1,2,2,8,8]){
        const tw=Math.max(1,Math.round(w/divisor)),th=Math.max(1,Math.round(h/divisor));
        const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,this.hdr?gl.RGBA16F:gl.RGBA,tw,th,0,gl.RGBA,this.hdr?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        const fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
        if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Kunde inte skapa grafikbufferten.');
        this.targets.push({texture,fbo,w:tw,h:th});
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      this.render();
    }
    uniform(p,name,value){const gl=this.gl,loc=gl.getUniformLocation(p,name);Array.isArray(value)?gl.uniform2fv(loc,value):gl.uniform1f(loc,value);}
    bind(target){const gl=this.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,target?.fbo||null);gl.viewport(0,0,target?.w||this.canvas.width,target?.h||this.canvas.height);}
    launch(options={}) {
      if(this.queue.length>24 || this.batches.length>18)return false;
      const seed=options.seed??Math.floor(Math.random()*4294967296),random=rng(seed),type=TYPES.includes(options.type)?options.type:TYPES[Math.floor(random()*TYPES.length)];
      const span=Math.min(580,this.width/this.height*300),size=Math.max(this.transparent?.22:.45,Math.min(1.45,this.width/this.height*1.45,options.size||1));
      const x=options.x??(random()-.5)*span*1.3;
      const requestedY=options.y??(420+random()*140);
      const y=this.transparent?Math.max(60,Math.min(860,requestedY)):Math.max(280,Math.min(740-(STUDIES[type]?.rise||(type==='willow'?265:185))*size,requestedY));
      const delay=options.delay||0,at=this.time+delay,flight=1.65+random()*.30;
      const origin=[x*.5+(random()-.5)*120,4,0],end=[x,y,random()*90-45];
      const velocity=[(end[0]-origin[0])/flight,(end[1]-origin[1])/flight+55*flight/2,end[2]/flight];
      // A launch comet is a ballistic arc, sampled into actual emitted embers.
      const data=[];
      for(let t=0;t<flight;t+=.011/this.density){
        const p=[origin[0]+velocity[0]*t,origin[1]+velocity[1]*t-55*t*t/2,velocity[2]*t];
        this.record(data,p,[(random()-.5)*12,-8-random()*22,(random()-.5)*9],at+t,.30+random()*.5,1.5,3+random()*2,GOLD,18,0,0,random()*TAU,[.9,.22,.025]);
      }
      // Bright moving comet head, using near-zero drag to approximate its trajectory.
      this.record(data,origin,velocity,at,flight,.002,8,[1,.76,.39],55,0,0,0,GOLD);
      this.upload(data,at+flight+1);
      this.queue.push({at:at+flight,seed,type,size,position:end,palette:options.palette||'jewel'});
      return true;
    }
    record(data,p,v,birth,life,drag,size,color,gravity,kind=0,shimmer=0,phase=0,end=color,flutter=[0,0,.3,0],light=[0,0,0,1]){
      // Palette values are treated as emission intensities, deliberately artist controlled.
      data.push(...p,...v,birth,life,drag,size,...color,gravity,kind,shimmer,phase,...end,...flutter,...light);
    }
    upload(data,end){
      const gl=this.gl,buffer=gl.createBuffer(),vao=gl.createVertexArray();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
      const sizes=[3,3,4,3,4,3,4,4];let offset=0;sizes.forEach((n,i)=>{gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,n,gl.FLOAT,false,STRIDE*4,offset*4);offset+=n;});
      this.batches.push({buffer,vao,count:data.length/STRIDE,end});
    }
    burst(shell) {
      const {seed,type,size,position,palette,at}=shell,random=rng(seed),data=[],colors=PALETTES[palette]||PALETTES.jewel;
      const pick=()=>colors[Math.floor(random()*colors.length)];const primary=pick();let secondary=pick();if(secondary===primary)secondary=colors[(colors.indexOf(primary)+1)%colors.length];
      const r=(a,b)=>a+random()*(b-a),phase=r(0,TAU),wind=this.wind;
      let latest=at,starIndex=0;
      const star=(pos,v,color,life,opts={})=>{
        const drag=opts.drag??.58,g=opts.gravity??22,birth=at+(opts.delay||0),end=opts.end||color;
        const flutter=opts.flutter||[0,0,.3,0],light=opts.light||[0,0,0,1];
        const detail=rng(seed^Math.imul(++starIndex,0x9e3779b1)),dr=(a,b)=>a+detail()*(b-a);
        this.record(data,pos,v,birth,life,drag,opts.width||5.4,color,g,opts.ghost?3:1,opts.shimmer||0,dr(0,TAU),end,flutter,light);
        latest=Math.max(latest,birth+life);
        const rate=(opts.rate??25)*this.density;
        for(let t=0;rate>0&&t<life*.88;t+=(.8+detail()*.4)/rate){
          const m=flight(pos,v,t,drag,g,wind,flutter),tail=opts.tail||GOLD;
          const ttl=dr(opts.trailMin??Math.min(.35,opts.trailLife??1),opts.trailLife??1.0)*(1-.45*t/life),velScale=opts.inherit??.12;
          this.record(data,m.p,[m.v[0]*velScale+dr(-5,5),m.v[1]*velScale+dr(-5,5),m.v[2]*velScale+dr(-5,5)],birth+t,ttl,1.2+dr(0,1),dr(1.6,3.2),tail,opts.trailGravity??16,0,opts.shimmer??.5,dr(0,TAU),[tail[0]*.65,tail[1]*.36,tail[2]*.2]);
          latest=Math.max(latest,birth+t+ttl);
        }
      };
      const sphere=(n,speed,fn)=>{
        // Fibonacci sphere, with a little angular jitter: volume projection, not a flat wheel.
        const rot=r(0,TAU);
        for(let i=0;i<n;i++){
          const z=1-2*(i+.5)/n,a=i*2.399963229728653+rot+r(-.025,.025),rr=Math.sqrt(1-z*z),sp=speed*r(.96,1.04);
          fn([Math.cos(a)*rr*sp,Math.sin(a)*rr*sp,z*sp],i);
        }
      };
      const n=Math.round(200*size),speed=155*size;
      if(STUDIES[type]){
        for(const s of compose(type,{seed,size,position,palette:colors,wind,rng,motion,flight}))star(s.p,s.v,s.color,s.life,s.opts);
      } else if(type==='willow'){
        sphere(Math.round(n*1.2),speed*.97,(v)=>star(position,v,[1,.72,.28],r(6.5,9),{drag:.4,gravity:21,rate:31,trailLife:1.9,tail:GOLD,shimmer:.85,width:4.6,end:[1,.3,.04]}));
      } else if(type==='palm'){
        const count=7+Math.floor(random()*3);
        for(let i=0;i<count;i++){
          const a=phase+i/count*TAU,v=[Math.cos(a)*speed*r(.9,1.15),Math.sin(a)*speed*.68+65,r(-45,45)];
          for(let j=0;j<7;j++)star(position,v.map(q=>q*r(.98,1.02)),GOLD,r(4.2,5.2),{drag:.35,rate:34,trailLife:1.2,width:5,shimmer:.65});
        }
        sphere(60,65,(v)=>star(position,v,secondary,2.4,{rate:4,tail:secondary}));
      } else if(type==='saturn'){
        sphere(100,speed*.45,(v)=>star(position,v,primary,r(2.8,3.3),{rate:4,tail:primary}));
        const tilt=r(.23,.55),rot=r(-.55,.55);
        for(let i=0;i<220;i++){
          const a=i/220*TAU,xx=Math.cos(a)*speed*1.35,yy=Math.sin(a)*speed*1.35*tilt;
          star(position,[xx*Math.cos(rot)-yy*Math.sin(rot),xx*Math.sin(rot)+yy*Math.cos(rot),Math.sin(a)*speed*.8],GOLD,r(3.3,3.8),{rate:9,tail:GOLD,gravity:17});
        }
      } else if(type==='crossette'){
        sphere(26,speed*.85,(v)=>{
          const split=r(.9,1.25);star(position,v,primary,split,{rate:28,tail:primary,trailLife:.5});
          const m=motion(position,v,split,.58,22,wind),rotation=r(0,TAU);
          for(let j=0;j<4;j++){const a=rotation+j*TAU/4;star(m.p,[Math.cos(a)*67+m.v[0]*.45,Math.sin(a)*67+m.v[1]*.45,m.v[2]*.25],secondary,r(1.5,2.1),{delay:split,rate:21,tail:secondary,trailLife:.6,drag:.48});}
        });
      } else if(type==='bouquet'){
        sphere(9,speed*.67,(v,i)=>{
          const split=r(.85,1.25);star(position,v,GOLD,split,{rate:26});const m=motion(position,v,split,.58,22,wind),c=colors[i%colors.length];
          sphere(55,62*size,(v2)=>star(m.p,v2.map((q,k)=>q+m.v[k]*.3),c,r(2,2.9),{delay:split,rate:12,tail:i%2?GOLD:c,trailLife:.8}));
        });
      } else if(type==='peony'){
        sphere(n,speed,(v)=>star(position,v,primary,r(2.5,3.3),{rate:2,tail:primary,trailLife:.25,width:7,shimmer:.3}));
        sphere(Math.round(n*.35),speed*.47,(v)=>star(position,v,secondary,r(2.8,3.5),{rate:3,tail:secondary,trailLife:.3,width:6}));
      } else if(type==='ghost'){
        sphere(n,speed,(v)=>star(position,v,primary,r(3.5,3.9),{ghost:true,end:secondary,rate:4,tail:GOLD,trailLife:.32,shimmer:.15,width:6}));
      } else {
        sphere(n,speed,(v,i)=>star(position,v,i%7===0?secondary:primary,r(3.2,4.1),{rate:28,trailLife:1.15,tail:palette==='gold'?GOLD:primary,shimmer:.5,end:secondary}));
        sphere(70,speed*.43,(v)=>star(position,v,GOLD,r(2.5,3),{rate:12,trailLife:.65,tail:GOLD}));
      }
      // Soft, irregular smoke puffs drift separately; briefly coloured by the shell's light.
      for(let i=0;i<20;i++){
        const angle=r(0,TAU),radius=r(2,26),color=primary.map((q,k)=>q*.13+[.04,.045,.06][k]);
        this.record(data,[position[0]+Math.cos(angle)*radius,position[1]+Math.sin(angle)*radius,position[2]+40],[r(-18,18),r(-6,18),0],at+r(0,.25),r(6,9),.55,r(65,155)*size,color,-4,2,0,0,[.05,.055,.07]);
      }
      // Brief local ignition sparkle, not a screen-filling flash.
      sphere(50,95,(v)=>this.record(data,position,v,at,r(.12,.3),1.5,4,[1,.82,.52],14));
      latest=Math.max(latest,at+10);this.upload(data,latest);this.events++;
      this.onBurst({type,seed,palette,size});
    }
    clear(){const gl=this.gl;this.batches.forEach(b=>{gl.deleteBuffer(b.buffer);gl.deleteVertexArray(b.vao);});this.batches=[];this.queue=[];}
    tick(now){
      if(this.disposed)return;
      const dt=Math.min((now-this.last)/1000,.05);this.last=now;
      if(!this.paused&&!document.hidden&&!this.lost){this.time+=dt*this.speed;this.onStep?.(this.time);if(!this.disposed){this.update();this.render();}}
      if(!this.disposed)this.frame=requestAnimationFrame(this.tick);
    }
    update(){
      const pending=[];for(const s of this.queue){if(s.at<=this.time)this.burst(s);else pending.push(s);}this.queue=pending;
      const gl=this.gl;this.batches=this.batches.filter(b=>{if(b.end>=this.time)return true;gl.deleteBuffer(b.buffer);gl.deleteVertexArray(b.vao);return false;});
    }
    render(){
      const gl=this.gl,p=this.particleProgram,scene=this.targets[0];this.bind(scene);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.useProgram(p);
      this.uniform(p,'uTime',this.time);this.uniform(p,'uScale',this.height/900*this.dpr);this.uniform(p,'uAspect',this.width/this.height);this.uniform(p,'uResolution',[this.canvas.width,this.canvas.height]);this.uniform(p,'uWind',this.wind);this.uniform(p,'uPointMax',this.pointMax);
      this.uniform(p,'uTransparent',this.transparent?1:0);
      for(const reflect of this.transparent?[0]:[0,1]){
        this.uniform(p,'uReflect',reflect);
        // Reflections are confined to the lake below the fixed horizon.
        if(!this.transparent){gl.enable(gl.SCISSOR_TEST);gl.scissor(0,reflect?0:Math.floor(this.canvas.height*.12),this.canvas.width,reflect?Math.ceil(this.canvas.height*.12):this.canvas.height);}
        for(const b of this.batches){gl.bindVertexArray(b.vao);gl.drawArrays(gl.POINTS,0,b.count);}
      }
      gl.disable(gl.SCISSOR_TEST);gl.disable(gl.BLEND);gl.bindVertexArray(this.quadVAO);
      const blur=(source,target,step)=>{this.bind(target);gl.useProgram(this.blurProgram);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,source.texture);this.uniform(this.blurProgram,'uStep',step);gl.drawArrays(gl.TRIANGLES,0,3);};
      blur(scene,this.targets[1],[2/scene.w,0]);blur(this.targets[1],this.targets[2],[0,1/this.targets[1].h]);
      blur(this.targets[2],this.targets[3],[4/this.targets[2].w,0]);blur(this.targets[3],this.targets[4],[0,1/this.targets[3].h]);
      blur(this.targets[4],this.targets[3],[1/this.targets[4].w,0]);blur(this.targets[3],this.targets[4],[0,1/this.targets[3].h]);
      this.bind(null);const cp=this.compositeProgram;gl.useProgram(cp);
      [scene,this.targets[2],this.targets[4]].forEach((t,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,t.texture);gl.uniform1i(gl.getUniformLocation(cp,['uImage','uBloom','uWide'][i]),i);});
      this.uniform(cp,'uResolution',[this.canvas.width,this.canvas.height]);this.uniform(cp,'uTime',this.time);this.uniform(cp,'uGlow',this.glow);this.uniform(cp,'uTransparent',this.transparent?1:0);gl.drawArrays(gl.TRIANGLES,0,3);gl.activeTexture(gl.TEXTURE0);
    }
    dispose(){this.disposed=true;cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.canvas.removeEventListener('webglcontextlost',this.onLost);this.clear();const gl=this.gl;this.targets.forEach(t=>{gl.deleteTexture(t.texture);gl.deleteFramebuffer(t.fbo);});[this.particleProgram,this.blurProgram,this.compositeProgram].forEach(p=>gl.deleteProgram(p));gl.deleteVertexArray(this.quadVAO);}
  }
  root.FireworksVisuals={Fireworks,TYPES,LABELS,PALETTES,rng,motion,flight,STUDIES,compose,STRIDE};
})(typeof window==='undefined'?globalThis:window);
