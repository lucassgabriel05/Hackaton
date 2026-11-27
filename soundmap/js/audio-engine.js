'use strict';

/* ---------- monitoramento: áudio ---------- */
function buildDemo(){
  const ctx=E.ctx,g=ctx.createGain();g.gain.value=0.0001;
  [[110,.35,'sine'],[220,.5,'sine'],[440,.3,'triangle'],[980,.18,'sine'],[2400,.08,'sine']].forEach(a=>{
    const o=ctx.createOscillator();o.type=a[2];o.frequency.value=a[0];
    const og=ctx.createGain();og.gain.value=a[1];o.connect(og);og.connect(g);o.start();E.nodes.push(o);});
  const nb=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const d=nb.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  const ns=ctx.createBufferSource();ns.buffer=nb;ns.loop=true;
  const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1800;
  const ng=ctx.createGain();ng.gain.value=0.25;ns.connect(lp);lp.connect(ng);ng.connect(g);ns.start();E.nodes.push(ns);
  g.connect(E.an);
  let lvl=52;
  const step=()=>{
    lvl=clamp(lvl+(Math.random()-0.5)*16+(62-lvl)*0.08,36,92);
    if(Math.random()<0.08)lvl=clamp(lvl+18,36,95);
    const rms=Math.pow(10,(lvl-CAL_BASE)/20);
    g.gain.setTargetAtTime(rms/0.55,ctx.currentTime,0.35);
  };
  step();E.demoTimer=setInterval(step,1800);
}
async function startMon(mode){
  if(S.running)return;
  $('#mon-error').hidden=true;
  try{
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)throw new Error('sem-audio');
    E.ctx=new AC();
    E.an=E.ctx.createAnalyser();E.an.fftSize=4096;E.an.smoothingTimeConstant=0.6;E.an.minDecibels=-110;E.an.maxDecibels=-10;
    if(mode==='mic'){
      if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error('sem-mic');
      E.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:1}});
      const src=E.ctx.createMediaStreamSource(E.stream);src.connect(E.an);E.nodes.push(src);
    }else buildDemo();
    if(E.ctx.state==='suspended')await E.ctx.resume();
  }catch(err){
    teardown();
    const n=err&&err.name;
    let m='Não foi possível usar o microfone.';
    if(n==='NotAllowedError'||n==='SecurityError')m='O acesso ao microfone foi negado ou está bloqueado neste ambiente. Permita o microfone nas configurações do navegador ou abra o SoundMap diretamente no navegador do seu aparelho.';
    else if(n==='NotFoundError'||n==='OverconstrainedError')m='Nenhum microfone foi encontrado neste aparelho.';
    else if(n==='NotReadableError')m='O microfone está em uso por outro aplicativo.';
    else if(err&&err.message==='sem-mic')m='Este navegador ou ambiente não oferece acesso ao microfone.';
    showError(m);return;
  }
  E.t=new Float32Array(E.an.fftSize);E.f=new Float32Array(E.an.frequencyBinCount);
  E.sm=null;E.scale=0.01;E.pk.fill(-120);
  S.running=true;S.mode=mode;S.cur=null;S.freq=null;S.hist=[];S.buf=[];S.bufStart=Date.now();S.saved=0;
  S.session={n:0,sum:0,max:0};
  fixOldRecords();
  if(mode==='mic')startGeo();else setGeo('não usada');
  setRunUi(true);updateSaved();
  E.timer=setInterval(tick,40);
}
function teardown(){
  clearInterval(E.timer);clearInterval(E.demoTimer);
  try{if(E.stream)E.stream.getTracks().forEach(t=>t.stop());}catch(e){}
  try{if(E.ctx)E.ctx.close();}catch(e){}
  E.stream=null;E.ctx=null;E.an=null;E.nodes=[];
}
function stopMon(){
  if(!S.running)return;
  S.running=false;
  if(S.mode==='mic')flushBuf(true);
  if(S.watch!=null&&navigator.geolocation){try{navigator.geolocation.clearWatch(S.watch);}catch(e){}}
  S.watch=null;S.pos=null;
  teardown();S.cur=null;
  setRunUi(false);setIdleUi();drawIdle();
  if(S.route==='dashboard')renderDash();
}
function dominant(){
  const sr=E.ctx.sampleRate,hz=sr/E.an.fftSize,f=E.f;
  const lo=Math.max(1,Math.ceil(20/hz)),hi=Math.min(f.length-2,Math.floor(20000/hz));
  let bi=lo,bv=-Infinity;
  for(let i=lo;i<=hi;i++){if(f[i]>bv){bv=f[i];bi=i;}}
  if(!isFinite(bv)||bv<-95)return null;
  const a=f[bi-1],c=f[bi+1],den=a-2*bv+c;
  const d=den?clamp(0.5*(a-c)/den,-1,1):0;
  return (bi+d)*hz;
}
function tick(){
  if(!S.running||!E.an)return;
  const an=E.an;an.getFloatTimeDomainData(E.t);an.getFloatFrequencyData(E.f);
  let sum=0,pk=0;
  for(let i=0;i<E.t.length;i++){const x=E.t[i];sum+=x*x;const a=Math.abs(x);if(a>pk)pk=a;}
  const rms=Math.sqrt(sum/E.t.length);
  const dbfs=20*Math.log10(Math.max(rms,1e-7));
  const raw=clamp(dbfs+CAL_BASE,15,130);
  E.sm=E.sm==null?raw:E.sm+(raw-E.sm)*(raw>E.sm?0.5:0.12);
  S.cur=E.sm;
  const now=performance.now();
  if(S.route==='monitor'){drawWave(pk);drawSpec();}
  if(now-E.lu>150){E.lu=now;updateMeter();}
  if(now-E.ls>250){E.ls=now;sample();}
}
function sample(){
  const db=S.cur;if(db==null)return;
  const f=dominant();S.freq=f;
  const s=S.session;s.n++;s.sum+=db;if(db>s.max)s.max=db;
  S.hist.push(db);if(S.hist.length>240)S.hist.shift();
  if(S.mode==='mic'&&S.opts.save){S.buf.push({db:db,f:f});if(Date.now()-S.bufStart>=10000)flushBuf(false);}
  if(S.route==='monitor')drawHist();
  updateConcepts();
}

/* ---------- Registro de medições com identificação da rua ---------- */

const GEO_CACHE_KEY = 'ruidometro_street_cache_v2';
const SEM_RUA = 'Local não identificado';
const streetRequests = new Map();
let geoQueue = Promise.resolve();

function getStreetCache() {
  try {
    return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || '{}');
  } catch (err) {
    return {};
  }
}

// Consulta o OpenStreetMap (Nominatim)
async function fetchStreet(lat, lng, key) {
  try {
    const res = await fetch(
      'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18' +
      '&accept-language=pt-BR&lat=' + lat + '&lon=' + lng
    );
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const a = (await res.json()).address || {};
    const road = a.road || a.pedestrian || a.footway;
    if (!road) return SEM_RUA;

    const street = [road, a.suburb || a.neighbourhood].filter(Boolean).join(', ');
    try {
      const cache = getStreetCache();
      cache[key] = street;
      localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
    } catch (err) {
      console.warn('Não foi possível salvar o endereço:', err);
    }
    return street;
  } catch (err) {
    console.warn('Falha ao identificar a rua:', err);
    return SEM_RUA;
  }
}

function identifyStreet(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Promise.resolve(SEM_RUA);
  }

  const key = lat.toFixed(4) + ',' + lng.toFixed(4);
  const cached = getStreetCache()[key];
  if (cached) return Promise.resolve(cached);

  if (!streetRequests.has(key)) {
    const request = geoQueue.then(() => fetchStreet(lat, lng, key));
    // no máximo 1 consulta por segundo (regra do serviço gratuito)
    geoQueue = request.then(() => new Promise(ok => setTimeout(ok, 1100)));
    streetRequests.set(key, request);
    request.then(() => streetRequests.delete(key));
  }
  return streetRequests.get(key);
}

// Troca o nome da rua em uma medição já salva e atualiza a tela
async function applyStreet(rec) {
  const street = await identifyStreet(rec.lat, rec.lng);
  // ignora se a rua não foi encontrada ou se a medição foi apagada
  if (street === SEM_RUA || !S.data.includes(rec)) return;

  rec.location = street;
  rec.region = street;
  Store.put(rec);

  if (S.route === 'dashboard') renderDash();
}

// Corrige medições antigas salvas sem o nome da rua
let oldRecordsFixed = false;

async function fixOldRecords() {
  if (oldRecordsFixed) return;
  oldRecordsFixed = true;

  const old = S.data.filter(d =>
    !d.demo && Number.isFinite(d.lat) && Number.isFinite(d.lng) &&
    /^(Microfone|Minhas medições|Local não identificado)/.test(d.location || d.region || '')
  );

  for (const rec of old) await applyStreet(rec);
}

function flushBuf(final) {
  const b = S.buf;

  if (!b.length || (final && b.length < 4)) {
    S.buf = [];
    S.bufStart = Date.now();
    return;
  }

  const leq = 10 * Math.log10(
    b.reduce((sum, x) => sum + Math.pow(10, x.db / 10), 0) / b.length
  );

  const frequencies = b
    .map(x => x.f)
    .filter(Boolean)
    .sort((a, b) => a - b);

  const freq = frequencies.length
    ? frequencies[Math.floor(frequencies.length / 2)]
    : null;

  const pos = S.opts.geo && S.pos ? S.pos : null;
  const lat = pos ? Number(pos.lat) : null;
  const lng = pos ? Number(pos.lng) : null;

  const rec = {
    id: 'r' + Date.now() + Math.random().toString(36).slice(2, 6),
    ts: Date.now(),
    db: Math.round(leq * 10) / 10,
    freq: freq ? Math.round(freq) : null,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    location: SEM_RUA,
    region: SEM_RUA,
    demo: false
  };

  // Salva na hora; o nome da rua é preenchido quando a busca responder
  S.data.push(rec);
  Store.put(rec);
  S.saved++;
  S.buf = [];
  S.bufStart = Date.now();
  updateSaved();

  applyStreet(rec);
}

function updateMeter(){
  const db=S.cur;if(db==null)return;
  const k=cls(db),c=CLS[k];
  setT($('#db-num'),n1(db));
  const m=$('#meter');if(m.dataset.cls!==k)m.dataset.cls=k;
  const b=$('#cls-badge');if(b.dataset.cls!==k){b.dataset.cls=k;}
  setT($('#cls-t'),c.label);setT($('#cls-msg'),c.msg);
  $('#scale-marker').style.left=clamp((db-30)/80,0,1)*100+'%';
  const s=S.session;
  if(s.n){setT($('#st-avg'),n1(s.sum/s.n));setT($('#st-max'),n1(s.max));}
  setT($('#st-freq'),S.freq?n0(S.freq):'—');
  if(S.route==='dashboard')updateNow();
}
function updateConcepts(){
  const db=S.cur,f=S.freq;if(db==null||!E.an||!E.ctx)return;
  const note=f?noteOf(f):null;
  setT($('#k-wave'),f?'T = 1/f = '+n2(1000/f)+' ms\nλ = v/f = '+n2(VSOM/f)+' m (v = 343 m/s)':'Sem tom dominante claro agora.');
  setT($('#k-freq'),f?n0(f)+' Hz · '+bandOf(f)+(note?' · perto de '+note:''):'Sem tom dominante claro agora.');
  setT($('#k-amp'),'p = '+fmtP(pRms(db))+' (eficaz)\n+6 dB = dobro da amplitude');
  setT($('#k-int'),'I = '+sci(inten(db))+' W/m²\n+10 dB = 10× a intensidade');
  setT($('#k-db'),'L = 10·log₁₀(I/I₀) = '+n1(db)+' dB');
  const sr=E.ctx.sampleRate,N=E.an.fftSize;
  setT($('#k-spec'),'FFT de '+N+' amostras, resolução de '+n1(sr/N)+' Hz\n'+(f?'Pico em '+n0(f)+' Hz':'Sem pico claro'));
}
$$('.lv').forEach(e=>{e.style.whiteSpace='pre-line';});