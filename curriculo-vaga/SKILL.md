---
name: curriculo-vaga
description: Use quando o usuário colar o link ou o texto de uma vaga de emprego, ou disser "adapta meu currículo para essa vaga", "vou me candidatar nessa", "monta o currículo pra essa vaga". Lê a vaga, pesquisa a empresa, cruza com o currículo base e o GitHub do usuário e gera um currículo sob medida para aquela vaga.
---

# curriculo-vaga

Gera um currículo adaptado a uma vaga específica, usando **apenas fatos verificáveis**
do currículo base e dos repositórios públicos do usuário.

## Configuração

Leia `curriculo/perfil.md` no diretório de trabalho. Ele aponta os caminhos:

```markdown
- **Currículo base:** caminho para o .md/.pdf/.docx com o histórico completo
- **GitHub:** username
- **LinkedIn:** URL (+ caminho do export em PDF, se houver)
- **Pasta de saída:** vagas/
```

Se o arquivo não existir, pergunte ao usuário o caminho do currículo e o username do
GitHub, e crie o `perfil.md` antes de seguir — assim as próximas execuções não perguntam
de novo.

## Passos

### 1. Extrair a vaga

O argumento é uma URL ou o texto colado da vaga. Se for URL, use WebFetch pedindo:
cargo, empresa, senioridade, requisitos obrigatórios, requisitos desejáveis, stack
técnica, modelo de trabalho e **palavras-chave repetidas** (é o que o ATS escaneia).

> **LinkedIn e alguns ATS bloqueiam leitura automática** (HTTP 999 / login wall). Se o
> WebFetch falhar, peça ao usuário para colar o texto da vaga. Não invente o conteúdo
> da vaga a partir do título.

### 2. Pesquisar a empresa

WebSearch por porte, setor, produto, cultura e stack conhecida
(`"<empresa> tech stack"`, `"<empresa> glassdoor"`). Serve para acertar o vocabulário
e o tom — não é enfeite.

### 3. Ler o currículo base

Read no arquivo apontado pelo `perfil.md`. Extraia experiências, formação, projetos,
habilidades e idiomas **como estão**.

### 4. Puxar evidência técnica do GitHub

```
https://api.github.com/users/<username>/repos?sort=updated&per_page=100
```

Use descrições, linguagens e — quando a vaga for técnica — o README dos repositórios
mais relevantes, de onde saem **métricas reais** (acurácia, volume de dados, cobertura
de testes). Métrica concreta vale mais que qualquer adjetivo.

### 5. Cruzar vaga × perfil

Monte a tabela requisito → evidência (currículo ou repositório). Anote também os
**gaps reais** — servem para o usuário se preparar para a entrevista, não para esconder.

### 6. Gerar o currículo

Salve em `vagas/<empresa-slug>-<cargo-slug>/curriculo.md`:

- Resumo profissional reescrito mirando a vaga, com as palavras-chave reais dela
- Projetos reordenados: os mais relevantes para a vaga primeiro
- Habilidades agrupadas priorizando o que a vaga pede
- Formatação simples, coluna única, sem foto nem tabela complexa (compatível com ATS)

**Regra inegociável — zero invenção.** Só use fatos presentes no currículo base ou nos
repositórios públicos. Pode reformular, priorizar e reordenar; nunca criar experiência,
tempo, métrica ou tecnologia não utilizada. Se o currículo alega uma tecnologia que o
repositório não contém (ex.: "Docker" num projeto sem Dockerfile), **corrija** — o
recrutador clica no link.

### 7. Anotar as decisões

Em `notas.md` ao lado do currículo: o que foi priorizado e por quê (2-3 linhas) e os
gaps frente à vaga, com o que estudar ou como abordar na entrevista.

### 8. (Opcional) Exportar em PDF

Se o usuário quiser PDF, gere um HTML de uma página e converta com o Chrome headless,
que já está instalado em qualquer máquina com o navegador:

```bash
chrome --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="curriculo.pdf" "file:///caminho/curriculo.html"
```

Use `<a href>` nos links de LinkedIn/GitHub/repositórios — o Chrome preserva como
links clicáveis no PDF. Verifique depois que o resultado ficou em **1 página**.

## Saída

Informe o caminho do arquivo gerado e resuma em 3-4 linhas o principal ajuste feito.
Não repita o currículo inteiro no chat.
