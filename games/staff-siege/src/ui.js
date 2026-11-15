/* ================= UI HELPERS ================= */
const hc={};
function setT(id,v){if(hc[id]!==v){hc[id]=v;const e=document.getElementById(id);if(e)e.textContent=v}}
function setW(id,f){const v=(Math.max(0,Math.min(1,f))*100).toFixed(1)+'%';if(hc[id+'w']!==v){hc[id+'w']=v;const e=document.getElementById(id);if(e)e.style.width=v}}
function announce(big,small,col,local){if(!local)netEv(['A',big,small||'',col||'#3dffa6']);const a=$('#ann');$('#annB').textContent=big;$('#annS').textContent=small||'';a.style.setProperty('--ac',col||'#3dffa6');a.classList.remove('go');void a.offsetWidth;a.classList.add('go')}
function toast(t,kind){const e=document.createElement('div');e.className='toast '+(kind||'');e.textContent=t;const box=$('#toasts');box.appendChild(e);while(box.children.length>4)box.firstChild.remove();setTimeout(()=>e.remove(),2800)}
function bossIntroUI(z){const e=$('#bossIntro');if(!z){e.classList.remove('on');return}e.style.setProperty('--b2',z.bdef.c2);$('#biW').textContent='WAVE '+G.wave+' · BOSS';$('#biN').textContent=z.name;$('#biT').textContent=z.bdef.title;e.classList.remove('on');void e.offsetWidth;e.classList.add('on')}
let wiping=false;
function transition(fn){if(wiping){fn();return}wiping=true;const w=$('#wipe');w.classList.remove('go');void w.offsetWidth;w.classList.add('go');setTimeout(()=>{try{fn()}finally{}},420);setTimeout(()=>{w.classList.remove('go');wiping=false},950)}
function showScreen(n){$('#ann').classList.remove('go');$('#bossIntro').classList.remove('on');$('#lobby').classList.toggle('on',n==='lobby');$('#game').classList.toggle('on',n==='game');if(n==='lobby'){const wasNet=G.net;G.state='lobby';G.paused=false;G.net=null;MUS.mode='lobby';resetWorld();PLAYERS=[];resize();renderLobby();if(wasNet&&NET.inRoom())setTimeout(()=>openPanel('mp'),60)}renderHudStatic()}
const rarName=r=>r===6?`<span class="sec-t">${RAR[r].n}</span>`:`<span style="color:${RAR[r].c}">${RAR[r].n}</span>`;
const inLobby=()=>G.state==='lobby';
const lobbyOnly=()=>{if(inLobby())return true;toast('Dit kan alleen in de lobby');sfx('no');return false};

/* ================= ART (SVG) ================= */
const HEAD={
 bolt:c=>`<circle cx="44" cy="14" r="9" fill="${c}"/>`,
 spam:c=>`<circle cx="40" cy="12" r="5" fill="${c}"/><circle cx="50" cy="10" r="4" fill="${c}"/><circle cx="47" cy="20" r="4" fill="${c}"/>`,
 laser:c=>`<path d="M44 3l8 11-8 11-8-11z" fill="${c}"/>`,beam:c=>`<path d="M44 3l8 11-8 11-8-11z" fill="${c}"/><path d="M44 14L58 4" stroke="${c}" stroke-width="3"/>`,
 sniper:c=>`<circle cx="44" cy="14" r="9" fill="none" stroke="${c}" stroke-width="3"/><path d="M44 2v24M32 14h24" stroke="${c}" stroke-width="2"/>`,
 lightning:c=>`<path d="M46 2 36 16h7l-4 12 11-15h-7z" fill="${c}"/>`,
 ice:c=>`<path d="M44 3v22M34 8l20 12M54 8 34 20" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`,
 void:c=>`<circle cx="44" cy="14" r="10" fill="#000" stroke="${c}" stroke-width="3"/>`,
 explosion:c=>`<path d="M44 2l3 7 7-2-3 7 6 4-7 2 1 7-7-4-5 5-1-7-7-1 5-5-4-6 7 1z" fill="${c}"/>`,
 meteor:c=>`<circle cx="46" cy="12" r="8" fill="${c}"/><path d="M40 18 30 28M44 20l-6 8M38 14l-8 6" stroke="#ffd27a" stroke-width="2.5" stroke-linecap="round"/>`,
 flame:c=>`<path d="M44 2c6 6 9 10 9 15a9 9 0 0 1-18 0c0-4 3-6 4-9 1 3 3 4 3 4s-1-6 2-10z" fill="${c}"/><path d="M44 12c3 3 4 5 4 7a4 4 0 0 1-8 0c0-2 2-4 4-7z" fill="#ffef9a"/>`,
 crystal:c=>`<path d="M44 1l8 10-8 16-8-16z" fill="${c}"/><path d="M44 1l3 10h-6z" fill="#fff" opacity=".6"/>`,
 boomerang:c=>`<path d="M36 8q10-8 18 2-8-2-12 8z" fill="${c}"/>`,
 poison:c=>`<rect x="41" y="1" width="6" height="6" fill="#1f2937"/><circle cx="44" cy="15" r="9" fill="${c}"/><circle cx="41" cy="12" r="2" fill="#ecfccb"/>`,
 blood:c=>`<path d="M44 2q10 13 0 22-10-9 0-22z" fill="${c}"/>`,
 rocket:c=>`<path d="M44 1l5 7v12h-10V8z" fill="#e5e7eb"/><path d="M39 14l-4 6h4zM49 14l4 6h-4z" fill="${c}"/><path d="M41 21h6l-3 6z" fill="#ffb347"/>`,
 sound:c=>`<circle cx="44" cy="14" r="3" fill="${c}"/><circle cx="44" cy="14" r="7" fill="none" stroke="${c}" stroke-width="2"/><circle cx="44" cy="14" r="11" fill="none" stroke="${c}" stroke-width="2" opacity=".6"/>`,
 plasma:c=>`<circle cx="44" cy="14" r="8" fill="${c}"/><ellipse cx="44" cy="14" rx="13" ry="4" fill="none" stroke="#fff" stroke-width="1.5" transform="rotate(-25 44 14)"/>`,
 shadow:c=>`<circle cx="44" cy="14" r="10" fill="${c}"/><circle cx="48" cy="11" r="8" fill="#0b0614"/>`,
 quake:c=>`<path d="M35 18l4-12 11-1 5 11-9 9z" fill="#8a6a45"/><path d="M41 9l4 5-2 6" stroke="${c}" stroke-width="2" fill="none"/>`,
 time:c=>`<path d="M37 3h14L37 25h14z" fill="none" stroke="${c}" stroke-width="2.5"/><path d="M40 22h8l-4-5z" fill="${c}"/>`,
 drone:c=>`<rect x="38" y="11" width="12" height="7" rx="2" fill="#64748b"/><circle cx="35" cy="9" r="3.5" fill="${c}"/><circle cx="53" cy="9" r="3.5" fill="${c}"/><circle cx="35" cy="20" r="3.5" fill="${c}"/><circle cx="53" cy="20" r="3.5" fill="${c}"/>`,
 tornado:c=>`<path d="M33 5h22M35 10h18M38 15h12M40 20h8M42 25h4" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`,
 portal:c=>`<ellipse cx="44" cy="14" rx="7" ry="12" fill="rgba(56,189,248,.3)" stroke="${c}" stroke-width="3"/>`,
 soul:c=>`<path d="M36 14a8 8 0 0 1 16 0v11l-3-3-2.5 3-2.5-3-2.5 3-2.5-3-3 3z" fill="${c}"/><circle cx="41" cy="14" r="1.6" fill="#0b2015"/><circle cx="47" cy="14" r="1.6" fill="#0b2015"/>`,
 nuke:c=>`<circle cx="44" cy="14" r="11" fill="#1a2e05"/><path d="M44 14 44 4a10 10 0 0 1 8.7 5zM44 14 35.3 9A10 10 0 0 1 44 4zM44 14l8.7 5a10 10 0 0 1-17.4 0z" fill="${c}" opacity=".95"/><circle cx="44" cy="14" r="2.5" fill="#1a2e05"/>`,
 galaxy:c=>`<circle cx="44" cy="14" r="11" fill="#1e1b4b"/><path d="M44 14c-6-2-6-9 0-9s8 6 4 10-11 2-10-4" fill="none" stroke="${c}" stroke-width="2"/><circle cx="44" cy="14" r="2" fill="#fff"/>`,
 rainbow:c=>`<path d="M33 18a11 11 0 0 1 22 0" fill="none" stroke="#f87171" stroke-width="3"/><path d="M36 18a8 8 0 0 1 16 0" fill="none" stroke="#fbbf24" stroke-width="3"/><path d="M39 18a5 5 0 0 1 10 0" fill="none" stroke="#4ade80" stroke-width="3"/><path d="M42 18a2 2 0 0 1 4 0" fill="none" stroke="#60a5fa" stroke-width="3"/>`,
};
function staffArt(s){
 const c=s.col,rc=RAR[s.r].c;const head=s.burger?`<g transform="translate(32 3)"><use href="#i-burger" width="24" height="24"/></g>`:(HEAD[s.type]||HEAD.bolt)(c);
 return `<svg viewBox="0 0 60 60" class="art"><circle cx="44" cy="14" r="16" fill="${c}" opacity=".16"/><line x1="12" y1="54" x2="38" y2="20" stroke="#6b4226" stroke-width="5" stroke-linecap="round"/><line x1="12" y1="54" x2="38" y2="20" stroke="#8a5a3b" stroke-width="1.5" stroke-linecap="round"/><line x1="32" y1="27" x2="37" y2="21" stroke="${rc}" stroke-width="5" stroke-linecap="round"/>${head}</svg>`;
}
const GLY={ring:'<circle cx="30" cy="30" r="9" fill="none" stroke="#fff" stroke-width="3"/>',orbit:'<circle cx="30" cy="30" r="5" fill="#fff"/><circle cx="20" cy="24" r="3" fill="#fff"/><circle cx="40" cy="24" r="3" fill="#fff"/><circle cx="30" cy="40" r="3" fill="#fff"/>',
 hex:'<path d="M30 19l10 6v11l-10 6-10-6V25z" fill="none" stroke="#fff" stroke-width="3"/>',scope:'<circle cx="30" cy="30" r="9" fill="none" stroke="#fff" stroke-width="3"/><path d="M30 16v28M16 30h28" stroke="#fff" stroke-width="2"/>',
 gear:'<circle cx="30" cy="30" r="7" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="4 3"/>',skull:'<circle cx="30" cy="28" r="9" fill="#fff"/><circle cx="26.5" cy="28" r="2.6" fill="#111"/><circle cx="33.5" cy="28" r="2.6" fill="#111"/><rect x="26" y="35" width="8" height="5" fill="#fff"/>',
 holy:'<path d="M30 17v26M21 25h18" stroke="#fff" stroke-width="4" stroke-linecap="round"/>',clock:'<circle cx="30" cy="30" r="10" fill="none" stroke="#fff" stroke-width="3"/><path d="M30 23v7l5 3" stroke="#fff" stroke-width="3" fill="none"/>',
 burger:'<g transform="translate(18 18)"><use href="#i-burger" width="24" height="24"/></g>',flame:'<path d="M30 17c6 6 8 10 8 14a8 8 0 0 1-16 0c0-4 3-6 4-9 1 3 3 4 3 4s-1-5 1-9z" fill="#fff"/>',
 frost:'<path d="M30 18v24M20 24l20 12M40 24 20 36" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',rage:'<path d="M20 38l6-18 4 10 4-10 6 18" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>',
 leaf:'<path d="M20 40c0-14 8-22 20-22 0 12-8 22-20 22zM20 40l12-12" fill="#fff" stroke="#fff"/>',paw:'<circle cx="30" cy="33" r="6" fill="#fff"/><circle cx="22" cy="25" r="3" fill="#fff"/><circle cx="28" cy="21" r="3" fill="#fff"/><circle cx="34" cy="21" r="3" fill="#fff"/><circle cx="39" cy="25" r="3" fill="#fff"/>',
 bat:'<path d="M18 26l6 2 3-4 3 3 3-3 3 4 6-2-4 10-4-3-4 4-4-4-4 3z" fill="#fff"/>',storm:'<path d="M32 16 22 31h7l-3 13 12-17h-7z" fill="#fff"/>',code:'<text x="30" y="35" text-anchor="middle" font-family="monospace" font-weight="700" font-size="13" fill="#fff">&lt;/&gt;</text>',
 banner:'<path d="M22 16v28M22 17h16l-4 6 4 6H22" fill="#fff" stroke="#fff" stroke-width="2"/>',dice:'<rect x="20" y="20" width="20" height="20" rx="4" fill="#fff"/><circle cx="25" cy="25" r="2" fill="#111"/><circle cx="30" cy="30" r="2" fill="#111"/><circle cx="35" cy="35" r="2" fill="#111"/>',
 rift:'<ellipse cx="30" cy="30" rx="12" ry="5" fill="none" stroke="#fff" stroke-width="2.5"/><ellipse cx="30" cy="30" rx="5" ry="12" fill="none" stroke="#fff" stroke-width="2.5"/>'};
function classArt(c){return `<svg viewBox="0 0 60 60" class="art"><path d="M30 4 52 12v16c0 13-9 22-22 28C17 50 8 41 8 28V12z" fill="${c.col}" opacity=".92"/><path d="M30 4 52 12v16c0 13-9 22-22 28C17 50 8 41 8 28V12z" fill="none" stroke="${RAR[c.r].c}" stroke-width="2.5"/>${GLY[c.aura]||''}</svg>`}

/* ================= LOBBY ================= */
function dailyState(){const t=today(),y=new Date(Date.now()-864e5),ys=y.getFullYear()+'-'+String(y.getMonth()+1).padStart(2,'0')+'-'+String(y.getDate()).padStart(2,'0');
 const can=S.daily.last!==t,next=can?(S.daily.last===ys?S.daily.streak+1:1):S.daily.streak;return{can,next,idx:(Math.max(1,next)-1)%7}}
function claimable(){const a=ACH.filter(x=>S.ach[x.id]&&!S.ach[x.id].claimed).length;const own=Object.keys(S.staffs).length+Object.keys(S.classes).length;const c=COLL.filter(([n])=>own>=n&&!S.coll[n]).length;return a+c}
function synAvail(s){return !!S.classes[s.cl]&&STAFFS.some(st=>S.staffs[st.id]&&(s.st.id?s.st.id===st.id:s.st.type===st.type))}
function renderLobby(){
 const st=STAFF[S.eqStaff],cl=CLS[S.eqClass],k=kit();
 setT('lvN',S.lvl);setT('lvT','Level '+S.lvl+' · '+fmt(S.xp)+' / '+fmt(xpNeed(S.lvl))+' XP');setW('xpF',S.xp/xpNeed(S.lvl));
 setT('lBur',fmt(S.burgers));setT('lTix',S.tickets);
 const ds=dailyState();$('#dailyB').classList.toggle('has',ds.can);
 const os=Object.keys(S.staffs).length,oc=Object.keys(S.classes).length;
 setT('sStaff',`${os} / ${STAFFS.length} verzameld`);setW('sStaffB',os/STAFFS.length);
 setT('sClass',`${oc} / ${CLASSES.length} verzameld`);setW('sClassB',oc/CLASSES.length);
 const disc=Object.keys(S.st.synUsed).length,av=SYN.filter(synAvail).length;
 setT('sSyn',`${disc} / ${SYN.length} ontdekt · ${av} beschikbaar`);setW('sSynB',disc/SYN.length);
 setT('sGacha',`100 burgers per summon · ${S.tickets} ticket${S.tickets===1?'':'s'}`);
 const ul=Object.values(S.upg).reduce((a,b)=>a+b,0),um=UPGRADES.reduce((a,u)=>a+u.max,0);setT('sUpg',`${ul} / ${um} levels gekocht`);
 const ad=ACH.filter(a=>S.ach[a.id]).length;setT('sStats',`Beste wave ${S.best} · ${ad}/${ACH.length} achievements`);
 $('#nbS').parentElement.classList.toggle('has',Object.values(S.staffs).some(o=>o.new));
 $('#nbC').parentElement.classList.toggle('has',Object.values(S.classes).some(o=>o.new));
 $('#nbG').parentElement.classList.toggle('has',S.tickets>0);
 const cn=claimable();$('#nbA').textContent=cn;$('#nbA').parentElement.classList.toggle('has',cn>0);
 $('#lEqS').innerHTML=`${staffArt(st)}<div><small>Staff · ${TYPES[st.type].nl} · ${st.role}</small><b style="color:${RAR[st.r].c}">${st.name}</b><small>Lv ${k.sl} · Mastery ${k.sMast} · ${fmt(k.dmg*k.rate*(st.beams||1))} DPS</small></div>`;
 $('#lEqC').innerHTML=`${classArt(cl)}<div><small>Class · ${cl.style}</small><b style="color:${RAR[cl.r].c}">${cl.name}</b><small>Lv ${k.cLv} · Mastery ${k.cMast} · ${k.maxhp} HP</small></div>`;
 $('#lSyn').innerHTML=k.syn.length?k.syn.map(s=>`<span class="chip">⚡ ${s.n}: ${s.d}</span>`).join(''):`<span class="chip off">Geen synergie met deze combinatie — bekijk Synergieën</span>`;
 const r=S.run,cp=r.checkpoint||1;let h='',p='';
 if(r.active&&r.wave>1&&STAFF[r.staff]&&CLS[r.cls]){h+=`<button class="big gold" data-start="${r.wave}" data-resume="1">Hervat · wave ${r.wave}</button>`;p=`Onderbroken potje met ${STAFF[r.staff].name} + ${CLS[r.cls].name} (loadout blijft vast).`}
 if(cp>1)h+=`<button class="big alt" data-start="${cp}">Checkpoint · wave ${cp}</button>`;
 h+=`<button class="big startbig" data-start="1"><svg class="ic" style="width:20px;height:20px;vertical-align:-4px"><use href="#i-play"/></svg> START</button>`;
 if(NET.inRoom()){h=`<button class="big hot startbig" data-go="mp">Co-op kamer ${NET.code}</button>`;p=NET.role==='host'?'Jij bent de host. Open de kamer om het potje te starten.':'Je zit in de kamer van een vriend. De host start het potje.'}
 $('#runBtns').innerHTML=h;
 setT('runH',NET.inRoom()?'Co-op':r.active&&r.wave>1?'Potje onderbroken':'Klaar voor de strijd?');
 setT('sMp',NET.inRoom()?'Kamer '+NET.code+' · '+NET.roster.length+'/'+MAXP+' spelers':'Speel samen met max. 4 spelers');$('#nbM').parentElement.classList.toggle('has',NET.inRoom());
 $('#runP').textContent=p||`Je start met ${st.name} + ${cl.name}. Tijdens het potje ligt je loadout vast.`;
}

/* ================= COLLECTIE ================= */
const COL={tab:'staff',sel:null,fil:-1};
function renderColl(){
 $$('#collTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===COL.tab));
 const isS=COL.tab==='staff',all=isS?STAFFS:CLASSES,own=isS?S.staffs:S.classes,eq=isS?S.eqStaff:S.eqClass;
 $('#collH').textContent=isS?'Staff Collectie':'Class Collectie';
 const list=all.filter(i=>COL.fil<0||i.r===COL.fil).slice().sort((a,b)=>b.r-a.r||(own[b.id]?1:0)-(own[a.id]?1:0));
 if(!COL.sel||!all.find(i=>i.id===COL.sel))COL.sel=eq;
 const n=all.filter(i=>own[i.id]).length;
 $('#collSub').textContent=`${n} van ${all.length} verzameld · NEW = nog niet bekeken · S = synergie met je huidige ${isS?'class':'staff'}`;
 $('#collFil').innerHTML=`<button data-fil="-1" class="${COL.fil<0?'on':''}">Alle</button>`+RAR.map((r,i)=>{const t=all.filter(x=>x.r===i).length,o=all.filter(x=>x.r===i&&own[x.id]).length;return `<button data-fil="${i}" style="--rc:${r.c}" class="${COL.fil===i?'on':''}">${rarName(i)} ${o}/${t}</button>`}).join('');
 const other=isS?CLS[S.eqClass]:STAFF[S.eqStaff];
 $('#collGrid').innerHTML=list.map(it=>{const o=own[it.id],sy=isS?synFor(it,other).length:synFor(other,it).length;
  return `<button class="card r${it.r} ${o?'':'lock'} ${it.id===COL.sel?'sel':''}" data-id="${it.id}" style="--rc:${RAR[it.r].c}">${o&&o.new?'<i class="tag new">NEW</i>':''}${it.id===eq?'<i class="tag eqd">E</i>':''}${sy&&o?'<i class="tag syn">S</i>':''}${isS?staffArt(it):classArt(it)}<b>${o?it.name:'???'}</b><small>${rarName(it.r)}</small>${o?`<span class="stars">${Array.from({length:10},(_,i)=>`<i class="${i<o.lvl?'f':''}"></i>`).join('')}</span>`:''}</button>`}).join('');
 renderDet();
}
function cmpRow(label,a,b,f,suf){const d=b-a,cls=Math.abs(d)<1e-6?'':d>0?'up':'dn';return `<div class="st"><span>${label}</span><b>${f(b)}${suf||''}${cls&&a!=null?` <span class="${cls}">${d>0?'▲':'▼'}</span>`:''}</b></div>`}
function renderDet(){
 const isS=COL.tab==='staff',it=(isS?STAFF:CLS)[COL.sel],own=isS?S.staffs:S.classes,o=own[it.id],eq=isS?S.eqStaff:S.eqClass;
 if(o&&o.new){o.new=false;saveSoon();const t=$(`#collGrid [data-id="${it.id}"] .tag.new`);if(t)t.remove()}
 const cur=kit(),nk=isS?kit(it.id,S.eqClass):kit(S.eqStaff,it.id);const same=it.id===eq;
 const f1=v=>v.toFixed(1),f2=v=>v.toFixed(2),fp=v=>Math.round(v*100)+'%',fi=v=>fmt(v);
 let rows='';
 if(o){
  if(isS){const sp=it.sp||TYPES[it.type].sp;
   rows=cmpRow('DPS (met jouw class)',same?null:cur.power,nk.power,fi)+cmpRow('Damage per treffer',same?null:cur.dmg,nk.dmg,f1)+cmpRow('Attack speed',same?null:cur.rate,nk.rate,f2,'/s')+
    `<div class="st"><span>Type · rol</span><b>${TYPES[it.type].nl} · ${it.role}</b></div><div class="st"><span>Special (Spatie)</span><b>${sp.n} · ${sp.cd}s</b></div><p style="margin:8px 0 0">${sp.d}.</p>`}
  else rows=cmpRow('Health',same?null:cur.maxhp,nk.maxhp,fi)+cmpRow('Damage (met jouw staff)',same?null:cur.dmg,nk.dmg,f1)+cmpRow('Attack speed',same?null:cur.rate,nk.rate,f2,'/s')+cmpRow('Crit',same?null:cur.crit,nk.crit,fp)+cmpRow('Crit damage',same?null:cur.critM,nk.critM,f1,'x')+
   (it.armor?`<div class="st"><span>Damage-reductie</span><b>${fp(it.armor)}</b></div>`:'')+(it.boss>1?`<div class="st"><span>Boss damage</span><b>x${it.boss}</b></div>`:'')+(it.dodge?`<div class="st"><span>Ontwijken</span><b>${fp(it.dodge)}</b></div>`:'')+
   `<div class="st"><span>Speelstijl</span><b>${it.style}</b></div><div class="st"><span>Ability (E)</span><b>${it.ab.n} · ${it.ab.cd}s</b></div><p style="margin:8px 0 0">${it.ab.d}. <b style="color:var(--ink)">Passief:</b> ${it.pas}.</p>`;
 }
 const ms=o?`<div class="mbar"><small><span>Mastery ${o.m}/10 (+${isS?3*o.m+'% damage':2*o.m+'% HP en damage'})</span><span>${o.m>=10?'MAX':fmt(o.mx)+' / '+fmt(mastNeed(o.m))}</span></small><div class="bar"><i style="width:${o.m>=10?100:o.mx/mastNeed(o.m)*100}%"></i></div></div>`:'';
 const syns=SYN.filter(s=>isS?(s.st.id?s.st.id===it.id:s.st.type===it.type):s.cl===it.id);
 const sl=syns.length?`<div class="sub" style="margin-top:12px">Synergieën</div><div class="slist">${syns.map(s=>{const act=cur.syn.includes(s)&&(isS?it.id===S.eqStaff:it.id===S.eqClass)||(isS?synFor(it,CLS[S.eqClass]):synFor(STAFF[S.eqStaff],it)).includes(s);const partner=isS?CLS[s.cl].name:(s.st.id?STAFF[s.st.id].name:'elke '+TYPES[s.st.type].nl+'-staf');return `<div class="si ${act?'act':synAvail(s)?'':'lk'}"><b>${s.n}</b> + ${partner}<small>${s.d}</small></div>`}).join('')}</div>`:'';
 const chance=(RAR[it.r].w/(isS?STAFFS:CLASSES).filter(x=>x.r===it.r).length);
 const eqBtn=o?(same?'<button class="big alt" disabled>Uitgerust</button>':inLobby()?`<button class="big" id="equipB">Equip</button>`:'<button class="big alt" disabled>Alleen in de lobby</button>'):`<button class="big gold" id="toGacha">Naar ${isS?'Staff':'Class'} Gacha · ${chance<1?chance.toFixed(2):chance.toFixed(1)}%</button>`;
 $('#collDet').style.setProperty('--rc',RAR[it.r].c);
 $('#collDet').innerHTML=`${isS?staffArt(it):classArt(it)}<h3>${o?it.name:'???'}</h3><div class="rr">${rarName(it.r)}${o?' · Lv '+o.lvl+'/10 · '+(o.n-1)+' dupes':''}</div><p>${o?(it.desc||''):'Nog niet in bezit. Trek hem in de gacha.'}</p>${ms}${rows}${sl}${eqBtn}`;
 const eb=$('#equipB');if(eb)eb.onclick=()=>{if(!lobbyOnly())return;if(isS)S.eqStaff=it.id;else S.eqClass=it.id;save();sfx('build');renderColl();renderLobby();toast(it.name+' uitgerust')};
 const tg=$('#toGacha');if(tg)tg.onclick=()=>{closeOv('coll');openGacha(isS?'staff':'class')};
}

/* ================= SYNERGIEËN ================= */
const SYT={f:'all'};
function renderSyn(){
 $$('#synTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===SYT.f));
 const cur=kit();
 const list=SYN.filter(s=>SYT.f==='all'||(SYT.f==='own'?synAvail(s):!synAvail(s)));
 $('#synGrid').innerHTML=list.map(s=>{const act=cur.syn.includes(s),av=synAvail(s),disc=S.st.synUsed[s.id];
  const sa=s.st.id?staffArt(STAFF[s.st.id]):staffArt({type:s.st.type,col:'#cbd5e1',r:0}),ca=classArt(CLS[s.cl]);
  const sn=s.st.id?STAFF[s.st.id].name:'Elke '+TYPES[s.st.type].nl+'-staf';
  return `<div class="sy ${act?'act':av?'own':'lk'}"><div class="pr">${sa}<i>+</i>${ca}</div><div><b>${s.n}</b><small>${sn} + ${CLS[s.cl].name}</small><small style="color:var(--ink)">${s.d}</small><em style="color:${act?'var(--gold)':disc?'var(--acc)':'var(--mut)'}">${act?'ACTIEF':disc?'Ontdekt':av?'Beschikbaar':'Vergrendeld'}</em></div></div>`}).join('')||'<p class="sub">Niets in deze lijst.</p>';
}

/* ================= GACHA ================= */
const GA={tab:'staff'};
function openGacha(t){if(!lobbyOnly())return;GA.tab=t;renderGacha();openOv('gacha')}
function renderGacha(){
 $$('#gTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===GA.tab));
 const isS=GA.tab==='staff',pool=isS?STAFFS:CLASSES,own=isS?S.staffs:S.classes,pt=S.pity[GA.tab],bc=isS?'#a855f7':'#22d3ee';
 const no=pool.filter(x=>own[x.id]).length;
 const rates=RAR.map((r,i)=>{const items=pool.filter(x=>x.r===i),per=r.w/items.length,o=items.filter(x=>own[x.id]).length;
  return `<div class="rate" style="--rc:${r.c}"><b>${rarName(i)}</b><span class="pc">${r.w}%</span><small>${items.map(x=>`${own[x.id]?'<em>✓</em> ':''}${x.name} (${per<1?per.toFixed(2):per.toFixed(1)}%)`).join(' · ')}</small><span class="own">${o}/${items.length}</span></div>`}).join('');
 const pb=(lbl,v,max)=>`<div>${lbl}<b>${max-v} pulls</b><div class="bar"><i style="width:${v/max*100}%"></i></div></div>`;
 $('#gBody').innerHTML=`<div class="gban" style="--bc:${bc}"><div><h3>${isS?'Staff Summon':'Class Summon'}</h3>
 <p>${isS?'Trek een willekeurige staf. Iedere staf heeft een eigen aanval, projectiel en special.':'Trek een willekeurige class met eigen boosts, ability en speelstijl.'} Duplicates geven +1 level (max 10, +${isS?10:5}% per level). Op max level krijg je burgers terug.</p>
 <div class="gbtn"><button class="big gold" data-pull="1" ${S.burgers<100?'disabled':''}>1x · 100 <svg class="ic"><use href="#i-burger"/></svg></button><button class="big hot" data-pull="10" ${S.burgers<1000?'disabled':''}>10x · 1000 <svg class="ic"><use href="#i-burger"/></svg></button><button class="big alt" data-tix="1" ${S.tickets<1?'disabled':''}>1x · ticket <svg class="ic"><use href="#i-ticket"/></svg> (${S.tickets})</button></div>
 <div class="pity">${pb('Rare+ gegarandeerd binnen',pt.p10,10)}${pb('Legendary+ gegarandeerd binnen',pt.p60,60)}${pb('Mythic+ gegarandeerd binnen',pt.p150,150)}<div>Collectie-index<b>${no} / ${pool.length}</b><div class="bar"><i style="width:${no/pool.length*100}%"></i></div></div></div></div><div class="orb"></div></div>
 <h3 class="hd" style="margin:18px 0 4px">Alle mogelijke rewards en kansen</h3><div class="rates">${rates}</div>`;
}
function rollRarity(){let r=Math.random()*100;for(let i=RAR.length-1;i>=0;i--){if(r<RAR[i].w)return i;r-=RAR[i].w}return 0}
function roll(kind){
 const pool=kind==='staff'?STAFFS:CLASSES,own=kind==='staff'?S.staffs:S.classes,pt=S.pity[kind];
 pt.p10++;pt.p60++;pt.p150++;let r=rollRarity();
 if(pt.p150>=150&&r<5)r=5;else if(pt.p60>=60&&r<4)r=4;else if(pt.p10>=10&&r<2)r=2;
 if(r>=2)pt.p10=0;if(r>=4)pt.p60=0;if(r>=5)pt.p150=0;
 const it=pick(pool.filter(i=>i.r===r)),o=own[it.id];const res={it,kind,isNew:false,lvl:1,refund:0};
 if(!o){own[it.id]={lvl:1,n:1,new:true,m:0,mx:0};res.isNew=true}
 else{o.n++;if(o.lvl<10){o.lvl++;res.lvl=o.lvl}else{res.refund=30*(r+1);S.burgers+=res.refund;res.lvl=10}}
 S.pulls++;return res;
}
let sumTimer=0;
function doPull(n,tix){
 if(!lobbyOnly())return;
 if(tix){if(S.tickets<n){toast('Geen tickets');sfx('no');return}S.tickets-=n}
 else{const cost=100*n;if(S.burgers<cost){toast('Niet genoeg burgers');sfx('no');return}S.burgers-=cost}
 auInit();const res=[];for(let i=0;i<n;i++)res.push(roll(GA.tab));checkAch();save();
 const top=Math.max(...res.map(r=>r.it.r)),ov=$('#sum'),tier=top>=6?'t6':top>=5?'t5':top>=4?'t4':'';
 ov.style.setProperty('--c',top>=4?RAR[top].c:'#a78bfa');ov.className='ov on charge '+tier;$('#sumCards').innerHTML='';$('#sumSum').textContent='';$('#sumDone').hidden=true;
 $('#sumTxt').textContent=top>=6?'??? GEHEIME ENERGIE ???':top>=5?'MYTHIC SCHEURING!':top>=4?'LEGENDARY ENERGIE!':'SUMMONING…';
 sfx(top>=4?'summonL':'summon');
 clearTimeout(sumTimer);sumTimer=setTimeout(()=>reveal(res,top),top>=6?3000:top>=5?2500:top>=4?2100:1500);
 ov.onclick=e=>{if(ov.classList.contains('charge')&&e.target.id!=='sumDone'){clearTimeout(sumTimer);reveal(res,top)}};
 renderGacha();renderLobby();
}
function reveal(res,top){
 const ov=$('#sum');if(!ov.classList.contains('charge'))return;ov.classList.remove('charge');ov.classList.add('burst');
 ov.style.setProperty('--c',RAR[top].c);
 sfx(top>=5?'reveal5':top>=4?'reveal4':top>=3?'reveal3':'reveal0');
 $('#sumCards').innerHTML=res.map((r,i)=>{const it=r.it;return `<div class="rc r${it.r}" style="--rc:${RAR[it.r].c};--i:${i}">${r.kind==='staff'?staffArt(it):classArt(it)}<small>${rarName(it.r)}</small><b>${it.name}</b>${r.isNew?'<em class="n">NEW!</em>':r.refund?`<em>Max level · +${r.refund} burgers</em>`:`<em>Duplicate → Lv ${r.lvl}</em>`}</div>`}).join('');
 const nw=res.filter(r=>r.isNew).length,rf=res.reduce((a,r)=>a+r.refund,0);
 $('#sumSum').textContent=`${nw} nieuw · ${res.length-nw} duplicate${res.length-nw===1?'':'s'}${rf?' · +'+rf+' burgers terug':''}`;
 $('#sumDone').hidden=false;$('#sumDone').focus();
}

/* ================= UPGRADES ================= */
function renderUpg(){
 setT('uBur',fmt(S.burgers));
 $('#upgGrid').innerHTML=UPGRADES.map(u=>{const l=S.upg[u.id]||0,max=l>=u.max,c=upgCost(u,l);
  return `<div class="uc"><b>${u.n}</b><small>${u.d} per level · nu ${u.id==='wave'?'+'+(l*u.v):u.id==='regen'?'+'+(l*u.v*100).toFixed(2)+'%/s':(u.id==='cd'?'-':'+')+Math.round(l*u.v*100)+'%'}</small><div class="lvb">${Array.from({length:u.max},(_,i)=>`<i class="${i<l?'f':''}"></i>`).join('')}</div><small>Level ${l} / ${u.max}</small>
  <button class="big ${max?'alt':''}" data-buy="${u.id}" ${max||S.burgers<c?'disabled':''}>${max?'Maximaal':'Koop · '+fmt(c)+' burgers'}</button></div>`}).join('');
}
function buyUpg(id){if(!lobbyOnly())return;const u=UPG[id],l=S.upg[id]||0;if(l>=u.max)return;const c=upgCost(u,l);if(S.burgers<c){sfx('no');return}S.burgers-=c;S.upg[id]=l+1;sfx('lvl');toast(u.n+' → level '+(l+1));checkAch();save();renderUpg();renderLobby()}

/* ================= STATS ================= */
const STT={t:'ov'};
function renderStats(){
 $$('#stTabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===STT.t));
 const b=$('#stBody'),own=Object.keys(S.staffs).length+Object.keys(S.classes).length;
 if(STT.t==='ov'){const box=(v,l)=>`<div class="sbox"><b>${v}</b><small>${l}</small></div>`;
  b.innerHTML=`<div class="sgrid">${box(S.lvl,'Player level')+box(S.best,'Hoogste wave')+box(fmt(S.kills),'Totale kills')+box(S.bosses,'Bosses verslagen')+box(S.st.runs,'Potjes gespeeld')+box(fmtTime(S.st.playtime),'Speeltijd in potjes')+box(fmt(S.st.earned),'Burgers verdiend')+box(S.pulls,'Summons')+box(own+' / '+(STAFFS.length+CLASSES.length),'Collectie')+box(Object.keys(S.st.synUsed).length+' / '+SYN.length,'Synergieën ontdekt')+box(ACH.filter(a=>S.ach[a.id]).length+' / '+ACH.length,'Achievements')+box(S.daily.streak,'Daily-reeks')}</div>`}
 else if(STT.t==='ach'){b.innerHTML=`<div class="achl">${ACH.map(a=>{const s=S.ach[a.id],rw=(a.b?'+'+a.b+' burgers':'')+(a.t?(a.b?' · ':'')+'+'+a.t+' ticket'+(a.t>1?'s':''):'');
  return `<div class="ac ${s?(s.claimed?'done':'claim'):'lk'}"><div><b>${a.n}</b><small>${a.d}</small></div>${s&&!s.claimed?`<button class="big gold" data-claim="${a.id}">Claim ${rw}</button>`:`<span class="rw">${s?'✓ ':''}${rw}</span>`}</div>`}).join('')}</div>`}
 else if(STT.t==='coll'){b.innerHTML=`<p class="sub">Je hebt ${own} van ${STAFFS.length+CLASSES.length} unieke items. Iedere mijlpaal geeft een beloning.</p><div class="achl">${COLL.map(([n,bb,t])=>{const ok=own>=n,cl=S.coll[n];return `<div class="ac ${cl?'done':ok?'claim':'lk'}"><div><b>${n} items verzameld</b><small>${Math.min(own,n)} / ${n}</small></div>${ok&&!cl?`<button class="big gold" data-cclaim="${n}">Claim +${bb}${t?' · +'+t+' tickets':''}</button>`:`<span class="rw">${cl?'✓ ':''}+${bb} burgers${t?' · +'+t+' tickets':''}</span>`}</div>`}).join('')}</div>`}
 else if(STT.t==='boss'){b.innerHTML=`<table class="bt"><thead><tr><th>Boss</th><th>Eerste wave</th><th style="text-align:right">Verslagen</th><th style="text-align:right">Snelste kill</th></tr></thead><tbody>${BOSSES.map((x,i)=>`<tr><td><b class="hd" style="color:${x.c2}">${x.name}</b><br><small class="sub">${x.title}</small></td><td>${(i+1)*25}</td><td class="n">${S.st.bossKills[i]||0}</td><td class="n">${S.st.bossFast[i]?fmtTime(S.st.bossFast[i]):'–'}</td></tr>`).join('')}</tbody></table><p class="sub">Na wave ${BOSSES.length*25} komen de bosses terug als sterkere versies (II, III, …).</p>`}
 else{b.innerHTML=`<div class="zi">${Object.entries(ZT).map(([k,z])=>{const seen=S.st.zSeen[k]||k==='minion'&&S.bosses>0;return `<div class="zc ${seen?'':'lk'}"><canvas data-z="${seen?k:''}" width="108" height="108"></canvas><div><b>${seen?z.n:'???'}</b><small>${seen?z.d:'Nog niet tegengekomen'}</small><small>${z.from<999?'Vanaf wave '+z.from:'Bij bosses'}</small></div></div>`}).join('')}</div>`;
  $$('#stBody canvas[data-z]').forEach(c=>{const k=c.dataset.z;if(!k)return;const x=c.getContext('2d');x.scale(2,2);const t=ZT[k];const sc=Math.min(1,20/t.r);x.translate(27,27);x.scale(sc,sc);drawZombie({x:0,y:0,r:t.r,t,tid:k,face:.5,ph:1,flash:0,hp:1,maxhp:1,shield:t.shield?1:0,shieldMax:1,reveal:1,col:t.col},x)})}
}
function claimAch(id){const a=ACH.find(x=>x.id===id),s=S.ach[id];if(!a||!s||s.claimed)return;s.claimed=true;S.burgers+=a.b;S.tickets+=a.t;sfx('coin');toast('+'+a.b+' burgers'+(a.t?' · +'+a.t+' tickets':''),'ach');save();renderStats();renderLobby()}
function claimColl(n){n=+n;const c=COLL.find(x=>x[0]===n),own=Object.keys(S.staffs).length+Object.keys(S.classes).length;if(!c||S.coll[n]||own<n)return;S.coll[n]=1;S.burgers+=c[1];S.tickets+=c[2];sfx('coin');toast('Collectiebeloning: +'+c[1]+' burgers','ach');save();renderStats();renderLobby()}

/* ================= DAILY ================= */
function renderDaily(){const ds=dailyState(),done=ds.can?ds.idx:ds.idx+1;
 $('#days').innerHTML=DAILY.map((d,i)=>`<div class="day ${i<done?'done':''} ${ds.can&&i===ds.idx?'now':''}"><b>Dag ${i+1}</b>${d.t?'<svg class="ic" style="width:28px;height:28px"><use href="#i-ticket"/></svg>':'<svg class="ic" style="width:28px;height:28px"><use href="#i-burger"/></svg>'}<span>${d.b?'+'+d.b:''}${d.b&&d.t?' ':''}${d.t?'+'+d.t+' tk':''}</span></div>`).join('');
 const cb=$('#claimDaily');cb.disabled=!ds.can;cb.textContent=ds.can?'Claim dag '+(ds.idx+1):'Morgen weer terugkomen';}
function claimDaily(){const ds=dailyState();if(!ds.can)return;const d=DAILY[ds.idx];S.daily={last:today(),streak:ds.next};S.burgers+=d.b||0;S.tickets+=d.t||0;sfx('coin');toast('Daily reward: '+(d.b?'+'+d.b+' burgers ':'')+(d.t?'+'+d.t+' ticket(s)':''),'ach');checkAch();save();renderDaily();renderLobby()}

/* ================= SETTINGS ================= */
const SETS=[
 {k:'autoAttack',l:'Auto Attack',d:'Uit: richt met de muis en klik (of houd ingedrukt) om aan te vallen'},
 {k:'autoSkip',l:'Auto Skip',d:'Start na een voltooide wave automatisch de volgende na 5 seconden'},
 {k:'autoAbility',l:'Auto Abilities',d:'Specials en class abilities automatisch gebruiken (anders Spatie / E)'},
 {k:'speed',l:'Game Speed',d:'Versnel het potje: 2x of 3x zo snel (ook met F)',seg:[['1','1x'],['2','2x'],['3','3x']]},
 {k:'music',l:'Muziek'},{k:'sfx',l:'Geluidseffecten'},{k:'dmgNums',l:'Damage Numbers'},{k:'shake',l:'Screen Shake'},
 {k:'gfx',l:'Graphics Quality',d:'Hoog = lighting en alle effecten. Laag = beste performance',seg:[['low','Laag'],['medium','Middel'],['high','Hoog']]},
 {k:'vol',l:'Hoofdvolume',range:1},{k:'musVol',l:'Muziekvolume',range:1},{k:'sfxVol',l:'Effectenvolume',range:1}];
function renderSets(){
 $('#sets').innerHTML=SETS.map(s=>`<div class="srow"><div><label for="s-${s.k}">${s.l}</label>${s.d?`<small>${s.d}</small>`:''}</div>${s.range?`<input type="range" id="s-${s.k}" min="0" max="100" value="${S.set[s.k]}" data-r="${s.k}">`:s.seg?`<div class="seg">${s.seg.map(([v,n])=>`<button data-seg="${s.k}" data-v="${v}" class="${S.set[s.k]===v?'on':''}">${n}</button>`).join('')}</div>`:`<button class="tg ${S.set[s.k]?'on':''}" id="s-${s.k}" data-tg="${s.k}" role="switch" aria-checked="${!!S.set[s.k]}" aria-label="${s.l}"></button>`}</div>`).join('')
 +`<div class="ver">Staff Siege v${BUILD.version}${BUILD.env==='staging'?' · staging':''}</div>`+(inLobby()?`<div class="srow"><div><label>Voortgang resetten</label><small>Wist burgers, collectie, records en instellingen</small></div><button class="danger" id="resetB">Reset</button></div>`:'');
}
function cycleSpeed(){if(G.net==='guest'){toast('De host bepaalt de snelheid');return}S.set.speed=String((+S.set.speed||1)%3+1);saveSoon();renderHudStatic();if($('#set').classList.contains('on'))renderSets();toast('Game speed '+S.set.speed+'x')}
function toggleSet(k){if(G.net==='guest'&&k==='autoSkip'){toast('De host bepaalt Auto Skip');return}S.set[k]=!S.set[k];save();applyVol();renderSets();renderHudStatic();if(k==='autoSkip'&&G.phase==='clear')G.clearT=5}

/* ================= CO-OP PANEEL ================= */
function renderMP(){
 if(inLobby())renderLobby();
 const b=$('#mpBody');if(!b)return;
 if(!NET.available()){b.innerHTML=`<p class="sub">Multiplayer werkt op de Bas Games-site. Open Staff Siege via de startpagina van Bas Games om samen te spelen.</p>`;return}
 const name=(profileGet().name||'');
 const nm=`<div class="srow"><div><label for="mpName">Jouw naam</label><small>Zo zien je vrienden je in de kamer en boven je held</small></div><input id="mpName" class="tin" maxlength="16" value="${name.replace(/"/g,'&quot;')}" placeholder="Naam"></div>`;
 const msg=NET.msg?`<p class="mpmsg">${NET.msg}</p>`:'';
 if(!NET.inRoom()){
  b.innerHTML=nm+msg+`<div class="mpgrid"><div class="mpc"><b>Kamer maken</b><small>Je krijgt een code van 4 letters die je aan je vrienden geeft. Jij start het potje.</small><button class="big hot" id="mpHost">Kamer maken</button></div>
  <div class="mpc"><b>Meedoen</b><small>Vul de code van je vriend in.</small><div class="mpj"><input id="mpCode" class="tin code" maxlength="4" placeholder="CODE" autocomplete="off"><button class="big" id="mpJoin">Meedoen</button></div></div></div>
  <p class="sub">Iedereen speelt met zijn eigen staff en class uit de eigen lobby. Wave-burgers, gevonden burgers en boss-beloningen krijgt iedereen. Wie neergaat staat na de wave weer op.</p>`;
  return}
 const host=NET.role==='host',conn=NET.status==='connected';
 const rows=NET.roster.map(r=>{const st=STAFF[r.staff]||STAFF.oak,cl=CLS[r.cls]||CLS.recruit;return `<div class="mpp">${staffArt(st)}${classArt(cl)}<div><b>${r.name||'Speler'}${r.cid===NET.me?' (jij)':''}</b><small><span style="color:${RAR[st.r].c}">${st.name}</span> + <span style="color:${RAR[cl.r].c}">${cl.name}</span></small></div>${r.host?'<span class="chip">HOST</span>':''}</div>`}).join('');
 b.innerHTML=nm+`<div class="mpcode"><small>Kamercode</small><b>${NET.code}</b><span class="sub">${conn?'Verbonden':'Verbinden…'} · ${NET.roster.length}/${MAXP} spelers</span></div>${msg}<div class="mplist">${rows||'<p class="sub">Wachten op de host…</p>'}</div>
  <p class="sub">${host?'Kies je loadout in de lobby; je vrienden doen dat ook. Hun keuze zie je hier verschijnen.':(NET.live?'Er is een potje bezig. Je kunt meedoen met het volgende potje.':'Kies je staff en class in de lobby. De host start het potje.')}</p>
  <div class="lbtns">${host?`<button class="big hot" id="mpStart" ${NET.roster.length<2||!conn?'disabled':''}>Start co-op potje</button>`:''}<button class="big alt" id="mpLeave">${host?'Kamer sluiten':'Kamer verlaten'}</button></div>`;
}
document.addEventListener('change',e=>{if(e.target.id==='mpName'){profileSetName(e.target.value);if(NET.inRoom()){if(NET.role==='host')sendRoster();else sendHello()}renderMP()}});
document.addEventListener('keydown',e=>{if(e.target.id==='mpCode'&&e.key==='Enter'){e.preventDefault();$('#mpJoin').click()}});

/* ================= OVERLAYS ================= */
const MENUS=['coll','syn','gacha','upg','stats','daily','set','pause','mp'];
function openOv(id){auInit();sfx('click');$('#'+id).classList.add('on');if(G.state==='play'&&!G.net)G.paused=true}
function closeOv(id){$('#'+id).classList.remove('on');if(G.state==='play'&&!MENUS.some(m=>$('#'+m).classList.contains('on'))&&!$('#sum').classList.contains('on'))G.paused=false;if(inLobby())renderLobby();renderHudStatic()}
function closeAll(){MENUS.forEach(m=>$('#'+m).classList.remove('on'));$('#sum').classList.remove('on');$('#res').classList.remove('on');G.paused=false}
function openPanel(go){
 if(go!=='set'&&!lobbyOnly())return;
 switch(go){
  case 'staffs':COL.tab='staff';COL.sel=null;renderColl();openOv('coll');break;
  case 'classes':COL.tab='class';COL.sel=null;renderColl();openOv('coll');break;
  case 'syn':renderSyn();openOv('syn');break;
  case 'gacha':openGacha(GA.tab);break;
  case 'upg':renderUpg();openOv('upg');break;
  case 'stats':renderStats();openOv('stats');break;
  case 'daily':renderDaily();openOv('daily');break;
  case 'set':renderSets();openOv('set');break;
  case 'mp':renderMP();openOv('mp');break;
 }
}
function openPause(){if(G.state!=='play'||(G.intro&&!G.net))return;$('#pauseInfo').textContent=`Wave ${G.wave} · ${G.kills} kills · ${fmt(G.earned)} burgers · ${K.st.name} + ${K.cl.name}`+(G.net?' · Online: het spel loopt gewoon door':'');openOv('pause')}

/* ================= HUD ================= */
function trySpecial(){if(G.net==='guest')NET.trigger('sp');else staffSpecial()}
function tryAbility(){if(G.net==='guest')NET.trigger('ab');else useAbility()}
function tryBuild(k){if(G.net==='guest')NET.build(k);else build(k)}
function renderEq(){
 const s=K.st,c=K.cl,sp=K.sp;
 $('#eqS').innerHTML=`<button class="ab" id="spB" style="--c:${s.col}" title="Staff special (Spatie)"><span>Spatie</span></button>${staffArt(s)}<div><small>${sp.n}</small><b style="color:${RAR[s.r].c}">${s.name}</b><small>Lv ${K.sl} · M${K.sMast}</small></div>`;
 $('#eqC').innerHTML=`<button class="ab" id="abB" style="--c:${c.col}" title="Class ability (E)"><span>E</span></button>${classArt(c)}<div><small>${c.ab.n}</small><b style="color:${RAR[c.r].c}">${c.name}</b><small>Lv ${K.cLv} · M${K.cMast}</small></div>`;
 $('#synHud').innerHTML=K.syn.map(x=>`<span class="chip" title="${x.d}">⚡ ${x.n}</span>`).join('');
 $('#spB').onclick=()=>trySpecial();$('#abB').onclick=()=>tryAbility();
}
function renderHudStatic(){
 const play=G.state==='play';
 $('#scrapP').hidden=!(play&&K&&K.cl.id==='build');$('#build').classList.toggle('on',play&&!!K&&K.cl.id==='build');
 $('#skipS').textContent=S.set.autoSkip?'AAN':'UIT';const sp=G.net==='guest'?NET.hostSpeed||1:+S.set.speed||1;$('#spdS').textContent=sp+'x';$('#spdB').classList.toggle('on',sp>1);$('#skipB').classList.toggle('on',S.set.autoSkip);
 if(!play){$('#bossbar').classList.remove('on');$('#nextW').classList.remove('on')}
}
let lastBossHp=0;
function hudTick(){
 if(G.state!=='play'||!P)return;
 setT('bur',fmt(S.burgers));setT('hpt',Math.ceil(P.hp)+' / '+P.maxhp);setW('hpf',P.hp/P.maxhp);
 setT('wv','WAVE '+G.wave);$('#wv').classList.toggle('boss',G.wave%25===0);setT('arenaN',(ARENAS[Math.max(0,G.arena)]||ARENAS[0]).n.toUpperCase());
 const rem=remaining();setT('zl',G.phase==='clear'?'Wave voltooid':rem+(rem===1?' zombie over':' zombies over'));
 setW('wpf',G.phase==='clear'?1:1-rem/Math.max(1,G.total));
 const b=G.boss&&!G.boss.dead&&!G.intro?G.boss:null,bb=$('#bossbar');
 bb.classList.toggle('on',!!b);
 if(b){bb.style.setProperty('--b1',b.bdef.col);bb.style.setProperty('--b2',b.bdef.c2);setT('bn',b.name);setT('btl',b.bdef.title);setT('bph','FASE '+(b.phase+1)+(b.inv>0?' · IMMUUN':''));setW('bbf',b.hp/b.maxhp);setW('bbg',b.hp/b.maxhp);setT('bt',fmt(b.hp)+' / '+fmt(b.maxhp));
  if(lastBossHp-b.hp>b.maxhp*.01){bb.classList.remove('hit');void bb.offsetWidth;bb.classList.add('hit')}lastBossHp=b.hp}
 $('#nextW').classList.toggle('on',G.phase==='clear');
 if(G.phase==='clear')setT('cd',(G.net==='guest'?NET.hostSkip:S.set.autoSkip)?'Volgende wave in '+Math.ceil(Math.max(0,G.clearT))+'s':G.net==='guest'?'De host start de volgende wave':'Auto Skip staat uit');
 $('#nextB').hidden=G.net==='guest';
 setT('scrap',fmt(P.scrap||0));
 const sp=$('#spB'),ab=$('#abB');
 if(sp){const f=Math.max(0,P.spT)/(K.sp.cd*K.cdMul);sp.style.setProperty('--p',f.toFixed(3));sp.classList.toggle('rdy',f<=0)}
 if(ab){const f=Math.max(0,P.abT)/(K.cl.ab.cd*K.cdMul);ab.style.setProperty('--p',f.toFixed(3));ab.classList.toggle('rdy',f<=0)}
}

/* ================= RESULTATEN ================= */
let RES0=null;
function showResults(dead){
 const R=RES0||{lvl:S.lvl};
 $('#resK').textContent=dead?'GAME OVER':'POTJE BEËINDIGD';const h=$('#resT');h.textContent='Wave '+G.wave;h.className=dead?'dead':'';
 const box=(v,l)=>`<div class="sbox"><b>${v}</b><small>${l}</small></div>`;
 $('#resStats').innerHTML=box(G.kills,'kills')+box(fmt(G.earned),'burgers')+box(fmt(G.xp),'XP')+box(fmtTime(G.runTime),'tijd')+box(fmt(G.dmg),'damage');
 const so=S.staffs[K.st.id],co=S.classes[K.cl.id],mb=(n,o)=>`<div><div class="mbar"><small><span>${n} · mastery ${o.m}/10</span><span>${o.m>=10?'MAX':fmt(o.mx)+' / '+fmt(mastNeed(o.m))}</span></small><div class="bar"><i style="width:${o.m>=10?100:o.mx/mastNeed(o.m)*100}%"></i></div></div></div>`;
 $('#resGain').innerHTML=`<div><div class="mbar"><small><span>Player level ${S.lvl}${S.lvl>R.lvl?' (+'+(S.lvl-R.lvl)+')':''}</span><span>${fmt(S.xp)} / ${fmt(xpNeed(S.lvl))}</span></small><div class="bar"><i style="width:${S.xp/xpNeed(S.lvl)*100}%;background:var(--acc)"></i></div></div></div>`+mb(K.st.name,so)+mb(K.cl.name,co)+
  (G.newAch.length?`<div class="si act"><b>Nieuwe achievements</b><small>${G.newAch.join(' · ')} — claim ze in Stats &amp; Achievements</small></div>`:'')+
  (S.run.checkpoint>1?`<div class="si"><small>Checkpoint opgeslagen: wave ${S.run.checkpoint}</small></div>`:'');
 $('#again').hidden=!!G.net;
 $('#res').classList.add('on');
}

/* ================= EVENTS ================= */
document.addEventListener('click',e=>{
 const t=e.target.closest('button');if(!t)return;
 if(t.dataset.go){openPanel(t.dataset.go);return}
 if(t.hasAttribute('data-close')){closeOv(t.closest('.ov').id);return}
 if(t.dataset.start){if(!inLobby())return;RES0={lvl:S.lvl};startRun(+t.dataset.start,!!t.dataset.resume);return}
 if(t.dataset.pull){doPull(+t.dataset.pull);return}
 if(t.dataset.tix){doPull(1,true);return}
 if(t.dataset.tg){toggleSet(t.dataset.tg);return}
 if(t.dataset.seg){S.set[t.dataset.seg]=t.dataset.v;save();BG=null;renderSets();renderHudStatic();return}
 if(t.dataset.b){tryBuild(t.dataset.b);return}
 if(t.dataset.buy){buyUpg(t.dataset.buy);return}
 if(t.dataset.claim){claimAch(t.dataset.claim);return}
 if(t.dataset.cclaim){claimColl(t.dataset.cclaim);return}
 if(t.dataset.fil!=null&&t.closest('#collFil')){COL.fil=+t.dataset.fil;renderColl();return}
 if(t.dataset.id&&t.closest('#collGrid')){COL.sel=t.dataset.id;sfx('click');renderColl();return}
 if(t.dataset.t){const p=t.closest('.tabs');if(!p)return;
  if(p.id==='collTabs'){COL.tab=t.dataset.t;COL.sel=null;COL.fil=-1;renderColl()}
  else if(p.id==='gTabs'){GA.tab=t.dataset.t;renderGacha()}
  else if(p.id==='synTabs'){SYT.f=t.dataset.t;renderSyn()}
  else if(p.id==='stTabs'){STT.t=t.dataset.t;renderStats()}return}
 switch(t.id){
  case 'spdB':cycleSpeed();break;
  case 'skipB':toggleSet('autoSkip');toast('Auto Skip '+(S.set.autoSkip?'aan':'uit'));break;
  case 'pauseB':openPause();break;
  case 'nextB':nextWave();break;
  case 'resB':closeOv('pause');break;
  case 'quitB':$('#pause').classList.remove('on');G.paused=false;if(G.net==='guest')NET.guestQuit();else endRun(false);break;
  case 'toLobby':transition(()=>{$('#res').classList.remove('on');showScreen('lobby')});break;
  case 'again':{$('#res').classList.remove('on');S.eqStaff=K.st.id;S.eqClass=K.cl.id;G.state='lobby';RES0={lvl:S.lvl};startRun(1);break}
  case 'sumDone':$('#sum').classList.remove('on','burst','t4','t5','t6');renderGacha();renderLobby();if($('#coll').classList.contains('on'))renderColl();break;
  case 'claimDaily':claimDaily();break;
  case 'mpHost':{const n=$('#mpName');if(n&&n.value.trim())profileSetName(n.value);NET.host();renderMP();break}
  case 'mpJoin':{const n=$('#mpName');if(n&&n.value.trim())profileSetName(n.value);NET.join($('#mpCode').value);renderMP();break}
  case 'mpStart':NET.startMatch();break;
  case 'mpLeave':NET.leave();renderMP();break;
  case 'resetB':if(t.dataset.arm){localStorage.removeItem(KEY);load();applyVol();closeAll();renderSets();showScreen('lobby');toast('Voortgang gereset')}else{t.dataset.arm=1;t.textContent='Zeker weten? Klik nogmaals';setTimeout(()=>{if(t.isConnected){delete t.dataset.arm;t.textContent='Reset'}},3000)}break;
 }
});
document.addEventListener('pointerdown',()=>auInit(),{once:true});
document.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.r;if(k){S.set[k]=+e.target.value;applyVol();saveSoon()}});
addEventListener('keydown',e=>{
 const k=e.key.toLowerCase();if(e.target.tagName==='INPUT')return;
 if(k==='escape'||(k==='p'&&G.state==='play')){const open=[...MENUS,'sum'].filter(m=>$('#'+m).classList.contains('on'));if(open.length){if(open.includes('sum')){if($('#sum').classList.contains('charge'))$('#sum').click();else $('#sumDone').click()}else open.forEach(closeOv)}else openPause();return}
 KEYS[k]=true;
 if(G.state!=='play'||G.paused)return;
 if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();
 if(k===' ')trySpecial();if(k==='e')tryAbility();
 if(k==='f')cycleSpeed();if(k==='t')tryBuild('tower');if(k==='g')tryBuild('wall');if(k==='u')tryBuild('up');if(k==='n')nextWave();
});
addEventListener('keyup',e=>{KEYS[e.key.toLowerCase()]=false});
addEventListener('blur',()=>{for(const k in KEYS)KEYS[k]=false;M.down=false});
cv.addEventListener('pointerdown',e=>{
 auInit();M.x=e.clientX;M.y=e.clientY;
 if(e.pointerType==='touch'){if(!S.set.autoAttack&&e.clientX>W/2){M.down=true}else Object.assign(JOY,{active:true,id:e.pointerId,ox:e.clientX,oy:e.clientY,dx:0,dy:0})}
 else M.down=true;
 try{cv.setPointerCapture(e.pointerId)}catch(_){}
});
cv.addEventListener('pointermove',e=>{if(JOY.active&&e.pointerId===JOY.id){let dx=e.clientX-JOY.ox,dy=e.clientY-JOY.oy;const L=Math.hypot(dx,dy);if(L>50){dx*=50/L;dy*=50/L}JOY.dx=dx/50;JOY.dy=dy/50}else{M.x=e.clientX;M.y=e.clientY}});
const up=e=>{if(JOY.active&&e.pointerId===JOY.id){JOY.active=false;JOY.dx=JOY.dy=0}else M.down=false};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('visibilitychange',()=>{if(document.hidden){commitTime();save();if(G.state==='play'&&!G.paused&&!G.net)openPause()}});
addEventListener('beforeunload',()=>{commitTime();save()});
function resize(){VW=innerWidth;VH=innerHeight;DPR=Math.min(2,devicePixelRatio||1);cv.width=Math.round(VW*DPR);cv.height=Math.round(VH*DPR);BG=null;
 if(G.net==='guest'&&G.state==='play')return;
 /* minimale wereldgrootte: een verborgen of piepklein venster mag geen arena van 0 pixels geven */
 const ow=W,oh=H;W=Math.max(360,VW);H=Math.max(360,VH);if(ow)for(const pl of PLAYERS){pl.P.x=pl.P.x/ow*W;pl.P.y=pl.P.y/oh*H}}
addEventListener('resize',resize);

/* ================= ACHTERGROND (co-op) =================
   Een verborgen tabblad krijgt geen animatieframes. In co-op mag het spel dan niet stilvallen
   (de host simuleert voor iedereen, gasten moeten invoer blijven sturen), dus een kleine worker
   tikt door zolang het tabblad verborgen is. Solo pauzeert het spel gewoon. */
let bgLast=0,frameAt=0;
function bgStep(){
 const now=performance.now();
 /* ook als de browser geen frames meer tekent terwijl de pagina 'zichtbaar' heet (bijv. een bedekt venster) */
 if(!(document.hidden||now-frameAt>300)||!(G.net||NET.inRoom())){bgLast=now;return}
 const dt=Math.min(1,(now-(bgLast||now))/1000);bgLast=now;last=now;if(dt<=0)return;
 try{
  if(G.state==='play'){
   if(G.net==='guest')clientTick(dt);
   else if(G.net==='host'){const n=+S.set.speed||1,steps=Math.ceil(dt*30);for(let i=0;i<steps&&G.state==='play';i++)for(let k=0;k<n&&G.state==='play';k++)update(dt/steps)}
  }
  NET.tick(dt);
 }catch(e){console.error(e)}
}
document.addEventListener('visibilitychange',()=>{bgLast=performance.now();last=performance.now()});
try{if(window.Worker&&window.Blob&&window.URL&&URL.createObjectURL){const wk=new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),100)'],{type:'text/javascript'})));wk.onmessage=bgStep}}catch(e){}

/* ================= LOOP ================= */
let last=performance.now(),fpsN=0,fpsT=0;
function frame(now){
 frameAt=performance.now();
 const dt=Math.min(.05,(now-last)/1000);last=now;
 try{
  if(G.state==='play'){if(G.net==='guest')clientTick(dt);else{const n=+S.set.speed||1;for(let i=0;i<n&&G.state==='play'&&!G.paused;i++)update(dt)}}
  else if(G.state==='res'&&!G.paused)updateFx(dt);
  NET.tick(dt);
  if(G.state==='lobby')renderStage(now/1000);else render();
  hudTick();
 }catch(err){console.error(err)}
 requestAnimationFrame(frame);
}
/* boot() wordt door de Bas Games-build aangeroepen nadat alle scripts geladen zijn */
function boot(){
 if(BUILD.home){const a=$('#homeLink');a.href=BUILD.home;a.hidden=false}
 resize();K=kit();renderLobby();renderHudStatic();checkAch();requestAnimationFrame(frame);
}
