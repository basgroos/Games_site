/* ===================== CHARACTER DATA ===================== */
const RARITY={
  common:{name:'Common',color:'#a9bccf',w:44,refund:20},
  uncommon:{name:'Uncommon',color:'#5fd38a',w:26,refund:35},
  rare:{name:'Rare',color:'#4fb3ff',w:18,refund:50},
  epic:{name:'Epic',color:'#b47cff',w:8,refund:120},
  legendary:{name:'Legendary',color:'#ffc233',w:3.2,refund:300},
  mythic:{name:'Mythic',color:'#ff4f8b',w:.8,refund:600}
};
const RORDER=['common','uncommon','rare','epic','legendary','mythic'];
const RIDX={common:0,uncommon:1,rare:2,epic:3,legendary:4,mythic:5};
const ROLES={
  warrior:{name:'Warrior',good:'Strong all-rounder up front',bad:'Melts under focused ranged fire'},
  archer:{name:'Archer',good:'Long-range damage from safety',bad:'Fragile when assassins dive in'},
  mage:{name:'Mage',good:'Area damage shreds big clumps',bad:'Slow casts, low health'},
  tank:{name:'Tank',good:'Soaks damage, shields the backline',bad:'Low damage output'},
  assassin:{name:'Assassin',good:'Dives past the front line',bad:'Very little health'},
  healer:{name:'Healer',good:'Keeps the front line standing',bad:'Barely hurts anyone'},
  support:{name:'Support',good:'Buffs nearby allies',bad:'Weak alone'}
};
const CHARS=[
 {id:'pip',name:'Pip the Squire',rarity:'common',role:'warrior',hp:140,atk:14,as:1,range:24,spd:62,
  ab:{k:'bash',n:4,stun:.9,name:'Shield Bash',desc:'Every 4th hit stuns the target for 0.9s.'},
  look:{body:'#7cc6ff',shape:'round',hat:'helmet',weapon:'sword',eye:'happy'}},
 {id:'bramble',name:'Bramble',rarity:'common',role:'archer',hp:72,atk:11,as:.95,range:210,spd:55,
  ab:{k:'multi',n:4,extra:2,name:'Triple Nock',desc:'Every 4th shot fires two extra arrows at nearby enemies.'},
  look:{body:'#7ed957',shape:'bean',hat:'hood',hatC:'#3f8f3a',weapon:'bow',eye:'happy'}},
 {id:'cinder',name:'Cinder',rarity:'common',role:'mage',hp:66,atk:11,as:.62,range:170,spd:50,splash:38,
  ab:{k:'none',name:'Ember Burst',desc:'Fireballs explode, hitting every enemy in a small area.'},
  look:{body:'#ff9a4d',shape:'round',hat:'wizard',hatC:'#7a3cff',weapon:'staff',orb:'#ff5b2e',eye:'happy'}},
 {id:'mossback',name:'Mossback',rarity:'common',role:'tank',hp:270,atk:7,as:.7,range:24,spd:44,armor:.25,
  ab:{k:'none',name:'Barkskin',desc:'Takes 25% less damage from everything.'},
  look:{body:'#6b9a4e',shape:'wide',hat:'leaf',weapon:'shield',shieldC:'#8a5a33',eye:'happy'}},
 {id:'nib',name:'Nib',rarity:'common',role:'assassin',hp:62,atk:21,as:1.15,range:22,spd:96,leap:true,crit:.2,critX:2,
  ab:{k:'none',name:'Backline Dash',desc:'Dashes past the front line to stab archers, mages and healers. 20% crit chance.'},
  look:{body:'#9b8cff',shape:'bean',hat:'mask',weapon:'dagger',eye:'sly'}},
 {id:'dewdrop',name:'Dewdrop',rarity:'common',role:'healer',hp:78,atk:5,as:.8,range:150,spd:50,
  ab:{k:'heal',amt:15,name:'Mend',desc:'Heals the most wounded nearby ally for 15.'},
  look:{body:'#8fe9ff',shape:'round',hat:'halo',weapon:'wand',eye:'happy'}},
 {id:'gumbo',name:'Gumbo',rarity:'uncommon',role:'warrior',hp:170,atk:16,as:.95,range:26,spd:62,armor:.1,
  ab:{k:'none',name:'Thick Skull',desc:'A sturdy brawler who takes 10% less damage.'},
  look:{body:'#d98e4a',shape:'wide',hat:'bandana',hatC:'#e0413a',weapon:'hammer',eye:'angry'}},
 {id:'quill',name:'Quill',rarity:'uncommon',role:'archer',hp:80,atk:13,as:1,range:225,spd:56,
  ab:{k:'multi',n:3,extra:1,name:'Quick Draw',desc:'Every 3rd shot fires an extra arrow at a nearby enemy.'},
  look:{body:'#9ad0a0',shape:'tall',hat:'feather',weapon:'bow',eye:'happy'}},
 {id:'sparkwick',name:'Sparkwick',rarity:'uncommon',role:'mage',hp:74,atk:12,as:.65,range:175,spd:50,splash:32,
  ab:{k:'chain',n:2,pct:.6,r:80,name:'Static Pop',desc:'Small blasts that also zap 2 more enemies for 60%.'},
  look:{body:'#5ec8e5',shape:'round',hat:'wizard',hatC:'#ffb000',weapon:'wand',eye:'happy'}},
 {id:'shellby',name:'Shellby',rarity:'uncommon',role:'tank',hp:320,atk:8,as:.7,range:24,spd:44,armor:.22,thorns:.15,
  ab:{k:'none',name:'Prickle Shell',desc:'Takes 22% less damage and pricks melee attackers for 15%.'},
  look:{body:'#7fbf9a',shape:'wide',hat:'spikes',weapon:'shield',shieldC:'#4f8a6a',eye:'happy'}},
 {id:'ironjaw',name:'Ironjaw',rarity:'rare',role:'warrior',hp:200,atk:20,as:.85,range:26,spd:58,
  ab:{k:'cleave',r:36,pct:.6,name:'Cleave',desc:'Each swing also hits enemies next to the target for 60%.'},
  look:{body:'#c97b5a',shape:'wide',hat:'hornhelm',weapon:'axe',eye:'angry'}},
 {id:'wren',name:'Hawkeye Wren',rarity:'rare',role:'archer',hp:86,atk:18,as:.8,range:265,spd:55,crit:.3,critX:2.5,
  ab:{k:'none',name:'Eagle Eye',desc:'Longest bow range. 30% chance to crit for 2.5×.'},
  look:{body:'#f2c14e',shape:'tall',hat:'feather',weapon:'bow',eye:'happy'}},
 {id:'frostling',name:'Frostling',rarity:'rare',role:'mage',hp:82,atk:12,as:.7,range:180,spd:50,splash:34,
  ab:{k:'frost',dur:2,name:'Frost Nova',desc:'Icy blasts hit an area and slow enemies by 45% for 2s.'},
  look:{body:'#c8ecff',shape:'round',hat:'frost',weapon:'orb',orb:'#7fd8ff',eye:'happy'}},
 {id:'stoneward',name:'Stoneward',rarity:'rare',role:'tank',hp:390,atk:9,as:.6,range:24,spd:42,armor:.2,thorns:.35,
  ab:{k:'none',name:'Spiked Shell',desc:'Reflects 35% of melee damage back at attackers. Takes 20% less damage.'},
  look:{body:'#8d93a8',shape:'wide',hat:'spikes',weapon:'shield',shieldC:'#5b6275',eye:'angry'}},
 {id:'bloom',name:'Bloomtender',rarity:'rare',role:'healer',hp:98,atk:6,as:.7,range:140,spd:50,
  ab:{k:'heal',amt:12,r:70,name:'Blossom Wave',desc:'Heals a wounded ally and everyone near them for 12.'},
  look:{body:'#ffb3d1',shape:'bean',hat:'petals',weapon:'staff',orb:'#7cffb2',eye:'happy'}},
 {id:'ember',name:'Ember Duelist',rarity:'epic',role:'assassin',hp:112,atk:27,as:1.3,range:24,spd:106,leap:true,crit:.25,critX:2,
  ab:{k:'bleed',dps:7,dur:3,name:'Flame Fang',desc:'Dives the backline. Hits set targets ablaze for 7 damage/s for 3s.'},
  look:{body:'#ff5a4f',shape:'bean',hat:'flame',weapon:'dagger',eye:'sly'}},
 {id:'thunder',name:'Thunderhorn',rarity:'epic',role:'warrior',hp:310,atk:25,as:.8,range:28,spd:70,
  ab:{k:'charge',cd:7,stun:1.2,r:42,name:'Stampede',desc:'Every 7s, the next hit deals double damage and stuns everyone nearby.'},
  look:{body:'#5a6cff',shape:'wide',hat:'horns',weapon:'hammer',eye:'angry'}},
 {id:'starweaver',name:'Starweaver',rarity:'epic',role:'mage',hp:112,atk:16,as:.7,range:200,spd:48,splash:36,
  ab:{k:'meteor',cd:6,r:72,dmg:65,name:'Meteor',desc:'Every 6s, calls a meteor that crushes a large area for 65.'},
  look:{body:'#4a47a8',shape:'round',hat:'wizard',hatC:'#1b1a4a',weapon:'staff',orb:'#ffe36b',eye:'glow',eyeC:'#ffe36b'}},
 {id:'bonepiper',name:'Bonepiper',rarity:'epic',role:'support',hp:135,atk:10,as:.9,range:160,spd:52,
  ab:{k:'drum',r:120,amt:5,name:'War Drum',desc:'Allies nearby attack 30% faster and regenerate health.'},
  look:{body:'#efe4cc',shape:'round',hat:'skull',weapon:'drum',eye:'happy'}},
 {id:'aurelion',name:'Aurelion',rarity:'legendary',role:'tank',hp:580,atk:20,as:.8,range:28,spd:50,armor:.3,
  ab:{k:'aegis',dur:3,heal:60,r:95,name:'Divine Aegis',desc:'Once, at 30% health: 3s invulnerable and heals nearby allies for 60.'},
  look:{body:'#ffe8a3',shape:'tall',hat:'crown',weapon:'shield',shieldC:'#ffcf3f',cape:'#c0392b',eye:'happy'}},
 {id:'nightveil',name:'Nightveil',rarity:'legendary',role:'assassin',hp:150,atk:38,as:1.2,range:24,spd:115,crit:.2,critX:2,
  ab:{k:'shadow',cd:5,mult:3,name:'Shadowstep',desc:'Every 5s, teleports behind the weakest enemy and strikes for 3×.'},
  look:{body:'#3a2f6b',shape:'bean',hat:'hood',hatC:'#16102e',weapon:'dagger',eye:'glow',eyeC:'#c9a6ff'}},
 {id:'orrin',name:'Grand Magus Orrin',rarity:'legendary',role:'mage',hp:150,atk:26,as:.65,range:220,spd:46,
  ab:{k:'chain',n:4,pct:.75,r:95,name:'Chain Lightning',desc:'Bolts jump to 4 more enemies, keeping 75% damage each jump.'},
  look:{body:'#6b5bd6',shape:'tall',hat:'wizard',hatC:'#2d2a7a',weapon:'staff',orb:'#9ff3ff',beard:true,eye:'happy'}},
 {id:'solaris',name:'Solaris',rarity:'mythic',role:'warrior',hp:530,atk:36,as:.9,range:30,spd:68,
  ab:{k:'solar',cd:6,r:85,dmg:70,name:'Dawnbreak',desc:'Every 6s, erupts in a solar flare for 70. Rises again once at 50% health.'},
  look:{body:'#ffb23f',shape:'round',hat:'sun',weapon:'sword',eye:'glow',eyeC:'#fff7d6',cape:'#ff6a3d'}},
 {id:'vex',name:'Vex, Void Empress',rarity:'mythic',role:'mage',hp:220,atk:28,as:.6,range:230,spd:46,splash:30,
  ab:{k:'void',cd:7,r:90,dps:26,dur:2.2,name:'Event Horizon',desc:'Every 7s, opens a black hole that drags enemies in and deals 26 damage/s.'},
  look:{body:'#2a1544',shape:'tall',hat:'void',weapon:'orb',orb:'#d94bff',eye:'glow',eyeC:'#ff6be0',cape:'#120822'}}
];
const CH=Object.fromEntries(CHARS.map(c=>[c.id,c]));

/* ===================== SEEDED RNG ===================== */
function hashStr(s){let h1=1779033703,h2=3144134277,h3=1013904242,h4=2773480762;
  for(let i=0;i<s.length;i++){const k=s.charCodeAt(i);h1=h2^Math.imul(h1^k,597399067);h2=h3^Math.imul(h2^k,2869860233);h3=h4^Math.imul(h3^k,951274213);h4=h1^Math.imul(h4^k,2716044179);}
  h1=Math.imul(h3^(h1>>>18),597399067);h2=Math.imul(h4^(h2>>>22),2869860233);h3=Math.imul(h1^(h3>>>17),951274213);h4=Math.imul(h2^(h4>>>19),2716044179);
  h1^=(h2^h3^h4);h2^=h1;h3^=h1;h4^=h1;return [h1>>>0,h2>>>0,h3>>>0,h4>>>0];}
function sfc32(a,b,c,d){return function(){a>>>=0;b>>>=0;c>>>=0;d>>>=0;let t=(a+b)|0;a=b^(b>>>9);b=(c+(c<<3))|0;c=(c<<21|c>>>11);d=(d+1)|0;t=(t+d)|0;c=(c+t)|0;return (t>>>0)/4294967296;};}
function makeRng(seed){const h=hashStr(String(seed));const r=sfc32(h[0],h[1],h[2],h[3]);for(let i=0;i<12;i++)r();return r;}
function randHex(n=16){const a=new Uint8Array(n);(globalThis.crypto&&crypto.getRandomValues)?crypto.getRandomValues(a):a.forEach((_,i)=>a[i]=Math.random()*256|0);return [...a].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function sha(s){try{if(globalThis.crypto&&crypto.subtle){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}}catch(e){}return 'f'+hashStr(s).map(x=>x.toString(16).padStart(8,'0')).join('');}

/* ===================== ARCADE MACHINE (rules shared by player, bot and validation) =====================
 Each round you get 3 balls. Each ball is live for AR.ballTime seconds. Every paddle hit climbs the rarity
 ladder and awards one fighter of that rarity right away. Missing the ball ends the streak (you keep what you
 earned) and the ball comes back to the paddle at starting speed. Reaching Mythic (hit 6) cashes the streak out
 and the ladder starts again from Common. Rarity is never rolled: it is purely the number of hits in a streak. */
const LADDER=["common","uncommon","rare","epic","legendary","mythic"];
const AR={W:400,H:560,padY:518,padW:94,padShrink:4,padH:12,ballR:9,ballTime:20,autoLaunch:1.6,
  speeds:[310,350,405,470,545,625,710],maxHitsPerBall:40,maxStreaks:20};
const SPEED_LABEL=["Slow","Slow","Comfortable","Moderate","Fast","Very fast","Extremely fast"];
// Which fighter a rarity step awards: a type of that rarity already in your army first, else one you own, else any.
function rewardPools(coll,armyTypes){const o={};for(const r of LADDER){const inArmy=armyTypes.filter(id=>CH[id]&&CH[id].rarity===r).sort();
  const owned=coll.filter(id=>CH[id]&&CH[id].rarity===r).sort();o[r]=inArmy.length?inArmy:owned.length?owned:CHARS.filter(c=>c.rarity===r).map(c=>c.id);}return o;}
function makePicker(seed,side,pools){const rng=makeRng(seed+"|arc|"+side);return {next(r){const p=pools[r];return p[Math.floor(rng()*p.length)];}};}
function validateLog(log){if(!Array.isArray(log)||log.length!==3)return "needs 3 balls";
  for(const b of log){if(!Array.isArray(b)||b.length>AR.maxStreaks)return "bad ball";let sum=0;
    for(const k of b){if(!Number.isInteger(k)||k<1||k>6)return "bad streak";sum+=k;}if(sum>AR.maxHitsPerBall)return "too many hits";}
  return null;}
function rewardsFromLog(seed,side,pools,log){const pk=makePicker(seed,side,pools),out=[];
  log.forEach((ball,bi)=>ball.forEach(k=>{for(let l=1;l<=k;l++){const r=LADDER[l-1];out.push({id:pk.next(r),rarity:r,ball:bi});}}));return out;}
// Bot plays the same machine: a simulated timeline of catches and misses with real ball speeds.
const BOT_CATCH={easy:[.86,.76,.64,.52,.42,.34],medium:[.93,.87,.79,.7,.6,.52],hard:[.97,.95,.92,.87,.81,.75]};
function botArcadePlan(diff,rng){const P=BOT_CATCH[diff]||BOT_CATCH.medium,events=[],log=[[],[],[]];
  for(let b=0;b<3;b++){const t0=b*(AR.ballTime+2);let t=1+rng()*.8,hits=0;
    while(true){const flight=2*430/AR.speeds[hits]*(.8+rng()*.4);if(t+flight>=AR.ballTime)break;t+=flight;
      if(rng()<P[hits]){hits++;events.push({t:t0+t,ball:b,type:"hit",hits});if(hits===6){log[b].push(6);hits=0;t+=1.4;}}
      else{if(hits)log[b].push(hits);events.push({t:t0+t,ball:b,type:"drop",hits});hits=0;t+=1.2;}}
    if(hits)log[b].push(hits);events.push({t:t0+AR.ballTime,ball:b,type:"end",hits:0});}
  return {events,log};}

/* ===================== COMBAT (deterministic, fixed timestep) ===================== */
const ARENA={W:1000,H:560},DT=.05,MAXT=75;
const isRanged=d=>d.range>60;
const d2=(a,b)=>{const dx=a.x-b.x,dy=a.y-b.y;return dx*dx+dy*dy;};
const ROLE_RANK={tank:0,warrior:1,assassin:1,support:2,archer:3,mage:3,healer:4};
function makeUnit(st,id,side,x,y){const d=CH[id],ab=d.ab;const timed=['charge','shadow','meteor','solar','void'].includes(ab.k);
  return {uid:st.units.length,id,side,d,x,y,hp:d.hp,max:d.hp,cd:st.rng()*.6,tgt:null,rt:0,stun:0,slow:0,bleed:0,bleedT:0,bleedSide:-1,inv:0,
    abT:timed?(ab.k==='charge'?1:ab.cd*(.4+st.rng()*.4)):Infinity,hits:0,alive:true,used:false,revived:false,mult:1,haste:false,charged:false,
    dash:!!d.leap,rad:d.role==='tank'?13:10};}
function createBattle(armies,seed){const st={t:0,tick:0,units:[],proj:[],zones:[],ev:[],done:false,winner:-1,dmg:[0,0],rng:makeRng(seed+'|battle')};
  for(let s=0;s<2;s++){const list=[];armies[s].forEach(a=>{for(let n=0;n<a.count;n++)list.push(a.id);});
    list.sort((a,b)=>ROLE_RANK[CH[a].role]-ROLE_RANK[CH[b].role]||(a<b?-1:a>b?1:0));
    const perCol=Math.max(7,Math.ceil(Math.sqrt(list.length*1.7)));
    list.forEach((id,idx)=>{const col=Math.floor(idx/perCol),row=idx%perCol,n=Math.min(perCol,list.length-col*perCol);
      const gap=Math.min(34,(ARENA.H-70)/n);const y=ARENA.H/2+(row-(n-1)/2)*gap+(st.rng()-.5)*6;
      const x0=Math.max(28,380-col*32+(st.rng()-.5)*6);st.units.push(makeUnit(st,id,s,s===0?x0:ARENA.W-x0,y));});}
  return st;}
function enemiesNear(st,side,x,y,r){const o=[],r2=r*r;for(const e of st.units){if(!e.alive||e.side===side)continue;const dx=e.x-x,dy=e.y-y;if(dx*dx+dy*dy<=r2)o.push(e);}return o;}
function findTarget(st,u){let best=null,bd=Infinity;const dive=u.d.role==='assassin';
  for(const e of st.units){if(!e.alive||e.side===u.side)continue;let d=d2(u,e);
    if(dive&&(e.d.role==='archer'||e.d.role==='mage'||e.d.role==='healer'||e.d.role==='support'))d*=.3;
    if(d<bd){bd=d;best=e;}}return best;}
function lowestAlly(st,u,range){let best=null,br=.92,r2=range*range;for(const a of st.units){if(!a.alive||a.side!==u.side)continue;const f=a.hp/a.max;if(f<br&&d2(a,u)<=r2){br=f;best=a;}}return best;}
function moveToward(u,x,y,mult){const dx=x-u.x,dy=y-u.y,d=Math.sqrt(dx*dx+dy*dy);if(d<.001)return;const step=Math.min(d,u.d.spd*mult*(u.slow>0?.55:1)*DT);u.x+=dx/d*step;u.y+=dy/d*step;}
function healUnit(st,a,amt){if(!a.alive)return;const h=Math.min(amt,a.max-a.hp);if(h<=0)return;a.hp+=h;st.ev.push({k:'heal',u:a,a:h});}
function kill(st,t){if(t.d.ab.k==='solar'&&!t.revived){t.revived=true;t.hp=t.max*.5;st.ev.push({k:'revive',u:t});return;}t.alive=false;t.hp=0;st.ev.push({k:'die',u:t});}
function dmgTo(st,src,t,amt,melee,crit,sideOv){if(!t.alive||t.inv>0)return;if(t.d.armor)amt*=1-t.d.armor;t.hp-=amt;
  const s=src?src.side:sideOv;if(s===0||s===1)st.dmg[s]+=amt;
  if(crit||amt>=40)st.ev.push({k:'num',x:t.x,y:t.y,a:amt,crit});
  st.ev.push({k:'hit',u:t});
  if(melee&&t.d.thorns&&src&&src.alive){const r=amt*t.d.thorns;src.hp-=r;st.dmg[t.side]+=r;if(src.hp<=0)kill(st,src);}
  const ab=t.d.ab;
  if(ab.k==='aegis'&&!t.used&&t.hp<=t.max*.3){t.used=true;t.inv=ab.dur;if(t.hp<1)t.hp=1;
    for(const a of st.units)if(a.alive&&a.side===t.side&&d2(a,t)<=ab.r*ab.r)healUnit(st,a,ab.heal);st.ev.push({k:'aegis',u:t});return;}
  if(t.hp<=0)kill(st,t);}
function hit(st,src,t,dmg,crit,x,y){const d=src.d,ab=d.ab;
  if(d.splash){for(const e of enemiesNear(st,src.side,x,y,d.splash)){dmgTo(st,src,e,e===t?dmg:dmg*.7,false,crit&&e===t);if(ab.k==='frost')e.slow=Math.max(e.slow,ab.dur);}
    st.ev.push({k:'aoe',x,y,r:d.splash,c:d.look.orb||'#ff9a4d'});}
  else if(t.alive)dmgTo(st,src,t,dmg,!isRanged(d),crit);
  if(ab.k==='bash'&&src.hits%ab.n===0&&t.alive){t.stun=Math.max(t.stun,ab.stun);st.ev.push({k:'stun',u:t});}
  if(ab.k==='cleave'){for(const e of enemiesNear(st,src.side,t.x,t.y,ab.r))if(e!==t)dmgTo(st,src,e,dmg*ab.pct,true,false);st.ev.push({k:'cleave',x:t.x,y:t.y,r:ab.r,u:src});}
  if(ab.k==='bleed'&&t.alive){t.bleed=ab.dps;t.bleedT=ab.dur;t.bleedSide=src.side;}
  if(ab.k==='chain'&&t.alive){let cur=t,dd=dmg;const seen=[t],pts=[[x,y]];
    for(let i=0;i<ab.n;i++){let best=null,bd=ab.r*ab.r;for(const e of st.units){if(!e.alive||e.side===src.side||seen.includes(e))continue;const q=d2(e,cur);if(q<bd){bd=q;best=e;}}
      if(!best)break;dd*=ab.pct;pts.push([best.x,best.y]);dmgTo(st,src,best,dd,false,false);seen.push(best);cur=best;}
    st.ev.push({k:'chain',pts});}}
function attack(st,u,t){const d=u.d,ab=d.ab;u.hits++;let dmg=d.atk*u.mult;u.mult=1;let crit=false;
  if(d.crit&&st.rng()<d.crit){dmg*=d.critX;crit=true;}
  st.ev.push({k:'atk',u,t});
  if(ab.k==='charge'&&u.charged){u.charged=false;u.abT=ab.cd;dmg*=2;crit=true;
    for(const e of enemiesNear(st,u.side,t.x,t.y,ab.r))e.stun=Math.max(e.stun,ab.stun);st.ev.push({k:'aoe',x:t.x,y:t.y,r:ab.r,c:'#8fa2ff',big:true});}
  if(isRanged(d)){const mk=tt=>({x:u.x,y:u.y,t:tt,tx:tt.x,ty:tt.y,dmg,crit,spd:d.role==='archer'?520:360,src:u,side:u.side,kind:d.role,c:d.look.orb||null});
    st.proj.push(mk(t));
    if(ab.k==='multi'&&u.hits%ab.n===0){const others=st.units.filter(e=>e.alive&&e.side!==u.side&&e!==t).sort((a,b)=>d2(a,u)-d2(b,u)||a.uid-b.uid).slice(0,ab.extra);for(const o of others)st.proj.push(mk(o));}}
  else hit(st,u,t,dmg,crit,t.x,t.y);}
function timedAbility(st,u){const ab=u.d.ab;
  switch(ab.k){
    case 'charge':u.charged=true;u.abT=Infinity;break;
    case 'shadow':{let best=null,bh=Infinity;for(const e of st.units)if(e.alive&&e.side!==u.side&&e.hp<bh){bh=e.hp;best=e;}
      if(best){const x0=u.x,y0=u.y;u.x=Math.max(14,Math.min(ARENA.W-14,best.x+(u.side===0?18:-18)));u.y=best.y;u.tgt=best;u.rt=1;u.mult=ab.mult;u.cd=0;st.ev.push({k:'tp',x0,y0,u});}
      u.abT=ab.cd;break;}
    case 'meteor':if(u.tgt&&u.tgt.alive){st.zones.push({k:'meteor',x:u.tgt.x,y:u.tgt.y,r:ab.r,dmg:ab.dmg,delay:.7,age:0,side:u.side,src:u});u.abT=ab.cd;}else u.abT=.5;break;
    case 'solar':if(enemiesNear(st,u.side,u.x,u.y,ab.r*1.2).length){for(const e of enemiesNear(st,u.side,u.x,u.y,ab.r))dmgTo(st,u,e,ab.dmg,false,true);
        st.ev.push({k:'aoe',x:u.x,y:u.y,r:ab.r,c:'#ffd23f',big:true});u.abT=ab.cd;}else u.abT=.5;break;
    case 'void':if(u.tgt&&u.tgt.alive){st.zones.push({k:'void',x:u.tgt.x,y:u.tgt.y,r:ab.r,dps:ab.dps,dur:ab.dur,age:0,side:u.side,src:u});u.abT=ab.cd;}else u.abT=.5;break;
    default:u.abT=Infinity;}}
function separate(st){const C=26,cols=Math.ceil(ARENA.W/C)+1,rows=Math.ceil(ARENA.H/C)+1;
  if(!st.grid)st.grid=Array.from({length:cols*rows},()=>[]);const G=st.grid;for(const c of G)c.length=0;
  for(const u of st.units){if(!u.alive)continue;u._cx=Math.max(0,Math.min(cols-1,Math.floor(u.x/C)));u._cy=Math.max(0,Math.min(rows-1,Math.floor(u.y/C)));G[u._cx+u._cy*cols].push(u);}
  for(const u of st.units){if(!u.alive)continue;
    for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const x=u._cx+ox,y=u._cy+oy;if(x<0||y<0||x>=cols||y>=rows)continue;
      for(const v of G[x+y*cols]){if(v.uid<=u.uid||!v.alive)continue;const dx=v.x-u.x,dy=v.y-u.y,md=u.rad+v.rad,q=dx*dx+dy*dy;
        if(q<md*md){let d=Math.sqrt(q),nx,ny;if(d<.01){nx=(u.uid%2)?1:-1;ny=(v.uid%2)?.5:-.5;d=.01;}else{nx=dx/d;ny=dy/d;}
          const p=(md-d)*.5;u.x-=nx*p;u.y-=ny*p;v.x+=nx*p;v.y+=ny*p;}}}}
  for(const u of st.units){if(!u.alive)continue;u.x=Math.max(12,Math.min(ARENA.W-12,u.x));u.y=Math.max(26,Math.min(ARENA.H-12,u.y));}}
function stepBattle(st){if(st.done)return;const U=st.units;st.t+=DT;st.tick++;
  if(st.tick%10===1){for(const u of U)u.haste=false;
    for(const s of U){if(!s.alive||s.d.ab.k!=='drum')continue;const ab=s.d.ab,r2=ab.r*ab.r;
      for(const a of U)if(a.alive&&a.side===s.side&&d2(a,s)<=r2){a.haste=true;if(a.hp<a.max)a.hp=Math.min(a.max,a.hp+ab.amt);}
      st.ev.push({k:'pulse',u:s,r:ab.r});}}
  for(const u of U){if(!u.alive)continue;
    if(u.inv>0)u.inv-=DT;if(u.slow>0)u.slow-=DT;
    if(u.bleedT>0){u.bleedT-=DT;dmgTo(st,null,u,u.bleed*DT,false,false,u.bleedSide);if(!u.alive)continue;}
    if(u.stun>0){u.stun-=DT;continue;}
    u.cd-=DT;if(u.abT!==Infinity){u.abT-=DT;if(u.abT<=0)timedAbility(st,u);}
    const ab=u.d.ab,rate=1/(u.d.as*(u.haste?1.3:1));
    if(u.d.role==='healer'){const a=lowestAlly(st,u,260);
      if(a){if(d2(u,a)>u.d.range*u.d.range)moveToward(u,a.x,a.y,1);
        else if(u.cd<=0){u.cd=rate;st.proj.push({x:u.x,y:u.y,t:a,tx:a.x,ty:a.y,heal:true,amt:ab.amt,r:ab.r||0,spd:380,src:u,side:u.side,kind:'heal'});st.ev.push({k:'atk',u,t:a});}
        continue;}}
    u.rt-=DT;if(!u.tgt||!u.tgt.alive||u.rt<=0){u.tgt=findTarget(st,u);u.rt=.6;}
    const t=u.tgt;if(!t)continue;const rr=u.d.range+t.rad;
    if(d2(u,t)>rr*rr)moveToward(u,t.x,t.y,u.dash?3:1);
    else{u.dash=false;if(u.cd<=0){u.cd=rate;attack(st,u,t);}}}
  for(const p of st.proj){if(p.t.alive){p.tx=p.t.x;p.ty=p.t.y;}const dx=p.tx-p.x,dy=p.ty-p.y,d=Math.sqrt(dx*dx+dy*dy),step=p.spd*DT;
    if(d<=step+4){p.dead=true;
      if(p.heal){if(p.t.alive){healUnit(st,p.t,p.amt);if(p.r)for(const a of U)if(a!==p.t&&a.alive&&a.side===p.side&&d2(a,p.t)<=p.r*p.r)healUnit(st,a,p.amt);if(p.r)st.ev.push({k:'bloom',x:p.tx,y:p.ty,r:p.r});}}
      else hit(st,p.src,p.t,p.dmg,p.crit,p.tx,p.ty);}
    else{p.x+=dx/d*step;p.y+=dy/d*step;}}
  st.proj=st.proj.filter(p=>!p.dead);
  for(const z of st.zones){z.age+=DT;
    if(z.k==='meteor'){if(z.age>=z.delay&&!z.fired){z.fired=true;for(const e of enemiesNear(st,z.side,z.x,z.y,z.r))dmgTo(st,z.src,e,z.dmg,false,true);st.ev.push({k:'aoe',x:z.x,y:z.y,r:z.r,c:'#ffb23f',big:true});}
      if(z.age>=z.delay+.05)z.dead=true;}
    else if(z.k==='void'){for(const e of enemiesNear(st,z.side,z.x,z.y,z.r)){const dx=z.x-e.x,dy=z.y-e.y,d=Math.sqrt(dx*dx+dy*dy);if(d>6){e.x+=dx/d*70*DT;e.y+=dy/d*70*DT;}dmgTo(st,z.src,e,z.dps*DT,false,false);}
      if(z.age>=z.dur)z.dead=true;}}
  st.zones=st.zones.filter(z=>!z.dead);
  separate(st);
  let a0=0,a1=0;for(const u of U)if(u.alive){if(u.side===0)a0++;else a1++;}
  if(a0===0||a1===0||st.t>=MAXT){st.done=true;st.alive=[a0,a1];
    if(a0===0&&a1===0){st.reason='Mutual wipe — decided by total damage dealt';st.winner=st.dmg[0]>st.dmg[1]?0:st.dmg[1]>st.dmg[0]?1:-1;}
    else if(a1===0){st.winner=0;st.reason='Enemy army wiped out';}
    else if(a0===0){st.winner=1;st.reason='Enemy army wiped out';}
    else{const f=[0,1].map(s=>{let h=0,m=0;for(const u of U)if(u.side===s){m+=u.max;if(u.alive)h+=u.hp;}return m?h/m:0;});
      st.reason='Time up — decided by remaining army health';st.winner=f[0]>f[1]?0:f[1]>f[0]?1:-1;}
    if(st.winner<0)st.reason='Perfectly even — the round is a draw';}}
function battleResult(st){return {winner:st.winner,alive:st.alive,dmg:st.dmg.map(Math.round),ticks:st.tick,reason:st.reason};}
function resultHash(r){return r.winner+':'+r.alive.join(',')+':'+r.dmg.join(',')+':'+r.ticks;}
function runBattleHeadless(armies,seed){const st=createBattle(armies,seed);while(!st.done){stepBattle(st);st.ev.length=0;}return battleResult(st);}

/* ===================== GACHA ===================== */
const GACHA={cost1:100,cost10:900,soft:10,hard:50};
function rollRarity(rng){let x=rng()*100;for(const r of RORDER){x-=RARITY[r].w;if(x<0)return r;}return 'common';}
function gachaPull(save,n,rng=Math.random){const out=[];
  for(let i=0;i<n;i++){save.pity10++;save.pity50++;let rar=rollRarity(rng);
    if(save.pity50>=GACHA.hard&&RIDX[rar]<RIDX.legendary)rar=rng()<.8?'legendary':'mythic';
    else if(save.pity10>=GACHA.soft&&RIDX[rar]<RIDX.epic)rar='epic';
    if(RIDX[rar]>=RIDX.epic)save.pity10=0;if(RIDX[rar]>=RIDX.legendary)save.pity50=0;
    const pool=CHARS.filter(c=>c.rarity===rar);const c=pool[Math.floor(rng()*pool.length)];
    const isNew=!save.owned[c.id];let refund=0;
    if(isNew)save.owned[c.id]=1;else{save.owned[c.id]++;refund=RARITY[rar].refund;save.shards+=refund;}
    out.push({id:c.id,rarity:rar,isNew,refund});}
  return out;}

/* ===================== BOT AI ===================== */
const COUNTERS={warrior:{archer:1,mage:1,healer:1,support:.7},archer:{mage:1,healer:1,warrior:.4,support:.7},
  mage:{warrior:1,assassin:.8,tank:.35,archer:.4,support:.4},tank:{assassin:1.2,warrior:.6},
  assassin:{archer:1.2,mage:1.2,healer:1.4,support:1},healer:{warrior:.2,tank:.2},support:{}};
function roleCounts(army){const m={};for(const a of army){const r=CH[a.id].role;m[r]=(m[r]||0)+a.count;}return m;}
function eligiblePicks(coll,army){const have=new Set(army.map(a=>a.id));const c=coll.filter(id=>!have.has(id));return c.length?c:coll.slice();}
function botPick(diff,rng,coll,myArmy,oppArmy){const cands=eligiblePicks(coll,myArmy);
  if(diff==='easy')return cands[Math.floor(rng()*cands.length)];
  const opp=roleCounts(oppArmy),mine=roleCounts(myArmy);const total=Object.values(opp).reduce((a,b)=>a+b,0)||1;const myTotal=Object.values(mine).reduce((a,b)=>a+b,0);
  let best=cands[0],bs=-Infinity;
  for(const id of cands){const c=CH[id];let s=RIDX[c.rarity]*(diff==='hard'?3:2),counter=0;
    for(const r in opp)counter+=((COUNTERS[c.role]||{})[r]||0)*opp[r]/total*10;
    s+=counter*(diff==='hard'?1.2:1);
    if(diff==='hard'){const front=(mine.tank||0)+(mine.warrior||0),back=(mine.archer||0)+(mine.mage||0);
      if(c.role==='healer')s+=front>3?4:1;if(c.role==='support')s+=myTotal*.15;
      if((c.role==='tank'||c.role==='warrior')&&front<3)s+=6;if((c.role==='mage'||c.role==='archer')&&back<3)s+=4;
      if(c.role==='tank'&&back>5)s+=3;if(c.role==='mage'&&(opp.warrior||0)+(opp.tank||0)>8)s+=3;if(mine[c.role])s-=2;}
    else if(mine[c.role])s-=1.5;
    s+=rng()*(diff==='hard'?1:3);if(s>bs){bs=s;best=id;}}
  return best;}
function botStarters(diff,rng,coll){const shuffled=coll.slice().sort(()=>rng()-.5);
  if(diff==='easy')return shuffled.slice(0,2);
  const score=id=>RIDX[CH[id].rarity]*3+rng()*(diff==='hard'?1:3);
  if(diff==='hard'){const front=coll.filter(id=>['tank','warrior'].includes(CH[id].role)).sort((a,b)=>score(b)-score(a));
    const back=coll.filter(id=>['mage','archer','support'].includes(CH[id].role)).sort((a,b)=>score(b)-score(a));
    if(front.length&&back.length)return [front[0],back[0]];}
  return coll.slice().sort((a,b)=>score(b)-score(a)).slice(0,2);}
function botCollection(diff,rng){const by=r=>CHARS.filter(c=>c.rarity===r).map(c=>c.id);const take=(a,n)=>a.slice().sort(()=>rng()-.5).slice(0,n);
  if(diff==='easy')return [...by('common'),...take(by('uncommon'),2),...take(by('rare'),1)];
  if(diff==='medium')return [...by('common'),...by('uncommon'),...by('rare'),...take(by('epic'),2)];
  return [...by('common'),...by('uncommon'),...by('rare'),...by('epic'),...take(by('legendary'),2),...take(by('mythic'),1)];}
const BOTNAMES={easy:'Pebble',medium:'Clank',hard:'Grimbolt'};

/* ===================== MATCH PROTOCOL =====================
 Both players run this same state machine. Each publishes ONE state object (via a transport):
   {app,v,name,st:[2 starters],coll:[owned ids],r:round,c:commit,n:nonce,p:pick,
    lv:{r,ball,hits,earned:[ladder steps],done} (live arcade progress), a:arcadeRound,log:[[streaks],[..],[..]],
    d:roundDone,h:resultHash}
 Per round: commit = SHA256(nonce|pick) is published first, nonce+pick only after BOTH commits are seen,
 so nobody can see the other's pick or bias the shared random seed. seed = SHA256(nonce0|nonce1).
 Each player then plays their own arcade machine and publishes a log of streak lengths. The other side
 validates the log against the machine's limits and derives the exact fighters from it with the shared seed,
 so nobody can choose which fighter a rarity step gives. The battle is deterministic from the seed too, and
 each side publishes a result hash that the other checks. */
const BASE_FIGHTERS=2;
function validateRoster(o){if(!o||typeof o!=='object')return 'no state';
  if(!Array.isArray(o.coll)||o.coll.length<2||o.coll.length>40)return 'bad collection';
  if(new Set(o.coll).size!==o.coll.length||!o.coll.every(id=>CH[id]))return 'bad collection';
  if(!Array.isArray(o.st)||o.st.length!==2||o.st[0]===o.st[1]||!o.st.every(id=>o.coll.includes(id)))return 'bad starters';
  return null;}
function validatePick(coll,army,id){if(!CH[id]||!coll.includes(id))return 'not owned';if(!eligiblePicks(coll,army).includes(id))return 'already in army';return null;}
function addToArmy(army,id,n){const e=army.find(a=>a.id===id);if(e)e.count+=n;else army.push({id,count:n});}
const clone=x=>JSON.parse(JSON.stringify(x));
const commitHash=(r,n,p)=>sha('c|'+r+'|'+n+'|'+(p||''));
class Match{
  constructor(o){Object.assign(this,{t:o.transport,side:o.side,me:o.me,headless:!!o.headless,ai:o.ai||null,onEvent:o.onEvent||(()=>{})});
    this.round=0;this.score=[0,0];this.army=[[],[]];this.armyBefore=[[],[]];this.phase='waiting';this.lastLoser=-1;this.history=[];this.oppInfo=null;this.busy=false;this.timers=[];}
  emit(){try{this.onEvent(this);}catch(e){console.error(e);}}
  start(){this.t.onChange(()=>this.pump());
    this.t.setMine({app:'pegfall',v:2,name:this.me.name,st:this.me.st,coll:this.me.coll,r:0,c:null,n:null,p:null,lv:null,a:0,log:null,d:0,h:null});this.emit();this.pump();}
  stop(){this.timers.forEach(clearTimeout);this.timers=[];}
  later(f,ms){this.timers.push(setTimeout(f,ms));}
  get opp(){return this.t.getOpp();}
  get oppSide(){return 1-this.side;}
  async pump(){if(this.busy){this.again=true;return;}this.busy=true;
    try{do{this.again=false;await this._pump();}while(this.again);}catch(e){console.error(e);}finally{this.busy=false;}}
  async _pump(){const o=this.opp;if(!o||this.phase==='over')return;
    if(this.phase==='waiting'){if(o.st&&o.coll){const e=validateRoster(o);if(e)return this.abort('Your opponent sent an invalid roster ('+e+').',this.side);
      this.oppInfo={name:String(o.name||'Opponent').slice(0,24),st:o.st.slice(),coll:o.coll.slice()};await this.beginRound(1);}return;}
    if(this.phase==='commit'&&o.r===this.round&&o.c){this.phase='reveal';this.t.setMine({n:this.nonce,p:this.pick});this.emit();}
    if(this.phase==='reveal'&&o.r===this.round&&o.n){await this.resolve(o);return;}
    if(this.phase==='arcadeWait'&&o.a===this.round&&o.log){this.collect(o.log);return;}
    if(this.phase==='waitNext'&&o.d>=this.round){if(o.d===this.round&&o.h&&o.h!==this.myHash)this.desync=true;await this.beginRound(this.round+1);}}
  async beginRound(r){this.round=r;this.pick=null;
    if(r===1){await this.commit(null);return;}
    this.phase='pick';this.emit();
    if(this.headless&&this.ai){const id=botPick(this.ai.diff,this.ai.rng,this.me.coll,this.army[this.side],this.army[this.oppSide]);
      this.later(()=>this.choosePick(id),this.ai.fast?0:700+this.ai.rng()*1400);}}
  canPick(id){return !validatePick(this.me.coll,this.army[this.side],id);}
  async choosePick(id){if(this.phase!=='pick'||!this.canPick(id))return false;this.phase='locking';await this.commit(id);return true;}
  async commit(pick){this.pick=pick;this.nonce=randHex(16);const c=await commitHash(this.round,this.nonce,pick);
    this.t.setMine({r:this.round,c,n:null,p:null});this.phase='commit';this.emit();this.pump();}
  async resolve(o){const r=this.round;
    if(await commitHash(r,o.n,o.p)!==o.c)return this.abort('Your opponent\'s reveal did not match their commitment.',this.side);
    if(r>1){const e=validatePick(this.oppInfo.coll,this.army[this.oppSide],o.p);if(e)return this.abort('Your opponent made an illegal pick ('+e+').',this.side);}
    const nonces=[],picks=[];nonces[this.side]=this.nonce;nonces[this.oppSide]=String(o.n);picks[this.side]=this.pick;picks[this.oppSide]=o.p||null;
    this.seed=await sha('seed|'+r+'|'+nonces[0]+'|'+nonces[1]);this.newTypes=[[],[]];this.pools=[];
    for(const s of [0,1]){const info=s===this.side?this.me:this.oppInfo;let types;
      if(r===1){const pool=info.coll.filter(id=>!info.st.includes(id)).sort();const rr=makeRng(this.seed+'|rand|'+s);types=[info.st[0],info.st[1],pool.length?pool[Math.floor(rr()*pool.length)]:info.st[0]];}
      else types=[picks[s]];
      this.armyBefore[s]=clone(this.army[s]);types.forEach(id=>addToArmy(this.army[s],id,BASE_FIGHTERS));this.newTypes[s]=types;
      this.pools[s]=rewardPools(info.coll,this.army[s].map(a=>a.id));}
    this.picker=makePicker(this.seed,this.side,this.pools[this.side]);
    this.phase='arcade';this.emit();if(this.headless)this.runBotArcade();}
  // live progress for the opponent's screen; never trusted for rewards
  setLive(lv){this.t.setMine({lv:Object.assign({r:this.round},lv)});}
  arcadeDone(log){if(this.phase!=='arcade')return;const e=validateLog(log);if(e){console.error('own log invalid',e);return;}
    this.myLog=clone(log);this.t.setMine({a:this.round,log:this.myLog});this.phase='arcadeWait';this.emit();this.pump();}
  collect(oppLog){const e=validateLog(oppLog);if(e)return this.abort('Your opponent\'s machine results were impossible ('+e+').',this.side);
    const logs=[];logs[this.side]=this.myLog;logs[this.oppSide]=oppLog;this.logs=logs;this.rewards=[[],[]];
    for(const s of [0,1]){this.rewards[s]=rewardsFromLog(this.seed,s,this.pools[s],logs[s]);for(const w of this.rewards[s])addToArmy(this.army[s],w.id,1);}
    this.phase='muster';this.emit();if(this.headless)this.toBattle();}
  toBattle(){if(this.phase!=='muster')return;this.phase='battle';this.battleArmies=clone(this.army);this.emit();
    if(this.headless)this.later(()=>this.battleDone(runBattleHeadless(this.battleArmies,this.seed)),this.ai&&this.ai.fast?0:20);}
  runBotArcade(){const plan=botArcadePlan(this.ai.diff,this.ai.rng),fast=this.ai.fast,earned=[];
    this.setLive({ball:1,hits:0,earned:[]});
    for(const ev of plan.events){this.later(()=>{if(this.phase!=='arcade')return;
        if(ev.type==='hit')earned.push(ev.hits-1);
        const ball=ev.type==='end'?Math.min(3,ev.ball+2):ev.ball+1;
        this.setLive({ball,hits:ev.type==='hit'&&ev.hits<6?ev.hits:0,earned:earned.slice()});},fast?0:ev.t*1000);}
    const end=plan.events.length?plan.events[plan.events.length-1].t:0;
    this.later(()=>{this.setLive({ball:3,hits:0,earned:earned.slice(),done:true});this.arcadeDone(plan.log);},fast?0:end*1000+400);}
  battleDone(res){if(this.phase!=='battle')return;this.result=res;const w=res.winner;
    if(w>=0){this.score[w]++;this.lastLoser=1-w;}else this.lastLoser=-1;
    this.history.push({round:this.round,winner:w});this.myHash=resultHash(res);this.phase='roundOver';this.emit();if(this.headless)this.ready();}
  get winnerSide(){if(this.forfeit)return this.forfeit.winner;return this.score[0]>=3?0:this.score[1]>=3?1:-1;}
  ready(){if(this.phase!=='roundOver')return;this.t.setMine({d:this.round,h:this.myHash});
    if(Math.max(...this.score)>=3){this.phase='over';this.stop();this.emit();return;}
    this.phase='waitNext';this.emit();this.pump();}
  abort(msg,winner){if(this.phase==='over')return;this.forfeit={msg,winner};this.phase='over';this.stop();this.emit();}
}
function makeLoopback(){const a={state:{},cbs:[]},b={state:{},cbs:[]};
  const mk=(me,other)=>({setMine(p){Object.assign(me.state,p);setTimeout(()=>other.cbs.forEach(f=>f()),30);},
    getOpp(){return other.state.app?clone(other.state):null;},onChange(f){me.cbs.push(f);},close(){me.cbs.length=0;}});
  return [mk(a,b),mk(b,a)];}
