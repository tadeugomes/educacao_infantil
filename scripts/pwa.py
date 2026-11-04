"""Gera o service worker do site (roda depois de cada compilação).

Lista todos os arquivos da pasta de saída e grava sw.js com essa lista.
O navegador baixa tudo no primeiro acesso e o livro passa a abrir sem internet.
A versão do cache muda sempre que algum arquivo muda, e o aparelho atualiza sozinho.
"""
import hashlib
import json
import os
import shutil
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
saida = Path(os.environ.get("QUARTO_PROJECT_OUTPUT_DIR", "_site/aluno"))
if not saida.is_absolute():
    saida = RAIZ / saida

shutil.copy(RAIZ / "manifest.webmanifest", saida / "manifest.webmanifest")

IGNORAR = {"sw.js", "search.json"}
arquivos, h = [], hashlib.sha256()
for p in sorted(saida.rglob("*")):
    if p.is_file() and p.name not in IGNORAR and not p.name.endswith(".map"):
        rel = p.relative_to(saida).as_posix()
        arquivos.append("./" + rel)
        h.update(rel.encode())
        h.update(p.read_bytes())
versao = h.hexdigest()[:12]

sw = f"""// Gerado por scripts/pwa.py. Não edite à mão.
const CACHE = 'livro3ano-{versao}';
const ARQUIVOS = {json.dumps(arquivos, ensure_ascii=False)};

self.addEventListener('install', (e) => {{
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
}});

self.addEventListener('activate', (e) => {{
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
}});

self.addEventListener('fetch', (e) => {{
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, {{ ignoreSearch: true }}).then((r) => r || fetch(e.request))
  );
}});
"""
(saida / "sw.js").write_text(sw, encoding="utf-8")
print(f"[pwa] sw.js com {len(arquivos)} arquivos, versão {versao}")
