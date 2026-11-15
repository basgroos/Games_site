/* ================= GAME STATE ================= */
const G={state:'lobby',paused:false,t:0,wave:1,startWave:1,cleared:0,phase:'fight',toSpawn:0,total:0,spawnT:0,gap:.3,clearT:5,boss:null,kills:0,earned:0,xp:0,scrap:0,shake:0,timeStop:0,slowAll:0,intro:null,dark:0,arena:0,flash:0,flashCol:'#fff',runTime:0,dmg:0,slowmo:0,elites:0,newAch:[],bossT:0};
let P=null,K=null,PID=0;
let Z=[];
const PR=new Pool(()=>({hitS:new Set()})), EP=new Pool(()=>({})), PT=new Pool(()=>({})), TX=new Pool(()=>({})), LI=new Pool(()=>({}));
let FX=[],PK=[],WL=[],TW=[],MN=[],HO=[],ZO=[],TE=[],DL=[],DR=[],PL=[],TN=[],PO=[],CL=[],FI=[],HZ=[],DEC=[];
const M={x:0,y:0,down:false}, KEYS={}, JOY={active:false,id:-1,ox:0,oy:0,dx:0,dy:0};
const QUAL={low:{pm:160,glow:false,light:false},medium:{pm:450,glow:true,light:false},high:{pm:1100,glow:true,light:true}};
const Q=()=>QUAL[S.set.gfx]||QUAL.high;
const hpScale=w=>(1+.12*(w-1))*Math.pow(1.022,w-1);
const dmgScale=w=>1+.07*(w-1);
const later=(t,fn)=>DL.push({t,fn});
const arenaFor=w=>Math.floor((w-1)/25)%ARENAS.length;
const xpNeed=l=>Math.floor(80*Math.pow(l,1.45));
const mastNeed=m=>150+m*m*120;
const U=k=>(S.upg[k]||0)*UPG[k].v;
const remove=(arr,i)=>{arr[i]=arr[arr.length-1];arr.pop()};

/* ================= KIT (loadout + synergieën + upgrades) ================= */
function synFor(st,cl){return SYN.filter(s=>s.cl===cl.id&&(s.st.id?s.st.id===st.id:s.st.type===st.type))}
const MULK=['dmg','rate','boss','hp','aoe','holeR','cd','units','wallHp','poison','range'];
function kit(staffId,clsId){
 const st=STAFF[staffId||S.eqStaff],cl=CLS[clsId||S.eqClass];
 const so=S.staffs[st.id]||{lvl:1,m:0},co=S.classes[cl.id]||{lvl:1,m:0};
 const syn=synFor(st,cl);
 const m={dmg:1,rate:1,crit:0,critM:0,boss:1,hp:1,aoe:1,chain:0,pierce:0,freeze:0,holeR:1,cd:1,drones:0,spirits:0,units:1,ls:0,burn:0,towerKind:null,stun:0,necro:0,burger:0,wallHp:1,poison:1,range:1,bounce:0,frags:0,beams:0,planets:0,portalShots:0};
 for(const s of syn)for(const[k,v] of Object.entries(s.m)){if(k==='towerKind')m.towerKind=v;else if(MULK.includes(k))m[k]*=v;else m[k]+=v}
 const sm=(1+.1*(so.lvl-1))*(1+.03*(so.m||0)),cm=(1+.05*(co.lvl-1))*(1+.02*(co.m||0));
 const dmg=st.dmg*DMG_K*sm*cl.dmg*cm*m.dmg*(1+U('dmg'));
 const rate=st.rate*cl.rate*m.rate*(1+U('rate'));
 const sp=st.sp||TYPES[st.type].sp;
 return {st,cl,syn,m,sp,sl:so.lvl,cLv:co.lvl,sMast:so.m||0,cMast:co.m||0,sm,cm,dmg,rate,
  crit:Math.min(.95,cl.crit+m.crit+U('crit')),critM:cl.critM+m.critM,boss:cl.boss*m.boss,armor:cl.armor,
  maxhp:Math.round(100*cl.hp*cm*m.hp*(1+U('hp'))),spd:190*cl.spd,dodge:cl.dodge,regen:.004+cl.regen+U('regen'),ls:cl.ls+m.ls+(st.ls||0),
  cdMul:m.cd*(1-U('cd')),units:m.units*(1+U('units'))*(cl.id==='commander'?1.5:cl.id==='cmdx'?2:1),magnet:140*(1+U('magnet')),
  power:dmg*rate*(st.beams||1)*(st.type==='sniper'?.8:1)*(st.type==='flame'?.8:1),
  drones:(st.drones||0)+(st.drones?m.drones:0),planets:(st.planets||0)+(st.planets?m.planets:0),
  burgerCh:.05+m.burger+(cl.id==='blord'?.05:cl.id==='gambler'?.02:0)};
}
function newPlayer(){
 P={x:W/2,y:H/2,r:16,hp:K.maxhp,maxhp:K.maxhp,ang:-Math.PI/2,atkT:0,spT:2,abT:3,ctT:2,ct2:4,holyT:0,hurtT:0,shieldT:0,shieldF:1,dashT:0,dvx:0,dvy:0,
  rateT:0,rageT:0,bloodT:0,potT:0,jackT:0,unitT:0,ovT:0,droneOvT:0,beamOvT:0,goldT:0,slowT:0,critShots:0,beam:null,walk:0,dm:1,rm:1,lsm:1,
  lsAcc:0,hist:[],histT:0,rbI:0,bt:null,ramp:1,beamVis:null,flameT:0,flameRing:0,archI:0,lastHit:0};
}

/* ================= EFFECT HELPERS ================= */
function part(x,y,vx,vy,life,col,s,g,glow,drag){if(PT.n>=Q().pm)return;const p=PT.get();p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.t=p.max=life;p.col=col;p.s=s;p.g=g||0;p.glow=glow?1:0;p.drag=drag==null?.94:drag}
function burst(x,y,col,n,sp,life,size,glow){if(S.set.gfx==='low')n=Math.ceil(n/2);for(let i=0;i<n;i++){const a=Math.random()*TAU,v=rnd(.25,1)*sp;part(x,y,Math.cos(a)*v,Math.sin(a)*v,life*rnd(.6,1),col,size*rnd(.6,1.25),0,glow)}}
function light(x,y,r,col,life){if(!Q().light||LI.n>60)return;const l=LI.get();l.x=x;l.y=y;l.r=r;l.col=col;l.t=l.max=life}
function txt(x,y,s,col,size,crit){if(!S.set.dmgNums&&!crit&&size<16)return;if(TX.n>160)return;const t=TX.get();t.x=x;t.y=y;t.s=s;t.col=col;t.size=size||14;t.t=t.max=crit?1:.8;t.vx=rnd(-30,30);t.vy=-70-rnd(0,30);t.crit=!!crit}
function ring(x,y,r0,r1,col,dur,w){FX.push({k:'ring',x,y,r0,r1,col,t:dur||.35,max:dur||.35,w:w||3})}
function boltFx(x1,y1,x2,y2,col,w){const pts=[[x1,y1]],n=7;for(let i=1;i<n;i++){const f=i/n,ox=(y2-y1),oy=-(x2-x1),L=Math.hypot(ox,oy)||1,j=rnd(-14,14);pts.push([x1+(x2-x1)*f+ox/L*j,y1+(y2-y1)*f+oy/L*j])}pts.push([x2,y2]);FX.push({k:'bolt',pts,col,t:.18,max:.18,w:w||2.5});light(x2,y2,90,col,.15)}
function beamFx(x1,y1,x2,y2,col,w,dur){FX.push({k:'beam',x1,y1,x2,y2,col,w,t:dur||.12,max:dur||.12})}
function decal(x,y,r,kind){if(DEC.length>70)DEC.shift();DEC.push({x,y,r,kind,t:12,max:12,rot:rnd(0,TAU)})}
function shake(v){if(S.set.shake)G.shake=Math.max(G.shake,v)}
const EL={fire:'#ff9a3c',ice:'#9be4ff',poison:'#a3e635',holy:'#ffe9a0',shock:'#a5c8ff',void:'#d6a8ff',blood:'#ff4d6d'};

/* ================= WAVES ================= */
function pickType(){const w=G.wave;let tot=0;for(const k in ZT)if(ZT[k].from<=w)tot+=ZT[k].w;let r=Math.random()*tot;for(const k in ZT){if(ZT[k].from>w)continue;r-=ZT[k].w;if(r<=0)return k}return 'walker'}
function edgePos(){const m=26;switch(Math.random()*4|0){case 0:return{x:rnd(0,W),y:-m};case 1:return{x:W+m,y:rnd(0,H)};case 2:return{x:rnd(0,W),y:H+m};default:return{x:-m,y:rnd(0,H)}}}
function mkZombie(tid,x,y,mul){
 mul=mul||1;const t=ZT[tid],w=G.wave;if(x==null){const p=edgePos();x=p.x;y=p.y}
 const hp=t.hp*hpScale(w)*mul;
 return {tid,t,x,y,r:t.r*(mul>=3?1.25:mul<1?.75:1),hp,maxhp:hp,spd:t.spd*(1+Math.min(.4,w*.004))*rnd(.9,1.1),dmg:t.dmg*dmgScale(w)*(mul>=3?1.5:1),
  atkT:0,slowT:0,slowF:1,frozen:0,stun:0,root:0,hack:0,burnT:0,burnD:0,poisonT:0,poisonD:0,bleedT:0,bleedD:0,ampT:0,amp:1,dotT:.5,
  flash:0,ph:Math.random()*6,face:0,cd:rnd(1,2.5),elite:mul>=3,boss:false,dead:false,shield:t.shield?hp*t.shield:0,shieldMax:t.shield?hp*t.shield:0,reveal:0,plT:-1,plId:0,trailT:.6,stompT:3};
}
function startWave(w){
 G.wave=w;G.phase='fight';
 const ai=arenaFor(w);if(ai!==G.arena){G.arena=ai;BG=null;if(G.state==='play')toast('Nieuwe arena: '+ARENAS[ai].n)}
 const isBoss=w%25===0;
 G.toSpawn=isBoss?Math.min(6+(w/12|0),20):Math.min(6+Math.floor(w*1.1),60);
 const dur=isBoss?10:Math.min(7,2.4+w*.08);G.gap=dur/G.toSpawn;G.spawnT=.4;
 G.elites=(w%10===0&&!isBoss)?1+(w/50|0):0;
 G.toSpawn+=G.elites;G.total=G.toSpawn+(isBoss?1:0);
 S.run.active=true;S.run.wave=w;S.best=Math.max(S.best,w);
 commitTime();save();
 const fresh=Object.keys(ZT).filter(k=>ZT[k].from<=w&&ZT[k].w>0&&!S.st.zSeen[k]);
 fresh.forEach(k=>S.st.zSeen[k]=1);
 if(isBoss){spawnBoss()}
 else{MUS.mode='game';
  const ann=fresh.filter(k=>ZT[k].from>=G.startWave&&ZT[k].from>1);if(ann.length)announce('NIEUWE ZOMBIE',ann.map(k=>ZT[k].n+': '+ZT[k].d).join(' '),'#ff8a3d');
  else announce('WAVE '+w,G.elites?'Elite zombies verschijnen!':'',G.elites?'#ffc83d':'#3dffa6');
  sfx('wave')}
 renderHudStatic();
}
function spawnBoss(){
 const k=G.wave/25-1,idx=k%BOSSES.length,cyc=Math.floor(k/BOSSES.length),b=BOSSES[idx];
 const z=mkZombie('walker',W/2,-90);
 Object.assign(z,{tid:'boss',boss:true,bdef:b,idx,tier:k,r:b.r,col:b.col,spd:b.spd,dmg:b.dmg*dmgScale(G.wave),atkCd:2.2,phase:0,inv:0,dash:null,shield:0,
  name:b.name+(cyc?' '+(['','II','III','IV','V','VI','VII','VIII'][cyc]||cyc+1):'')});
 z.hp=z.maxhp=b.hp*hpScale(G.wave)*Math.pow(2.2,cyc);
 Z.push(z);G.boss=z;G.bossT=0;
 G.intro={t:3.2,max:3.2,z};MUS.mode='boss';sfx('boss');shake(.4);bossIntroUI(z);
}
function waveClear(){
 if(G.state!=='play')return;
 G.phase='clear';G.clearT=5;G.cleared++;
 const wb=20+U('wave');addBurgers(wb);txt(P.x,P.y-40,'+'+wb+' burgers','#ffc83d',18,true);
 P.hp=Math.min(P.maxhp,P.hp+P.maxhp*.15);
 let xp=10+G.wave*2;
 if(G.wave%25===0){
  const k=G.wave/25,rew=250*k;addBurgers(rew);S.bosses++;S.tickets++;xp+=150*k;
  S.run.checkpoint=G.wave+1;
  announce('BOSS VERSLAGEN','+'+rew+' burgers · +1 summon ticket · checkpoint wave '+(G.wave+1),'#ffc83d');MUS.mode='game';
 }else announce('WAVE CLEAR','+'+wb+' burgers · +'+Math.round(xp*(1+U('xp')))+' XP','#3dffa6');
 gainXP(xp,true);
 sfx('wave');checkAch();save();renderHudStatic();
}
function nextWave(){if(G.state==='play'&&G.phase==='clear'&&!G.paused)startWave(G.wave+1)}
function updateWave(dt){
 if(G.phase==='fight'){
  if(G.toSpawn>0){G.spawnT-=dt;while(G.spawnT<=0&&G.toSpawn>0){
   if(G.elites>0&&(G.toSpawn<=G.elites||Math.random()<.12)){Z.push(mkZombie(pick(['brute','armored','walker','shield']),null,null,4));G.elites--}
   else Z.push(mkZombie(pickType()));
   G.toSpawn--;G.spawnT+=G.gap}}
  else if(Z.length===0)waveClear();
 }else if(G.phase==='clear'&&S.set.autoSkip){G.clearT-=dt;if(G.clearT<=0)startWave(G.wave+1)}
}
const remaining=()=>G.toSpawn+Z.length;

/* ================= PROGRESSIE ================= */
function addBurgers(n){S.burgers+=n;G.earned+=n;S.st.earned+=n}
function gainXP(base,mast){
 const xp=Math.round(base*(1+U('xp')));G.xp+=xp;S.xp+=xp;
 while(S.xp>=xpNeed(S.lvl)){S.xp-=xpNeed(S.lvl);S.lvl++;const b=40+S.lvl*10;S.burgers+=b;let msg='Level '+S.lvl+'! +'+b+' burgers';if(S.lvl%5===0){S.tickets++;msg+=' +1 ticket'}toast(msg,'lvl');sfx('lvl')}
 if(mast&&K){for(const[o,nm] of [[S.staffs[K.st.id],K.st.name],[S.classes[K.cl.id],K.cl.name]]){if(!o||o.m>=10)continue;o.mx+=xp;while(o.m<10&&o.mx>=mastNeed(o.m)){o.mx-=mastNeed(o.m);o.m++;toast(nm+' mastery '+o.m+'!','mast')}}}
}
function checkAch(){
 for(const a of ACH){if(S.ach[a.id])continue;let ok=false;try{ok=a.c(S)}catch(e){}if(ok){S.ach[a.id]={claimed:false};G.newAch.push(a.n);toast('Achievement: '+a.n,'ach');sfx('ach')}}
}
function commitTime(){if(G.state==='play'){S.st.playtime+=G.runTime-G.ptSaved;G.ptSaved=G.runTime}}

/* ================= RUN CONTROL ================= */
function resetWorld(){Z=[];PR.clear();EP.clear();PT.clear();TX.clear();LI.clear();FX=[];PK=[];WL=[];TW=[];MN=[];HO=[];ZO=[];TE=[];DL=[];DR=[];PL=[];TN=[];PO=[];CL=[];FI=[];HZ=[];DEC=[];G.boss=null;G.timeStop=0;G.slowAll=0;G.intro=null;G.dark=0;G.flash=0;G.slowmo=0}
function startRun(w,resume){
 if(G.state==='play')return;
 auInit();
 const sid=resume?S.run.staff:S.eqStaff,cid=resume?S.run.cls:S.eqClass;
 transition(()=>beginRun(w,sid,cid));
}
/* zet een potje direct klaar (zonder overgang); de loadout ligt vanaf hier vast */
function beginRun(w,sid,cid){
  resetWorld();K=kit(sid,cid);newPlayer();
  S.run={active:true,wave:w,checkpoint:S.run.checkpoint||1,staff:sid,cls:cid};
  for(const s of K.syn)S.st.synUsed[s.id]=1;
  G.state='play';G.paused=false;G.kills=0;G.earned=0;G.xp=0;G.dmg=0;G.runTime=0;G.ptSaved=0;G.cleared=0;G.startWave=w;G.newAch=[];
  G.scrap=K.cl.id==='build'?40:0;G.t=0;G.arena=-1;
  S.st.runs++;
  closeAll();showScreen('game');renderEq();startWave(w);checkAch();
}
function endRun(dead){
 if(G.state!=='play')return;
 commitTime();G.state='res';S.run.active=false;checkAch();save();MUS.mode='lobby';
 if(dead)sfx('die');showResults(dead);
}
function gameOver(){endRun(true)}

/* ================= COMBAT CORE ================= */
const NO={};
function hitZ(z,base,o){
 if(z.dead)return 0;o=o||NO;
 if(z.inv>0){if(Math.random()<.08)txt(z.x,z.y-z.r-6,'IMMUUN','#c9c9d6',13);return 0}
 let d=base*(o.dot?1:P.dm),crit=false;
 if(!o.noCrit&&!o.dot){const forced=o.crit||(P.critShots>0&&o.main);if(forced||Math.random()<K.crit){crit=true;let cm=K.critM;if(K.cl.id==='gambler')cm=rnd(1.5,6);d*=cm*(P.critShots>0&&o.main?2:1)}}
 if(z.boss)d*=K.boss;
 if(z.ampT>0)d*=z.amp;
 if(z.t.armor&&!o.pierceArmor)d*=1-z.t.armor;
 if(z.shield>0){const eff=o.aoe?2:1,ab=Math.min(z.shield,d*eff);z.shield-=ab;d-=ab/eff;if(z.shield<=0){burst(z.x,z.y,'#8fc7ff',14,180,.4,3,true);txt(z.x,z.y-z.r-8,'SCHILD KAPOT','#8fc7ff',13)}if(d<=.01){z.flash=.05;return 0}}
 z.hp-=d;z.flash=.07;G.dmg+=d;
 if(z.t.invis)z.reveal=1.6;
 if(o.slow){z.slowT=2.2;z.slowF=z.boss?.75:.5}
 if(o.freeze&&!z.boss&&Math.random()<o.freeze){z.frozen=1.4+K.m.freeze*2}
 if(o.burn){z.burnT=3;z.burnD=Math.max(z.burnD,d*.12*o.burn)}
 if(o.bleed){z.bleedT=2.5;z.bleedD=Math.max(z.bleedD,d*.1)}
 if(o.stun&&!z.boss&&Math.random()<o.stun)z.stun=Math.max(z.stun,.7);
 if(o.kb&&!z.boss&&!z.t.giant){z.x+=Math.cos(o.kb)*(o.kbF||5);z.y+=Math.sin(o.kb)*(o.kbF||5)}
 if(!o.dot){
  const c=K.cl.id;
  if(c==='pyro'){z.burnT=3;z.burnD=Math.max(z.burnD,d*.08)}
  else if(c==='cryo'){z.slowT=Math.max(z.slowT,1.5);z.slowF=Math.min(z.slowF,z.boss?.85:.75)}
  else if(c==='hacker'&&!z.boss&&Math.random()<.1){z.hack=1;z.stun=Math.max(z.stun,1)}
  if(K.m.stun&&!o.stun&&!z.boss&&Math.random()<K.m.stun*.3)z.stun=Math.max(z.stun,.5);
  const ls=K.ls*P.lsm+(P.rageT>0?.05:0);if(ls>0&&P.lsAcc<P.maxhp*.08){const h=Math.min(d*ls,P.maxhp*.08-P.lsAcc);P.lsAcc+=h;P.hp=Math.min(P.maxhp,P.hp+h)}
  if(c==='assassin'&&!z.boss&&z.hp>0&&z.hp<z.maxhp*.15){z.hp=0;txt(z.x,z.y-z.r-10,'EXECUTE','#f43f5e',15,true)}
 }
 if(S.set.dmgNums||crit)txt(z.x+rnd(-8,8),z.y-z.r-4,fmt(d)+(crit?'!':''),crit?'#ffd23f':o.el?EL[o.el]:'#ffffff',crit?21:o.dot?12:14,crit);
 if(!o.dot){sfx(crit?'crit':'hit');if(Q().pm>200)part(z.x+rnd(-z.r,z.r)*.5,z.y+rnd(-z.r,z.r)*.5,rnd(-90,90),rnd(-90,90),.25,o.col||'#fff',2.5,0,1)}
 if(z.hp<=0)killZ(z);
 return d;
}
function killZ(z){
 if(z.dead)return;z.dead=true;G.kills++;S.kills++;
 const col=z.boss?z.bdef.c2:(z.col||z.t.col);
 burst(z.x,z.y,col,z.boss?70:10,z.boss?320:150,.6,z.boss?5:3);
 burst(z.x,z.y,'#3a1010',z.boss?20:4,90,.8,3);
 light(z.x,z.y,z.boss?300:70,col,.3);decal(z.x,z.y,z.r*1.1,'blood');
 sfx('kill');
 G.scrap+=K.cl.id==='build'?(z.boss?60:2):(z.boss?20:1);
 if(z.boss){bossDeath(z);return}
 const ch=K.burgerCh+(P.goldT>0?.15:0);
 if(z.elite||Math.random()<ch)dropBurger(z.x,z.y);
 if(K.cl.id==='alch'&&Math.random()<.04)PK.push({k:'potion',x:z.x,y:z.y,vx:rnd(-80,80),vy:rnd(-80,80),t:0,bob:rnd(0,6),pot:pick(['heal','rage','speed'])});
 if(z.t.split&&!z.small){for(let i=0;i<2;i++){const c=mkZombie('runner',z.x+rnd(-10,10),z.y+rnd(-10,10),.5);c.small=true;c.col='#b47fd8';Z.push(c)}}
 if(z.t.toxic)ZO.push({k:'toxic',x:z.x,y:z.y,r:60,life:4,max:4,dps:z.dmg*.6,tick:0,col:'#a3e635'});
 if((K.cl.id==='necro'&&Math.random()<.25+K.m.necro)||(K.m.necro&&K.cl.id!=='necro'&&Math.random()<K.m.necro))addMinion('skel',z.x,z.y);
 if(K.st.spread&&z.poisonT>0)cloud(z.x,z.y,50,K.dmg*.6,1.5);
 if(K.cl.id==='vamp')P.hp=Math.min(P.maxhp,P.hp+P.maxhp*.01);
}
function bossDeath(z){
 G.boss=null;const t=G.bossT;S.st.bossKills[z.idx]=(S.st.bossKills[z.idx]||0)+1;
 if(!S.st.bossFast[z.idx]||t<S.st.bossFast[z.idx])S.st.bossFast[z.idx]=Math.round(t*10)/10;
 G.slowmo=1.4;G.flash=.8;G.flashCol=z.bdef.c2;shake(1);sfx('nuke');
 for(let i=0;i<8;i++)later(i*.12,()=>{const a=rnd(0,TAU),r=rnd(0,z.r*1.5);ring(z.x+Math.cos(a)*r,z.y+Math.sin(a)*r,8,90,z.bdef.c2,.5,6);burst(z.x+Math.cos(a)*r,z.y+Math.sin(a)*r,z.bdef.c2,20,260,.6,4,true)});
 ring(z.x,z.y,10,420,z.bdef.c2,1,8);for(let i=0;i<6;i++)dropBurger(z.x+rnd(-40,40),z.y+rnd(-40,40));
 announce(z.name.toUpperCase(),'Verslagen in '+fmtTime(t),z.bdef.c2);
}
function dropBurger(x,y){const a=rnd(0,TAU);PK.push({k:'burger',x,y,vx:Math.cos(a)*120,vy:Math.sin(a)*120,t:0,bob:rnd(0,6)});burst(x,y,'#ffc83d',8,90,.5,3,true)}
function hurt(d,src){
 if(G.state!=='play'||P.dashT>0||G.intro)return;
 if(K.dodge&&Math.random()<K.dodge){txt(P.x,P.y-30,'ONTWEKEN','#fcd34d',14);return}
 d*=1-K.armor;if(P.shieldT>0)d*=P.shieldF;
 P.hp-=d;P.hurtT=.18;shake(.22);sfx('hurt');
 if(S.set.dmgNums)txt(P.x+rnd(-6,6),P.y-28,'-'+fmt(d),'#ff4d6d',15);
 if(P.hp<=0){P.hp=0;gameOver()}
}
function explode(x,y,r,dmg,col,o){
 const oo=Object.assign({aoe:true,col},o);
 near(x,y,r+40,z=>{if(!z.dead){const rr=r+z.r;if(d2(z,{x,y})<rr*rr)hitZ(z,dmg,oo)}});
 ring(x,y,6,r,col,.35,4);ring(x,y,4,r*.6,'#fff',.2,2);burst(x,y,col,18,r*2.6,.5,3.5,true);burst(x,y,'#555',6,r,.8,4);
 light(x,y,r*2.2,col,.3);decal(x,y,r*.7,'scorch');sfx('explosion');shake(.12);
}
function cloud(x,y,r,dps,life,col,rad){CL.push({x,y,r,dps,life:life||3,max:life||3,tick:0,col:col||'#84cc16',rad:!!rad})}
function segDist(z,x,y,cx,cy,len){const px=z.x-x,py=z.y-y,t=px*cx+py*cy;if(t<-z.r||t>len+z.r)return 1e9;return Math.abs(px*cy-py*cx)}
function laserLine(x,y,ang,len,w,dmg,o){
 const cx=Math.cos(ang),cy=Math.sin(ang);let first=null,ft=1e9;
 for(const z of Z){if(z.dead)continue;if(segDist(z,x,y,cx,cy,len)<w+z.r){const t=(z.x-x)*cx+(z.y-y)*cy;if(t<ft){ft=t;first=z}hitZ(z,dmg,o)}}
 return first;
}
function chain(x,y,first,n,dmg,col,o){
 const hit=new Set();let cur=first,px=x,py=y,dd=dmg;
 for(let k=0;k<=n&&cur;k++){hit.add(cur);boltFx(px,py,cur.x,cur.y,col,k===0?3:2);px=cur.x;py=cur.y;hitZ(cur,dd,o);dd*=.88;
  let nb=null,nd=200*200;near(px,py,200,z=>{if(z.dead||hit.has(z))return;const q=(z.x-px)**2+(z.y-py)**2;if(q<nd){nd=q;nb=z}});cur=nb}
}
function visible(z){return z.x>-10&&z.x<W+10&&z.y>-10&&z.y<H+10&&!(z.t.invis&&z.reveal<=0&&d2(z,P)>150*150)}
function nearestZ(x,y,maxR,excl){let best=null,bd=(maxR||1e5)**2;for(const z of Z){if(z.dead||z===excl||!visible(z))continue;const q=(z.x-x)**2+(z.y-y)**2;if(q<bd){bd=q;best=z}}return best}
function pickTarget(){
 let best=null,bv=Infinity;const sn=K.st.type==='sniper';
 for(const z of Z){if(z.dead||!visible(z))continue;
  if(sn){const v=-(z.maxhp+(z.boss?1e15:0)+(z.elite?1e12:0));if(v<bv){bv=v;best=z}}
  else{const d=d2(z,P)-(z.boss&&K.st.type==='beam'?1e9:0);if(d<bv){bv=d;best=z}}}
 return best;
}
function densest(){let best=null,bn=-1;for(let i=0;i<Z.length;i+=Math.max(1,Z.length/25|0)){const z=Z[i];if(z.dead)continue;let n=0;near(z.x,z.y,150,o=>{if(!o.dead&&d2(o,z)<150*150)n++});if(n>bn){bn=n;best=z}}return best}

/* ================= PROJECTIELEN ================= */
const PDEF={x:0,y:0,vx:0,vy:0,r:5,dmg:0,col:'#fff',life:1.4,pierce:0,kind:'bolt',o:null,aoe:0,tx:0,ty:0,hole:0,burger:false,spd:600,tgt:null,ret:false,dist:0,maxd:0,bounce:0,frags:0,tick:0,cloud:0,spin:0,el:null,homing:0};
function proj(x,y,ang,props){const p=PR.get();Object.assign(p,PDEF,props);p.hitS.clear();p.x=x;p.y=y;p.vx=Math.cos(ang)*p.spd;p.vy=Math.sin(ang)*p.spd;p.id=++PID;return p}
function tip(){return{x:P.x+Math.cos(P.ang)*30,y:P.y+Math.sin(P.ang)*30-8}}
const RB=['bolt','ice','explosion','lightning','laser','poison'],RBC=['#a3e635','#7dd3fc','#fb923c','#a5b4fc','#ff3b6b','#84cc16'];
function fire(ang,target){
 const st=K.st,d=K.dmg,tp=tip();
 let type=st.type,col=st.col;
 if(type==='rainbow'){P.rbI=(P.rbI+1)%RB.length;type=RB[P.rbI];col=RBC[P.rbI]}
 fireType(type,ang,target,d,tp,col,st);
 if(P.critShots>0)P.critShots--;
 if(Q().pm>300)part(tp.x,tp.y,Math.cos(ang)*60,Math.sin(ang)*60,.2,col,3,0,1);
 light(tp.x,tp.y,70,col,.08);
 if(type!=='beam'&&type!=='flame')sfx(type,st.pitch||1);
}
function fireType(type,ang,target,d,tp,col,st){
 const m=K.m,o={main:true,col};
 switch(type){
  case 'bolt':proj(tp.x,tp.y,ang,{spd:660,dmg:d,col,r:6,kind:'bolt',o,pierce:m.pierce});break;
  case 'spam':for(let i=0;i<2;i++)proj(tp.x,tp.y,ang+rnd(-.24,.24),{spd:rnd(620,760),dmg:d,col,r:3.2,kind:'spam',life:.9,o});break;
  case 'ice':{const n=st.proj||1;for(let i=0;i<n;i++)proj(tp.x,tp.y,ang+(i-(n-1)/2)*.16,{spd:560,dmg:d,col,r:6,kind:'ice',o:{main:true,slow:true,freeze:(st.freeze||.15)+m.freeze,el:'ice',col}});break}
  case 'explosion':proj(tp.x,tp.y,ang,{spd:st.burger?560:480,dmg:d,col,r:st.burger?9:8,kind:'exp',aoe:(st.aoe||70)*m.aoe,burger:st.burger,o:{main:true,burn:m.burn,el:m.burn?'fire':null}});break;
  case 'void':{const tx=target?target.x:tp.x+Math.cos(ang)*320,ty=target?target.y:tp.y+Math.sin(ang)*320;proj(tp.x,tp.y,ang,{spd:420,dmg:d,col,r:9,kind:'void',tx,ty,hole:(st.hole||95)*m.holeR,life:2.5,o});break}
  case 'laser':{const n=(st.beams||1)+m.beams;for(let i=0;i<n;i++){const a=ang+(i-(n-1)/2)*.12;const f=laserLine(tp.x,tp.y,a,780,5,d,o);beamFx(tp.x,tp.y,tp.x+Math.cos(a)*780,tp.y+Math.sin(a)*780,col,4);if(st.chain&&f&&!f.dead)chain(f.x,f.y,f,st.chain+m.chain,d*.5,'#9fd0ff',{el:'shock'})}break}
  case 'sniper':{const oo={main:true,pierceArmor:true,col};let ex=tp.x+Math.cos(ang)*1400,ey=tp.y+Math.sin(ang)*1400;
   if(st.pierce){laserLine(tp.x,tp.y,ang,1400,7,d,oo);beamFx(tp.x,tp.y,ex,ey,col,7,.25)}
   else{let t=target;if(!t){const cx=Math.cos(ang),cy=Math.sin(ang);let bt=1e9;for(const z of Z){if(z.dead)continue;if(segDist(z,tp.x,tp.y,cx,cy,1400)<z.r+3){const q=(z.x-tp.x)*cx+(z.y-tp.y)*cy;if(q<bt){bt=q;t=z}}}}
    if(t){ex=t.x;ey=t.y;hitZ(t,d,oo);burst(t.x,t.y,'#fff',10,220,.3,2,true)}beamFx(tp.x,tp.y,ex,ey,col,3,.2)}
   shake(.06);break}
  case 'lightning':if(target)chain(tp.x,tp.y,target,(st.chain||4)+m.chain,d,col,{main:true,el:'shock'});break;
  case 'flame':{const R=(st.range||170)*m.range,cx=Math.cos(ang),cy=Math.sin(ang);
   near(P.x,P.y,R+30,z=>{if(z.dead)return;const dx=z.x-P.x,dy=z.y-P.y,dd=Math.hypot(dx,dy);if(dd<R+z.r&&Math.abs(angDiff(Math.atan2(dy,dx),ang))<.4+z.r/Math.max(40,dd))hitZ(z,d,{main:true,burn:(st.burn||.5)+m.burn,el:'fire',col})});
   for(let i=0;i<(Q().pm>300?4:2);i++){const a=ang+rnd(-.32,.32),v=R*rnd(2.2,2.9);part(tp.x,tp.y,Math.cos(a)*v,Math.sin(a)*v,.36,pick(['#ffef9a','#ffb347','#ff6a3d',col]),rnd(5,9),0,1,.9)}
   P.flameT=.12;if(Math.random()<.3)sfx('flame',st.pitch||1);break}
  case 'crystal':proj(tp.x,tp.y,ang,{spd:560,dmg:d,col,r:6,kind:'crystal',frags:(st.frags||4)+m.frags,o});break;
  case 'boomerang':proj(tp.x,tp.y,ang,{spd:520,dmg:d,col,r:11,kind:'boomer',pierce:999,maxd:330*m.range,life:4,o});break;
  case 'poison':{const tx=target?target.x:tp.x+Math.cos(ang)*300,ty=target?target.y:tp.y+Math.sin(ang)*300;proj(tp.x,tp.y,ang,{spd:440,dmg:d,col,r:7,kind:'poison',tx,ty,cloud:(st.cloud||65)*m.range,life:2,o:{main:true,el:'poison',col}});break}
  case 'blood':proj(tp.x,tp.y,ang,{spd:780,dmg:d,col,r:5,kind:'blood',o:{main:true,bleed:true,el:'blood',col}});break;
  case 'rocket':proj(tp.x,tp.y,ang+rnd(-.3,.3),{spd:260,dmg:d,col,r:6,kind:'rocket',tgt:target,aoe:(st.aoe||55)*m.aoe,life:3,o:{main:true,burn:m.burn}});break;
  case 'sound':{const R=(st.range||260)*m.range;near(P.x,P.y,R+30,z=>{if(z.dead)return;const dx=z.x-P.x,dy=z.y-P.y,dd=Math.hypot(dx,dy);if(dd<R+z.r&&Math.abs(angDiff(Math.atan2(dy,dx),ang))<.55)hitZ(z,d,{main:true,kb:Math.atan2(dy,dx),kbF:22,stun:.08+m.stun,col})});
   FX.push({k:'arc',x:P.x,y:P.y,ang,r:R,col,t:.3,max:.3});break}
  case 'plasma':proj(tp.x,tp.y,ang,{spd:250,dmg:d,col,r:14,kind:'plasma',pierce:999,life:2.4,o});break;
  case 'shadow':proj(tp.x,tp.y,ang+rnd(-.5,.5),{spd:520,dmg:d,col,r:6,kind:'shadow',tgt:target,bounce:(st.bounce||3)+m.bounce,life:3,homing:1,o:{main:true,el:'void',col}});break;
  case 'quake':{const R=(st.range||190)*m.range;near(P.x,P.y,R+30,z=>{if(!z.dead&&d2(z,P)<(R+z.r)**2)hitZ(z,d,{main:true,stun:(st.stun||.2)+m.stun,aoe:true,col})});
   ring(P.x,P.y,10,R,col,.4,6);FX.push({k:'crack',x:P.x,y:P.y,r:R,t:.6,max:.6,seed:Math.random()*1000});burst(P.x,P.y,'#a8865c',14,R*1.5,.5,4);shake(.15);break}
  case 'time':{const tx=target?target.x:tp.x+Math.cos(ang)*260,ty=target?target.y:tp.y+Math.sin(ang)*260;proj(tp.x,tp.y,ang,{spd:520,dmg:d,col,r:7,kind:'time',tx,ty,life:2,o});break}
  case 'drone':proj(tp.x,tp.y,ang,{spd:700,dmg:d,col,r:4,kind:'bolt',o});break;
  case 'tornado':TN.push({x:tp.x,y:tp.y,vx:Math.cos(ang)*130,vy:Math.sin(ang)*130,r:46*m.range,life:3.2,max:3.2,tick:0,dmg:d,col,rot:0});break;
  case 'portal':{const tx=target?target.x:tp.x+Math.cos(ang)*250,ty=target?target.y:tp.y+Math.sin(ang)*250,pa=ang+(Math.random()<.5?1:-1)*Math.PI/2;
   PO.push({x:clamp(tx+Math.cos(pa)*140,30,W-30),y:clamp(ty+Math.sin(pa)*140,30,H-30),shots:(st.shots||5)+m.portalShots,cd:.25,dmg:d,col,life:2,max:2,ang:0});sfx('portal');break}
  case 'soul':{const n=(st.spirits||2)+m.spirits;for(let i=0;i<n;i++)proj(tp.x,tp.y,ang+rnd(-1,1),{spd:300,dmg:d,col,r:7,kind:'spirit',pierce:1,life:4,homing:1,o:{main:true,el:'holy',col}});break}
  case 'beam':{if(!target)break;if(P.bt===target)P.ramp=Math.min(3,P.ramp+.1);else{P.bt=target;P.ramp=1}
   const ov=P.beamOvT>0?3:1,a=Math.atan2(target.y-tp.y,target.x-tp.x),len=Math.hypot(target.x-tp.x,target.y-tp.y);
   const cx=Math.cos(a),cy=Math.sin(a);for(const z of Z){if(z.dead)continue;if(segDist(z,tp.x,tp.y,cx,cy,len)<6*ov+z.r)hitZ(z,d*P.ramp*ov,{main:true,col,noCrit:Math.random()<.5})}
   P.beamVis={x2:target.x,y2:target.y,t:.15,w:(3+P.ramp*2.5)*ov};if(Math.random()<.25)sfx('beam',st.pitch||1);
   if(Q().pm>300)part(target.x,target.y,rnd(-120,120),rnd(-120,120),.25,col,3,0,1);break}
  case 'meteor':{const tx=target?target.x:tp.x+Math.cos(ang)*300,ty=target?target.y:tp.y+Math.sin(ang)*300,R=(st.aoe||120)*m.aoe;
   meteorAt(tx,ty,R,d,col,.55,{burn:m.burn+.3,el:'fire'});break}
  case 'nuke':{const tx=target?target.x:tp.x+Math.cos(ang)*300,ty=target?target.y:tp.y+Math.sin(ang)*300;proj(tp.x,tp.y,ang,{spd:300,dmg:d,col,r:11,kind:'nuke',tx,ty,aoe:(st.aoe||230)*m.aoe,life:3,o});break}
  case 'galaxy':proj(tp.x,tp.y,ang,{spd:620,dmg:d,col,r:6,kind:'star',pierce:1+m.pierce,o:{main:true,el:'void',col}});break;
 }
}
function meteorAt(x,y,R,d,col,delay,o){
 TE.push({k:'c',x,y,r:R*.75,t:delay,max:delay,ally:true});
 FX.push({k:'fall',x,y,col,t:delay,max:delay});
 later(delay,()=>{if(G.state!=='play')return;explode(x,y,R,d,col,o);burst(x,y,'#ffd27a',10,R*2,.7,5,true);decal(x,y,R*.8,'crater');shake(.25);sfx('meteor')});
}
function makeHole(x,y,r,dmg,life){HO.push({x,y,r,dmg,life:life||2.2,max:life||2.2,tick:0});sfx('void');ring(x,y,r,4,'#b388ff',.35,3);light(x,y,r*2,'#8b5cf6',.5)}
function staffSpecial(){
 if(!P||P.spT>0||G.state!=='play'||G.intro)return;
 const st=K.st,sp=K.sp,d=K.dmg,col=st.col,m=K.m;P.spT=sp.cd*K.cdMul;sfx('special');
 txt(P.x,P.y-50,sp.n,col,18,true);ring(P.x,P.y,10,80,col,.4,4);
 const R=(r)=>r*m.range;
 switch(st.sp?st.id:st.type){
  case 'bolt':for(let i=0;i<16;i++)proj(P.x,P.y,i/16*TAU,{spd:620,dmg:d*2,col,r:7,kind:'bolt',pierce:3+m.pierce});break;
  case 'spam':for(let i=0;i<60;i++)later(i*.017,()=>{if(P)proj(P.x,P.y,i*.42,{spd:640,dmg:d*1.6,col,r:4,kind:'spam',life:1.1})});break;
  case 'laser':P.beam={t:2,ang:P.ang,tick:0};break;
  case 'ice':ring(P.x,P.y,10,280,'#bfe9ff',.5,6);burst(P.x,P.y,'#e0f6ff',40,380,.6,3,true);near(P.x,P.y,300,z=>{if(!z.dead&&d2(z,P)<280*280){if(!z.boss)z.frozen=2.6+m.freeze*3;else{z.slowT=3;z.slowF=.5}hitZ(z,d*4,{el:'ice'})}});break;
  case 'sniper':{const ts=Z.filter(z=>!z.dead).sort((a,b)=>b.maxhp-a.maxhp).slice(0,5);ts.forEach((z,i)=>later(i*.12,()=>{if(z.dead||!P)return;beamFx(P.x,P.y,z.x,z.y,col,4,.3);hitZ(z,d*4,{crit:true,pierceArmor:true});sfx('sniper')}));break}
  case 'explosion':for(let i=0;i<8;i++)later(i*.11,()=>{const z=pick(Z.filter(q=>!q.dead));if(!z)return;FX.push({k:'fall',x:z.x,y:z.y,col,t:.2,max:.2,burger:st.burger});const x=z.x,y=z.y;later(.2,()=>explode(x,y,(st.aoe||70)*1.3*m.aoe,d*2.5,col,{burn:m.burn}))});break;
  case 'lightning':for(let i=0;i<12;i++)later(i*.12,()=>{const z=pick(Z.filter(q=>!q.dead));if(!z)return;boltFx(z.x+rnd(-40,40),-20,z.x,z.y,col,4);explode(z.x,z.y,50,d*3,col,{el:'shock'});sfx('lightning')});break;
  case 'void':{const b=densest(),p=b||{x:P.x+Math.cos(P.ang)*200,y:P.y+Math.sin(P.ang)*200};makeHole(p.x,p.y,(st.hole||95)*2.2*m.holeR,d*1.6,4);break}
  case 'flame':P.flameRing=3;break;
  case 'crystal':for(let i=0;i<24;i++)later(i*.04,()=>{const z=pick(Z.filter(q=>!q.dead));const x=z?z.x+rnd(-30,30):rnd(40,W-40),y=z?z.y+rnd(-30,30):rnd(40,H-40);proj(x,y-300,Math.PI/2,{spd:900,dmg:d*1.4,col,r:7,kind:'crystal',frags:3,life:.36})});break;
  case 'boomerang':for(let i=0;i<10;i++)proj(P.x,P.y,i/10*TAU,{spd:520,dmg:d*1.5,col,r:11,kind:'boomer',pierce:999,maxd:300,life:4});break;
  case 'poison':{const b=densest()||P;cloud(b.x,b.y,170*m.range,d*2.5*m.poison,6);ring(b.x,b.y,10,170,col,.5,5);break}
  case 'blood':{let n=0;near(P.x,P.y,280,z=>{if(!z.dead&&d2(z,P)<260*260){hitZ(z,d*3,{bleed:true,el:'blood'});n++}});P.hp=Math.min(P.maxhp,P.hp+n*P.maxhp*.02);ring(P.x,P.y,10,260,col,.5,6);burst(P.x,P.y,col,30,300,.6,3,true);break}
  case 'rocket':for(let i=0;i<12;i++)later(i*.06,()=>{if(P)proj(P.x,P.y,P.ang+rnd(-1.5,1.5),{spd:220,dmg:d*1.5,col,r:6,kind:'rocket',aoe:(st.aoe||55)*m.aoe,life:3.5,o:{burn:m.burn}})});break;
  case 'sound':{near(P.x,P.y,360,z=>{if(z.dead||d2(z,P)>340*340)return;const a=Math.atan2(z.y-P.y,z.x-P.x);hitZ(z,d*3,{kb:a,kbF:110,stun:1});if(!z.boss)z.stun=Math.max(z.stun,1.3)});ring(P.x,P.y,10,340,col,.5,8);shake(.3);break}
  case 'plasma':for(let i=0;i<8;i++)proj(P.x,P.y,i/8*TAU,{spd:220,dmg:d*1.3,col,r:16,kind:'plasma',pierce:999,life:2.6});break;
  case 'shadow':for(let i=0;i<20;i++)proj(P.x,P.y,i/20*TAU,{spd:460,dmg:d*1.2,col,r:6,kind:'shadow',bounce:2,life:3,homing:1,o:{el:'void',col}});break;
  case 'quake':for(let i=0;i<3;i++)later(i*.35,()=>{if(!P)return;const Rr=R(170+i*90);near(P.x,P.y,Rr+30,z=>{if(!z.dead&&d2(z,P)<Rr*Rr){hitZ(z,d*2.5,{aoe:true});if(!z.boss)z.stun=1.2}});ring(P.x,P.y,10,Rr,col,.5,8);FX.push({k:'crack',x:P.x,y:P.y,r:Rr,t:.8,max:.8,seed:Math.random()*1000});shake(.35);sfx('quake')});break;
  case 'time':for(const z of Z){if(z.dead)continue;z.slowT=4;z.slowF=z.boss?.6:.3;z.ampT=4;z.amp=1.3}ring(P.x,P.y,10,Math.max(W,H),col,.8,4);break;
  case 'drone':P.droneOvT=6;break;
  case 'tornado':for(let i=0;i<4;i++){const a=i/4*TAU+P.ang;TN.push({x:P.x,y:P.y,vx:Math.cos(a)*150,vy:Math.sin(a)*150,r:60*m.range,life:4,max:4,tick:0,dmg:d*1.2,col,rot:0})}break;
  case 'portal':for(let i=0;i<6;i++){const z=pick(Z.filter(q=>!q.dead)),a=i/6*TAU;const cx=z?z.x:P.x,cy=z?z.y:P.y;PO.push({x:clamp(cx+Math.cos(a)*150,30,W-30),y:clamp(cy+Math.sin(a)*150,30,H-30),shots:8+m.portalShots,cd:.2+i*.05,dmg:d,col,life:2.6,max:2.6,ang:0})}break;
  case 'soul':for(let i=0;i<15+m.spirits*2;i++)proj(P.x,P.y,i/15*TAU,{spd:280,dmg:d*1.2,col,r:7,kind:'spirit',pierce:2,life:5,homing:1,o:{el:'holy',col}});break;
  case 'beam':P.beamOvT=3;break;
  case 'meteor':for(let i=0;i<12;i++)later(i*.12,()=>{const z=pick(Z.filter(q=>!q.dead));const x=z?z.x:rnd(60,W-60),y=z?z.y:rnd(60,H-60);meteorAt(x,y,(st.aoe||120)*m.aoe,d*1.6,col,.5,{burn:m.burn+.3,el:'fire'})});break;
  case 'nuke':{const b=densest()||{x:W/2,y:H/2};TE.push({k:'c',x:b.x,y:b.y,r:380,t:1,max:1,ally:true});later(1,()=>{explode(b.x,b.y,380*m.aoe,d*3,col,{});G.flash=.6;G.flashCol='#eaffb0';shake(1);sfx('nuke');cloud(b.x,b.y,220,d*.4,5,'#bef264',true);if(m.freeze)near(b.x,b.y,400,z=>{if(!z.boss)z.frozen=2})});break}
  case 'galaxy':{for(const p of PL)later(.05,()=>explode(P.x+Math.cos(p.a)*p.R,P.y+Math.sin(p.a)*p.R,140,d*5,col,{el:'void'}));ring(P.x,P.y,10,300,col,.6,6);break}
  case 'rainbow':{const t=nearestZ(P.x,P.y);const a=t?Math.atan2(t.y-P.y,t.x-P.x):P.ang;RB.forEach((ty,i)=>later(i*.08,()=>{if(P)for(let k=0;k<3;k++)fireType(ty,a+(k-1)*.3,t&&!t.dead?t:null,d*1.5,{x:P.x,y:P.y},RBC[i],{...st,aoe:90,chain:5,freeze:.3,cloud:80})}));break}
  case 'destroyer':{G.flash=.7;G.flashCol='#c4b5fd';shake(1.2);sfx('nuke');for(const z of Z)if(!z.dead)hitZ(z,d*12,{el:'void',crit:true});makeHole(W/2,H/2,260,d*2,4);for(let i=0;i<10;i++)later(i*.08,()=>ring(W/2,H/2,10,Math.max(W,H)*(.3+i*.1),i%2?'#fff':col,.6,8));break}
  default:for(let i=0;i<16;i++)proj(P.x,P.y,i/16*TAU,{spd:620,dmg:d*2,col,r:7,kind:'bolt',pierce:3});
 }
}

/* ================= UNITS ================= */
function mkWall(x,y){const c=K.cl.id,hp=160*dmgScale(G.wave)*K.cm*K.m.wallHp*(c==='tank'?1.5:c==='guardian'?1.3:1);return{x:clamp(x,20,W-20),y:clamp(y,20,H-20),r:19,hp,maxhp:hp,hit:0,col:K.cl.col}}
function addWall(x,y){if(WL.length>=70)WL.shift();WL.push(mkWall(x,y));burst(x,y,K.cl.col,5,80,.3,2)}
function wallRing(x,y,R,n){for(let i=0;i<n;i++){const a=i/n*TAU;addWall(x+Math.cos(a)*R,y+Math.sin(a)*R)}sfx('build')}
function wallArc(cx,cy,a,n,sp){for(let i=-(n-1)/2;i<=(n-1)/2;i++)addWall(cx+Math.cos(a+Math.PI/2)*i*(sp||38),cy+Math.sin(a+Math.PI/2)*i*(sp||38));sfx('build')}
const TK={
 basic:{rate:2,f:.18,range:250,col:'#fb923c'},mini:{rate:4,f:.08,range:230,col:'#fbbf24'},laser:{rate:2.2,f:.18,range:300,col:'#ff3b6b'},
 rocket:{rate:.8,f:.5,range:320,col:'#f97316'},cannon:{rate:.7,f:.55,range:280,col:'#a8a29e'},frost:{rate:1.5,f:.1,range:240,col:'#7dd3fc'},
 tesla:{rate:1.2,f:.22,range:240,col:'#a5b4fc'},burger:{rate:1.2,f:.3,range:260,col:'#ffc83d'},mega:{rate:3,f:.3,range:340,col:'#e879f9'}};
const TNL={basic:'Tower',mini:'Mini-turret',laser:'Laser',rocket:'Raket',cannon:'Cannon',frost:'Frost',tesla:'Tesla',burger:'Burger',mega:'Mega'};
function addTower(x,y,lvl,kind,cap){
 kind=kind||'basic';const hp=150*dmgScale(G.wave)*K.cm*K.units*(kind==='mega'?3:1);
 if(TW.length>=(cap||12))TW.shift();
 TW.push({x:clamp(x,24,W-24),y:clamp(y,24,H-24),r:kind==='mini'?13:17,lvl:Math.min(5,lvl||1),hp,maxhp:hp,cd:.5,ang:0,kind,hit:0});
 ring(x,y,4,40,TK[kind].col,.3,3);sfx('build');
}
function addMinion(kind,x,y){
 const ds=dmgScale(G.wave)*K.cm*K.units;
 const D={imp:{hp:55,r:9,spd:170,dmg:.25,cd:.6,life:40,col:'#4ade80'},skel:{hp:45,r:10,spd:140,dmg:.22,cd:.7,life:25,col:'#e8e6dc'},
  golem:{hp:420,r:24,spd:80,dmg:.9,cd:1,life:22,col:'#8d7b68',block:1},wolf:{hp:70,r:11,spd:230,dmg:.28,cd:.45,life:45,col:'#a8a29e'},
  bear:{hp:600,r:26,spd:110,dmg:1.2,cd:.9,life:24,col:'#7c4a1e',block:1},soldier:{hp:80,r:10,spd:120,dmg:.2,cd:.7,life:60,col:'#f59e0b',ranged:240},
  elite:{hp:160,r:12,spd:140,dmg:.4,cd:.45,life:60,col:'#e879f9',ranged:300}}[kind];
 if(MN.length>=28)MN.shift();
 const m={kind,x:clamp(x==null?P.x+rnd(-30,30):x,10,W-10),y:clamp(y==null?P.y+rnd(-30,30):y,10,H-10),r:D.r,hp:D.hp*ds,maxhp:D.hp*ds,spd:D.spd,dmgF:D.dmg,cdM:D.cd,cd:0,life:D.life,col:D.col,ph:rnd(0,6),hit:0,block:D.block,ranged:D.ranged,face:0};
 MN.push(m);burst(m.x,m.y,D.col,12,110,.45,2.5,true);
}
const unitMul=()=>K.units*(P.unitT>0?2:1);

/* ================= CLASS ABILITIES ================= */
function useAbility(){
 if(!P||P.abT>0||G.state!=='play'||G.intro)return;const c=K.cl;P.abT=c.ab.cd*K.cdMul;sfx('ability');txt(P.x,P.y-50,c.ab.n,c.col,18,true);
 const tgt=nearestZ(P.x,P.y),ta=tgt?Math.atan2(tgt.y-P.y,tgt.x-P.x):P.ang;
 switch(c.id){
  case 'recruit':P.hp=Math.min(P.maxhp,P.hp+P.maxhp*.35);P.shieldT=2;P.shieldF=.5;ring(P.x,P.y,10,110,c.col,.4,5);burst(P.x,P.y,'#7dffb0',20,120,.6,3,true);break;
  case 'scout':{let mx=(KEYS.d||KEYS.arrowright?1:0)-(KEYS.a||KEYS.arrowleft?1:0),my=(KEYS.s||KEYS.arrowdown?1:0)-(KEYS.w||KEYS.arrowup?1:0);
   if(JOY.active){mx=JOY.dx;my=JOY.dy}if(!mx&&!my){mx=-Math.cos(ta);my=-Math.sin(ta)}const L=Math.hypot(mx,my)||1;P.dvx=mx/L*950;P.dvy=my/L*950;P.dashT=.2;break}
  case 'guardian':{wallArc(P.x+Math.cos(ta+1.2)*70,P.y+Math.sin(ta+1.2)*70,ta+1.2,4);wallArc(P.x+Math.cos(ta-1.2)*70,P.y+Math.sin(ta-1.2)*70,ta-1.2,4);P.shieldT=3;P.shieldF=.4;break}
  case 'monk':near(P.x,P.y,190,z=>{if(z.dead||d2(z,P)>170*170)return;const a=Math.atan2(z.y-P.y,z.x-P.x);if(!z.boss){z.x+=Math.cos(a)*90;z.y+=Math.sin(a)*90;z.stun=1}hitZ(z,K.power*.8,{})});ring(P.x,P.y,10,170,c.col,.4,7);shake(.25);break;
  case 'mage':P.rateT=5;ring(P.x,P.y,10,90,c.col,.4,4);break;
  case 'tank':wallRing(P.x,P.y,84,13);P.shieldT=3;P.shieldF=.2;break;
  case 'assassin':{let t=null,bh=-1;for(const z of Z)if(!z.dead&&visible(z)&&z.maxhp>bh){bh=z.maxhp;t=z}if(!t){P.abT=1;break}
   burst(P.x,P.y,'#2a0f1c',20,160,.5,4);const a=Math.atan2(P.y-t.y,P.x-t.x);P.x=clamp(t.x-Math.cos(a)*(t.r+22),20,W-20);P.y=clamp(t.y-Math.sin(a)*(t.r+22),20,H-20);P.dashT=.35;P.dvx=P.dvy=0;
   hitZ(t,K.dmg*8,{crit:true,col:c.col});burst(P.x,P.y,c.col,20,200,.5,3,true);break}
  case 'pyro':near(P.x,P.y,240,z=>{if(!z.dead&&d2(z,P)<220*220){hitZ(z,K.power*1.5,{burn:2,el:'fire'})}});ring(P.x,P.y,10,220,'#ff7a2d',.5,10);burst(P.x,P.y,'#ffb347',40,320,.5,6,true);break;
  case 'cryo':near(P.x,P.y,320,z=>{if(!z.dead&&d2(z,P)<300*300){if(z.boss){z.slowT=3;z.slowF=.5}else z.frozen=2.5+K.m.freeze*3;hitZ(z,K.power*.8,{el:'ice'})}});ring(P.x,P.y,10,300,'#bfe9ff',.6,8);burst(P.x,P.y,'#e0f6ff',40,380,.6,3,true);break;
  case 'sniper':P.critShots=8;break;
  case 'eng':{const cx=P.x+Math.cos(ta)*85,cy=P.y+Math.sin(ta)*85;wallArc(cx,cy,ta,7);break}
  case 'mechanic':for(const t of TW)t.hp=t.maxhp;for(const w of WL)w.hp=w.maxhp;P.ovT=6;break;
  case 'berserk':P.rageT=6;burst(P.x,P.y,'#ef4444',24,200,.5,3,true);break;
  case 'alch':potion(pick(['heal','rage','poison','ice','gold']),tgt);break;
  case 'druid':near(P.x,P.y,280,z=>{if(!z.dead&&d2(z,P)<260*260){if(!z.boss){z.stun=2.5;z.root=2.5}else{z.slowT=2.5;z.slowF=.4}}});P.hp=Math.min(P.maxhp,P.hp+P.maxhp*.15);ring(P.x,P.y,10,260,'#22c55e',.6,6);burst(P.x,P.y,'#86efac',30,260,.7,3,true);break;
  case 'summ':addMinion('golem');break;
  case 'build':addTower(P.x-40,P.y,2);addTower(P.x+40,P.y,2);wallRing(P.x,P.y,105,17);break;
  case 'beast':addMinion('bear');break;
  case 'vamp':P.bloodT=5;burst(P.x,P.y,'#be123c',24,200,.5,3,true);break;
  case 'stormc':for(let i=0;i<15;i++)later(i*.1,()=>{const z=pick(Z.filter(q=>!q.dead));if(!z)return;boltFx(z.x+rnd(-40,40),-20,z.x,z.y,'#93c5fd',4);explode(z.x,z.y,55,K.power*.9,'#93c5fd',{el:'shock'})});break;
  case 'hacker':{const list=Z.filter(z=>!z.dead).sort((a,b)=>d2(a,P)-d2(b,P)).slice(0,12);for(const z of list){if(z.boss){z.atkCd+=4}else{z.stun=3;z.hack=3}z.ampT=3;z.amp=1.5;beamFx(P.x,P.y,z.x,z.y,'#22d3ee',1.5,.3)}break}
  case 'necro':for(let i=0;i<6;i++)addMinion('skel');break;
  case 'pala':explode(P.x,P.y,230,K.power*3,'#fde68a',{el:'holy'});P.hp=Math.min(P.maxhp,P.hp+P.maxhp*.2);P.shieldT=2;P.shieldF=.5;burst(P.x,P.y,'#fff7c2',40,300,.7,3,true);break;
  case 'commander':P.unitT=6;for(let i=0;i<3;i++)addMinion('soldier');ring(P.x,P.y,10,120,c.col,.5,5);break;
  case 'arch':for(const t of TW){t.lvl=Math.min(5,t.lvl+1);t.hp=t.maxhp;ring(t.x,t.y,5,40,'#fcd34d',.4,3)}break;
  case 'gambler':jackpot();break;
  case 'chrono':G.timeStop=3.5;ring(P.x,P.y,10,Math.max(W,H),c.col,.8,4);break;
  case 'keeper':{const old=P.hist.length?P.hist[0]:P.hp;if(old>P.hp){txt(P.x,P.y-30,'+'+fmt(old-P.hp),'#86efac',16)}P.hp=Math.max(P.hp,old);G.slowAll=4;ring(P.x,P.y,Math.max(W,H),10,c.col,.8,4);break}
  case 'eprime':addTower(P.x+Math.cos(ta)*40,P.y+Math.sin(ta)*40,3,'mega',14);for(const w of WL)w.hp=w.maxhp;break;
  case 'dimen':{let best=null,bs=-1;for(let i=0;i<24;i++){const x=rnd(60,W-60),y=rnd(60,H-60);let md=1e12;for(const z of Z)if(!z.dead)md=Math.min(md,(z.x-x)**2+(z.y-y)**2);if(md>bs){bs=md;best={x,y}}}
   makeHole(P.x,P.y,120*K.m.holeR,K.dmg*.8,3);burst(P.x,P.y,c.col,24,200,.5,3,true);if(best){P.x=best.x;P.y=best.y}P.dashT=.5;P.dvx=P.dvy=0;burst(P.x,P.y,c.col,24,200,.5,3,true);break}
  case 'blord':for(let i=0;i<14;i++)later(i*.1,()=>{const z=pick(Z.filter(q=>!q.dead));const x=z?z.x:rnd(40,W-40),y=z?z.y:rnd(40,H-40);FX.push({k:'fall',x,y,col:'#ffc83d',burger:true,t:.25,max:.25});later(.25,()=>explode(x,y,75,K.power*1.2,'#ffc83d',{}))});break;
  case 'cmdx':{P.hp=Math.min(P.maxhp,P.hp+P.maxhp*.3);for(let i=0;i<3;i++){const b=i===0?densest():pick(Z.filter(q=>!q.dead));const x=b?b.x:rnd(80,W-80),y=b?b.y:rnd(80,H-80);TE.push({k:'c',x,y,r:95,t:.6,max:.6,ally:true});
   later(.6+i*.15,()=>{FX.push({k:'beam',x1:x,y1:-40,x2:x,y2:y,col:'#e879f9',w:34,t:.5,max:.5});explode(x,y,100,K.power*4,'#e879f9',{});shake(.4)})}break}
 }
}
function potion(kind,tgt){
 sfx('potion');const c='#a3e635';
 switch(kind){
  case 'heal':P.hp=Math.min(P.maxhp,P.hp+P.maxhp*.3);txt(P.x,P.y-40,'Heal potion','#86efac',16,true);burst(P.x,P.y,'#86efac',20,140,.6,3,true);break;
  case 'rage':P.potT=6;txt(P.x,P.y-40,'Rage potion','#f87171',16,true);break;
  case 'speed':P.rateT=Math.max(P.rateT,4);txt(P.x,P.y-40,'Snelheid potion','#93c5fd',16,true);break;
  case 'poison':{const b=tgt||densest()||P;cloud(b.x,b.y,130,K.power*1.2,5);txt(P.x,P.y-40,'Gif potion',c,16,true);break}
  case 'ice':{const b=tgt||P;near(b.x,b.y,170,z=>{if(!z.dead&&d2(z,b)<150*150){if(!z.boss)z.frozen=2.5;hitZ(z,K.power,{el:'ice'})}});ring(b.x,b.y,10,150,'#bfe9ff',.5,6);txt(P.x,P.y-40,'IJs potion','#bfe9ff',16,true);break}
  case 'gold':P.goldT=10;txt(P.x,P.y-40,'Goud potion: meer burgers!','#ffc83d',16,true);break;
 }
}
function jackpot(){
 const r=1+(Math.random()*6|0);txt(P.x,P.y-70,'🎲 '+r,'#10b981',24,true);
 switch(r){
  case 1:P.hp=Math.min(P.maxhp,P.hp+P.maxhp*.1);txt(P.x,P.y-46,'Pech... +10% HP','#a7f3d0',15);break;
  case 2:P.jackT=8;txt(P.x,P.y-46,'Dubbele damage!','#10b981',15);break;
  case 3:dropBurger(P.x+30,P.y);txt(P.x,P.y-46,'Gouden kans!','#ffc83d',15);break;
  case 4:P.hp=P.maxhp;txt(P.x,P.y-46,'Volle heal!','#86efac',15);break;
  case 5:for(let i=0;i<6;i++)later(i*.15,()=>{const z=pick(Z.filter(q=>!q.dead));if(z)meteorAt(z.x,z.y,100,K.power*2,'#10b981',.4,{})});txt(P.x,P.y-46,'Meteoren!','#10b981',15);break;
  case 6:P.jackT=8;P.hp=P.maxhp;for(let i=0;i<10;i++)later(i*.1,()=>{const z=pick(Z.filter(q=>!q.dead));if(z)explode(z.x,z.y,90,K.power*2,'#ffd700',{})});txt(P.x,P.y-46,'JACKPOT!!!','#ffd700',22,true);G.flash=.3;G.flashCol='#ffd700';break;
 }
}
function autoAbilityOk(){
 const c=K.cl.id,alive=Z.length;
 if(c==='recruit')return P.hp<P.maxhp*.6;
 if(c==='keeper')return P.hist.length&&P.hist[0]-P.hp>P.maxhp*.25;
 if(c==='scout'||c==='dimen'){let close=false;for(const z of Z)if(!z.dead&&d2(z,P)<(z.r+P.r+40)**2){close=true;break}return close}
 if(c==='pala'||c==='monk'||c==='pyro'||c==='cryo'||c==='druid'){let n=0;near(P.x,P.y,230,z=>{if(!z.dead&&d2(z,P)<220*220)n++});return n>=3||(G.boss&&d2(G.boss,P)<260*260)}
 if(c==='mechanic'||c==='arch')return TW.length>0&&alive>=3;
 return alive>=3||!!G.boss;
}
function classTick(dt){
 const c=K.cl.id,lv=K.cLv;P.ctT-=dt;P.ct2-=dt;
 const cnt=k=>{let n=0;for(const t of TW)if(t.kind===k)n++;return n},mcnt=k=>{let n=0;for(const m of MN)if(m.kind===k)n++;return n};
 const tk=d=>K.m.towerKind||d,around=r=>{const a=rnd(0,TAU);return[P.x+Math.cos(a)*rnd(r*.6,r),P.y+Math.sin(a)*rnd(r*.6,r)]};
 switch(c){
  case 'eng':if(P.ctT<=0){P.ctT=9;if(TW.length<3+Math.floor((lv-1)/3)){const[x,y]=around(110);addTower(x,y,1+Math.floor((lv-1)/4),tk('basic'))}}break;
  case 'mechanic':if(P.ctT<=0){P.ctT=6;if(TW.length<4+Math.floor(lv/3)){const[x,y]=around(90);addTower(x,y,1,tk('mini'))}}break;
  case 'arch':if(P.ctT<=0){P.ctT=8;if(TW.length<4+Math.floor(lv/4)){const[x,y]=around(120);const kinds=['cannon','frost','tesla','rocket'];addTower(x,y,1,K.m.towerKind||kinds[P.archI++%4])}}break;
  case 'eprime':if(P.ctT<=0){P.ctT=7;if(TW.length<5+Math.floor(lv/4)){const[x,y]=around(120);addTower(x,y,2,K.m.towerKind||(P.archI++%2?'tesla':'laser'),14)}}
   if(P.ct2<=0){P.ct2=10;const t=nearestZ(P.x,P.y);if(t){const a=Math.atan2(t.y-P.y,t.x-P.x);wallArc(P.x+Math.cos(a)*80,P.y+Math.sin(a)*80,a,3)}}break;
  case 'guardian':if(P.ctT<=0){P.ctT=12;const t=nearestZ(P.x,P.y);if(t){const a=Math.atan2(t.y-P.y,t.x-P.x);wallArc(P.x+Math.cos(a)*70,P.y+Math.sin(a)*70,a,3)}}break;
  case 'summ':if(P.ctT<=0){P.ctT=5;if(mcnt('imp')<4+Math.floor(lv/3))addMinion('imp')}break;
  case 'beast':if(P.ctT<=0){P.ctT=7;if(mcnt('wolf')<3+Math.floor(lv/4))addMinion('wolf')}break;
  case 'commander':if(P.ctT<=0){P.ctT=9;if(mcnt('soldier')<3+Math.floor(lv/4))addMinion('soldier')}break;
  case 'cmdx':if(P.ctT<=0){P.ctT=8;if(mcnt('elite')<4)addMinion('elite')}break;
  case 'blord':if(P.ctT<=0){P.ctT=8;if(cnt('burger')<4){const[x,y]=around(90);addTower(x,y,1,'burger')}}break;
  case 'pala':P.holyT-=dt;if(P.holyT<=0){P.holyT=.5;near(P.x,P.y,140,z=>{if(!z.dead&&d2(z,P)<(120+z.r)**2)hitZ(z,K.power*.25,{noCrit:true,el:'holy'})})}break;
  case 'stormc':if(P.ctT<=0){P.ctT=1.2;const vis=Z.filter(z=>!z.dead&&visible(z));const z=pick(vis);if(z){boltFx(z.x+rnd(-30,30),-20,z.x,z.y,'#93c5fd',3);hitZ(z,K.power*.6,{el:'shock'});sfx('lightning')}}break;
  case 'dimen':if(P.ctT<=0){P.ctT=7;const b=densest();if(b){const a=rnd(0,TAU);PO.push({x:clamp(b.x+Math.cos(a)*150,30,W-30),y:clamp(b.y+Math.sin(a)*150,30,H-30),shots:6+K.m.portalShots,cd:.3,dmg:K.power*.25,col:'#c084fc',life:2.2,max:2.2,ang:0});sfx('portal')}}break;
 }
}
function build(kind){
 if(G.state!=='play'||G.paused||K.cl.id!=='build')return;
 if(kind==='tower'){if(G.scrap<25){toast('Niet genoeg scrap (25 nodig)');sfx('no');return}G.scrap-=25;addTower(P.x+rnd(-8,8),P.y+rnd(-8,8),1,K.m.towerKind||'basic')}
 else if(kind==='wall'){if(G.scrap<6){toast('Niet genoeg scrap (6 nodig)');sfx('no');return}G.scrap-=6;addWall(P.x+Math.cos(P.ang)*55,P.y+Math.sin(P.ang)*55);sfx('build')}
 else{let t=null,bd=1e12;for(const q of TW){const d=d2(q,P);if(d<bd){bd=d;t=q}}
  if(!t){toast('Geen tower om te upgraden');sfx('no');return}
  if(t.lvl>=5){toast('Tower is al max level (5)');sfx('no');return}
  const cost=20*t.lvl;if(G.scrap<cost){toast('Upgrade kost '+cost+' scrap');sfx('no');return}
  G.scrap-=cost;t.lvl++;t.maxhp*=1.4;t.hp=t.maxhp;ring(t.x,t.y,5,50,'#facc15',.4,4);txt(t.x,t.y-24,'Tower Lv '+t.lvl,'#facc15',16,true);sfx('build')}
}

/* ================= BOSS ================= */
function enemyShot(x,y,a,spd,dmg,col,r,homing,life,slow){const e=EP.get();e.x=x;e.y=y;e.vx=Math.cos(a)*spd;e.vy=Math.sin(a)*spd;e.spd=spd;e.dmg=dmg;e.col=col;e.r=r||7;e.homing=homing||0;e.life=life||5;e.slow=slow||0;e.missile=homing===2}
function tele(o,dur,fn){TE.push(Object.assign({t:dur,max:dur},o));later(dur,fn)}
function bossAttack(z,a){
 const dm=z.dmg,b=z.bdef,alive=()=>!z.dead&&G.state==='play';
 switch(a){
  case 'slam':{const x=P.x,y=P.y,r=110+Math.min(60,z.tier*8);tele({k:'c',x,y,r},.9,()=>{if(!alive())return;ring(x,y,10,r,b.c2,.45,8);burst(x,y,b.c2,24,260,.5,3,true);shake(.5);sfx('boom');decal(x,y,r*.5,'crater');
   if(Math.hypot(P.x-x,P.y-y)<r+P.r)hurt(dm*1.3);for(const q of [...WL,...TW,...MN])if(Math.hypot(q.x-x,q.y-y)<r+q.r)q.hp-=dm*2});break}
  case 'summon':{const n=3+Math.min(8,z.tier);for(let i=0;i<n;i++){const an=i/n*TAU,q=mkZombie(Math.random()<.6?'minion':pickType(),z.x+Math.cos(an)*(z.r+24),z.y+Math.sin(an)*(z.r+24));if(q.tid==='minion')q.col=b.c2;Z.push(q)}ring(z.x,z.y,z.r,z.r+90,b.c2,.5,5);break}
  case 'stomp':for(let i=0;i<3;i++)later(i*.45,()=>{if(!alive())return;HZ.push({k:'wave',x:z.x,y:z.y,r:z.r,spd:260,max:520,dmg:dm*.8,col:b.c2,hit:false});shake(.3);sfx('quake')});break;
  case 'rocks':for(let i=0;i<5;i++){const x=clamp(P.x+rnd(-140,140),30,W-30),y=clamp(P.y+rnd(-140,140),30,H-30);tele({k:'c',x,y,r:55},.8+i*.1,()=>{if(!alive())return;ring(x,y,6,55,'#a8865c',.3,5);burst(x,y,'#8a6a45',14,200,.5,4);if(Math.hypot(P.x-x,P.y-y)<55+P.r)hurt(dm);sfx('boom')})}break;
  case 'spit':{const an=Math.atan2(P.y-z.y,P.x-z.x);for(let k=-3;k<=3;k++)enemyShot(z.x,z.y,an+k*.16,300,dm*.55,b.c2,9);sfx('spit');break}
  case 'pool':for(let i=0;i<3;i++){const x=clamp(P.x+rnd(-110,110),40,W-40),y=clamp(P.y+rnd(-110,110),40,H-40);tele({k:'c',x,y,r:72},.7,()=>{if(!alive())return;ZO.push({k:'toxic',x,y,r:72,life:5,max:5,dps:dm*.6,tick:0,col:b.c2})})}break;
  case 'toxicrain':for(let i=0;i<9;i++){const x=rnd(50,W-50),y=rnd(50,H-50);tele({k:'c',x,y,r:62},.6+i*.12,()=>{if(!alive())return;ZO.push({k:'toxic',x,y,r:62,life:4,max:4,dps:dm*.5,tick:0,col:b.c2});burst(x,y,b.c2,10,120,.5,3,true)})}break;
  case 'dash':{const an=Math.atan2(P.y-z.y,P.x-z.x),len=Math.hypot(P.x-z.x,P.y-z.y)+220;tele({k:'l',x:z.x,y:z.y,x2:z.x+Math.cos(an)*len,y2:z.y+Math.sin(an)*len,w:z.r},.7,()=>{if(!alive())return;z.dash={vx:Math.cos(an)*950,vy:Math.sin(an)*950,t:len/950}});break}
  case 'orbs':{const n=4+Math.min(4,z.tier>>1);for(let i=0;i<n;i++)enemyShot(z.x,z.y,i/n*TAU,150,dm*.6,b.c2,11,1,6);break}
  case 'clone':for(let i=0;i<2;i++){const q=mkZombie('minion',z.x+rnd(-60,60),z.y+rnd(-60,60),3);q.col='#3b1c5c';q.shade=1;q.spd*=1.3;Z.push(q)}burst(z.x,z.y,'#2b1d47',30,200,.6,5);break;
  case 'darkness':G.dark=5;announce('DUISTERNIS','',b.c2);break;
  case 'ring':{const n=18+(z.phase*6);for(let i=0;i<n;i++)enemyShot(z.x,z.y,i/n*TAU,220,dm*.5,b.c2,8);if(z.phase>=1)later(.4,()=>{if(!alive())return;for(let i=0;i<n;i++)enemyShot(z.x,z.y,(i+.5)/n*TAU,220,dm*.5,b.c2,8)});sfx('boom');break}
  case 'laser':{const a0=Math.atan2(P.y-z.y,P.x-z.x)-.9;tele({k:'l',x:z.x,y:z.y,x2:z.x+Math.cos(a0)*1400,y2:z.y+Math.sin(a0)*1400,w:16},.8,()=>{if(!alive())return;HZ.push({k:'laser',z,ang:a0,spd:1.2*(Math.random()<.5?1:1)*1,t:1.6,w:18,dmg:dm*.35,tick:0,col:b.c2})});break}
  case 'missiles':for(let i=0;i<6;i++)later(i*.15,()=>{if(!alive())return;enemyShot(z.x,z.y,rnd(0,TAU),170,dm*.7,'#fb923c',8,2,6);sfx('rocket')});break;
  case 'spiral':{const base=rnd(0,TAU);for(let i=0;i<32;i++)later(i*.06,()=>{if(!alive())return;for(let k=0;k<3;k++)enemyShot(z.x,z.y,base+i*.33+k*TAU/3,230,dm*.42,b.c2,7)});break}
  case 'meteors':for(let i=0;i<6;i++){const x=clamp(P.x+rnd(-200,200),40,W-40),y=clamp(P.y+rnd(-200,200),40,H-40);tele({k:'c',x,y,r:80},1+i*.15,()=>{if(!alive())return;ring(x,y,6,80,'#ff8a3d',.4,6);burst(x,y,'#ffb347',20,260,.5,4,true);decal(x,y,50,'crater');if(Math.hypot(P.x-x,P.y-y)<80+P.r)hurt(dm*1.1);shake(.3);sfx('meteor')});FX.push({k:'fall',x,y,col:'#ff8a3d',t:1+i*.15,max:1+i*.15})}break;
  case 'shards':{const an=Math.atan2(P.y-z.y,P.x-z.x);for(let k=-4;k<=4;k++)enemyShot(z.x,z.y,an+k*.12,340,dm*.45,'#bfe9ff',7,0,4,1.5);sfx('ice');break}
  case 'freeze':for(let i=0;i<2;i++){const x=clamp(P.x+rnd(-80,80),40,W-40),y=clamp(P.y+rnd(-80,80),40,H-40);tele({k:'c',x,y,r:90},.7,()=>{if(!alive())return;ZO.push({k:'freeze',x,y,r:90,life:5,max:5,dps:dm*.15,tick:0,col:'#bfe9ff'})})}break;
  case 'blizzard':for(let i=0;i<40;i++)later(i*.05,()=>{if(!alive())return;enemyShot(rnd(0,W),-20,Math.PI/2+rnd(-.3,.3),260,dm*.4,'#e0f7ff',6,0,4,1.5)});break;
 }
}
function bossAI(z,dt){
 if(z.inv>0)z.inv-=dt;
 const thr=[.66,.33];
 if(z.phase<2&&z.hp<z.maxhp*thr[z.phase]){z.phase++;z.inv=1.2;z.spd*=1.18;z.atkCd=1.6;
  announce('FASE '+(z.phase+1),z.name+' wordt sterker!',z.bdef.c2);sfx('phase');shake(.6);ring(z.x,z.y,z.r,500,z.bdef.c2,.8,8);
  const a=Math.atan2(P.y-z.y,P.x-z.x);if(Math.hypot(P.x-z.x,P.y-z.y)<260){P.x=clamp(P.x+Math.cos(a)*120,20,W-20);P.y=clamp(P.y+Math.sin(a)*120,20,H-20)}
  for(const q of Z)if(q!==z&&!q.dead&&d2(q,z)<300*300){const aa=Math.atan2(q.y-z.y,q.x-z.x);q.x+=Math.cos(aa)*60;q.y+=Math.sin(aa)*60}}
 if(z.dash){z.dash.t-=dt;z.x=clamp(z.x+z.dash.vx*dt,-40,W+40);z.y=clamp(z.y+z.dash.vy*dt,-40,H+40);burst(z.x,z.y,z.bdef.c2,2,40,.4,4);if(z.dash.t<=0)z.dash=null;return true}
 if(z.y>0&&z.y<H&&z.x>0&&z.x<W){z.atkCd-=dt;if(z.atkCd<=0){z.atkCd=rnd(2.2,3.4)*(1-z.phase*.18);bossAttack(z,pick(z.bdef.atk[z.phase]))}}
 return false;
}

/* ================= UPDATE ================= */
function update(dt){
 if(G.slowmo>0){G.slowmo-=dt;dt*=.35}
 G.t+=dt;G.runTime+=dt/(+S.set.speed||1);
 if(G.intro){const it=G.intro;it.t-=dt;const z=it.z;z.y+=(H*.24-z.y)*Math.min(1,dt*2.2);z.face=Math.PI/2;if(it.t<=0){G.intro=null;bossIntroUI(null)}updateFx(dt);return}
 if(G.boss)G.bossT+=dt;
 for(let i=DL.length-1;i>=0;i--){const d=DL[i];d.t-=dt;if(d.t<=0){remove(DL,i);d.fn()}if(G.state!=='play')return}
 if(G.timeStop>0)G.timeStop-=dt;if(G.slowAll>0)G.slowAll-=dt;if(G.dark>0)G.dark-=dt;
 gridBuild(Z);
 updateWave(dt);updatePlayer(dt);if(G.state!=='play')return;
 classTick(dt);staffTick(dt);updateZombies(dt);if(G.state!=='play')return;
 updateProj(dt);updateEP(dt);updateAreas(dt);updateTowers(dt);updateMinions(dt);updatePickups(dt);updateHazards(dt);
 for(let i=TE.length-1;i>=0;i--){TE[i].t-=dt;if(TE[i].t<=0)remove(TE,i)}
 for(let i=DEC.length-1;i>=0;i--){DEC[i].t-=dt;if(DEC[i].t<=0)DEC.splice(i,1)}
 if(Z.some(z=>z.dead))Z=Z.filter(z=>!z.dead);
 for(let i=WL.length-1;i>=0;i--)if(WL[i].hp<=0){burst(WL[i].x,WL[i].y,'#8b8aa6',10,120,.4,3);remove(WL,i)}
 for(let i=TW.length-1;i>=0;i--)if(TW[i].hp<=0){burst(TW[i].x,TW[i].y,'#fb923c',14,140,.4,3);remove(TW,i)}
 for(let i=MN.length-1;i>=0;i--)if(MN[i].hp<=0||MN[i].life<=0){burst(MN[i].x,MN[i].y,MN[i].col,8,100,.4,2.5);remove(MN,i)}
 updateFx(dt);
}
function updatePlayer(dt){
 let mx=(KEYS.d||KEYS.arrowright?1:0)-(KEYS.a||KEYS.arrowleft?1:0),my=(KEYS.s||KEYS.arrowdown?1:0)-(KEYS.w||KEYS.arrowup?1:0);
 if(JOY.active){mx=JOY.dx;my=JOY.dy}
 const L=Math.hypot(mx,my);
 if(P.dashT>0){P.dashT-=dt;P.x+=P.dvx*dt;P.y+=P.dvy*dt;if(P.dvx||P.dvy)part(P.x,P.y,0,0,.3,K.cl.col,6,0,1)}
 else if(L>.05){const s=K.spd*Math.min(1,L)*(P.slowT>0?.55:1);P.x+=mx/Math.max(1,L)*s*dt;P.y+=my/Math.max(1,L)*s*dt;P.walk+=dt*10}
 P.x=clamp(P.x,P.r,W-P.r);P.y=clamp(P.y,P.r,H-P.r);
 P.hp=Math.min(P.maxhp,P.hp+P.maxhp*K.regen*dt);
 for(const k of ['hurtT','shieldT','rateT','rageT','bloodT','potT','jackT','unitT','ovT','droneOvT','beamOvT','goldT','slowT','spT','abT'])P[k]-=dt;
 P.lsAcc=Math.max(0,P.lsAcc-P.maxhp*.08*dt);
 P.histT-=dt;if(P.histT<=0){P.histT=.25;P.hist.push(P.hp);if(P.hist.length>16)P.hist.shift()}
 const bz=K.cl.id==='berserk';
 P.dm=(bz?1+Math.min(1.5,.03*G.cleared):1)*(P.bloodT>0?1.3:1)*(P.potT>0?1.5:1)*(P.jackT>0?2:1);
 P.rm=(P.rateT>0?2:1)*(P.rageT>0?1.6:1)*(P.potT>0?1.3:1)*(bz?1+(1-P.hp/P.maxhp)*.5:1);
 P.lsm=P.bloodT>0?4:1;
 const auto=S.set.autoAttack;let target=null,ang=null;
 if(auto){target=pickTarget();if(target)ang=Math.atan2(target.y-P.y,target.x-P.x)}
 else{ang=Math.atan2(M.y-P.y,M.x-P.x);P.ang=ang}
 if(ang!=null&&auto)P.ang+=angDiff(ang,P.ang)*Math.min(1,dt*18);
 const rng=TYPES[K.st.type].range?(K.st.range||TYPES[K.st.type].range)*K.m.range:0;
 if(rng&&auto&&target&&d2(target,P)>(rng+target.r+10)**2)target=null;
 P.atkT-=dt;
 const rate=K.rate*P.rm;
 if(P.atkT<=0&&((auto&&target)||(!auto&&M.down))){
  if(!auto&&(K.st.type==='lightning'||K.st.type==='beam')){const cx=Math.cos(ang),cy=Math.sin(ang);let best=null,bd=1e9;for(const z of Z){if(z.dead)continue;const dz=Math.hypot(z.x-P.x,z.y-P.y);const dot=((z.x-P.x)*cx+(z.y-P.y)*cy)/(dz||1);if(dot>.85&&dz<700&&dz<bd){bd=dz;best=z}}target=best}
  fire(auto?ang:P.ang,target);P.atkT+=1/rate;if(P.atkT<-.1)P.atkT=0;
 }
 if(P.atkT<-.2)P.atkT=0;
 if(P.beam){const b=P.beam;b.t-=dt;b.ang+=3.3*dt;b.tick-=dt;
  if(b.tick<=0){b.tick=.08;laserLine(P.x,P.y,b.ang,900,20,K.dmg*.9,{col:K.st.col});if(K.st.chain){const f=Z.find(z=>!z.dead&&segDist(z,P.x,P.y,Math.cos(b.ang),Math.sin(b.ang),900)<20+z.r);if(f)chain(f.x,f.y,f,3,K.dmg*.4,'#9fd0ff',{el:'shock'})}}
  beamFx(P.x,P.y,P.x+Math.cos(b.ang)*900,P.y+Math.sin(b.ang)*900,K.st.col,16,.05);
  if(b.t<=0)P.beam=null}
 if(P.flameRing>0){P.flameRing-=dt;const a=G.t*6;for(let k=0;k<3;k++){const aa=a+k*TAU/3;part(P.x+Math.cos(aa)*110,P.y+Math.sin(aa)*110,rnd(-30,30),rnd(-30,30),.5,pick(['#ffb347','#ff6a3d','#ffef9a']),rnd(8,12),0,1,.9)}
  P.flameTick=(P.flameTick||0)-dt;if(P.flameTick<=0){P.flameTick=.2;near(P.x,P.y,170,z=>{if(!z.dead&&d2(z,P)<150*150)hitZ(z,K.dmg*1.6,{burn:2,el:'fire'})})}}
 if(P.beamVis){P.beamVis.t-=dt;if(P.beamVis.t<=0)P.beamVis=null}
 if(S.set.autoAbility&&Z.length>0){if(P.spT<=0&&Z.some(z=>!z.dead&&visible(z)))staffSpecial();if(P.abT<=0&&autoAbilityOk())useAbility()}
}
function staffTick(dt){
 /* drones */
 const want=K.drones+(P.droneOvT>0?3:0);
 while(DR.length<want)DR.push({a:rnd(0,TAU),cd:rnd(0,.5),x:P.x,y:P.y});
 while(DR.length>want)DR.pop();
 DR.forEach((d,i)=>{const a=G.t*1.8+i/Math.max(1,DR.length)*TAU,tx=P.x+Math.cos(a)*52,ty=P.y+Math.sin(a)*52-10;d.x+=(tx-d.x)*Math.min(1,dt*8);d.y+=(ty-d.y)*Math.min(1,dt*8);d.cd-=dt;
  if(d.cd<=0){const t=nearestZ(d.x,d.y,420);if(t){d.cd=(P.droneOvT>0?.18:.55);d.a=Math.atan2(t.y-d.y,t.x-d.x);proj(d.x,d.y,d.a,{spd:720,dmg:K.dmg*.75,col:'#cbd5e1',r:3.5,kind:'bolt',o:{noCrit:false}});if(Math.random()<.4)sfx('drone')}else d.cd=.2}});
 /* planeten */
 const pw=K.planets;
 while(PL.length<pw)PL.push({a:0,R:0,tick:0,col:pick(['#818cf8','#f472b6','#facc15','#34d399','#60a5fa','#fb7185','#c4b5fd'])});
 while(PL.length>pw)PL.pop();
 PL.forEach((p,i)=>{p.a=G.t*1.7+i/pw*TAU;p.R=78+Math.sin(G.t*1.3+i)*12;p.tick-=dt;const x=P.x+Math.cos(p.a)*p.R,y=P.y+Math.sin(p.a)*p.R;p.x=x;p.y=y;
  if(p.tick<=0){p.tick=.25;near(x,y,40,z=>{if(!z.dead&&(z.x-x)**2+(z.y-y)**2<(z.r+13)**2)hitZ(z,K.dmg*.6,{el:'void',noCrit:true})})}});
}
function zSpeedMul(){return (G.timeStop>0?.5:1)*(G.slowAll>0?.4:1)*(K.cl.id==='keeper'?.8:1)}
function updateZombies(dt){
 const BL=WL.concat(TW);for(const m of MN)if(m.block)BL.push(m);
 const stop=G.timeStop>0,gm=zSpeedMul();
 for(const z of Z){
  if(z.dead)continue;z.flash-=dt;z.atkT-=dt;if(z.reveal>0)z.reveal-=dt;if(z.ampT>0)z.ampT-=dt;if(z.hack>0)z.hack-=dt;if(z.root>0)z.root-=dt;
  /* status-effecten (DoT) */
  if(z.burnT>0||z.poisonT>0||z.bleedT>0){z.burnT-=dt;z.poisonT-=dt;z.bleedT-=dt;z.dotT-=dt;
   if(z.dotT<=0){z.dotT=.5;
    if(z.burnT>0){hitZ(z,z.burnD,{dot:true,noCrit:true,el:'fire'});if(Q().pm>200)part(z.x+rnd(-z.r,z.r)*.5,z.y-z.r*.3,0,-50,.5,'#ff8a3d',4,0,1)}
    if(!z.dead&&z.poisonT>0)hitZ(z,z.poisonD,{dot:true,noCrit:true,el:'poison'});
    if(!z.dead&&z.bleedT>0)hitZ(z,z.bleedD,{dot:true,noCrit:true,el:'blood'})}
   if(z.dead)continue}
  if(z.t.regen&&!z.boss&&z.burnT<=0&&z.poisonT<=0&&z.hp<z.maxhp){z.hp=Math.min(z.maxhp,z.hp+z.maxhp*z.t.regen*dt)}
  if(z.boss&&!stop&&bossAI(z,dt))continue;
  if(z.frozen>0){z.frozen-=dt;continue}
  if(z.stun>0){z.stun-=dt;continue}
  if(stop&&!z.boss)continue;
  let sp=z.spd*(z.slowT>0?z.slowF:1)*gm;if(z.slowT>0)z.slowT-=dt;
  const dx=P.x-z.x,dy=P.y-z.y,dist=Math.hypot(dx,dy)||1;
  if(z.t.ranged&&!z.boss&&dist<290&&visible(z)){sp=0;z.cd-=dt;if(z.cd<=0){z.cd=2.2;enemyShot(z.x,z.y,Math.atan2(dy,dx),260,z.dmg,'#c8f03b',6);sfx('spit')}}
  if(z.t.heal&&!z.boss){z.cd-=dt;if(z.cd<=0){z.cd=2.5;near(z.x,z.y,140,o=>{if(o!==z&&!o.dead&&!o.boss&&d2(o,z)<130*130)o.hp=Math.min(o.maxhp,o.hp+o.maxhp*.15)});ring(z.x,z.y,6,130,'#ff8cc6',.5,3)}}
  if(z.t.toxic){z.trailT-=dt;if(z.trailT<=0){z.trailT=.7;if(ZO.length<40)ZO.push({k:'toxic',x:z.x,y:z.y,r:22,life:2.5,max:2.5,dps:z.dmg*.5,tick:0,col:'#84cc16',small:1})}}
  if(z.t.giant){z.stompT-=dt;if(z.stompT<=0&&dist<130){z.stompT=3;ring(z.x,z.y,z.r,110,'#a8865c',.4,6);shake(.2);if(dist<110+P.r)hurt(z.dmg*.6);for(const q of BL)if(Math.hypot(q.x-z.x,q.y-z.y)<110+q.r)q.hp-=z.dmg*2}}
  z.x+=dx/dist*sp*dt;z.y+=dy/dist*sp*dt;z.face=Math.atan2(dy,dx);z.ph+=dt*sp*.09;
  if(!(z.t.ghost||z.t.fly)||z.boss){for(const b of BL){if(b.hp<=0)continue;const bx=z.x-b.x,by=z.y-b.y,rr=z.r+b.r,q=bx*bx+by*by;if(q<rr*rr){const bd=Math.sqrt(q)||1;z.x=b.x+bx/bd*rr;z.y=b.y+by/bd*rr;
   if(z.atkT<=0){if(z.t.boom&&!z.boss){zExplode(z);break}b.hp-=z.dmg*(z.boss?2:z.t.giant?3:1);b.hit=.12;z.atkT=.9}}}}
  if(z.dead)continue;
  const rr=z.r+P.r;
  if(dist<rr){if(z.t.boom&&!z.boss){zExplode(z);continue}z.x=P.x-dx/dist*rr;z.y=P.y-dy/dist*rr;if(z.atkT<=0){hurt(z.dmg);z.atkT=.8;if(G.state!=='play')return}}
  for(const m of MN){if(m.block)continue;const r2=z.r+m.r;if(z.atkT<=0&&d2(z,m)<r2*r2){m.hp-=z.dmg;m.hit=.12;z.atkT=.9;break}}
 }
 /* separatie via grid */
 for(const a of Z){if(a.dead||a.boss)continue;near(a.x,a.y,a.r+30,b=>{if(b===a||b.dead)return;const dx=b.x-a.x,dy=b.y-a.y,rr=a.r+b.r,q=dx*dx+dy*dy;if(q<rr*rr&&q>.01){const d=Math.sqrt(q),o=(rr-d)/2,nx=dx/d,ny=dy/d;if(b.boss){a.x-=nx*o*2;a.y-=ny*o*2}else{a.x-=nx*o*.5;a.y-=ny*o*.5;b.x+=nx*o*.5;b.y+=ny*o*.5}}})}
}
function zExplode(z){
 ring(z.x,z.y,8,75,'#ff8a3d',.35,5);burst(z.x,z.y,'#ff8a3d',18,220,.45,3,true);light(z.x,z.y,160,'#ff8a3d',.3);sfx('boom');shake(.2);decal(z.x,z.y,30,'scorch');
 if(Math.hypot(P.x-z.x,P.y-z.y)<75+P.r)hurt(z.dmg);
 for(const q of [...WL,...TW,...MN])if(Math.hypot(q.x-z.x,q.y-z.y)<75+q.r)q.hp-=z.dmg*2;
 killZ(z);
}
function projHit(p,z){
 const o=p.o||NO;
 switch(p.kind){
  case 'exp':explode(p.x,p.y,p.aoe,p.dmg,p.col,o);if(p.burger)burst(p.x,p.y,'#5fd35f',6,120,.4,3);return true;
  case 'rocket':explode(p.x,p.y,p.aoe,p.dmg,p.col,o);return true;
  case 'void':makeHole(p.x,p.y,p.hole,p.dmg);return true;
  case 'poison':cloud(p.x,p.y,p.cloud,p.dmg*1.1*K.m.poison,3,p.col);if(z)hitZ(z,p.dmg*.5,o);return true;
  case 'time':FI.push({x:p.x,y:p.y,r:95*K.m.range,life:3,max:3,col:p.col});if(z)hitZ(z,p.dmg,o);return true;
  case 'nuke':nukeAt(p);return true;
  case 'crystal':hitZ(z,p.dmg,o);for(let i=0;i<p.frags;i++)proj(p.x,p.y,rnd(0,TAU),{spd:440,dmg:p.dmg*.45,col:p.col,r:3,kind:'frag',life:.35});burst(p.x,p.y,p.col,6,140,.3,2.5,true);sfx('crystal');return true;
  case 'plasma':if(z.plId===p.id&&G.t-z.plT<.15)return false;z.plId=p.id;z.plT=G.t;hitZ(z,p.dmg,o);return false;
  case 'shadow':hitZ(z,p.dmg,o);p.hitS.add(z);if(p.bounce>0){p.bounce--;const n=nearestZ(p.x,p.y,260,z);if(n&&!p.hitS.has(n)){p.tgt=n;return false}}return true;
  case 'tower':if(p.aoe){explode(p.x,p.y,p.aoe,p.dmg,p.col,{noCrit:true});return true}hitZ(z,p.dmg,Object.assign({noCrit:true},o));return true;
  default:hitZ(z,p.dmg,o.main?Object.assign({kb:Math.atan2(p.vy,p.vx)},o):(o===NO?{kb:Math.atan2(p.vy,p.vx),col:p.col}:o));return true;
 }
}
function nukeAt(p){TE.push({k:'c',x:p.x,y:p.y,r:p.aoe,t:.35,max:.35,ally:true});const x=p.x,y=p.y,a=p.aoe,d=p.dmg;later(.35,()=>{if(G.state!=='play')return;explode(x,y,a,d,'#bef264',{});G.flash=.35;G.flashCol='#eaffb0';shake(.7);sfx('nuke');cloud(x,y,a*.55,d*.12,4,'#bef264',true);decal(x,y,a*.5,'crater');if(K.m.freeze)near(x,y,a,z=>{if(!z.boss&&d2(z,{x,y})<a*a)z.frozen=1.5})})}
function updateProj(dt){
 for(let i=PR.n-1;i>=0;i--){const p=PR.a[i];
  if(p.homing||p.kind==='rocket'){let t=p.tgt;if(!t||t.dead||(p.kind==='shadow'&&p.hitS.has(t))){t=p.tgt=nearestZ(p.x,p.y,p.kind==='spirit'?500:400);if(t&&p.kind==='shadow'&&p.hitS.has(t))t=p.tgt=null}
   if(p.kind==='rocket'){p.spd=Math.min(720,p.spd+700*dt);if(Q().pm>200&&Math.random()<.7)part(p.x,p.y,rnd(-20,20),rnd(-20,20),.4,'#9ca3af',4,0,0,.9)}
   if(t){const a=Math.atan2(t.y-p.y,t.x-p.x),c=Math.atan2(p.vy,p.vx),turn=(p.kind==='rocket'?5:p.kind==='spirit'?4:7)*dt,n=c+clamp(angDiff(a,c),-turn,turn);p.vx=Math.cos(n)*p.spd;p.vy=Math.sin(n)*p.spd}
   else if(p.kind==='rocket'){const c=Math.atan2(p.vy,p.vx);p.vx=Math.cos(c)*p.spd;p.vy=Math.sin(c)*p.spd}}
  if(p.kind==='boomer'){p.spin+=dt*20;if(!p.ret){p.dist+=p.spd*dt;if(p.dist>=p.maxd){p.ret=true;p.hitS.clear()}}else{const a=Math.atan2(P.y-p.y,P.x-p.x);p.vx=Math.cos(a)*p.spd*1.15;p.vy=Math.sin(a)*p.spd*1.15;if(d2(p,P)<400){PR.kill(i);continue}}}
  p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
  if(p.kind==='void'||p.kind==='poison'||p.kind==='time'||p.kind==='nuke'){
   if((p.x-p.tx)**2+(p.y-p.ty)**2<196||p.life<=0){projHit(p,null);PR.kill(i);continue}
   if(p.kind==='nuke'){if(Q().pm>200)part(p.x,p.y,rnd(-30,30),rnd(-30,30),.5,'#bef264',4,0,1);continue}
   if(p.kind==='time'||p.kind==='poison'){let hit=null;near(p.x,p.y,p.r+30,z=>{if(!z.dead&&d2(p,z)<(z.r+p.r)**2){hit=z;return false}});if(hit){projHit(p,hit);PR.kill(i)}continue}
   let hitAny=false;near(p.x,p.y,p.r+30,z=>{if(!z.dead&&d2(p,z)<(z.r+p.r)**2){hitAny=true;return false}});if(hitAny){projHit(p,null);PR.kill(i)}continue}
  let dead=p.life<=0||p.x<-80||p.x>W+80||p.y<-80||p.y>H+80;
  if(dead&&p.kind==='plasma'&&p.life<=0)explode(p.x,p.y,70,p.dmg*1.5,p.col,{});
  if(!dead){near(p.x,p.y,p.r+30,z=>{if(z.dead)return;const rr=z.r+p.r;if(d2(p,z)<rr*rr){if(p.hitS.has(z)&&p.kind!=='plasma')return;
    const consumed=projHit(p,z);if(p.kind==='plasma'||(p.kind==='shadow'&&!consumed))return;
    if(p.pierce>0){p.pierce--;p.hitS.add(z)}else{dead=true;return false}}})}
  if(dead)PR.kill(i);
 }
}
function updateEP(dt){
 const BL=WL.concat(TW);
 for(let i=EP.n-1;i>=0;i--){const e=EP.a[i];
  if(e.homing){const a=Math.atan2(P.y-e.y,P.x-e.x),c=Math.atan2(e.vy,e.vx),n=c+clamp(angDiff(a,c),-(e.missile?2.4:1.6)*dt,(e.missile?2.4:1.6)*dt);if(e.missile)e.spd=Math.min(360,e.spd+60*dt);e.vx=Math.cos(n)*e.spd;e.vy=Math.sin(n)*e.spd;if(e.missile&&Q().pm>200&&Math.random()<.5)part(e.x,e.y,0,0,.35,'#6b7280',4,0,0)}
  e.x+=e.vx*dt;e.y+=e.vy*dt;e.life-=dt;let dead=e.life<=0||e.x<-80||e.x>W+80||e.y<-80||e.y>H+80;
  if(!dead)for(const b of BL){if(d2(e,b)<(e.r+b.r)**2){b.hp-=e.dmg;b.hit=.12;dead=true;burst(e.x,e.y,e.col,5,80,.3,2);break}}
  if(!dead&&d2(e,P)<(e.r+P.r-3)**2){hurt(e.dmg);if(e.slow)P.slowT=e.slow;dead=true;burst(e.x,e.y,e.col,6,90,.3,2.5,true);if(e.missile){ring(e.x,e.y,5,50,'#fb923c',.3,4);sfx('boom')}}
  if(dead)EP.kill(i);
 }
}
function updateAreas(dt){
 /* zwarte gaten */
 for(let i=HO.length-1;i>=0;i--){const h=HO[i];h.life-=dt;h.tick-=dt;const tk=h.tick<=0;if(tk)h.tick=.2;
  near(h.x,h.y,h.r+30,z=>{if(z.dead)return;const dx=h.x-z.x,dy=h.y-z.y,d=Math.hypot(dx,dy);if(d<h.r+z.r){if(d>4){const pull=(z.boss?18:150)*(1-d/(h.r+z.r))+(z.boss?0:40);z.x+=dx/d*pull*dt;z.y+=dy/d*pull*dt}if(tk)hitZ(z,h.dmg*.35,{noCrit:true,el:'void'})}});
  if(Math.random()<(Q().glow?.9:.4)){const a=rnd(0,TAU);part(h.x+Math.cos(a)*h.r,h.y+Math.sin(a)*h.r,-Math.cos(a)*h.r*1.6,-Math.sin(a)*h.r*1.6,.5,'#c6a3ff',2,0,1,1)}
  if(h.life<=0)remove(HO,i)}
 /* gifwolken en straling (speler) */
 for(let i=CL.length-1;i>=0;i--){const c=CL[i];c.life-=dt;c.tick-=dt;if(c.tick<=0){c.tick=.5;near(c.x,c.y,c.r+30,z=>{if(!z.dead&&d2(z,c)<(c.r+z.r)**2){z.poisonT=2.5;z.poisonD=Math.max(z.poisonD,c.dps*.5)}})}
  if(Math.random()<.4)part(c.x+rnd(-c.r,c.r)*.7,c.y+rnd(-c.r,c.r)*.7,rnd(-10,10),-20,1,c.col,rnd(8,14),0,1,.98);if(c.life<=0)remove(CL,i)}
 /* tijdvelden */
 for(let i=FI.length-1;i>=0;i--){const f=FI[i];f.life-=dt;near(f.x,f.y,f.r+30,z=>{if(!z.dead&&d2(z,f)<(f.r+z.r)**2){z.slowT=Math.max(z.slowT,.3);z.slowF=Math.min(z.slowF,z.boss?.7:.45);z.ampT=Math.max(z.ampT,.3);z.amp=Math.max(z.amp,1.25)}});if(f.life<=0)remove(FI,i)}
 /* tornado's */
 for(let i=TN.length-1;i>=0;i--){const t=TN[i];t.life-=dt;t.tick-=dt;t.rot+=dt*10;t.x+=t.vx*dt;t.y+=t.vy*dt;if(t.x<30||t.x>W-30)t.vx*=-1;if(t.y<30||t.y>H-30)t.vy*=-1;const tk=t.tick<=0;if(tk)t.tick=.2;
  near(t.x,t.y,t.r*1.6,z=>{if(z.dead)return;const dx=t.x-z.x,dy=t.y-z.y,d=Math.hypot(dx,dy);if(d<t.r*1.6&&!z.boss&&!z.t.giant){if(d<t.r){z.x+=t.vx*dt*.9;z.y+=t.vy*dt*.9}if(d>3){z.x+=dx/d*120*dt;z.y+=dy/d*120*dt}}if(tk&&d<t.r+z.r)hitZ(z,t.dmg,{noCrit:true,col:t.col})});
  if(Math.random()<.8)part(t.x+rnd(-t.r,t.r)*.5,t.y+rnd(-t.r,t.r)*.3,rnd(-60,60),-rnd(40,120),.5,'#d1d5db',rnd(3,6),0,0);if(Math.random()<.1)sfx('tornado');if(t.life<=0)remove(TN,i)}
 /* portalen */
 for(let i=PO.length-1;i>=0;i--){const p=PO[i];p.life-=dt;p.cd-=dt;p.ang+=dt*4;if(p.cd<=0&&p.shots>0){const t=nearestZ(p.x,p.y,600);if(t){p.cd=.16;p.shots--;const a=Math.atan2(t.y-p.y,t.x-p.x);proj(p.x,p.y,a,{spd:700,dmg:p.dmg,col:p.col,r:5,kind:'bolt',o:{col:p.col,stun:K.m.stun}});if(Math.random()<.5)sfx('bolt',1.4)}}if(p.life<=0)remove(PO,i)}
 /* vijandelijke zones (gif, ijs) */
 for(let i=ZO.length-1;i>=0;i--){const z=ZO[i];z.life-=dt;z.tick-=dt;const inside=Math.hypot(P.x-z.x,P.y-z.y)<z.r+P.r*.5;if(inside&&z.k==='freeze')P.slowT=Math.max(P.slowT,.3);if(z.tick<=0){z.tick=.25;if(inside)hurt(z.dps*.25)}if(z.life<=0)remove(ZO,i)}
 if(G.state!=='play')return;
 /* lichteffecten */
 for(let i=LI.n-1;i>=0;i--){const l=LI.a[i];l.t-=dt;if(l.t<=0)LI.kill(i)}
}
function updateHazards(dt){
 for(let i=HZ.length-1;i>=0;i--){const h=HZ[i];let done=false;
  if(h.k==='wave'){h.r+=h.spd*dt;const d=Math.hypot(P.x-h.x,P.y-h.y);if(!h.hit&&Math.abs(d-h.r)<16+P.r*.5){h.hit=true;hurt(h.dmg)}if(h.r>h.max)done=true}
  else if(h.k==='laser'){h.t-=dt;if(h.z.dead){done=true}else{h.ang+=h.spd*dt;h.tick-=dt;const cx=Math.cos(h.ang),cy=Math.sin(h.ang);if(h.tick<=0&&segDist(P,h.z.x,h.z.y,cx,cy,1400)<h.w+P.r*.5){h.tick=.2;hurt(h.dmg)}if(h.t<=0)done=true}}
  if(done)remove(HZ,i)}
}
function updateTowers(dt){
 const um=unitMul();
 for(const t of TW){t.cd-=dt;t.hit-=dt;const kd=TK[t.kind];let best=null,bd=(kd.range+t.lvl*20)**2;for(const z of Z){if(z.dead||!visible(z))continue;const d=d2(z,t);if(d<bd){bd=d;best=z}}
  if(!best)continue;t.ang=Math.atan2(best.y-t.y,best.x-t.x);if(t.cd>0)continue;
  t.cd=1/(kd.rate*(1+.12*(t.lvl-1))*(P.ovT>0?2:1)*(P.unitT>0?1.5:1));
  const dm=K.power*kd.f*(1+.5*(t.lvl-1))*um,tx=t.x+Math.cos(t.ang)*16,ty=t.y+Math.sin(t.ang)*16;
  switch(t.kind){
   case 'laser':laserLine(tx,ty,t.ang,kd.range+60,4,dm,{noCrit:true,col:kd.col});beamFx(tx,ty,tx+Math.cos(t.ang)*(kd.range+60),ty+Math.sin(t.ang)*(kd.range+60),kd.col,3,.1);break;
   case 'rocket':proj(tx,ty,t.ang,{spd:240,dmg:dm,col:kd.col,r:5,kind:'rocket',tgt:best,aoe:50,life:3,o:{noCrit:true}});break;
   case 'cannon':proj(tx,ty,t.ang,{spd:520,dmg:dm,col:'#e7e5e4',r:7,kind:'tower',aoe:60});break;
   case 'frost':proj(tx,ty,t.ang,{spd:560,dmg:dm,col:kd.col,r:5,kind:'ice',o:{noCrit:true,slow:true,freeze:.1,el:'ice'}});break;
   case 'tesla':chain(tx,ty,best,3,dm,kd.col,{noCrit:true,el:'shock'});break;
   case 'burger':proj(tx,ty,t.ang,{spd:520,dmg:dm,col:'#ffc83d',r:6,kind:'tower',aoe:40,burger:true});break;
   case 'mega':proj(tx,ty,t.ang+rnd(-.08,.08),{spd:720,dmg:dm,col:kd.col,r:6,kind:'tower',aoe:30});break;
   default:proj(tx,ty,t.ang,{spd:720,dmg:dm,col:kd.col,r:4,kind:'tower'});
  }
  light(tx,ty,50,kd.col,.08);
 }
}
function updateMinions(dt){
 const um=unitMul();
 for(const m of MN){m.life-=dt;m.cd-=dt;m.hit-=dt;m.ph+=dt*8;const best=nearestZ(m.x,m.y);
  if(!best){const dx=P.x-m.x,dy=P.y-m.y,d=Math.hypot(dx,dy);if(d>60){m.x+=dx/d*m.spd*.6*dt;m.y+=dy/d*m.spd*.6*dt;m.face=Math.atan2(dy,dx)}continue}
  const dx=best.x-m.x,dy=best.y-m.y,d=Math.hypot(dx,dy)||1,reach=m.ranged||m.r+best.r+4;m.face=Math.atan2(dy,dx);
  if(d>reach)m.x+=dx/d*m.spd*(P.unitT>0?1.4:1)*dt,m.y+=dy/d*m.spd*(P.unitT>0?1.4:1)*dt;
  else if(m.cd<=0){m.cd=m.cdM/(P.unitT>0?1.6:1);const dm=K.power*m.dmgF*um;
   if(m.ranged)proj(m.x,m.y,m.face,{spd:640,dmg:dm,col:m.col,r:4,kind:'bolt',o:{noCrit:true,col:m.col}});
   else{hitZ(best,dm,{noCrit:true,col:m.col});burst(best.x,best.y,m.col,4,60,.25,2)}}}
}
function updatePickups(dt){
 for(let i=PK.length-1;i>=0;i--){const k=PK[i];k.t+=dt;k.vx*=.9;k.vy*=.9;k.x+=k.vx*dt;k.y+=k.vy*dt;
  const dx=P.x-k.x,dy=P.y-k.y,d=Math.hypot(dx,dy)||1;
  if(k.t>.5&&(d<K.magnet||k.t>5)){const s=Math.min(900,260+k.t*160);k.x+=dx/d*s*dt;k.y+=dy/d*s*dt}
  if(d<P.r+12){if(k.k==='burger'){addBurgers(50);txt(P.x,P.y-34,'+50 burgers','#ffc83d',18,true);sfx('coin');burst(k.x,k.y,'#ffc83d',12,140,.5,3,true);saveSoon()}else potion(k.pot);remove(PK,i)}}
}
function updateFx(dt){
 for(let i=PT.n-1;i>=0;i--){const p=PT.a[i];p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=p.drag;p.vy=p.vy*p.drag+p.g*dt;if(p.t<=0)PT.kill(i)}
 for(let i=FX.length-1;i>=0;i--){FX[i].t-=dt;if(FX[i].t<=0)remove(FX,i)}
 for(let i=TX.n-1;i>=0;i--){const t=TX.a[i];t.t-=dt;t.x+=t.vx*dt;t.y+=t.vy*dt;t.vy*=.93;t.vx*=.93;if(t.t<=0)TX.kill(i)}
 G.shake=Math.max(0,G.shake-dt*2);if(G.flash>0)G.flash-=dt;
}
