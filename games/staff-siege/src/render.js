/* ================= RENDER ================= */
const cv=$('#cv'),ctx=cv.getContext('2d');
function shade(hex,amt){let c=hex.replace('#','');if(c.length===3)c=c.split('').map(x=>x+x).join('');let r=parseInt(c.slice(0,2),16),g=parseInt(c.slice(2,4),16),b=parseInt(c.slice(4,6),16);
 if(amt>=0){r+=(255-r)*amt;g+=(255-g)*amt;b+=(255-b)*amt}else{r*=1+amt;g*=1+amt;b*=1+amt}return `rgb(${r|0},${g|0},${b|0})`}
/* cached glow-sprites (veel sneller dan shadowBlur) */
const GLOW=new Map();
function glowSpr(col){let s=GLOW.get(col);if(s)return s;s=document.createElement('canvas');s.width=s.height=64;const c=s.getContext('2d'),g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,col);g.addColorStop(.25,col);g.addColorStop(1,'rgba(0,0,0,0)');c.globalAlpha=.9;c.fillStyle=g;c.fillRect(0,0,64,64);GLOW.set(col,s);return s}
function glowAt(c,x,y,r,col,a){if(!Q().glow&&!(a>1))return;c.globalAlpha=Math.min(1,a||.6);c.drawImage(glowSpr(col),x-r,y-r,r*2,r*2);c.globalAlpha=1}
const LSPR=(()=>{const s=document.createElement('canvas');s.width=s.height=128;const c=s.getContext('2d'),g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(.5,'rgba(0,0,0,.6)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,128,128);return s})();

/* ================= ARENA ================= */
let BG=null,BGL=[],AMB=[];
function buildBg(){
 const a=ARENAS[Math.max(0,G.arena)]||ARENAS[0];
 BG=document.createElement('canvas');BG.width=W*DPR;BG.height=H*DPR;const b=BG.getContext('2d');b.scale(DPR,DPR);BGL=[];
 let seed=(G.arena+3)*7919;const sr=()=>(seed=(seed*16807)%2147483647)/2147483647;
 const g=b.createRadialGradient(W/2,H/2,40,W/2,H/2,Math.max(W,H)*.75);g.addColorStop(0,a.bg[0]);g.addColorStop(1,a.bg[1]);b.fillStyle=g;b.fillRect(0,0,W,H);
 const ts=64;
 for(let y=-(H/2%ts);y<H;y+=ts)for(let x=-(W/2%ts);x<W;x+=ts){const v=sr();b.globalAlpha=.25+v*.25;b.fillStyle=a.tile;b.fillRect(x+2,y+2,ts-4,ts-4);
  if(v>.85){b.globalAlpha=.25;b.strokeStyle='rgba(0,0,0,.6)';b.lineWidth=1;b.beginPath();b.moveTo(x+sr()*ts,y+4);b.lineTo(x+sr()*ts,y+ts/2);b.lineTo(x+sr()*ts,y+ts-4);b.stroke()}}
 b.globalAlpha=1;b.strokeStyle=a.line;b.lineWidth=1;
 for(let x=(W/2)%ts;x<W;x+=ts){b.beginPath();b.moveTo(x,0);b.lineTo(x,H);b.stroke()}
 for(let y=(H/2)%ts;y<H;y+=ts){b.beginPath();b.moveTo(0,y);b.lineTo(W,y);b.stroke()}
 /* centrum-cirkel */
 b.strokeStyle=a.line.replace(/[\d.]+\)$/,'.22)');b.lineWidth=2;b.beginPath();b.arc(W/2,H/2,Math.min(W,H)*.22,0,TAU);b.stroke();b.setLineDash([6,10]);b.beginPath();b.arc(W/2,H/2,Math.min(W,H)*.3,0,TAU);b.stroke();b.setLineDash([]);
 const n=Math.floor(W*H/38000)+6;
 for(let i=0;i<n;i++){let x=sr()*W,y=sr()*H;if(Math.hypot(x-W/2,y-H/2)<Math.min(W,H)*.25){x=x<W/2?x*.4:W-(W-x)*.4}decoAt(b,a.deco,x,y,sr,a)}
 for(let i=0;i<4;i++){const x=i%2?W*.08:W*.92,y=i<2?H*.12:H*.88;lampAt(b,x,y,a)}
 const v=b.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.78);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.6)');b.fillStyle=v;b.fillRect(0,0,W,H);
 b.strokeStyle=a.light;b.globalAlpha=.25;b.lineWidth=3;b.strokeRect(4,4,W-8,H-8);b.globalAlpha=1;
 AMB=[];const na=S.set.gfx==='low'?12:S.set.gfx==='medium'?28:46;for(let i=0;i<na;i++)AMB.push({x:Math.random()*W,y:Math.random()*H,s:rnd(.5,1),p:rnd(0,TAU)});
}
function lampAt(b,x,y,a){b.fillStyle='rgba(0,0,0,.45)';b.beginPath();b.ellipse(x,y+14,12,5,0,0,TAU);b.fill();b.fillStyle='#2a2438';b.fillRect(x-3,y-22,6,36);b.fillStyle=a.light;b.globalAlpha=.9;b.beginPath();b.arc(x,y-26,6,0,TAU);b.fill();b.globalAlpha=.25;b.beginPath();b.arc(x,y-26,16,0,TAU);b.fill();b.globalAlpha=1;BGL.push({x,y:y-26,r:170,col:a.light})}
function decoAt(b,kind,x,y,sr,a){
 b.save();b.translate(x,y);const s=.8+sr()*.6;b.scale(s,s);
 b.fillStyle='rgba(0,0,0,.35)';b.beginPath();b.ellipse(0,12,16,6,0,0,TAU);b.fill();
 switch(kind){
  case 'grave':if(sr()<.6){b.fillStyle='#3a3552';b.beginPath();b.roundRect?b.roundRect(-10,-18,20,30,[10,10,2,2]):b.rect(-10,-18,20,30);b.fill();b.fillStyle='rgba(255,255,255,.08)';b.fillRect(-1.5,-12,3,14);b.fillRect(-6,-7,12,3);b.fillStyle='#4a5e3a';b.fillRect(-12,10,24,3)}
   else{b.strokeStyle='#2f2840';b.lineWidth=4;b.lineCap='round';b.beginPath();b.moveTo(0,12);b.lineTo(0,-20);b.moveTo(0,-8);b.lineTo(-12,-18);b.moveTo(0,-14);b.lineTo(10,-26);b.moveTo(-6,-13);b.lineTo(-10,-28);b.stroke()}break;
  case 'swamp':if(sr()<.5){b.fillStyle='rgba(120,220,60,.18)';b.beginPath();b.ellipse(0,0,30,14,0,0,TAU);b.fill();b.strokeStyle='rgba(180,255,90,.3)';b.stroke();BGL.push({x,y,r:80,col:a.light})}
   else{for(let i=0;i<3;i++){b.fillStyle='#d9f99d';b.fillRect(-8+i*7,-6-i*3,2,10);b.fillStyle=['#84cc16','#a3e635','#65a30d'][i];b.beginPath();b.arc(-7+i*7,-8-i*3,5,Math.PI,0);b.fill()}}break;
  case 'crystal':{const col=sr()<.5?'#ff6bd5':'#a78bfa';for(let i=0;i<3;i++){b.fillStyle=col;b.globalAlpha=.55+i*.15;b.beginPath();b.moveTo(-10+i*8,10);b.lineTo(-6+i*8,-14-i*6);b.lineTo(-2+i*8,10);b.fill()}b.globalAlpha=1;if(sr()<.4)BGL.push({x,y,r:90,col})}break;
  case 'bones':b.strokeStyle='#d6cfc0';b.lineWidth=3;b.lineCap='round';for(let i=0;i<3;i++){b.beginPath();const a2=sr()*TAU;b.moveTo(Math.cos(a2)*-10,Math.sin(a2)*-10);b.lineTo(Math.cos(a2)*10,Math.sin(a2)*10);b.stroke()}b.fillStyle='#e7e1d3';b.beginPath();b.arc(4,-4,6,0,TAU);b.fill();b.fillStyle='#1a1010';b.fillRect(1,-6,2,2);b.fillRect(5,-6,2,2);
   if(sr()<.3){b.fillStyle='#3a1a14';b.fillRect(-14,-6,8,16);b.fillStyle='#ff8a4a';b.beginPath();b.arc(-10,-9,5,0,TAU);b.fill();BGL.push({x:x-10*s,y:y-9*s,r:110,col:'#ff8a4a'})}break;
  case 'pillar':b.fillStyle='#5a4522';b.beginPath();b.arc(0,0,14,0,TAU);b.fill();b.fillStyle='#8a6a32';b.beginPath();b.arc(-3,-3,10,0,TAU);b.fill();b.strokeStyle='#ffd77a';b.globalAlpha=.4;b.lineWidth=2;b.beginPath();b.arc(0,0,14,0,TAU);b.stroke();b.globalAlpha=1;break;
  case 'ice':b.fillStyle='rgba(200,240,255,.5)';for(let i=0;i<4;i++){b.beginPath();const ox=-12+i*7;b.moveTo(ox,10);b.lineTo(ox+3,-10-sr()*14);b.lineTo(ox+6,10);b.fill()}b.fillStyle='rgba(255,255,255,.25)';b.beginPath();b.ellipse(0,10,20,6,0,0,TAU);b.fill();break;
  case 'factory':b.fillStyle='#2f343f';b.fillRect(-16,-12,32,24);b.strokeStyle='#4b5563';b.lineWidth=2;b.strokeRect(-16,-12,32,24);for(let i=0;i<4;i++){b.fillStyle=i%2?'#facc15':'#1f2937';b.fillRect(-16+i*8,8,8,4)}if(sr()<.4)BGL.push({x,y,r:90,col:'#ffb35c'});break;
 }
 b.restore();
}
function drawAmbient(){
 const a=ARENAS[Math.max(0,G.arena)]||ARENAS[0],t=G.t||performance.now()/1000;
 ctx.globalCompositeOperation='lighter';
 for(const p of AMB){
  switch(a.amb){
   case 'fog':p.x+=p.s*.3;if(p.x>W+80)p.x=-80;ctx.globalAlpha=.05;ctx.drawImage(glowSpr('#b8b0ff'),p.x-80,p.y-40,160,80);break;
   case 'spore':p.y-=p.s*.4;p.x+=Math.sin(t+p.p)*.3;if(p.y<-10)p.y=H+10;ctx.globalAlpha=.6;ctx.drawImage(glowSpr('#c6ff4a'),p.x-4,p.y-4,8,8);break;
   case 'ember':p.y-=p.s*.7;p.x+=Math.sin(t*2+p.p)*.5;if(p.y<-10){p.y=H+10;p.x=Math.random()*W}ctx.globalAlpha=.5+.5*Math.sin(t*6+p.p);ctx.drawImage(glowSpr('#ff8a3d'),p.x-4,p.y-4,8,8);break;
   case 'snow':p.y+=p.s*.8;p.x+=Math.sin(t+p.p)*.4;if(p.y>H+10){p.y=-10;p.x=Math.random()*W}ctx.globalAlpha=.7;ctx.fillStyle='#fff';ctx.fillRect(p.x,p.y,2*p.s+1,2*p.s+1);break;
   case 'dust':p.x+=Math.cos(t*.3+p.p)*.25;p.y+=Math.sin(t*.4+p.p)*.25;ctx.globalAlpha=.35;ctx.drawImage(glowSpr('#ffd77a'),p.x-3,p.y-3,6,6);break;
   case 'void':p.y-=p.s*.3;if(p.y<-10)p.y=H+10;ctx.globalAlpha=.5;ctx.drawImage(glowSpr('#ff6bd5'),p.x-5,p.y-5,10,10);break;
  }
 }
 ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
}
let LC=null,lc=null;
function lighting(){
 if(!Q().light)return;
 const s=.5,lw=Math.ceil(W*s),lh=Math.ceil(H*s);
 if(!LC||LC.width!==lw||LC.height!==lh){LC=document.createElement('canvas');LC.width=lw;LC.height=lh;lc=LC.getContext('2d')}
 const a=ARENAS[Math.max(0,G.arena)]||ARENAS[0];
 lc.globalCompositeOperation='source-over';lc.clearRect(0,0,lw,lh);lc.fillStyle=G.dark>0?'rgba(0,0,0,.86)':a.dark;lc.fillRect(0,0,lw,lh);
 lc.globalCompositeOperation='destination-out';
 const L=(x,y,r,i)=>{lc.globalAlpha=i;lc.drawImage(LSPR,(x-r)*s,(y-r)*s,r*2*s,r*2*s)};
 if(P)L(P.x,P.y,G.dark>0?190:320,1);
 if(G.dark<=0)for(const l of BGL)L(l.x,l.y,l.r,.8);
 for(let i=0;i<LI.n;i++){const l=LI.a[i];L(l.x,l.y,l.r,Math.min(1,l.t/l.max*1.5))}
 const n=Math.min(PR.n,50);for(let i=0;i<n;i++){const p=PR.a[i];L(p.x,p.y,40+p.r*3,.6)}
 for(const h of HO)L(h.x,h.y,h.r*1.5,.5);for(const t of TW)L(t.x,t.y,70,.5);if(G.boss)L(G.boss.x,G.boss.y,G.boss.r*3,.6);
 lc.globalAlpha=1;lc.globalCompositeOperation='source-over';
 ctx.drawImage(LC,0,0,W,H);
 ctx.globalCompositeOperation='lighter';
 for(let i=0;i<LI.n;i++){const l=LI.a[i];ctx.globalAlpha=.35*l.t/l.max;ctx.drawImage(glowSpr(l.col),l.x-l.r*.6,l.y-l.r*.6,l.r*1.2,l.r*1.2)}
 if(G.dark<=0)for(const l of BGL){ctx.globalAlpha=.12+.04*Math.sin(G.t*3+l.x);ctx.drawImage(glowSpr(l.col),l.x-l.r*.5,l.y-l.r*.5,l.r,l.r)}
 ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
}

/* ================= ZOMBIE SPRITES ================= */
const ZSP=new Map();
function zSprite(z){
 const col=z.col||z.t.col,R=Math.round(z.r),key=z.tid+col+R;let s=ZSP.get(key);if(s)return s;
 const pad=12,size=Math.ceil((R+pad)*2),sc=2;
 const mk=()=>{const c=document.createElement('canvas');c.width=c.height=size*sc;const x=c.getContext('2d');x.scale(sc,sc);x.translate(size/2,size/2);return[c,x]};
 const[cvs,c]=mk(),[wc,w]=mk();
 const g=c.createRadialGradient(-R*.35,-R*.4,R*.1,0,0,R*1.05);g.addColorStop(0,shade(col,.35));g.addColorStop(.55,col);g.addColorStop(1,shade(col,-.5));
 c.fillStyle=g;c.beginPath();c.arc(0,0,R,0,TAU);c.fill();
 /* gescheurde kleding aan de achterkant */
 c.fillStyle='rgba(40,28,52,.6)';c.beginPath();c.moveTo(-R*.95,-R*.35);c.lineTo(-R*.2,-R*.55);c.lineTo(-R*.35,-R*.2);c.lineTo(-R*.05,0);c.lineTo(-R*.4,R*.25);c.lineTo(-R*.2,R*.55);c.lineTo(-R*.95,R*.35);c.arc(0,0,R,Math.PI-.36,Math.PI+.36,true);c.fill();
 /* vlekken */
 c.fillStyle=shade(col,-.35);for(let i=0;i<3;i++){c.beginPath();c.arc(-R*.2+i*R*.18,(i-1)*R*.35,R*.09,0,TAU);c.fill()}
 const t=z.t;
 if(z.tid==='brute'||z.tid==='giant'){c.fillStyle=shade(col,-.3);c.beginPath();c.ellipse(R*.55,0,R*.3,R*.42,0,0,TAU);c.fill();c.strokeStyle=shade(col,-.55);c.lineWidth=1.5;c.beginPath();c.arc(-R*.1,0,R*.5,-1,1);c.stroke()}
 if(z.tid==='armored'){c.fillStyle='#4d5a60';c.beginPath();c.arc(0,0,R,-1.9,1.9);c.lineTo(R*.2,0);c.closePath();c.fill();c.strokeStyle='#a9b6bb';c.lineWidth=1.5;c.stroke();c.fillStyle='#a9b6bb';for(let i=-1;i<=1;i++){c.beginPath();c.arc(R*.55,i*R*.4,1.6,0,TAU);c.fill()}}
 if(z.tid==='healer'){c.fillStyle='#fff';c.fillRect(-R*.5,-2.5,R*.7,5);c.fillRect(-R*.15-2.5,-R*.35,5,R*.7)}
 if(z.tid==='splitter'){c.strokeStyle='#2a1838';c.lineWidth=2;c.beginPath();c.moveTo(-R*.9,0);c.lineTo(R*.6,0);c.stroke();for(let i=-3;i<=2;i++){c.beginPath();c.moveTo(i*R*.25,-3);c.lineTo(i*R*.25,3);c.stroke()}}
 if(z.tid==='spitter'){c.fillStyle='#e7ff7a';c.beginPath();c.arc(-R*.3,R*.35,R*.35,0,TAU);c.fill();c.fillStyle='rgba(255,255,255,.4)';c.beginPath();c.arc(-R*.38,R*.27,R*.1,0,TAU);c.fill()}
 if(z.tid==='toxic'){c.fillStyle='#bef264';for(let i=0;i<5;i++){c.beginPath();c.arc(Math.cos(i*1.3)*R*.55,Math.sin(i*1.3)*R*.55,R*.12+i%2*2,0,TAU);c.fill()}}
 if(z.tid==='regen'){c.strokeStyle='#ff6b4a';c.lineWidth=1.5;for(let i=0;i<4;i++){c.beginPath();c.moveTo(0,0);const a=i*1.6;c.quadraticCurveTo(Math.cos(a+.4)*R*.5,Math.sin(a+.4)*R*.5,Math.cos(a)*R*.9,Math.sin(a)*R*.9);c.stroke()}}
 if(z.tid==='exploder'){c.strokeStyle='#ffd27a';c.lineWidth=2;c.beginPath();c.moveTo(-R*.6,-R*.3);c.lineTo(-R*.1,0);c.lineTo(-R*.4,R*.4);c.moveTo(-R*.1,0);c.lineTo(R*.3,-R*.2);c.stroke()}
 if(z.tid==='minion'){c.fillStyle=shade(col,-.4);for(let i=0;i<5;i++){const a=Math.PI*.6+i*.4;c.beginPath();c.moveTo(Math.cos(a-.12)*R,Math.sin(a-.12)*R);c.lineTo(Math.cos(a)*(R+7),Math.sin(a)*(R+7));c.lineTo(Math.cos(a+.12)*R,Math.sin(a+.12)*R);c.fill()}}
 if(z.tid==='flyer'){c.fillStyle='rgba(30,20,50,.5)';c.beginPath();c.ellipse(-R*.2,0,R*.5,R*.3,0,0,TAU);c.fill()}
 /* mond + tanden + oogkassen */
 c.fillStyle='#160606';c.beginPath();c.ellipse(R*.66,0,R*.14,R*.3,0,0,TAU);c.fill();
 c.fillStyle='#efe6cf';for(let i=-1;i<=1;i++)c.fillRect(R*.6,i*R*.12-1,R*.12,2);
 c.fillStyle='rgba(0,0,0,.55)';c.beginPath();c.arc(R*.42,-R*.33,R*.17,0,TAU);c.arc(R*.42,R*.33,R*.17,0,TAU);c.fill();
 c.strokeStyle=shade(col,-.65);c.lineWidth=2;c.beginPath();c.arc(0,0,R,0,TAU);c.stroke();
 c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=1.5;c.beginPath();c.arc(0,0,R-2,Math.PI*1.1,Math.PI*1.55);c.stroke();
 w.fillStyle='#fff';w.beginPath();w.arc(0,0,R+1,0,TAU);w.fill();
 s={cv:cvs,wc,size};ZSP.set(key,s);return s;
}
function drawZombie(z,c){
 c=c||ctx;const r=z.r,t=z.t,s=zSprite(z),a=z.face||0;
 let alpha=1;
 if(t.invis){const d=P?Math.hypot(P.x-z.x,P.y-z.y):999;alpha=Math.max(z.reveal>0?.85:.08,clamp(1-(d-80)/120,.08,.85));}
 if(t.ghost)alpha=.55;
 const fly=t.fly?8+Math.sin(G.t*6+z.ph)*3:0;
 c.save();c.translate(z.x,z.y);
 c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(0,r*.75,r*(fly?.7:.95),r*(fly?.28:.4),0,0,TAU);c.fill();
 c.translate(0,-fly);c.globalAlpha=alpha;
 if(z.elite)glowAt(c,0,0,r*2.4,'#ffc83d',.5);
 if(t.boom){const p=.5+.5*Math.sin(G.t*10);glowAt(c,0,0,r*(2+p),'#ff7a2d',.4+p*.4)}
 if(t.toxic)glowAt(c,0,0,r*2,'#a3e635',.25);
 if(t.ghost){c.fillStyle='rgba(159,216,232,.25)';c.beginPath();c.moveTo(-Math.cos(a)*r*2.2,-Math.sin(a)*r*2.2);c.lineTo(Math.cos(a+1.6)*r,Math.sin(a+1.6)*r);c.lineTo(Math.cos(a-1.6)*r,Math.sin(a-1.6)*r);c.fill()}
 c.rotate(a);
 if(t.fly){const f=Math.sin(G.t*18+z.ph)*.6;c.fillStyle='rgba(70,50,110,.85)';for(const sd of[-1,1]){c.beginPath();c.moveTo(-r*.2,sd*r*.4);c.quadraticCurveTo(-r*1.4,sd*r*(1.6+f),-r*1.6,sd*r*(.6+f*.4));c.quadraticCurveTo(-r*.9,sd*r*.6,-r*.2,sd*r*.4);c.fill()}}
 const sw=Math.sin(z.ph)*.35,col=z.col||t.col;
 c.strokeStyle=shade(col,-.15);c.lineWidth=r*.36;c.lineCap='round';
 for(const sd of[-1,1]){const sx=r*.2,sy=sd*r*.72,ex=sx+r*(.95+sw*sd*.3),ey=sy+sd*r*.05;c.beginPath();c.moveTo(sx,sy);c.lineTo(ex,ey);c.stroke();c.fillStyle=shade(col,-.3);c.beginPath();c.arc(ex,ey,r*.2,0,TAU);c.fill()}
 c.drawImage(s.cv,-s.size/2,-s.size/2,s.size,s.size);
 if(z.flash>0){c.globalAlpha=alpha*.85;c.drawImage(s.wc,-s.size/2,-s.size/2,s.size,s.size);c.globalAlpha=alpha}
 if(z.shield>0){const f=z.shield/z.shieldMax;c.strokeStyle=`rgba(143,199,255,${.4+f*.5})`;c.lineWidth=4;c.beginPath();c.arc(0,0,r+5,-1,1);c.stroke();c.fillStyle=`rgba(90,140,220,${.25+f*.35})`;c.beginPath();c.arc(0,0,r+5,-1,1);c.arc(0,0,r+1,1,-1,true);c.fill()}
 const ec=t.ghost?'#bff6ff':z.elite?'#ffd84a':z.tid==='minion'?'#fff':'#ff3b3b';
 for(const sd of[-1,1]){c.fillStyle=ec;c.beginPath();c.arc(r*.42,sd*r*.33,Math.max(1.8,r*.11),0,TAU);c.fill();if(Q().glow){c.globalCompositeOperation='lighter';c.drawImage(glowSpr(ec),r*.42-r*.35,sd*r*.33-r*.35,r*.7,r*.7);c.globalCompositeOperation='source-over'}}
 c.rotate(-a);c.globalAlpha=1;
 if(z.frozen>0){c.fillStyle='rgba(170,225,255,.5)';c.beginPath();for(let i=0;i<6;i++){const q=i/6*TAU;c.lineTo(Math.cos(q)*(r+5),Math.sin(q)*(r+5))}c.fill();c.strokeStyle='#eaf8ff';c.lineWidth=1.5;c.stroke()}
 else if(z.slowT>0&&z.slowF<1){c.strokeStyle='rgba(125,211,252,.6)';c.lineWidth=2;c.beginPath();c.arc(0,0,r+3,0,TAU);c.stroke()}
 if(z.root>0){c.strokeStyle='#4ade80';c.lineWidth=2.5;for(let i=0;i<4;i++){const q=i/4*TAU+.4;c.beginPath();c.moveTo(Math.cos(q)*(r+10),Math.sin(q)*(r+10));c.quadraticCurveTo(Math.cos(q+.6)*r,Math.sin(q+.6)*r,Math.cos(q+1.2)*(r-3),Math.sin(q+1.2)*(r-3));c.stroke()}}
 else if(z.stun>0){c.fillStyle=z.hack>0?'#22d3ee':'#fde047';for(let i=0;i<3;i++){const q=G.t*5+i*TAU/3;c.beginPath();c.arc(Math.cos(q)*r*.7,-r-6+Math.sin(q)*3,2.5,0,TAU);c.fill()}if(z.hack>0){c.font='700 11px monospace';c.textAlign='center';c.fillText('</>',0,-r-14)}}
 if(z.poisonT>0){c.strokeStyle='rgba(163,230,53,.6)';c.lineWidth=2;c.setLineDash([3,4]);c.beginPath();c.arc(0,0,r+4,G.t,G.t+TAU);c.stroke();c.setLineDash([])}
 if(z.ampT>0&&z.amp>1){c.fillStyle='#c084fc';c.beginPath();c.moveTo(0,-r-16);c.lineTo(5,-r-10);c.lineTo(0,-r-4);c.lineTo(-5,-r-10);c.fill()}
 if(G.timeStop>0&&!z.boss){c.strokeStyle='rgba(34,211,238,.7)';c.setLineDash([3,3]);c.lineWidth=1.5;c.beginPath();c.arc(0,0,r+4,0,TAU);c.stroke();c.setLineDash([])}
 c.restore();
 if(z.hp<z.maxhp&&alpha>.3){const w=r*2.2,y=z.y-r-12-fly;c.fillStyle='rgba(0,0,0,.65)';c.fillRect(z.x-w/2-1,y-1,w+2,6);c.fillStyle=z.elite?'#ffc83d':'#ff4d6d';c.fillRect(z.x-w/2,y,w*Math.max(0,z.hp/z.maxhp),4);if(z.shield>0){c.fillStyle='#8fc7ff';c.fillRect(z.x-w/2,y-4,w*z.shield/z.shieldMax,2)}}
}
function drawBoss(z){
 const r=z.r,b=z.bdef,a=z.face,t=G.t;ctx.save();ctx.translate(z.x,z.y);
 ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(0,r*.85,r*1.05,r*.42,0,0,TAU);ctx.fill();
 glowAt(ctx,0,0,r*3,b.c2,z.inv>0?.8:.35);
 if(z.idx===4){ctx.strokeStyle=b.c2;ctx.lineWidth=3;ctx.save();ctx.rotate(t);for(let i=0;i<12;i++){ctx.rotate(TAU/12);ctx.beginPath();ctx.moveTo(r+8,0);ctx.lineTo(r+24,0);ctx.stroke()}ctx.restore();ctx.beginPath();ctx.arc(0,0,r+16,0,TAU);ctx.stroke()}
 if(z.idx===2){ctx.fillStyle='rgba(60,20,90,.35)';for(let i=0;i<6;i++){const q=t*2+i;ctx.beginPath();ctx.arc(Math.cos(q)*r*.7,Math.sin(q*1.3)*r*.7,r*.6,0,TAU);ctx.fill()}}
 if(z.idx===5){ctx.fillStyle='rgba(224,247,255,.5)';for(let i=0;i<8;i++){const q=i/8*TAU+t*.3;ctx.beginPath();ctx.moveTo(Math.cos(q)*r*.8,Math.sin(q)*r*.8);ctx.lineTo(Math.cos(q+.12)*(r+22),Math.sin(q+.12)*(r+22));ctx.lineTo(Math.cos(q+.24)*r*.8,Math.sin(q+.24)*r*.8);ctx.fill()}}
 if(z.idx===7){for(const sd of[-1,0,1]){const ha=a+sd*.7+Math.sin(t*3+sd)*.15,hx=Math.cos(ha)*r*1.15,hy=Math.sin(ha)*r*1.15;ctx.strokeStyle=b.col;ctx.lineWidth=r*.35;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(hx,hy);ctx.stroke();ctx.fillStyle=shade(b.col,.1);ctx.beginPath();ctx.arc(hx,hy,r*.32,0,TAU);ctx.fill();ctx.fillStyle=b.c2;ctx.beginPath();ctx.arc(hx+Math.cos(ha)*r*.12,hy+Math.sin(ha)*r*.12,r*.07,0,TAU);ctx.fill()}}
 const col=b.col;ctx.strokeStyle=shade(col,-.1);ctx.lineWidth=r*.36;ctx.lineCap='round';const sw=Math.sin(t*4)*.3;
 if(z.idx!==7)for(const s of[-1,1]){const aa=a+s*.7;ctx.beginPath();ctx.moveTo(Math.cos(aa)*r*.6,Math.sin(aa)*r*.6);ctx.lineTo(Math.cos(aa)*r*.6+Math.cos(a+s*.3+sw*s)*r*.9,Math.sin(aa)*r*.6+Math.sin(a+s*.3+sw*s)*r*.9);ctx.stroke()}
 const g=ctx.createRadialGradient(-r*.35,-r*.4,r*.1,0,0,r*1.05);g.addColorStop(0,shade(col,.4));g.addColorStop(.55,col);g.addColorStop(1,shade(col,-.55));
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();if(z.flash>0){ctx.fillStyle='rgba(255,255,255,.35)';ctx.fill()}ctx.strokeStyle='rgba(0,0,0,.45)';ctx.lineWidth=3;ctx.stroke();
 if(z.idx===0){ctx.strokeStyle='#2a4a25';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-r*.5,-r*.6);ctx.lineTo(r*.3,r*.5);ctx.stroke();for(let i=0;i<5;i++){const f=i/4;ctx.beginPath();ctx.moveTo(-r*.5+f*r*.8-6,-r*.6+f*r*1.1+4);ctx.lineTo(-r*.5+f*r*.8+6,-r*.6+f*r*1.1-4);ctx.stroke()}}
 if(z.idx===1){ctx.fillStyle='#ffd84a';ctx.beginPath();const cy=-r*.95;ctx.moveTo(-r*.6,cy+12);for(let i=0;i<5;i++){ctx.lineTo(-r*.6+i*r*.3,cy-12);ctx.lineTo(-r*.45+i*r*.3,cy+4)}ctx.lineTo(r*.6,cy+12);ctx.fill();ctx.fillStyle='#ff3b5c';ctx.beginPath();ctx.arc(0,cy-2,4,0,TAU);ctx.fill();if(Math.random()<.3)part(z.x+rnd(-r,r),z.y+r*.5,0,30,.6,'#b6ff3b',3,40,1)}
 if(z.idx===2){ctx.fillStyle='#14091f';for(const s of[-1,1]){ctx.beginPath();ctx.moveTo(s*r*.5,-r*.7);ctx.lineTo(s*r*1.15,-r*1.45);ctx.lineTo(s*r*.2,-r*.85);ctx.fill()}}
 if(z.idx===3){ctx.fillStyle='#6b665a';for(let i=0;i<8;i++){const q=i/8*TAU;ctx.beginPath();ctx.moveTo(Math.cos(q)*r,Math.sin(q)*r);ctx.lineTo(Math.cos(q+.1)*(r+14),Math.sin(q+.1)*(r+14));ctx.lineTo(Math.cos(q+.25)*r,Math.sin(q+.25)*r);ctx.fill()}ctx.save();ctx.rotate(a);ctx.fillStyle='#2b2a26';ctx.fillRect(r*.2,-r*.45,r*.5,r*.9);ctx.fillStyle=b.c2;ctx.fillRect(r*.45,-r*.35,r*.12,r*.7);ctx.restore()}
 if(z.idx===6){ctx.save();ctx.rotate(a);ctx.fillStyle='#334155';ctx.fillRect(-r*.6,-r*.75,r*1.1,r*.3);ctx.fillRect(-r*.6,r*.45,r*1.1,r*.3);ctx.fillStyle=b.c2;ctx.fillRect(r*.3,-r*.18,r*.5,r*.36);ctx.fillStyle='#0f172a';for(let i=0;i<3;i++)ctx.fillRect(-r*.5+i*r*.3,-r*.7,r*.18,r*.2);ctx.restore()}
 if(z.idx===5){ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.arc(-r*.2,-r*.25,r*.45,0,TAU);ctx.fill()}
 const ec=b.c2,eyes=z.idx===4?[-.5,-.18,.18,.5]:z.idx===0?[-.4,.35]:z.idx===7?[]:[-.4,.4];
 eyes.forEach((e,i)=>{const ea=a+e,ex=Math.cos(ea)*r*.58,ey=Math.sin(ea)*r*.58,er=z.idx===0&&i===0?r*.2:r*.12;ctx.fillStyle=ec;ctx.beginPath();ctx.arc(ex,ey,er,0,TAU);ctx.fill();glowAt(ctx,ex,ey,er*3,ec,.8)});
 if(z.phase>0){ctx.strokeStyle=z.phase>1?'rgba(255,59,141,.75)':'rgba(255,200,61,.6)';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,0,r+6+Math.sin(t*12)*3,0,TAU);ctx.stroke()}
 if(z.inv>0){ctx.strokeStyle='#fff';ctx.globalAlpha=.6;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r+12,0,TAU);ctx.stroke();ctx.globalAlpha=1}
 ctx.restore();
}

/* ================= HELD ================= */
function drawStaffHead(c,type,col,x,y,s,t,st){
 c.save();c.translate(x,y);c.scale(s,s);
 const gl=r=>{if(Q().glow||c!==ctx){c.globalCompositeOperation='lighter';c.drawImage(glowSpr(col),-r,-r,r*2,r*2);c.globalCompositeOperation='source-over'}};
 gl(14);c.fillStyle=col;c.strokeStyle=col;c.lineWidth=2;
 switch(type){
  case 'spam':for(let i=0;i<3;i++){const q=t*4+i*TAU/3;c.beginPath();c.arc(Math.cos(q)*4,Math.sin(q)*4,3,0,TAU);c.fill()}break;
  case 'laser':case 'beam':c.beginPath();c.moveTo(0,-8);c.lineTo(5,0);c.lineTo(0,8);c.lineTo(-5,0);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(0,0,2,0,TAU);c.fill();break;
  case 'ice':for(let i=0;i<3;i++){c.save();c.rotate(i*Math.PI/3);c.beginPath();c.moveTo(0,-8);c.lineTo(0,8);c.stroke();c.restore()}break;
  case 'sniper':c.beginPath();c.arc(0,0,6,0,TAU);c.stroke();c.beginPath();c.moveTo(0,-9);c.lineTo(0,9);c.moveTo(-9,0);c.lineTo(9,0);c.stroke();break;
  case 'explosion':case 'meteor':if(st&&st.burger){drawBurger(c,0,0,.6);break}c.beginPath();for(let i=0;i<10;i++){const q=i/10*TAU+t,rr=i%2?4:8;c.lineTo(Math.cos(q)*rr,Math.sin(q)*rr)}c.fill();break;
  case 'lightning':c.beginPath();c.moveTo(2,-9);c.lineTo(-4,1);c.lineTo(0,1);c.lineTo(-2,9);c.lineTo(4,-2);c.lineTo(0,-2);c.closePath();c.fill();break;
  case 'void':c.fillStyle='#000';c.beginPath();c.arc(0,0,6,0,TAU);c.fill();c.strokeStyle=col;c.beginPath();c.arc(0,0,7,t*3,t*3+4);c.stroke();break;
  case 'flame':for(let i=0;i<3;i++){c.fillStyle=['#ffef9a','#ffb347',col][i];c.beginPath();c.ellipse(0,-2+i,6-i*1.5,9-i*2+Math.sin(t*12+i)*1.5,0,0,TAU);c.fill()}break;
  case 'crystal':c.beginPath();c.moveTo(0,-10);c.lineTo(5,-2);c.lineTo(0,8);c.lineTo(-5,-2);c.closePath();c.fill();c.fillStyle='rgba(255,255,255,.6)';c.beginPath();c.moveTo(0,-10);c.lineTo(2,-2);c.lineTo(-2,-2);c.fill();break;
  case 'boomerang':c.rotate(t*6);c.lineWidth=3;c.beginPath();c.arc(0,0,7,.3,TAU-1.5);c.stroke();break;
  case 'poison':c.fillStyle='#1f2937';c.fillRect(-2,-9,4,4);c.fillStyle=col;c.beginPath();c.arc(0,1,6,0,TAU);c.fill();c.fillStyle='rgba(255,255,255,.5)';c.beginPath();c.arc(-2,-1,1.5,0,TAU);c.fill();break;
  case 'blood':c.beginPath();c.moveTo(0,-9);c.quadraticCurveTo(7,1,0,7);c.quadraticCurveTo(-7,1,0,-9);c.fill();break;
  case 'rocket':c.rotate(-Math.PI/2);c.fillRect(-3,-6,6,10);c.beginPath();c.moveTo(-3,-6);c.lineTo(0,-11);c.lineTo(3,-6);c.fill();c.fillStyle='#ffef9a';c.fillRect(-2,4,4,3+Math.random()*3);break;
  case 'sound':for(let i=1;i<=3;i++){c.globalAlpha=1-i*.25;c.beginPath();c.arc(0,0,i*3+((t*12)%3),0,TAU);c.stroke()}c.globalAlpha=1;break;
  case 'plasma':c.beginPath();c.arc(0,0,6,0,TAU);c.fill();c.strokeStyle='#fff';c.beginPath();c.ellipse(0,0,9,3,t*3,0,TAU);c.stroke();break;
  case 'shadow':c.beginPath();c.arc(0,0,7,0,TAU);c.fill();c.fillStyle='#0b0614';c.beginPath();c.arc(3,-2,6,0,TAU);c.fill();break;
  case 'quake':c.fillStyle='#8a6a45';c.beginPath();c.moveTo(-7,4);c.lineTo(-4,-6);c.lineTo(4,-7);c.lineTo(7,3);c.lineTo(0,8);c.fill();c.strokeStyle=col;c.beginPath();c.moveTo(-3,-3);c.lineTo(1,1);c.lineTo(-1,5);c.stroke();break;
  case 'time':c.beginPath();c.moveTo(-5,-8);c.lineTo(5,-8);c.lineTo(-5,8);c.lineTo(5,8);c.closePath();c.stroke();c.beginPath();c.moveTo(-3,6);c.lineTo(3,6);c.lineTo(0,2);c.fill();break;
  case 'drone':c.fillStyle='#475569';c.fillRect(-5,-3,10,6);c.fillStyle=col;for(const[dx,dy] of[[-7,-5],[7,-5],[-7,5],[7,5]]){c.beginPath();c.arc(dx,dy,2.5,0,TAU);c.fill()}break;
  case 'tornado':for(let i=0;i<4;i++){c.beginPath();c.ellipse(0,-6+i*4,8-i*1.8,2,0,0,TAU);c.stroke()}break;
  case 'portal':c.lineWidth=3;c.beginPath();c.ellipse(0,0,5,9,0,0,TAU);c.stroke();c.fillStyle='rgba(56,189,248,.35)';c.fill();break;
  case 'soul':c.beginPath();c.arc(0,-2,6,Math.PI,0);c.lineTo(6,6);for(let i=0;i<3;i++)c.lineTo(4-i*4,3+(i%2)*3);c.lineTo(-6,6);c.fill();c.fillStyle='#0b2015';c.fillRect(-3,-3,2,2);c.fillRect(1,-3,2,2);break;
  case 'nuke':c.fillStyle='#1a2e05';c.beginPath();c.arc(0,0,8,0,TAU);c.fill();c.fillStyle=col;for(let i=0;i<3;i++){c.beginPath();c.moveTo(0,0);c.arc(0,0,7,i*TAU/3-.5,i*TAU/3+.5);c.fill()}c.fillStyle='#1a2e05';c.beginPath();c.arc(0,0,2,0,TAU);c.fill();break;
  case 'galaxy':c.strokeStyle=col;for(let i=0;i<2;i++){c.beginPath();for(let k=0;k<20;k++){const q=k*.35+t*2+i*Math.PI,rr=k*.45;c.lineTo(Math.cos(q)*rr,Math.sin(q)*rr)}c.stroke()}c.fillStyle='#fff';c.beginPath();c.arc(0,0,2,0,TAU);c.fill();break;
  case 'rainbow':['#f87171','#fbbf24','#4ade80','#60a5fa','#c084fc'].forEach((cc,i)=>{c.fillStyle=cc;c.beginPath();c.moveTo(0,0);c.arc(0,0,8,i*TAU/5+t*2,(i+1)*TAU/5+t*2);c.fill()});break;
  default:c.beginPath();c.arc(0,0,6+Math.sin(t*6),0,TAU);c.fill();c.fillStyle='#fff';c.globalAlpha=.7;c.beginPath();c.arc(-2,-2,2,0,TAU);c.fill();c.globalAlpha=1;
 }
 c.restore();
}
function drawBurger(c,x,y,s){c.save();c.translate(x,y);c.scale(s,s);
 c.fillStyle='#e8952f';c.beginPath();c.ellipse(0,5,10,4,0,0,TAU);c.fill();
 c.fillStyle='#7a3b1e';c.fillRect(-10,0,20,4);c.fillStyle='#5fd35f';c.fillRect(-11,-2,22,2.5);c.fillStyle='#ffd23f';c.fillRect(-9,-.5,18,1.5);
 c.fillStyle='#f4a73b';c.beginPath();c.arc(0,-2,10.5,Math.PI,0);c.fill();c.fillStyle='rgba(255,255,255,.25)';c.beginPath();c.arc(-3,-6,4,Math.PI,0);c.fill();
 c.fillStyle='#fff6d6';c.fillRect(-4,-8,1.6,1.6);c.fillRect(2,-9,1.6,1.6);c.fillRect(5,-5,1.6,1.6);c.restore()}
/* held: wordt zowel in-game als in de lobby gebruikt */
function drawHero(c,x,y,sc,st,cl,ang,t,o){
 o=o||{};c.save();c.translate(x,y);c.scale(sc,sc);
 c.fillStyle='rgba(0,0,0,.4)';c.beginPath();c.ellipse(0,14,16,6,0,0,TAU);c.fill();
 c.strokeStyle=cl.col;c.lineWidth=2;c.globalAlpha=.75;
 switch(cl.aura){
  case 'ring':c.beginPath();c.arc(0,0,26,0,TAU);c.stroke();break;
  case 'orbit':for(let i=0;i<3;i++){const q=t*2.5+i*TAU/3;c.fillStyle=cl.col;c.beginPath();c.arc(Math.cos(q)*28,Math.sin(q)*28,3.5,0,TAU);c.fill()}break;
  case 'hex':c.beginPath();for(let i=0;i<=6;i++){const q=i/6*TAU+t*.3;c.lineTo(Math.cos(q)*28,Math.sin(q)*28)}c.stroke();break;
  case 'scope':c.beginPath();c.arc(0,0,28,0,TAU);c.stroke();for(let i=0;i<4;i++){const q=i*Math.PI/2+t*.5;c.beginPath();c.moveTo(Math.cos(q)*22,Math.sin(q)*22);c.lineTo(Math.cos(q)*34,Math.sin(q)*34);c.stroke()}break;
  case 'gear':c.save();c.rotate(t);c.setLineDash([6,5]);c.lineWidth=4;c.beginPath();c.arc(0,0,27,0,TAU);c.stroke();c.restore();break;
  case 'skull':for(let i=0;i<4;i++){const q=-t*1.5+i*TAU/4;c.fillStyle='#d9f99d';c.beginPath();c.arc(Math.cos(q)*29,Math.sin(q)*29,3,0,TAU);c.fill()}c.beginPath();c.arc(0,0,24,0,TAU);c.stroke();break;
  case 'holy':c.globalAlpha=.15+.05*Math.sin(t*4);c.fillStyle=cl.col;c.beginPath();c.arc(0,0,o.lobby?40:120,0,TAU);c.fill();c.globalAlpha=.7;c.beginPath();c.arc(0,0,o.lobby?40:120,0,TAU);c.stroke();break;
  case 'clock':c.beginPath();c.arc(0,0,28,0,TAU);c.stroke();c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(t*2)*22,Math.sin(t*2)*22);c.stroke();for(let i=0;i<12;i++){const q=i/12*TAU;c.beginPath();c.moveTo(Math.cos(q)*25,Math.sin(q)*25);c.lineTo(Math.cos(q)*29,Math.sin(q)*29);c.stroke()}break;
  case 'burger':for(let i=0;i<3;i++){const q=t*1.8+i*TAU/3;c.globalAlpha=1;drawBurger(c,Math.cos(q)*30,Math.sin(q)*30,.45)}break;
  case 'flame':for(let i=0;i<6;i++){const q=t*2+i*TAU/6;c.fillStyle=i%2?'#ffb347':'#ff6a3d';c.beginPath();c.ellipse(Math.cos(q)*27,Math.sin(q)*27,3,5+Math.sin(t*10+i)*2,q+Math.PI/2,0,TAU);c.fill()}break;
  case 'frost':for(let i=0;i<6;i++){const q=t*.8+i*TAU/6;c.save();c.translate(Math.cos(q)*28,Math.sin(q)*28);c.rotate(q);c.beginPath();c.moveTo(-4,0);c.lineTo(4,0);c.moveTo(0,-4);c.lineTo(0,4);c.stroke();c.restore()}break;
  case 'rage':c.lineWidth=3;c.beginPath();for(let i=0;i<=24;i++){const q=i/24*TAU,rr=26+(i%2?4:0)+Math.sin(t*12+i)*2;c.lineTo(Math.cos(q)*rr,Math.sin(q)*rr)}c.stroke();break;
  case 'leaf':for(let i=0;i<5;i++){const q=t*1.2+i*TAU/5;c.fillStyle='#4ade80';c.beginPath();c.ellipse(Math.cos(q)*28,Math.sin(q)*28,5,2.5,q,0,TAU);c.fill()}break;
  case 'paw':for(let i=0;i<4;i++){const q=i/4*TAU+t*.6;c.fillStyle=cl.col;c.beginPath();c.arc(Math.cos(q)*28,Math.sin(q)*28,3.5,0,TAU);c.fill();c.beginPath();c.arc(Math.cos(q)*33,Math.sin(q)*33,1.8,0,TAU);c.fill()}break;
  case 'bat':for(let i=0;i<3;i++){const q=-t*2+i*TAU/3,bx=Math.cos(q)*29,by=Math.sin(q)*29,f=Math.sin(t*14+i)*3;c.fillStyle='#4c0519';c.beginPath();c.moveTo(bx,by);c.lineTo(bx-6,by-3-f);c.lineTo(bx-3,by+1);c.lineTo(bx,by-1);c.lineTo(bx+3,by+1);c.lineTo(bx+6,by-3-f);c.fill()}break;
  case 'storm':c.beginPath();c.arc(0,0,27,0,TAU);c.stroke();if(Math.sin(t*7)>.6){const q=Math.random()*TAU;c.strokeStyle='#fff';c.beginPath();c.moveTo(Math.cos(q)*20,Math.sin(q)*20);c.lineTo(Math.cos(q+.2)*30,Math.sin(q+.2)*30);c.lineTo(Math.cos(q+.1)*36,Math.sin(q+.1)*36);c.stroke()}break;
  case 'code':c.font='700 8px monospace';c.fillStyle=cl.col;for(let i=0;i<6;i++){const q=t+i*TAU/6;c.fillText((t*10+i|0)%2?'1':'0',Math.cos(q)*28-2,Math.sin(q)*28+3)}break;
  case 'banner':c.beginPath();c.arc(0,0,26,0,TAU);c.stroke();c.fillStyle=cl.col;c.fillRect(-22,-30,2,22);c.beginPath();c.moveTo(-20,-30);c.lineTo(-8+Math.sin(t*5)*2,-26);c.lineTo(-20,-22);c.fill();break;
  case 'dice':for(let i=0;i<2;i++){const q=t*1.5+i*Math.PI;c.save();c.translate(Math.cos(q)*29,Math.sin(q)*29);c.rotate(t*2);c.fillStyle='#ecfdf5';c.fillRect(-4,-4,8,8);c.fillStyle='#064e3b';c.fillRect(-1,-1,2,2);c.restore()}break;
  case 'rift':c.save();c.rotate(t);c.beginPath();c.ellipse(0,0,30,14,0,0,TAU);c.stroke();c.rotate(Math.PI/2);c.beginPath();c.ellipse(0,0,30,14,0,0,TAU);c.stroke();c.restore();break;
 }
 c.globalAlpha=1;
 if(o.shield){c.strokeStyle='#9fd8ff';c.lineWidth=3;c.beginPath();for(let i=0;i<=6;i++){const q=i/6*TAU;c.lineTo(Math.cos(q)*22,Math.sin(q)*22)}c.stroke()}
 if(o.rage){c.strokeStyle='#ef4444';c.lineWidth=2;c.beginPath();c.arc(0,0,20+Math.sin(t*20)*2,0,TAU);c.stroke()}
 const bob=Math.sin(o.walk!=null?o.walk:t*3)*1.5;
 /* cape */
 const ca=ang+Math.PI,cw=Math.sin(t*4)*.15;c.fillStyle=shade(cl.col,-.45);c.beginPath();c.moveTo(Math.cos(ca+1.3)*12,Math.sin(ca+1.3)*12+bob);c.quadraticCurveTo(Math.cos(ca+cw)*30,Math.sin(ca+cw)*30+6,Math.cos(ca-1.3)*12,Math.sin(ca-1.3)*12+bob);c.fill();
 /* staf (achter of voor afhankelijk van richting) */
 const sx=Math.cos(ang)*30,sy=Math.sin(ang)*30-8;
 const drawStaff=()=>{c.strokeStyle='#6b4226';c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(-Math.cos(ang)*8,-Math.sin(ang)*8+8);c.lineTo(sx,sy);c.stroke();c.strokeStyle='#8a5a3b';c.lineWidth=1.5;c.stroke();
  c.strokeStyle=RAR[st.r].c;c.lineWidth=4;c.beginPath();c.moveTo(sx*.75,sy*.75-1);c.lineTo(sx*.86,sy*.86-1);c.stroke();
  drawStaffHead(c,st.type,st.col,sx,sy-2,1,t,st)};
 if(Math.sin(ang)<0)drawStaff();
 /* lichaam / robe */
 const g=c.createRadialGradient(-5,-4+bob,2,0,bob,17);g.addColorStop(0,shade(cl.col,-.15));g.addColorStop(1,shade(cl.col,-.7));
 c.fillStyle=o.hurt?'#ff6b8a':g;c.beginPath();c.arc(0,bob,15,0,TAU);c.fill();c.strokeStyle=cl.col;c.lineWidth=2;c.stroke();
 c.strokeStyle=RAR[st.r].c;c.lineWidth=1.5;c.beginPath();c.arc(0,bob,11,.3,Math.PI-.3);c.stroke();
 /* hoed */
 c.fillStyle=shade(cl.col,-.2);c.beginPath();c.ellipse(0,-5+bob,17,6,0,0,TAU);c.fill();
 c.fillStyle=cl.col;c.beginPath();c.moveTo(-10,-7+bob);c.quadraticCurveTo(-3,-32+bob,11+Math.cos(ang)*4,-28+bob+Math.sin(t*3)*1.5);c.quadraticCurveTo(4,-17+bob,10,-7+bob);c.fill();
 c.fillStyle=RAR[st.r].c;c.fillRect(-9,-9+bob,19,2.5);
 /* gezicht */
 c.fillStyle='#ffe2c4';c.beginPath();c.arc(Math.cos(ang)*4,2+bob+Math.sin(ang)*3,6,0,TAU);c.fill();
 const ex=Math.cos(ang)*7,ey=1+bob+Math.sin(ang)*4;c.fillStyle=cl.col;c.beginPath();c.arc(ex-2.2,ey,1.5,0,TAU);c.arc(ex+2.6,ey,1.5,0,TAU);c.fill();
 if(Math.sin(ang)>=0)drawStaff();
 c.restore();
}
function drawWall(w){
 ctx.save();ctx.translate(w.x,w.y);const f=w.hp/w.maxhp;
 ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(0,w.r*.7,w.r,w.r*.4,0,0,TAU);ctx.fill();
 const g=ctx.createLinearGradient(0,-w.r,0,w.r);g.addColorStop(0,'#55507a');g.addColorStop(1,'#2a2640');
 ctx.fillStyle=w.hit>0?'#fff':g;ctx.beginPath();for(let i=0;i<6;i++){const q=i/6*TAU+Math.PI/6;ctx.lineTo(Math.cos(q)*w.r,Math.sin(q)*w.r)}ctx.closePath();ctx.fill();
 ctx.strokeStyle=w.col||'#60a5fa';ctx.lineWidth=2;ctx.globalAlpha=.35+.65*f;ctx.stroke();ctx.globalAlpha=1;
 ctx.fillStyle='rgba(255,255,255,.1)';ctx.beginPath();ctx.arc(-4,-6,7,0,TAU);ctx.fill();
 if(f<.6){ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-8,-6);ctx.lineTo(0,2);ctx.lineTo(6,-2);if(f<.3){ctx.moveTo(0,2);ctx.lineTo(-3,10)}ctx.stroke()}
 ctx.restore();
}
function drawTower(t){
 const kd=TK[t.kind];ctx.save();ctx.translate(t.x,t.y);
 ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(0,13,t.r+2,6,0,0,TAU);ctx.fill();
 const s=t.r;const g=ctx.createLinearGradient(0,-s,0,s);g.addColorStop(0,'#3a3456');g.addColorStop(1,'#1c1830');
 ctx.fillStyle=t.hit>0?'#fff':g;ctx.beginPath();ctx.roundRect?ctx.roundRect(-s,-s,s*2,s*2,5):ctx.rect(-s,-s,s*2,s*2);ctx.fill();ctx.strokeStyle=kd.col;ctx.lineWidth=2;ctx.stroke();
 glowAt(ctx,0,0,s*1.6,kd.col,.35);
 if(t.kind==='burger'){drawBurger(ctx,0,0,.9)}
 else{ctx.rotate(t.ang);ctx.fillStyle=shade(kd.col,.3);
  if(t.kind==='tesla'){ctx.restore();ctx.save();ctx.translate(t.x,t.y);ctx.strokeStyle=kd.col;ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,0,4+i*3,0,TAU);ctx.stroke()}if(Math.random()<.2)boltFx(t.x,t.y,t.x+rnd(-18,18),t.y+rnd(-18,18),kd.col,1)}
  else if(t.kind==='rocket'){ctx.fillRect(0,-7,16,5);ctx.fillRect(0,2,16,5);ctx.fillStyle=kd.col;ctx.beginPath();ctx.arc(0,0,7,0,TAU);ctx.fill()}
  else if(t.kind==='cannon'){ctx.fillStyle='#57534e';ctx.fillRect(0,-5,20,10);ctx.fillStyle='#a8a29e';ctx.beginPath();ctx.arc(0,0,9,0,TAU);ctx.fill()}
  else if(t.kind==='mega'){ctx.fillRect(0,-8,22,5);ctx.fillRect(0,3,22,5);ctx.fillStyle=kd.col;ctx.beginPath();ctx.arc(0,0,11,0,TAU);ctx.fill()}
  else{ctx.fillRect(0,-3.5,t.kind==='mini'?14:20,7);ctx.fillStyle=kd.col;ctx.beginPath();ctx.arc(0,0,t.kind==='mini'?6:8,0,TAU);ctx.fill()}}
 ctx.restore();
 for(let i=0;i<t.lvl;i++){ctx.fillStyle='#facc15';ctx.fillRect(t.x-14+i*6,t.y+t.r+3,4,4)}
 if(t.hp<t.maxhp){ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(t.x-16,t.y-t.r-8,32,3);ctx.fillStyle=kd.col;ctx.fillRect(t.x-16,t.y-t.r-8,32*t.hp/t.maxhp,3)}
}
function drawMinion(m){
 ctx.save();ctx.translate(m.x,m.y);ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(0,m.r*.8,m.r,m.r*.4,0,0,TAU);ctx.fill();
 const c=m.hit>0?'#fff':m.col,f=m.face||0;
 switch(m.kind){
  case 'imp':ctx.fillStyle='#16a34a';for(const s of[-1,1]){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(s*14,-6+Math.sin(m.ph)*4);ctx.lineTo(s*8,4);ctx.fill()}ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,0,m.r,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(-4,-3,3,3);ctx.fillRect(1,-3,3,3);break;
  case 'skel':ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,0,m.r,0,TAU);ctx.fill();ctx.fillStyle='#1a1a1a';ctx.beginPath();ctx.arc(-3.5,-1,2.6,0,TAU);ctx.arc(3.5,-1,2.6,0,TAU);ctx.fill();ctx.fillRect(-3,4,6,2);glowAt(ctx,0,-1,10,'#a3e635',.4);break;
  case 'wolf':ctx.rotate(f);ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(0,0,m.r*1.3,m.r*.8,0,0,TAU);ctx.fill();ctx.beginPath();ctx.moveTo(m.r,-4);ctx.lineTo(m.r*1.9,0);ctx.lineTo(m.r,4);ctx.fill();ctx.fillStyle='#57534e';ctx.beginPath();ctx.moveTo(m.r*.6,-m.r*.7);ctx.lineTo(m.r*.9,-m.r*1.2);ctx.lineTo(m.r*1.1,-m.r*.5);ctx.fill();ctx.fillStyle='#fde047';ctx.fillRect(m.r*1.1,-3,2,2);break;
  case 'soldier':case 'elite':ctx.rotate(f);ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,0,m.r,0,TAU);ctx.fill();ctx.fillStyle='#1f2937';ctx.fillRect(2,-2,m.r+6,4);ctx.fillStyle=shade(m.col,-.4);ctx.beginPath();ctx.arc(0,0,m.r*.6,0,TAU);ctx.fill();if(m.kind==='elite')glowAt(ctx,0,0,m.r*2,m.col,.4);break;
  default:ctx.fillStyle=c;ctx.beginPath();for(let i=0;i<8;i++){const q=i/8*TAU,rr=m.r*(i%2?.88:1.05);ctx.lineTo(Math.cos(q)*rr,Math.sin(q)*rr)}ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=2;ctx.stroke();
   const cc=m.kind==='bear'?'#fb923c':'#4ade80';ctx.fillStyle=cc;ctx.beginPath();ctx.arc(0,0,7,0,TAU);ctx.fill();glowAt(ctx,0,0,20,cc,.6);
 }
 ctx.restore();
 if(m.hp<m.maxhp){ctx.fillStyle='#4ade80';ctx.fillRect(m.x-m.r,m.y-m.r-7,m.r*2*m.hp/m.maxhp,3)}
}
function drawProj(p){
 const c=ctx;
 switch(p.kind){
  case 'void':c.fillStyle='#000';c.beginPath();c.arc(p.x,p.y,p.r,0,TAU);c.fill();c.strokeStyle=p.col;c.lineWidth=2;c.stroke();glowAt(c,p.x,p.y,p.r*2.5,p.col,.6);return;
  case 'ice':c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.vy,p.vx));c.fillStyle=p.col;c.beginPath();c.moveTo(11,0);c.lineTo(-6,-4);c.lineTo(-3,0);c.lineTo(-6,4);c.fill();c.fillStyle='#fff';c.fillRect(-2,-1,8,2);c.restore();glowAt(c,p.x,p.y,16,p.col,.5);return;
  case 'boomer':c.save();c.translate(p.x,p.y);c.rotate(p.spin);c.strokeStyle=p.col;c.lineWidth=5;c.lineCap='round';c.beginPath();c.arc(0,0,p.r*.8,.2,Math.PI*1.3);c.stroke();c.restore();glowAt(c,p.x,p.y,20,p.col,.4);return;
  case 'crystal':case 'frag':c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.vy,p.vx));c.fillStyle=p.col;c.beginPath();c.moveTo(p.r*1.8,0);c.lineTo(0,-p.r);c.lineTo(-p.r*1.2,0);c.lineTo(0,p.r);c.fill();c.fillStyle='rgba(255,255,255,.7)';c.beginPath();c.moveTo(p.r*1.8,0);c.lineTo(0,-p.r*.4);c.lineTo(0,0);c.fill();c.restore();glowAt(c,p.x,p.y,p.r*3,p.col,.4);return;
  case 'rocket':c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.vy,p.vx));c.fillStyle='#e5e7eb';c.fillRect(-7,-3,12,6);c.fillStyle=p.col;c.beginPath();c.moveTo(5,-3);c.lineTo(10,0);c.lineTo(5,3);c.fill();c.fillStyle='#ef4444';c.fillRect(-8,-5,4,10);c.restore();glowAt(c,p.x-p.vx*.02,p.y-p.vy*.02,14,'#ffb347',.9);return;
  case 'plasma':glowAt(c,p.x,p.y,p.r*3,p.col,.7);c.fillStyle='#e0fbff';c.beginPath();c.arc(p.x,p.y,p.r*.6,0,TAU);c.fill();c.strokeStyle=p.col;c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,p.r,G.t*8,G.t*8+4);c.stroke();return;
  case 'spirit':c.globalAlpha=.85;c.fillStyle=p.col;c.beginPath();c.arc(p.x,p.y,p.r,0,TAU);c.fill();c.globalAlpha=.35;c.beginPath();c.arc(p.x-p.vx*.04,p.y-p.vy*.04,p.r*.8,0,TAU);c.fill();c.globalAlpha=1;c.fillStyle='#0b2015';c.fillRect(p.x-3,p.y-2,2,2);c.fillRect(p.x+1,p.y-2,2,2);glowAt(c,p.x,p.y,p.r*3,p.col,.5);return;
  case 'nuke':c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.vy,p.vx));c.fillStyle='#3f6212';c.beginPath();c.ellipse(0,0,13,7,0,0,TAU);c.fill();c.fillStyle=p.col;c.beginPath();c.arc(0,0,4,0,TAU);c.fill();c.fillStyle='#1a2e05';c.fillRect(-15,-6,4,12);c.restore();glowAt(c,p.x,p.y,30,p.col,.5);return;
  case 'star':c.save();c.translate(p.x,p.y);c.rotate(G.t*8);c.fillStyle=p.col;c.beginPath();for(let i=0;i<10;i++){const q=i/10*TAU,rr=i%2?p.r*.5:p.r*1.4;c.lineTo(Math.cos(q)*rr,Math.sin(q)*rr)}c.fill();c.restore();glowAt(c,p.x,p.y,p.r*4,p.col,.6);if(Q().pm>300&&Math.random()<.3)part(p.x,p.y,0,0,.4,'#fff',2,0,1);return;
  case 'poison':c.fillStyle=p.col;c.beginPath();c.arc(p.x,p.y,p.r,0,TAU);c.fill();c.fillStyle='#ecfccb';c.beginPath();c.arc(p.x-2,p.y-2,2,0,TAU);c.fill();glowAt(c,p.x,p.y,p.r*3,p.col,.5);return;
  case 'time':c.strokeStyle=p.col;c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,p.r,0,TAU);c.stroke();c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x+Math.cos(G.t*10)*p.r,p.y+Math.sin(G.t*10)*p.r);c.stroke();glowAt(c,p.x,p.y,p.r*3,p.col,.5);return;
 }
 if(p.burger){drawBurger(c,p.x,p.y,p.kind==='tower'?.6:.8);return}
 const tl=p.kind==='spam'?.012:.025;
 glowAt(c,p.x,p.y,p.r*3.2,p.col,.55);
 c.strokeStyle=p.col;c.lineWidth=p.r*1.3;c.lineCap='round';c.globalAlpha=.5;c.beginPath();c.moveTo(p.x-p.vx*tl,p.y-p.vy*tl);c.lineTo(p.x,p.y);c.stroke();c.globalAlpha=1;
 c.fillStyle=p.col;c.beginPath();c.arc(p.x,p.y,p.r,0,TAU);c.fill();
 if(p.kind!=='spam'){c.fillStyle='#fff';c.beginPath();c.arc(p.x,p.y,p.r*.45,0,TAU);c.fill()}
}
const CAM={x:0,y:0,z:1};
function render(){
 ctx.setTransform(DPR,0,0,DPR,0,0);
 if(G.state==='lobby'){ctx.fillStyle='#07060d';ctx.fillRect(0,0,W,H);return}
 if(!BG)buildBg();
 /* camera (zoom tijdens boss intro) */
 const tz=G.intro?1.28:1,tx=G.intro?G.intro.z.x:W/2,ty=G.intro?G.intro.z.y+60:H/2;
 const cf=G.intro?.08:.2;CAM.z+=(tz-CAM.z)*cf;CAM.x+=(tx-CAM.x)*cf;CAM.y+=(ty-CAM.y)*cf;
 if(Math.abs(CAM.z-1)<.002){CAM.z=1;CAM.x=W/2;CAM.y=H/2}
 let sx=0,sy=0;if(G.shake>0&&!G.paused){sx=rnd(-1,1)*G.shake*10;sy=rnd(-1,1)*G.shake*10}
 ctx.save();ctx.translate(W/2+sx,H/2+sy);ctx.scale(CAM.z,CAM.z);ctx.translate(-CAM.x,-CAM.y);
 ctx.drawImage(BG,0,0,W,H);
 for(const d of DEC){const f=Math.min(1,d.t/3);ctx.globalAlpha=f*(d.kind==='blood'?.35:.5);ctx.fillStyle=d.kind==='blood'?'#3d0d12':'#0c0a0a';ctx.beginPath();ctx.ellipse(d.x,d.y,d.r,d.r*.7,d.rot,0,TAU);ctx.fill();if(d.kind==='crater'){ctx.strokeStyle='rgba(255,140,60,.25)';ctx.lineWidth=2;ctx.stroke()}}
 ctx.globalAlpha=1;
 if(AMB.length&&ARENAS[Math.max(0,G.arena)].amb==='fog')drawAmbient();
 for(const z of ZO){const f=Math.min(1,z.life/.5,(z.max-z.life)/.3+.2);if(z.k==='freeze'){ctx.fillStyle=`rgba(190,235,255,${.2*f})`;ctx.strokeStyle=`rgba(224,247,255,${.6*f})`}else{ctx.fillStyle=`rgba(140,230,45,${(z.small?.15:.22)*f})`;ctx.strokeStyle=`rgba(200,255,80,${.5*f})`}
  ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,TAU);ctx.fill();ctx.lineWidth=2;if(!z.small)ctx.stroke();if(!z.small&&Math.random()<.15)part(z.x+rnd(-z.r,z.r)*.7,z.y+rnd(-z.r,z.r)*.7,0,-20,.6,z.k==='freeze'?'#e0f7ff':'#c6ff4a',3,0,1)}
 for(const c of CL){const f=Math.min(1,c.life/.6);ctx.globalAlpha=.2*f;ctx.drawImage(glowSpr(c.col),c.x-c.r*1.2,c.y-c.r*1.2,c.r*2.4,c.r*2.4);ctx.globalAlpha=.4*f;ctx.strokeStyle=c.col;ctx.setLineDash([6,8]);ctx.lineWidth=2;ctx.beginPath();ctx.arc(c.x,c.y,c.r,G.t,G.t+TAU);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;if(c.rad){ctx.fillStyle='rgba(190,242,100,.5)';ctx.font='700 14px sans-serif';ctx.textAlign='center';ctx.fillText('☢',c.x,c.y+5)}}
 for(const f of FI){const a=Math.min(1,f.life/.5);ctx.strokeStyle=f.col;ctx.globalAlpha=.6*a;ctx.lineWidth=2;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,TAU);ctx.stroke();ctx.globalAlpha=.08*a;ctx.fillStyle=f.col;ctx.fill();ctx.globalAlpha=.6*a;ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.lineTo(f.x+Math.cos(G.t*3)*f.r*.8,f.y+Math.sin(G.t*3)*f.r*.8);ctx.moveTo(f.x,f.y);ctx.lineTo(f.x+Math.cos(G.t*.5)*f.r*.5,f.y+Math.sin(G.t*.5)*f.r*.5);ctx.stroke();ctx.globalAlpha=1}
 for(const h of HO){const f=Math.min(1,h.life/.4,(h.max-h.life)/.2+.2);const g=ctx.createRadialGradient(h.x,h.y,0,h.x,h.y,h.r);g.addColorStop(0,`rgba(0,0,0,${.95*f})`);g.addColorStop(.45,`rgba(30,5,60,${.8*f})`);g.addColorStop(1,'rgba(120,60,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,TAU);ctx.fill();
  ctx.strokeStyle=`rgba(190,140,255,${.7*f})`;ctx.lineWidth=2;ctx.save();ctx.translate(h.x,h.y);ctx.rotate(G.t*4);for(let i=0;i<3;i++){ctx.rotate(TAU/3);ctx.beginPath();ctx.arc(0,0,h.r*.55,0,1.4);ctx.stroke()}ctx.restore()}
 for(const t of TE){const f=1-t.t/t.max,col=t.ally?'255,200,80':'255,40,80';ctx.fillStyle=`rgba(${col},${.1+f*.22})`;ctx.strokeStyle=`rgba(${col},.85)`;ctx.lineWidth=2;
  if(t.k==='c'){ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,TAU);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(t.x,t.y,t.r*f,0,TAU);ctx.fill()}
  else{ctx.save();ctx.lineWidth=t.w*2;ctx.strokeStyle=`rgba(${col},${.12+f*.3})`;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(t.x,t.y);ctx.lineTo(t.x2,t.y2);ctx.stroke();ctx.restore()}}
 for(const w of WL){drawWall(w);w.hit-=1/60}
 for(const t of TW){drawTower(t);t.hit-=1/60}
 for(const k of PK){const y=k.y+Math.sin(G.t*5+k.bob)*3;if(k.k==='burger'){glowAt(ctx,k.x,y,26,'#ffc83d',.5);drawBurger(ctx,k.x,y,1)}else{glowAt(ctx,k.x,y,22,'#a3e635',.6);ctx.fillStyle='#1f2937';ctx.fillRect(k.x-2,y-10,4,4);ctx.fillStyle={heal:'#f87171',rage:'#fb923c',speed:'#60a5fa'}[k.pot];ctx.beginPath();ctx.arc(k.x,y,7,0,TAU);ctx.fill()}}
 for(const m of MN)drawMinion(m);
 for(const z of Z){if(!z.boss)drawZombie(z)}
 for(const z of Z){if(z.boss)drawBoss(z)}
 for(const p of PL){glowAt(ctx,p.x,p.y,24,p.col,.6);ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,9,0,TAU);ctx.fill();ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.arc(p.x-3,p.y-3,3,0,TAU);ctx.fill()}
 for(const t of TN){const f=Math.min(1,t.life/.4);ctx.save();ctx.translate(t.x,t.y);for(let i=0;i<6;i++){ctx.globalAlpha=(.15+i*.06)*f;ctx.strokeStyle=i%2?'#e5e7eb':t.col;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,-i*7,t.r*(1-i*.11),t.r*.35*(1-i*.11),0,t.rot+i,t.rot+i+4.5);ctx.stroke()}ctx.restore();ctx.globalAlpha=1}
 for(const p of PO){const f=Math.min(1,p.life/.3,(p.max-p.life)/.2);ctx.save();ctx.translate(p.x,p.y);ctx.scale(f,f);glowAt(ctx,0,0,40,p.col,.6);ctx.strokeStyle=p.col;ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,0,14,26,0,0,TAU);ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,0,9,20,0,p.ang,p.ang+3);ctx.stroke();ctx.fillStyle='rgba(10,20,40,.7)';ctx.beginPath();ctx.ellipse(0,0,11,23,0,0,TAU);ctx.fill();ctx.restore()}
 if(P&&G.state!=='lobby')drawHero(ctx,P.x,P.y,1,K.st,K.cl,P.ang,G.t,{shield:P.shieldT>0,rage:P.rateT>0||P.rageT>0||P.potT>0,hurt:P.hurtT>0,walk:P.walk});
 for(const d of DR){ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.a);ctx.fillStyle='#475569';ctx.fillRect(-6,-4,12,8);ctx.fillStyle='#cbd5e1';ctx.fillRect(2,-1.5,7,3);ctx.restore();glowAt(ctx,d.x,d.y,12,P&&P.droneOvT>0?'#f87171':'#93c5fd',.7);ctx.strokeStyle='rgba(203,213,225,.5)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(d.x,d.y,9,G.t*20,G.t*20+1);ctx.stroke()}
 if(P&&P.beamVis){const b=P.beamVis,tp=tip(),w=b.w*(1+Math.sin(G.t*40)*.15);ctx.globalCompositeOperation='lighter';ctx.strokeStyle=K.st.col;ctx.lineCap='round';ctx.lineWidth=w*2.2;ctx.globalAlpha=.35;ctx.beginPath();ctx.moveTo(tp.x,tp.y);ctx.lineTo(b.x2,b.y2);ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=w;ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=w*.35;ctx.stroke();ctx.globalCompositeOperation='source-over';glowAt(ctx,b.x2,b.y2,w*5,K.st.col,.8)}
 for(let i=0;i<PR.n;i++)drawProj(PR.a[i]);
 ctx.globalCompositeOperation='lighter';
 for(const f of FX){const k=f.t/f.max;
  if(f.k==='beam'){ctx.strokeStyle=f.col;ctx.globalAlpha=k;ctx.lineWidth=f.w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(f.x1,f.y1);ctx.lineTo(f.x2,f.y2);ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=f.w*.35;ctx.stroke();ctx.globalAlpha=1}
  else if(f.k==='bolt'){ctx.strokeStyle=f.col;ctx.globalAlpha=k;ctx.lineWidth=f.w*2;ctx.globalAlpha=k*.35;ctx.beginPath();f.pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();ctx.globalAlpha=k;ctx.lineWidth=f.w;ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke();ctx.globalAlpha=1}
  else if(f.k==='ring'){ctx.strokeStyle=f.col;ctx.globalAlpha=k;ctx.lineWidth=f.w*k+1;ctx.beginPath();ctx.arc(f.x,f.y,Math.max(1,f.r1+(f.r0-f.r1)*k),0,TAU);ctx.stroke();ctx.globalAlpha=1}
  else if(f.k==='arc'){const r=f.r*(1-k*.7);ctx.strokeStyle=f.col;ctx.globalAlpha=k;ctx.lineWidth=5;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(f.x,f.y,Math.max(5,r-i*18),f.ang-.55,f.ang+.55);ctx.stroke()}ctx.globalAlpha=1}
  else if(f.k==='crack'){ctx.globalCompositeOperation='source-over';ctx.strokeStyle=`rgba(255,200,120,${k*.7})`;ctx.lineWidth=2;let s=f.seed;const r2=()=>(s=(s*9301+49297)%233280)/233280;for(let i=0;i<9;i++){const a=i/9*TAU+r2();ctx.beginPath();ctx.moveTo(f.x,f.y);let x=f.x,y=f.y;for(let j=1;j<=4;j++){x=f.x+Math.cos(a+r2()*.4-.2)*f.r*j/4;y=f.y+Math.sin(a+r2()*.4-.2)*f.r*j/4;ctx.lineTo(x,y)}ctx.stroke()}ctx.globalCompositeOperation='lighter'}
  else if(f.k==='fall'){const y=f.y-300*k;if(f.burger){ctx.globalCompositeOperation='source-over';drawBurger(ctx,f.x,y,1.2);ctx.globalCompositeOperation='lighter'}else{ctx.drawImage(glowSpr(f.col),f.x-16,y-16,32,32);ctx.globalAlpha=.5;ctx.fillStyle=f.col;ctx.beginPath();ctx.moveTo(f.x-8,y);ctx.lineTo(f.x+8,y);ctx.lineTo(f.x+30,y-90);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#ffe9b0';ctx.beginPath();ctx.arc(f.x,y,8,0,TAU);ctx.fill()}}}
 for(let i=0;i<PT.n;i++){const p=PT.a[i],a=Math.max(0,p.t/p.max);ctx.globalAlpha=a;if(p.glow&&Q().glow){const s=p.s*2.4;ctx.drawImage(glowSpr(p.col),p.x-s,p.y-s,s*2,s*2)}else{ctx.fillStyle=p.col;ctx.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s)}}
 ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
 for(let i=0;i<EP.n;i++){const e=EP.a[i];glowAt(ctx,e.x,e.y,e.r*2.6,e.col,.7);
  if(e.missile){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(Math.atan2(e.vy,e.vx));ctx.fillStyle='#d1d5db';ctx.fillRect(-7,-3,12,6);ctx.fillStyle='#ef4444';ctx.beginPath();ctx.moveTo(5,-3);ctx.lineTo(10,0);ctx.lineTo(5,3);ctx.fill();ctx.restore()}
  else{ctx.fillStyle=e.col;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,TAU);ctx.fill();ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.arc(e.x,e.y,e.r*.45,0,TAU);ctx.fill()}}
 for(const h of HZ){if(h.k==='wave'){ctx.strokeStyle=h.col;ctx.lineWidth=10;ctx.globalAlpha=.6*(1-h.r/h.max);ctx.beginPath();ctx.arc(h.x,h.y,h.r,0,TAU);ctx.stroke();ctx.globalAlpha=1}
  else if(h.k==='laser'&&!h.z.dead){const x2=h.z.x+Math.cos(h.ang)*1400,y2=h.z.y+Math.sin(h.ang)*1400;ctx.globalCompositeOperation='lighter';ctx.strokeStyle=h.col;ctx.lineWidth=h.w*2*(1+Math.sin(G.t*40)*.1);ctx.globalAlpha=.4;ctx.beginPath();ctx.moveTo(h.z.x,h.z.y);ctx.lineTo(x2,y2);ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=h.w*.8;ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=h.w*.3;ctx.stroke();ctx.globalCompositeOperation='source-over'}}
 lighting();
 if(AMB.length&&ARENAS[Math.max(0,G.arena)].amb!=='fog')drawAmbient();
 /* damage numbers met pop-animatie */
 ctx.textAlign='center';ctx.lineJoin='round';
 for(let i=0;i<TX.n;i++){const t=TX.a[i],age=t.max-t.t,pop=age<.12?1.7-age/.12*.7:1,sz=t.size*pop*(t.crit?1.1:1);
  ctx.globalAlpha=Math.min(1,t.t/.3);ctx.font=`700 ${sz|0}px 'Chakra Petch',sans-serif`;ctx.strokeStyle='rgba(0,0,0,.8)';ctx.lineWidth=t.crit?4:3;ctx.strokeText(t.s,t.x,t.y);ctx.fillStyle=t.col;ctx.fillText(t.s,t.x,t.y)}
 ctx.globalAlpha=1;
 ctx.restore();
 /* overlays in scherm-ruimte */
 if(G.intro){const f=Math.min(1,(G.intro.max-G.intro.t)/.4,G.intro.t/.4),bh=H*.12*f;ctx.fillStyle='#000';ctx.fillRect(0,0,W,bh);ctx.fillRect(0,H-bh,W,bh)}
 if(G.flash>0){ctx.globalAlpha=Math.min(.75,G.flash);ctx.fillStyle=G.flashCol;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1}
 if(P&&G.state==='play'&&P.hp<P.maxhp*.3){const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.7);g.addColorStop(0,'rgba(255,0,60,0)');g.addColorStop(1,`rgba(255,0,60,${.25+.1*Math.sin(G.t*6)})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
 if(JOY.active){ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(JOY.ox,JOY.oy,50,0,TAU);ctx.stroke();ctx.fillStyle='rgba(61,255,166,.5)';ctx.beginPath();ctx.arc(JOY.ox+JOY.dx*50,JOY.oy+JOY.dy*50,20,0,TAU);ctx.fill()}
 if(!S.set.autoAttack&&G.state==='play'&&FINE){ctx.strokeStyle='rgba(61,255,166,.85)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(M.x,M.y,10,0,TAU);ctx.moveTo(M.x-16,M.y);ctx.lineTo(M.x-6,M.y);ctx.moveTo(M.x+6,M.y);ctx.lineTo(M.x+16,M.y);ctx.stroke()}
}
const FINE=window.matchMedia?matchMedia('(pointer:fine)').matches:true;

/* ================= LOBBY STAGE ================= */
const stage=$('#stage'),sctx=stage.getContext('2d');let SW=0,SH=0;const SP=[];
function renderStage(t){
 const r=stage.getBoundingClientRect();if(r.width<2)return;const d=Math.min(2,devicePixelRatio||1);
 if(SW!==Math.round(r.width)||SH!==Math.round(r.height)){SW=Math.round(r.width);SH=Math.round(r.height);stage.width=SW*d;stage.height=SH*d}
 const c=sctx;c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,SW,SH);
 const st=STAFF[S.eqStaff],cl=CLS[S.eqClass],cx=SW/2,cy=SH*.58,sc=Math.min(3.4,Math.min(SW,SH)/110);
 /* podium */
 const pg=c.createRadialGradient(cx,cy+20*sc,10,cx,cy+20*sc,60*sc);pg.addColorStop(0,cl.col+'55');pg.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=pg;c.beginPath();c.ellipse(cx,cy+16*sc,70*sc,22*sc,0,0,TAU);c.fill();
 c.strokeStyle=RAR[st.r].c;c.globalAlpha=.6;c.lineWidth=2;c.beginPath();c.ellipse(cx,cy+16*sc,46*sc,13*sc,0,0,TAU);c.stroke();c.globalAlpha=.3;c.setLineDash([8,8]);c.lineDashOffset=-t*20;c.beginPath();c.ellipse(cx,cy+16*sc,58*sc,17*sc,0,0,TAU);c.stroke();c.setLineDash([]);c.globalAlpha=1;
 /* opstijgende deeltjes */
 if(SP.length<40&&Math.random()<.5)SP.push({x:cx+rnd(-50,50)*sc,y:cy+16*sc,v:rnd(20,60),l:1,col:Math.random()<.5?cl.col:st.col});
 c.globalCompositeOperation='lighter';
 for(let i=SP.length-1;i>=0;i--){const p=SP[i];p.y-=p.v/60;p.l-=1/150;if(p.l<=0){SP.splice(i,1);continue}c.globalAlpha=p.l;c.drawImage(glowSpr(p.col),p.x-5,p.y-5,10,10)}
 c.globalAlpha=1;c.globalCompositeOperation='source-over';
 const ang=.5+Math.sin(t*.6)*.35;
 drawHero(c,cx,cy+Math.sin(t*1.6)*3,sc,st,cl,ang,t,{lobby:true});
 c.globalCompositeOperation='lighter';c.globalAlpha=.5+.2*Math.sin(t*3);const sx=cx+Math.cos(ang)*30*sc,sy=cy+(Math.sin(ang)*30-10)*sc;c.drawImage(glowSpr(st.col),sx-40,sy-40,80,80);c.globalAlpha=1;c.globalCompositeOperation='source-over';
}
