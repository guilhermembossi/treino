import { describe, expect, it } from 'vitest';
import { buscaYoutube, chaveVideo, linkYoutube, videoDoExercicio } from './videos';
import type { Video } from './tipos';

describe('vídeos dos exercícios', () => {
  it('chave sem maiúsculas, acentos e espaços repetidos', () => {
    expect(chaveVideo('  Supino   Reto ')).toBe('supino reto');
    expect(chaveVideo('Elevação Lateral')).toBe(chaveVideo('elevacao lateral'));
    expect(chaveVideo('   ')).toBe('');
  });

  it('aceita links https do YouTube (vídeo, curto, shorts, celular) e completa o https', () => {
    expect(linkYoutube('https://www.youtube.com/watch?v=abc123')).toBe('https://www.youtube.com/watch?v=abc123');
    expect(linkYoutube(' https://youtu.be/abc123?si=xyz ')).toBe('https://youtu.be/abc123?si=xyz');
    expect(linkYoutube('https://youtube.com/shorts/abc123')).toBe('https://youtube.com/shorts/abc123');
    expect(linkYoutube('https://m.youtube.com/watch?v=abc')).toBe('https://m.youtube.com/watch?v=abc');
    expect(linkYoutube('youtu.be/abc123')).toBe('https://youtu.be/abc123');
  });

  it('recusa qualquer outro endereço', () => {
    for (const ruim of [
      'http://www.youtube.com/watch?v=abc', 'https://youtube.com.golpe.com/x', 'https://golpe.com/youtube.com/x',
      'javascript:alert(1)', 'https://user:senha@youtube.com/watch?v=x', 'https://youtube.com:8443/watch?v=x',
      'https://www.youtube.com/', 'https://vimeo.com/123', 'supino reto', '', 'data:text/html,oi',
    ]) expect(linkYoutube(ruim), ruim).toBeNull();
  });

  it('busca no YouTube com o nome do exercício', () => {
    expect(buscaYoutube(' Supino reto ')).toBe('https://www.youtube.com/results?search_query=Supino%20reto%20execu%C3%A7%C3%A3o');
  });

  it('acha o vídeo pelo nome, o mais recente, ignorando excluídos', () => {
    const v = (id: string, nome: string, quando: string, excluido: string | null = null): Video => ({
      id, user_id: 'u', nome, chave: chaveVideo(nome), url: `https://youtu.be/${id}`,
      criado_em: quando, atualizado_em: quando, excluido_em: excluido,
    });
    const lista = [v('a', 'Supino reto', '2026-10-01'), v('b', 'SUPINO  RETO', '2026-10-05'), v('c', 'Supino reto', '2026-10-09', '2026-10-09')];
    expect(videoDoExercicio(lista, 'supino reto')?.id).toBe('b');
    expect(videoDoExercicio(lista, 'Agachamento')).toBeUndefined();
    expect(videoDoExercicio(lista, '')).toBeUndefined();
  });
});
