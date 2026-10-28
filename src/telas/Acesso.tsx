import { useState, type FormEvent } from 'react';
import { marca } from '../config/marca';
import { enderecoDoApp, erroDoLink, mensagemDeErro, supabase } from '../supabase';
import Logo from '../componentes/Logo';
import BotaoTema from '../componentes/BotaoTema';
import FaixaSandbox from '../componentes/FaixaSandbox';

type Modo = 'entrar' | 'criar' | 'esqueci' | 'nova-senha';

// Telas de quem ainda não entrou: Entrar, Criar conta, Esqueci a senha e Nova senha (link do e-mail).
// O tamanho mínimo da senha é conferido pelo Supabase (fonte única), não aqui.
export default function Acesso({ novaSenha = false, aoTrocarSenha }: { novaSenha?: boolean; aoTrocarSenha?: () => void }) {
  const [modo, setModo] = useState<Modo>(novaSenha ? 'nova-senha' : 'entrar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(erroDoLink);
  const [aviso, setAviso] = useState<string | null>(null);

  const ir = (m: Modo) => { setModo(m); setErro(null); setAviso(null); setSenha(''); };

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setEnviando(true);
    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
        if (error) throw error;
      } else if (modo === 'criar') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: { data: { nome: nome.trim() }, emailRedirectTo: enderecoDoApp() },
        });
        if (error) throw error;
        // E-mail já cadastrado: o Supabase não diz (para não revelar quem tem conta) e devolve sem identidades.
        if (data.user && data.user.identities?.length === 0) {
          setAviso('Se esse e-mail ainda não tiver conta, enviamos um link de confirmação. Se já tiver, use Entrar ou Esqueci a senha.');
        } else {
          setAviso(`Enviamos um link de confirmação para ${email.trim()}. Abra o e-mail e toque no link para entrar.`);
        }
        setSenha('');
      } else if (modo === 'esqueci') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: enderecoDoApp() });
        if (error) throw error;
        setAviso(`Se existir uma conta com ${email.trim()}, enviamos um link para criar uma nova senha.`);
      } else {
        const { error } = await supabase.auth.updateUser({ password: senha });
        if (error) throw error;
        history.replaceState(null, '', enderecoDoApp());
        aoTrocarSenha?.();
      }
    } catch (err) {
      setErro(mensagemDeErro(err as Error));
    } finally {
      setEnviando(false);
    }
  }

  const titulos: Record<Modo, string> = {
    entrar: 'Entrar',
    criar: 'Criar conta',
    esqueci: 'Esqueci a senha',
    'nova-senha': 'Nova senha',
  };
  const botoes: Record<Modo, string> = {
    entrar: 'Entrar',
    criar: 'Criar conta',
    esqueci: 'Enviar link',
    'nova-senha': 'Salvar nova senha',
  };

  return (
    <div className="acesso">
      <FaixaSandbox />
      <div className="acesso-topo"><BotaoTema /></div>
      <div className="acesso-marca">
        <Logo tamanho={72} />
        <p className="acesso-nome">{marca.nome}</p>
      </div>

      <form className="cartao formulario" onSubmit={enviar}>
        <h1>{titulos[modo]}</h1>
        {modo === 'esqueci' && <p className="fraco">Digite seu e-mail. Vamos mandar um link para você criar uma nova senha.</p>}

        {modo === 'criar' && (
          <label>Seu nome
            <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="given-name" required maxLength={60} />
          </label>
        )}
        {modo !== 'nova-senha' && (
          <label>E-mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="email" inputMode="email" autoCapitalize="none" required />
          </label>
        )}
        {modo !== 'esqueci' && (
          <label>{modo === 'nova-senha' ? 'Nova senha' : 'Senha'}
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} />
            {modo !== 'entrar' && <span className="dica">Pelo menos 8 caracteres.</span>}
          </label>
        )}

        {erro && <p className="mensagem erro" role="alert">{erro}</p>}
        {aviso && <p className="mensagem ok" role="status">{aviso}</p>}

        <button className="botao-primario" type="submit" disabled={enviando}>
          {enviando ? 'Aguarde…' : botoes[modo]}
        </button>

        <div className="links">
          {modo === 'entrar' && <>
            <button type="button" className="link" onClick={() => ir('criar')}>Criar conta</button>
            <button type="button" className="link" onClick={() => ir('esqueci')}>Esqueci a senha</button>
          </>}
          {(modo === 'criar' || modo === 'esqueci') && (
            <button type="button" className="link" onClick={() => ir('entrar')}>Já tenho conta: entrar</button>
          )}
        </div>
      </form>
    </div>
  );
}
