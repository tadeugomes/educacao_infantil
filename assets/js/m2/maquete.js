// Maquete 3D do bairro do jogo do robô, com troca entre vista de cima (planta) e maquete.
// BNCC: EF03GE06 (imagens bidimensionais e tridimensionais), EF03MA12 (croquis e maquetes),
// EF03MA13 (sólidos nos objetos do mundo: casas, árvores, postes).
import * as THREE from '../../vendor/three/three.module.min.js';
import { OrbitControls } from '../../vendor/three/OrbitControls.js';

const COR = { rua: 0xc9ced8, quadra: 0xb08968, praca: 0x6dbb7a, casa: 0xffd166, padaria: 0xf4a261, escola: 0x7fb3ff, telhado: 0xc0392b };

function caixa(w, h, d, cor) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: cor }));
  m.position.y = h / 2;
  const contorno = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x5a4636 }));
  m.add(contorno);
  return m;
}

export function montarMaquete(host, mapa) {
  const canvas = host.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const cena = new THREE.Scene();
  cena.add(new THREE.HemisphereLight(0xffffff, 0xa0a8b8, 1.5));
  const sol = new THREE.DirectionalLight(0xffffff, 1.5);
  sol.position.set(-4, 10, 6);
  cena.add(sol);

  const h = mapa.length, w = mapa[0].length;
  const g = new THREE.Group();
  g.position.set(-w / 2 + 0.5, 0, -h / 2 + 0.5);
  cena.add(g);
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ color: COR.rua }));
  chao.rotation.x = -Math.PI / 2;
  chao.position.set(w / 2 - 0.5, 0, h / 2 - 0.5);
  g.add(chao);

  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = mapa[y][x];
    const lugar = new THREE.Group();
    lugar.position.set(x, 0, y);
    if (c === '#') {
      const alt = 0.35 + ((x * 7 + y * 3) % 4) * 0.22;
      lugar.add(caixa(0.86, alt, 0.86, COR.quadra));
    } else if (c === 'Q') {
      const grama = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 1), new THREE.MeshLambertMaterial({ color: COR.praca }));
      grama.position.y = 0.02;
      lugar.add(grama);
      if ((x + y) % 2 === 0) {
        const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 10), new THREE.MeshLambertMaterial({ color: 0x7a4e2d }));
        tronco.position.y = 0.17;
        const copa = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshLambertMaterial({ color: 0x2f7d3f }));
        copa.position.y = 0.45;
        lugar.add(tronco, copa);
      }
    } else if (c === 'C') {
      lugar.add(caixa(0.6, 0.4, 0.6, COR.casa));
      const telhado = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.35, 4), new THREE.MeshLambertMaterial({ color: COR.telhado }));
      telhado.rotation.y = Math.PI / 4;
      telhado.position.y = 0.575;
      lugar.add(telhado);
    } else if (c === 'P') {
      lugar.add(caixa(0.7, 0.45, 0.7, COR.padaria));
    } else if (c === 'E') {
      lugar.add(caixa(0.86, 0.7, 0.86, COR.escola));
      const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), new THREE.MeshLambertMaterial({ color: 0x555555 }));
      mastro.position.set(0.3, 0.95, 0.3);
      const bandeira = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.13, 0.01), new THREE.MeshLambertMaterial({ color: 0x1f8a70 }));
      bandeira.position.set(0.42, 1.12, 0.3);
      lugar.add(mastro, bandeira);
    }
    g.add(lugar);
  }

  const camera = new THREE.PerspectiveCamera(38, 4 / 3, 0.1, 100);
  const ctrl = new OrbitControls(camera, canvas);
  ctrl.enablePan = false;
  ctrl.minDistance = 5;
  ctrl.maxDistance = 18;
  const desenhar = () => renderer.render(cena, camera);
  ctrl.addEventListener('change', desenhar);

  const VISTAS = {
    planta: new THREE.Vector3(0, 13, 0.01),
    maquete: new THREE.Vector3(6.5, 6.5, 8.5),
  };
  camera.position.copy(VISTAS.maquete);
  ctrl.update();

  function ajustar() {
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw || !ch) return;
    renderer.setSize(cw, ch, false);
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
    desenhar();
  }
  new ResizeObserver(ajustar).observe(canvas);

  let anim = null;
  function irPara(nome) {
    const de = camera.position.clone(), para = VISTAS[nome], t0 = performance.now();
    ctrl.enableRotate = nome === 'maquete';
    cancelAnimationFrame(anim);
    const passo = (agora) => {
      const t = Math.min(1, (agora - t0) / 700), e = t * t * (3 - 2 * t);
      camera.position.lerpVectors(de, para, e);
      camera.lookAt(0, 0, 0);
      ctrl.update();
      desenhar();
      if (t < 1) anim = requestAnimationFrame(passo);
    };
    anim = requestAnimationFrame(passo);
    host.querySelectorAll('[data-vista]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vista === nome)));
  }
  host.querySelectorAll('[data-vista]').forEach((b) => b.addEventListener('click', () => irPara(b.dataset.vista)));
  ajustar();
  irPara('maquete');
}
