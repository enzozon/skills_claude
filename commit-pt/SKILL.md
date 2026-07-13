---
name: commit-pt
description: Use quando o usuário pedir para commitar, criar um commit, escrever mensagem de commit, ou disser "salva isso no git", "faz o commit", "commita". Gera mensagens de commit em português seguindo Conventional Commits.
---

# commit-pt

Gera commits com mensagens em português (pt-BR) no formato Conventional Commits.

## Passos

1. Rode `git status` e `git diff` (staged e unstaged) para entender o que mudou.
2. Se nada estiver em stage, adicione apenas os arquivos relacionados à mudança pedida — nunca `git add -A` cego.
3. Escreva a mensagem no formato:

   ```
   <tipo>(<escopo opcional>): <resumo no imperativo, minúsculo, sem ponto final>

   <corpo opcional: o PORQUÊ da mudança, não o quê>
   ```

4. Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`.
5. O resumo deve ter no máximo 72 caracteres e ficar em português.
6. Mostre a mensagem ao usuário antes de commitar se a mudança for grande ou ambígua; caso contrário, commite direto.

## Exemplos

- `feat(auth): adiciona login com Google`
- `fix(api): corrige timeout em requisições longas`
- `docs: atualiza instruções de instalação no README`

## Regras

- Um commit por assunto lógico — se o diff mistura duas coisas não relacionadas, sugira dividir em dois commits.
- Nunca commite arquivos de segredo (`.env`, chaves, tokens) — avise o usuário se estiverem no diff.
