import { useEffect, useRef, useState } from 'react';
import { useDados, useLista } from '../dados/contexto';
import { buscaYoutube, chaveVideo, linkYoutube, videoDoExercicio } from '../dados/videos';
import { IconePlay } from '../icones';

// Vídeos dos exercícios (tarefa 8.7). O vídeo é do NOME do exercício (biblioteca pessoal, tabela `videos`):
// todo exercício com o mesmo nome mostra o mesmo vídeo, e um exercício novo com esse nome já vem com ele.
// O vídeo não toca dentro do app: o ▶ abre o link no app/site do YouTube.

export const MENSAGEM_LINK = 'Cole um link do YouTube (youtube.com ou youtu.be).';

// ▶ do exercício, só quando há vídeo guardado para o nome.
export function BotaoVideo({ nome }: { nome: string }) {
  const videos = useLista('videos');
  const video = videos && videoDoExercicio(videos, nome);
  if (!video) return null;
  return (
    <a className="botao-icone pequeno botao-video" href={video.url} target="_blank" rel="noopener noreferrer"
      aria-label={`Ver o vídeo de ${nome} no YouTube`}><IconePlay /></a>
  );
}

// Campo "Vídeo" do editor: busca no YouTube, colar o link, trocar ou apagar. Salva ao sair do campo.
export function CampoVideo({ nome }: { nome: string }) {
  const dados = useDados();
  const videos = useLista('videos');
  const video = videos ? videoDoExercicio(videos, nome) : undefined;
  const [texto, setTexto] = useState(video?.url ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const focado = useRef(false);

  // Mudou por fora (sincronização, outro exercício com o mesmo nome) e o campo não está em uso: mostra o novo.
  useEffect(() => { if (!focado.current) { setTexto(video?.url ?? ''); setErro(null); } }, [video?.url]);

  async function salvar() {
    focado.current = false;
    const t = texto.trim();
    if (!t) {
      setErro(null);
      if (video) await dados.excluir('videos', video.id);
      return;
    }
    const url = linkYoutube(t);
    if (!url) { setErro(MENSAGEM_LINK); return; }
    setErro(null);
    setTexto(url);
    if (url === video?.url) return;
    await dados.salvar('videos', video ? { id: video.id, url } : { nome: nome.trim(), chave: chaveVideo(nome), url });
  }

  const semNome = !chaveVideo(nome);
  return (
    <div className="campo-video">
      <label className="campo-video-linha">
        <span>Vídeo</span>
        <input type="url" inputMode="url" autoComplete="off" spellCheck={false} placeholder="Link do YouTube"
          value={texto} disabled={semNome} aria-invalid={erro ? true : undefined}
          aria-label={`Link do vídeo de ${nome || 'exercício'} no YouTube`}
          onFocus={() => { focado.current = true; }}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={() => void salvar()}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
      </label>
      {!semNome && (
        <a className="link campo-video-busca" href={buscaYoutube(nome)} target="_blank" rel="noopener noreferrer">
          Buscar no YouTube
        </a>
      )}
      {erro && <p className="erro campo-video-aviso" role="alert">{erro}</p>}
      {!erro && video && <p className="fraco campo-video-aviso">Vale para todo exercício chamado “{nome.trim()}”.</p>}
    </div>
  );
}
