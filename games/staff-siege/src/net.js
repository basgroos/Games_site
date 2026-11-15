/* =====================================================================
   CO-OP MULTIPLAYER — host-authoritative via Supabase Realtime
   * Eén speler maakt een kamer (code van 4 letters), vrienden doen mee met
     die code. Maximaal 4 spelers. Kanaal: bg-room-ss-<env>-<CODE>.
   * Iedereen kiest in zijn eigen lobby een staff en class; die loadout
     (met eigen levels, mastery en upgrades) ligt vast zodra het potje start.
   * De host simuleert de hele wereld (zombies, alle helden, schade) en stuurt
     ~10x per seconde een snapshot met effecten. Gasten sturen hun positie en
     invoer (richting, auto attack, special, ability, bouwen).
   * Beloningen gelden voor iedereen: 20 burgers per wave, gedeelde burger-
     drops, boss-beloningen en XP/mastery voor je eigen loadout.
   * Wie neergaat staat na de wave weer op met 50% HP. Iedereen neer = game over.
   * Berichten: hello, roster, start, snap, in, end, bye, reply.
     Alles wordt periodiek opnieuw gestuurd, dus een gemist bericht herstelt vanzelf.
   ===================================================================== */
const PROTO=1,MAXP=4,SNAP_EVERY=.1,IN_EVERY=.066,HELLO_EVERY=1.5;
const ZK=Object.keys(ZT),PKK=['bolt','spam','ice','exp','void','boomer','crystal','frag','rocket','plasma','spirit','nuke','star','poison','time','blood','shadow','tower'],TKK=Object.keys(TK),MNK=['imp','skel','golem','wolf','bear','soldier','elite'],POT=['heal','rage','speed'];
const r1=v=>Math.round(v*10)/10,ri=v=>Math.round(v);
function profileGet(){let p={};try{p=JSON.parse(localStorage.getItem('basgames-player')||'{}')||{}}catch(e){p={}}if(!p.id){p.id='ss-'+Math.random().toString(36).slice(2,10)+Date.now().toString(36);try{localStorage.setItem('basgames-player',JSON.stringify(p))}catch(e){}}return p}
function profileSetName(n){const p=profileGet();p.name=String(n||'').trim().slice(0,16);try{localStorage.setItem('basgames-player',JSON.stringify(p))}catch(e){}}
/* id per tabblad: zo kun je ook met twee tabbladen op één computer samen spelen */
const NET={status:'idle',role:null,code:null,ch:null,client:null,me:'ss-'+Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4),roster:[],msg:'',mid:null,start:null,
 t:{snap:0,in:0,hello:0,start:0},lastSnap:0,lastHost:0,rel:[],relSeq:0,relGot:0,sp:0,ab:0,bq:[],bid:0,kills0:0,hostSpeed:1,hostSkip:1,maxBytes:0};
NET.name=()=>(profileGet().name||'').trim()||'Speler';
NET.available=()=>!!(BUILD.online&&BUILD.online.url&&BUILD.online.key);
NET.inRoom=()=>NET.status!=='idle'&&!!NET.code;
NET.ensure=function(){
 if(NET.client)return Promise.resolve(NET.client);
 if(!NET.available())return Promise.reject(new Error('Multiplayer werkt alleen op de Bas Games-site'));
 const ld=window.supabase?Promise.resolve():new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';s.onload=res;s.onerror=()=>rej(new Error('Kon de online-bibliotheek niet laden'));document.head.appendChild(s)});
 return ld.then(()=>{NET.client=window.supabase.createClient(BUILD.online.url,BUILD.online.key,{auth:{persistSession:false,autoRefreshToken:false},realtime:{params:{eventsPerSecond:40},worker:true}});return NET.client});
};
function code4(){const L='ABCDEFGHJKLMNPQRSTUVWXYZ';let c='';for(let i=0;i<4;i++)c+=L[Math.random()*L.length|0];return c}
function meEntry(host){return{cid:NET.me,name:NET.name(),staff:S.eqStaff,cls:S.eqClass,pr:myProfile(S.eqStaff,S.eqClass),host:!!host,seen:Date.now()}}
function netChanged(){if(typeof renderMP==='function')renderMP()}

/* ---------- verbinding ---------- */
NET.open=async function(code,role){
 await NET.leave(true);
 NET.code=code;NET.role=role;NET.status='connecting';NET.msg='';NET.roster=role==='host'?[meEntry(true)]:[];NET.lastHost=Date.now();netChanged();
 try{
  const rt=await NET.ensure();
  if(NET.code!==code)return;
  const ch=rt.channel('bg-room-ss-'+BUILD.env+'-'+code,{config:{presence:{key:NET.me},broadcast:{self:false,ack:false}}});
  for(const ev of ['hello','roster','start','snap','in','end','bye','reply'])ch.on('broadcast',{event:ev},m=>{const p=m&&m.payload;if(p)try{onNet(ev,p)}catch(e){console.error(e)}});
  ch.subscribe(st=>{
   if(st==='SUBSCRIBED'){NET.status='connected';try{const r=ch.track({name:NET.name(),role});if(r&&r.catch)r.catch(()=>{})}catch(e){}if(role==='host')sendRoster();else sendHello();netChanged()}
   else if((st==='CHANNEL_ERROR'||st==='TIMED_OUT')&&NET.status!=='connected'){NET.status='error';NET.msg='Verbinden mislukt. Probeer het opnieuw.';netChanged()}
  });
  NET.ch=ch;
 }catch(e){NET.status='error';NET.msg=e.message||'Verbinden mislukt';netChanged()}
};
NET.send=function(ev,p){if(!NET.ch||NET.status!=='connected')return;const b=ev==='snap'?JSON.stringify(p).length:0;if(b>NET.maxBytes)NET.maxBytes=b;try{const r=NET.ch.send({type:'broadcast',event:ev,payload:p});if(r&&r.catch)r.catch(()=>{})}catch(e){}};
NET.leave=async function(silent){
 if(NET.ch){NET.send('bye',{cid:NET.me});const ch=NET.ch;NET.ch=null;try{if(ch.untrack)ch.untrack();ch.unsubscribe();if(NET.client)NET.client.removeChannel(ch)}catch(e){}}
 NET.status='idle';NET.role=null;NET.code=null;NET.roster=[];if(!silent)netChanged();
};
NET.host=function(){const c=code4();NET.open(c,'host');return c};
NET.join=function(c){c=String(c||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,4);if(c.length!==4){NET.msg='Vul een code van 4 letters in';netChanged();return false}NET.open(c,'guest');return true};
function sendHello(){NET.send('hello',{v:PROTO,cid:NET.me,name:NET.name(),staff:S.eqStaff,cls:S.eqClass,pr:myProfile(S.eqStaff,S.eqClass)})}
function sendRoster(){const me=meEntry(true),r=NET.roster.find(x=>x.host);if(r)Object.assign(r,me);else NET.roster.unshift(me);
 NET.send('roster',{v:PROTO,code:NET.code,live:G.net==='host'&&G.state==='play'?1:0,players:NET.roster.map(x=>({cid:x.cid,name:x.name,staff:x.staff,cls:x.cls,host:!!x.host}))})}

/* ---------- berichten ---------- */
function onNet(ev,p){
 if(NET.role==='host'){
  if(ev==='hello'){
   if(p.v!==PROTO){NET.send('reply',{cid:p.cid,msg:'Jullie hebben een andere versie van het spel. Ververs allebei de pagina.',kick:1});return}
   let r=NET.roster.find(x=>x.cid===p.cid);
   if(!r){if(NET.roster.length>=MAXP){NET.send('reply',{cid:p.cid,msg:'Deze kamer is vol ('+MAXP+' spelers).',kick:1});return}
    r={cid:p.cid};NET.roster.push(r);toast((p.name||'Speler')+' zit in de kamer')}
   Object.assign(r,{name:String(p.name||'Speler').slice(0,16),staff:STAFF[p.staff]?p.staff:'oak',cls:CLS[p.cls]?p.cls:'recruit',pr:p.pr||{},seen:Date.now()});
   sendRoster();netChanged();
   if(G.net==='host'&&G.state==='play'&&NET.start&&NET.start.players.some(x=>x.cid===p.cid))NET.send('start',NET.start);
  }else if(ev==='in'){if(G.net!=='host'||G.state!=='play'||p.mid!==NET.mid)return;const pl=PLAYERS.find(x=>x.id===p.cid);if(pl)applyInput(pl,p)}
  else if(ev==='bye'){const pl=PLAYERS.find(x=>x.id===p.cid);if(pl&&G.net==='host'&&G.state==='play')removePlayer(pl,'heeft het potje verlaten');
   if(!p.match){NET.roster=NET.roster.filter(x=>x.cid!==p.cid||x.host);sendRoster();netChanged()}}
  return;
 }
 /* gast */
 if(ev==='roster'){NET.lastHost=Date.now();NET.roster=p.players||[];NET.live=!!p.live;netChanged()}
 else if(ev==='reply'){if(p.cid!==NET.me)return;NET.msg=p.msg||'';toast(NET.msg);if(p.kick)NET.leave()}
 else if(ev==='start'){NET.lastHost=Date.now();if(p.v!==PROTO)return;if(p.mid!==NET.mid&&p.players.some(x=>x.cid===NET.me)&&(G.state==='lobby'||G.state==='res'))guestBegin(p)}
 else if(ev==='snap'){NET.lastHost=Date.now();if(G.net==='guest'&&G.state==='play'&&p.mid===NET.mid)applySnap(p)}
 else if(ev==='end'){if(G.net==='guest'&&G.state==='play'&&p.mid===NET.mid)guestEnd(p)}
 else if(ev==='bye'){const h=NET.roster.find(x=>x.host);if(h&&h.cid===p.cid){if(G.net==='guest'&&G.state==='play')guestEnd({dead:0,msg:'De host heeft het potje verlaten'});toast('De host heeft de kamer gesloten');NET.leave()}}
}
NET.tick=function(dt){
 if(!NET.ch)return;const t=NET.t;t.hello+=dt;
 if(NET.role==='host'){
  if(t.hello>=HELLO_EVERY){t.hello=0;const now=Date.now(),n=NET.roster.length;NET.roster=NET.roster.filter(r=>r.host||now-r.seen<7000);if(NET.roster.length!==n)netChanged();sendRoster()}
  if(G.net==='host'&&G.state==='play')hostTick(dt);
 }else{
  if(t.hello>=HELLO_EVERY){t.hello=0;sendHello();if(Date.now()-NET.lastHost>9000&&NET.status==='connected'){NET.msg='De host reageert niet meer';netChanged()}}
  if(G.net==='guest'&&G.state==='play')guestTick(dt);
 }
};

/* ---------- host ---------- */
NET.startMatch=function(){
 if(NET.role!=='host'||!inLobby())return false;
 const guests=NET.roster.filter(r=>!r.host);
 if(!guests.length){NET.msg='Wacht tot er minstens één vriend in de kamer zit';netChanged();return false}
 const me=meEntry(true);
 const players=[{id:NET.me,name:me.name,staff:me.staff,cls:me.cls,local:true}].concat(guests.slice(0,MAXP-1).map(r=>({id:r.cid,name:r.name,staff:r.staff,cls:r.cls,pr:r.pr})));
 NET.mid=Math.random().toString(36).slice(2,9);NET.rel=[];NET.relSeq=0;
 NET.start={v:PROTO,mid:NET.mid,players:players.map(p=>({cid:p.id,name:p.name,staff:p.staff,cls:p.cls}))};
 auInit();closeAll();RES0={lvl:S.lvl};
 transition(()=>{beginRun(1,me.staff,me.cls,{players});for(const pl of PLAYERS)pl.lastInR=Date.now();NET.send('start',NET.start);NET.t.start=0;NET.t.snap=0});
 return true;
};
function applyInput(pl,p){
 pl.lastInR=Date.now();const q=pl.P,I=q.in;
 I.mx=clamp((p.mx||0)/100,-1,1);I.my=clamp((p.my||0)/100,-1,1);I.auto=!!p.au;I.autoAb=!!p.aa;I.fire=!!p.f;I.aim=(p.a||0)/100;
 if((p.fm|0)>=q.fm&&q.dashT<=0&&!q.dead){I.x=clamp(+p.x||0,q.r,W-q.r);I.y=clamp(+p.y||0,q.r,H-q.r)}else I.x=I.y=null;
 if(p.sp>pl.sp){pl.sp=p.sp;if(!q.dead){act(pl);staffSpecial();act(LOCAL)}}
 if(p.ab>pl.ab){pl.ab=p.ab;if(!q.dead){act(pl);useAbility();act(LOCAL)}}
 if(Array.isArray(p.b))for(const c of p.b){if(c[0]>pl.bLast){pl.bLast=c[0];if(!q.dead){act(pl);build(c[1]);act(LOCAL)}}}
}
function removePlayer(pl,why){
 const i=PLAYERS.indexOf(pl);if(i<0||pl.local)return;PLAYERS.splice(i,1);toast(pl.name+' '+why);
 if(G.state==='play'&&!alivePl().length)gameOver();
}
NET.hostEnd=function(dead){NET.send('end',{mid:NET.mid,dead:dead?1:0,w:G.wave});NET.send('end',{mid:NET.mid,dead:dead?1:0,w:G.wave})};
function hostTick(dt){
 const t=NET.t;t.snap+=dt;t.start+=dt;
 if(t.start>2&&G.runTime<30){t.start=0;NET.send('start',NET.start)}
 if(t.snap>=SNAP_EVERY){t.snap=0;NET.send('snap',encodeSnap())}
 const now=Date.now();for(const pl of [...PLAYERS])if(!pl.local&&now-(pl.lastInR||now)>10000)removePlayer(pl,'heeft de verbinding verloren');
}
function encodeSnap(){
 const s={v:PROTO,mid:NET.mid,t:r1(G.t),w:G.wave,ph:G.phase==='clear'?1:0,rem:remaining(),tot:G.total,cl:r1(G.clearT),W:ri(W),H:ri(H),ar:G.arena,k:G.kills,dm:ri(G.dmg),
  ts:G.timeStop>0?1:0,dk:G.dark>0?1:0,sh:r1(G.shake),fl:G.flash>0?[r1(G.flash),G.flashCol]:0,sk:S.set.autoSkip?1:0,spd:+S.set.speed||1};
 if(G.intro)s.in=[r1(G.intro.t),r1(G.intro.max),G.intro.z.id];
 s.pl=PLAYERS.map(pl=>{const q=pl.P,k=pl.K;let f=0;if(q.dead)f|=1;if(q.shieldT>0)f|=2;if(q.rateT>0||q.rageT>0||q.potT>0)f|=4;if(q.hurtT>0)f|=8;if(q.dashT>0)f|=16;if(q.slowT>0)f|=32;if(q.droneOvT>0)f|=64;
  return [pl.id,ri(q.x),ri(q.y),Math.round(q.ang*100),ri(q.hp),q.maxhp,f,Math.round(Math.max(0,q.spT)/(k.sp.cd*k.cdMul)*100),Math.round(Math.max(0,q.abT)/(k.cl.ab.cd*k.cdMul)*100),ri(q.scrap),pl.kills,q.DR.length,q.PL.length,q.beamVis?[ri(q.beamVis.x2),ri(q.beamVis.y2),r1(q.beamVis.w)]:0,q.fm]});
 s.z=[];for(const z of Z){if(z.dead)continue;if(s.z.length>=130&&!z.boss)continue;let b=0;
  if(z.frozen>0)b|=1;if(z.stun>0)b|=2;if(z.root>0)b|=4;if(z.hack>0)b|=8;if(z.slowT>0&&z.slowF<1)b|=16;if(z.poisonT>0)b|=32;if(z.ampT>0&&z.amp>1)b|=64;if(z.burnT>0)b|=128;if(z.elite)b|=256;if(z.reveal>0)b|=512;if(z.flash>0)b|=1024;
  s.z.push([z.id,z.boss?-1:ZK.indexOf(z.tid),ri(z.x),ri(z.y),r1(z.r),Math.round(Math.max(0,z.hp)/z.maxhp*1000),Math.round(z.face*100),b,z.col&&z.col!==z.t.col?z.col:0,z.shieldMax?Math.round(z.shield/z.shieldMax*100):0])}
 if(G.boss&&!G.boss.dead){const b=G.boss;s.b=[b.id,b.idx,ri(b.hp),ri(b.maxhp),b.phase,b.inv>0?1:0,b.name,b.tier]}
 s.p=[];for(let i=0;i<PR.n&&s.p.length<110;i++){const p=PR.a[i];s.p.push([PKK.indexOf(p.kind),ri(p.x),ri(p.y),ri(p.vx),ri(p.vy),r1(p.r),p.col,p.burger?1:0])}
 s.e=[];for(let i=0;i<EP.n&&s.e.length<110;i++){const e=EP.a[i];s.e.push([ri(e.x),ri(e.y),ri(e.vx),ri(e.vy),e.r,e.col,e.missile?1:0])}
 s.tw=TW.map(t=>[ri(t.x),ri(t.y),TKK.indexOf(t.kind),t.lvl,Math.round(t.hp/t.maxhp*100),Math.round(t.ang*100),t.r]);
 s.wl=WL.map(w=>[ri(w.x),ri(w.y),Math.round(w.hp/w.maxhp*100),w.col]);
 s.mn=MN.map(m=>[MNK.indexOf(m.kind),ri(m.x),ri(m.y),Math.round((m.face||0)*100),Math.round(m.hp/m.maxhp*100),m.r,m.col]);
 s.pk=PK.map(k=>[k.k==='burger'?0:1,ri(k.x),ri(k.y),POT.indexOf(k.pot)]);
 s.ho=HO.map(h=>[ri(h.x),ri(h.y),ri(h.r),r1(h.life),r1(h.max)]);
 s.cz=CL.map(c=>[ri(c.x),ri(c.y),ri(c.r),c.col,c.rad?1:0,r1(c.life),r1(c.max)]);
 s.fi=FI.map(f=>[ri(f.x),ri(f.y),ri(f.r),f.col,r1(f.life),r1(f.max)]);
 s.tn=TN.map(t=>[ri(t.x),ri(t.y),ri(t.r),r1(t.life),r1(t.max),t.col]);
 s.po=PO.map(p=>[ri(p.x),ri(p.y),p.col,r1(p.life),r1(p.max)]);
 s.zo=ZO.map(z=>[z.k==='freeze'?1:0,ri(z.x),ri(z.y),ri(z.r),r1(z.life),r1(z.max),z.small?1:0]);
 s.te=TE.map(t=>[t.k,ri(t.x),ri(t.y),ri(t.r||0),ri(t.x2||0),ri(t.y2||0),ri(t.w||0),r1(t.t),r1(t.max),t.ally?1:0]);
 s.hz=HZ.map(h=>h.k==='wave'?['w',ri(h.x),ri(h.y),ri(h.r),h.max,h.col]:['l',h.z.id,Math.round(h.ang*100),h.w,h.col]);
 const ev=NETEV.splice(0,NETEV.length);
 for(const f of FX){if(f.sent||ev.length>150)continue;f.sent=1;
  if(f.k==='ring')ev.push(['r',ri(f.x),ri(f.y),ri(f.r0),ri(f.r1),f.col,r1(f.max),f.w]);
  else if(f.k==='bolt'){const a=f.pts[0],b=f.pts[f.pts.length-1];ev.push(['b',ri(a[0]),ri(a[1]),ri(b[0]),ri(b[1]),f.col,f.w])}
  else if(f.k==='beam')ev.push(['m',ri(f.x1),ri(f.y1),ri(f.x2),ri(f.y2),f.col,f.w,+f.max.toFixed(2)]);
  else if(f.k==='arc')ev.push(['a',ri(f.x),ri(f.y),+f.ang.toFixed(2),ri(f.r),f.col]);
  else if(f.k==='crack')ev.push(['c',ri(f.x),ri(f.y),ri(f.r),f.seed|0,r1(f.max)]);
  else if(f.k==='fall')ev.push(['f',ri(f.x),ri(f.y),f.col,r1(f.max),f.burger?1:0])}
 for(const d of DEC)if(!d.sent){d.sent=1;ev.push(['d',ri(d.x),ri(d.y),ri(d.r),d.kind])}
 let nt=0;for(let i=0;i<TX.n;i++){const t=TX.a[i];if(t.sent)continue;t.sent=1;if(nt++<40)ev.push(['t',ri(t.x),ri(t.y),t.s,t.col,t.size,t.crit?1:0])}
 s.ev=ev;if(NETSFX.length)s.sx=NETSFX.splice(0,NETSFX.length);
 /* betrouwbaar log: beloningen worden ~8s lang in iedere snapshot herhaald */
 const now=Date.now();NET.rel=NET.rel.filter(r=>now-r.t<8000).slice(-60);if(NET.rel.length)s.rl=NET.rel.map(r=>[r.s,r.e]);
 return s;
}

/* ---------- gast ---------- */
function guestBegin(st){
 NET.mid=st.mid;NET.start=st;
 const me=st.players.find(p=>p.cid===NET.me);if(!me)return;
 closeAll();RES0={lvl:S.lvl};
 transition(()=>{
  resetWorld();G.net='guest';G.state='play';G.paused=false;
  K=kit(me.staff,me.cls);
  PLAYERS=st.players.map(d=>{const k=d.cid===NET.me?K:kit(d.staff,d.cls,{});return{id:d.cid,name:d.name,local:d.cid===NET.me,K:k,P:mkP(k),kills:0}});
  LOCAL=PLAYERS.find(p=>p.local);act(LOCAL);
  Object.assign(G,{kills:0,earned:0,xp:0,dmg:0,runTime:0,ptSaved:0,cleared:0,startWave:1,newAch:[],t:0,arena:-1,wave:1,phase:'fight',total:0,toSpawn:0,boss:null});
  NET.kills0=0;NET.sp=0;NET.ab=0;NET.bq=[];NET.lastSnap=Date.now();NET.t.in=0;NET.relGot=0;
  S.st.runs++;for(const s of K.syn)S.st.synUsed[s.id]=1;
  showScreen('game');renderEq();MUS.mode='game';announce('CO-OP','Samen met '+PLAYERS.filter(p=>!p.local).map(p=>p.name).join(', '),'#f472b6',true);checkAch();
 });
}
function guestEnd(p){if(G.state!=='play')return;if(p.msg)toast(p.msg);endRun(!!p.dead)}
NET.guestQuit=function(){if(G.net!=='guest'||G.state!=='play')return;NET.send('bye',{cid:NET.me,match:1});endRun(false)};
NET.trigger=function(k){const q=LOCAL&&LOCAL.P;if(!q||q.dead)return;if(k==='sp'&&q.spT<=0){NET.sp++;q.spT=.5}else if(k==='ab'&&q.abT<=0){NET.ab++;q.abT=.5}};
NET.build=function(kind){NET.bq.push([++NET.bid,kind]);if(NET.bq.length>6)NET.bq.shift()};
function guestTick(dt){
 const t=NET.t;t.in+=dt;
 if(t.in>=IN_EVERY&&LOCAL){t.in=0;const q=LOCAL.P,I=q.in;
  NET.send('in',{cid:NET.me,mid:NET.mid,x:ri(q.x),y:ri(q.y),a:Math.round((I.auto?q.ang:I.aim)*100),mx:Math.round(I.mx*100),my:Math.round(I.my*100),f:I.fire?1:0,au:I.auto?1:0,aa:I.autoAb?1:0,sp:NET.sp,ab:NET.ab,b:NET.bq,fm:q.fm})}
 if(Date.now()-NET.lastSnap>8000)guestEnd({dead:0,msg:'Verbinding met de host verloren'});
}
function applySnap(s){
 NET.lastSnap=Date.now();
 if(s.W!==W||s.H!==H){W=s.W;H=s.H;BG=null}
 G.wave=s.w;G.phase=s.ph?'clear':'fight';G.total=s.tot;G.clearT=s.cl;G.kills=s.k;G.dmg=s.dm;G.timeStop=s.ts?.2:0;G.dark=s.dk?.2:0;
 if(s.ar!==G.arena){if(G.arena>=0)toast('Nieuwe arena: '+ARENAS[s.ar].n);G.arena=s.ar;BG=null}
 if(S.set.shake)G.shake=Math.max(G.shake,s.sh||0);if(s.fl){G.flash=Math.max(G.flash,s.fl[0]);G.flashCol=s.fl[1]}
 NET.hostSpeed=s.spd;NET.hostSkip=s.sk;
 for(const e of s.pl){const pl=PLAYERS.find(p=>p.id===e[0]);if(!pl)continue;const q=pl.P,f=e[6];
  q.dead=!!(f&1);q.fShield=!!(f&2);q.fRage=!!(f&4);q.fDash=!!(f&16);q.slowT=f&32?.2:0;q.droneOvT=f&64?1:0;
  if(pl.local&&q.lastHp!=null&&e[4]<q.lastHp-.5){shake(.22);sfx('hurt',1,true);q.hurtT=.18}
  if(!pl.local&&f&8)q.hurtT=.12;
  q.lastHp=e[4];q.hp=e[4];q.maxhp=e[5];q.scrap=e[9];pl.kills=e[10];q.nDR=e[11];q.nPL=e[12];
  q.beamVis=e[13]?{x2:e[13][0],y2:e[13][1],w:e[13][2],t:.15}:null;
  if(pl.local){if(e[14]>q.fm||q.fDash||q.dead){q.x=e[1];q.y=e[2];q.fm=Math.max(q.fm,e[14])}
   if(q.in.auto)q.ang=e[3]/100;
   q.spT=e[7]/100*(K.sp.cd*K.cdMul);q.abT=e[8]/100*(K.cl.ab.cd*K.cdMul);
   const dk=pl.kills-NET.kills0;if(dk>0){S.kills+=dk;NET.kills0=pl.kills}}
  else{q.tx=e[1];q.ty=e[2];q.ang=e[3]/100;if(q.seen==null||Math.abs(q.x-q.tx)>300){q.x=q.tx;q.y=q.ty}q.seen=1}}
 PLAYERS=PLAYERS.filter(pl=>pl.local||s.pl.some(e=>e[0]===pl.id));
 const old=new Map(Z.map(z=>[z.id,z])),nz=[];
 for(const e of s.z){let z=old.get(e[0]);const tid=e[1]<0?'walker':(ZK[e[1]]||'walker');
  if(!z)z={id:e[0],tid,t:ZT[tid],x:e[2],y:e[3],ph:Math.random()*6,flash:0,hp:1000,maxhp:1000,face:0,dead:false,amp:1,slowF:.5};
  old.delete(e[0]);z.tx=e[2];z.ty=e[3];z.r=e[4];if(e[5]<z.hp-1)z.flash=.07;z.hp=e[5];z.maxhp=1000;z.face=e[6]/100;const b=e[7];
  z.frozen=b&1?1:0;z.stun=b&2?1:0;z.root=b&4?1:0;z.hack=b&8?1:0;z.slowT=b&16?1:0;z.slowF=.5;z.poisonT=b&32?1:0;z.ampT=b&64?1:0;z.amp=b&64?1.3:1;z.burnT=b&128?1:0;z.elite=!!(b&256);z.reveal=b&512?1:0;if(b&1024)z.flash=.07;
  z.col=e[8]||undefined;z.shieldMax=e[9]?100:0;z.shield=e[9];
  if(e[1]<0&&s.b&&s.b[0]===e[0]){const bb=s.b;Object.assign(z,{boss:true,tid:'boss',idx:bb[1],bdef:BOSSES[bb[1]]||BOSSES[0],hp:bb[2],maxhp:bb[3],phase:bb[4],inv:bb[5]?1:0,name:bb[6],tier:bb[7]});z.col=z.bdef.col}
  if(!S.st.zSeen[tid]&&!z.boss)S.st.zSeen[tid]=1;
  nz.push(z)}
 for(const z of old.values()){const col=z.boss?z.bdef.c2:(z.col||z.t.col);burst(z.x,z.y,col,z.boss?70:10,z.boss?320:150,.6,z.boss?5:3);burst(z.x,z.y,'#3a1010',4,90,.8,3);light(z.x,z.y,z.boss?300:70,col,.3)}
 if(old.size)sfx('kill',1,true);
 Z=nz;G.boss=Z.find(z=>z.boss)||null;G.toSpawn=Math.max(0,s.rem-Z.length);
 if(s.in){const bz=Z.find(z=>z.id===s.in[2]);if(bz){if(!G.intro){bossIntroUI(bz);sfx('boss',1,true)}G.intro={t:s.in[0],max:s.in[1],z:bz}}}
 else if(G.intro){G.intro=null;bossIntroUI(null)}
 MUS.mode=G.boss?'boss':'game';
 PR.clear();for(const e of s.p){const p=PR.get();p.kind=PKK[e[0]]||'bolt';p.x=e[1];p.y=e[2];p.vx=e[3];p.vy=e[4];p.r=e[5];p.col=e[6];p.burger=!!e[7];p.spin=p.spin||0;p.life=1;p.own=null}
 EP.clear();for(const e of s.e){const q=EP.get();q.x=e[0];q.y=e[1];q.vx=e[2];q.vy=e[3];q.r=e[4];q.col=e[5];q.missile=!!e[6];q.life=1}
 TW=s.tw.map(e=>({x:e[0],y:e[1],kind:TKK[e[2]]||'basic',lvl:e[3],hp:e[4],maxhp:100,ang:e[5]/100,r:e[6],hit:0}));
 WL=s.wl.map(e=>({x:e[0],y:e[1],hp:e[2],maxhp:100,col:e[3],r:19,hit:0}));
 const oldMn=MN;MN=s.mn.map((e,i)=>{const o=oldMn[i];return{kind:MNK[e[0]]||'imp',x:o&&o.kind===MNK[e[0]]?o.x:e[1],y:o&&o.kind===MNK[e[0]]?o.y:e[2],tx:e[1],ty:e[2],face:e[3]/100,hp:e[4],maxhp:100,r:e[5],col:e[6],ph:o?o.ph:0,hit:0}});
 PK=s.pk.map(e=>({k:e[0]?'potion':'burger',x:e[1],y:e[2],pot:POT[e[3]]||'heal',bob:e[1]%6}));
 HO=s.ho.map(e=>({x:e[0],y:e[1],r:e[2],life:e[3],max:e[4]}));
 CL=s.cz.map(e=>({x:e[0],y:e[1],r:e[2],col:e[3],rad:!!e[4],life:e[5],max:e[6]}));
 FI=s.fi.map(e=>({x:e[0],y:e[1],r:e[2],col:e[3],life:e[4],max:e[5]}));
 const oldTn=TN;TN=s.tn.map((e,i)=>({x:e[0],y:e[1],r:e[2],life:e[3],max:e[4],col:e[5],rot:oldTn[i]?oldTn[i].rot:0}));
 const oldPo=PO;PO=s.po.map((e,i)=>({x:e[0],y:e[1],col:e[2],life:e[3],max:e[4],ang:oldPo[i]?oldPo[i].ang:0}));
 ZO=s.zo.map(e=>({k:e[0]?'freeze':'toxic',x:e[1],y:e[2],r:e[3],life:e[4],max:e[5],small:!!e[6]}));
 TE=s.te.map(e=>({k:e[0],x:e[1],y:e[2],r:e[3],x2:e[4],y2:e[5],w:e[6],t:e[7],max:e[8],ally:!!e[9]}));
 HZ=s.hz.map(e=>e[0]==='w'?{k:'wave',x:e[1],y:e[2],r:e[3],max:e[4],col:e[5]}:{k:'laser',z:Z.find(z=>z.id===e[1])||{dead:true},ang:e[2]/100,w:e[3],col:e[4]});
 for(const e of s.ev||[])applyEv(e);
 for(const r of s.rl||[])if(r[0]>NET.relGot){NET.relGot=r[0];applyEv(r[1])}
 for(const x of s.sx||[])sfx(x[0],x[1],true);
}
function applyEv(e){
 switch(e[0]){
  case 'r':FX.push({k:'ring',x:e[1],y:e[2],r0:e[3],r1:e[4],col:e[5],t:e[6],max:e[6],w:e[7]});if(e[4]>40){burst(e[1],e[2],e[5],10,e[4]*2,.4,3,true);light(e[1],e[2],e[4]*1.6,e[5],.25)}break;
  case 'b':boltFx(e[1],e[2],e[3],e[4],e[5],e[6]);break;
  case 'm':FX.push({k:'beam',x1:e[1],y1:e[2],x2:e[3],y2:e[4],col:e[5],w:e[6],t:e[7],max:e[7]});break;
  case 'a':FX.push({k:'arc',x:e[1],y:e[2],ang:e[3],r:e[4],col:e[5],t:.3,max:.3});break;
  case 'c':FX.push({k:'crack',x:e[1],y:e[2],r:e[3],seed:e[4],t:e[5],max:e[5]});break;
  case 'f':FX.push({k:'fall',x:e[1],y:e[2],col:e[3],t:e[4],max:e[4],burger:!!e[5]});break;
  case 'd':decal(e[1],e[2],e[3],e[4]);break;
  case 't':txt(e[1],e[2],e[3],e[4],e[5],!!e[6]);break;
  case 'A':announce(e[1],e[2],e[3],true);break;
  case 'W':G.cleared++;waveRewards(e[1]);break;
  case 'G':addBurgers(e[1]);saveSoon();break;
  case 'B':S.st.bossKills[e[1]]=(S.st.bossKills[e[1]]||0)+1;if(!S.st.bossFast[e[1]]||e[2]<S.st.bossFast[e[1]])S.st.bossFast[e[1]]=e[2];break;
 }
}
/* gast: eigen beweging direct (voelt snel aan), rest vloeiend tussen snapshots */
function clientTick(dt){
 G.t+=dt;G.runTime+=dt;
 const q=LOCAL.P,I=q.in;localInput(I,q);
 if(!q.dead&&!q.fDash){const L=Math.hypot(I.mx,I.my);if(L>.05){const sp=K.spd*Math.min(1,L)*(q.slowT>0?.55:1);q.x+=I.mx/Math.max(1,L)*sp*dt;q.y+=I.my/Math.max(1,L)*sp*dt;q.walk+=dt*10}q.x=clamp(q.x,q.r,W-q.r);q.y=clamp(q.y,q.r,H-q.r)}
 if(!I.auto)q.ang=I.aim;
 if(q.spT>0)q.spT-=dt;if(q.abT>0)q.abT-=dt;
 const f=Math.min(1,dt*12);
 for(const pl of PLAYERS){const p=pl.P;
  if(!pl.local&&p.tx!=null){const ox=p.x;p.x+=(p.tx-p.x)*f;p.y+=(p.ty-p.y)*f;if(Math.abs(p.x-ox)>.3)p.walk+=dt*10}
  if(p.hurtT>0)p.hurtT-=dt;if(p.beamVis){p.beamVis.t-=dt;if(p.beamVis.t<=0)p.beamVis=null}
  const nd=p.dead?0:(p.nDR||0),np=p.dead?0:(p.nPL||0);
  while(p.DR.length<nd)p.DR.push({x:p.x,y:p.y,a:0});p.DR.length=nd;
  p.DR.forEach((d,i)=>{const a=G.t*1.8+i/Math.max(1,nd)*TAU;d.x+=(p.x+Math.cos(a)*52-d.x)*f;d.y+=(p.y+Math.sin(a)*52-10-d.y)*f});
  while(p.PL.length<np)p.PL.push({a:0,R:78,col:pick(['#818cf8','#f472b6','#facc15','#34d399','#60a5fa','#fb7185','#c4b5fd'])});p.PL.length=np;
  p.PL.forEach((pp,i)=>{pp.a=G.t*1.7+i/Math.max(1,np)*TAU;pp.R=78+Math.sin(G.t*1.3+i)*12;pp.x=p.x+Math.cos(pp.a)*pp.R;pp.y=p.y+Math.sin(pp.a)*pp.R})}
 for(const z of Z){if(z.tx!=null){z.x+=(z.tx-z.x)*f;z.y+=(z.ty-z.y)*f}z.ph+=dt*4;if(z.flash>0)z.flash-=dt;if(z.burnT&&Q().pm>200&&Math.random()<.08)part(z.x+rnd(-z.r,z.r)*.5,z.y-z.r*.3,0,-50,.5,'#ff8a3d',4,0,1)}
 for(const m of MN){if(m.tx!=null){m.x+=(m.tx-m.x)*f;m.y+=(m.ty-m.y)*f}m.ph+=dt*8}
 for(let i=0;i<PR.n;i++){const p=PR.a[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.spin=(p.spin||0)+dt*20}
 for(let i=0;i<EP.n;i++){const e=EP.a[i];e.x+=e.vx*dt;e.y+=e.vy*dt}
 for(const t of TN)t.rot+=dt*10;for(const p of PO)p.ang+=dt*4;for(const t of TE)t.t=Math.max(0,t.t-dt);
 for(let i=DEC.length-1;i>=0;i--){DEC[i].t-=dt;if(DEC[i].t<=0)DEC.splice(i,1)}
 for(let i=LI.n-1;i>=0;i--){const l=LI.a[i];l.t-=dt;if(l.t<=0)LI.kill(i)}
 updateFx(dt);
}
