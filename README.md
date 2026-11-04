# Meu Livro do 3º ano

Livro digital interativo para o 3º ano do ensino fundamental, alinhado à BNCC (2017) e ao complemento de Computação (Parecer CNE/CEB nº 2/2022). Aberto ao público. Feito em [Quarto](https://quarto.org).

Estado atual: esqueleto completo e o módulo piloto **M2 Mapas, caminhos e formas** (15 habilidades). Os outros 7 módulos e as 3 trilhas estão planejados em `dados/bncc_3ano.csv`.

## Duas versões do mesmo conteúdo

| Perfil | Comando | Saída | Para quem |
|---|---|---|---|
| aluno (padrão) | `quarto render --profile aluno` | `_site/aluno/` | Criança. Site instalável (PWA), funciona sem internet, sem códigos BNCC na tela |
| professor | `quarto render --profile professor` | `_site/professor/` | Professor. Mesmo conteúdo com códigos BNCC, guia de cada etapa, rubricas, relatório de cobertura e leitor de progresso |

Para ver enquanto edita: `quarto preview --profile aluno`. Os módulos usam JavaScript em módulos ES, que não abrem com duplo clique no arquivo (`file://`). Use `quarto preview` ou qualquer servidor local.

Requisitos: Quarto 1.4 ou mais novo e Python 3 (os scripts de pré e pós-compilação usam só a biblioteca padrão).

## Organização

```
_quarto.yml                 configuração comum
_quarto-aluno.yml           perfil da criança
_quarto-professor.yml       perfil do professor
index.qmd                   mapa dos mundos (página inicial)
progresso.qmd               progresso da criança e código/QR para o professor
modulos/                    um .qmd por módulo
professor/                  páginas só do professor
games/robo/                 jogo do robô (página própria, embutida por iframe)
assets/js/livro.js          biblioteca comum: progresso local, leitura em voz alta, questões
assets/js/m2/               sólidos 3D, maquete 3D e atividades do M2
assets/vendor/              three.js r170 e qrcode-generator (MIT), copiados para funcionar offline
assets/fonts/               Andika (SIL OFL), fonte desenhada para leitores iniciantes
dados/bncc_3ano.csv         as 203 habilidades do 3º ano, com módulo, texto oficial e página do PDF
_extensions/bncc/           atalhos {{< habilidade EF03MA13 >}} e {{< habilidades M2 >}}
scripts/cobertura.py        relatório de cobertura (antes de compilar)
scripts/pwa.py              gera o service worker (depois de compilar)
```

## Como marcar uma atividade

Toda atividade fica num bloco com os códigos que trabalha e o tipo:

```markdown
::: {.etapa .atividade data-bncc="EF03MA13 EF03MA14" data-tipo="exploracao"}
...
:::
```

Tipos: `diagnostico`, `exploracao`, `pratica`, `missao`, `avaliacao`. O script de cobertura considera uma habilidade coberta quando ela tem prática (exploracao, pratica ou missao) e avaliação. Com `BNCC_ESTRITO=1` a compilação falha se faltar alguma, o que serve para o GitHub Actions quando todos os módulos estiverem prontos.

Conteúdo só do professor:

```markdown
::: {.content-visible when-profile="professor"}
...
:::
```

## Regras do projeto

- Sem login, sem coleta de dados pessoais, sem rastreadores e sem publicidade (ECA Digital, Lei nº 15.211/2025). O progresso fica no aparelho e só sai pelo código que a criança gera.
- Sem caixas de recompensa, moedas ou sorteios nos jogos.
- Áreas de toque de pelo menos 48 × 48 px. Nada depende de mouse ou teclado.
- 3D só onde ensina algo que a imagem plana não ensina.
- Imagens e sons próprios, Creative Commons ou domínio público.

## Publicação

O site vai para o GitHub Pages pelo workflow `.github/workflows/pages.yml`, a cada push na `main`. Ele compila os dois perfis e publica:

| Caminho | Conteúdo |
|---|---|
| `/` | página de entrada, `pages/index.html` |
| `/aluno/` | versão da criança, instalável |
| `/professor/` | versão do professor |

Para ligar: em Settings → Pages do repositório, escolha **GitHub Actions** como origem. Pages em repositório privado exige GitHub Pro; num repositório público funciona no plano gratuito.

## Licenças de terceiros

- three.js, MIT (`assets/vendor/three/LICENSE`)
- qrcode-generator, MIT (Kazuhiko Arase)
- Andika, SIL Open Font License 1.1 (`assets/fonts/LICENSE`)
- Dados da BNCC: conjunto bncc-dados (github.com/bncc-dev), versão dados-2026.07.1

## Narração

As narrações usam a voz Brian (ElevenLabs Multilingual v2) pelo fal.ai, endpoint `fal-ai/elevenlabs/tts/multilingual-v2`. A configuração fica em `narracao/config.json` (português, stability 0,5, similarity_boost 0,75, speed 1, contexto da cena anterior e da seguinte, 0,6 s antes da primeira fala, 0,7 s entre cenas, -14 LUFS).

O texto de cada narração fica num roteiro por módulo (`narracao/m2.json`). Cada faixa vira `assets/audio/<id>.mp3` e toca no botão "Ouvir" da etapa marcada com `data-audio="<id>"`. Sem o arquivo, o botão usa a voz do aparelho.

```
python scripts/narrar.py narracao/m2.json --simular   # conta caracteres, sem custo
python scripts/narrar.py narracao/m2.json             # gera só o que mudou
```

Precisa de `ffmpeg` no PATH e da chave `FAL_KEY` no `.env`. As cenas já pagas ficam em `narracao/_brutos/` (fora do git) e não são geradas de novo.
