"""Relatório de cobertura da BNCC (roda antes de cada compilação).

Lê dados/bncc_3ano.csv e procura, em todos os .qmd, blocos marcados assim:

    ::: {.atividade data-bncc="EF03MA13 EF03MA14" data-tipo="pratica"}

Tipos aceitos: diagnostico, exploracao, pratica, missao, avaliacao.
Uma habilidade está coberta quando tem ao menos uma atividade de prática
(exploracao, pratica ou missao) e uma de avaliacao.

Gera professor/_cobertura_gerada.md, incluído em professor/cobertura.qmd.
Com a variável de ambiente BNCC_ESTRITO=1, a compilação falha se faltar alguma.
"""
import csv
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PRATICA = {"exploracao", "pratica", "missao"}
ATTR = re.compile(r"\{[^}]*data-bncc=\"([^\"]+)\"[^}]*\}")
TIPO = re.compile(r"data-tipo=\"(\w+)\"")


def main() -> int:
    with open(RAIZ / "dados" / "bncc_3ano.csv", encoding="utf-8") as f:
        habs = list(csv.DictReader(f))
    codigos = {h["codigo"] for h in habs}

    usos = defaultdict(set)      # código -> tipos
    onde = defaultdict(set)      # código -> arquivos
    desconhecidos = set()
    for qmd in sorted(RAIZ.rglob("*.qmd")):
        if "_site" in qmd.parts or qmd.name.startswith("_"):
            continue
        texto = qmd.read_text(encoding="utf-8")
        for m in ATTR.finditer(texto):
            t = TIPO.search(m.group(0))
            tipo = t.group(1) if t else "pratica"
            for c in m.group(1).split():
                if c not in codigos:
                    desconhecidos.add(c)
                usos[c].add(tipo)
                onde[c].add(qmd.relative_to(RAIZ).as_posix())

    por_modulo = defaultdict(lambda: [0, 0, 0])  # total, com prática, completas
    faltando = []
    for h in habs:
        tipos = usos.get(h["codigo"], set())
        pr, av = bool(tipos & PRATICA), "avaliacao" in tipos
        pm = por_modulo[(h["modulo"], h["modulo_nome"])]
        pm[0] += 1
        pm[1] += pr
        pm[2] += pr and av
        if not (pr and av):
            faltando.append((h["modulo"], h["codigo"], pr, av))

    total = len(habs)
    completas = total - len(faltando)
    linhas = [
        f"Habilidades com prática e avaliação: **{completas} de {total}**.",
        "",
        "| Módulo | Habilidades | Com prática | Com prática e avaliação |",
        "|---|---|---|---|",
    ]
    for (mod, nome), (t, p, c) in sorted(por_modulo.items()):
        linhas.append(f"| {mod} {nome} | {t} | {p} | {c} |")
    if desconhecidos:
        linhas += ["", "Códigos usados nos módulos que não existem no CSV: " + ", ".join(sorted(desconhecidos))]
    linhas += ["", "Habilidades já trabalhadas e onde aparecem:", ""]
    for c in sorted(onde):
        linhas.append(f"- {c} ({', '.join(sorted(usos[c]))}): {', '.join(sorted(onde[c]))}")
    destino = RAIZ / "professor" / "_cobertura_gerada.md"
    destino.write_text("\n".join(linhas) + "\n", encoding="utf-8")

    print(f"[cobertura BNCC] {completas}/{total} habilidades com prática e avaliação")
    if desconhecidos:
        print("[cobertura BNCC] códigos desconhecidos:", ", ".join(sorted(desconhecidos)))
    if os.environ.get("BNCC_ESTRITO") == "1" and (faltando or desconhecidos):
        print("[cobertura BNCC] BNCC_ESTRITO=1 e há lacunas. Compilação interrompida.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
