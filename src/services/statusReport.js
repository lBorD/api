import { readFileSync } from 'fs';

const UNKNOWN_VERSION = 'desconhecida';

const readPackageVersion = () => {
  try {
    const raw = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
    return JSON.parse(raw).version || UNKNOWN_VERSION;
  } catch {
    return UNKNOWN_VERSION;
  }
};

const packageVersion = readPackageVersion();

export const formatUptime = (totalSeconds = 0) => {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }

  return `${minutes}min`;
};

// O Render expoe o commit do deploy em RENDER_GIT_COMMIT. E o unico jeito de
// saber de fora qual codigo esta no ar - sem isso, conferir um deploy depende de
// perguntar para quem tem acesso ao painel.
const readCommit = (env) => {
  const commit = env.RENDER_GIT_COMMIT || env.GIT_COMMIT || null;
  return commit ? String(commit).slice(0, 7) : null;
};

export const checkDatabase = async (sequelize) => {
  const startedAt = Date.now();

  try {
    await sequelize.authenticate();
    return { status: 'ok', responseMs: Date.now() - startedAt };
  } catch (error) {
    // O erro do Sequelize costuma trazer host, porta e usuario. Como a rota e
    // publica e sem autenticacao, ele fica no log do servidor e nunca na
    // resposta.
    console.error('Falha ao verificar o banco em /status:', error);
    return { status: 'erro', responseMs: Date.now() - startedAt };
  }
};

export const buildStatus = async (sequelize, { env = process.env, uptimeSeconds = process.uptime() } = {}) => {
  const database = await checkDatabase(sequelize);
  const now = new Date();

  return {
    status: database.status === 'ok' ? 'ok' : 'degradado',
    service: 'beautyapp-api',
    version: packageVersion,
    commit: readCommit(env),
    environment: env.NODE_ENV || 'development',
    node: process.version,
    uptime: formatUptime(uptimeSeconds),
    uptimeSeconds: Math.floor(uptimeSeconds),
    startedAt: new Date(now.getTime() - Math.floor(uptimeSeconds) * 1000).toISOString(),
    checkedAt: now.toISOString(),
    database,
  };
};

const escapeHtml = (value) => String(value ?? '-')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const formatLocal = (isoDate) => {
  try {
    return new Date(isoDate).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return isoDate;
  }
};

export const renderStatusPage = (status) => {
  const isOk = status.status === 'ok';
  const rows = [
    ['Versao', status.version],
    ['Commit', status.commit || 'nao informado'],
    ['Ambiente', status.environment],
    ['No ar ha', status.uptime],
    ['Subiu em', formatLocal(status.startedAt)],
    ['Banco', status.database.status === 'ok' ? `ok (${status.database.responseMs} ms)` : 'erro'],
    ['Node', status.node],
    ['Consultado em', formatLocal(status.checkedAt)],
  ];

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>BeautyApp API - ${escapeHtml(status.status)}</title>
<style>
  :root { color-scheme: light dark; --bg:#f6f5f3; --card:#fff; --text:#2d1c14; --muted:#80807f; --line:#e6e2dd; --ok:#4caf50; --bad:#e53935; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#16110e; --card:#1f1813; --text:#f2ede8; --muted:#a39a92; --line:#352a23; }
  }
  * { box-sizing: border-box; }
  body { margin:0; padding:32px 20px; background:var(--bg); color:var(--text);
         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .card { max-width:520px; margin:0 auto; background:var(--card); border:1px solid var(--line);
          border-radius:16px; padding:28px; }
  .top { display:flex; align-items:center; gap:12px; margin-bottom:4px; }
  .dot { width:14px; height:14px; border-radius:50%; background:${isOk ? 'var(--ok)' : 'var(--bad)'};
         box-shadow:0 0 0 4px ${isOk ? 'rgba(76,175,80,.18)' : 'rgba(229,57,53,.18)'}; flex:none; }
  h1 { margin:0; font-size:20px; font-weight:800; letter-spacing:-.01em; }
  .sub { margin:0 0 24px 26px; color:var(--muted); font-size:13px; }
  table { width:100%; border-collapse:collapse; }
  th, td { text-align:left; padding:11px 0; border-bottom:1px solid var(--line); font-size:14px; }
  th { color:var(--muted); font-weight:500; width:42%; }
  td { font-weight:700; font-variant-numeric:tabular-nums; word-break:break-word; }
  tr:last-child th, tr:last-child td { border-bottom:none; }
  .foot { margin:22px 0 0; color:var(--muted); font-size:12px; }
</style>
</head>
<body>
  <div class="card">
    <div class="top">
      <span class="dot"></span>
      <h1>${isOk ? 'API no ar' : 'API degradada'}</h1>
    </div>
    <p class="sub">${escapeHtml(status.service)}</p>
    <table>
      ${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join('\n      ')}
    </table>
    <p class="foot">Atualize a pagina para consultar de novo. Para resposta em JSON, use <code>Accept: application/json</code>.</p>
  </div>
</body>
</html>`;
};
