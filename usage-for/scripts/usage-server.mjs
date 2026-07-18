// Painel local de uso de tokens do Claude Code.
// Lê ~/.claude/projects/**/*.jsonl (sem rede, sem credenciais) e serve em http://127.0.0.1:4127
import { createServer } from 'node:http';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const ROOT = join(homedir(), '.claude', 'projects');
const PORT = 4127;

function novoAcc() {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
}
function soma(acc, u) {
  acc.input += u.input_tokens || 0;
  acc.output += u.output_tokens || 0;
  acc.cacheRead += u.cache_read_input_tokens || 0;
  acc.cacheWrite += u.cache_creation_input_tokens || 0;
}
function totalDe(acc) {
  return acc.input + acc.output + acc.cacheRead + acc.cacheWrite;
}

// ponytail: releitura completa a cada request (~200MB, poucos segundos); indexar incremental se ficar lento
function coletar(desdeMs) {
  const porModelo = {}, porFinalidade = {}, porProjeto = {}, geral = novoAcc();
  const vistos = new Set();
  let compactacoes = 0, respostas = 0;

  const processa = (arquivo, projeto, finalidadeFixa) => {
    let texto;
    try { texto = readFileSync(arquivo, 'utf8'); } catch { return; }
    for (const linha of texto.split('\n')) {
      if (linha.includes('"compact_boundary"')) compactacoes++;
      if (!linha.includes('"usage"')) continue;
      let e;
      try { e = JSON.parse(linha); } catch { continue; }
      const u = e?.message?.usage;
      if (e.type !== 'assistant' || !u) continue;
      if (desdeMs && Date.parse(e.timestamp) < desdeMs) continue;
      const chave = (e.requestId || '') + (e.message.id || e.uuid);
      if (vistos.has(chave)) continue; // várias linhas por resposta repetem o mesmo usage
      vistos.add(chave);
      respostas++;
      const modelo = e.message.model || 'desconhecido';
      const finalidade = finalidadeFixa || (e.isCompactSummary ? 'Compactação de contexto' : 'Chat principal');
      for (const [mapa, k] of [[porModelo, modelo], [porFinalidade, finalidade], [porProjeto, projeto]]) {
        if (!mapa[k]) mapa[k] = novoAcc();
        soma(mapa[k], u);
      }
      soma(geral, u);
    }
  };

  for (const proj of readdirSync(ROOT)) {
    const dirProj = join(ROOT, proj);
    let itens;
    try { itens = readdirSync(dirProj); } catch { continue; }
    for (const item of itens) {
      const caminho = join(dirProj, item);
      if (item.endsWith('.jsonl')) {
        processa(caminho, proj, null);
      } else if (statSync(caminho).isDirectory()) {
        const dirAgentes = join(caminho, 'subagents');
        if (!existsSync(dirAgentes)) continue;
        for (const arq of readdirSync(dirAgentes)) {
          if (!arq.endsWith('.jsonl')) continue;
          let rotulo = 'Subagente';
          const meta = join(dirAgentes, arq.replace('.jsonl', '.meta.json'));
          try {
            const m = JSON.parse(readFileSync(meta, 'utf8'));
            rotulo = `Agente: ${m.description || m.agentType}`;
          } catch { /* sem meta, fica o rótulo genérico */ }
          processa(join(dirAgentes, arq), proj, rotulo);
        }
      }
    }
  }
  return { porModelo, porFinalidade, porProjeto, geral, compactacoes, respostas };
}

const fmt = (n) => n.toLocaleString('pt-BR');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function tabela(titulo, mapa) {
  const linhas = Object.entries(mapa).sort((a, b) => totalDe(b[1]) - totalDe(a[1]));
  const maior = linhas.length ? totalDe(linhas[0][1]) : 1;
  const tr = linhas.map(([nome, a]) => {
    const t = totalDe(a);
    return `<tr><td class="nome">${esc(nome)}</td>
      <td class="num">${fmt(a.output)}</td><td class="num">${fmt(a.input)}</td>
      <td class="num">${fmt(a.cacheRead)}</td><td class="num">${fmt(a.cacheWrite)}</td>
      <td class="num total">${fmt(t)}</td>
      <td class="barra"><div style="width:${Math.max(2, (t / maior) * 100)}%"></div></td></tr>`;
  }).join('');
  return `<section><h2>${titulo}</h2><div class="rolagem"><table>
    <thead><tr><th></th><th>Saída</th><th>Entrada</th><th>Cache lido</th><th>Cache gravado</th><th>Total</th><th></th></tr></thead>
    <tbody>${tr}</tbody></table></div></section>`;
}

function pagina(periodo) {
  const DIA = 86_400_000;
  const desdeMs = periodo === 'hoje' ? new Date().setHours(0, 0, 0, 0)
    : periodo === '7d' ? Date.now() - 7 * DIA : 0;
  const inicio = Date.now();
  const d = coletar(desdeMs);
  const duracao = ((Date.now() - inicio) / 1000).toFixed(1);
  const aba = (id, rotulo) =>
    `<a href="/?p=${id}" class="${periodo === id ? 'ativa' : ''}">${rotulo}</a>`;
  const tile = (rotulo, valor) =>
    `<div class="tile"><div class="valor">${valor}</div><div class="rotulo">${rotulo}</div></div>`;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Uso de tokens — Claude Code</title>
<style>
:root{--fundo:#f7f7f8;--cartao:#fff;--tinta:#1a1a2e;--tinta2:#6b7280;--borda:#e5e7eb;--acento:#4f6bd8}
@media (prefers-color-scheme:dark){:root{--fundo:#16161d;--cartao:#1f1f29;--tinta:#e8e8ef;--tinta2:#9ca3af;--borda:#33333f;--acento:#7d95e8}}
*{box-sizing:border-box;margin:0}
body{font:15px/1.5 system-ui,sans-serif;background:var(--fundo);color:var(--tinta);padding:24px;max-width:1000px;margin:auto}
header{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:8px}
h1{font-size:20px}h2{font-size:15px;margin:24px 0 8px;color:var(--tinta2);font-weight:600}
.filtros{display:flex;gap:4px}
.filtros a{padding:6px 14px;border-radius:8px;color:var(--tinta2);text-decoration:none;border:1px solid var(--borda)}
.filtros a.ativa{background:var(--acento);color:#fff;border-color:var(--acento)}
button{padding:6px 14px;border-radius:8px;border:1px solid var(--borda);background:var(--cartao);color:var(--tinta);cursor:pointer;font:inherit}
.meta{color:var(--tinta2);font-size:13px;margin-bottom:16px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.tile{background:var(--cartao);border:1px solid var(--borda);border-radius:12px;padding:14px}
.tile .valor{font-size:22px;font-weight:700;font-variant-numeric:tabular-nums}
.tile .rotulo{font-size:13px;color:var(--tinta2)}
.rolagem{overflow-x:auto;background:var(--cartao);border:1px solid var(--borda);border-radius:12px}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}
th,td{padding:8px 12px;text-align:right;border-top:1px solid var(--borda);white-space:nowrap}
thead th{border-top:none;color:var(--tinta2);font-size:12px;font-weight:600}
td.nome,th:first-child{text-align:left;max-width:320px;overflow:hidden;text-overflow:ellipsis}
td.total{font-weight:700}
td.barra{width:120px}td.barra div{height:8px;border-radius:4px;background:var(--acento);min-width:2px}
footer{margin-top:24px;color:var(--tinta2);font-size:13px}
</style></head><body>
<header><h1>Uso de tokens — Claude Code</h1>
<div class="filtros">${aba('hoje', 'Hoje')}${aba('7d', '7 dias')}${aba('tudo', 'Tudo')}</div>
<button onclick="location.reload()">&#8635; Atualizar</button></header>
<p class="meta">${d.respostas.toLocaleString('pt-BR')} respostas · ${d.compactacoes} compactações no histórico · lido em ${duracao}s · ${new Date().toLocaleTimeString('pt-BR')}</p>
<div class="tiles">
${tile('Total de tokens', fmt(totalDe(d.geral)))}
${tile('Saída (gerados)', fmt(d.geral.output))}
${tile('Entrada (novos)', fmt(d.geral.input))}
${tile('Cache lido', fmt(d.geral.cacheRead))}
${tile('Cache gravado', fmt(d.geral.cacheWrite))}
</div>
${tabela('Por modelo', d.porModelo)}
${tabela('Por finalidade', d.porFinalidade)}
${tabela('Por projeto', d.porProjeto)}
<footer>Contagem local, lida dos transcripts em ~/.claude/projects. Os limites oficiais do seu plano (sessão/semana)
ficam no comando <b>/usage</b> dentro do Claude Code — esta página mostra <i>para onde</i> os tokens foram,
o que o /usage e o Claude Desktop não mostram. Cache lido é barato; Saída é o que mais pesa no limite.</footer>
</body></html>`;
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname !== '/') { res.writeHead(404); return res.end(); }
  const p = ['hoje', '7d', 'tudo'].includes(url.searchParams.get('p')) ? url.searchParams.get('p') : 'hoje';
  try {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(pagina(p));
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Erro ao ler transcripts: ' + err.message);
  }
}).listen(PORT, '127.0.0.1', () =>
  console.log(`Painel de uso: http://127.0.0.1:${PORT}`));
