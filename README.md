# API para o BeautyApp

API do BeautyApp, aplicativo de agenda para profissionais autônomas da beleza.
Ela atende autenticação, clientes, serviços e agendamentos.

## Pré-requisitos

- Node.js 18.20.6 ou superior.
- PostgreSQL.
- Git (opcional).

## Instalação local

Clone o repositório e instale as dependências:

```bash
npm install
```

Configure uma instância PostgreSQL própria para desenvolvimento ou testes com
as variáveis de ambiente locais do projeto. Não registre credenciais, tokens ou
URLs de banco neste repositório.

Execute migrações somente depois de confirmar que o alvo é um banco local ou
explicitamente descartável. Nunca use este comando como instrução de execução
automática em produção:

```bash
npx sequelize db:migrate
```

Para iniciar o servidor:

```bash
npm run start
```

A API fica disponível em `http://localhost:3000`.

## Perfil operacional da cliente (API 1.3.0)

Todas as rotas abaixo exigem autenticação Bearer e sempre são isoladas pelo
usuário autenticado. Uma cliente inexistente ou pertencente a outra usuária
retorna o mesmo `404`.

| Método e rota | Resposta/uso |
| --- | --- |
| `GET /clients/:id/profile` | Retorna o cadastro enxuto, até quatro próximos atendimentos e até quatro itens de histórico. |
| `GET /clients/:id/appointments/history?limit&cursor` | Retorna página posterior; `limit` aceita inteiros de 1 a 20 e vale 10 por padrão. `cursor` é opaco/Base64URL e vem em `nextCursor`. |
| `PUT /clients/:id/photo` | Recebe uma única imagem no campo multipart `photo` e retorna `{ photoUrl, photoUpdatedAt }`. |
| `GET /clients/:id/photo` | Retorna somente os bytes WebP autenticados da foto. |
| `DELETE /clients/:id/photo` | Remove a foto e responde `204`. |

Durante o beta, as três rotas de foto ficam desativadas por padrão. Somente o
valor literal `CLIENT_PHOTO_ENABLED=true` as habilita; qualquer outro valor,
inclusive ausência, responde `404` genérico antes de ownership, multipart ou
processamento. A flag é proibida na produção beta. Com a foto desativada, o
perfil retorna `photoUrl` e `photoUpdatedAt` como `null` sem consultar
`client_photos`.

O DTO de `client` do perfil contém `id`, `name`, `lastName`, `phone`, `email`,
`birthDate`, `address`, `preferencesNotes`, `photoUrl` e `photoUpdatedAt`.
Cada atendimento contém somente `id`, `clientId`, `startAt`, `endAt`, `status`,
`notes`, `serviceIds`, `services` e `serviceName`. Preço, sinal, campos de
Google Calendar, BLOBs e Base64 não fazem parte desse contrato.

`preferencesNotes` é uma nota interna e opcional: é normalizada com `trim`,
texto vazio vira `null` e o máximo é 2.000 caracteres. Ela pode constar do
cadastro/edição e do perfil, mas não trafega em listagens ou sincronização
normal de clientes.

Atendimentos com `status = canceled` ou `archivedAt` preenchido nunca aparecem
nem trafegam no perfil, nos próximos atendimentos ou no histórico.

### Foto privada e cache

O alerta HIGH atual de `sharp@0.34.0` mantém a funcionalidade desativada no
beta. Como defesa em profundidade, o carregamento do processador bloqueia os
loaders `VipsForeignLoadNsgif`, `VipsForeignLoadTiff` e `VipsForeignLoadVips`.
Isso mitiga a superfície enquanto a flag permanece desligada, mas não substitui
uma atualização da dependência.

O upload aceita apenas JPEG, PNG ou WebP de até 5 MiB e 16 megapixels. A imagem
é validada pelo conteúdo, orientada, recortada e convertida para WebP de
512 × 512 px com saída máxima de 512 KiB. Erro de tamanho retorna `413`; campo
ausente, campos extras ou mais de um arquivo retornam `400`; conteúdo inválido
retorna `415`.

A leitura devolve `Content-Type: image/webp`, `Content-Length`, `ETag`,
`X-Content-Type-Options: nosniff` e `Cache-Control: private, max-age=86400,
must-revalidate`. Clientes podem enviar `If-None-Match` e receber `304` sem
corpo. Como a rota é autenticada e o cache é privado, a foto não deve ser
compartilhada por caches públicos.

### Persistência e concorrência

Hoje os bytes e metadados da foto são persistidos em PostgreSQL, na tabela
separada `client_photos`. A API os acessa exclusivamente pela fronteira
`clientPhotoStorage`; uma implementação futura S3-compatible pode substituir
esse adaptador sem alterar rotas, DTOs ou semântica HTTP. Não há bucket, IAM,
secrets ou lifecycle provisionados por esta versão, e o app beta ainda não
consome as rotas de foto.

Substituir ou remover foto ocorre em transação e bloqueia a cliente com `FOR
UPDATE`, sempre no escopo `{ userId, clientId }`. Assim, ownership, criação,
atualização e remoção não expõem dados entre usuárias nem concorrem com a
remoção da cliente. Um conflito único encerra a transação com rollback; não há
tentativa de reutilizar uma transação PostgreSQL já abortada.

### Checklist para uma ativação futura

Não ativar foto até que todos os itens estejam concluídos: Node.js >= 20.9,
Sharp corrigido e compatível com esse runtime, adaptador S3-compatible
provisionado e validado, e entrega mobile específica que consuma o contrato.
O armazenamento atual em PostgreSQL é provisório e não autoriza lançamento.

## Monitoramento no Render

A API disponibiliza um endpoint público e leve para health check:

```http
GET /health
```

Resposta esperada:

```json
{
  "status": "ok"
}
```

Para manter a instância gratuita do Render ativa durante a fase de MVP, é
possível configurar um monitor HTTP no UptimeRobot para
`https://api-h1hk.onrender.com/health`, com método `GET`, intervalo de cinco
minutos e resposta HTTP `200`. O endpoint não consulta banco de dados nem
integrações externas.

## Licença

Este projeto está licenciado sob a licença MIT. Veja [LICENSE](LICENSE).
