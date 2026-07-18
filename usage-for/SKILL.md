---
name: usage-for
description: Use quando o usuário pedir para ver o uso de tokens/créditos, "quanto gastei", "abre o painel de uso", "usage", "para onde foram meus tokens", ou invocar /usage-for. Abre um painel local no navegador com o uso de tokens por modelo, finalidade (chat, subagentes, compactação) e projeto, com botão de atualizar.
---

# usage-for

Mostra o uso de tokens do Claude Code lido dos transcripts em `~/.claude/projects`:
relatório direto no terminal (como o `/usage`, porém com mais informação) e, se o usuário
quiser, um painel local no navegador (http://127.0.0.1:4127). Sem rede, sem credenciais.

## Passos

1. Rode o modo terminal e mostre a saída completa ao usuário:
   `node <raiz-da-skill>/scripts/usage-server.mjs --cli`
   Ele imprime: sessão vigente de 5h (tokens efetivos, % da sessão recorde, horário em que a
   janela termina, quebra por modelo), últimos 7 dias, e os rankings por modelo, finalidade
   e projeto.
2. Se o usuário pedir o painel visual ("abre no navegador", "painel", "janela"):
   verifique `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4127`; se não for `200`,
   inicie o servidor como processo independente da sessão (tarefas de fundo do Claude Code
   são encerradas ao fim do turno e derrubariam o painel):
   - Windows (PowerShell): `Start-Process node -ArgumentList '"<raiz-da-skill>\scripts\usage-server.mjs"' -WindowStyle Hidden`
   - macOS/Linux: `nohup node <raiz-da-skill>/scripts/usage-server.mjs >/dev/null 2>&1 &`
   Depois abra: `start http://127.0.0.1:4127` (Windows) ou `open`/`xdg-open`.
3. Lembre em uma linha: o percentual oficial do plano vem do `/usage` nativo; esta skill
   mostra a sessão de 5h reconstruída localmente e o destino de cada token, que o `/usage`
   não mostra.

## O que mostra (terminal e painel)

- Uso atual: sessão vigente de 5h (mesma janela que o plano usa), % da sessão recorde,
  horário do fim da janela, quebra por modelo, e totais dos últimos 7 dias
- Filtros de período no painel: Hoje / 7 dias / Tudo — e botão Atualizar
- Totais: saída (gerados), entrada, cache lido, cache gravado
- Por modelo (ex.: claude-fable-5, claude-haiku-4-5)
- Por finalidade: chat principal, compactação de contexto, cada subagente com sua descrição
  (ex.: "Agente: Time Backend")
- Por projeto (pasta de trabalho)

## Limitações conhecidas

- O percentual oficial do limite do plano vem de endpoint autenticado — não mexemos em
  credenciais; use o `/usage` nativo para isso. A sessão de 5h daqui é estimativa local.
- A contagem cobre o Claude Code local; conversas do Claude Desktop/web não aparecem.
