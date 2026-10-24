// Reordenar uma lista (arrastar): move `de` para a posição de `para` e devolve só o que mudou,
// com a posição nova (0, 1, 2…) no campo pedido. Usado para fichas e exercícios (`ordem`) e séries (`serie_n`, a partir de 1).
export function reordenar<T extends { id: string }>(
  lista: T[], deId: string, paraId: string, campo: keyof T & string, inicio = 0,
): (Partial<T> & { id: string })[] {
  const de = lista.findIndex((x) => x.id === deId);
  const para = lista.findIndex((x) => x.id === paraId);
  if (de < 0 || para < 0 || de === para) return [];
  const nova = [...lista];
  const [movido] = nova.splice(de, 1);
  nova.splice(para, 0, movido);
  return renumerar(nova, campo, inicio);
}

// Posições seguidas (sem buracos) na ordem atual; devolve só o que mudou.
export function renumerar<T extends { id: string }>(
  lista: T[], campo: keyof T & string, inicio = 0,
): (Partial<T> & { id: string })[] {
  return lista
    .map((x, i) => ({ x, n: i + inicio }))
    .filter(({ x, n }) => x[campo] !== n)
    .map(({ x, n }) => ({ id: x.id, [campo]: n }) as Partial<T> & { id: string });
}

export const proximaOrdem = (lista: { ordem: number }[]) => Math.max(-1, ...lista.map((x) => x.ordem)) + 1;
