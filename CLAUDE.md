# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este repositório

Marketplace pessoal de plugins/skills do Claude Code (`skills-claude`), publicado em github.com/enzozon. Estrutura:

- `.claude-plugin/marketplace.json` — manifesto do marketplace; toda skill nova precisa de uma entrada em `plugins[]`
- `commit-pt/` — skill que gera commits em pt-BR no formato Conventional Commits (`plugin.json` + `SKILL.md`)

## Comandos

- Validar marketplace e skills: `claude plugin validate .` (rodar antes de todo commit)
- Validar uma skill isolada: `claude plugin validate ./commit-pt`
- Instalar localmente para teste: `/plugin marketplace add enzozon/skills_claude` e `/plugin install commit-pt@skills-claude`

## Convenções

- Commits seguem a própria skill commit-pt: Conventional Commits com mensagem em português
- Cada skill vive em sua própria pasta na raiz, com `.claude-plugin/plugin.json` e `SKILL.md`
- Idioma preferido do usuário: português (respostas e explicações em pt-BR)
