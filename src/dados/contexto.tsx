import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { marca } from '../config/marca';
import { abrirBanco, Dados } from './dados';
import { remotoSupabase } from './remoto';
import type { EstadoSync, Registros, Remoto, Tabela } from './tipos';

const Contexto = createContext<Dados | null>(null);

const INTERVALO_MS = 60 * 1000;

// Abre os dados do usuário logado (um banco local por usuário) e sincroniza:
// ao abrir, ao voltar a internet, ao voltar para o app e a cada minuto.
export function ProvedorDados({ userId, remoto = remotoSupabase, children }: {
  userId: string; remoto?: Remoto; children: ReactNode;
}) {
  const [dados, setDados] = useState<Dados | null>(null);

  useEffect(() => {
    let d: Dados | null = null;
    let ativo = true;
    abrirBanco(`${marca.id}-dados-${userId}`).then((db) => {
      if (!ativo) { db.close(); return; }
      d = new Dados(db, userId, remoto);
      setDados(d);
      void d.sincronizar();
    });
    const sincronizar = () => { if (d && document.visibilityState === 'visible') void d.sincronizar(); };
    const timer = setInterval(sincronizar, INTERVALO_MS);
    window.addEventListener('online', sincronizar);
    window.addEventListener('offline', sincronizar);
    document.addEventListener('visibilitychange', sincronizar);
    return () => {
      ativo = false;
      clearInterval(timer);
      window.removeEventListener('online', sincronizar);
      window.removeEventListener('offline', sincronizar);
      document.removeEventListener('visibilitychange', sincronizar);
      d?.fechar();
    };
  }, [userId, remoto]);

  if (!dados) return null;
  return <Contexto.Provider value={dados}>{children}</Contexto.Provider>;
}

export function useDados(): Dados {
  const d = useContext(Contexto);
  if (!d) throw new Error('useDados fora do ProvedorDados');
  return d;
}

// Lista viva de uma tabela (atualiza sozinha quando algo muda).
export function useLista<T extends Tabela>(tabela: T): Registros[T][] | null {
  const dados = useDados();
  const [lista, setLista] = useState<Registros[T][] | null>(null);
  useEffect(() => {
    let ativo = true;
    const ler = () => dados.listar(tabela).then((l) => { if (ativo) setLista(l); });
    void ler();
    const parar = dados.ouvir(() => void ler());
    return () => { ativo = false; parar(); };
  }, [dados, tabela]);
  return lista;
}

export function useEstadoSync(): EstadoSync {
  const dados = useDados();
  const [estado, setEstado] = useState(dados.estadoSync);
  useEffect(() => dados.ouvir(() => setEstado(dados.estadoSync)), [dados]);
  return estado;
}
