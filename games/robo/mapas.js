// Mapas compartilhados pelo jogo do robô (games/robo) e pela maquete 3D (módulo M2).
// Legenda dos caracteres:
//   .  rua (o robô anda)        #  quadra com prédios (bloqueia)
//   Q  praça (bloqueia)         C  casa (partida)
//   P  padaria                  E  escola
// Direções: 0 = norte (para cima), 1 = leste, 2 = sul, 3 = oeste.

export const LEGENDA = {
  '.': 'rua',
  '#': 'quadra com prédios',
  Q: 'praça',
  C: 'casa',
  P: 'padaria',
  E: 'escola',
};

export const NIVEIS = [
  {
    id: 'n1',
    titulo: 'Fase 1. Em frente',
    pedido: 'Leve o robô da casa até a escola.',
    mapa: ['C...E'],
    inicio: { x: 0, y: 0, d: 1 },
    destinos: ['E'],
    blocos: ['frente'],
    maxBlocos: 6,
  },
  {
    id: 'n2',
    titulo: 'Fase 2. Virar',
    pedido: 'Agora o caminho faz uma curva. Use virar à direita ou à esquerda.',
    mapa: [
      'C..#',
      '##.#',
      '##.E',
    ],
    inicio: { x: 0, y: 0, d: 1 },
    destinos: ['E'],
    blocos: ['frente', 'esquerda', 'direita'],
    maxBlocos: 8,
  },
  {
    id: 'n3',
    titulo: 'Fase 3. Repetir até a parede',
    pedido: 'Você só tem 5 blocos. O bloco "frente até a parede" repete o passo até o robô encontrar um obstáculo.',
    mapa: [
      'C......#',
      '######.#',
      '######.#',
      '######.#',
      '#E.....#',
    ],
    inicio: { x: 0, y: 0, d: 1 },
    destinos: ['E'],
    blocos: ['frente', 'esquerda', 'direita', 'ate'],
    maxBlocos: 5,
  },
  {
    id: 'n4',
    titulo: 'Fase 4. O bairro',
    pedido: 'Divida o problema em duas partes. Primeiro vá da casa até a padaria. Depois, da padaria até a escola.',
    mapa: [
      'C...##P#',
      '###.##.#',
      '.......#',
      '.#####.#',
      '.#QQQ#.#',
      '.#QQQ#..',
      '.......E',
    ],
    inicio: { x: 0, y: 0, d: 1 },
    destinos: ['P', 'E'],
    blocos: ['frente', 'esquerda', 'direita', 'ate'],
    maxBlocos: 14,
  },
];

export const BAIRRO = NIVEIS[3];
