// Jogo do robô: sequência, mudança de direção, repetição com condição e decomposição.
// BNCC: EF03MA12, EF03CO02, EF03CO03, EF15CO02, EF15CO04.
import { NIVEIS, LEGENDA } from './mapas.js';

const NS = 'http://www.w3.org/2000/svg';
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
// Direções relativas ao mapa. Pontos cardeais ficam para o 4º e o 5º ano.
const NOME_DIR = ['para cima', 'para a direita do mapa', 'para baixo', 'para a esquerda do mapa'];
const destinoTexto = () => { const c = celula(nivel, robo.x, robo.y); return ROTULO_CASA[c] ? ` até a ${ROTULO_CASA[c].toLowerCase()}` : ''; };
const BLOCOS = {
  frente: { rotulo: 'Frente 1 casa', curto: '↑ 1 casa' },
  esquerda: { rotulo: 'Virar à esquerda', curto: '↰ esquerda' },
  direita: { rotulo: 'Virar à direita', curto: '↱ direita' },
  ate: { rotulo: 'Frente até a parede', curto: '↑ até a parede' },
};
const CORES = { '.': '#d7dbe3', '#': '#8a6f5a', Q: '#5fae6e', C: '#ffd166', P: '#f4a261', E: '#7fb3ff' };
const ROTULO_CASA = { C: 'Casa', P: 'Padaria', E: 'Escola' };

const $ = (id) => document.getElementById(id);
let nivel = 0, programa = [], robo, visitados, rodando = false;
const feitas = new Set(JSON.parse(sessionStorage.getItem('robo.feitas') || '[]'));

function celula(n, x, y) {
  const m = NIVEIS[n].mapa;
  if (y < 0 || y >= m.length || x < 0 || x >= m[y].length) return null;
  return m[y][x];
}
const livre = (c) => c !== null && c !== '#' && c !== 'Q';

function el(tag, attrs, pai) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (pai) pai.appendChild(e);
  return e;
}

function desenhar() {
  const N = NIVEIS[nivel], svg = $('mapa');
  const w = N.mapa[0].length, h = N.mapa.length;
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `-0.1 -0.1 ${w + 0.2} ${h + 0.2}`);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = N.mapa[y][x];
    el('rect', { x: x + 0.03, y: y + 0.03, width: 0.94, height: 0.94, rx: 0.12, fill: CORES[c] || '#ccc' }, svg);
    if (c === 'Q') el('circle', { cx: x + 0.5, cy: y + 0.5, r: 0.22, fill: '#2f7d3f' }, svg);
    if (ROTULO_CASA[c]) {
      const t = el('text', { x: x + 0.5, y: y + 0.6, 'text-anchor': 'middle', 'font-size': 0.26, 'font-weight': 700, fill: '#1d2433' }, svg);
      t.textContent = ROTULO_CASA[c];
    }
  }
  const g = el('g', { id: 'robo' }, svg);
  el('circle', { cx: 0, cy: 0, r: 0.32, fill: '#21409a', stroke: '#fff', 'stroke-width': 0.06 }, g);
  el('path', { d: 'M0 -0.42 L0.16 -0.18 L-0.16 -0.18 Z', fill: '#ffb703' }, g);
  el('circle', { cx: -0.1, cy: -0.02, r: 0.05, fill: '#fff' }, g);
  el('circle', { cx: 0.1, cy: -0.02, r: 0.05, fill: '#fff' }, g);
  posicionar();
}

function posicionar() {
  const g = $('robo');
  if (g) g.setAttribute('transform', `translate(${robo.x + 0.5} ${robo.y + 0.5}) rotate(${robo.d * 90})`);
}

function reiniciar() {
  const N = NIVEIS[nivel];
  robo = { ...N.inicio };
  visitados = [];
  posicionar();
}

function montarFases() {
  const f = $('fases');
  f.innerHTML = '';
  NIVEIS.forEach((N, i) => {
    const b = document.createElement('button');
    b.textContent = String(i + 1);
    b.setAttribute('aria-label', N.titulo);
    if (i === nivel) b.classList.add('atual');
    else if (feitas.has(N.id)) b.classList.add('feita');
    b.onclick = () => { if (!rodando) carregar(i); };
    f.appendChild(b);
  });
}

function carregar(i) {
  nivel = i;
  programa = [];
  const N = NIVEIS[i];
  $('titulo').textContent = N.titulo;
  $('pedido').textContent = N.pedido;
  const p = $('paleta');
  p.innerHTML = '';
  N.blocos.forEach((k) => {
    const b = document.createElement('button');
    b.textContent = BLOCOS[k].curto;
    b.setAttribute('aria-label', BLOCOS[k].rotulo);
    b.onclick = () => {
      if (rodando) return;
      if (programa.length >= N.maxBlocos) { mensagem(`Limite de ${N.maxBlocos} blocos nesta fase.`, 'errado'); return; }
      programa.push(k);
      mostrarPrograma();
    };
    p.appendChild(b);
  });
  mensagem('');
  montarFases();
  reiniciar();
  desenhar();
  mostrarPrograma();
}

function mostrarPrograma(atual = -1) {
  const N = NIVEIS[nivel], pr = $('programa');
  pr.innerHTML = '';
  programa.forEach((k, i) => {
    const b = document.createElement('button');
    b.textContent = BLOCOS[k].curto;
    b.setAttribute('aria-label', `${i + 1}. ${BLOCOS[k].rotulo}. Toque para tirar.`);
    if (i === atual) b.classList.add('rodando');
    b.onclick = () => { if (!rodando) { programa.splice(i, 1); mostrarPrograma(); } };
    pr.appendChild(b);
  });
  $('executar').textContent = `Executar (${programa.length}/${N.maxBlocos})`;
}

function mensagem(t, tipo = '') { const m = $('msg'); m.textContent = t; m.className = tipo; }
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// Um passo à frente. Devolve false se bateu.
async function passo() {
  const nx = robo.x + DX[robo.d], ny = robo.y + DY[robo.d];
  if (!livre(celula(nivel, nx, ny))) return false;
  robo.x = nx; robo.y = ny;
  posicionar();
  await espera(260);
  return true;
}

function chegou() {
  const N = NIVEIS[nivel], c = celula(nivel, robo.x, robo.y);
  const prox = N.destinos[visitados.length];
  if (c === prox) visitados.push(c);
  return visitados.length === N.destinos.length;
}

async function executar() {
  if (rodando || programa.length === 0) return;
  rodando = true;
  reiniciar();
  mensagem('');
  const descricao = [];
  let fim = false;
  for (let i = 0; i < programa.length && !fim; i++) {
    mostrarPrograma(i);
    const k = programa[i];
    if (k === 'esquerda' || k === 'direita') {
      robo.d = (robo.d + (k === 'direita' ? 1 : 3)) % 4;
      posicionar();
      descricao.push(`virou à ${k} e ficou virado ${NOME_DIR[robo.d]}`);
      await espera(300);
    } else if (k === 'frente') {
      if (!(await passo())) { mensagem('O robô bateu! Ali não tem rua.', 'errado'); fim = true; break; }
      descricao.push(`andou 1 casa ${NOME_DIR[robo.d]}${destinoTexto()}`);
      fim = chegou();
    } else if (k === 'ate') {
      let n = 0;
      while (await passo()) { n++; if (chegou()) { fim = true; break; } }
      if (n === 0) { mensagem('Já tinha um obstáculo na frente. O robô não saiu do lugar.', 'errado'); }
      descricao.push(`andou ${n} ${n === 1 ? 'casa' : 'casas'} ${NOME_DIR[robo.d]}${destinoTexto() || ' até a parede'}`);
    }
  }
  mostrarPrograma();
  const N = NIVEIS[nivel];
  if (visitados.length === N.destinos.length) {
    feitas.add(N.id);
    try { sessionStorage.setItem('robo.feitas', JSON.stringify([...feitas])); } catch { }
    mensagem(`Chegou! O robô ${descricao.join(', ')}.`, 'certo');
    parent.postMessage({ tipo: 'robo:fase', fase: N.id, blocos: programa.length }, '*');
    montarFases();
  } else if (!$('msg').textContent) {
    const falta = N.destinos.slice(visitados.length).map((d) => LEGENDA[d]).join(' e ');
    mensagem(`Quase. Ainda falta chegar: ${falta}.`, 'errado');
  }
  rodando = false;
}

$('executar').onclick = executar;
$('limpar').onclick = () => { if (!rodando) { programa = []; mostrarPrograma(); reiniciar(); mensagem(''); } };
$('voltar').onclick = () => { if (!rodando) { reiniciar(); mensagem(''); } };
carregar(0);
