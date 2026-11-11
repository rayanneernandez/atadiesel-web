// Foto real de cada móvel da loja, usada na aba "Loja 3D" do Mapa da Loja.
// As imagens ficam em public/mapa3d/. Para trocar uma foto, substitua o arquivo (mesmo nome) ou aponte o móvel para outro.
// A mesma foto aparece nas duas faces da gôndola. Móvel sem foto aparece liso, só com a estrutura.
const base = `${import.meta.env.BASE_URL || '/'}mapa3d/`;

export const FOTOS_3D = {
  'GONDULA 1': `${base}g1.jpg`,
  'GONDULA 2': `${base}g2.jpg`,
  'GONDULA 3': `${base}g3.jpg`,
  'GONDULA 4': `${base}g4.jpg`,
  'GONDULA 5': `${base}g5.jpg`,
  'GONDULA 6': `${base}g6.jpg`,
  'GONDULA 7': `${base}g7.jpg`,
  'GONDULA 8': `${base}g8.jpg`,
  'GONDULA 9': `${base}g9.jpg`,
  'GONDULA 10': `${base}g10.jpg`,
  'PRATELEIRA 1': `${base}p1.jpg`,
  'PRATELEIRA 2': `${base}p2.jpg`,
  'PRATELEIRA 3': `${base}p3.jpg`,
  'PRATELEIRA 4': `${base}p4.jpg`,
  'PRATELEIRA 5': `${base}p5.jpg`,
  'PRATELEIRA 6': `${base}p6.jpg`,
  'PRATELEIRA 7': `${base}p7.jpg`,
  'PRATELEIRA 8': `${base}p8.jpg`,
};
