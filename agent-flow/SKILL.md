---
name: agent-flow
description: Use quando o usuário quiser desenvolver algo com times de agentes e visualizar cada time trabalhando como um workflow — "visualiza os times", "mostra os agentes trabalhando", "desenvolve com os times", "workflow dos agentes", "roda o agent-flow". Monta só os times que a tarefa pede (UI/UX, frontend, backend, segurança, revisão de código, testes), executa cada um como subagente e mantém um dashboard visual do progresso durante o desenvolvimento.
---

# agent-flow

Orquestra times de agentes e mostra o progresso de cada time em duas visões ao vivo: o painel de tasks do terminal e um dashboard visual (Artifact) que é atualizado a cada time concluído.

## Times disponíveis

Monte SÓ os times que a tarefa realmente pede:

| Time | Responsabilidade | Quando entra |
| --- | --- | --- |
| UI/UX | wireframe, tokens de design, acessibilidade | interfaces novas |
| Frontend | componentes, páginas, estado | há camada visual |
| Backend | API, dados, regras de negócio | há lógica de servidor |
| Segurança | revisão do código escrito (input, auth, segredos) | sempre que os times de código produzirem algo sensível |
| Revisão de código | bugs e simplificação do diff de cada time | sempre após os times de código |
| Testes | cobertura dos fluxos críticos | funcionalidades com lógica não trivial |

Se agentes especializados estiverem disponíveis na sessão (ex.: `security-reviewer`, `code-reviewer`, `tdd-guide`), use-os para o time correspondente; senão, use `general-purpose` com o papel do time no prompt.

## Passos

1. **Planeje o workflow.** Liste os times necessários e as dependências entre eles (ex.: UI/UX → Frontend; Backend em paralelo com Frontend; Segurança e Revisão só depois que existir código). Mostre esse plano ao usuário em uma tabela curta antes de disparar qualquer agente.
2. **Crie uma task por time** (TaskCreate) — o painel de tasks vira a visão ao vivo no terminal. Marque `in_progress` quando o time começar e `completed` quando terminar (TaskUpdate).
3. **Publique o dashboard inicial** (Artifact): um HTML único na pasta temporária da sessão, com um card por time — ⏳ na fila / 🔷 trabalhando / ✅ concluído — e um diagrama `mermaid` (`flowchart LR`) do fluxo entre os times. Carregue a skill `artifact-design` antes do primeiro HTML. Republique SEMPRE no mesmo caminho de arquivo para manter a mesma URL.
4. **Execute os times** (Agent tool): independentes em paralelo, dependentes em sequência, em background. Cada agente recebe o objetivo do time, os arquivos/pastas sob sua responsabilidade, o CONTRATO exato com os times paralelos (rotas, formatos de request/response, nomes de campo — é o que evita conflito de integração) e a instrução de devolver um resumo curto das entregas. Nunca dois times editando os mesmos arquivos ao mesmo tempo.
5. **A cada time concluído:** atualize a task, edite o card no HTML (status, entregas, duração) e republique o Artifact. Relate no chat em uma linha o que o time entregou.
6. **Correções:** se Segurança/Revisão bloquearem (CRITICAL/HIGH), o orquestrador aplica todas as correções numa passada única — incluindo bugs que outros times reportaram — e roda os testes de novo antes de finalizar. Registre as correções e a revalidação no log do dashboard.
7. **No final:** dashboard completo (todos ✅, com duração e entregas por time) + resumo no chat com o link.

## Regras

- Tarefa pequena (um arquivo, ajuste simples) não justifica times: faça direto e diga por quê em uma linha.
- Os times de Segurança e Revisão rodam DEPOIS dos times de código, sobre o código real — nunca em paralelo com quem está escrevendo. Podem rodar em paralelo com o time de Testes (revisores são somente leitura).
- Cada time reporta bugs fora do seu escopo em vez de corrigi-los — quem consolida e corrige é o orquestrador (passo 6).
- Se um agente cair (limite de sessão, erro de API), verifique o que ele deixou no disco antes de relançar: pasta vazia = relança do zero; parcial = novo agente continua do que existe.
- Cada agente é uma sessão nova com custo próprio: 3 a 5 times é o teto sensato para tarefas médias; avise o usuário antes de passar disso. Use um modelo mais barato (ex.: `model: sonnet`) para os times executores.
- O dashboard mostra o progresso; o resumo final no chat continua obrigatório.
