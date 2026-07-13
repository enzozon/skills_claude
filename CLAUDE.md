# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado atual

Este diretório é um workspace recém-criado e ainda não contém código. Não é um repositório git.

A julgar pelo nome (`skills_claude`), o propósito é experimentar e desenvolver skills/plugins para o Claude Code. Plugins instalados pelo usuário (ponytail, claude-mem, obsidian-second-brain) ficam no escopo de usuário (`~/.claude`), não neste diretório.

## Quando houver código

Este arquivo foi gerado com o diretório vazio. Assim que o projeto tiver estrutura real (código, build, testes), rode `/init` novamente para substituí-lo por documentação de verdade — não mantenha este placeholder.

## Notas úteis

- Para criar uma skill local: `claude plugin init <nome>` cria o esqueleto em `~/.claude/skills/<nome>/` e ela carrega automaticamente na próxima sessão.
- Para validar um plugin/marketplace deste diretório: `claude plugin validate <caminho>`.
- Idioma preferido do usuário: português (respostas e explicações em pt-BR).
