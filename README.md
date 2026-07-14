# skills-claude

Marketplace pessoal de plugins/skills do [Claude Code](https://claude.com/claude-code), mantido por [@enzozon](https://github.com/enzozon).

## Instalação

Dentro do Claude Code:

```
/plugin marketplace add enzozon/skills_claude
/plugin install commit-pt@skills-claude
/plugin install skill-bench@skills-claude
```

## Skills

### commit-pt

Gera mensagens de commit **em português** no formato [Conventional Commits](https://www.conventionalcommits.org/pt-br/).

- Dispara quando você pede "faz o commit", "commita", "salva isso no git"
- Formato: `<tipo>(<escopo>): <resumo>` com até 72 caracteres (tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`)
- Um assunto lógico por commit, `git add` explícito dos arquivos (nunca `git add -A` às cegas) e nunca commita segredos (`.env`, chaves, tokens)

Exemplo de mensagem gerada:

```
feat(skill-bench): adiciona resultados do primeiro benchmark do ponytail
```

### skill-bench

Benchmark A/B do impacto de uma skill/plugin no Claude Code: roda as mesmas tarefas de código **com e sem** o plugin (via `claude -p` headless) e compara qualidade, tokens, custo, tempo e linhas de código.

- Dispara com "benchmark das skills", "compara com e sem ponytail", "quanto essa skill economiza", "roda o skill-bench"
- **Braços:** baseline (plugin desativado) × treatment (plugin ativado), com isolamento — outros plugins que escrevem código ficam desativados durante as rodadas e o estado é restaurado ao final
- **Tarefas:** definidas em `skill-bench/tasks/` (cache, dedup de CSV, retry com backoff), cada uma com um self-check executável (`python main.py`)
- **Métricas por rodada:** tokens de saída, custo (USD), duração, turnos, LOC, self-check pass/fail e nota de um juiz LLM (haiku) usando a rubrica de `skill-bench/judge.md` (correção, simplicidade, legibilidade)
- **Resultado:** medianas por braço, deltas percentuais e JSON completo salvo em `bench-results/`, com dashboard visual opcional
- **Ranking:** qualidade nunca pode piorar; empate de qualidade é desempatado por tokens economizados

## Benchmark: ponytail (rodado com o skill-bench)

Primeiro benchmark real da skill, medindo o plugin [ponytail](https://github.com/DietrichGebert/ponytail) ("dev sênior preguiçoso": a solução mais simples que funciona). 3 tarefas × 2 braços × 2 execuções, modelo `sonnet`, juiz `haiku`. Dados completos em [`bench-results/20260713-190919-ponytail.json`](bench-results/20260713-190919-ponytail.json).

| Métrica (mediana)   | Sem ponytail | Com ponytail | Delta    |
| ------------------- | ------------ | ------------ | -------- |
| Tokens de saída     | 1.026        | 778          | **−24%** |
| Tempo por tarefa    | 14,9 s       | 11,2 s       | **−25%** |
| Linhas de código    | 35,5         | 29,5         | **−17%** |
| Custo total (6 runs)| $0,68        | $0,71        | +4%      |
| Self-checks         | 12/12        | 12/12        | empate   |
| Juiz (corr/simp/leg)| 10 / 9 / 10  | 10 / 9 / 9   | ≈ empate |

**Conclusões:**

- O ponytail entrega código menor e mais rápido **sem perder correção** (12/12 checks nos dois braços).
- A filosofia do plugin é visível no código: na tarefa de cache, o braço com ponytail usou `@lru_cache` da stdlib nas 2 execuções; o baseline escreveu cache manual com dict nas 2.
- O custo ficou **+4%** apesar dos −24% em tokens de saída: o prompt do plugin adiciona ~2.600 tokens de entrada por sessão, o que domina em tarefas pequenas. Em tarefas maiores a economia de saída tende a inverter essa conta — todo plugin instalado cobra esse pedágio de contexto, até os bons.

**Limites:** N=2 por braço é direcional, não conclusivo (use `--runs 3+` para afirmações fortes). A nota 6 de correção na tarefa dedup ocorreu identicamente nos dois braços (artefato da rubrica: o juiz não viu o `dados.csv` gerado à parte) e não distorce a comparação.

## Desenvolvimento

- Validar antes de todo commit: `claude plugin validate .`
- Cada skill vive em sua própria pasta na raiz, com `.claude-plugin/plugin.json` e `SKILL.md`, e precisa de uma entrada em `.claude-plugin/marketplace.json`
