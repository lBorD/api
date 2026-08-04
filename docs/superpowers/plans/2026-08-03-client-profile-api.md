# Client Profile API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Disponibilizar um perfil operacional autenticado com preferências, próximos atendimentos, histórico paginado e avatar privado para cada cliente.

**Architecture:** Um controller dedicado valida a propriedade da cliente e delega consultas/serialização a serviços pequenos. O avatar é normalizado para WebP e passa exclusivamente pela fronteira `clientPhotoStorage`; o adaptador atual persiste em `client_photos`, separado de `Clients`, e pode ser trocado futuramente por S3-compatible sem alterar controllers, DTOs ou rotas. O JSON transporta apenas metadados e a rota autenticada da imagem. Histórico usa cursor Base64URL e índice por usuário, cliente, data e id.

**Tech Stack:** Node.js 18.20.6, Express 4, Sequelize 6, PostgreSQL, Jest/Supertest, Multer 2.2.0 e Sharp 0.34.0.

## Checkpoint de execucao - pausa em 2026-08-03

- API concluida e revisada na branch `feat/BEAUTY-41`; ultimo commit `baf560a`; 27 suites e 184 testes aprovados.
- Foto `default-off` durante o beta. Nao ativar antes de Node >= 20.9, Sharp corrigido, S3-compatible provisionado e entrega mobile coordenada.
- Migration nao executada por falta de banco descartavel; sem PR, merge ou deploy. A issue continua em `In progress` durante a pausa integrada.

## Global Constraints

- Toda busca ou mutação inclui `req.user.id`; cliente inexistente e cliente alheia retornam o mesmo `404`.
- `status = canceled` e `archivedAt IS NOT NULL` nunca aparecem nem trafegam no perfil.
- A carga inicial retorna no máximo quatro próximos e quatro históricos; páginas posteriores usam limite 1..20, padrão 10.
- `preferencesNotes` é interno, opcional, trimado, vazio vira `null` e tem máximo de 2.000 caracteres.
- A foto final é WebP 512 × 512, no máximo 512 KiB; entrada JPEG/PNG/WebP de no máximo 5 MiB e 16 megapixels.
- Bytes/base64 nunca entram em JSON, listagem ou sincronização de clientes.
- O app beta não consome as rotas de foto; a API fica preparada e testada, sem pressupor bucket, IAM, secrets ou lifecycle provisionados.
- Não recriar endpoint de sugestões de horário e não incluir preço, sinal ou campos Google no payload do perfil.
- Não executar migration ou deploy de produção nesta implementação.

---

### Task 1: Schema e modelos do perfil

**Files:**
- Create: `src/migrations/20260803000100-add-client-profile-and-photos.cjs`
- Create: `src/models/ClientPhoto.js`
- Modify: `src/models/Client.js`
- Modify: `jest.setup.js`
- Test: `__tests__/migrations/clientProfileMigration.test.js`

**Interfaces:**
- Produces: `Client.preferencesNotes`; modelo `ClientPhoto` com `userId`, `clientId`, `data`, `mimeType`, `byteSize`, `checksum`, `width`, `height`.
- Produces: índice `appointments_user_client_visible_start_idx` em `("userId", "clientId", "startAt", id)`.

- [ ] **Step 1: Escrever o teste falhando da migration**

```js
it('cria preferências, tabela de fotos e índice do histórico', async () => {
  await migration.up(queryInterface, Sequelize);
  expect(queryInterface.addColumn).toHaveBeenCalledWith(
    'Clients', 'preferencesNotes', expect.objectContaining({ allowNull: true }), expect.any(Object),
  );
  expect(queryInterface.createTable).toHaveBeenCalledWith(
    'client_photos', expect.objectContaining({ data: expect.objectContaining({ allowNull: false }) }), expect.any(Object),
  );
  expect(queryInterface.addIndex).toHaveBeenCalledWith(
    'appointments', ['userId', 'clientId', 'startAt', 'id'],
    expect.objectContaining({ name: 'appointments_user_client_visible_start_idx' }),
  );
});
```

- [ ] **Step 2: Confirmar RED**

Run: `npm test -- __tests__/migrations/clientProfileMigration.test.js --runInBand`  
Expected: FAIL porque a migration ainda não existe.

- [ ] **Step 3: Implementar migration transacional e modelos**

```js
// ClientPhoto.js — contrato central
const ClientPhoto = sequelize.define('ClientPhoto', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  clientId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  data: { type: DataTypes.BLOB, allowNull: false },
  mimeType: { type: DataTypes.STRING, allowNull: false },
  byteSize: { type: DataTypes.INTEGER, allowNull: false },
  checksum: { type: DataTypes.STRING(64), allowNull: false },
  width: { type: DataTypes.INTEGER, allowNull: false },
  height: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'client_photos', timestamps: true });
```

Na migration, criar FK de `userId` para `users`, FK única de `clientId` para `Clients` com `ON DELETE CASCADE`, índice de fotos por `userId/clientId` e índice parcial dos appointments com `where: { archivedAt: null, status: { [Sequelize.Op.ne]: 'canceled' } }`. O `down` remove índice, tabela e coluna nessa ordem.

- [ ] **Step 4: Atualizar doubles globais do Jest**

Adicionar `BLOB`, `gte`, `lte`, `eq` e mock completo de `ClientPhoto` a `jest.setup.js`, incluindo `findOne`, `create`, `update` e `destroy`.

- [ ] **Step 5: Confirmar GREEN e regressão curta**

Run: `npm test -- __tests__/migrations/clientProfileMigration.test.js __tests__/controllers/client.test.js --runInBand`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/migrations/20260803000100-add-client-profile-and-photos.cjs src/models/Client.js src/models/ClientPhoto.js jest.setup.js __tests__/migrations/clientProfileMigration.test.js
git commit -m "feat: adiciona dados do perfil da cliente"
```

### Task 2: Cursor, payload e consultas de atendimentos

**Files:**
- Create: `src/utils/clientHistoryCursor.js`
- Create: `src/services/clientProfileService.js`
- Test: `__tests__/utils/clientHistoryCursor.test.js`
- Test: `__tests__/services/clientProfileService.test.js`

**Interfaces:**
- Produces: `encodeHistoryCursor({ startAt, id }): string`.
- Produces: `decodeHistoryCursor(cursor): { startAt: Date, id: number } | null`.
- Produces: `loadClientProfile({ userId, clientId, now })` e `loadClientHistory({ userId, clientId, cursor, limit, now })`.

- [ ] **Step 1: Escrever testes falhando do cursor**

```js
it('preserva data e id num cursor Base64URL opaco', () => {
  const cursor = encodeHistoryCursor({ startAt: '2026-08-03T10:00:00.000Z', id: 42 });
  expect(decodeHistoryCursor(cursor)).toEqual({ startAt: new Date('2026-08-03T10:00:00.000Z'), id: 42 });
});

it.each(['', '***', Buffer.from('{}').toString('base64url')])('rejeita cursor inválido %s', (cursor) => {
  expect(decodeHistoryCursor(cursor)).toBeNull();
});
```

- [ ] **Step 2: Confirmar RED do cursor**

Run: `npm test -- __tests__/utils/clientHistoryCursor.test.js --runInBand`  
Expected: FAIL por módulo ausente.

- [ ] **Step 3: Implementar codec mínimo e confirmar GREEN**

Codificar JSON `{ startAt: ISO, id }` com `Buffer.from(...).toString('base64url')`; ao ler, exigir ISO válido e inteiro positivo.

Run: `npm test -- __tests__/utils/clientHistoryCursor.test.js --runInBand`  
Expected: PASS.

- [ ] **Step 4: Escrever testes falhando das consultas**

```js
it('filtra próximos e histórico por tenant, cliente e visibilidade', async () => {
  await loadClientProfile({ userId: 7, clientId: 12, now: new Date('2026-08-03T12:00:00Z') });
  expect(Appointment.findAll).toHaveBeenNthCalledWith(1, expect.objectContaining({
    where: expect.objectContaining({ userId: 7, clientId: 12, archivedAt: null }),
    limit: 4,
    order: [['startAt', 'ASC'], ['id', 'ASC']],
  }));
  expect(Appointment.findAll).toHaveBeenNthCalledWith(2, expect.objectContaining({
    where: expect.objectContaining({ userId: 7, clientId: 12, archivedAt: null }),
    limit: 5,
    order: [['startAt', 'DESC'], ['id', 'DESC']],
  }));
});

it('pagina empate de horário usando id como desempate', async () => {
  await loadClientHistory({
    userId: 7,
    clientId: 12,
    limit: 10,
    cursor: encodeHistoryCursor({ startAt: '2026-08-01T10:00:00.000Z', id: 9 }),
    now: new Date('2026-08-03T12:00:00Z'),
  });
  expect(Appointment.findAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 11 }));
});
```

- [ ] **Step 5: Confirmar RED das consultas**

Run: `npm test -- __tests__/services/clientProfileService.test.js --runInBand`  
Expected: FAIL por serviço ausente.

- [ ] **Step 6: Implementar consultas e serializer mínimo**

Consultar appointments sem joins, carregar todos os snapshots em uma única `AppointmentService.findAll({ where: { appointmentId: { [Op.in]: ids } } })`, agrupar por `appointmentId` e produzir somente:

```js
{
  id, clientId, startAt, endAt, status, notes,
  serviceIds,
  services: [{ serviceId, name }],
  serviceName: services.map(({ name }) => name).filter(Boolean).join(' + '),
}
```

Buscar `limit + 1`, remover o excedente e gerar `nextCursor` pelo último item visível. Todos os `where` incluem `status: { [Op.ne]: 'canceled' }` e `archivedAt: null`.

- [ ] **Step 7: Confirmar GREEN**

Run: `npm test -- __tests__/utils/clientHistoryCursor.test.js __tests__/services/clientProfileService.test.js --runInBand`  
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/utils/clientHistoryCursor.js src/services/clientProfileService.js __tests__/utils/clientHistoryCursor.test.js __tests__/services/clientProfileService.test.js
git commit -m "feat: consulta histórico da cliente por cursor"
```

### Task 3: Endpoints de perfil e preferências

**Files:**
- Create: `src/controllers/clientProfile.js`
- Modify: `src/routes/clientRoutes.js`
- Modify: `src/controllers/client.js`
- Modify: `src/middlewares/validateClient.js`
- Modify: `src/middlewares/validateClientUpdate.js`
- Modify: `jest.setup.js`
- Test: `__tests__/controllers/clientProfile.test.js`
- Test: `__tests__/middlewares/validateClient.test.js`
- Test: `__tests__/middlewares/validateClientUpdate.test.js`
- Test: `__tests__/routes/clientRoutes.test.js`

**Interfaces:**
- Produces: `GET /clients/:id/profile`.
- Produces: `GET /clients/:id/appointments/history?limit&cursor`.
- Extends: register/update aceitam `preferencesNotes`.

- [ ] **Step 1: Escrever testes falhando do controller**

```js
it('não consulta appointments quando a cliente é alheia ou inexistente', async () => {
  Client.findOne.mockResolvedValue(null);
  await request(app).get('/1/profile').expect(404, { error: 'Cliente não encontrado.' });
  expect(Appointment.findAll).not.toHaveBeenCalled();
});

it('devolve perfil inicial sem financeiro nem cancelados', async () => {
  Client.findOne.mockResolvedValue(clientFixture);
  const response = await request(app).get('/1/profile').expect(200);
  expect(response.body).toEqual(expect.objectContaining({
    client: expect.objectContaining({ id: 1, preferencesNotes: 'Prefere natural' }),
    upcomingAppointments: expect.any(Array),
    history: expect.objectContaining({ appointments: expect.any(Array) }),
  }));
  expect(JSON.stringify(response.body)).not.toContain('depositAmount');
});
```

- [ ] **Step 2: Confirmar RED**

Run: `npm test -- __tests__/controllers/clientProfile.test.js --runInBand`  
Expected: FAIL por controller/rotas ausentes.

- [ ] **Step 3: Implementar controller e rotas**

Validar id inteiro positivo, `limit` entre 1 e 20, cursor com o codec e propriedade via `Client.findOne({ where: { id, userId } })`. O DTO da cliente contém somente os campos da especificação e `photoUrl` é `null` até Task 5.

- [ ] **Step 4: Escrever testes falhando de preferências**

```js
it('normaliza preferências vazias para null', async () => {
  const req = buildRequest({ preferencesNotes: '   ' });
  await validateClientUpdate(req, response, next);
  expect(req.body.preferencesNotes).toBeNull();
  expect(next).toHaveBeenCalled();
});

it('rejeita preferências acima de 2000 caracteres', async () => {
  const req = buildRequest({ preferencesNotes: 'a'.repeat(2001) });
  await validateClientUpdate(req, response, next);
  expect(response.status).toHaveBeenCalledWith(400);
});
```

- [ ] **Step 5: Confirmar RED e implementar normalização**

Run: `npm test -- __tests__/middlewares/validateClient.test.js __tests__/middlewares/validateClientUpdate.test.js --runInBand`  
Expected antes: FAIL nos casos novos.  
Adicionar `preferencesNotes` aos controllers de create/update e aos dois middlewares; listagens/sync recebem `attributes` explícitos sem o campo interno.

- [ ] **Step 6: Atualizar mock de rotas e testar autenticação**

Adicionar `clientProfile` ao mock global e casos `GET /clients/1/profile` e `GET /clients/1/appointments/history`, ambos com e sem Bearer.

- [ ] **Step 7: Confirmar GREEN**

Run: `npm test -- __tests__/controllers/clientProfile.test.js __tests__/middlewares/validateClient.test.js __tests__/middlewares/validateClientUpdate.test.js __tests__/routes/clientRoutes.test.js --runInBand`  
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/controllers/clientProfile.js src/controllers/client.js src/routes/clientRoutes.js src/middlewares/validateClient.js src/middlewares/validateClientUpdate.js jest.setup.js __tests__/controllers/clientProfile.test.js __tests__/middlewares/validateClient.test.js __tests__/middlewares/validateClientUpdate.test.js __tests__/routes/clientRoutes.test.js
git commit -m "feat: expõe perfil operacional da cliente"
```

### Task 4: Normalização e persistência privada da foto

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/services/clientPhotoProcessor.js`
- Create: `src/services/clientPhotoStorage.js`
- Test: `__tests__/services/clientPhotoProcessor.test.js`
- Test: `__tests__/services/clientPhotoStorage.test.js`

**Interfaces:**
- Produces: `processClientPhoto(buffer): Promise<{ data, mimeType, byteSize, checksum, width, height }>`.
- Produces: `getClientPhotoMeta`, `readClientPhoto`, `replaceClientPhoto`, `removeClientPhoto` sempre com `{ userId, clientId }`.

- [ ] **Step 1: Instalar versões compatíveis com Node 18**

Run: `npm install --save-exact multer@2.2.0 sharp@0.34.0`  
Expected: lockfile atualizado sem erro de engine.

- [ ] **Step 2: Escrever testes falhando do processador**

```js
const validPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
const corruptBuffer = Buffer.from('not-an-image');
const textDisguisedAsJpeg = Buffer.from('plain text with a .jpg filename');

it('orienta, recorta e converte uma entrada válida para WebP 512', async () => {
  const result = await processClientPhoto(validPngBuffer);
  expect(result).toEqual(expect.objectContaining({
    mimeType: 'image/webp', width: 512, height: 512, checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
  }));
  expect(result.byteSize).toBeLessThanOrEqual(512 * 1024);
});

it.each([corruptBuffer, textDisguisedAsJpeg])('rejeita conteúdo que não é imagem real', async (buffer) => {
  await expect(processClientPhoto(buffer)).rejects.toMatchObject({ code: 'INVALID_CLIENT_PHOTO' });
});
```

- [ ] **Step 3: Confirmar RED, implementar e confirmar GREEN**

Run antes: `npm test -- __tests__/services/clientPhotoProcessor.test.js --runInBand`  
Expected: FAIL por módulo ausente.

Implementar com `sharp(buffer, { failOn: 'error', limitInputPixels: 16000000 }).rotate().resize(512, 512, { fit: 'cover' }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true })`; não chamar `withMetadata()`.

Run depois: mesmo comando.  
Expected: PASS.

- [ ] **Step 4: Escrever testes falhando do storage**

```js
it('substitui a foto somente depois de confirmar o tenant e bloquear a cliente', async () => {
  await replaceClientPhoto({ userId: 7, clientId: 12, photo: normalizedPhoto });
  expect(Client.findOne).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: 12, userId: 7 },
    transaction: expect.any(Object),
    lock: expect.anything(),
  }));
  expect(ClientPhoto.update).toHaveBeenCalledWith(
    expect.objectContaining({ mimeType: 'image/webp' }),
    expect.objectContaining({ where: { userId: 7, clientId: 12 }, transaction: expect.any(Object) }),
  );
});

it('não lê foto de outro tenant', async () => {
  await readClientPhoto({ userId: 8, clientId: 12 });
  expect(ClientPhoto.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 8, clientId: 12 } }));
});
```

- [ ] **Step 5: Confirmar RED, implementar storage e confirmar GREEN**

Validar a propriedade de `Client` dentro de transação com `FOR UPDATE`, atualizar somente por `{ userId, clientId }` e criar somente quando não existir linha escopada. `SequelizeUniqueConstraintError` encerra a transação com erro estável e rollback; não executar retry dentro de uma transação PostgreSQL abortada. Retornar os metadados sem BLOB ainda dentro da mesma transação.

Run: `npm test -- __tests__/services/clientPhotoStorage.test.js --runInBand`  
Expected antes: FAIL; depois: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/services/clientPhotoProcessor.js src/services/clientPhotoStorage.js __tests__/services/clientPhotoProcessor.test.js __tests__/services/clientPhotoStorage.test.js
git commit -m "feat: normaliza e armazena foto da cliente"
```

### Task 5: Endpoints HTTP da foto e cache privado

**Files:**
- Create: `src/middlewares/clientPhotoUpload.js`
- Modify: `src/controllers/clientProfile.js`
- Modify: `src/routes/clientRoutes.js`
- Modify: `src/services/clientProfileService.js`
- Modify: `jest.setup.js`
- Test: `__tests__/middlewares/clientPhotoUpload.test.js`
- Test: `__tests__/controllers/clientProfile.test.js`
- Test: `__tests__/routes/clientRoutes.test.js`

**Interfaces:**
- Produces: `PUT /clients/:id/photo`, `GET /clients/:id/photo`, `DELETE /clients/:id/photo`.
- Extends: perfil retorna `photoUrl` relativo e `photoUpdatedAt` usando apenas metadados.

- [ ] **Step 1: Escrever testes falhando do middleware**

Cobrir campo ausente `400`, dois arquivos `400`, tamanho acima de 5 MiB `413` e arquivo único válido que chega em `req.file.buffer`.

Run: `npm test -- __tests__/middlewares/clientPhotoUpload.test.js --runInBand`  
Expected: FAIL por middleware ausente.

- [ ] **Step 2: Implementar Multer restrito e confirmar GREEN**

Usar `memoryStorage`, `limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 }` e mapear `LIMIT_FILE_SIZE` para `413` sem incluir nome ou conteúdo do arquivo no erro.

- [ ] **Step 3: Escrever testes falhando do controller de foto**

```js
it('responde 304 quando o ETag coincide', async () => {
  Client.findOne.mockResolvedValue({ id: 12 });
  readClientPhoto.mockResolvedValue(photoRow);
  await request(app).get('/12/photo').set('If-None-Match', `"${photoRow.checksum}"`).expect(304);
});

it('preserva a foto anterior quando o processamento falha', async () => {
  Client.findOne.mockResolvedValue({ id: 12 });
  processClientPhoto.mockRejectedValue(Object.assign(new Error('invalid'), { code: 'INVALID_CLIENT_PHOTO' }));
  await request(app).put('/12/photo').attach('photo', corruptBuffer, 'fake.jpg').expect(415);
  expect(replaceClientPhoto).not.toHaveBeenCalled();
});
```

- [ ] **Step 4: Confirmar RED, implementar controller e confirmar GREEN**

Na leitura, definir `Content-Type`, `Content-Length`, `ETag`, `Cache-Control` e `X-Content-Type-Options`. Upload bem-sucedido responde `200` com `{ photoUrl, photoUpdatedAt }`; remoção responde `204`.

Run: `npm test -- __tests__/controllers/clientProfile.test.js __tests__/middlewares/clientPhotoUpload.test.js --runInBand`  
Expected: PASS.

- [ ] **Step 5: Testar rotas reais e autenticação**

Adicionar ao mock global os três handlers e testar que cada verbo/caminho exige Bearer. Confirmar que o upload usa o middleware antes do controller.

Run: `npm test -- __tests__/routes/clientRoutes.test.js --runInBand`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/middlewares/clientPhotoUpload.js src/controllers/clientProfile.js src/routes/clientRoutes.js src/services/clientProfileService.js jest.setup.js __tests__/middlewares/clientPhotoUpload.test.js __tests__/controllers/clientProfile.test.js __tests__/routes/clientRoutes.test.js
git commit -m "feat: adiciona foto autenticada ao perfil"
```

### Task 6: Versão, documentação e verificação da API

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `README.md`
- Modify: `API_GUIDELINES.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Produces: versão API `1.3.0` e contrato documentado.

- [ ] **Step 1: Atualizar versão e documentação**

Registrar rotas, limites, campos, política de cache privado, decisão PostgreSQL agora/S3 futuro e proibição de cancelados. Não adicionar secrets nem instruir execução automática de migration em produção.

- [ ] **Step 2: Executar suíte completa**

Run: `npm test -- --runInBand`  
Expected: todas as suítes e testes PASS.

- [ ] **Step 3: Verificar dependências de produção**

Run: `npm audit --omit=dev`  
Expected: registrar vulnerabilidades existentes e confirmar que `multer@2.2.0`/`sharp@0.34.0` não adicionam alerta crítico novo.

- [ ] **Step 4: Verificar migration sem executar em produção**

Run em banco descartável configurado: `npm run db:migrate && npm run db:migrate:undo && npm run db:migrate`  
Expected: up/down/up sem erro; não usar o banco oficial.

- [ ] **Step 5: Verificação estática e estado Git**

Run: `git diff --check`  
Expected: nenhuma saída.  
Run: `git status --short`  
Expected: somente arquivos da BEAUTY-41 antes do commit.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json README.md API_GUIDELINES.md CHANGELOG.md
git commit -m "docs: documenta perfil operacional da cliente"
```

#### Emenda de segurança da Task 6: foto desativada durante o beta

**Files adicionais:**
- Create: `src/config/clientPhotoFeature.js`
- Create: `src/middlewares/requireClientPhotoFeature.js`
- Modify: `src/routes/clientRoutes.js`
- Modify: `src/controllers/clientProfile.js`
- Modify: `src/services/clientProfileService.js`
- Modify: `src/services/clientPhotoProcessor.js`
- Modify: `README.md`
- Modify: `API_GUIDELINES.md`
- Modify: `CHANGELOG.md`
- Test: `__tests__/config/clientPhotoFeature.test.js`
- Test: `__tests__/middlewares/requireClientPhotoFeature.test.js`
- Test: `__tests__/routes/clientRoutes.test.js`
- Test: `__tests__/controllers/clientProfile.test.js`
- Test: `__tests__/services/clientProfileService.test.js`
- Test: `__tests__/services/clientPhotoProcessor.test.js`

- [ ] **Step 7: Escrever RED do guard default-off**

Sem `CLIENT_PHOTO_ENABLED=true`, as três rotas de foto respondem `404` antes de ownership, Multer, leitura ou Sharp. Com opt-in explícito em teste, o contrato já implementado continua funcionando. O perfil desativado retorna `photoUrl/photoUpdatedAt: null` sem consultar `client_photos`.

- [ ] **Step 8: Implementar fronteira de feature e mitigação do Sharp**

Adicionar `isClientPhotoEnabled()` com opt-in estrito e middleware antes de qualquer handler de foto. `loadClientProfile` recebe `includePhoto` e não lê metadados quando falso. Como `sharp@0.35.x` exige Node >=20.9 e o runtime atual é 18.20.6, aplicar também o workaround oficial com `sharp.block({ operation: ['VipsForeignLoadNsgif', 'VipsForeignLoadTiff', 'VipsForeignLoadVips'] })`. Não ativar a flag em configuração de produção.

- [ ] **Step 9: Documentar condição de ativação futura**

Registrar que foto fica desligada durante o beta. Só ativar depois de upgrade coordenado para Node >=20.9 + Sharp corrigido, provisionamento do adaptador S3-compatible e entrega mobile específica. O PostgreSQL atual é implementação técnica provisória, não autorização de lançamento.

- [ ] **Step 10: Verificar e corrigir a revisão**

Run: `npm test -- --runInBand`
Expected: PASS, incluindo default-off/opt-in e bloqueio do decoder.
Run: `npm audit --omit=dev`
Expected: o alerta de Sharp permanece detectável no lockfile, mas a superfície fica inacessível por padrão e os decodificadores citados no advisory ficam bloqueados em profundidade.

```bash
git add src/config/clientPhotoFeature.js src/middlewares/requireClientPhotoFeature.js src/routes/clientRoutes.js src/controllers/clientProfile.js src/services/clientProfileService.js src/services/clientPhotoProcessor.js README.md API_GUIDELINES.md CHANGELOG.md __tests__
git commit -m "fix: desativa foto durante o beta"
```
