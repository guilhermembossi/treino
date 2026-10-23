import { useState, type FormEvent } from 'react';
import { useDados, useLista } from '../dados/contexto';

// Fichas, versão simples (tarefa 3.1): criar, renomear e excluir, para testar os dados no celular.
// A tela completa (exercícios, séries, reordenar) chega na tarefa 4.1.
export default function Fichas() {
  const dados = useDados();
  const fichas = useLista('fichas');
  const [nova, setNova] = useState('');

  if (!fichas) return null;
  const ordenadas = [...fichas].sort((a, b) => a.ordem - b.ordem || a.criado_em.localeCompare(b.criado_em));

  async function criar(e: FormEvent) {
    e.preventDefault();
    const nome = nova.trim();
    if (!nome) return;
    const ordem = Math.max(-1, ...ordenadas.map((f) => f.ordem)) + 1;
    await dados.salvar('fichas', { nome, ordem, ativa: true });
    setNova('');
  }

  async function renomear(id: string, atual: string, nome: string) {
    const limpo = nome.trim();
    if (limpo && limpo !== atual) await dados.salvar('fichas', { id, nome: limpo });
  }

  return (
    <>
      <h1>Fichas</h1>
      <form className="cartao linha-nova" onSubmit={criar}>
        <input value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nome da nova ficha"
          aria-label="Nome da nova ficha" maxLength={100} />
        <button className="botao-primario" type="submit" disabled={!nova.trim()}>Criar</button>
      </form>

      {ordenadas.length === 0
        ? <p className="fraco vazio">Nenhuma ficha ainda.</p>
        : (
          <ul className="lista">
            {ordenadas.map((f) => (
              <li key={f.id} className="cartao item-ficha">
                <input defaultValue={f.nome} key={f.atualizado_em} aria-label={`Nome da ficha ${f.nome}`} maxLength={100}
                  onBlur={(e) => void renomear(f.id, f.nome, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
                <button type="button" className="link perigo" onClick={() => {
                  if (confirm(`Excluir a ficha "${f.nome}"?`)) void dados.excluir('fichas', f.id);
                }}>Excluir</button>
              </li>
            ))}
          </ul>
        )}
      <p className="fraco nota">Toque no nome para renomear. Exercícios e séries chegam numa próxima etapa.</p>
    </>
  );
}
