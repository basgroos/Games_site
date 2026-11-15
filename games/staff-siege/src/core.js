/* ================= UTILS ================= */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const rnd=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>v<a?a:v>b?b:v;
const d2=(a,b)=>{const x=a.x-b.x,y=a.y-b.y;return x*x+y*y};
const pick=a=>a[Math.random()*a.length|0];
const TAU=Math.PI*2;
let W=800,H=600,DPR=1,VW=800,VH=600;
const fmt=n=>{n=Math.max(0,n);return n>=1e9?(n/1e9).toFixed(2)+'B':n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e4?(n/1e3).toFixed(1)+'K':String(Math.round(n))};
const fmtTime=s=>{s=Math.floor(s);const h=s/3600|0,m=(s%3600)/60|0;return h?`${h}u ${m}m`:`${m}m ${s%60}s`};
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const angDiff=(a,b)=>{let d=a-b;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;return d};

/* ================= SAVE ================= */
/* Bas Games: build-info (versie, live/staging, link terug). Staging krijgt een eigen save. */
const BUILD=Object.assign({env:'live',version:'dev',home:''},window.HW_BUILD||{});
const KEY='staffsiege_v1'+(BUILD.env==='staging'?'_staging':'');
const DEF_SET={autoAttack:true,autoSkip:true,autoAbility:true,music:true,sfx:true,dmgNums:true,shake:true,speed:'1',gfx:'high',vol:70,musVol:45,sfxVol:70};
const fresh=()=>({v:2,burgers:300,tickets:1,staffs:{oak:{lvl:1,n:1,new:false,m:0,mx:0}},classes:{recruit:{lvl:1,n:1,new:false,m:0,mx:0}},
 eqStaff:'oak',eqClass:'recruit',best:0,kills:0,pulls:0,bosses:0,lvl:1,xp:0,upg:{},ach:{},coll:{},daily:{last:'',streak:0},
 st:{runs:0,playtime:0,earned:0,bossKills:{},bossFast:{},synUsed:{},zSeen:{},bestDps:0},
 pity:{staff:{p10:0,p60:0,p150:0},class:{p10:0,p60:0,p150:0}},
 run:{active:false,wave:1,checkpoint:1,staff:null,cls:null},set:{...DEF_SET}});
let S;
function load(){
 S=fresh();const F=fresh();
 try{const j=JSON.parse(localStorage.getItem(KEY)||'null');
  if(j&&j.staffs){Object.assign(S,j);
   S.set={...F.set,...(j.set||{})};S.run={...F.run,...(j.run||{})};S.st={...F.st,...(j.st||{})};
   for(const k of ['bossKills','bossFast','synUsed','zSeen'])S.st[k]={...(S.st[k]||{})};
   S.pity={staff:{...F.pity.staff,...((j.pity||{}).staff||{})},class:{...F.pity.class,...((j.pity||{}).class||{})}};
   S.daily={...F.daily,...(j.daily||{})};S.upg={...(j.upg||{})};S.ach={...(j.ach||{})};S.coll={...(j.coll||{})};
   if(!j.v||j.v<2){S.tickets=(j.tickets||0)+1;S.st.bossKills={};S.v=2}
  }}catch(e){S=fresh()}
 for(const id in S.staffs){if(!STAFF[id])delete S.staffs[id];else{const o=S.staffs[id];o.m=o.m||0;o.mx=o.mx||0;o.lvl=o.lvl||1;o.n=o.n||1}}
 for(const id in S.classes){if(!CLS[id])delete S.classes[id];else{const o=S.classes[id];o.m=o.m||0;o.mx=o.mx||0;o.lvl=o.lvl||1;o.n=o.n||1}}
 if(!S.staffs[S.eqStaff]){S.staffs.oak=S.staffs.oak||{lvl:1,n:1,m:0,mx:0};S.eqStaff='oak'}
 if(!S.classes[S.eqClass]){S.classes.recruit=S.classes.recruit||{lvl:1,n:1,m:0,mx:0};S.eqClass='recruit'}
 if(S.run.active&&!S.run.staff){S.run.staff=S.eqStaff;S.run.cls=S.eqClass}
 if(S.run.active&&(!STAFF[S.run.staff]||!CLS[S.run.cls]||!S.staffs[S.run.staff]||!S.classes[S.run.cls]))S.run.active=false;
}
let saveT=0;
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function saveSoon(){if(!saveT)saveT=setTimeout(()=>{saveT=0;save()},800)}
load();

/* ================= POOLS (object pooling) ================= */
function Pool(make){this.a=[];this.n=0;this.make=make}
Pool.prototype.get=function(){let o=this.a[this.n];if(!o){o=this.make();this.a.push(o)}this.n++;return o};
Pool.prototype.kill=function(i){const a=this.a,l=this.n-1;if(i!==l){const t=a[i];a[i]=a[l];a[l]=t}this.n--};
Pool.prototype.clear=function(){this.n=0};

/* ================= SPATIAL GRID ================= */
const GRID={cs:80,cols:1,rows:1,cells:[],big:[]};
function gridBuild(list){
 const g=GRID;g.cols=Math.ceil((W+200)/g.cs)+1;g.rows=Math.ceil((H+200)/g.cs)+1;const n=g.cols*g.rows;
 if(g.cells.length<n)for(let i=g.cells.length;i<n;i++)g.cells.push([]);
 for(let i=0;i<n;i++)g.cells[i].length=0;g.big.length=0;
 for(const z of list){if(z.dead)continue;if(z.r>30){g.big.push(z);continue}
  const cx=clamp(((z.x+100)/g.cs)|0,0,g.cols-1),cy=clamp(((z.y+100)/g.cs)|0,0,g.rows-1);g.cells[cx+cy*g.cols].push(z)}
}
/* roept fn(z) aan voor zombies die (mogelijk) binnen r van x,y liggen */
function near(x,y,r,fn){
 const g=GRID,x0=clamp(((x-r+100)/g.cs)|0,0,g.cols-1),x1=clamp(((x+r+100)/g.cs)|0,0,g.cols-1),y0=clamp(((y-r+100)/g.cs)|0,0,g.rows-1),y1=clamp(((y+r+100)/g.cs)|0,0,g.rows-1);
 for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){const c=g.cells[cx+cy*g.cols];for(let i=0;i<c.length;i++){if(fn(c[i])===false)return}}
 for(const z of g.big){if(fn(z)===false)return}
}

/* ================= AUDIO ================= */
const AU={c:null};
function auInit(){
 if(AU.c){if(AU.c.state==='suspended')AU.c.resume();return}
 try{const C=window.AudioContext||window.webkitAudioContext;AU.c=new C();
  AU.m=AU.c.createGain();const comp=AU.c.createDynamicsCompressor();AU.m.connect(comp);comp.connect(AU.c.destination);
  AU.s=AU.c.createGain();AU.s.connect(AU.m);AU.mu=AU.c.createGain();AU.mu.connect(AU.m);
  const len=AU.c.sampleRate*.6,b=AU.c.createBuffer(1,len,AU.c.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=Math.random()*2-1;AU.nb=b;applyVol();MUS.next=AU.c.currentTime+.1}catch(e){AU.c=null}
}
function applyVol(){if(!AU.c)return;AU.m.gain.value=S.set.vol/100;AU.s.gain.value=S.set.sfx?S.set.sfxVol/100:0;AU.mu.gain.value=S.set.music?S.set.musVol/100*.42:0}
function osc(type,f1,f2,dur,vol,t,dest,atk){const c=AU.c,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f1,t);if(f2)o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+dur);
 if(atk){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+atk)}else g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(dest||AU.s);o.start(t);o.stop(t+dur+.03)}
function nz(dur,vol,freq,t,dest,q,type){const c=AU.c,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=AU.nb;f.type=type||'bandpass';f.frequency.value=freq;f.Q.value=q||1;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(dest||AU.s);s.start(t,Math.random()*.1);s.stop(t+dur+.03)}
/* p = pitch-factor zodat iedere staf zijn eigen klank heeft */
const SFX={
 bolt:(t,p)=>{osc('triangle',880*p,320*p,.12,.11,t);osc('sine',1760*p,600*p,.06,.04,t)},
 spam:(t,p)=>osc('square',1500*p,800*p,.035,.025,t),
 laser:(t,p)=>{osc('sawtooth',1900*p,240*p,.14,.05,t);osc('sine',3800*p,900,.08,.03,t)},
 ice:(t,p)=>{osc('sine',1700*p,900*p,.14,.07,t);nz(.08,.05,6000,t)},
 sniper:(t,p)=>{nz(.3,.32,1500,t);osc('sine',240*p,50,.35,.28,t);osc('square',90,40,.12,.1,t)},
 explosion:(t,p)=>{nz(.45,.35,350*p,t);osc('sine',120*p,35,.4,.28,t)},
 lightning:(t,p)=>{nz(.2,.22,3500*p,t,null,.5);osc('square',300*p,1200,.08,.04,t)},
 void:(t,p)=>{osc('sine',260*p,50,.5,.2,t);osc('triangle',130*p,40,.6,.08,t)},
 flame:(t,p)=>nz(.12,.06,900*p,t,null,.7),
 crystal:(t,p)=>{osc('triangle',2400*p,1800*p,.1,.06,t);osc('sine',3200*p,0,.15,.03,t+.02)},
 boomerang:(t,p)=>{nz(.25,.06,1200*p,t,null,4);osc('triangle',500*p,700*p,.2,.04,t)},
 poison:(t,p)=>{nz(.18,.08,700*p,t,null,3);osc('sine',300*p,180,.15,.05,t)},
 blood:(t,p)=>{osc('sawtooth',300*p,120*p,.12,.06,t);nz(.06,.05,1800,t)},
 rocket:(t,p)=>{nz(.35,.12,600*p,t,null,.8,'lowpass');osc('sawtooth',160*p,500*p,.25,.04,t)},
 sound:(t,p)=>{osc('sine',180*p,90,.3,.18,t);osc('sine',360*p,180,.25,.08,t)},
 plasma:(t,p)=>{osc('sine',600*p,200*p,.3,.1,t);osc('square',1200*p,300,.2,.03,t)},
 shadow:(t,p)=>{osc('triangle',500*p,160*p,.18,.07,t);nz(.15,.05,500,t,null,2)},
 quake:(t,p)=>{osc('sine',70*p,30,.5,.35,t);nz(.4,.25,200,t,null,.6,'lowpass')},
 time:(t,p)=>{[0,.06,.12].forEach((d,i)=>osc('sine',(1200-i*200)*p,0,.12,.05,t+d))},
 drone:(t,p)=>osc('square',1000*p,600,.05,.03,t),
 tornado:(t,p)=>nz(.6,.12,500*p,t,null,1.5),
 portal:(t,p)=>{osc('sine',200*p,900*p,.35,.08,t);osc('triangle',400*p,1600*p,.3,.04,t+.05)},
 soul:(t,p)=>{osc('sine',700*p,1100*p,.4,.06,t,null,.05);osc('sine',1050*p,1600*p,.4,.03,t,null,.05)},
 beam:(t,p)=>osc('sawtooth',220*p,240*p,.12,.025,t),
 meteor:(t,p)=>{nz(.6,.25,300*p,t,null,.5,'lowpass');osc('sine',90*p,30,.6,.3,t)},
 nuke:(t,p)=>{nz(1.4,.5,200,t,null,.4,'lowpass');osc('sine',60,20,1.4,.45,t);nz(.5,.3,2000,t)},
 galaxy:(t,p)=>{osc('triangle',990*p,1480*p,.2,.06,t);osc('sine',1980*p,0,.25,.03,t+.04)},
 rainbow:(t,p)=>{[523,659,784].forEach((f,i)=>osc('triangle',f*p,0,.1,.04,t+i*.03))},
 hit:t=>nz(.05,.045,2200,t),crit:t=>{nz(.08,.08,3200,t);osc('square',1600,800,.06,.04,t)},
 kill:t=>osc('triangle',420,160,.09,.05,t),coin:t=>{osc('square',988,0,.08,.06,t);osc('square',1319,0,.16,.06,t+.07)},
 hurt:t=>{osc('sawtooth',220,70,.22,.16,t);nz(.1,.14,800,t)},
 wave:t=>{[523,659,784,1047].forEach((f,i)=>osc('triangle',f,0,.22,.09,t+i*.07))},
 boss:t=>{osc('sawtooth',90,60,1.6,.25,t);osc('sawtooth',135,90,1.6,.18,t);nz(1.4,.15,200,t);osc('sine',45,30,1.8,.4,t)},
 phase:t=>{osc('sawtooth',120,60,.8,.25,t);nz(.8,.2,400,t)},
 ability:t=>{osc('sine',400,1400,.25,.14,t);osc('triangle',600,1800,.3,.07,t+.05)},
 special:t=>{osc('sawtooth',200,1600,.35,.1,t);nz(.3,.1,2500,t)},
 build:t=>{osc('square',300,0,.06,.07,t);osc('square',450,0,.08,.07,t+.06)},
 spit:t=>nz(.15,.07,900,t,null,3),boom:t=>{nz(.4,.32,300,t);osc('sine',100,35,.35,.24,t)},
 summon:t=>{for(let i=0;i<14;i++)osc('triangle',300+i*80,0,.18,.05,t+i*.1);nz(1.6,.07,1200,t)},
 summonL:t=>{for(let i=0;i<18;i++)osc('triangle',300+i*90,0,.2,.06,t+i*.09);osc('sine',110,55,2,.3,t);nz(2,.1,3000,t)},
 reveal0:t=>osc('triangle',660,0,.3,.11,t),reveal3:t=>{[660,880,1100].forEach((f,i)=>osc('triangle',f,0,.4,.11,t+i*.08))},
 reveal4:t=>{[523,659,784,1047].forEach((f,i)=>osc('triangle',f,0,.6,.12,t+i*.09));nz(.8,.08,5000,t)},
 reveal5:t=>{[523,659,784,1047,1319,1568,2093].forEach((f,i)=>osc('triangle',f,0,.7,.12,t+i*.08));nz(1.2,.12,4000,t);osc('sine',80,40,1,.3,t)},
 die:t=>{[392,330,262,196].forEach((f,i)=>osc('sawtooth',f,f*.9,.35,.11,t+i*.2))},
 no:t=>osc('square',180,120,.15,.07,t),click:t=>osc('triangle',900,0,.04,.05,t),
 lvl:t=>{[523,659,784,1047,1319].forEach((f,i)=>osc('square',f,0,.15,.05,t+i*.06))},
 ach:t=>{[784,988,1175,1568].forEach((f,i)=>osc('triangle',f,0,.3,.08,t+i*.1))},
 potion:t=>{osc('sine',500,900,.2,.08,t);nz(.2,.05,3000,t)},
};
const lastS={};
const NETSFX=[];
function sfx(n,p,remote){if(!remote&&typeof G!=='undefined'&&G.net==='host'&&NETSFX.length<16&&!/^(click|no|lvl|ach|coin|summon|reveal)/.test(n))NETSFX.push(p&&p!==1?[n,+p.toFixed(2)]:[n]);if(!AU.c||!S.set.sfx)return;const t=AU.c.currentTime;if(lastS[n]&&t-lastS[n]<.045)return;lastS[n]=t;const f=SFX[n];if(f)f(t+.005,p||1)}

/* Muziek: 3 procedurele tracks (lobby, game, boss) */
const MUS={next:0,step:0,mode:'lobby'};
const mtof=m=>440*Math.pow(2,(m-69)/12);
const TRACKS={
 lobby:{bpm:92,prog:[45,41,48,43],min:[1,0,0,0],lead:'sine',bass:'triangle',drums:0},
 game:{bpm:116,prog:[45,41,48,43],min:[1,0,0,0],lead:'triangle',bass:'triangle',drums:1},
 boss:{bpm:140,prog:[45,46,45,43],min:[1,1,1,1],lead:'square',bass:'sawtooth',drums:2},
};
function musicTick(){
 if(!AU.c||!S.set.music){if(AU.c)MUS.next=AU.c.currentTime+.1;return}
 const c=AU.c,tr=TRACKS[MUS.mode]||TRACKS.lobby,spb=60/tr.bpm/4;
 if(MUS.next<c.currentTime-.2)MUS.next=c.currentTime+.05;
 while(MUS.next<c.currentTime+.2){
  const s=MUS.step%64,bar=s>>4,t=MUS.next,root=tr.prog[bar],tri=tr.min[bar]?[0,3,7,10]:[0,4,7,11];
  if(tr.drums&&s%4===0)osc('sine',150,40,.18,.45,t,AU.mu);
  if(tr.drums===2&&s%8===4)nz(.12,.14,1800,t,AU.mu);
  if(tr.drums&&s%2===1)nz(.035,.04,8000,t,AU.mu);
  if(s%(tr.drums?2:8)===0)osc(tr.bass,mtof(root-12),0,spb*(tr.drums?1.8:7),tr.drums?.2:.16,t,AU.mu);
  if(tr.drums||s%2===0){const arp=[0,1,2,1,2,0,1,3][s%8],oct=(s%16)>=8?24:12;osc(tr.lead,mtof(root+tri[arp]+oct),0,spb*(tr.drums?.9:1.8),tr.drums===2?.035:.05,t,AU.mu)}
  if(!tr.drums&&s%16===0)osc('sine',mtof(root+tri[2]+24),0,spb*14,.03,t,AU.mu,.4);
  MUS.next+=spb;MUS.step++;
 }
}
setInterval(musicTick,60);
