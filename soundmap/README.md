# SoundMap — Mapa Inteligente de Poluição Sonora

Plataforma web que usa o microfone para estimar o nível de ruído (dB), mostra onda e espectro (FFT),
classifica o ambiente e registra as medições em um mapa e em um dashboard.

## Como usar

Abra `index.html` no Chrome, Edge ou Firefox. Para o microfone e a localização funcionarem em todos os
navegadores, sirva a pasta por HTTP local:

    python3 -m http.server 8000     # depois abra http://localhost:8000

Também existe uma versão de arquivo único: `dist/soundmap.html`.

## Estrutura

    index.html            Páginas (Início, Monitoramento, Mapa, Dashboard) e carga dos arquivos
    css/
      leaflet.css         Estilos do Leaflet (mapa)
      base.css            Tokens de cor e tipografia, cabeçalho, botões, navegação
      home.css            Página inicial
      components.css      Cartões, selos, alertas
      monitor.css         Página de monitoramento
      map.css             Página do mapa e filtros
      dashboard.css       Página do dashboard
      state.css           Cores por classe (tranquilo, moderado, crítico)
    js/                   Scripts clássicos, carregados nesta ordem
      utils.js            Atalhos de DOM, formatação, canvas
      physics.js          Conversões de pressão, intensidade e dB; classificação
      state.js            Estado da aplicação e opções salvas
      store.js            Banco de dados (IndexedDB, com reserva em memória)
      demo-data.js        Gerador de dados de demonstração
      filters.js          Filtros por período, horário, classe e origem
      router.js           Navegação por hash (#inicio, #monitor, #mapa, #dashboard)
      home.js             Animação e resumo da página inicial
      monitor-ui.js       Consentimento, estados da interface, geolocalização
      audio-engine.js     Web Audio API: captura, RMS, dB, FFT, salvamento (Leq)
      monitor-draw.js     Gráficos de onda, espectro e histórico de 60 s
      map.js              Mapa Leaflet, marcadores, mapa de calor (interpolação), rankings
      dashboard.js        Estatísticas, gráficos Chart.js, tabela de histórico
      main.js             Eventos gerais e início do app
    tools/build.py        Gera dist/ a partir de index.html, css/ e js/
    tests/smoke.test.js   Teste de fumaça em jsdom (npm i jsdom)
    dist/                 Saídas geradas (arquivo único)

## Física aplicada

- Nível: L = dBFS + 100 (estimativa)
- Pressão eficaz: p = p₀·10^(L/20), p₀ = 20 µPa
- Intensidade: I = I₀·10^(L/10), I₀ = 10⁻¹² W/m²
- Medição salva: nível equivalente Leq = 10·log₁₀(média de 10^(L/10)) em janelas de 10 s
- Classes: tranquilo < 55 dB, moderado 55–70 dB, crítico > 70 dB

## Privacidade

Nenhum áudio é gravado ou enviado. Só ficam salvos data, horário, dB, frequência dominante e,
se autorizado, a posição, no IndexedDB do navegador.

## Próximos passos (IA)

Os registros (`ts`, `db`, `freq`, `lat`, `lng`, `region`) formam séries temporais por região, prontas para
treinar um modelo de previsão. A previsão atual é a média por hora, em `dashboard.js`.
