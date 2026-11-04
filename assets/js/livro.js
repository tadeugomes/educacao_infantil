// Biblioteca comum do livro: progresso local, leitura em voz alta, questões com retorno.
// Nada sai do aparelho. O progresso fica no localStorage e só é compartilhado
// quando a família ou o professor geram o código de progresso.

const CHAVE = 'livro3ano.progresso.v1';

function lerTudo() {
  try { return JSON.parse(localStorage.getItem(CHAVE) || '{}'); } catch { return {}; }
}
function gravarTudo(obj) {
  try { localStorage.setItem(CHAVE, JSON.stringify(obj)); } catch { /* modo privado ou cota cheia */ }
}

export const progresso = {
  ler(modulo) { return lerTudo()[modulo] || {}; },
  registrar(modulo, atividade, dados) {
    const tudo = lerTudo();
    tudo[modulo] = tudo[modulo] || {};
    tudo[modulo][atividade] = { ...dados, d: new Date().toISOString().slice(0, 10) };
    gravarTudo(tudo);
    document.dispatchEvent(new CustomEvent('livro:progresso', { detail: { modulo, atividade } }));
  },
  tudo: lerTudo,
  apagar() { try { localStorage.removeItem(CHAVE); } catch { } },
  // Código curto para o professor: JSON compactado em base64 de URL.
  codigo(nome = '') {
    const json = JSON.stringify({ v: 1, n: nome.slice(0, 40), p: lerTudo() });
    const b = btoa(unescape(encodeURIComponent(json)));
    return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  decodificar(cod) {
    const b = cod.trim().replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(b))));
  },
};

// Leitura em voz alta com a voz do próprio aparelho (funciona sem internet na maioria
// dos Android e iPad). Pode ser trocada depois por áudios gravados.
let vozPt = null;
function escolherVoz() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices();
  vozPt = vs.find((v) => v.lang === 'pt-BR') || vs.find((v) => v.lang && v.lang.startsWith('pt')) || null;
}
if ('speechSynthesis' in window) {
  escolherVoz();
  speechSynthesis.onvoiceschanged = escolherVoz;
}

export function falar(texto) {
  if (!('speechSynthesis' in window)) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = 'pt-BR';
  u.rate = 0.92;
  if (vozPt) u.voice = vozPt;
  speechSynthesis.speak(u);
  return true;
}

function textoLegivel(el) {
  const c = el.cloneNode(true);
  c.querySelectorAll('button, .ouvir, script, style, svg, canvas, iframe, .so-professor').forEach((x) => x.remove());
  return c.textContent.replace(/\s+/g, ' ').trim();
}

// Narração gravada (assets/audio/<id>.mp3, gerada por scripts/narrar.py).
// Só um áudio toca por vez. Se o arquivo não existir, usa a voz do aparelho.
let tocando = null;
function pararTudo() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  if (tocando) {
    tocando.audio.pause();
    tocando.audio.currentTime = 0;
    tocando.botao.textContent = 'Ouvir';
    tocando.botao.setAttribute('aria-pressed', 'false');
    tocando = null;
  }
}

// Coloca um botão "Ouvir" em cada etapa, exceto onde data-ouvir="nao"
// (atividades de leitura autônoma, EF35LP01).
export function botoesOuvir(raiz = document) {
  const base = window.LIVRO_BASE || './';
  raiz.querySelectorAll('.etapa').forEach((et) => {
    if (et.dataset.ouvir === 'nao' || et.querySelector(':scope > .ouvir')) return;
    const id = et.dataset.audio;
    if (!id && !('speechSynthesis' in window)) return;
    const b = document.createElement('button');
    b.className = 'btn-livro ouvir';
    b.type = 'button';
    b.textContent = 'Ouvir';
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', 'Ouvir o texto desta parte');
    let audio = null, semArquivo = !id;
    b.addEventListener('click', () => {
      if (tocando && tocando.botao === b) { pararTudo(); return; }
      pararTudo();
      if (!semArquivo) {
        audio = audio || new Audio(`${base}assets/audio/${id}.mp3`);
        audio.onended = () => { if (tocando && tocando.botao === b) pararTudo(); };
        tocando = { audio, botao: b };
        b.textContent = 'Parar';
        b.setAttribute('aria-pressed', 'true');
        audio.play().catch(() => {
          // Arquivo ausente ou bloqueado: cai para a voz do aparelho.
          semArquivo = true;
          pararTudo();
          falar(textoLegivel(et));
        });
      } else {
        falar(textoLegivel(et));
      }
    });
    et.prepend(b);
  });
}

// Questões de múltipla escolha com retorno que explica o erro.
// itens: [{ p: 'pergunta', svg?: '<svg…>', op: ['a','b'], c: 0, porque: 'explicação' }]
export function questoes(host, itens, { modulo, atividade, aoTerminar } = {}) {
  host.classList.add('livro');
  let respondidas = 0, acertosDePrimeira = 0;
  itens.forEach((it, i) => {
    const bloco = document.createElement('div');
    bloco.className = 'questao';
    bloco.innerHTML = `<p><strong>${i + 1}.</strong> ${it.p}</p>${it.svg || ''}<div class="opcoes" role="group"></div><div class="retorno" aria-live="polite"></div>`;
    const opc = bloco.querySelector('.opcoes');
    const ret = bloco.querySelector('.retorno');
    let tentativas = 0, feito = false;
    it.op.forEach((txt, k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'opcao';
      b.innerHTML = txt;
      b.addEventListener('click', () => {
        if (feito) return;
        tentativas++;
        if (k === it.c) {
          feito = true;
          b.classList.add('certo');
          ret.className = 'retorno certo';
          ret.textContent = tentativas === 1 ? 'Isso mesmo!' : 'Agora sim!';
          if (tentativas === 1) acertosDePrimeira++;
          respondidas++;
          if (respondidas === itens.length) fim();
        } else {
          b.classList.add('errado');
          b.disabled = true;
          ret.className = 'retorno errado';
          ret.textContent = it.porque || 'Ainda não. Olhe de novo e tente outra.';
        }
      });
      opc.appendChild(b);
    });
    host.appendChild(bloco);
  });
  const placar = document.createElement('p');
  placar.className = 'retorno';
  host.appendChild(placar);
  function fim() {
    placar.className = 'retorno certo';
    placar.textContent = `Você acertou ${acertosDePrimeira} de ${itens.length} na primeira tentativa.`;
    if (modulo) progresso.registrar(modulo, atividade, { a: acertosDePrimeira, t: itens.length });
    if (aoTerminar) aoTerminar(acertosDePrimeira, itens.length);
  }
}

export function marcarFeito(modulo, atividade, extra = {}) {
  progresso.registrar(modulo, atividade, { ok: 1, ...extra });
}
