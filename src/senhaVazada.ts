// Confere se a senha já apareceu em vazamentos de dados (base pública Pwned Passwords), ao criar conta e ao
// trocar a senha (tarefa 8.3). Substitui o recurso do Supabase, que é do plano Pro.
// k-anonimato: só os 5 primeiros caracteres do SHA-1 saem do aparelho; a comparação do resto é feita aqui.
// "Add-Padding" faz a resposta ter sempre um tamanho parecido (linhas falsas com contagem 0).
// Sem internet ou com a base fora do ar devolve null: não trava o cadastro (o Supabase ainda exige 8 caracteres).

export const MENSAGEM_SENHA_VAZADA = 'Essa senha já apareceu em vazamentos de dados na internet. Escolha outra.';

export async function sha1Hex(texto: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(texto));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export async function senhaVazada(senha: string, buscar: typeof fetch = fetch): Promise<boolean | null> {
  try {
    const hash = await sha1Hex(senha);
    const resposta = await buscar(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, {
      headers: { 'Add-Padding': 'true' },
    });
    if (!resposta.ok) return null;
    const resto = hash.slice(5);
    for (const linha of (await resposta.text()).split('\n')) {
      const [sufixo, vezes] = linha.trim().split(':');
      if (sufixo === resto) return Number(vezes) > 0;
    }
    return false;
  } catch {
    return null;
  }
}
