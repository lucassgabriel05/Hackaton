'use strict';

/* ---------- monitoramento: interface ---------- */
function setIdleUi(){
  $('#meter').dataset.cls='idle';
  const b=$('#cls-badge');b.dataset.cls='idle';setT($('#cls-t'),'Aguardando');
  setT($('#db-num'),'—');
  setT($('#cls-msg'),'Inicie o monitoramento para ver o nível do ambiente.');
  $('#scale-marker').style.left='0%';
  ['k-wave','k-freq','k-amp','k-int','k-db','k-spec'].forEach(id=>setT($('#'+id),'—'));
}
function setRunUi(on){
  $('#consent').hidden=on;$('#runbar').hidden=!on;
  $('#livechip').classList.toggle('on',on);
  $('#run-sim').hidden=S.mode!=='demo';
  setT($('#run-title'),S.mode==='demo'?'Som simulado (sem microfone)':'Monitorando o microfone');
  $('#opt-geo').disabled=on;
}
function showError(t){setT($('#mon-error-t'),t);$('#mon-error').hidden=false;}
function updateSaved(){
  setT($('#st-saved'),String(S.saved));
  const sub=S.mode==='demo'?'Medições da simulação não são salvas.':(S.opts.save?'Salvando uma medição a cada 10 s · ':'Salvamento desativado · ')+geoText();
  setT($('#run-sub'),sub);
}
let geoMsg='';
const geoText=()=>'Localização: '+(geoMsg||(S.opts.geo?'aguardando':'desativada'));
function setGeo(t){geoMsg=t;if(S.running)updateSaved();}
function startGeo(){
  geoMsg='';
  if(!S.opts.geo){setGeo('desativada');return;}
  if(!navigator.geolocation){setGeo('indisponível neste navegador');return;}
  try{
    S.watch=navigator.geolocation.watchPosition(
      p=>{S.pos={lat:p.coords.latitude,lng:p.coords.longitude,acc:p.coords.accuracy};setGeo('ativa, precisão ±'+n0(p.coords.accuracy)+' m');},
      e=>{S.pos=null;setGeo(e&&e.code===1?'negada ou bloqueada, medições sem posição':'indisponível, medições sem posição');},
      {enableHighAccuracy:true,maximumAge:15000,timeout:20000});
  }catch(e){setGeo('indisponível');}
}
