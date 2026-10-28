// Tarefa 8.4: "Fichas" virou "Treinos". Nenhum texto do app (strings e texto de JSX) pode mostrar "ficha".
// Nomes internos ficam como estão (o banco mantém os nomes): tabelas e campos, rotas (#/fichas), chaves do aparelho.
import ts from 'typescript';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

const INTERNOS = /^(fichas|ficha_exercicios|ficha_series|ficha_id|ficha_exercicio_id|nome_ficha|ficha-nova|#\/fichas.*|\/fichas.*)$/;

function textosComFicha(pasta = 'src'): string[] {
  const achados: string[] = [];
  const arquivos = readdirSync(pasta, { recursive: true }).map(String)
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.includes('demo'));
  for (const rel of arquivos) {
    const caminho = join(pasta, rel);
    const fonte = ts.createSourceFile(caminho, readFileSync(caminho, 'utf8'), ts.ScriptTarget.Latest, true);
    const visitar = (n: ts.Node): void => {
      let texto = null;
      if (ts.isJsxText(n)) texto = n.text.trim();
      else if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) texto = n.text;
      else if (ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) texto = n.text;
      const pai = n.parent;
      const ehImport = pai && (ts.isImportDeclaration(pai) || ts.isExportDeclaration(pai));
      if (texto && /ficha/i.test(texto) && !ehImport && !INTERNOS.test(texto.trim())) {
        const { line } = fonte.getLineAndCharacterOfPosition(n.getStart());
        achados.push(`${caminho.split(/[\\/]/).join('/')}:${line + 1}  ${JSON.stringify(texto)}`);
      }
      ts.forEachChild(n, visitar);
    };
    visitar(fonte);
  }
  return achados;
}


it('nenhuma tela mostra a palavra "ficha"', () => {
  expect(textosComFicha()).toEqual([]);
});
