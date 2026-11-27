'use strict';

/* ---------- dados de demonstração ---------- */
const REGIONS=[
  {n:'Centro Comercial',lat:-23.5505,lng:-46.6333,night:46,peak:79,prof:'rush'},
  {n:'Terminal Rodoviário',lat:-23.5290,lng:-46.6320,night:50,peak:83,prof:'rush'},
  {n:'Avenida Principal',lat:-23.5614,lng:-46.6559,night:52,peak:85,prof:'rush'},
  {n:'Campus Universitário',lat:-23.5700,lng:-46.6800,night:40,peak:65,prof:'day'},
  {n:'Bairro Residencial',lat:-23.5850,lng:-46.6200,night:34,peak:58,prof:'rush'},
  {n:'Parque Municipal',lat:-23.5880,lng:-46.6580,night:33,peak:52,prof:'day'},
  {n:'Distrito Industrial',lat:-23.5250,lng:-46.6020,night:48,peak:80,prof:'work'},
  {n:'Hospital Regional',lat:-23.5400,lng:-46.6600,night:44,peak:60,prof:'day'}
];
const gauss=(x,m,s)=>Math.exp(-((x-m)*(x-m))/(2*s*s));
const sig=x=>1/(1+Math.exp(-x));
function activity(p,h){
  if(p==='work')return clamp(0.1+0.9*sig((h-6.5)*1.6)*sig((17.5-h)*1.6),0,1);
  if(p==='day')return clamp(0.1+0.8*gauss(h,10,2.8)+0.8*gauss(h,15,2.8),0,1);
  return clamp(0.08+0.9*gauss(h,8,1.7)+1.0*gauss(h,18,2)+0.6*gauss(h,13,2.6),0,1);
}
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function genDemo(){
  const r=rng(Math.floor(Date.now()/864e5)*7919+11);
  const nrm=()=>Math.sqrt(-2*Math.log(r()+1e-9))*Math.cos(2*Math.PI*r());
  const out=[];const now=Date.now();const base=new Date();base.setHours(0,0,0,0);
  for(let d=0;d<7;d++)for(let h=0;h<24;h++)REGIONS.forEach((g,gi)=>{
    if(r()>0.55)return;
    const ts=base.getTime()-d*864e5+(h*60+Math.floor(r()*60))*6e4;
    if(ts>now)return;
    const act=activity(g.prof,h+0.5);
    const db=clamp(g.night+(g.peak-g.night)*act+nrm()*2.6,28,105);
    out.push({id:'d'+ts+'-'+gi,ts,db:Math.round(db*10)/10,freq:Math.round(110+r()*700),lat:g.lat+nrm()*0.0010,lng:g.lng+nrm()*0.0010,region:g.n,demo:true});
  });
  return out;
}
async function initData(){
  S.memOnly=!(await Store.open());
  S.data=S.memOnly?[]:await Store.all();
  const demo=S.data.filter(d=>d.demo);
  const newest=demo.reduce((m,d)=>Math.max(m,d.ts),0);
  if(!demo.length||Date.now()-newest>36*36e5){
    if(demo.length){await Store.del(demo);S.data=S.data.filter(d=>!d.demo);}
    const g=genDemo();S.data=S.data.concat(g);await Store.putMany(g);
  }
}
