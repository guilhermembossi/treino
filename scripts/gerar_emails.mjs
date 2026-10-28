// Gera os modelos de e-mail do login (Supabase → Authentication → Emails) em português, com o nome do marca.ts.
// Rodar: node scripts/gerar_emails.mjs → supabase/emails/. O Guilherme cola assunto e corpo no painel (tarefa 8.3).
// Variável do Supabase: {{ .ConfirmationURL }} (link). Sem {{ .Data.nome }} de propósito: o nome é digitado por quem
// se cadastra, e o cadastro manda e-mail para qualquer endereço; com o nome, daria para pôr texto/link num e-mail do app.
import { mkdirSync, writeFileSync } from 'node:fs';
import { marca } from '../src/config/marca.ts';

const pasta = new URL('../supabase/emails/', import.meta.url);
mkdirSync(pasta, { recursive: true });

const corpo = (titulo, texto, botao, rodape) => `<h2>${titulo}</h2>
<p>Olá!</p>
<p>${texto}</p>
<p><a href="{{ .ConfirmationURL }}">${botao}</a></p>
<p>${rodape}</p>
<p>— ${marca.nome}</p>
`;

const modelos = {
  'confirmar-cadastro': {
    painel: 'Confirm sign up',
    assunto: `Confirme seu cadastro no ${marca.nome}`,
    corpo: corpo('Confirme seu cadastro', `Para começar a usar o ${marca.nome}, confirme seu e-mail tocando no link abaixo.`,
      'Confirmar meu e-mail', 'Se você não criou essa conta, é só ignorar este e-mail.'),
  },
  'nova-senha': {
    painel: 'Reset password',
    assunto: `Crie uma nova senha no ${marca.nome}`,
    corpo: corpo('Nova senha', 'Recebemos um pedido para criar uma nova senha. Toque no link abaixo para escolher a nova senha.',
      'Criar nova senha', 'Se não foi você, é só ignorar este e-mail: sua senha continua a mesma.'),
  },
};

for (const [nome, m] of Object.entries(modelos)) {
  writeFileSync(new URL(`${nome}.html`, pasta), `<!-- Painel: ${m.painel}. Assunto: ${m.assunto} -->\n${m.corpo}`);
  console.log(`ok ${nome}.html (${m.painel}) · assunto: ${m.assunto}`);
}
