'use strict';

/* ---------- dashboard ---------- */
const D={period:'7d',src:'all',limit:30};
const CH={};
function chartsReady(){
  if(!window.Chart)return false;
  Chart.defaults.color=COL.muted;Chart.defaults.font.family=css('--f-body')||'sans-serif';
  Chart.defaults.borderColor='rgba(120,160,255,.12)';Chart.defaults.animation=reduce?false:{duration:450};
  return true;
}
function mk(id,cfg){
  if(CH[id]){CH[id].data=cfg.data;CH[id].options=cfg.options;CH[id].update('none');return;}
  CH[id]=new Chart(document.getElementById(id),cfg);
}
const dashRows=()=>filt({period:D.period,src:D.src});
// Média energética em dB (Leq), supondo medições de mesma duração
const leqOf=list=>list.length?10*Math.log10(list.reduce((s,v)=>s+Math.pow(10,v/10),0)/list.length):null;
const MIN_DAYS=3; // dias diferentes exigidos em um horário para estimar
function hourly(rows){
  const g=Array.from({length:24},()=>[]);
  rows.forEach(d=>g[hourOf(d.ts)].push(d.db));
  return g.map(leqOf);
}
function updateNow(){
  const t=$('#t-now');
  if(S.running&&S.cur!=null){
    setT($('#t-now-l'),'Nível atual · ao vivo');setT($('#t-now-v'),n1(S.cur));t.dataset.cls=cls(S.cur);
    setT($('#t-now-s'),CLS[cls(S.cur)].label+(S.mode==='demo'?' · simulação':''));return;
  }
  const rows=dashRows().slice().sort((a,b)=>b.ts-a.ts);
  if(!rows.length){setT($('#t-now-l'),'Última medição');setT($('#t-now-v'),'—');t.dataset.cls='idle';setT($('#t-now-s'),'sem medições');return;}
  const d=rows[0];
  setT($('#t-now-l'),'Última medição');setT($('#t-now-v'),n1(d.db));t.dataset.cls=cls(d.db);
  setT($('#t-now-s'),(d.region||'Sem localização')+' · '+fmtDate(d.ts));
}
function renderDash(){
  const rows=dashRows();
  const avg=rows.length?rows.reduce((s,d)=>s+d.db,0)/rows.length:null;
  const leq=leqOf(rows.map(d=>d.db));
  const mx=rows.reduce((m,d)=>!m||d.db>m.db?d:m,null);
  updateNow();
  setT($('#t-avg'),leq==null?'—':n1(leq));setT($('#t-avg-s'),avg==null?'sem dados':'Leq · média simples: '+n1(avg)+' dB');
  setT($('#t-max'),mx?n1(mx.db):'—');setT($('#t-max-s'),mx?(mx.region||'Sem localização')+' · '+fmtDate(mx.ts):'sem dados');
  $('#t-max-c').dataset.cls=mx?cls(mx.db):'idle';
  setT($('#t-n'),n0(rows.length));
  setT($('#t-n-s'),n0(rows.filter(d=>d.lat!=null).length)+' com localização');

  const hv=hourly(rows);
  // horários mais barulhentos + previsão
  const ranked=hv.map((v,h)=>({h:h,v:v})).filter(x=>x.v!=null).sort((a,b)=>b.v-a.v);
  const ul=$('#hrs');ul.textContent='';
  ranked.slice(0,5).forEach(x=>{
    const li=document.createElement('li');li.dataset.cls=cls(x.v);
    const a=document.createElement('span');a.textContent=String(x.h).padStart(2,'0')+'h–'+String((x.h+1)%24).padStart(2,'0')+'h';
    const b=document.createElement('span');b.className='bar';const i=document.createElement('i');i.style.width=clamp((x.v-30)/70,0.03,1)*100+'%';b.append(i);
    const v=document.createElement('span');v.className='v';v.textContent=n1(x.v)+' dB';
    li.append(a,b,v);ul.append(li);});
  if(!ranked.length){const li=document.createElement('li');li.textContent='Sem dados para o período.';ul.append(li);}
  const daysByHour=Array.from({length:24},()=>new Set());
  rows.forEach(d=>daysByHour[hourOf(d.ts)].add(new Date(d.ts).toDateString()));
  const enough=h=>daysByHour[h].size>=MIN_DAYS;
  const peak=ranked.find(x=>enough(x.h));
  setT($('#fc-peak'),peak?String(peak.h).padStart(2,'0')+'h · ≈ '+n0(peak.v)+' dB':'Dados insuficientes');
  const nowH=new Date().getHours();
  setT($('#fc-now'),enough(nowH)?'≈ '+n0(hv[nowH])+' dB (às '+String(nowH).padStart(2,'0')+'h)':'Dados insuficientes');

  renderTable(rows);
  setT($('#store-note'),S.memOnly?'O armazenamento local não está disponível neste navegador. Os dados valem apenas nesta sessão.':'Dados guardados neste navegador. Nenhum áudio é armazenado.');

  if(!chartsReady())return;
  const hours=Array.from({length:24},(_,i)=>i);
  const grid={color:'rgba(120,160,255,.10)'};
  mk('ch-hour',{type:'bar',data:{labels:hours.map(h=>h+'h'),datasets:[
    {label:'Leq (dB)',data:hv,backgroundColor:hv.map(v=>v==null?'transparent':COL[cls(v)]+'cc'),borderRadius:4,order:2},
    {type:'line',label:'Moderado ('+T.quiet+' dB)',data:hours.map(()=>T.quiet),borderColor:COL.mod,borderDash:[6,5],borderWidth:1.5,pointRadius:0,order:1},
    {type:'line',label:'Crítico ('+T.crit+' dB)',data:hours.map(()=>T.crit),borderColor:COL.crit,borderDash:[6,5],borderWidth:1.5,pointRadius:0,order:1}]},
    options:{responsive:true,maintainAspectRatio:false,scales:{y:{min:30,suggestedMax:95,grid:grid,title:{display:true,text:'dB'}},x:{grid:{display:false},ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:12}}},plugins:{legend:{position:'bottom',labels:{boxWidth:10,usePointStyle:true}}}}});

  const regs=regionsOf(rows).map(r=>({name:r.name,avg:leqOf(rows.filter(d=>(d.region||'Sem localização')===r.name).map(d=>d.db))})).sort((a,b)=>b.avg-a.avg);
  mk('ch-region',{type:'bar',data:{labels:regs.map(r=>r.name),datasets:[{label:'Leq (dB)',data:regs.map(r=>Math.round(r.avg*10)/10),backgroundColor:regs.map(r=>COL[cls(r.avg)]+'cc'),borderRadius:4}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,scales:{x:{min:30,suggestedMax:95,grid:grid,title:{display:true,text:'dB'}},y:{grid:{display:false}}},plugins:{legend:{display:false}}}});

  // um item por dia, em ordem crescente; dias sem medição ficam vazios
  const days=new Map();
  rows.forEach(d=>{const k=new Date(d.ts).setHours(0,0,0,0);if(!days.has(k))days.set(k,[]);days.get(k).push(d.db);});
  const dk=[];
  if(days.size){
    const keys=Array.from(days.keys()),last=Math.max(...keys);
    for(const dt=new Date(Math.min(...keys));dt.getTime()<=last;dt.setDate(dt.getDate()+1))dk.push(dt.getTime());
  }
  const dv=dk.map(k=>days.has(k)?Math.round(leqOf(days.get(k))*10)/10:null);
  mk('ch-day',{type:'line',data:{labels:dk.map(k=>new Date(k).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})),datasets:[{label:'Leq (dB)',data:dv,borderColor:COL.cyan,backgroundColor:'rgba(34,211,238,.14)',fill:true,tension:0,spanGaps:false,pointRadius:3,pointBackgroundColor:COL.cyan}]},
    options:{responsive:true,maintainAspectRatio:false,scales:{y:{min:30,suggestedMax:90,grid:grid,title:{display:true,text:'dB'}},x:{grid:{display:false}}},plugins:{legend:{display:false}}}});

  const cn={quiet:0,mod:0,crit:0};rows.forEach(d=>cn[cls(d.db)]++);
  mk('ch-cls',{type:'doughnut',data:{labels:['Tranquilo','Moderado','Crítico'],datasets:[{data:[cn.quiet,cn.mod,cn.crit],backgroundColor:[COL.quiet,COL.mod,COL.crit],borderColor:'#081330',borderWidth:3}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'66%',plugins:{legend:{position:'bottom',labels:{boxWidth:10,usePointStyle:true}},tooltip:{callbacks:{label:c=>{const t=rows.length||1;return ' '+c.label+': '+n0(c.parsed)+' ('+n0(c.parsed/t*100)+'%)';}}}}}});
}
function renderTable(rows){
  const tb=$('#tb');tb.textContent='';
  const list=rows.slice().sort((a,b)=>b.ts-a.ts);
  list.slice(0,D.limit).forEach(d=>{
    const tr=document.createElement('tr');
    const c=(t,k)=>{const td=document.createElement('td');if(k)td.className=k;td.textContent=t;return td;};
    tr.append(c(fmtDate(d.ts)),c(d.region||'Sem localização'),c(n1(d.db)+' dB','num'));
    const tc=document.createElement('td');const bd=document.createElement('span');bd.className='badge';bd.dataset.cls=cls(d.db);bd.textContent=CLS[cls(d.db)].label;tc.append(bd);tr.append(tc);
    tr.append(c(d.freq?n0(d.freq)+' Hz':'—','num'),c(d.demo?'Demonstração':'Real'));
    tb.append(tr);
  });
  if(!list.length){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=6;td.textContent='Nenhuma medição no período. Inicie o monitoramento para criar as suas.';tr.append(td);tb.append(tr);}
  $('#btn-more').hidden=list.length<=D.limit;
}
$('#d-period').addEventListener('change',e=>{D.period=e.target.value;D.limit=30;renderDash();});
$('#d-src').addEventListener('change',e=>{D.src=e.target.value;D.limit=30;renderDash();});
$('#btn-more').addEventListener('click',()=>{D.limit+=30;renderTable(dashRows());});
$('#btn-regen').addEventListener('click',async()=>{
  const old=S.data.filter(d=>d.demo);await Store.del(old);S.data=S.data.filter(d=>!d.demo);
  const g=genDemo();S.data=S.data.concat(g);await Store.putMany(g);M.fitted=false;renderHome();renderDash();
});
let clearArm=0;
$('#btn-clear').addEventListener('click',async e=>{
  const b=e.currentTarget;
  if(!clearArm){clearArm=setTimeout(()=>{clearArm=0;b.textContent='Apagar minhas medições';},4000);b.textContent='Confirmar: apagar minhas medições';return;}
  clearTimeout(clearArm);clearArm=0;b.textContent='Apagar minhas medições';
  const mine=S.data.filter(d=>!d.demo);await Store.del(mine);S.data=S.data.filter(d=>d.demo);renderHome();renderDash();
});