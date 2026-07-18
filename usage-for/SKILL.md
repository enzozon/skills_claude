---
name: usage-for
description: Use quando o usuário pedir para ver o uso de tokens/créditos, "quanto gastei", "abre o painel de uso", "usage", "para onde foram meus tokens", ou invocar /usage-for. Abre um painel local no navegador com o uso de tokens por modelo, finalidade (chat, subagentes, compactação) e projeto, com botão de atualizar.
---

# usage-for

Abre um painel local (http://127.0.0.1:4127) com o uso de tokens do Claude Code, lido dos
transcripts em `~/.claude/projects`. Sem rede, sem credenciais — só leitura local.

## Passos

1. Verifique se o servidor já está de pé: `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4127`.
   Se responder `200`, pule para o passo 3.
2. Inicie o servidor em background (o script fica em `scripts/usage-server.mjs` dentro da
   pasta desta skill — use o caminho absoluto da raiz do plugin):
   `node <raiz-da-skill>/scripts/usage-server.mjs`
3. Abra no navegador padrão: `start http://127.0.0.1:4127` (Windows) ou `open`/`xdg-open` em outros sistemas.
4. Diga ao usuário em uma linha o que o painel mostra e lembre que os limites oficiais do
   plano (percentual da sessão/semana, igual à janela do Claude Desktop) ficam no comando
   nativo `/usage` — este painel mostra o destino dos tokens, que o `/usage` não mostra.

## O que o painel mostra

- Filtros de período: Hoje / 7 dias / Tudo — e botão Atualizar (relê os transcripts)
- Totais: saída (gerados), entrada, cache lido, cache gravado
- Por modelo (ex.: claude-fable-5, claude-haiku-4-5)
- Por finalidade: chat principal, compactação de contexto, cada subagente com sua descrição
  (ex.: "Agente: Time Backend")
- Por projeto (pasta de trabalho)

## Limitações conhecidas

- Não mostra o percentual oficial do limite do plano — isso é o `/usage` nativo.
- A contagem cobre o Claude Code local; conversas do Claude Desktop/web não aparecem.
