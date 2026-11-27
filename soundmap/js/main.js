'use strict';

/* ---------- eventos gerais ---------- */
$('#opt-save').checked=S.opts.save;$('#opt-geo').checked=S.opts.geo;
$('#opt-save').addEventListener('change',e=>{S.opts.save=e.target.checked;saveOpts();if(S.running)updateSaved();});
$('#opt-geo').addEventListener('change',e=>{S.opts.geo=e.target.checked;saveOpts();});
$('#btn-start').addEventListener('click',()=>startMon('mic'));
$('#btn-demo').addEventListener('click',()=>startMon('demo'));
$('#btn-demo2').addEventListener('click',()=>startMon('demo'));
$('#btn-stop').addEventListener('click',stopMon);
$('#chip-stop').addEventListener('click',stopMon);
window.addEventListener('pagehide',()=>{if(S.running)stopMon();});
window.addEventListener('hashchange',route);
window.addEventListener('resize',()=>{if(S.route==='inicio'&&reduce)drawHero(0.6);if(S.route==='mapa'&&M.map)M.map.invalidateSize();if(S.route==='monitor'&&!S.running)drawIdle();});

/* ---------- início do app ---------- */
setIdleUi();
initData().then(()=>{renderHome();route();});
