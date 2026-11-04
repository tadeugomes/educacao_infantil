"""Gera as narrações do livro com a voz Brian (ElevenLabs Multilingual v2 via fal.ai).

Uso, na raiz do projeto:
    python scripts/narrar.py narracao/m2.json             gera o que mudou
    python scripts/narrar.py narracao/m2.json --simular   só conta caracteres, não chama a API
    python scripts/narrar.py narracao/m2.json --somente m2-abertura
    python scripts/narrar.py narracao/m2.json --forcar    regera tudo

Requisitos: Python 3.9+, ffmpeg no PATH e FAL_KEY no arquivo .env (ou no ambiente).
A chave nunca vai para o site: o script roda no computador e grava só os .mp3 prontos.

Configuração em narracao/config.json:
  - cada cena é gerada separadamente, com a cena anterior e a seguinte da mesma faixa
    como contexto (previous_text e next_text), para a entonação continuar natural;
  - o silêncio que a API deixa no começo e no fim de cada cena é cortado, e as cenas são
    unidas com pausa fixa (0,7 s), com 0,6 s antes da primeira fala;
  - a faixa final é normalizada em duas passadas para -14 LUFS (pico real -1,5 dBTP).

Cenas já geradas ficam em narracao/_brutos/ (fora do git), indexadas pelo hash do texto,
do contexto e da voz. Rodar de novo não paga duas vezes pela mesma cena.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
BRUTOS = RAIZ / "narracao" / "_brutos"


def ler_env() -> None:
    env = RAIZ / ".env"
    if not env.exists():
        return
    for linha in env.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue
        k, v = linha.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def chamar_fal(endpoint: str, corpo: dict, chave: str) -> dict:
    req = urllib.request.Request(
        f"https://fal.run/{endpoint}",
        data=json.dumps(corpo).encode("utf-8"),
        headers={"Authorization": f"Key {chave}", "Content-Type": "application/json"},
        method="POST",
    )
    for tentativa in range(4):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf-8", "replace")[:400]
            if e.code in (401, 403):
                sys.exit(f"[narrar] chave recusada pelo fal.ai ({e.code}). Confira FAL_KEY no .env.")
            if e.code == 422:
                sys.exit(f"[narrar] parâmetros recusados (422): {msg}")
            espera = 2 ** tentativa * 3
            print(f"[narrar] erro {e.code}, nova tentativa em {espera} s: {msg}")
        except (urllib.error.URLError, TimeoutError) as e:
            espera = 2 ** tentativa * 3
            print(f"[narrar] falha de rede ({e}), nova tentativa em {espera} s")
        time.sleep(espera)
    sys.exit("[narrar] o fal.ai não respondeu depois de 4 tentativas.")


def baixar(url: str, destino: Path) -> None:
    parcial = destino.with_suffix(".part")
    try:
        with urllib.request.urlopen(url, timeout=180) as r, open(parcial, "wb") as f:
            shutil.copyfileobj(r, f)
        os.replace(parcial, destino)  # só vira .mp3 quando o download terminou
    except (urllib.error.URLError, OSError) as e:
        host = urllib.parse.urlparse(url).hostname
        sys.exit(f"[narrar] o áudio foi gerado, mas o download de {host} falhou ({e}).\n"
                 f"         Se esta rede filtra domínios, libere {host} ou rode o script em outra rede.")


def ffmpeg(*args: str) -> str:
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", "-y", *args], capture_output=True, text=True)
    if p.returncode != 0:
        sys.exit("[narrar] ffmpeg falhou:\n" + p.stderr[-1500:])
    return p.stderr


def valido(arquivo: Path) -> bool:
    """Confere se um áudio em cache abre e tem duração (descarta downloads interrompidos)."""
    p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(arquivo)],
                       capture_output=True, text=True)
    try:
        return float(p.stdout.strip()) > 0.2
    except ValueError:
        return False


def hash_de(*partes) -> str:
    return hashlib.sha256(json.dumps(partes, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:16]


def corpo_de(cfg: dict, texto: str, anterior: str | None, seguinte: str | None) -> dict:
    corpo = {"text": texto, **cfg["voz"]}
    if cfg.get("contexto_vizinho"):
        if anterior:
            corpo["previous_text"] = anterior
        if seguinte:
            corpo["next_text"] = seguinte
    return corpo


def caminho_bruto(cfg: dict, corpo: dict) -> Path:
    return BRUTOS / f"{hash_de(cfg['endpoint'], corpo)}.mp3"


def gerar_cena(cfg: dict, texto: str, anterior: str | None, seguinte: str | None, chave: str | None, simular: bool) -> Path | None:
    corpo = corpo_de(cfg, texto, anterior, seguinte)
    bruto = caminho_bruto(cfg, corpo)
    if bruto.exists() and valido(bruto):
        return bruto
    if simular:
        return None
    resp = chamar_fal(cfg["endpoint"], corpo, chave)
    url = (resp.get("audio") or {}).get("url")
    if not url:
        sys.exit(f"[narrar] resposta sem áudio: {json.dumps(resp)[:400]}")
    BRUTOS.mkdir(parents=True, exist_ok=True)
    baixar(url, bruto)
    return bruto


def medir(arquivo: Path) -> tuple[float, float]:
    """Loudness integrado (LUFS) e pico real (dBTP) pelo filtro ebur128."""
    log = ffmpeg("-i", str(arquivo), "-af", "ebur128=peak=true", "-f", "null", "-")
    resumo = log[log.rindex("Summary"):]
    i = float(resumo[resumo.index("I:"):].split()[1])
    tp = float(resumo[resumo.index("Peak:"):].split()[1])
    return i, tp


def montar_faixa(cfg: dict, cenas: list[Path], destino: Path) -> float:
    s = cfg["saida"]
    sr, ch = str(s["amostragem_hz"]), str(s["canais"])
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        # 1. Cada cena em WAV, sem o silêncio da borda (corta o início, inverte, corta de novo).
        limpas = []
        apara = ("silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,"
                 "areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse")
        for i, c in enumerate(cenas):
            w = tmp / f"c{i}.wav"
            ffmpeg("-i", str(c), "-af", apara, "-ar", sr, "-ac", ch, str(w))
            limpas.append(w)
        # 2. Pausas fixas e concatenação.
        def silencio(nome: str, seg: float) -> Path:
            w = tmp / nome
            ffmpeg("-f", "lavfi", "-i", f"anullsrc=r={sr}:cl={'mono' if ch == '1' else 'stereo'}", "-t", str(seg), str(w))
            return w
        inicio = silencio("ini.wav", cfg["pausa_inicial_s"])
        entre = silencio("entre.wav", cfg["pausa_entre_cenas_s"])
        ordem = [inicio]
        for i, w in enumerate(limpas):
            if i:
                ordem.append(entre)
            ordem.append(w)
        lista = tmp / "lista.txt"
        lista.write_text("".join(f"file '{p.as_posix()}'\n" for p in ordem), encoding="utf-8")
        junta = tmp / "junta.wav"
        ffmpeg("-f", "concat", "-safe", "0", "-i", str(lista), "-c", "copy", str(junta))
        # 3. Loudness em duas passadas (EBU R128).
        alvo = f"I={cfg['loudness_lufs']}:TP={cfg['true_peak_db']}:LRA=11"
        log = ffmpeg("-i", str(junta), "-af", f"loudnorm={alvo}:print_format=json", "-f", "null", "-")
        med = json.loads(log[log.rindex("{"):log.rindex("}") + 1])
        filtro = (f"loudnorm={alvo}:measured_I={med['input_i']}:measured_TP={med['input_tp']}"
                  f":measured_LRA={med['input_lra']}:measured_thresh={med['input_thresh']}"
                  f":offset={med['target_offset']}:linear=true")
        norm = tmp / "norm.wav"
        ffmpeg("-i", str(junta), "-af", filtro, "-ar", sr, "-ac", ch, str(norm))
        # 4. Ajuste fino. A voz tem picos altos (crest de 18 dB ou mais): para chegar a
        #    -14 LUFS sem passar do pico real, o limitador precisa agir, e ele derruba a média.
        #    Por isso mede, corrige o ganho, limita e repete até ficar a 0,2 LU do alvo.
        #    A medida é feita no próprio mp3, porque a codificação muda loudness e pico.
        destino.parent.mkdir(parents=True, exist_ok=True)
        atual, folga = norm, 0.4
        for volta in range(8):
            ffmpeg("-i", str(atual), "-ar", sr, "-ac", ch, "-c:a", "libmp3lame", "-b:a", f"{s['taxa_kbps']}k", str(destino))
            i_med, tp_med = medir(destino)
            ganho = cfg["loudness_lufs"] - i_med
            if abs(ganho) <= 0.2 and tp_med <= cfg["true_peak_db"]:
                break
            if tp_med > cfg["true_peak_db"]:
                folga += tp_med - cfg["true_peak_db"] + 0.1
            teto = 10 ** ((cfg["true_peak_db"] - folga) / 20)
            prox = tmp / f"ajuste{volta}.wav"
            ffmpeg("-i", str(atual), "-af",
                   f"volume={ganho:.2f}dB,alimiter=limit={teto:.3f}:attack=2:release=40:level=false",
                   "-ar", sr, "-ac", ch, str(prox))
            atual = prox
    # Duração e loudness conferidos no arquivo final.
    i_final, pico = medir(destino)
    print(f"           loudness {i_final:.1f} LUFS, pico real {pico:.1f} dBTP")
    p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(destino)],
                       capture_output=True, text=True)
    return float(p.stdout.strip() or 0)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("roteiro", type=Path)
    ap.add_argument("--simular", action="store_true")
    ap.add_argument("--forcar", action="store_true")
    ap.add_argument("--somente", nargs="*")
    a = ap.parse_args()

    ler_env()
    cfg = json.loads((RAIZ / "narracao" / "config.json").read_text(encoding="utf-8"))
    roteiro = json.loads((a.roteiro if a.roteiro.is_absolute() else RAIZ / a.roteiro).read_text(encoding="utf-8"))
    chave = os.environ.get("FAL_KEY", "")
    if not a.simular and not chave:
        sys.exit("[narrar] FAL_KEY vazia. Preencha o arquivo .env.")
    if not a.simular and not shutil.which("ffmpeg"):
        sys.exit("[narrar] ffmpeg não encontrado no PATH.")

    pasta = RAIZ / cfg["saida"]["pasta"]
    indice_arq = pasta / "indice.json"
    indice = json.loads(indice_arq.read_text(encoding="utf-8")) if indice_arq.exists() else {}

    total_chars = novos_chars = 0
    for f in roteiro["faixas"]:
        if a.somente and f["id"] not in a.somente:
            continue
        cenas = f["cenas"]
        h_faixa = hash_de(cfg, cenas)
        destino = pasta / f"{f['id']}.mp3"
        chars = sum(len(c) for c in cenas)
        total_chars += chars
        if not a.forcar and destino.exists() and indice.get(f["id"], {}).get("hash") == h_faixa:
            print(f"[narrar] {f['id']}: sem mudança")
            continue
        print(f"[narrar] {f['id']}: {len(cenas)} cenas, {chars} caracteres")
        arquivos = []
        for i, texto in enumerate(cenas):
            ant = cenas[i - 1] if i > 0 else None
            seg = cenas[i + 1] if i + 1 < len(cenas) else None
            cb = caminho_bruto(cfg, corpo_de(cfg, texto, ant, seg))
            if not (cb.exists() and valido(cb)):
                novos_chars += len(texto)
            arquivos.append(gerar_cena(cfg, texto, ant, seg, chave, a.simular))
        if a.simular:
            continue
        dur = montar_faixa(cfg, arquivos, destino)
        indice[f["id"]] = {"hash": h_faixa, "duracao_s": round(dur, 2), "cenas": len(cenas),
                           "voz": cfg["voz"]["voice"], "modelo": cfg["endpoint"]}
        print(f"           {destino.relative_to(RAIZ).as_posix()} ({dur:.1f} s)")

    if not a.simular:
        pasta.mkdir(parents=True, exist_ok=True)
        indice_arq.write_text(json.dumps(indice, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[narrar] caracteres no roteiro: {total_chars}. A gerar agora (não estavam em cache): {novos_chars}.")


if __name__ == "__main__":
    main()
