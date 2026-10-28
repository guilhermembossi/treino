import { describe, expect, it } from 'vitest';
import { senhaVazada, sha1Hex } from './senhaVazada';

// Servidor falso no formato da Pwned Passwords: "SUFIXO:VEZES" por linha; padding com VEZES = 0.
const servidor = (linhas: string[], status = 200) => {
  const pedidos: { url: string; init?: RequestInit }[] = [];
  const buscar = (async (url: string, init?: RequestInit) => {
    pedidos.push({ url, init });
    return new Response(linhas.join('\r\n'), { status });
  }) as typeof fetch;
  return { buscar, pedidos };
};

describe('senhaVazada', () => {
  it('SHA-1 conhecido', async () => {
    expect(await sha1Hex('password')).toBe('5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8');
  });

  it('manda só os 5 primeiros caracteres do hash, com padding', async () => {
    const { buscar, pedidos } = servidor([]);
    await senhaVazada('password', buscar);
    expect(pedidos[0].url).toBe('https://api.pwnedpasswords.com/range/5BAA6');
    expect(JSON.stringify(pedidos[0].init)).not.toContain('password');
    expect((pedidos[0].init?.headers as Record<string, string>)['Add-Padding']).toBe('true');
  });

  it('senha que está na base: vazada', async () => {
    const { buscar } = servidor(['0018A45C4D1DEF81644B54AB7F969B88D65:3', '1E4C9B93F3F0682250B6CF8331B7EE68FD8:52256179']);
    expect(await senhaVazada('password', buscar)).toBe(true);
  });

  it('senha que não está na base, ou só no padding (0 vezes): não vazada', async () => {
    expect(await senhaVazada('password', servidor(['0018A45C4D1DEF81644B54AB7F969B88D65:3']).buscar)).toBe(false);
    expect(await senhaVazada('password', servidor(['1E4C9B93F3F0682250B6CF8331B7EE68FD8:0']).buscar)).toBe(false);
  });

  it('sem internet ou base fora do ar: não sabe (null), não trava o cadastro', async () => {
    const semRede = (async () => { throw new TypeError('Failed to fetch'); }) as typeof fetch;
    expect(await senhaVazada('password', semRede)).toBeNull();
    expect(await senhaVazada('password', servidor([], 503).buscar)).toBeNull();
  });
});
