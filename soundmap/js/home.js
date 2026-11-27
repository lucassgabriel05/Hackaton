'use strict';

/* ---------- início ---------- */
function renderHome(){
  const strip=$('#home-strip');strip.textContent='';
  const demo=S.data.filter(d=>d.demo);
  const regs=new Set(demo.map(d=>d.region)).size;
  const mine=S.data.length-demo.length;
  const add=(b,t)=>{const s=document.createElement('span');const e=document.createElement('b');e.textContent=b;s.append(e,' '+t);strip.append(s);};
  add(n0(demo.length),'medições de demonstração');
  add(String(regs),'regiões fictícias');
  add('7 dias','de histórico');
  if(mine>0)add(n0(mine),mine===1?'medição sua':'medições suas');
}
function drawHero(t){
  const c=$('#cv-hero');if(!c)return;const dpr=fit(c);const g=ctx2(c);if(!g)return;
  const w=c.width,h=c.height;g.clearRect(0,0,w,h);
  g.strokeStyle='rgba(120,160,255,.10)';g.lineWidth=1;
  for(let i=1;i<6;i++){const y=h*i/6;g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
  for(let k=4;k>=0;k--){
    g.beginPath();
    for(let x=0;x<=w;x+=3){
      const u=x/w,env=Math.sin(Math.PI*u);
      const y=h*0.46+env*h*0.30*Math.sin(u*(5+k*2.4)+t*(0.9+k*0.35)+k*1.3)*(1-k*0.16);
      if(x===0)g.moveTo(x,y);else g.lineTo(x,y);
    }
    g.lineWidth=(k===0?3:1.6)*dpr;
    g.strokeStyle=k===0?COL.cyan:COL.blue;g.globalAlpha=k===0?1:0.55-k*0.07;
    g.shadowColor=k===0?COL.cyan:'transparent';g.shadowBlur=k===0?14*dpr:0;
    g.stroke();
  }
  g.globalAlpha=1;g.shadowBlur=0;
}
function startHero(){
  if(reduce){drawHero(0.6);return;}
  if(heroState.raf)return;
  const loop=t=>{if(S.route!=='inicio'){heroState.raf=0;return;}drawHero(t/1000);heroState.raf=requestAnimationFrame(loop);};
  heroState.raf=requestAnimationFrame(loop);
}
