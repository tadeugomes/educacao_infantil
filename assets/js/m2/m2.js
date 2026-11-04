// Atividades do módulo M2. Mapas, caminhos e formas.
import { questoes, progresso, marcarFeito, botoesOuvir } from '../livro.js';
import { montarVisualizador } from './solidos.js';
import { montarMaquete } from './maquete.js';
import { BAIRRO } from '../../../games/robo/mapas.js';

const MOD = 'm2';
const $ = (s) => document.querySelector(s);

// ---------- Desenhos simples em SVG ----------
const OBJ = {
  dado: `<svg viewBox="0 0 72 56" aria-label="dado"><path d="M24 8l28 0l12 10l-28 0z" fill="#fff" stroke="#1d2433" stroke-width="2"/><path d="M24 8l12 10v30l-12-10z" fill="#eee" stroke="#1d2433" stroke-width="2"/><rect x="36" y="18" width="28" height="30" fill="#fff" stroke="#1d2433" stroke-width="2"/><circle cx="43" cy="25" r="2.5"/><circle cx="50" cy="33" r="2.5"/><circle cx="57" cy="41" r="2.5"/></svg>`,
  caixa: `<svg viewBox="0 0 72 56" aria-label="caixa de sapato"><path d="M8 18l14-10h44l-14 10z" fill="#f4a261" stroke="#1d2433" stroke-width="2"/><rect x="8" y="18" width="44" height="28" fill="#e9c46a" stroke="#1d2433" stroke-width="2"/><path d="M52 18l14-10v28l-14 10z" fill="#d4a24c" stroke="#1d2433" stroke-width="2"/></svg>`,
  lata: `<svg viewBox="0 0 72 56" aria-label="lata"><rect x="22" y="10" width="28" height="38" fill="#9ec5fe" stroke="#1d2433" stroke-width="2"/><ellipse cx="36" cy="10" rx="14" ry="5" fill="#cfe2ff" stroke="#1d2433" stroke-width="2"/><path d="M22 48a14 5 0 0 0 28 0" fill="none" stroke="#1d2433" stroke-width="2"/><rect x="22" y="22" width="28" height="12" fill="#e4572e"/></svg>`,
  casquinha: `<svg viewBox="0 0 72 56" aria-label="casquinha de sorvete"><circle cx="36" cy="16" r="11" fill="#f15bb5" stroke="#1d2433" stroke-width="2"/><path d="M25 20h22l-11 32z" fill="#e9c46a" stroke="#1d2433" stroke-width="2"/></svg>`,
  bola: `<svg viewBox="0 0 72 56" aria-label="bola"><circle cx="36" cy="28" r="22" fill="#fff" stroke="#1d2433" stroke-width="2"/><path d="M14 28h44M36 6c-10 8-10 36 0 44M36 6c10 8 10 36 0 44" fill="none" stroke="#e4572e" stroke-width="2"/></svg>`,
  telhado: `<svg viewBox="0 0 72 56" aria-label="telhado em forma de pirâmide"><path d="M36 6l-26 22l26 8z" fill="#c0392b" stroke="#1d2433" stroke-width="2"/><path d="M36 6l26 22l-26 8z" fill="#e4572e" stroke="#1d2433" stroke-width="2"/><rect x="14" y="30" width="44" height="20" fill="#ffd166" stroke="#1d2433" stroke-width="2"/></svg>`,
};

// Malha quadriculada com polígonos. polys: [{ p: [[x,y],…], cor }]
function malha(polys, w = 8, h = 5, extra = '') {
  const linhas = [];
  for (let x = 0; x <= w; x++) linhas.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}"/>`);
  for (let y = 0; y <= h; y++) linhas.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);
  const ps = polys.map((q) => `<polygon points="${q.p.map((v) => v.join(',')).join(' ')}" fill="${q.cor}" fill-opacity=".8" stroke="#1d2433" stroke-width=".08"/>${q.rotulo ? `<text x="${q.rx}" y="${q.ry}" font-size=".7" font-weight="700" text-anchor="middle">${q.rotulo}</text>` : ''}`).join('');
  return `<svg viewBox="-0.2 -0.2 ${w + 0.4} ${h + 0.4}" style="width:100%;max-width:420px;display:block" role="img"><g stroke="#c9d3ea" stroke-width=".04">${linhas.join('')}</g>${ps}${extra}</svg>`;
}

// ---------- 2. O que eu já sei (diagnóstico) ----------
function diagnostico() {
  const host = $('#diag-m2');
  if (!host) return;
  const robo = `<svg viewBox="0 0 5 2" style="width:100%;max-width:300px;display:block"><g stroke="#c9d3ea" stroke-width=".03" fill="#fff">${[0, 1, 2, 3, 4].map((x) => [0, 1].map((y) => `<rect x="${x}" y="${y}" width="1" height="1"/>`).join('')).join('')}</g><circle cx=".5" cy=".5" r=".3" fill="#21409a"/><path d="M.5 .2l.15 .2h-.3z" fill="#ffb703" transform="rotate(90 .5 .5)"/><rect x="2.1" y=".1" width=".8" height=".8" fill="#8a6f5a"/><rect x="4.08" y=".08" width=".84" height=".84" rx=".1" fill="#7fb3ff"/><text x="4.5" y=".58" font-size=".2" text-anchor="middle" font-weight="700">Escola</text></svg>`;
  questoes(host, [
    { p: 'Esta lata lembra qual sólido?', svg: OBJ.lata, op: ['Cubo', 'Cilindro', 'Cone'], c: 1, porque: 'Olhe as pontas da lata: são dois círculos.' },
    { p: 'Um desenho do bairro visto <em>de cima</em>, como um passarinho vê, se chama:', op: ['Planta ou croqui', 'Fotografia de frente', 'Pintura de paisagem'], c: 0, porque: 'Quando olhamos de cima e desenhamos, fazemos uma planta ou um croqui.' },
    { p: 'O robô está virado para a padaria. Ele vira à direita duas vezes. Para onde ele fica virado?', op: ['Para a padaria', 'De costas para a padaria', 'Para a direita da padaria'], c: 1, porque: 'Duas voltas para o mesmo lado fazem meia-volta.' },
    { p: 'O robô (azul) quer chegar à escola. O quadrado marrom é uma parede. Qual caminho funciona?', svg: robo, op: ['Frente, frente, frente, frente', 'Descer, frente 4 vezes, subir', 'Virar à esquerda e andar'], c: 1, porque: 'Andando sempre em frente ele bate na parede marrom.' },
  ], { modulo: MOD, atividade: 'diagnostico' });
}

// ---------- Pares (tocar um de cada lado) ----------
function pares(host, esquerda, direita, atividade) {
  host.classList.add('livro');
  host.innerHTML = '<div class="grade-pares"><div class="lado e"></div><div class="lado d"></div></div><p class="retorno" aria-live="polite"></p>';
  const E = host.querySelector('.e'), D = host.querySelector('.d'), ret = host.querySelector('.retorno');
  let marcado = null, feitos = 0, erros = 0;
  // Ordem fixa e diferente da coluna da esquerda (invertida e deslocada uma posição).
  const inv = [...direita].reverse();
  const embaralhado = [...inv.slice(1), inv[0]];
  const cartao = (item, lado) => {
    const c = document.createElement('button');
    c.type = 'button';
    c.className = 'cartao';
    c.innerHTML = item.html;
    c.dataset.chave = item.chave;
    c.style.marginBottom = '10px';
    c.style.width = '100%';
    c.addEventListener('click', () => {
      if (c.classList.contains('feito')) return;
      if (lado === 'e') {
        host.querySelectorAll('.e .cartao').forEach((x) => x.classList.remove('marcado'));
        c.classList.add('marcado');
        marcado = c;
        ret.textContent = 'Agora toque no par do outro lado.';
        ret.className = 'retorno';
      } else if (marcado) {
        if (marcado.dataset.chave === c.dataset.chave) {
          marcado.classList.replace('marcado', 'feito');
          c.classList.add('feito');
          feitos++;
          ret.textContent = 'Par certo!';
          ret.className = 'retorno certo';
          marcado = null;
          if (feitos === esquerda.length) {
            ret.textContent = erros === 0 ? 'Todos os pares sem nenhum erro!' : `Pronto! Você errou ${erros} ${erros === 1 ? 'vez' : 'vezes'} no caminho.`;
            progresso.registrar(MOD, atividade, { a: esquerda.length - Math.min(erros, esquerda.length), t: esquerda.length });
          }
        } else {
          erros++;
          ret.textContent = 'Esse não combina. Tente outro.';
          ret.className = 'retorno errado';
        }
      } else {
        ret.textContent = 'Primeiro toque num cartão da esquerda.';
      }
    });
    return c;
  };
  esquerda.forEach((i) => E.appendChild(cartao(i, 'e')));
  embaralhado.forEach((i) => D.appendChild(cartao(i, 'd')));
}

function objetosSolidos() {
  const host = $('#pares-solidos');
  if (!host) return;
  const L = [['dado', 'cubo'], ['caixa', 'bloco'], ['lata', 'cilindro'], ['casquinha', 'cone'], ['bola', 'esfera'], ['telhado', 'piramide']];
  const NOME = { cubo: 'Cubo', bloco: 'Bloco retangular', cilindro: 'Cilindro', cone: 'Cone', esfera: 'Esfera', piramide: 'Pirâmide' };
  pares(host, L.map(([o, s]) => ({ chave: s, html: OBJ[o] + `<span>${o === 'casquinha' ? 'casquinha' : o}</span>` })),
    L.map(([, s]) => ({ chave: s, html: NOME[s] })), 'pares-solidos');
}

// ---------- Figuras planas e áreas ----------
function figurasPlanas() {
  const host = $('#figuras-planas');
  if (!host) return;
  const az = '#4f7cff', am = '#ffb703', vd = '#1f8a70', co = '#e4572e';
  questoes(host, [
    { p: 'Qual é o nome desta figura?', svg: malha([{ p: [[1, 4], [7, 4], [5, 1], [3, 1]], cor: am }]), op: ['Retângulo', 'Trapézio', 'Paralelogramo'], c: 1, porque: 'Conte os pares de lados paralelos: só os lados de cima e de baixo são paralelos.' },
    { p: 'E esta?', svg: malha([{ p: [[1, 4], [5, 4], [7, 1], [3, 1]], cor: az }]), op: ['Paralelogramo', 'Trapézio', 'Quadrado'], c: 0, porque: 'Aqui os lados de cima e de baixo são paralelos, e os lados inclinados também.' },
    { p: 'Quantos vértices tem o triângulo?', svg: malha([{ p: [[1, 4], [6, 4], [3, 1]], cor: vd }]), op: ['2', '3', '4'], c: 1, porque: 'Vértice é o "canto" onde dois lados se encontram. Conte os cantos.' },
    { p: 'O quadrado e o retângulo têm 4 lados. O que só o quadrado tem?', svg: malha([{ p: [[0.5, 1], [3.5, 1], [3.5, 4], [0.5, 4]], cor: co }, { p: [[4.5, 2], [7.5, 2], [7.5, 4], [4.5, 4]], cor: am }]), op: ['Os 4 lados do mesmo tamanho', 'Lados paralelos', '4 vértices'], c: 0, porque: 'Os dois têm lados paralelos e 4 vértices. Meça os lados com os quadradinhos.' },
    { p: 'Qual figura ocupa mais quadradinhos da malha?', svg: malha([{ p: [[0.5, 1], [3.5, 1], [3.5, 3], [0.5, 3]], cor: az, rotulo: 'A', rx: 2, ry: 2.25 }, { p: [[4.5, 0.5], [6.5, 0.5], [6.5, 4.5], [4.5, 4.5]], cor: vd, rotulo: 'B', rx: 5.5, ry: 2.75 }]), op: ['A', 'B', 'As duas ocupam o mesmo'], c: 1, porque: 'Conte: A tem 3 × 2 quadradinhos. B tem 2 × 4.' },
  ], { modulo: MOD, atividade: 'figuras-planas' });
}

// ---------- Congruência por sobreposição ----------
function congruencia() {
  const host = $('#congruencia');
  if (!host) return;
  host.classList.add('livro');
  const ALVO = [[0, 0], [3, 0], [3, 1], [1, 1], [1, 2], [0, 2]];
  const CAND = [
    { id: 'A', p: [[0, 0], [2, 0], [2, 3], [1, 3], [1, 1], [0, 1]], giro: 90, igual: true },
    { id: 'B', p: [[0, 0], [2, 0], [2, 2], [0, 2]], giro: 0, igual: false },
    { id: 'C', p: [[0, 0], [3, 0], [3, 1], [2, 1], [2, 2], [0, 2]], giro: 0, igual: false },
  ];
  const pts = (p) => p.map((v) => v.join(',')).join(' ');
  host.innerHTML = `
    <p>Qual peça cobre <strong>exatamente</strong> a figura amarela, sem sobrar e sem faltar? Toque numa peça para colocá-la por cima.</p>
    <svg viewBox="-0.5 -0.5 15 5" style="width:100%;max-width:560px;display:block" role="img" aria-label="Figura amarela e três peças">
      <g stroke="#c9d3ea" stroke-width=".04">${Array.from({ length: 15 }, (_, x) => `<line x1="${x}" y1="0" x2="${x}" y2="4"/>`).join('')}${Array.from({ length: 5 }, (_, y) => `<line x1="0" y1="${y}" x2="14" y2="${y}"/>`).join('')}</g>
      <polygon points="${pts(ALVO.map(([x, y]) => [x + 0.5, y + 1]))}" fill="#ffb703" stroke="#1d2433" stroke-width=".08"/>
      ${CAND.map((c, i) => `<g class="peca" data-id="${c.id}" style="cursor:pointer" transform="translate(${5 + i * 3.2} 0.5)"><polygon points="${pts(c.p)}" fill="#4f7cff" fill-opacity=".75" stroke="#1d2433" stroke-width=".08"/><text x="1" y="3.8" font-size=".6" font-weight="700" text-anchor="middle">${c.id}</text></g>`).join('')}
    </svg>
    <div class="opcoes">${CAND.map((c) => `<button type="button" class="opcao" data-id="${c.id}">Peça ${c.id}</button>`).join('')}<button type="button" class="opcao" data-id="reset">Devolver as peças</button></div>
    <p class="retorno" aria-live="polite"></p>`;
  const ret = host.querySelector('.retorno');
  const origem = Object.fromEntries(CAND.map((c, i) => [c.id, [5 + i * 3.2, 0.5, 0]]));
  let anim = null, acertou = false, tentativas = 0;
  function mover(id, destino) {
    const g = host.querySelector(`g.peca[data-id="${id}"]`);
    const de = (g.dataset.estado || origem[id].join(',')).split(',').map(Number);
    const t0 = performance.now();
    cancelAnimationFrame(anim);
    const passo = (agora) => {
      const t = Math.min(1, (agora - t0) / 600), e = t * t * (3 - 2 * t);
      const [x, y, r] = de.map((v, k) => v + (destino[k] - v) * e);
      // Gira em torno do canto (0,0) da peça e depois encaixa no lugar.
      g.setAttribute('transform', `translate(${x} ${y}) rotate(${r})`);
      if (t < 1) anim = requestAnimationFrame(passo); else g.dataset.estado = destino.join(',');
    };
    anim = requestAnimationFrame(passo);
  }
  host.querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.id;
    CAND.forEach((c) => mover(c.id, origem[c.id]));
    if (id === 'reset') { ret.textContent = ''; return; }
    const c = CAND.find((k) => k.id === id);
    tentativas++;
    // A peça A, girada 90° no sentido anti-horário em torno de (0,0) e deslocada, cai sobre o alvo.
    setTimeout(() => mover(id, c.igual ? [0.5, 3, -90] : [0.5, 1, 0]), 50);
    setTimeout(() => {
      if (c.igual) {
        ret.className = 'retorno certo';
        ret.textContent = 'Cobriu certinho! A peça A estava só girada. Figuras assim são congruentes: mesma forma e mesmo tamanho.';
        if (!acertou) { acertou = true; progresso.registrar(MOD, 'congruencia', { a: tentativas === 1 ? 1 : 0, t: 1 }); }
      } else if (c.id === 'B') {
        ret.className = 'retorno errado';
        ret.textContent = 'A peça B tem 4 quadradinhos, igual à amarela, mas a forma é outra. Mesma área não quer dizer mesma figura.';
      } else {
        ret.className = 'retorno errado';
        ret.textContent = 'A peça C sobra um quadradinho. Ela é maior que a amarela.';
      }
    }, 700);
  }));
}

// ---------- Croqui com legenda ----------
const SIMBOLO = {
  C: '<path d="M.2 .55L.5 .25L.8 .55V.8H.2Z" fill="#ffd166" stroke="#1d2433" stroke-width=".04"/>',
  P: '<circle cx=".5" cy=".55" r=".25" fill="#f4a261" stroke="#1d2433" stroke-width=".04"/><path d="M.32 .55h.36" stroke="#1d2433" stroke-width=".05"/>',
  E: '<path d="M.3 .85V.2" stroke="#1d2433" stroke-width=".05"/><path d="M.3 .2H.75L.65 .35L.75 .5H.3" fill="#1f8a70"/>',
  Q: '<circle cx=".5" cy=".45" r=".22" fill="#2f7d3f"/><path d="M.5 .65V.85" stroke="#7a4e2d" stroke-width=".07"/>',
  '#': '<rect x=".12" y=".12" width=".76" height=".76" fill="#b08968" stroke="#5a4636" stroke-width=".04"/>',
};
function simboloSvg(k, tam = 44) {
  return `<svg viewBox="0 0 1 1" width="${tam}" height="${tam}" aria-hidden="true">${SIMBOLO[k]}</svg>`;
}
function croqui() {
  const host = $('#croqui');
  if (!host) return;
  const m = BAIRRO.mapa, w = m[0].length, h = m.length;
  let s = '';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = m[y][x];
    s += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c === '.' ? '#e6e9ef' : '#fff'}" stroke="#c9d3ea" stroke-width=".03"/>`;
    if (SIMBOLO[c]) s += `<g transform="translate(${x} ${y})">${SIMBOLO[c]}</g>`;
  }
  host.innerHTML = `<svg viewBox="-0.1 -0.1 ${w + 0.2} ${h + 0.2}" style="width:100%;max-width:520px;display:block" role="img" aria-label="Croqui do bairro com símbolos">${s}</svg>`;
  const L = [['C', 'casa'], ['P', 'padaria'], ['E', 'escola'], ['Q', 'praça'], ['#', 'quadra com prédios']];
  pares($('#legenda'), L.map(([k]) => ({ chave: k, html: simboloSvg(k) })), L.map(([k, t]) => ({ chave: k, html: t })), 'legenda');
}

// ---------- Jogo do robô (iframe) ----------
function robo() {
  const st = $('#robo-status');
  const mostrar = () => {
    const p = progresso.ler(MOD);
    const n = ['n1', 'n2', 'n3', 'n4'].filter((f) => p['robo-' + f]).length;
    if (st) st.textContent = n ? `Fases concluídas: ${n} de 4.` : '';
  };
  window.addEventListener('message', (e) => {
    if (e.data && e.data.tipo === 'robo:fase') {
      progresso.registrar(MOD, 'robo-' + e.data.fase, { ok: 1, b: e.data.blocos });
      mostrar();
    }
  });
  mostrar();
}

// ---------- Missão fora da tela e produção final (listas de conferência) ----------
function listas() {
  document.querySelectorAll('.conferir').forEach((ul) => {
    const id = ul.dataset.atividade;
    const salvo = progresso.ler(MOD)[id] || {};
    ul.querySelectorAll('input[type=checkbox]').forEach((cb, i) => {
      cb.checked = !!(salvo.m && salvo.m.includes(i));
      cb.style.width = '28px';
      cb.style.height = '28px';
      cb.addEventListener('change', () => {
        const m = [...ul.querySelectorAll('input[type=checkbox]')].map((x, k) => (x.checked ? k : -1)).filter((k) => k >= 0);
        progresso.registrar(MOD, id, { m, t: ul.querySelectorAll('input').length });
      });
    });
  });
}

// ---------- 7. Mostrar o que aprendi (avaliação) ----------
function avaliacao() {
  const host = $('#aval-m2');
  if (!host) return;
  const q = (x, y) => [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
  const cruz = [q(1, 0), q(0, 1), q(1, 1), q(2, 1), q(3, 1), q(1, 2)].map((p) => ({ p, cor: '#ffb703' }));
  const fila = [0, 1, 2, 3, 4, 5].map((i) => ({ p: q(i, 1), cor: '#4f7cff' }));
  const pir = [{ p: q(2, 1), cor: '#1f8a70' }, { p: [[2, 1], [3, 1], [2.5, 0]], cor: '#9b5de5' }, { p: [[2, 2], [3, 2], [2.5, 3]], cor: '#9b5de5' }, { p: [[2, 1], [2, 2], [1, 1.5]], cor: '#9b5de5' }, { p: [[3, 1], [3, 2], [4, 1.5]], cor: '#9b5de5' }];
  questoes(host, [
    { p: 'Qual destas planificações monta um <strong>cubo</strong>?', op: [malha(cruz, 4, 3).replace('max-width:420px', 'max-width:150px'), malha(fila, 6, 3).replace('max-width:420px', 'max-width:180px'), malha(pir, 5, 3).replace('max-width:420px', 'max-width:150px')], c: 0, porque: 'Imagine dobrar. Seis quadrados em fila dão a volta, mas ninguém fecha em cima e embaixo.' },
    { p: 'Quantos vértices tem uma pirâmide de base quadrada?', op: ['4', '5', '8'], c: 1, porque: 'São 4 cantos na base e mais 1 na ponta.' },
    { p: 'Qual sólido <strong>não</strong> tem planificação?', op: ['Cilindro', 'Cone', 'Esfera'], c: 2, porque: 'Cilindro e cone abrem e ficam lisos. A esfera não.' },
    { p: 'Por que o globo mostra o formato da Terra melhor do que o mapa-múndi de papel?', op: ['Porque a Terra tem formato parecido com uma esfera, e a esfera não fica lisa no papel sem deformar', 'Porque o globo é mais colorido', 'Porque o mapa é menor'], c: 0, porque: 'Pense no que você descobriu sobre a esfera e a planificação.' },
    { p: `Na legenda do croqui, este símbolo ${simboloSvg('E', 32)} quer dizer:`, op: ['Praça', 'Escola', 'Padaria'], c: 1, porque: 'Volte à legenda: a bandeira marca a escola.' },
    { p: 'Para ir da casa até a escola passando pela padaria, o melhor plano é:', op: ['Montar tudo de uma vez sem pensar', 'Dividir em duas partes: casa até padaria, depois padaria até escola', 'Andar até a parede e torcer para chegar'], c: 1, porque: 'Dividir um problema grande em partes menores ajuda a resolver cada uma.' },
    { p: 'Lia sai da escola, anda 2 quarteirões em frente, vira à direita e anda mais 1. Quantas vezes ela mudou de direção?', op: ['Nenhuma', '1 vez', '3 vezes'], c: 1, porque: 'Andar em frente não muda a direção. Só a virada muda.' },
    { p: 'Qual figura tem só <strong>um</strong> par de lados paralelos?', op: ['Retângulo', 'Trapézio', 'Paralelogramo'], c: 1, porque: 'Retângulo e paralelogramo têm dois pares de lados paralelos.' },
    { p: 'Uma figura tem 6 quadradinhos e outra tem 4. Qual ocupa mais espaço na malha?', op: ['A de 6 quadradinhos', 'A de 4 quadradinhos', 'Não dá para saber'], c: 0, porque: 'Quem cobre mais quadradinhos ocupa mais espaço.' },
    { p: 'A maquete mostra o bairro em 3 dimensões. E a planta (vista de cima)?', op: ['Também em 3 dimensões', 'Em 2 dimensões, como um desenho no papel', 'Não mostra o bairro'], c: 1, porque: 'Na planta não vemos a altura dos prédios, só o comprimento e a largura.' },
    { p: 'Duas figuras são congruentes quando:', op: ['Têm a mesma cor', 'Uma cobre a outra exatamente, mesmo se for preciso girar', 'Têm o mesmo número de quadradinhos'], c: 1, porque: 'Lembre da peça B: mesma quantidade de quadradinhos, forma diferente.' },
  ], { modulo: MOD, atividade: 'avaliacao' });
}

// ---------- Início ----------
function iniciar() {
  botoesOuvir();
  diagnostico();
  const vis = $('#visualizador');
  if (vis) {
    const vistos = new Set();
    montarVisualizador(vis, { aoTrocar: (t) => { vistos.add(t); if (vistos.size === 6) marcarFeito(MOD, 'solidos-3d'); } });
  }
  objetosSolidos();
  figurasPlanas();
  congruencia();
  croqui();
  const maq = $('#maquete');
  if (maq) montarMaquete(maq, BAIRRO.mapa);
  robo();
  listas();
  avaliacao();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
