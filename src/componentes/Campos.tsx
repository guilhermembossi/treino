import { useEffect, useRef, useState, type ChangeEvent, type InputHTMLAttributes, type KeyboardEvent } from 'react';

// Campos que salvam sozinhos: 0,6 s depois de parar de digitar e ao sair do campo.
// Valor inválido ao sair volta para o último salvo. Enquanto o campo está em uso,
// uma mudança vinda da sincronização não sobrescreve o que está sendo digitado.

const ESPERA_MS = 600;

type Comuns = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur' | 'type' | 'defaultValue'>;

function useCampo<V>(valor: V, formatar: (v: V) => string, ler: (t: string) => V | undefined, aoSalvar: (v: V) => void) {
  const [texto, setTexto] = useState(() => formatar(valor));
  const focado = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendente = useRef<string | null>(null);
  const salvar = useRef(aoSalvar);
  salvar.current = aoSalvar;

  // Valor mudou por fora (sincronização, outra tela) e o campo não está em uso: mostra o novo.
  useEffect(() => { if (!focado.current) setTexto(formatar(valor)); }, [valor]);

  const gravar = (t: string) => {
    pendente.current = null;
    const v = ler(t);
    if (v !== undefined && formatar(v) !== formatar(valor)) salvar.current(v);
    return v;
  };

  // Ao sair da tela com algo digitado e não salvo: salva.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (pendente.current !== null) gravar(pendente.current);
  }, []);

  return {
    value: texto,
    onFocus: () => { focado.current = true; },
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const t = e.target.value;
      setTexto(t);
      pendente.current = t;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => gravar(t), ESPERA_MS);
    },
    onBlur: () => {
      focado.current = false;
      if (timer.current) clearTimeout(timer.current);
      const v = gravar(texto);
      setTexto(formatar(v === undefined ? valor : v));
    },
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') e.currentTarget.blur(); },
  };
}

// `selecionar` = abre já com o texto selecionado (item recém-criado: é só digitar o nome).
export function CampoTexto({ valor, aoSalvar, obrigatorio = false, selecionar = false, ...resto }: Comuns & {
  valor: string | null; aoSalvar: (v: string | null) => void; obrigatorio?: boolean; selecionar?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const campo = useCampo<string | null>(
    valor,
    (v) => v ?? '',
    (t) => { const limpo = t.trim().replace(/\s+/g, ' '); return limpo ? limpo : obrigatorio ? undefined : null; },
    aoSalvar,
  );
  useEffect(() => { if (selecionar) { ref.current?.focus(); ref.current?.select(); } }, [selecionar]);
  return <input ref={ref} type="text" {...resto} {...campo} />;
}

// Número com vírgula (2,5). `decimal` = aceita casas decimais. Vazio = sem valor (null).
export function CampoNumero({ valor, aoSalvar, min = 0, max, decimal = false, ...resto }: Comuns & {
  valor: number | null; aoSalvar: (v: number | null) => void; min?: number; max: number; decimal?: boolean;
}) {
  const campo = useCampo<number | null>(
    valor,
    (v) => (v === null ? '' : String(v).replace('.', ',')),
    (t) => {
      const limpo = t.trim().replace(',', '.');
      if (!limpo) return null;
      const n = Number(limpo);
      if (!Number.isFinite(n) || n < min || n > max) return undefined;
      return decimal ? Math.round(n * 100) / 100 : Math.round(n);
    },
    aoSalvar,
  );
  return <input type="text" inputMode={decimal ? 'decimal' : 'numeric'} autoComplete="off" {...resto} {...campo} />;
}
