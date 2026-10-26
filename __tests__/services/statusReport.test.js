import {
  buildStatus,
  checkDatabase,
  formatUptime,
  renderStatusPage,
} from '../../src/services/statusReport.js';

const okSequelize = { authenticate: () => Promise.resolve() };
const brokenSequelize = {
  authenticate: () => Promise.reject(new Error('connect ECONNREFUSED 10.0.0.9:5432 user=admin password=segredo')),
};

describe('formatUptime', () => {
  it('mostra segundos no primeiro minuto', () => {
    expect(formatUptime(0)).toBe('0s');
    expect(formatUptime(42)).toBe('42s');
  });

  it('mostra minutos abaixo de uma hora', () => {
    expect(formatUptime(600)).toBe('10min');
  });

  it('mostra horas e minutos abaixo de um dia', () => {
    expect(formatUptime(3600 * 2 + 60 * 14)).toBe('2h 14min');
  });

  it('mostra dias e horas acima de um dia', () => {
    expect(formatUptime(86400 * 3 + 3600 * 5)).toBe('3d 5h');
  });

  it('nao quebra com entrada invalida ou negativa', () => {
    expect(formatUptime(-10)).toBe('0s');
    expect(formatUptime(undefined)).toBe('0s');
    expect(formatUptime('abc')).toBe('0s');
  });
});

describe('checkDatabase', () => {
  it('reporta ok quando o banco responde', async () => {
    await expect(checkDatabase(okSequelize)).resolves.toEqual(
      expect.objectContaining({ status: 'ok' }),
    );
  });

  it('reporta erro sem vazar a mensagem do Sequelize', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const result = await checkDatabase(brokenSequelize);

    expect(result.status).toBe('erro');
    // A mensagem do Sequelize traz host, usuario e senha. A rota e publica.
    expect(JSON.stringify(result)).not.toMatch(/ECONNREFUSED|password|10\.0\.0\.9/);

    console.error.mockRestore();
  });
});

describe('buildStatus', () => {
  it('reporta ok e expoe versao, ambiente e tempo de atividade', async () => {
    const status = await buildStatus(okSequelize, {
      env: { NODE_ENV: 'production' },
      uptimeSeconds: 3600 * 2 + 60 * 14,
    });

    expect(status.status).toBe('ok');
    expect(status.service).toBe('beautyapp-api');
    expect(status.environment).toBe('production');
    expect(status.uptime).toBe('2h 14min');
    expect(status.uptimeSeconds).toBe(8040);
    expect(status.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(status.database.status).toBe('ok');
  });

  it('encurta o commit do Render para sete caracteres', async () => {
    const status = await buildStatus(okSequelize, {
      env: { RENDER_GIT_COMMIT: '4e89e8172a401c4179effb9540aec8571efcaf2f' },
    });

    expect(status.commit).toBe('4e89e81');
  });

  it('devolve commit nulo quando a variavel nao existe', async () => {
    const status = await buildStatus(okSequelize, { env: {} });

    expect(status.commit).toBeNull();
    expect(status.environment).toBe('development');
  });

  it('fica degradado quando o banco nao responde', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const status = await buildStatus(brokenSequelize, { env: {} });

    expect(status.status).toBe('degradado');
    expect(status.database.status).toBe('erro');

    console.error.mockRestore();
  });

  it('calcula startedAt a partir do tempo de atividade', async () => {
    const status = await buildStatus(okSequelize, { env: {}, uptimeSeconds: 120 });

    const elapsed = new Date(status.checkedAt).getTime() - new Date(status.startedAt).getTime();
    expect(elapsed).toBe(120000);
  });

  it('nao expoe variavel de ambiente sensivel', async () => {
    const status = await buildStatus(okSequelize, {
      env: {
        NODE_ENV: 'production',
        DB_PASSWORD: 'senha-secreta',
        JWT_SECRET: 'chave-secreta',
        GOOGLE_TOKEN_ENCRYPTION_KEY: 'chave-de-cripto',
      },
    });

    expect(JSON.stringify(status)).not.toMatch(/senha-secreta|chave-secreta|chave-de-cripto/);
  });
});

describe('renderStatusPage', () => {
  const baseStatus = {
    status: 'ok',
    service: 'beautyapp-api',
    version: '1.4.0',
    commit: '4e89e81',
    environment: 'production',
    node: 'v18.20.6',
    uptime: '2h 14min',
    uptimeSeconds: 8040,
    startedAt: '2026-10-26T01:00:00.000Z',
    checkedAt: '2026-10-26T03:14:00.000Z',
    database: { status: 'ok', responseMs: 12 },
  };

  it('monta uma pagina html autocontida com os dados principais', () => {
    const html = renderStatusPage(baseStatus);

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('API no ar');
    expect(html).toContain('1.4.0');
    expect(html).toContain('4e89e81');
    expect(html).toContain('2h 14min');
    // Sem recurso externo: a pagina tem de abrir sozinha.
    expect(html).not.toMatch(/<script|src=|href="http/);
  });

  it('muda o titulo quando esta degradada', () => {
    const html = renderStatusPage({
      ...baseStatus,
      status: 'degradado',
      database: { status: 'erro', responseMs: 5 },
    });

    expect(html).toContain('API degradada');
    expect(html).toContain('erro');
  });

  it('escapa valor para nao permitir injecao de html', () => {
    const html = renderStatusPage({
      ...baseStatus,
      commit: '<script>alert(1)</script>',
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('mostra aviso quando nao ha commit informado', () => {
    const html = renderStatusPage({ ...baseStatus, commit: null });

    expect(html).toContain('nao informado');
  });
});
