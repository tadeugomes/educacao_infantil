// Sólidos geométricos em 3D que abrem e fecham (planificação).
// BNCC: EF03MA13 (associar e nomear), EF03MA14 (características e planificações).
import * as THREE from '../../vendor/three/three.module.min.js';
import { OrbitControls } from '../../vendor/three/OrbitControls.js';

const CORES = [0xffb703, 0x4f7cff, 0xe4572e, 0x1f8a70, 0x9b5de5, 0xf15bb5];

export const SOLIDOS = {
  cubo: { nome: 'Cubo', objeto: 'um dado', faces: '6 faces planas', vertices: '8 vértices', arestas: '12 arestas' },
  bloco: { nome: 'Bloco retangular', objeto: 'uma caixa de sapato', faces: '6 faces planas', vertices: '8 vértices', arestas: '12 arestas' },
  piramide: { nome: 'Pirâmide de base quadrada', objeto: 'o telhado de uma casa', faces: '5 faces planas', vertices: '5 vértices', arestas: '8 arestas' },
  cilindro: { nome: 'Cilindro', objeto: 'uma lata', faces: '2 faces planas e 1 superfície arredondada', vertices: '0 vértices', arestas: '2 bordas curvas' },
  cone: { nome: 'Cone', objeto: 'uma casquinha de sorvete', faces: '1 face plana e 1 superfície arredondada', vertices: '1 vértice (a ponta)', arestas: '1 borda curva' },
  esfera: { nome: 'Esfera', objeto: 'uma bola', faces: 'só superfície arredondada', vertices: '0 vértices', arestas: '0 arestas' },
};

function material(i) {
  return new THREE.MeshLambertMaterial({ color: CORES[i % CORES.length], side: THREE.DoubleSide });
}

// Face plana deitada no plano XZ, com contorno.
function face(geo, i) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, material(i)));
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x1d2433 })));
  return g;
}
function retangulo(w, d, i) {
  const geo = new THREE.PlaneGeometry(w, d);
  geo.rotateX(-Math.PI / 2);
  return face(geo, i);
}
function triangulo(base, alt, i) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-base / 2, 0, 0, base / 2, 0, 0, 0, 0, alt], 3));
  geo.computeVertexNormals();
  return face(geo, i);
}

// Dobradiça: grupo posicionado na aresta, gira em torno de um eixo local.
function dobradica(pos, eixo, filho, deslocamento) {
  const h = new THREE.Group();
  h.position.copy(pos);
  filho.position.copy(deslocamento);
  h.add(filho);
  h.userData.eixo = eixo;
  return h;
}

// Prisma (cubo ou bloco): base a × b, altura c. Planificação em cruz.
function prisma(a, b, c) {
  const raiz = new THREE.Group();
  raiz.add(retangulo(a, b, 0));
  const juntas = [];
  const add = (h, ang) => { h.userData.ang = ang; raiz.add(h); juntas.push(h); return h; };
  add(dobradica(new THREE.Vector3(0, 0, b / 2), 'x', retangulo(a, c, 1), new THREE.Vector3(0, 0, c / 2)), -Math.PI / 2);
  const tras = add(dobradica(new THREE.Vector3(0, 0, -b / 2), 'x', retangulo(a, c, 2), new THREE.Vector3(0, 0, -c / 2)), Math.PI / 2);
  add(dobradica(new THREE.Vector3(a / 2, 0, 0), 'z', retangulo(c, b, 3), new THREE.Vector3(c / 2, 0, 0)), Math.PI / 2);
  add(dobradica(new THREE.Vector3(-a / 2, 0, 0), 'z', retangulo(c, b, 4), new THREE.Vector3(-c / 2, 0, 0)), -Math.PI / 2);
  // Tampa presa na aresta de cima da face de trás.
  const tampa = dobradica(new THREE.Vector3(0, 0, -c / 2), 'x', retangulo(a, b, 5), new THREE.Vector3(0, 0, -b / 2));
  tampa.userData.ang = Math.PI / 2;
  tras.children[0].add(tampa);
  juntas.push(tampa);
  return { raiz, aplicar: (t) => juntas.forEach((j) => { j.rotation[j.userData.eixo] = j.userData.ang * t; }) };
}

function piramide(a, h) {
  const raiz = new THREE.Group();
  raiz.add(retangulo(a, a, 0));
  const s = Math.hypot(h, a / 2);
  const dobra = Math.PI - Math.atan2(h, a / 2);
  const juntas = [];
  const lados = [
    { p: [0, 0, a / 2], rotY: 0, eixo: 'x', sinal: -1 },
    { p: [0, 0, -a / 2], rotY: Math.PI, eixo: 'x', sinal: 1 },
    { p: [a / 2, 0, 0], rotY: Math.PI / 2, eixo: 'z', sinal: 1 },
    { p: [-a / 2, 0, 0], rotY: -Math.PI / 2, eixo: 'z', sinal: -1 },
  ];
  lados.forEach((l, i) => {
    const tri = triangulo(a, s, i + 1);
    const giro = new THREE.Group();
    giro.rotation.order = 'YXZ'; // primeiro dobra (X), depois posiciona (Y)
    giro.rotation.y = l.rotY;
    giro.add(tri);
    const h1 = new THREE.Group();
    h1.position.set(...l.p);
    h1.add(giro);
    // Gira em torno da aresta da base: eixo local X do grupo girado.
    h1.userData.giro = giro;
    raiz.add(h1);
    juntas.push({ g: giro, ang: -dobra });
  });
  return { raiz, aplicar: (t) => juntas.forEach((j) => { j.g.rotation.x = j.ang * t; }) };
}

// Cilindro: superfície lateral que enrola, tampas presas por dobradiça.
function cilindro(r, h) {
  const raiz = new THREE.Group();
  const W = 2 * Math.PI * r, segs = 48;
  const geo = new THREE.PlaneGeometry(W, h, segs, 1);
  const base = geo.attributes.position.array.slice();
  const lateral = face(geo, 1);
  raiz.add(lateral);
  const tampa = (sinal, i) => {
    const cg = new THREE.CircleGeometry(r, 40);
    const disco = face(cg, i);
    disco.position.set(0, sinal * r, 0);
    const hj = new THREE.Group();
    hj.position.set(0, sinal * h / 2, 0);
    hj.add(disco);
    raiz.add(hj);
    return { hj, sinal };
  };
  const tampas = [tampa(1, 0), tampa(-1, 2)];
  const aplicar = (t) => {
    const pos = geo.attributes.position;
    const R = t > 0.001 ? r / t : Infinity;
    for (let k = 0; k < pos.count; k++) {
      const s = base[3 * k], y = base[3 * k + 1];
      if (R === Infinity) pos.setXYZ(k, s, y, 0);
      else { const f = s / R; pos.setXYZ(k, R * Math.sin(f), y, R * (1 - Math.cos(f))); }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    lateral.children[1].geometry.dispose();
    lateral.children[1].geometry = new THREE.EdgesGeometry(geo, 30);
    tampas.forEach(({ hj, sinal }) => { hj.rotation.x = sinal * (Math.PI / 2) * t; });
    raiz.position.y = h / 2 + 2 * r * (1 - t); // aberto, fica em pé como um cartaz
  };
  return { raiz, aplicar };
}

// Cone: setor circular que fecha em cone, base presa por dobradiça.
function cone(r, h) {
  const raiz = new THREE.Group();
  const L = Math.hypot(r, h), Th = (2 * Math.PI * r) / L;
  const nr = 10, na = 40, plano = [], dobrado = [], idx = [];
  for (let i = 0; i <= nr; i++) for (let j = 0; j <= na; j++) {
    const rho = (L * i) / nr, psi = -Th / 2 + (Th * j) / na;
    plano.push(rho * Math.sin(psi), L - rho * Math.cos(psi), r);
    const beta = (psi * L) / r, k = rho / L;
    dobrado.push(k * r * Math.sin(beta), h - k * h, k * r * Math.cos(beta));
  }
  for (let i = 0; i < nr; i++) for (let j = 0; j < na; j++) {
    const a = i * (na + 1) + j, b = a + na + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(plano.slice(), 3));
  geo.setIndex(idx);
  const lateral = face(geo, 4);
  raiz.add(lateral);
  const disco = face(new THREE.CircleGeometry(r, 40), 1);
  disco.position.set(0, -r, 0);
  const hj = new THREE.Group();
  hj.position.set(0, 0, r);
  // O disco do CircleGeometry fica no plano XY: já está na vertical, como a planificação.
  hj.add(disco);
  raiz.add(hj);
  const aplicar = (t) => {
    const pos = geo.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      pos.setXYZ(k,
        plano[3 * k] + (dobrado[3 * k] - plano[3 * k]) * t,
        plano[3 * k + 1] + (dobrado[3 * k + 1] - plano[3 * k + 1]) * t,
        plano[3 * k + 2] + (dobrado[3 * k + 2] - plano[3 * k + 2]) * t);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    lateral.children[1].geometry.dispose();
    lateral.children[1].geometry = new THREE.EdgesGeometry(geo, 30);
    hj.rotation.x = (Math.PI / 2) * t;
    raiz.position.y = 2 * r * (1 - t);
  };
  raiz.position.z = -r;
  return { raiz, aplicar };
}

function esfera(r) {
  const raiz = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), material(1));
  m.position.y = r;
  raiz.add(m);
  return { raiz, aplicar: () => {}, semPlanificacao: true };
}

// Os sólidos de faces planas são montados deitados na mesa (plano XZ).
// Cilindro e cone são montados em pé (plano XY) e giram para a mesa.
function criar(tipo) {
  switch (tipo) {
    case 'cubo': return prisma(1.6, 1.6, 1.6);
    case 'bloco': return prisma(2.2, 1.2, 0.9);
    case 'piramide': return piramide(1.8, 1.6);
    case 'cilindro': { const o = cilindro(0.7, 1.8); o.raiz.position.z = -0.7; return o; }
    case 'cone': return cone(0.8, 1.8);
    default: return esfera(1.1);
  }
}

export function montarVisualizador(host, { aoTrocar } = {}) {
  const canvas = host.querySelector('canvas');
  const faixa = host.querySelector('input[type=range]');
  const info = host.querySelector('.contagem');
  const aviso = host.querySelector('.aviso-planificacao');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const cena = new THREE.Scene();
  cena.add(new THREE.HemisphereLight(0xffffff, 0xb0b8c8, 1.6));
  const sol = new THREE.DirectionalLight(0xffffff, 1.4);
  sol.position.set(3, 6, 4);
  cena.add(sol);
  const mesa = new THREE.Mesh(new THREE.CircleGeometry(5, 48), new THREE.MeshLambertMaterial({ color: 0xf3ead8 }));
  mesa.rotation.x = -Math.PI / 2;
  mesa.position.y = -0.01;
  cena.add(mesa);
  const camera = new THREE.PerspectiveCamera(40, 4 / 3, 0.1, 100);
  camera.position.set(4.2, 4.6, 5.4);
  const ctrl = new OrbitControls(camera, canvas);
  ctrl.target.set(0, 0.6, 0);
  ctrl.enablePan = false;
  ctrl.minDistance = 3;
  ctrl.maxDistance = 14;
  ctrl.update();

  let atual = null;
  const desenhar = () => renderer.render(cena, camera);
  ctrl.addEventListener('change', desenhar);

  function ajustar() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    desenhar();
  }
  new ResizeObserver(ajustar).observe(canvas);

  // Cilindro e cone abertos ficam em pé e mais altos: a câmera se afasta um pouco.
  const ENQUADRE = { cilindro: [1.5, 1.4], cone: [1.5, 1.5] };
  const camBase = camera.position.clone();
  function trocar(tipo) {
    const [k, alvoY] = ENQUADRE[tipo] || [1, 0.6];
    camera.position.copy(camBase).multiplyScalar(k);
    ctrl.target.set(0, alvoY, 0);
    ctrl.update();
    if (atual) cena.remove(atual.raiz);
    atual = criar(tipo);
    cena.add(atual.raiz);
    const d = SOLIDOS[tipo];
    info.innerHTML = `<span>${d.nome}</span><span>${d.faces}</span><span>${d.vertices}</span><span>${d.arestas}</span><span>Parece ${d.objeto}</span>`;
    faixa.disabled = !!atual.semPlanificacao;
    aviso.textContent = atual.semPlanificacao
      ? 'A esfera não tem planificação: não dá para abrir uma bola e deixá-la lisa sem rasgar ou amassar.'
      : 'Arraste a barra para abrir e fechar o sólido.';
    atual.aplicar(Number(faixa.value) / 100);
    host.querySelectorAll('[data-solido]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.solido === tipo)));
    desenhar();
    if (aoTrocar) aoTrocar(tipo);
  }

  faixa.addEventListener('input', () => { if (atual) { atual.aplicar(Number(faixa.value) / 100); desenhar(); } });
  host.querySelectorAll('[data-solido]').forEach((b) => b.addEventListener('click', () => trocar(b.dataset.solido)));
  ajustar();
  trocar('cubo');
}
