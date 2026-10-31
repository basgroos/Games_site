/* ===================== SAVE ===================== */
const SAVE_KEY='pegfall-save-v1'+(BUILD.env==='staging'?'-staging':'');
function sharedName(){try{const P=JSON.parse(localStorage.getItem('basgames-player')||'{}')||{};return (P.name||'').trim().slice(0,18);}catch(e){return '';}}
function defaultSave(){const owned={};CHARS.filter(c=>c.rarity==='common').forEach(c=>owned[c.id]=1);
  return {shards:1000,owned,pity10:0,pity50:0,name:sharedName()||'Player'+(100+Math.floor(Math.random()*900)),sound:true,speed:2,fx:true,stats:{w:0,l:0,pulls:0},starters:['pip','bramble']};}
function loadSave(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));if(s&&s.owned)return Object.assign(defaultSave(),s);}catch(e){}return defaultSave();}
const S={save:loadSave(),screen:'menu',arg:null,match:null,bot:null,mode:null};
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(S.save));}catch(e){}updateTop();}
const ownedIds=()=>CHARS.filter(c=>S.save.owned[c.id]).map(c=>c.id);
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(msg){const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2600);}
function updateTop(){$('#shards').textContent=S.save.shards.toLocaleString();}

/* ===================== SOUND ===================== */
const AU={ctx:null,last:{}};
function sfx(type,p=0){if(!S.save.sound)return;const now=performance.now();if(AU.last[type]&&now-AU.last[type]<(type==='hit'?70:type==='peg'?25:0))return;AU.last[type]=now;
  try{if(!AU.ctx)AU.ctx=new (window.AudioContext||window.webkitAudioContext)();const c=AU.ctx;if(c.state==='suspended')c.resume();
    const tone=(f,dur,wave='sine',vol=.08,delay=0,f2)=>{const o=c.createOscillator(),g=c.createGain();o.type=wave;o.frequency.setValueAtTime(f,c.currentTime+delay);
      if(f2)o.frequency.exponentialRampToValueAtTime(f2,c.currentTime+delay+dur);g.gain.setValueAtTime(vol,c.currentTime+delay);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+delay+dur);
      o.connect(g);g.connect(c.destination);o.start(c.currentTime+delay);o.stop(c.currentTime+delay+dur+.02);};
    if(type==='peg')tone(500+p*60,.06,'triangle',.04);
    else if(type==='land'){tone(660,.12,'triangle',.07);tone(990,.18,'triangle',.06,.08);}
    else if(type==='double'){[523,659,784,1046].forEach((f,i)=>tone(f,.16,'square',.04,i*.07));}
    else if(type==='hit')tone(140+Math.random()*60,.06,'square',.025);
    else if(type==='boom')tone(120,.4,'sawtooth',.06,0,40);
    else if(type==='summon')tone(200,1.4,'sawtooth',.035,0,1200);
    else if(type==='reveal')[0,4,7,12].slice(0,2+p).forEach((s,i)=>tone(440*Math.pow(2,s/12),.3,'triangle',.06,i*.06));
    else if(type==='win')[523,659,784,1046,1318].forEach((f,i)=>tone(f,.25,'triangle',.07,i*.1));
    else if(type==='lose')[392,349,311,262].forEach((f,i)=>tone(f,.3,'triangle',.06,i*.12));
    else if(type==='click')tone(880,.04,'square',.03);
  }catch(e){}}

/* ===================== CHARACTER ART ===================== */
function shade(hex,amt){const c=parseInt(hex.slice(1),16);let r=c>>16,g=c>>8&255,b=c&255;
  if(amt<0){r*=1+amt;g*=1+amt;b*=1+amt;}else{r+=(255-r)*amt;g+=(255-g)*amt;b+=(255-b)*amt;}return `rgb(${r|0},${g|0},${b|0})`;}
function ell(g,x,y,rx,ry){g.beginPath();g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);}
function rrect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function drawChar(g,d,S,pose={}){const L=d.look,r=S*.27,ol=shade(L.body,-.6),lw=Math.max(1,S*.03);
  let rx=r,ry=r;if(L.shape==='tall'){rx=r*.86;ry=r*1.12;}else if(L.shape==='wide'){rx=r*1.16;ry=r*.94;}else if(L.shape==='bean'){rx=r*.92;ry=r*1.04;}
  const by=S*.12,atk=pose.atk||0;g.save();g.lineJoin='round';g.lineCap='round';
  g.fillStyle='rgba(0,0,0,.25)';ell(g,0,by+ry*1.02,rx*1.05,ry*.2);g.fill();
  g.translate(0,-(pose.bob||0));
  if(L.cape){g.fillStyle=L.cape;g.beginPath();g.moveTo(-rx*.6,by-ry*.5);g.quadraticCurveTo(-rx*1.6,by+ry*.5,-rx*1.15,by+ry*1.0);g.lineTo(rx*.1,by+ry*.85);g.closePath();g.fill();g.strokeStyle=shade(L.cape,-.5);g.lineWidth=lw;g.stroke();}
  g.strokeStyle=ol;g.lineWidth=lw;g.fillStyle=shade(L.body,-.25);
  ell(g,-rx*.42,by+ry*.92,rx*.3,ry*.19);g.fill();g.stroke();ell(g,rx*.42,by+ry*.92,rx*.3,ry*.19);g.fill();g.stroke();
  if(L.weapon==='shield'&&!pose.front){}
  if(L.shape==='bean')rrect(g,-rx,by-ry,rx*2,ry*2,rx*.95);else ell(g,0,by,rx,ry);
  g.fillStyle=L.body;g.fill();g.stroke();
  g.fillStyle=L.belly||shade(L.body,.42);ell(g,rx*.1,by+ry*.4,rx*.56,ry*.44);g.fill();
  g.fillStyle='rgba(255,255,255,.32)';ell(g,-rx*.42,by-ry*.52,rx*.22,ry*.13);g.fill();
  g.fillStyle='rgba(255,90,120,.35)';ell(g,-rx*.14,by+ry*.1,rx*.13,ry*.08);g.fill();ell(g,rx*.8,by+ry*.1,rx*.1,ry*.08);g.fill();
  drawEyes(g,L,rx,ry,by);
  if(L.beard){g.fillStyle='#eef2ff';g.strokeStyle='#9aa3c7';g.beginPath();g.moveTo(-rx*.05,by+ry*.15);g.quadraticCurveTo(rx*.35,by+ry*1.0,rx*.75,by+ry*.15);g.closePath();g.fill();g.stroke();}
  drawHat(g,L,rx,ry,by,lw);drawWeapon(g,L,rx,ry,by,lw,atk);g.restore();}
function drawEyes(g,L,rx,ry,by){const ey=by-ry*.14,e=[rx*.1,rx*.56],er=rx*.15;
  for(const ex of e){if(L.eye==='glow'){g.fillStyle=L.eyeC||'#fff';g.shadowColor=L.eyeC||'#fff';g.shadowBlur=er*2.5;ell(g,ex,ey,er*.95,er*.55);g.fill();g.shadowBlur=0;continue;}
    g.fillStyle='#fff';ell(g,ex,ey,er,er*1.2);g.fill();g.fillStyle='#1a1a2e';ell(g,ex+er*.3,ey+er*.1,er*.56,er*.72);g.fill();g.fillStyle='#fff';ell(g,ex+er*.5,ey-er*.25,er*.2,er*.2);g.fill();
    if(L.eye==='sly'){g.fillStyle=L.body;g.fillRect(ex-er*1.15,ey-er*1.5,er*2.3,er*1.05);g.strokeStyle='#1a1a2e';g.lineWidth=er*.25;g.beginPath();g.moveTo(ex-er,ey-er*.42);g.lineTo(ex+er,ey-er*.5);g.stroke();}}
  if(L.eye==='angry'){g.strokeStyle='#1a1a2e';g.lineWidth=er*.4;g.beginPath();g.moveTo(e[0]-er,ey-er*1.6);g.lineTo(e[0]+er,ey-er*1.05);g.moveTo(e[1]-er,ey-er*1.05);g.lineTo(e[1]+er,ey-er*1.6);g.stroke();}
  g.strokeStyle=L.eye==='glow'?'rgba(255,255,255,.6)':'#1a1a2e';g.lineWidth=Math.max(1,rx*.07);g.beginPath();
  if(L.eye==='angry')g.arc(rx*.36,ey+er*2.3,er*.5,Math.PI+.4,-.4);else g.arc(rx*.36,ey+er*1.45,er*.55,.25,Math.PI-.25);g.stroke();}
function drawHat(g,L,rx,ry,by,lw){const top=by-ry;g.lineWidth=lw;
  const dome=(c)=>{g.fillStyle=c;g.strokeStyle=shade(c.startsWith('#')?c:'#888888',-.55);g.beginPath();g.ellipse(0,by-ry*.3,rx*1.04,ry*.78,0,Math.PI,0);g.closePath();g.fill();g.stroke();};
  switch(L.hat){
    case 'helmet':dome('#c9d3df');g.fillStyle='#8e9aab';g.fillRect(-rx*1.0,by-ry*.38,rx*2.0,ry*.14);g.fillStyle='#ff5d5d';ell(g,0,top-ry*.12,rx*.14,ry*.3);g.fill();break;
    case 'hornhelm':dome('#a7a9b4');g.fillStyle='#fff3d6';g.strokeStyle='#7a6a4a';
      for(const s of [-1,1]){g.beginPath();g.moveTo(s*rx*.7,by-ry*.7);g.quadraticCurveTo(s*rx*1.5,by-ry*1.1,s*rx*1.25,by-ry*1.75);g.quadraticCurveTo(s*rx*1.1,by-ry*1.1,s*rx*.45,by-ry*.95);g.closePath();g.fill();g.stroke();}break;
    case 'hood':{const c=L.hatC||'#444';g.fillStyle=c;g.strokeStyle=shade(c,-.5);g.beginPath();g.moveTo(-rx*1.08,by+ry*.2);g.quadraticCurveTo(-rx*1.15,top-ry*.35,rx*.1,top-ry*.3);g.quadraticCurveTo(rx*1.2,top-ry*.1,rx*1.08,by-ry*.05);
      g.quadraticCurveTo(rx*.5,by-ry*.62,-rx*.3,by-ry*.55);g.quadraticCurveTo(-rx*.75,by-ry*.4,-rx*.8,by+ry*.2);g.closePath();g.fill();g.stroke();break;}
    case 'wizard':{const c=L.hatC||'#5b3cc4';g.fillStyle=c;g.strokeStyle=shade(c,-.5);g.beginPath();g.moveTo(-rx*.85,by-ry*.6);g.quadraticCurveTo(-rx*.2,top-ry*.6,-rx*.65,top-ry*1.25);g.quadraticCurveTo(rx*.4,top-ry*.4,rx*.85,by-ry*.6);g.closePath();g.fill();g.stroke();
      ell(g,0,by-ry*.6,rx*1.15,ry*.2);g.fill();g.stroke();g.fillStyle='#ffe36b';ell(g,-rx*.1,top-ry*.15,rx*.12,rx*.12);g.fill();break;}
    case 'leaf':g.strokeStyle='#3d6b2a';g.lineWidth=lw*1.4;g.beginPath();g.moveTo(0,top+ry*.05);g.lineTo(rx*.05,top-ry*.35);g.stroke();g.fillStyle='#a5e05a';g.strokeStyle='#3d6b2a';g.lineWidth=lw;
      for(const s of [-1,1]){g.beginPath();g.ellipse(rx*.05+s*rx*.3,top-ry*.42,rx*.32,ry*.14,s*-.5,0,Math.PI*2);g.fill();g.stroke();}break;
    case 'halo':g.strokeStyle='#ffe36b';g.lineWidth=lw*2;g.shadowColor='#ffe36b';g.shadowBlur=10;ell(g,0,top-ry*.32,rx*.62,ry*.17);g.stroke();g.shadowBlur=0;break;
    case 'bandana':{const c=L.hatC||'#e0413a';g.fillStyle=c;g.strokeStyle=shade(c,-.5);g.beginPath();g.ellipse(0,by-ry*.55,rx*.98,ry*.42,0,Math.PI*1.05,-Math.PI*.05);g.closePath();g.fill();g.stroke();
      g.beginPath();g.moveTo(-rx*.85,by-ry*.5);g.quadraticCurveTo(-rx*1.4,by-ry*.6,-rx*1.5,by-ry*.15);g.lineTo(-rx*1.2,by-ry*.25);g.quadraticCurveTo(-rx*1.15,by-ry*.45,-rx*.8,by-ry*.35);g.closePath();g.fill();g.stroke();
      g.fillStyle='#fff';for(const x of [-.4,0,.4]){ell(g,rx*x,by-ry*.75,rx*.06,rx*.06);g.fill();}break;}
    case 'mask':g.fillStyle='#2a2340';g.beginPath();g.rect(-rx*.95,by-ry*.38,rx*1.95,ry*.42);g.fill();g.fillStyle='#fff';for(const ex of [rx*.1,rx*.56]){ell(g,ex,by-ry*.17,rx*.12,ry*.07);g.fill();}
      g.strokeStyle='#2a2340';g.lineWidth=lw*2;g.beginPath();g.moveTo(-rx*.9,by-ry*.2);g.quadraticCurveTo(-rx*1.4,by-ry*.1,-rx*1.5,by+ry*.2);g.stroke();break;
    case 'feather':dome('#3f7f6a');g.fillStyle='#ff5d5d';g.strokeStyle='#8a2020';g.beginPath();g.moveTo(-rx*.3,by-ry*.9);g.quadraticCurveTo(-rx*1.2,top-ry*.9,-rx*1.1,top-ry*.2);g.quadraticCurveTo(-rx*.6,top-ry*.4,-rx*.3,by-ry*.9);g.fill();g.stroke();break;
    case 'frost':g.fillStyle='#e8fbff';g.strokeStyle='#5fb7d9';for(let i=-2;i<=2;i++){const x=i*rx*.36,h=ry*(.55-Math.abs(i)*.12);g.beginPath();g.moveTo(x-rx*.15,top+ry*.25);g.lineTo(x,top-h);g.lineTo(x+rx*.15,top+ry*.25);g.closePath();g.fill();g.stroke();}break;
    case 'spikes':g.fillStyle='#5b6275';g.strokeStyle='#2c3140';for(let i=-2;i<=2;i++){const x=i*rx*.42;g.beginPath();g.moveTo(x-rx*.2,top+ry*.3);g.lineTo(x-rx*.05,top-ry*.4);g.lineTo(x+rx*.2,top+ry*.3);g.closePath();g.fill();g.stroke();}break;
    case 'petals':for(let i=0;i<6;i++){const x=-rx*.75+i*rx*.3;g.fillStyle=i%2?'#fff1a8':'#ff7fb0';g.strokeStyle='#b34a75';ell(g,x,top+ry*.08,rx*.16,rx*.16);g.fill();g.stroke();}break;
    case 'flame':for(let i=0;i<4;i++){const x=-rx*.6+i*rx*.4,h=ry*(.6+((i*7)%3)*.15);g.fillStyle=i%2?'#ffd23f':'#ff7a2e';g.beginPath();g.moveTo(x-rx*.25,top+ry*.35);g.quadraticCurveTo(x-rx*.2,top-h*.4,x+rx*.05,top-h);g.quadraticCurveTo(x+rx*.1,top-h*.3,x+rx*.25,top+ry*.35);g.closePath();g.fill();}break;
    case 'horns':g.fillStyle='#f3e7c9';g.strokeStyle='#7a6a4a';for(const s of [-1,1]){g.beginPath();g.moveTo(s*rx*.35,top+ry*.15);g.quadraticCurveTo(s*rx*1.3,top-ry*.1,s*rx*1.05,top-ry*.75);g.quadraticCurveTo(s*rx*.95,top-ry*.15,s*rx*.05,top+ry*.3);g.closePath();g.fill();g.stroke();}break;
    case 'skull':dome('#f7f3ea');g.fillStyle='#3b3226';ell(g,-rx*.28,by-ry*.68,rx*.13,ry*.1);g.fill();ell(g,rx*.28,by-ry*.68,rx*.13,ry*.1);g.fill();g.fillStyle='#c94b4b';g.beginPath();g.moveTo(rx*.4,top);g.quadraticCurveTo(rx*1.1,top-ry*.8,rx*.9,top-ry*.05);g.fill();break;
    case 'crown':g.fillStyle='#ffcf3f';g.strokeStyle='#9a6b00';g.beginPath();g.moveTo(-rx*.62,top+ry*.25);g.lineTo(-rx*.62,top-ry*.3);g.lineTo(-rx*.32,top);g.lineTo(0,top-ry*.42);g.lineTo(rx*.32,top);g.lineTo(rx*.62,top-ry*.3);g.lineTo(rx*.62,top+ry*.25);g.closePath();g.fill();g.stroke();
      g.fillStyle='#ff4f6b';ell(g,0,top+ry*.02,rx*.09,rx*.09);g.fill();break;
    case 'sun':g.save();g.translate(0,by-ry*.1);for(let i=0;i<10;i++){g.rotate(Math.PI*2/10);g.fillStyle=i%2?'#ffd23f':'#ff9a3d';g.beginPath();g.moveTo(-rx*.18,-ry*1.02);g.lineTo(0,-ry*1.5);g.lineTo(rx*.18,-ry*1.02);g.closePath();g.fill();}g.restore();break;
    case 'void':g.fillStyle='#120822';g.strokeStyle='#d94bff';g.beginPath();g.moveTo(-rx*1.1,by+ry*.3);g.quadraticCurveTo(-rx*1.1,top-ry*.6,0,top-ry*.65);g.quadraticCurveTo(rx*1.1,top-ry*.6,rx*1.1,by+ry*.1);g.quadraticCurveTo(rx*.5,by-ry*.6,-rx*.3,by-ry*.55);g.quadraticCurveTo(-rx*.8,by-ry*.4,-rx*.85,by+ry*.3);g.closePath();g.fill();g.stroke();
      g.fillStyle='#fff';for(const [x,y] of [[-.6,-.9],[.3,-1.25],[.7,-.7],[-.2,-1.35]]){ell(g,rx*x,by+ry*y,rx*.05,rx*.05);g.fill();}break;}}
function drawWeapon(g,L,rx,ry,by,lw,atk){const hx=rx*.92,hy=by+ry*.2;g.save();g.lineWidth=lw;
  const sw=-.7+atk*2.1;
  switch(L.weapon){
    case 'sword':g.translate(hx,hy);g.rotate(sw);g.fillStyle='#e9eef7';g.strokeStyle='#5b6680';rrect(g,-rx*.09,-ry*1.5,rx*.18,ry*1.35,rx*.06);g.fill();g.stroke();g.fillStyle='#ffcf3f';rrect(g,-rx*.3,-ry*.22,rx*.6,ry*.12,2);g.fill();g.stroke();g.fillStyle='#7a4a2a';rrect(g,-rx*.07,-ry*.1,rx*.14,ry*.32,2);g.fill();break;
    case 'axe':g.translate(hx,hy);g.rotate(sw);g.strokeStyle='#5a3a1c';g.lineWidth=rx*.14;g.beginPath();g.moveTo(0,ry*.25);g.lineTo(0,-ry*1.35);g.stroke();g.lineWidth=lw;g.fillStyle='#cfd6e2';g.strokeStyle='#4a5468';g.beginPath();g.moveTo(0,-ry*1.3);g.quadraticCurveTo(rx*.95,-ry*1.45,rx*.75,-ry*.7);g.quadraticCurveTo(rx*.35,-ry*.95,0,-ry*.85);g.closePath();g.fill();g.stroke();break;
    case 'hammer':g.translate(hx,hy);g.rotate(sw);g.strokeStyle='#5a3a1c';g.lineWidth=rx*.14;g.beginPath();g.moveTo(0,ry*.25);g.lineTo(0,-ry*1.2);g.stroke();g.lineWidth=lw;g.fillStyle='#ffd23f';g.strokeStyle='#7a5a00';rrect(g,-rx*.45,-ry*1.55,rx*.9,ry*.5,rx*.1);g.fill();g.stroke();g.fillStyle='#8fa2ff';ell(g,0,-ry*1.3,rx*.12,rx*.12);g.fill();break;
    case 'dagger':g.translate(hx,hy);g.rotate(sw+.4);g.fillStyle='#f2f5ff';g.strokeStyle='#4a5468';g.beginPath();g.moveTo(-rx*.08,0);g.lineTo(0,-ry*.85);g.lineTo(rx*.08,0);g.closePath();g.fill();g.stroke();g.fillStyle='#3a2a4a';rrect(g,-rx*.07,0,rx*.14,ry*.25,2);g.fill();break;
    case 'bow':g.translate(hx,hy-ry*.1);g.strokeStyle='#7a4a2a';g.lineWidth=rx*.12;g.beginPath();g.arc(-rx*.15,0,ry*.8,-1.2,1.2);g.stroke();g.strokeStyle='#eee';g.lineWidth=1;
      const pull=atk<.5?atk*2:2-atk*2;const sx=-rx*.15+Math.cos(1.2)*ry*.8;g.beginPath();g.moveTo(sx,-Math.sin(1.2)*ry*.8);g.lineTo(sx-pull*rx*.5,0);g.lineTo(sx,Math.sin(1.2)*ry*.8);g.stroke();
      if(atk<.55){g.strokeStyle='#5a3a1c';g.lineWidth=lw;g.beginPath();g.moveTo(sx-pull*rx*.5,0);g.lineTo(rx*.85,0);g.stroke();g.fillStyle='#ddd';g.beginPath();g.moveTo(rx*.85,-rx*.08);g.lineTo(rx*1.05,0);g.lineTo(rx*.85,rx*.08);g.fill();}break;
    case 'staff':{g.translate(hx,hy);g.rotate(-.15-atk*.35);g.strokeStyle='#6b4423';g.lineWidth=rx*.13;g.beginPath();g.moveTo(0,ry*.6);g.lineTo(0,-ry*1.25);g.stroke();
      const oc=L.orb||'#ffe36b';g.fillStyle=oc;g.shadowColor=oc;g.shadowBlur=8+atk*18;ell(g,0,-ry*1.38,rx*(.2+atk*.08),rx*(.2+atk*.08));g.fill();g.shadowBlur=0;break;}
    case 'wand':g.translate(hx,hy);g.rotate(-.3-atk*.6);g.strokeStyle='#ffffff';g.lineWidth=rx*.09;g.beginPath();g.moveTo(0,ry*.2);g.lineTo(0,-ry*.75);g.stroke();g.fillStyle='#ffe36b';g.shadowColor='#ffe36b';g.shadowBlur=6+atk*14;
      g.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rr=i%2?rx*.1:rx*.24;g.lineTo(Math.cos(a)*rr,-ry*.85+Math.sin(a)*rr);}g.fill();g.shadowBlur=0;break;
    case 'orb':{const oc=L.orb||'#9ff3ff';g.translate(hx+rx*.2,hy-ry*.55-atk*ry*.3);g.fillStyle=oc;g.shadowColor=oc;g.shadowBlur=12+atk*20;ell(g,0,0,rx*(.27+atk*.08),rx*(.27+atk*.08));g.fill();g.shadowBlur=0;g.fillStyle='rgba(255,255,255,.7)';ell(g,-rx*.08,-rx*.08,rx*.08,rx*.08);g.fill();break;}
    case 'shield':{const c=L.shieldC||'#8a5a33';g.translate(rx*.75+atk*rx*.35,by+ry*.25);g.fillStyle=c;g.strokeStyle=shade(c,-.55);ell(g,0,0,rx*.5,ry*.62);g.fill();g.stroke();g.fillStyle=shade(c,.35);ell(g,0,0,rx*.18,rx*.18);g.fill();break;}
    case 'drum':g.translate(rx*.35,by+ry*.45);g.fillStyle='#c94b4b';g.strokeStyle='#5a1f1f';rrect(g,-rx*.45,-ry*.22,rx*.9,ry*.44,4);g.fill();g.stroke();g.fillStyle='#f7f3ea';ell(g,0,-ry*.22,rx*.45,ry*.1);g.fill();g.stroke();
      g.strokeStyle='#5a3a1c';g.lineWidth=lw*1.3;g.beginPath();g.moveTo(rx*.2,-ry*.25);g.lineTo(rx*.55,-ry*.75+atk*ry*.45);g.stroke();break;}
  g.restore();
  if(L.weapon!=='shield'&&L.weapon!=='drum'){g.fillStyle=L.body;g.strokeStyle=shade(L.body,-.6);g.lineWidth=lw;ell(g,hx,hy,rx*.17,rx*.17);g.fill();g.stroke();}}
const portraitCache={};
function portrait(id,size=128){const k=id+'@'+size;if(portraitCache[k])return portraitCache[k];const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d');
  g.translate(size/2,size*.46);drawChar(g,CH[id],size*.92,{atk:.15});return portraitCache[k]=c.toDataURL();}
const spriteCache={};
function sprite(id,sz){const k=id+'@'+sz;if(spriteCache[k])return spriteCache[k];const c=document.createElement('canvas');const px=Math.ceil(sz*1.7*2);c.width=c.height=px;const g=c.getContext('2d');
  g.scale(2,2);g.translate(px/4,px/4);drawChar(g,CH[id],sz,{});return spriteCache[k]=c;}

/* ===================== UI HELPERS ===================== */
function cardHTML(id,o={}){const c=CH[id];const owned=S.save.owned[id];const locked=o.lockable&&!owned;
  return `<button class="ccard r-${c.rarity}${locked?' locked':''}${o.sel?' sel':''}" data-card="${id}" ${o.disabled?'disabled':''}>
    <div class="ccard-art"><img src="${portrait(id)}" alt=""></div>
    <div class="ccard-name">${locked?'???':esc(c.name)}</div>
    <div class="ccard-meta"><span class="rar">${RARITY[c.rarity].name}</span><span>${ROLES[c.role].name}</span></div>${o.cost?costHTML(id):''}${o.badge||''}</button>`;}
const costHTML=id=>`<div class="costdots" title="Hits needed per fighter">Cost ${'<i></i>'.repeat(costOf(id))}</div>`;
function chipHTML(a,pop){const c=CH[a.id];return `<span class="chip r-${c.rarity}${pop?' pop':''}" title="${esc(c.name)}"><img src="${portrait(a.id,64)}" alt=""><span>${esc(c.name.split(' ')[0].replace(',',''))}</span><b>×${a.count}</b></span>`;}
const main=()=>$('#main');
function go(screen,arg){cleanupScreen();S.screen=screen;S.arg=arg;sfx('click');
  const f={menu:renderMenu,collection:renderCollection,gacha:renderGacha,settings:renderSettings,prep:renderPrep,mp:renderMP,search:renderSearch,match:renderMatch}[screen];
  f(arg);window.scrollTo(0,0);}
function cleanupScreen(){VIEWS.menuDemo=null;VIEWS.altar=null;VIEWS.detail=null;VIEWS.arcade=null;}
document.addEventListener('click',e=>{const a=e.target.closest('[data-act]');if(!a)return;const act=a.dataset.act;
  if(act==='home'){if(S.screen==='match'&&S.match&&S.match.phase!=='over'){toast('Use “Leave match” to exit a match in progress.');return;}stopSearch();go('menu');}});

/* ===================== RENDER LOOP ===================== */
const VIEWS={menuDemo:null,altar:null,detail:null,arcade:null,battle:null,summon:null};
let lastT=performance.now();
function loop(now){const dt=Math.min(.05,(now-lastT)/1000);lastT=now;
  try{if(VIEWS.menuDemo)VIEWS.menuDemo.frame(dt);if(VIEWS.altar)VIEWS.altar(dt,now);if(VIEWS.detail)VIEWS.detail(dt,now);if(VIEWS.summon)VIEWS.summon(dt,now);
    if(VIEWS.arcade&&VIEWS.arcade!==VIEWS.menuDemo)VIEWS.arcade.frame(dt);if(VIEWS.battle)VIEWS.battle.frame(dt);}catch(e){console.error(e);}
  requestAnimationFrame(loop);}
requestAnimationFrame(loop);
function fitCanvas(cv,w,h){const dpr=Math.min(2,window.devicePixelRatio||1);cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);return g;}

/* ===================== ARCADE VIEW (fighters are the bumpers, 3 balls at once) ===================== */
const ARC_KEYS={l:false,r:false};
const isTyping=e=>e.target&&e.target.closest&&e.target.closest('input,select,textarea');
window.addEventListener('keydown',e=>{const a=VIEWS.arcade&&!VIEWS.arcade.demo?VIEWS.arcade:null;if(!a||isTyping(e))return;
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){ARC_KEYS.l=true;e.preventDefault();}
  else if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'){ARC_KEYS.r=true;e.preventDefault();}
  else if(e.key===' '||e.key==='Enter'||e.key==='ArrowUp'||e.key==='w'||e.key==='W'){a.m.launchAll();e.preventDefault();}});
window.addEventListener('keyup',e=>{if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')ARC_KEYS.l=false;if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')ARC_KEYS.r=false;});
const BALL_C=['#fff3b0','#9ff3ff','#ffb3d1'];
const ROLE_C={warrior:'#5b8cff',archer:'#3fbf6f',mage:'#a35bff',tank:'#c98a4b',assassin:'#e0527a',healer:'#4fc8d6',support:'#e8b33f'};
class ArcadeView{
  constructor(cv,o={}){this.cv=cv;this.g=fitCanvas(cv,AR.W,AR.H);this.demo=!!o.demo;this.types=o.types||[];
    this.onBump=o.onBump||(()=>{});this.onHud=o.onHud||(()=>{});this.onFinish=o.onFinish||(()=>{});
    this.m=new Machine(this.types,Math.random,{countdown:this.demo?0:AR.countdown});this.target=AR.W/2;this.t=0;this.parts=[];this.texts=[];this.trails=[[],[],[]];this.finished=false;this.rt=0;this.shake=0;
    this.imgs={};for(const id of this.types){const im=new Image();im.src=portrait(id,96);this.imgs[id]=im;}
    if(!this.demo){cv.style.touchAction='none';
      const aim=e=>{const r=cv.getBoundingClientRect();if(r.width)this.target=(e.clientX-r.left)/r.width*AR.W;};
      cv.addEventListener('pointermove',aim);
      cv.addEventListener('pointerdown',e=>{aim(e);try{cv.setPointerCapture(e.pointerId);}catch(_){}this.m.launchAll();});}}
  frame(dt){this.t+=dt;const m=this.m;
    if(this.demo){this.rt-=dt;if(this.rt<=0){this.rt=.1;this.target=steerTarget(m,Math.random,10,.6);}m.movePaddle(this.target,dt,520);
      if(m.t>AR.roundTime-.5){this.m=new Machine(this.types,Math.random,{countdown:0});this.trails=[[],[],[]];}}
    else{if(ARC_KEYS.l)this.target-=620*dt;if(ARC_KEYS.r)this.target+=620*dt;this.target=Math.max(AR.padW/2,Math.min(AR.W-AR.padW/2,this.target));m.movePaddle(this.target,dt,0);}
    if(!m.done)m.step(dt);
    for(const e of m.events){
      if(e.k==='bump'){const c=CH[e.id],col=RARITY[c.rarity].color;
        for(let i=0;i<(e.unit?16:6);i++){const a=Math.random()*6.28,v=60+Math.random()*(e.unit?200:110);this.parts.push({x:e.x,y:e.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:.45,c:e.unit?'#7dff8a':col});}
        if(e.unit)this.texts.push({x:e.x+AR.card+14,y:e.y-AR.card+4,s:'+1',c:'#7dff8a',l:.9});
        if(!this.demo){sfx(e.unit?'land':'peg',2+e.prog*2);if(e.unit)this.onBump(e.id);}}
      else if(e.k==='paddle'){for(let i=0;i<5;i++)this.parts.push({x:e.x,y:AR.padY,vx:(Math.random()-.5)*140,vy:-Math.random()*90,gr:300,l:.35,c:'#3fe0b0'});
        if(e.speedUp)this.texts.push({x:Math.max(50,Math.min(AR.W-50,e.x)),y:AR.padY-26,s:'+1 speed',c:'#7dff8a',l:.7,small:true});if(!this.demo)sfx('click');}
      else if(e.k==='count'&&!this.demo){if(e.n>0){this.texts.push({x:AR.W/2,y:AR.H*.5,s:String(e.n),c:'#ffd23f',l:.9,huge:true});sfx('click');}}
      else if(e.k==='go'&&!this.demo){this.texts.push({x:AR.W/2,y:AR.H*.5,s:'GO!',c:'#7dff8a',l:.8,huge:true});sfx('double');}
      else if(e.k==='drop'){this.texts.push({x:Math.max(60,Math.min(AR.W-60,e.x)),y:AR.H-30,s:'Missed!',c:'#ff6a55',l:.9});this.shake=5;if(!this.demo)sfx('lose');}}
    m.events.length=0;
    if(m.done&&!this.finished&&!this.demo){this.finished=true;sfx('land');this.onFinish(Object.assign({},m.counts));}
    m.balls.forEach((b,i)=>{const tr=this.trails[i];if(b.state==='play'){tr.push([b.x,b.y]);const max=7+Math.round((b.s-AR.speed0)/25);while(tr.length>max)tr.shift();}else tr.length=0;});
    for(const p of this.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.gr||0)*dt;p.l-=dt;}this.parts=this.parts.filter(p=>p.l>0);
    for(const x of this.texts){x.y-=30*dt;x.l-=dt;}this.texts=this.texts.filter(x=>x.l>0);
    if(this.shake>0)this.shake=Math.max(0,this.shake-dt*30);
    this.draw();
    if(!this.demo)this.onHud({left:Math.max(0,AR.roundTime-m.t),pre:m.pre,inPlay:m.balls.filter(b=>b.state==='play').length,waiting:m.balls.some(b=>b.state==='wait'),total:m.total,done:m.done});}
  draw(){const g=this.g,W=AR.W,H=AR.H,m=this.m,R=AR.ballR;g.save();g.clearRect(0,0,W,H);if(this.shake>0)g.translate((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake);
    const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#123c44');gr.addColorStop(1,'#0b262b');g.fillStyle=gr;rrect(g,0,0,W,H,18);g.fill();
    g.strokeStyle='rgba(255,255,255,.05)';g.lineWidth=1;for(let y=40;y<H;y+=40){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}
    g.strokeStyle='rgba(255,210,63,.45)';g.lineWidth=4;g.beginPath();g.moveTo(3,H);g.lineTo(3,3);g.lineTo(W-3,3);g.lineTo(W-3,H);g.stroke();
    g.fillStyle='rgba(255,106,85,.12)';g.fillRect(0,AR.padY+24,W,H-AR.padY-24);
    for(const C of m.cards){const c=CH[C.id],col=RARITY[c.rarity].color,f=Math.max(0,C.flash),p=Math.max(0,C.pop),h=C.h*(1+p*.12);
      g.fillStyle='rgba(0,0,0,.35)';rrect(g,C.x-h+3,C.y-h+5,h*2,h*2,7);g.fill();
      g.fillStyle=f>0?'#ffffff':(ROLE_C[c.role]||col);g.globalAlpha=1;rrect(g,C.x-h,C.y-h,h*2,h*2,7);g.fill();g.lineWidth=3;g.strokeStyle=col;g.stroke();
      if(f<=0){g.fillStyle='rgba(255,255,255,.25)';rrect(g,C.x-h,C.y-h,h*2,h*.7,7);g.fill();}
      if(f>0){g.shadowColor='#fff';g.shadowBlur=18*f;g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=2;g.strokeRect(C.x-h-5,C.y-h-5,h*2+10,h*2+10);g.shadowBlur=0;}
      const im=this.imgs[C.id];if(im&&im.complete){g.save();g.globalAlpha=f>0?.75:1;g.drawImage(im,C.x-h*1.15,C.y-h*1.2,h*2.3,h*2.3);g.restore();}
      const dr=5.5,gap=14,x0=C.x-(C.cost-1)*gap/2;
      for(let i=0;i<C.cost;i++){const on=i<C.prog,dx=x0+i*gap,dy=C.y-h-11;g.fillStyle=on?'#3bff6e':'#07181b';g.shadowColor='#3bff6e';g.shadowBlur=on?10:0;ell(g,dx,dy,dr+.5,dr+.5);g.fill();g.shadowBlur=0;
        g.lineWidth=1.5;g.strokeStyle=on?'#c8ffd4':'rgba(255,255,255,.35)';g.stroke();}
      const n=m.counts[C.id]||0;if(n&&!this.demo){g.font=(16+p*8)+'px "Lilita One",sans-serif';const right=C.x+h+40<=AR.W;g.textAlign=right?'left':'right';
        g.lineWidth=4;g.strokeStyle='#0a2226';const tx=right?C.x+h+5:C.x-h-5;g.strokeText('x'+n,tx,C.y+6);g.fillStyle='#fff';g.fillText('x'+n,tx,C.y+6);g.textAlign='center';}}
    m.balls.forEach((b,i)=>{if(b.state==='down')return;const col=BALL_C[i],tr=this.trails[i],n=tr.length;
      if(n>1){for(let j=1;j<n;j++){const a=tr[j-1],c=tr[j];g.globalAlpha=(j/n)*.7;g.strokeStyle=col;g.lineWidth=R*2*(j/n);g.lineCap='round';g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(c[0],c[1]);g.stroke();}}g.globalAlpha=1;
      const hot=(b.s-AR.speed0)/(AR.speedMax-AR.speed0);g.fillStyle=col;g.shadowColor=hot>.6?'#ff6a55':col;g.shadowBlur=8+hot*16;ell(g,b.x,b.y,R,R);g.fill();g.shadowBlur=0;
      g.fillStyle='rgba(255,255,255,.8)';ell(g,b.x-R*.3,b.y-R*.35,R*.3,R*.3);g.fill();});
    const pw=AR.padW,px=m.px;g.fillStyle='#3fe0b0';g.shadowColor='#3fe0b0';g.shadowBlur=12;rrect(g,px-pw/2,AR.padY,pw,AR.padH,6);g.fill();g.shadowBlur=0;
    g.fillStyle='rgba(0,38,27,.55)';for(const f of [-.5,0,.5])g.fillRect(px+f*pw/2-1,AR.padY+3,2,AR.padH-6);
    for(const p of this.parts){g.globalAlpha=Math.max(0,Math.min(1,p.l*2));g.fillStyle=p.c;g.fillRect(p.x-2,p.y-2,4,4);}g.globalAlpha=1;
    g.textAlign='center';
    for(const x of this.texts){g.globalAlpha=Math.min(1,x.l*2);g.font=(x.huge?'96px':x.small?'15px':'24px')+' "Lilita One",sans-serif';g.lineWidth=5;g.strokeStyle='#0a2226';g.strokeText(x.s,x.x,x.y);g.fillStyle=x.c;g.fillText(x.s,x.x,x.y);}g.globalAlpha=1;
    if(!this.demo){if(m.started&&m.balls.some(b=>b.state==='wait'&&b.wt>.3)&&!m.done){g.font='600 13px Rubik,sans-serif';g.fillStyle='rgba(242,247,238,.75)';g.fillText('Click, tap or press Space to launch',W/2,AR.padY-30);}
      if(m.done){g.font='36px "Lilita One",sans-serif';g.lineWidth=6;g.strokeStyle='#0a2226';g.strokeText('Time!',W/2,H*.47);g.fillStyle='#ffd23f';g.fillText('Time!',W/2,H*.47);}}
    g.restore();}
}

/* ===================== BATTLE VIEW ===================== */
class BattleView{
  constructor(cv,st,mySide,onDone){this.cv=cv;this.g=fitCanvas(cv,ARENA.W,ARENA.H);this.st=st;this.my=mySide;this.onDone=onDone;this.acc=0;this.speed=S.save.speed||2;
    this.parts=[];this.texts=[];this.rings=[];this.lines=[];this.shake=0;this.time=0;this.reported=false;this.bg=this.makeBg();
    const n=st.units.length;this.sz=n<=50?38:n<=110?31:n<=200?26:22;this.anim=new Map();this.intro=1.2;}
  makeBg(){const c=document.createElement('canvas');c.width=ARENA.W;c.height=ARENA.H;const g=c.getContext('2d');
    const gr=g.createLinearGradient(0,0,0,ARENA.H);gr.addColorStop(0,'#2f7a4f');gr.addColorStop(1,'#245f3e');g.fillStyle=gr;g.fillRect(0,0,ARENA.W,ARENA.H);
    for(let x=0;x<ARENA.W;x+=50)for(let y=0;y<ARENA.H;y+=50)if(((x+y)/50)%2===0){g.fillStyle='rgba(255,255,255,.035)';g.fillRect(x,y,50,50);}
    for(let i=0;i<260;i++){g.fillStyle=`rgba(${120+Math.random()*80|0},${200+Math.random()*55|0},120,.25)`;const x=Math.random()*ARENA.W,y=Math.random()*ARENA.H;g.fillRect(x,y,2,5);}
    g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=3;g.setLineDash([14,12]);g.beginPath();g.moveTo(ARENA.W/2,0);g.lineTo(ARENA.W/2,ARENA.H);g.stroke();g.setLineDash([]);
    g.fillStyle='rgba(63,224,176,.10)';g.fillRect(0,0,90,ARENA.H);g.fillStyle='rgba(255,106,85,.10)';g.fillRect(ARENA.W-90,0,90,ARENA.H);
    return c;}
  X(x){return this.my===1?ARENA.W-x:x;}
  A(u){let a=this.anim.get(u.uid);if(!a){a={at:0,fl:0,px:u.x,py:u.y,mv:0};this.anim.set(u.uid,a);}return a;}
  skip(){while(!this.st.done){stepBattle(this.st);this.st.ev.length=0;}this.parts=[];this.rings=[];this.lines=[];this.texts=[];}
  frame(dt){this.time+=dt;if(this.intro>0)this.intro-=dt;
    else if(!this.st.done){this.acc+=dt*this.speed;let n=0;while(this.acc>=DT&&n<16&&!this.st.done){stepBattle(this.st);this.consume();this.acc-=DT;n++;}if(n>=16)this.acc=0;}
    if(this.st.done&&!this.reported){this.reported=true;setTimeout(()=>this.onDone(battleResult(this.st)),700);}
    const fx=S.save.fx;
    for(const p of this.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.gr||0)*dt;p.l-=dt;}this.parts=this.parts.filter(p=>p.l>0);
    for(const r of this.rings)r.l-=dt;this.rings=this.rings.filter(r=>r.l>0);
    for(const l of this.lines)l.l-=dt;this.lines=this.lines.filter(l=>l.l>0);
    for(const t of this.texts){t.y-=28*dt;t.l-=dt;}this.texts=this.texts.filter(t=>t.l>0);
    if(this.shake>0)this.shake=Math.max(0,this.shake-dt*30);
    if(!fx){this.parts.length=Math.min(this.parts.length,60);}
    this.draw();}
  consume(){const ev=this.st.ev;for(const e of ev){
      if(e.k==='atk'){const a=this.A(e.u);a.at=.22;a.tx=e.t.x;a.ty=e.t.y;
        if(!isRanged(e.u.d)){const r=e.u.d.role;this.rings.push({k:'slash',x:e.t.x,y:e.t.y,r:this.sz*.55,l:.18,m:.18,c:r==='assassin'?'#ffd0ff':r==='tank'?'#cfe8ff':'#fff',dir:e.t.x>e.u.x?1:-1});}}
      else if(e.k==='hit'){this.A(e.u).fl=.12;sfx('hit');}
      else if(e.k==='num'&&S.save.fx){this.texts.push({x:e.x,y:e.y-this.sz*.6,s:Math.round(e.a),l:.8,c:e.crit?'#ffd23f':'#fff',big:e.crit});}
      else if(e.k==='heal'){if(this.parts.length<500)this.parts.push({x:e.u.x+(Math.random()-.5)*10,y:e.u.y-this.sz*.3,vx:0,vy:-30,l:.6,c:'#7cffb2',plus:true});}
      else if(e.k==='die'){const c=e.u.side===this.my?'#3fe0b0':'#ff6a55';for(let i=0;i<10;i++)this.parts.push({x:e.u.x,y:e.u.y,vx:(Math.random()-.5)*160,vy:-Math.random()*140,gr:260,l:.6,c:i%2?c:'#fff'});
        this.parts.push({x:e.u.x,y:e.u.y-6,vx:0,vy:-40,l:.9,c:'rgba(255,255,255,.8)',ghost:true});}
      else if(e.k==='aoe'){this.rings.push({k:'ring',x:e.x,y:e.y,r:e.r,l:e.big?.5:.32,m:e.big?.5:.32,c:e.c});if(e.big){this.shake=Math.max(this.shake,8);sfx('boom');}
        for(let i=0;i<(e.big?18:6);i++){const a=Math.random()*6.28,s=Math.random()*e.r*2;this.parts.push({x:e.x,y:e.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:.4,c:e.c});}}
      else if(e.k==='cleave')this.rings.push({k:'arc',x:e.x,y:e.y,r:e.r,l:.25,m:.25,c:'#ffe0c0'});
      else if(e.k==='chain')this.lines.push({pts:e.pts,l:.3,c:'#9ff3ff'});
      else if(e.k==='tp'){this.lines.push({pts:[[e.x0,e.y0],[e.u.x,e.u.y]],l:.25,c:'#c9a6ff',w:6});for(let i=0;i<12;i++)this.parts.push({x:e.u.x,y:e.u.y,vx:(Math.random()-.5)*120,vy:(Math.random()-.5)*120,l:.4,c:'#8b5cff'});}
      else if(e.k==='revive'){this.rings.push({k:'ring',x:e.u.x,y:e.u.y,r:70,l:.8,m:.8,c:'#ffd23f'});this.texts.push({x:e.u.x,y:e.u.y-30,s:'REBORN!',l:1.2,c:'#ffd23f',big:true});this.shake=10;}
      else if(e.k==='aegis'){this.rings.push({k:'ring',x:e.u.x,y:e.u.y,r:95,l:.8,m:.8,c:'#fff3b0'});this.texts.push({x:e.u.x,y:e.u.y-30,s:'AEGIS!',l:1.2,c:'#fff3b0',big:true});}
      else if(e.k==='stun')this.texts.push({x:e.u.x,y:e.u.y-this.sz*.7,s:'✶',l:.5,c:'#ffe36b'});
      else if(e.k==='bloom')this.rings.push({k:'ring',x:e.x,y:e.y,r:e.r,l:.35,m:.35,c:'#7cffb2'});
      else if(e.k==='pulse'&&S.save.fx&&Math.random()<.35)this.rings.push({k:'ring',x:e.u.x,y:e.u.y,r:e.r,l:.4,m:.4,c:'rgba(255,210,63,.6)',thin:true});}
    ev.length=0;}
  draw(){const g=this.g,st=this.st,sz=this.sz;g.save();if(this.shake>0)g.translate((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake);
    g.drawImage(this.bg,this.my===1?0:0,0);
    for(const z of st.zones){const x=this.X(z.x);if(z.k==='meteor'){const u=z.age/z.delay;g.strokeStyle='rgba(255,120,60,.9)';g.lineWidth=3;g.setLineDash([8,6]);ell(g,x,z.y,z.r,z.r*.6);g.stroke();g.setLineDash([]);
        g.fillStyle='rgba(255,140,60,.18)';ell(g,x,z.y,z.r*u,z.r*.6*u);g.fill();g.fillStyle='#ffb23f';g.shadowColor='#ff7a2e';g.shadowBlur=20;ell(g,x+(1-u)*120,z.y-(1-u)*300,14,14);g.fill();g.shadowBlur=0;}
      else{const a=this.time*5;const gr=g.createRadialGradient(x,z.y,0,x,z.y,z.r);gr.addColorStop(0,'rgba(10,0,20,.95)');gr.addColorStop(.5,'rgba(120,20,180,.45)');gr.addColorStop(1,'rgba(217,75,255,0)');g.fillStyle=gr;ell(g,x,z.y,z.r,z.r*.7);g.fill();
        g.strokeStyle='rgba(217,75,255,.8)';g.lineWidth=2;for(let i=0;i<3;i++){g.beginPath();g.ellipse(x,z.y,z.r*(.3+i*.22),z.r*(.2+i*.15),a+i,0,4);g.stroke();}}}
    const alive=st.units.filter(u=>u.alive).sort((a,b)=>a.y-b.y);
    for(const u of alive){const a=this.A(u),x=this.X(u.x);const moved=Math.abs(u.x-a.px)+Math.abs(u.y-a.py);a.px=u.x;a.py=u.y;a.mv=moved>.2?Math.min(1,a.mv+.2):Math.max(0,a.mv-.1);
      if(a.at>0)a.at-=1/60;if(a.fl>0)a.fl-=1/60;
      let face=u.side===0?1:-1;if(u.tgt&&u.tgt.alive)face=u.tgt.x>=u.x?1:-1;if(this.my===1)face=-face;
      let ox=0,oy=-Math.abs(Math.sin(this.time*12+u.uid))*sz*.07*a.mv;
      if(a.at>0){const p=Math.sin(Math.PI*(1-a.at/.22));if(isRanged(u.d))ox=-face*p*sz*.1;else{ox=face*p*sz*.32;oy-=p*sz*.08;}}
      const teamC=u.side===this.my?'#3fe0b0':'#ff6a55';g.fillStyle=teamC;g.globalAlpha=.55;ell(g,x,u.y+sz*.38,sz*.36,sz*.12);g.fill();g.globalAlpha=1;
      if(u.inv>0){g.strokeStyle='#fff3b0';g.lineWidth=3;g.shadowColor='#ffe36b';g.shadowBlur=14;ell(g,x,u.y,sz*.55,sz*.55);g.stroke();g.shadowBlur=0;}
      const sp=sprite(u.id,sz),w=sz*1.7;g.save();g.translate(x+ox,u.y+oy);if(face<0)g.scale(-1,1);
      if(u.stun>0)g.rotate(Math.sin(this.time*20)*.08);g.drawImage(sp,-w/2,-w/2,w,w);
      if(a.fl>0){g.globalCompositeOperation='lighter';g.globalAlpha=Math.min(.6,a.fl*5);g.drawImage(sp,-w/2,-w/2,w,w);g.globalCompositeOperation='source-over';g.globalAlpha=1;}
      g.restore();
      if(u.slow>0){g.fillStyle='rgba(127,216,255,.35)';ell(g,x,u.y,sz*.4,sz*.4);g.fill();}
      if(u.bleedT>0&&Math.random()<.2)this.parts.push({x:u.x+(Math.random()-.5)*10,y:u.y-sz*.2,vx:0,vy:-40,l:.4,c:'#ff7a2e'});
      if(u.hp<u.max){const bw=sz*.8,bh=Math.max(3,sz*.1),by=u.y-sz*.62;g.fillStyle='rgba(0,0,0,.55)';g.fillRect(x-bw/2-1,by-1,bw+2,bh+2);g.fillStyle=u.hp/u.max>.5?teamC:u.hp/u.max>.25?'#ffd23f':'#ff4f4f';g.fillRect(x-bw/2,by,bw*Math.max(0,u.hp/u.max),bh);}}
    for(const p of st.proj){const x=this.X(p.x),tx=this.X(p.tx);
      if(p.kind==='archer'){const dx=tx-x,dy=p.ty-p.y,d=Math.hypot(dx,dy)||1;g.strokeStyle='#f6e7c8';g.lineWidth=2.5;g.beginPath();g.moveTo(x-dx/d*14,p.y-dy/d*14);g.lineTo(x,p.y);g.stroke();g.fillStyle='#ddd';ell(g,x,p.y,2.5,2.5);g.fill();}
      else if(p.kind==='heal'){g.fillStyle='#7cffb2';g.shadowColor='#7cffb2';g.shadowBlur=10;ell(g,x,p.y,5,5);g.fill();g.shadowBlur=0;}
      else{const c=p.c||(p.kind==='support'?'#ffd23f':'#ff9a4d');g.fillStyle=c;g.shadowColor=c;g.shadowBlur=14;ell(g,x,p.y,6,6);g.fill();g.shadowBlur=0;}}
    for(const r of this.rings){const x=this.X(r.x),f=1-r.l/r.m;g.globalAlpha=Math.max(0,r.l/r.m);g.strokeStyle=r.c;
      if(r.k==='slash'){const dir=this.my===1?-r.dir:r.dir;g.lineWidth=4;g.beginPath();g.arc(x-dir*r.r*.3,r.y,r.r,(dir>0?-1.2:Math.PI-.4)+f*.6,(dir>0?.4:Math.PI+1.2)+f*.6);g.stroke();}
      else if(r.k==='arc'){g.lineWidth=5;g.beginPath();g.arc(x,r.y,r.r*(.6+f*.4),0,Math.PI*2);g.stroke();}
      else{g.lineWidth=r.thin?2:4;ell(g,x,r.y,r.r*(.3+f*.7),r.r*(.3+f*.7)*.65);g.stroke();if(!r.thin){g.fillStyle=r.c;g.globalAlpha*=.18;g.fill();}}}
    g.globalAlpha=1;
    for(const l of this.lines){g.globalAlpha=l.l/.3;g.strokeStyle=l.c;g.lineWidth=l.w||3;g.shadowColor=l.c;g.shadowBlur=12;g.beginPath();l.pts.forEach((p,i)=>{const x=this.X(p[0]);if(i===0)g.moveTo(x,p[1]);else{const q=l.pts[i-1];const mx=(this.X(q[0])+x)/2+(Math.random()-.5)*16,my=(q[1]+p[1])/2+(Math.random()-.5)*16;g.lineTo(mx,my);g.lineTo(x,p[1]);}});g.stroke();g.shadowBlur=0;}
    for(const p of this.parts){const x=this.X(p.x);g.globalAlpha=Math.max(0,Math.min(1,p.l*2));g.fillStyle=p.c;
      if(p.plus){g.font='bold 14px Rubik,sans-serif';g.textAlign='center';g.fillText('+',x,p.y);}else if(p.ghost){ell(g,x,p.y,6,8);g.fill();}else g.fillRect(x-2,p.y-2,4,4);}
    g.globalAlpha=1;
    for(const t of this.texts){g.globalAlpha=Math.min(1,t.l*2);g.font=(t.big?'26px':'17px')+' "Lilita One",sans-serif';g.textAlign='center';g.lineWidth=4;g.strokeStyle='#0a2226';const x=this.X(t.x);g.strokeText(t.s,x,t.y);g.fillStyle=t.c;g.fillText(t.s,x,t.y);}
    g.globalAlpha=1;
    if(this.intro>0){g.fillStyle=`rgba(5,22,25,${Math.min(.6,this.intro*.6)})`;g.fillRect(0,0,ARENA.W,ARENA.H);g.font='80px "Lilita One",sans-serif';g.textAlign='center';g.textBaseline='middle';g.lineWidth=8;g.strokeStyle='#0a2226';
      const s=this.intro>.6?'READY':'FIGHT!';g.strokeText(s,ARENA.W/2,ARENA.H/2);g.fillStyle='#ffd23f';g.fillText(s,ARENA.W/2,ARENA.H/2);g.textBaseline='alphabetic';}
    g.restore();}
  counts(){const a=[0,0],h=[0,0],m=[0,0];for(const u of this.st.units){m[u.side]+=u.max;if(u.alive){a[u.side]++;h[u.side]+=u.hp;}}return {a,f:[h[0]/m[0]||0,h[1]/m[1]||0]};}
}

/* ===================== MENU ===================== */
function renderMenu(){const st=S.save.stats;const own=ownedIds().length;
  main().innerHTML=`<section class="hero">
    <div><h1>Bounce. Build.<span>Brawl.</span></h1>
      <p>Collect little fighters. They hang as cards in the arcade machine while three balls bounce around at once: keep the balls up with the paddle, fill a card's dots with hits, and you get one more of that troop. Then the armies crash together. First to 3 round wins takes the match.</p>
      <div class="stats-line">${own}/${CHARS.length} fighters collected · ${st.w} wins · ${st.l} losses</div></div>
    <canvas id="demo" aria-label="Arcade machine demo"></canvas></section>
  <section class="tiles">
    <button class="tile big" data-go="play"><span class="glyph">▶</span><b>Play</b><span>Quick match online — a bot steps in if nobody's around</span></button>
    <button class="tile" data-go="mp"><span class="glyph">⇄</span><b>Multiplayer</b><span>Matchmaking, private codes, invite a friend</span></button>
    <button class="tile" data-go="bot"><span class="glyph">◆</span><b>Play vs Bot</b><span>Easy, Medium or Hard</span></button>
    <button class="tile" data-go="collection"><span class="glyph">▦</span><b>Collection</b><span>${own} of ${CHARS.length} fighters</span></button>
    <button class="tile" data-go="gacha"><span class="glyph">✦</span><b>Summon</b><span>${GACHA.cost1} shards per pull</span></button>
    <button class="tile" data-go="settings"><span class="glyph">⚙</span><b>Settings</b><span>Name, sound, battle speed</span></button>
  </section>`;
  VIEWS.menuDemo=new ArcadeView($('#demo'),{demo:true,types:CHARS.map(c=>c.id).sort(()=>Math.random()-.5).slice(0,7)});
  main().querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{const k=b.dataset.go;
    if(k==='play'){if(NET.status==='off'){toast('Online play is unavailable here — starting a Medium bot match.');go('prep',{kind:'bot',diff:'medium'});}else go('prep',{kind:'quick'});}
    else if(k==='bot')go('prep',{kind:'botpick'});else go(k);});}

/* ===================== COLLECTION ===================== */
function renderCollection(){let filter='all';
  const draw=()=>{const list=CHARS.filter(c=>filter==='all'||(filter==='owned'?S.save.owned[c.id]:c.rarity===filter));
    $('#cgrid').innerHTML=list.map(c=>cardHTML(c.id,{lockable:true,badge:S.save.owned[c.id]>1?`<span class="badge">×${S.save.owned[c.id]}</span>`:''})).join('');
    main().querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.dataset.f===filter));};
  main().innerHTML=`<div class="shead"><h2>Collection <span class="sub" style="font-family:var(--body);font-size:16px">${ownedIds().length}/${CHARS.length}</span></h2>
    <div class="tabs">${['all','owned',...RORDER].map(f=>`<button class="tab" data-f="${f}">${f==='all'?'All':f==='owned'?'Owned':RARITY[f].name}</button>`).join('')}</div>
    <button class="btn sm ghost" data-act="home">Back</button></div><div class="grid" id="cgrid"></div>`;
  main().querySelectorAll('.tab').forEach(t=>t.onclick=()=>{filter=t.dataset.f;draw();});
  $('#cgrid').onclick=e=>{const c=e.target.closest('[data-card]');if(c)showDetail(c.dataset.card);};draw();}
const STATMAX={hp:580,atk:38,dps:46,range:265,spd:115};
function showDetail(id){const c=CH[id],owned=S.save.owned[id];const m=document.createElement('div');m.className='modal';
  const bar=(lbl,v,max,txt)=>`<div class="statbar"><span>${lbl}</span><div class="bar"><i style="width:${Math.min(100,v/max*100)}%"></i></div><span class="num">${txt}</span></div>`;
  m.innerHTML=`<div class="mbox r-${c.rarity}" role="dialog" aria-label="${esc(c.name)}"><button class="btn sm ghost xclose" data-x>Close</button>
    <div class="detail"><div><canvas id="dcv"></canvas></div><div class="stack" style="gap:8px">
      <div><span class="ccard-meta" style="justify-content:flex-start"><span class="rar">${RARITY[c.rarity].name}</span><span>${ROLES[c.role].name}</span></span>
      <h2 style="margin-top:4px">${owned?esc(c.name):'Locked fighter'}</h2>
      <div class="sub" style="font-size:13px">${owned?`Owned ×${owned}`:`Summon to unlock · duplicates refund ${RARITY[c.rarity].refund} shards`}</div></div>
      ${bar('Health',c.hp,STATMAX.hp,c.hp)}${bar('Damage',c.atk,STATMAX.atk,c.atk)}${bar('Atk speed',c.as,1.3,c.as.toFixed(2)+'/s')}
      ${bar('Range',c.range,STATMAX.range,c.range>60?c.range:'Melee')}${bar('Move',c.spd,STATMAX.spd,c.spd)}
      <div class="ability"><b>${esc(c.ab.name)}</b><div>${esc(c.ab.desc)}</div></div>${costHTML(id)}
      <div style="font-size:13px"><span style="color:var(--mint)">Strong:</span> ${ROLES[c.role].good}. <span style="color:var(--coral)">Weak:</span> ${ROLES[c.role].bad}.</div>
    </div></div></div>`;
  document.body.appendChild(m);const close=()=>{VIEWS.detail=null;m.remove();};
  m.onclick=e=>{if(e.target===m||e.target.closest('[data-x]'))close();};
  const cv=m.querySelector('#dcv');const g=fitCanvas(cv,240,240);let t=0;const parts=[];
  VIEWS.detail=dt=>{t+=dt;const cyc=t%2.2,atk=cyc>1.2&&cyc<1.8?(cyc-1.2)/.6:0;g.clearRect(0,0,240,240);
    g.fillStyle=RARITY[c.rarity].color;g.globalAlpha=.16;ell(g,120,130,100,100);g.fill();g.globalAlpha=1;
    g.save();g.translate(95+(isRanged(c)?0:Math.sin(atk*Math.PI)*22),120);if(!owned)g.filter='brightness(0) opacity(.5)';drawChar(g,c,150,{atk,bob:Math.abs(Math.sin(t*3))*3});g.restore();
    if(owned&&atk>.3&&Math.random()<.5){const col=c.look.orb||(c.role==='healer'?'#7cffb2':c.role==='archer'?'#f6e7c8':'#fff');parts.push({x:150,y:100+Math.random()*40,vx:120+Math.random()*80,vy:(Math.random()-.5)*40,l:.6,c:col});}
    for(const p of parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt;}for(let i=parts.length-1;i>=0;i--)if(parts[i].l<=0)parts.splice(i,1);
    for(const p of parts){g.globalAlpha=Math.max(0,p.l*1.6);g.fillStyle=p.c;ell(g,p.x,p.y,4,4);g.fill();}g.globalAlpha=1;};}

/* ===================== GACHA ===================== */
function renderGacha(){const sv=S.save;
  main().innerHTML=`<div class="shead"><h2>Summoning Altar</h2><button class="btn sm ghost" data-act="home">Back</button></div>
  <div class="gacha"><div class="altar"><canvas id="altar"></canvas><div class="acts">
      <button class="btn" id="p1"><span class="shard"></span>${GACHA.cost1} · Summon ×1</button>
      <button class="btn grape" id="p10"><span class="shard"></span>${GACHA.cost10} · Summon ×10</button></div></div>
    <div class="stack"><div class="panel"><h3>Drop rates</h3><div class="rates" style="margin-top:10px">${RORDER.map(r=>`<span style="color:${RARITY[r].color}">${RARITY[r].name}</span><span class="num">${RARITY[r].w}%</span>`).join('')}</div></div>
      <div class="panel"><h3>Pity</h3><div style="font-size:14px;margin-top:6px">Epic or better guaranteed within <b class="num" id="pt10">${GACHA.soft-sv.pity10}</b> pulls</div><div class="pitybar"><i style="width:${sv.pity10/GACHA.soft*100}%"></i></div>
        <div style="font-size:14px;margin-top:10px">Legendary or better guaranteed within <b class="num">${GACHA.hard-sv.pity50}</b> pulls</div><div class="pitybar"><i style="width:${sv.pity50/GACHA.hard*100}%"></i></div></div>
      <div class="panel" style="font-size:13.5px;color:var(--muted)">Duplicates refund shards: ${RORDER.map(r=>`<span style="color:${RARITY[r].color}">${RARITY[r].refund}</span>`).join(' / ')}. Earn shards by playing matches — wins pay more, harder opponents pay most. Shards are fictional, no real money involved.</div></div></div>`;
  const cv=$('#altar');const w=cv.clientWidth||600,h=w*11/16;const g=fitCanvas(cv,w,h);let t=0;
  VIEWS.altar=dt=>{t+=dt;drawAltar(g,w,h,t,1,'#ffd23f');};
  $('#p1').disabled=sv.shards<GACHA.cost1;$('#p10').disabled=sv.shards<GACHA.cost10;
  $('#p1').onclick=()=>doPull(1);$('#p10').onclick=()=>doPull(10);}
function drawAltar(g,w,h,t,speed,col){g.clearRect(0,0,w,h);const cx=w/2,cy=h*.42,R=Math.min(w,h)*.3;
  const gr=g.createRadialGradient(cx,cy,0,cx,cy,R*1.6);gr.addColorStop(0,col+'55');gr.addColorStop(1,'transparent');g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.save();g.translate(cx,cy);g.scale(1,.42);for(let k=0;k<3;k++){g.save();g.rotate(t*speed*(k%2?-1:1)*(.4+k*.3));g.strokeStyle=col;g.globalAlpha=.6-k*.15;g.lineWidth=3-k*.6;
    g.beginPath();g.arc(0,0,R*(1-k*.22),0,Math.PI*2);g.stroke();for(let i=0;i<12;i++){g.rotate(Math.PI/6);g.fillStyle=col;g.fillRect(R*(1-k*.22)-4,-4,8,8);}g.restore();}g.restore();
  g.fillStyle='#0a2226';ell(g,cx,cy+R*.62,R*.9,R*.18);g.fill();
  for(let i=0;i<24;i++){const a=t*speed*1.5+i*.26,rr=R*(.6+((i*37)%10)/14);g.fillStyle=col;g.globalAlpha=.5+.5*Math.sin(t*3+i);ell(g,cx+Math.cos(a)*rr,cy+Math.sin(a)*rr*.42-((t*40+i*20)%(R*.8)),2,2);g.fill();}
  g.globalAlpha=1;g.fillStyle=col;g.shadowColor=col;g.shadowBlur=30;ell(g,cx,cy-R*.15+Math.sin(t*2)*6,R*.16,R*.16);g.fill();g.shadowBlur=0;}
function doPull(n){const sv=S.save,cost=n===1?GACHA.cost1:GACHA.cost10;if(sv.shards<cost){toast('Not enough shards — play matches to earn more.');return;}
  sv.shards-=cost;const res=gachaPull(sv,n);sv.stats.pulls+=n;persist();
  const top=res.reduce((m,r)=>Math.max(m,RIDX[r.rarity]),0);const col=RARITY[RORDER[top]].color;
  const ov=document.createElement('div');ov.className='summon';ov.innerHTML=`<canvas></canvas><div class="reveal ${n===1?'one':''}" id="rv"></div><div class="bar"><button class="btn ghost" id="sk">Skip</button></div>`;
  document.body.appendChild(ov);const cv=ov.querySelector('canvas');const W=innerWidth,H=innerHeight;const g=fitCanvas(cv,W,H);let t=0,phase=0;sfx('summon');
  const finish=()=>{if(phase>=2)return;phase=2;showCards();};
  VIEWS.summon=dt=>{t+=dt;const p=Math.min(1,t/1.8);const c=p>.65?col:'#ffd23f';
    if(phase<2){drawAltar(g,W,H,t,1+p*8,c);if(p>=1&&phase===0){phase=1;g.fillStyle='#fff';g.fillRect(0,0,W,H);setTimeout(finish,120);}}
    else{drawAltar(g,W,H,t,.6,col);g.fillStyle='rgba(6,23,26,.6)';g.fillRect(0,0,W,H);}};
  ov.querySelector('#sk').onclick=()=>{if(phase<2)finish();else close();};
  const close=()=>{VIEWS.summon=null;ov.remove();if(S.screen==='gacha')renderGacha();};
  function showCards(){const rv=ov.querySelector('#rv');
    rv.innerHTML=res.map(r=>`<div class="flip"><div class="in"><div class="back">?</div><div class="front">${cardHTML(r.id,{badge:r.isNew?'<span class="badge">NEW</span>':''})}
      <div class="dupe">${r.isNew?'<span class="newtag">Unlocked!</span>':'Duplicate · +'+r.refund+' shards'}</div></div></div></div>`).join('');
    const flips=[...rv.querySelectorAll('.flip')];flips.forEach((f,i)=>setTimeout(()=>{f.classList.add('open');sfx('reveal',RIDX[res[i].rarity]);},150+i*(n===1?0:170)));
    const b=ov.querySelector('#sk');b.textContent='Done';b.className='btn';
    const again=document.createElement('button');again.className='btn grape';again.textContent=`Again ×${n}`;again.disabled=S.save.shards<cost;
    again.onclick=()=>{close();doPull(n);};ov.querySelector('.bar').appendChild(again);}}

/* ===================== SETTINGS ===================== */
function renderSettings(){const sv=S.save;
  main().innerHTML=`<div class="shead"><h2>Settings</h2><button class="btn sm ghost" data-act="home">Back</button></div>
  <div class="panel stack" style="max-width:560px">
    <div class="field"><label for="nm">Player name (shown to opponents)</label><input class="input" id="nm" maxlength="18" value="${esc(sv.name)}"></div>
    <label class="toggle"><input type="checkbox" id="snd" ${sv.sound?'checked':''}> Sound effects</label>
    <label class="toggle"><input type="checkbox" id="fx" ${sv.fx?'checked':''}> Damage numbers and extra particles</label>
    <div class="field"><label for="spd">Default battle speed</label><select id="spd">${[1,2,4].map(v=>`<option value="${v}" ${sv.speed==v?'selected':''}>${v}×</option>`).join('')}</select></div>
    <div class="row" style="margin-top:8px"><button class="btn mint" id="save">Save</button><button class="btn coral sm" id="reset">Reset progress</button></div>
    <p class="note">Progress (fighters, shards, pity) is stored in this browser only.</p></div>`;
  $('#save').onclick=()=>{sv.name=($('#nm').value.trim()||sv.name).slice(0,18);sv.sound=$('#snd').checked;sv.fx=$('#fx').checked;sv.speed=+$('#spd').value;persist();
    if(NET.room)NET.room.presence({app:'pegfall',name:sv.name}).catch(()=>{});toast('Settings saved');};
  let armed=false;$('#reset').onclick=e=>{if(!armed){armed=true;e.target.textContent='Click again to erase everything';return;}S.save=defaultSave();persist();toast('Progress reset');go('menu');};}

/* ===================== PREP (choose 2 starters) ===================== */
function renderPrep(arg){if(arg.kind==='botpick'){main().innerHTML=`<div class="shead"><h2>Play vs Bot</h2><button class="btn sm ghost" data-act="home">Back</button></div>
    <div class="mp-grid">${[['easy','Easy','Makes random picks with a starter-level roster. Pays 200 shards.'],['medium','Medium','Counters your army composition with commons, rares and a few epics. Pays 350.'],['hard','Hard','Plans synergies and fields legendaries and a mythic. Pays 550.']].map(([k,n,d])=>`<button class="tile" data-d="${k}"><b>${n}</b><span>${d}</span></button>`).join('')}</div>`;
    main().querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>go('prep',{kind:'bot',diff:b.dataset.d}));return;}
  const own=ownedIds();let sel=(S.save.starters||[]).filter(id=>S.save.owned[id]).slice(0,2);
  const label={bot:`Fight ${BOTNAMES[arg.diff]} (${arg.diff})`,quick:'Find a match',mm:'Find a match',create:'Create match',join:'Join match'}[arg.kind];
  main().innerHTML=`<div class="shead"><h2>Choose 2 starters</h2><button class="btn sm ghost" data-act="home">Back</button></div>
    <p class="note" style="margin:-6px 0 14px">These two fighters start the match. A third fighter is added at random from your collection. Each type joins with ${BASE_FIGHTERS} fighter and hangs in the arcade machine as a card: hit it with the balls to fill its dots and earn more. Each later round you add one more type.</p>
    <div class="grid" id="pg"></div>
    <div class="row" style="margin-top:16px;justify-content:flex-end"><span class="sub" id="pcount"></span><button class="btn mint" id="go">${esc(label)}</button></div>`;
  const draw=()=>{$('#pg').innerHTML=own.map(id=>cardHTML(id,{sel:sel.includes(id),badge:sel.includes(id)?`<span class="badge">${sel.indexOf(id)+1}</span>`:''})).join('');
    $('#pcount').textContent=sel.length+'/2 chosen';$('#go').disabled=sel.length!==2;};
  $('#pg').onclick=e=>{const c=e.target.closest('[data-card]');if(!c)return;const id=c.dataset.card;sfx('click');
    if(sel.includes(id))sel=sel.filter(x=>x!==id);else{sel.push(id);if(sel.length>2)sel.shift();}draw();};
  $('#go').onclick=()=>{S.save.starters=sel.slice();persist();
    if(arg.kind==='bot')startBotMatch(arg.diff);else go('search',arg);};draw();}

/* ===================== NETWORK (lobby, matchmaking, presence transport) ===================== */
const NET={backend:null,room:null,status:'checking',count:0,game:null};
function updateNetPill(){const p=$('#netpill'),t=$('#nettext');p.classList.toggle('on',NET.status==='on');
  t.textContent=NET.status==='on'?`Online · ${NET.count} here`:NET.status==='checking'?'Checking online…':'Offline · bots only';
  if(S.screen==='mp')renderMP();}
async function initNet(){try{const be=await connectBackend();if(!be){NET.status='off';updateNetPill();return;}
    NET.backend=be;NET.room=be.lobby;NET.status='on';NET.room.presence({app:'pegfall',name:S.save.name}).catch(()=>{});
    NET.room.onPeers(ch=>{NET.count=ch.peers.filter(p=>p.presence&&p.presence.app==='pegfall').length;updateNetPill();if(MM.active)mmCheck();},
      ()=>{NET.status='off';NET.room=null;NET.backend=null;updateNetPill();});updateNetPill();}
  catch(e){console.warn('online unavailable',e);NET.status='off';updateNetPill();}}
function makePresenceTransport(nr){
  const T={mine:{},oppPeer:null,side:null,cbs:[],onOpp:null,onGone:null,onFull:null,goneTimer:null,closed:false};
  T.setMine=p=>{Object.assign(T.mine,p);nr.presence({g:T.mine}).catch(()=>{});};
  T.getOpp=()=>{if(!T.oppPeer)return null;const p=nr.peers().find(x=>x.peer===T.oppPeer);const g=p&&p.presence&&p.presence.g;return g&&g.app==='pegfall'?g:null;};
  T.onChange=f=>T.cbs.push(f);
  T.unsub=nr.onPeers(ch=>{if(T.closed)return;const me=ch.peers.find(p=>p.sameTab);
    if(!T.oppPeer&&me){const others=ch.peers.filter(p=>!p.sameTab&&p.presence&&p.presence.g&&p.presence.g.app==='pegfall');
      if(others.length>=2&&!T.mine.r){T.onFull&&T.onFull();return;}
      if(others.length){const o=others[0];T.oppPeer=o.peer;T.side=me.peer<o.peer?0:1;T.onOpp&&T.onOpp(T.side,o);}}
    if(T.oppPeer){const here=ch.peers.some(p=>p.peer===T.oppPeer);
      if(!here){if(!T.goneTimer)T.goneTimer=setTimeout(()=>{T.onGone&&T.onGone();},12000);}
      else if(T.goneTimer){clearTimeout(T.goneTimer);T.goneTimer=null;}
      T.cbs.forEach(f=>f());}},()=>{T.onGone&&T.onGone();});
  T.close=()=>{T.closed=true;try{T.unsub();}catch(e){}clearTimeout(T.goneTimer);nr.leave().catch(()=>{});};
  return T;}
const MM={active:false,excluded:{},timer:null};
function mmStart(){if(!NET.room)return;MM.active=true;NET.room.presence({app:'pegfall',name:S.save.name,seek:randHex(4)}).catch(()=>{});mmCheck();}
function mmStop(){MM.active=false;if(NET.room)NET.room.presence({seek:null}).catch(()=>{});}
function mmCheck(){if(!MM.active||!NET.room)return;const peers=NET.room.peers();const me=peers.find(p=>p.sameTab);if(!me)return;const now=Date.now();
  const seekers=peers.filter(p=>p.presence&&p.presence.app==='pegfall'&&p.presence.seek&&(p.sameTab||!(MM.excluded[p.peer]>now))).map(p=>p.peer).sort();
  const i=seekers.indexOf(me.peer);if(i<0||seekers.length<2)return;const j=i%2===0?i+1:i-1;if(j>=seekers.length)return;
  const a=seekers[Math.min(i,j)],b=seekers[Math.max(i,j)];mmStop();
  joinGame('q'+hashStr(a+'|'+b)[0].toString(36),{quick:true,other:seekers[j]});}
async function joinGame(code,o={}){const s=SEARCH;if(!NET.room){searchMsg('Online play is unavailable here.');return;}
  searchMsg(o.quick?'Opponent found — connecting…':'Waiting for your opponent to join…');let nr;
  try{nr=await NET.backend.join('pf-'+code);}catch(e){searchMsg('Could not open that match room ('+(e&&e.code||'error')+'). Try again or play a bot.');return;}
  if(s!==SEARCH){try{nr.leave();}catch(e){}return;}
  const T=makePresenceTransport(nr);NET.game=T;
  T.setMine({app:'pegfall',v:1,name:S.save.name,st:S.save.starters,coll:ownedIds(),r:0,c:null,n:null,p:null,d:0,h:null});
  T.onFull=()=>{T.close();NET.game=null;searchMsg('That match already has two players. Check the code or create your own.');};
  T.onOpp=(side,o2)=>{clearTimeout(s.qtimer);startOnlineMatch(T,side);};
  if(o.quick)s.qtimer=setTimeout(()=>{if(!T.oppPeer&&s===SEARCH){T.close();NET.game=null;MM.excluded[o.other]=Date.now()+60000;searchMsg('Searching for an opponent…');mmStart();}},10000);}
function startOnlineMatch(T,side){const s=SEARCH;stopSearch(true);
  const m=new Match({transport:T,side,me:{name:S.save.name,st:S.save.starters.slice(),coll:ownedIds()},onEvent:onMatchEvent});
  T.onGone=()=>{if(m.phase!=='over')m.abort('Your opponent left the match.',m.side);};
  S.match=m;S.bot=null;S.mode={kind:'online'};go('match');m.start();}

/* ===================== SEARCH / LOBBY SCREENS ===================== */
let SEARCH=null;
function stopSearch(keepGame){if(!SEARCH)return;clearInterval(SEARCH.tick);clearTimeout(SEARCH.qtimer);mmStop();
  if(!keepGame&&NET.game){NET.game.close();NET.game=null;}SEARCH=null;}
function searchMsg(t){const el=$('#smsg');if(el)el.textContent=t;}
function renderMP(){const on=NET.status==='on';
  main().innerHTML=`<div class="shead"><h2>Multiplayer</h2><button class="btn sm ghost" data-act="home">Back</button></div>
  ${on?'':`<div class="warn">Online play isn't available right now${NET.status==='checking'?' (still connecting)':''}. You can still play bots.</div>`}
  <div class="mp-grid">
    <button class="tile" id="mq" ${on?'':'disabled'}><b>Quick match</b><span>Get paired with anyone looking for a game right now</span></button>
    <button class="tile" id="mc" ${on?'':'disabled'}><b>Create match</b><span>Get a code to invite a friend</span></button>
    <div class="tile" style="cursor:default"><b>Join with code</b><div class="row" style="margin-top:6px"><input class="input" id="code" maxlength="6" placeholder="ABC12" style="flex:1;text-transform:uppercase" aria-label="Match code"><button class="btn sm" id="mj" ${on?'':'disabled'}>Join</button></div></div>
  </div>
  <p class="note" style="margin-top:16px">${on?`${NET.count} player${NET.count===1?'':'s'} with the game open right now.`:''} Matches are peer-to-peer over a live room: picks are locked with a cryptographic commitment before either side sees the other's, the shared random seed mixes both players' secrets, each machine's results are checked against what the machine allows, and both clients replay the exact same battle and cross-check the result.</p>
  <div style="margin-top:12px"><button class="btn ghost sm" id="mb">Play a bot instead</button></div>`;
  if(on){$('#mq').onclick=()=>go('prep',{kind:'mm'});$('#mc').onclick=()=>go('prep',{kind:'create'});
    $('#mj').onclick=()=>{const c=$('#code').value.trim().toLowerCase().replace(/[^a-z0-9]/g,'');if(c.length<4){toast('Enter the 5-character code your friend shared.');return;}go('prep',{kind:'join',code:c});};}
  $('#mb').onclick=()=>go('prep',{kind:'botpick'});}
function renderSearch(arg){stopSearch();const s=SEARCH={arg,t0:Date.now()};
  const code=arg.kind==='create'?Array.from({length:5},()=>'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random()*31)]).join(''):arg.code;
  main().innerHTML=`<div class="panel center" style="min-height:360px">
    <div class="spin"></div><h3 id="smsg">${arg.kind==='create'?'Waiting for your friend…':'Searching for an opponent…'}</h3>
    ${arg.kind==='create'?`<div class="sub">Share this code. Your friend opens Pegfall Arena → Multiplayer → Join with code.</div><div class="code">${code.toUpperCase()}</div>
      <button class="btn sm ghost" id="cp">Copy invite</button>`:''}
    <div class="sub num" id="stime">0s</div>
    <div class="row" style="justify-content:center"><button class="btn ghost sm" id="cancel">Cancel</button><button class="btn sm hidden" id="tobot">Play a Medium bot instead</button></div></div>`;
  $('#cancel').onclick=()=>{stopSearch();go(arg.kind==='quick'?'menu':'mp');};
  $('#tobot').onclick=()=>{stopSearch();startBotMatch('medium');};
  if($('#cp'))$('#cp').onclick=()=>{const txt=`Join my Pegfall Arena match! Open the game, choose Multiplayer → Join with code, and enter ${code.toUpperCase()}`;
    (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>toast('Invite copied'),()=>toast('Copy the code: '+code.toUpperCase()));};
  s.tick=setInterval(()=>{const sec=Math.floor((Date.now()-s.t0)/1000);const el=$('#stime');if(el)el.textContent=sec+'s';
    if(sec>=15&&$('#tobot'))$('#tobot').classList.remove('hidden');
    if(arg.kind==='quick'&&sec>=25&&!NET.game?.oppPeer){stopSearch();toast('Nobody else is around — a Medium bot stepped in.');startBotMatch('medium');}},500);
  if(!NET.room){searchMsg('Online play is unavailable here.');$('#tobot').classList.remove('hidden');return;}
  if(arg.kind==='create'||arg.kind==='join')joinGame(code);else mmStart();}

/* ===================== MATCH SETUP ===================== */
function startBotMatch(diff){const [tA,tB]=makeLoopback();const rng=Math.random;const coll=botCollection(diff,rng);
  const me=new Match({transport:tA,side:0,me:{name:S.save.name,st:S.save.starters.slice(),coll:ownedIds()},onEvent:onMatchEvent});
  const bot=new Match({transport:tB,side:1,me:{name:BOTNAMES[diff],st:botStarters(diff,rng,coll),coll},headless:true,ai:{diff,rng}});
  S.match=me;S.bot=bot;S.mode={kind:'bot',diff};go('match');me.start();bot.start();}

/* ===================== MATCH SCREEN ===================== */
const MV={phase:null,round:-1,counts:null,pick:null,timer:null,tick:null};
function onMatchEvent(m){if(S.screen==='match'&&m===S.match)syncMatch();}
function renderMatch(){Object.assign(MV,{phase:null,round:-1,counts:null,pick:null});clearInterval(MV.tick);
  main().innerHTML=`<div class="scorebar"><div class="pcard me"><div class="stack" style="gap:4px;min-width:0"><span class="nm" id="nmMe"></span><div class="pips" id="pipMe"></div></div></div>
    <div class="rnd"><b id="rlabel">Round 1</b><span id="plabel"></span></div>
    <div class="pcard op"><div class="stack" style="gap:4px;min-width:0;align-items:flex-end"><span class="nm" id="nmOp"></span><div class="pips" id="pipOp"></div></div></div></div>
  <div id="warnbox"></div><div class="stage" id="stage"></div>
  <div class="armies"><div class="army"><h4><span>Your army</span><span class="num" id="cntMe"></span></h4><div class="chips" id="armyMe"></div></div>
    <div class="army op"><h4><span>Opponent army</span><span class="num" id="cntOp"></span></h4><div class="chips" id="armyOp"></div></div></div>
  <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost sm" id="leave">Leave match</button></div>`;
  let armed=false;$('#leave').onclick=e=>{if(S.match&&S.match.phase==='over'){leaveMatch();return;}if(!armed){armed=true;e.target.textContent='Click again to forfeit';setTimeout(()=>{armed=false;if(e.target.isConnected)e.target.textContent='Leave match';},3000);return;}
    S.save.stats.l++;persist();leaveMatch();};
  MV.tick=setInterval(()=>{if(S.screen!=='match'){clearInterval(MV.tick);return;}tickMatch();},250);
  syncMatch();}
function closeMatch(){const m=S.match;if(m){m.stop();if(m.t&&m.t.close)m.t.close();}if(S.bot){S.bot.stop();if(S.bot.t)S.bot.t.close();}
  if(NET.game){NET.game.close();NET.game=null;}S.match=null;S.bot=null;VIEWS.arcade=null;VIEWS.battle=null;}
function leaveMatch(){closeMatch();clearInterval(MV.tick);go('menu');}
const PHASE_LABEL={waiting:'Connecting',pick:'Pick a fighter',locking:'Locking in',commit:'Locked in',reveal:'Revealing',arcade:'Arcade machine',arcadeWait:'Arcade machine',muster:'Muster',battle:'Battle',roundOver:'Round over',waitNext:'Next round',over:'Match over'};
function syncMatch(){const m=S.match;if(!m)return;const me=m.side,op=m.oppSide;
  $('#nmMe').textContent=S.save.name+' (you)';$('#nmOp').textContent=m.oppInfo?m.oppInfo.name:(S.mode&&S.mode.kind==='bot'?BOTNAMES[S.mode.diff]:'Opponent');
  const pips=s=>[0,1,2].map(i=>`<i class="${m.score[s]>i?'on':''}"></i>`).join('');$('#pipMe').innerHTML=pips(me);$('#pipOp').innerHTML=pips(op);
  $('#rlabel').textContent=m.round?'Round '+m.round:'Match';$('#plabel').textContent=PHASE_LABEL[m.phase]||'';
  $('#warnbox').innerHTML=m.desync?'<div class="warn">Heads up: your opponent\'s client reported a different battle result for a round. Scores shown are from your own verified simulation.</div>':'';
  const stageKey={locking:'commit',reveal:'commit',arcadeWait:'arcade'}[m.phase]||m.phase;
  const keepBattle=(m.phase==='roundOver'||m.phase==='waitNext')&&VIEWS.battle;
  if(stageKey!==MV.phase||m.round!==MV.round){MV.phase=stageKey;MV.round=m.round;
    if(keepBattle)showRoundOverlay(m);else buildStage(m);}
  else if(m.phase==='pick')updatePickStatus(m);
  else if(m.phase==='arcadeWait')arcadeWaiting(m);
  else if(keepBattle)showRoundOverlay(m);
  renderArmies(m);}
function sumArmy(a){return a.reduce((x,y)=>x+y.count,0);}
function renderArmies(m){const me=m.side,op=m.oppSide;let mine=m.army[me];
  if((m.phase==='arcade'||m.phase==='arcadeWait')&&MV.counts){mine=clone(m.army[me]);for(const id in MV.counts)addToArmy(mine,id,MV.counts[id]);}
  $('#armyMe').innerHTML=mine.length?mine.map(a=>chipHTML(a,MV.popId===a.id)).join(''):'<span class="sub" style="font-size:13px">Your fighters appear here once the round starts</span>';
  $('#armyOp').innerHTML=m.army[op].length?m.army[op].map(a=>chipHTML(a)).join(''):'<span class="sub" style="font-size:13px">Hidden until revealed</span>';
  $('#cntMe').textContent=sumArmy(mine)+' fighters';$('#cntOp').textContent=sumArmy(m.army[op])+' fighters';MV.popId=null;}
function buildStage(m){const st=$('#stage');if(m.phase!=='arcade'&&m.phase!=='arcadeWait')VIEWS.arcade=null;if(m.phase!=='battle')VIEWS.battle=null;MV.deadline=null;MV.musterAt=null;
  const isBot=S.mode&&S.mode.kind==='bot';
  if(m.phase==='waiting'){st.innerHTML=`<div class="center"><div class="spin"></div><h3>Exchanging rosters…</h3></div>`;return;}
  if(m.phase==='pick'){const elig=pickOptions(m.me.coll,m.army[m.side],Math.random);let sel=null;
    const tip=botPick('hard',makeRng('tip'+m.round),elig,m.army[m.side],m.army[m.oppSide]);
    st.innerHTML=`<div class="pickhead"><h3>Round ${m.round}: choose a troop</h3><span class="oppstat" id="opst"></span><span class="timer" id="ptimer"></span></div>
      <p class="note" style="margin:-4px 0 12px">Your troop joins with ${BASE_FIGHTERS} fighter and hangs in the arcade machine as a new card. The dots are its cost: each ball hit lights one dot, and when all dots are lit you get +1 of that troop.</p>
      <div class="grid pick3" id="pkg">${elig.map(id=>cardHTML(id,{cost:true,badge:id===tip?'<span class="badge l">Suggested</span>':''})).join('')}</div>
      <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn mint" id="lock" disabled>Lock in</button></div>`;
    $('#pkg').onclick=e=>{const c=e.target.closest('[data-card]');if(!c)return;sel=c.dataset.card;sfx('click');$('#pkg').querySelectorAll('.ccard').forEach(x=>x.classList.toggle('sel',x.dataset.card===sel));$('#lock').disabled=false;};
    $('#lock').onclick=()=>{if(sel)m.choosePick(sel);};
    if(!isBot)MV.deadline=Date.now()+35000;MV.autoPick=()=>{m.choosePick(sel||tip);};updatePickStatus(m);return;}
  if(m.phase==='commit'||m.phase==='locking'||m.phase==='reveal'){const p=m.pick;
    st.innerHTML=`<div class="center">${p?`<div style="width:150px">${cardHTML(p)}</div>`:'<div class="spin"></div>'}
      <h3>${m.round===1?'Shuffling the random third fighter…':'Locked in.'}</h3><div class="sub">${isBot?BOTNAMES[S.mode.diff]+' is deciding…':'Waiting for your opponent to lock in…'}</div></div>`;return;}
  if(m.phase==='arcade'||m.phase==='arcadeWait'){buildArcade(m);return;}
  if(m.phase==='muster'){buildMuster(m);return;}
  if(m.phase==='battle'){buildBattle(m);return;}
  if(m.phase==='over'){buildOver(m);return;}
  if(m.phase==='roundOver'||m.phase==='waitNext'){st.innerHTML='<div class="center"><div class="spin"></div></div>';showRoundOverlay(m);}}
function updatePickStatus(m){const el=$('#opst');if(!el)return;const o=m.opp;const locked=o&&o.r===m.round&&o.c;el.textContent=locked?'Opponent locked in':'Opponent is choosing…';el.classList.toggle('ok',!!locked);}
function tickMatch(){const m=S.match;if(!m)return;
  if(m.phase==='pick'&&MV.deadline){const left=Math.max(0,Math.ceil((MV.deadline-Date.now())/1000));const el=$('#ptimer');if(el)el.textContent=left+'s';if(left<=0){MV.deadline=null;MV.autoPick&&MV.autoPick();}}
  if(m.phase==='pick')updatePickStatus(m);
  if(m.phase==='arcade'||m.phase==='arcadeWait')renderOppArcade(m);
  if(m.phase==='muster'&&MV.musterAt){const left=Math.max(0,Math.ceil((MV.musterAt-Date.now())/1000));const b=$('#tobattle');if(b)b.textContent=`To battle (${left})`;if(left<=0){MV.musterAt=null;m.toBattle();}}
  if(m.phase==='roundOver'&&MV.autoReady&&Date.now()>MV.autoReady){MV.autoReady=null;m.ready();}
  if(VIEWS.battle&&m.phase==='battle'){const c=VIEWS.battle.counts(),me=m.side,op=m.oppSide;const el=$('#hud');
    if(el)el.innerHTML=`<span class="num" style="color:var(--mint)">${c.a[me]}</span><div class="hb"><i style="width:${c.f[me]/(c.f[me]+c.f[op]||1)*100}%;background:var(--mint)"></i><i style="flex:1;background:var(--coral)"></i></div><span class="num" style="color:var(--coral)">${c.a[op]}</span>`;}}
function countsChips(counts,types,popId){const ids=types.filter(id=>counts[id]);return ids.length?ids.map(id=>chipHTML({id,count:counts[id]},id===popId)).join(''):'<span class="sub" style="font-size:13px">No hits yet</span>';}
function buildArcade(m){const st=$('#stage');MV.counts={};const isBot=S.mode&&S.mode.kind==='bot';const types=m.machine[m.side];
  st.innerHTML=`<div class="arc"><div class="arc-l"><div class="arc-cv"><canvas id="acv" aria-label="Arcade machine: move the paddle to keep the balls bouncing into your fighters"></canvas></div>
      <div class="note arc-help">Every ball hit lights a dot on that card; when all its dots are lit you get +1 of that troop. Move the mouse, drag with your finger, or use A/D or ←/→. The edge of the paddle sends a ball sideways, the middle straight up. Each paddle hit gives that ball +1 speed.</div></div>
    <div class="arc-r">
      <div class="hudgrid"><div><span>Time</span><b class="num" id="aTimeN">${AR.roundTime}s</b></div><div><span>Balls in play</span><b class="num" id="aBalls">0/3</b></div><div><span>Ball hits</span><b class="num" id="aHits">0</b></div></div>
      <div class="tbar"><i id="aTime" style="width:100%"></i></div>
      <div class="lastbox" id="aLast"><span class="sub">Three balls, ${AR.roundTime} seconds. Bounce them into your cards!</span></div>
      <div><h4 class="mini-h">Your fighters this round <span class="num" id="aCnt">0</span></h4><div class="chips" id="aEarn"></div></div>
      <div class="oppbox"><h4 class="mini-h"><span id="oName">Opponent</span> <span class="num" id="oTot"></span></h4><div class="chips" id="oEarn"></div></div>
    </div></div>`;
  const view=new ArcadeView($('#acv'),{types,
    onBump:id=>{MV.counts[id]=(MV.counts[id]||0)+1;MV.popId=id;const c=CH[id];
      $('#aLast').innerHTML=`<img src="${portrait(id,96)}" alt=""><div><div class="rar" style="color:${RARITY[c.rarity].color}">${RARITY[c.rarity].name} · ×${MV.counts[id]}</div><b>+1 ${esc(c.name)}</b><div class="sub">${ROLES[c.role].name}</div></div>`;
      $('#aLast').className='lastbox pop r-'+c.rarity;$('#aEarn').innerHTML=countsChips(MV.counts,types,id);
      const tot=Object.values(MV.counts).reduce((a,b)=>a+b,0);$('#aCnt').textContent=tot;
      if(Date.now()-(MV.liveAt||0)>300){MV.liveAt=Date.now();m.setLive({counts:Object.assign({},MV.counts)});}
      renderArmies(m);},
    onHud:h=>{const t=$('#aTime');if(!t)return;const f=h.left/AR.roundTime;t.style.width=(f*100)+'%';t.style.background=f<.25?'var(--coral)':'var(--sun)';
      $('#aTimeN').textContent=h.pre>0?'Get ready':Math.ceil(h.left)+'s';$('#aBalls').textContent=h.inPlay+'/3';$('#aHits').textContent=h.total;},
    onFinish:counts=>{m.setLive({counts,done:true});setTimeout(()=>m.arcadeDone(counts),900);}});
  VIEWS.arcade=view;$('#oName').textContent=isBot?BOTNAMES[S.mode.diff]:(m.oppInfo?m.oppInfo.name:'Opponent');$('#aEarn').innerHTML=countsChips({},types);renderOppArcade(m);}
function arcadeWaiting(m){const l=$('#aLast');if(l&&!l.dataset.wait){l.dataset.wait=1;l.className='lastbox';l.innerHTML='<div class="spin" style="width:26px;height:26px;border-width:4px"></div><span class="sub">Time is up for you. Waiting for your opponent to finish…</span>';}}
function renderOppArcade(m){const o=m.opp;const lv=o&&o.lv&&o.lv.r===m.round?o.lv:null;const el=$('#oEarn');if(!el)return;
  const types=m.machine[m.oppSide],raw=lv&&lv.counts&&typeof lv.counts==='object'?lv.counts:{};const counts={};
  for(const id of types)if(Number.isInteger(raw[id])&&raw[id]>0)counts[id]=raw[id];
  const tot=Object.values(counts).reduce((a,b)=>a+b,0);$('#oTot').textContent=lv&&lv.done?tot+' fighters · done':tot+' fighters';
  const html=countsChips(counts,types);if(el.innerHTML!==html)el.innerHTML=html;}
function buildMuster(m){const st=$('#stage');VIEWS.arcade=null;const me=m.side,op=m.oppSide;
  const col=(s,title)=>{const r=m.rewards[s];const tot=Object.values(r).reduce((a,b)=>a+b,0);
    return `<div class="muster-col ${s===me?'me':'op'}"><h3>${esc(title)} <span class="num">+${tot}</span></h3>
      <div class="sub" style="font-size:13px">New: ${m.newTypes[s].map(id=>esc(CH[id].name)).join(', ')} (+${BASE_FIGHTERS} each)</div>
      <div class="chips">${countsChips(r,m.machine[s])}</div>
      <div class="sub num" style="margin-top:6px">Army: ${sumArmy(m.army[s])} fighters</div></div>`;};
  st.innerHTML=`<div class="muster">${col(me,'You')}${col(op,m.oppInfo?m.oppInfo.name:'Opponent')}</div>
    <div class="row" style="justify-content:center;margin-top:16px"><button class="btn mint" id="tobattle">To battle</button></div>`;
  MV.musterAt=Date.now()+9000;$('#tobattle').onclick=()=>{MV.musterAt=null;m.toBattle();};sfx('land');}
function buildBattle(m){const st=$('#stage');
  st.innerHTML=`<div class="bwrap"><canvas id="bcv"></canvas></div><div class="bctl"><div class="hud" id="hud"></div>
    ${[1,2,4].map(v=>`<button class="btn sm ghost spd" data-s="${v}">${v}×</button>`).join('')}<button class="btn sm" id="bskip">Skip</button></div>`;
  const b=createBattle(m.battleArmies,m.seed);const view=new BattleView($('#bcv'),b,m.side,res=>{if(S.match===m)m.battleDone(res);});VIEWS.battle=view;
  const mark=()=>st.querySelectorAll('.spd').forEach(x=>x.style.outline=+x.dataset.s===view.speed?'3px solid var(--sun)':'none');mark();
  st.querySelectorAll('.spd').forEach(x=>x.onclick=()=>{view.speed=+x.dataset.s;mark();});$('#bskip').onclick=()=>{view.intro=0;view.skip();};}
function showRoundOverlay(m){const st=$('#stage');let ov=st.querySelector('.overlay');if(!ov){ov=document.createElement('div');ov.className='overlay';st.appendChild(ov);}
  const r=m.result||{};const w=r.winner,me=m.side;const isBot=S.mode&&S.mode.kind==='bot';
  const big=w<0?'<div class="big draw">DRAW</div>':w===me?'<div class="big win">ROUND WON</div>':'<div class="big lose">ROUND LOST</div>';
  if(m.phase==='roundOver'&&!ov.dataset.sfx){ov.dataset.sfx=1;sfx(w===me?'win':w<0?'click':'lose');if(!isBot)MV.autoReady=Date.now()+15000;}
  const done=Math.max(...m.score)>=3;
  ov.innerHTML=`${big}<div class="sub">${esc(r.reason||'')}${r.alive?` · ${r.alive[me]} of yours vs ${r.alive[1-me]} of theirs left standing`:''}</div>
    <div style="font-family:var(--display);font-size:30px"><span style="color:var(--mint)">${m.score[me]}</span> – <span style="color:var(--coral)">${m.score[1-me]}</span></div>
    ${m.phase==='roundOver'?`<button class="btn mint" id="cont">${done?'See results':'Next round'}</button>`:`<div class="row"><div class="spin" style="width:26px;height:26px;border-width:4px"></div><span class="sub">Waiting for your opponent…</span></div>`}`;
  const c=ov.querySelector('#cont');if(c)c.onclick=()=>{MV.autoReady=null;m.ready();};}
function buildOver(m){const st=$('#stage');VIEWS.battle=null;const me=m.side;const w=m.winnerSide;const won=w===me;
  if(!m.rewarded){m.rewarded=true;const kind=S.mode&&S.mode.kind;const base=kind==='bot'?{easy:200,medium:350,hard:550}[S.mode.diff]:550;
    const roundsWon=m.history.filter(h=>h.winner===me).length;m.reward=won?base+roundsWon*30:Math.round(base*.3)+roundsWon*30;
    if(m.forfeit&&!won)m.reward=0;S.save.shards+=m.reward;if(won)S.save.stats.w++;else S.save.stats.l++;persist();sfx(won?'win':'lose');}
  st.innerHTML=`<div class="center" style="min-height:340px"><div class="big ${won?'win':'lose'}">${won?'VICTORY':'DEFEAT'}</div>
    ${m.forfeit?`<div class="sub">${esc(m.forfeit.msg)}</div>`:''}
    <div style="font-family:var(--display);font-size:34px"><span style="color:var(--mint)">${m.score[me]}</span> – <span style="color:var(--coral)">${m.score[1-me]}</span></div>
    <div class="hist">${m.history.map(h=>`<span>R${h.round}: ${h.winner<0?'Draw':h.winner===me?'<b style="color:var(--mint)">Won</b>':'<b style="color:var(--coral)">Lost</b>'}</span>`).join('')}</div>
    <div class="pill"><span class="shard"></span>+<span class="num">${m.reward}</span> shards</div>
    <div class="row" style="justify-content:center"><button class="btn mint" id="again">${S.mode.kind==='bot'?'Rematch':'Find another match'}</button><button class="btn ghost" id="tomenu">Main menu</button><button class="btn grape" id="tosum">Summon</button></div></div>`;
  const mode=S.mode;const cleanup=()=>closeMatch();
  $('#again').onclick=()=>{cleanup();if(mode.kind==='bot')startBotMatch(mode.diff);else go('mp');};
  $('#tomenu').onclick=()=>{cleanup();go('menu');};$('#tosum').onclick=()=>{cleanup();go('gacha');};}

/* ===================== BOOT ===================== */
function boot(){updateTop();
  if(BUILD.home){const a=document.createElement('a');a.className='home-link';a.href=BUILD.home;a.textContent='← Bas Games';document.querySelector('.top').prepend(a);}
  go('menu');initNet();}
