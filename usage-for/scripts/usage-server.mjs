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
  const eventos = []; // todos os períodos — a janela de 5h precisa do histórico completo
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
      const chave = (e.requestId || '') + (e.message.id || e.uuid);
      if (vistos.has(chave)) continue; // várias linhas por resposta repetem o mesmo usage
      vistos.add(chave);
      const modelo = e.message.model || 'desconhecido';
      eventos.push({
        t: Date.parse(e.timestamp),
        modelo,
        out: u.output_tokens || 0,
        // "efetivos" = o que a API processa de novo (cache lido fica de fora, quase não pesa)
        ef: (u.input_tokens || 0) + (u.output_tokens || 0) + (u.cache_creation_input_tokens || 0),
      });
      if (desdeMs && Date.parse(e.timestamp) < desdeMs) continue;
      respostas++;
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
  return { porModelo, porFinalidade, porProjeto, geral, compactacoes, respostas, eventos };
}

const H5 = 5 * 3_600_000;

// Janelas de 5h como a Anthropic conta: abrem na hora cheia da primeira mensagem
// e duram 5h; mensagem após o fim abre janela nova. Mesmo algoritmo do ccusage.
function janelas5h(eventos) {
  const ordenados = [...eventos].sort((a, b) => a.t - b.t);
  const blocos = [];
  let atual = null;
  for (const ev of ordenados) {
    if (!atual || ev.t >= atual.fim) {
      const inicio = new Date(ev.t).setMinutes(0, 0, 0);
      atual = { inicio, fim: inicio + H5, ef: 0, out: 0, respostas: 0, porModelo: {} };
      blocos.push(atual);
    }
    atual.ef += ev.ef;
    atual.out += ev.out;
    atual.respostas++;
    if (!atual.porModelo[ev.modelo]) atual.porModelo[ev.modelo] = { ef: 0, out: 0 };
    atual.porModelo[ev.modelo].ef += ev.ef;
    atual.porModelo[ev.modelo].out += ev.out;
  }
  const agora = Date.now();
  const vigente = blocos.length && agora < blocos.at(-1).fim ? blocos.at(-1) : null;
  const recordeEf = Math.max(1, ...blocos.map((b) => b.ef));
  const seteDias = eventos.filter((ev) => ev.t >= agora - 7 * 24 * 3_600_000);
  return {
    vigente,
    recordeEf,
    totalJanelas: blocos.length,
    semanaEf: seteDias.reduce((s, ev) => s + ev.ef, 0),
    semanaOut: seteDias.reduce((s, ev) => s + ev.out, 0),
  };
}

const fmt = (n) => n.toLocaleString('pt-BR');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function tabela(titulo, mapa) {
  const linhas = Object.entries(mapa).filter(([, a]) => totalDe(a) > 0)
    .sort((a, b) => totalDe(b[1]) - totalDe(a[1]));
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

  const j = janelas5h(d.eventos);
  const hora = (ms) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  let usoAtual;
  if (j.vigente) {
    const pct = Math.min(100, Math.round((j.vigente.ef / j.recordeEf) * 100));
    const modelos = Object.entries(j.vigente.porModelo).sort((a, b) => b[1].ef - a[1].ef)
      .map(([m, v]) => `<tr><td class="nome">${esc(m)}</td><td class="num">${fmt(v.out)}</td><td class="num total">${fmt(v.ef)}</td></tr>`).join('');
    usoAtual = `
<div class="tiles">
${tile('Sessão vigente (5h)', `${fmt(j.vigente.ef)} tokens`)}
${tile('Da sessão recorde', `${pct}%`)}
${tile('Janela termina às', hora(j.vigente.fim))}
${tile('Respostas na sessão', fmt(j.vigente.respostas))}
</div>
<div class="medidor"><div style="width:${pct}%"></div></div>
<div class="rolagem"><table>
<thead><tr><th>Modelo nesta sessão</th><th>Saída</th><th>Tokens efetivos</th></tr></thead>
<tbody>${modelos}</tbody></table></div>`;
  } else {
    usoAtual = `<p class="meta">Nenhuma sessão de 5h ativa agora — a próxima mensagem ao Claude abre uma nova janela.</p>`;
  }
  usoAtual += `
<div class="tiles" style="margin-top:12px">
${tile('Últimos 7 dias (efetivos)', fmt(j.semanaEf))}
${tile('Últimos 7 dias (saída)', fmt(j.semanaOut))}
${tile('Janelas de 5h no histórico', fmt(j.totalJanelas))}
</div>
<p class="meta">Estimativa local pelas janelas de 5h reconstruídas do histórico ("efetivos" exclui cache lido).
O percentual oficial do plano só existe no <b>/usage</b> do Claude Code.</p>`;

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
.medidor{height:10px;border-radius:5px;background:var(--borda);margin:4px 0 12px;overflow:hidden}
.medidor div{height:100%;border-radius:5px;background:var(--acento)}
footer{margin-top:24px;color:var(--tinta2);font-size:13px}
</style></head><body>
<header><h1>Uso de tokens — Claude Code</h1>
<div class="filtros">${aba('hoje', 'Hoje')}${aba('7d', '7 dias')}${aba('tudo', 'Tudo')}</div>
<button onclick="location.reload()">&#8635; Atualizar</button></header>
<p class="meta">${d.respostas.toLocaleString('pt-BR')} respostas · ${d.compactacoes} compactações no histórico · lido em ${duracao}s · ${new Date().toLocaleTimeString('pt-BR')}</p>
<h2>Uso atual</h2>
${usoAtual}
<h2>Período selecionado</h2>
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

if (process.argv.includes('--cli')) {
  const d = coletar(0);
  const j = janelas5h(d.eventos);
  const hora = (ms) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const linha = (nome, a) => `  ${nome.padEnd(38).slice(0, 38)} saída ${fmt(a.output).padStart(12)}  total ${fmt(totalDe(a)).padStart(14)}`;
  const top = (mapa, n) => Object.entries(mapa).filter(([, a]) => totalDe(a) > 0)
    .sort((a, b) => totalDe(b[1]) - totalDe(a[1])).slice(0, n);

  console.log('═══ USO ATUAL ═══');
  if (j.vigente) {
    const pct = Math.min(100, Math.round((j.vigente.ef / j.recordeEf) * 100));
    const barra = '█'.repeat(Math.round(pct / 5)).padEnd(20, '░');
    console.log(`Sessão vigente (5h): ${fmt(j.vigente.ef)} tokens efetivos · termina às ${hora(j.vigente.fim)}`);
    console.log(`[${barra}] ${pct}% da sua sessão recorde`);
    for (const [m, v] of Object.entries(j.vigente.porModelo).sort((a, b) => b[1].ef - a[1].ef))
      console.log(`  ${m.padEnd(38)} saída ${fmt(v.out).padStart(12)}  efetivos ${fmt(v.ef).padStart(11)}`);
  } else {
    console.log('Nenhuma sessão de 5h ativa agora.');
  }
  console.log(`Últimos 7 dias: ${fmt(j.semanaEf)} efetivos · ${fmt(j.semanaOut)} de saída · ${d.compactacoes} compactações no histórico`);
  console.log('\n═══ POR MODELO (tudo) ═══');
  for (const [m, a] of top(d.porModelo, 10)) console.log(linha(m, a));
  console.log('\n═══ POR FINALIDADE (top 8) ═══');
  for (const [f, a] of top(d.porFinalidade, 8)) console.log(linha(f, a));
  console.log('\n═══ POR PROJETO (top 8) ═══');
  for (const [p, a] of top(d.porProjeto, 8)) console.log(linha(p, a));
  console.log('\nEstimativa local (janelas de 5h reconstruídas; "efetivos" exclui cache lido).');
  console.log('Percentual oficial do plano: /usage · Painel visual: /usage-for no navegador.');
  process.exit(0);
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
