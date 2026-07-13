---
name: skill-bench
description: Use quando o usuário quiser medir, comparar ou rankear o impacto de skills/plugins do Claude Code — "benchmark das skills", "compara com e sem ponytail", "quanto essa skill economiza", "rankeia as skills", "roda o skill-bench". Roda tarefas de código padronizadas com e sem cada plugin e gera ranking com dashboard visual.
---

# skill-bench

Benchmark A/B de plugins do Claude Code. Para cada plugin alvo, roda as mesmas
tarefas de código em dois braços — **baseline** (plugin desativado) e
**tratamento** (plugin ativado) — via `claude -p` headless, e compara:

- **Qualidade**: nota de um juiz LLM (rubrica em `judge.md`) + self-check da tarefa passou
- **Tokens**: `usage.output_tokens` do JSON de resultado
- **Custo**: `total_cost_usd`
- **Tempo**: `duration_ms` e `num_turns`
- **Volume**: linhas de código geradas (LOC)

## Escopo honesto

Só faz sentido para skills que mudam COMO o código é escrito na sessão
(ex.: ponytail). Skills de memória entre sessões (claude-mem) ou de
conhecimento externo (obsidian-second-brain) não são mensuráveis por este
método — diga isso ao usuário se ele pedir para rankeá-las.

## Passos

1. **Alvos**: plugins nomeados pelo usuário (formato `nome@marketplace`, confira com
   `claude plugin list`). Parâmetros: `--runs N` (padrão 2; avise que ≥3 dá
   confiança estatística), `--model` (padrão `sonnet`), `--tasks <glob>` (padrão todas em `tasks/`).

2. **Custo**: estime runs_totais = tarefas × 2 braços × N × plugins. Informe a
   estimativa (~US$ 0,10–0,30 por run com sonnet) e o total antes de começar.
   Some `total_cost_usd` de cada run; se ultrapassar US$ 5, pare e pergunte.

3. **Isolamento**: anote o estado atual (`claude plugin list`). Durante todo o
   benchmark, desative TODOS os plugins que alteram escrita de código exceto o
   alvo do braço atual (`claude plugin disable <p>`). Baseline = alvo também
   desativado. SEMPRE restaure o estado original ao final, mesmo em erro.

4. **Execução**: para cada tarefa × braço × run, crie um diretório novo em
   `$env:TEMP\skill-bench\<timestamp>\<braço>\<tarefa>\run<i>` (NUNCA dentro de
   `~/.claude` — escrita é bloqueada lá). Rode com cwd nesse diretório:

   ```
   claude -p "<prompt da tarefa>" --model <model> --output-format json \
     --max-turns 10 --allowedTools "Write" "Edit" "Bash(python*)"
   ```

   Salve o JSON completo como `result.json` no diretório do run.

5. **Métricas por run**: do JSON extraia `total_cost_usd`,
   `usage.output_tokens`, `duration_ms`, `num_turns`. Depois: LOC = soma de
   linhas dos arquivos de código criados; execute o comando `## Check` da
   tarefa (exit 0 = passou); julgue com
   `claude -p --model haiku --output-format json` usando `judge.md` + o código
   gerado, extraindo `{correctness, simplicity, readability}`.

6. **Agregação**: mediana por métrica por braço. Delta do plugin =
   tratamento − baseline (em % para tokens/custo/LOC/tempo; absoluto para
   notas). Salve tudo em `bench-results/<timestamp>.json` no repositório do
   marketplace para histórico.

7. **Ranking e visual**: rankeie por (1) delta de qualidade — nota do juiz e
   taxa de check passando nunca podem ter piorado; (2) % de tokens
   economizados; (3) tempo. Mostre a tabela no chat. Para o dashboard, leia a
   skill `dataviz` ANTES de escrever qualquer gráfico e publique um Artifact
   HTML com: barras de delta por métrica por plugin, tabela de runs, e nota
   metodológica (N, modelo, variância).

## Regras

- Nunca use `--dangerously-skip-permissions` nos runs; a lista de
  `--allowedTools` acima é suficiente.
- Run que falhar (timeout, erro de permissão) conta como falha no braço, não
  descarte silenciosamente — reporte.
- Compare apenas braços rodados com o MESMO modelo e as MESMAS tarefas.
- Uma execução por vez ou no máximo 2 em paralelo (runs simultâneos demais
  distorcem duration_ms).
