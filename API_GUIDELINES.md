# Guia de desenvolvimento da API (Express + PostgreSQL)

Este documento orienta decisões técnicas e de produto da API do BeautyApp,
um aplicativo de agenda simples para profissionais autônomas da beleza.

## Princípios

- Implementar apenas o que reduz atrito em agenda, clientes e serviços.
- Manter endpoints específicos, payloads previsíveis e respostas enxutas.
- Proteger toda rota privada e filtrar dados por `req.user.id`.
- Consultar agenda por janela de tempo; usar índices, paginação e limites.
- Tratar integrações externas como complementares: falhas nelas não podem
  impedir o fluxo local de agenda.
- Não recriar endpoint de sugestões de horário.

## Agendamentos

- Criação e edição devem detectar sobreposição e responder `409` sem
  confirmação explícita.
- `allowConflict: true` só pode ser aceito após confirmação explícita no app.
- O app envia `serviceIds`; a API calcula `endAt` e preserva preço/duração dos
  serviços no instante do agendamento.

## Perfil operacional da cliente

- As rotas privadas do perfil sempre consultam por `req.user.id`; cliente
  inexistente e cliente de outra usuária respondem o mesmo `404`.
- `GET /clients/:id/profile` retorna somente o cadastro necessário, no máximo
  quatro próximos atendimentos e quatro históricos. A paginação posterior usa
  cursor opaco e `limit` inteiro de 1 a 20 (padrão 10).
- `status = canceled` e `archivedAt IS NOT NULL` ficam fora de todos os
  payloads do perfil, inclusive próximos e histórico.
- O DTO de atendimento é operacional: não incluir preço, sinal, campos Google
  Calendar, BLOBs ou Base64.
- `preferencesNotes` é interno: opcional, trimado, vazio como `null` e limitado
  a 2.000 caracteres. Pode ser usado no cadastro, edição e perfil, mas nunca
  em listagens ou sincronização de clientes.

## Fotos de clientes

- Durante o beta, `CLIENT_PHOTO_ENABLED` é default-off e só habilita foto para
  o valor literal `true`; a flag é proibida em produção beta. Sem opt-in, as
  três rotas respondem `404` genérico antes de ownership, Multer ou controller,
  e o perfil devolve metadados nulos sem consultar `client_photos`.
- As rotas `PUT`, `GET` e `DELETE /clients/:id/photo` são autenticadas e só
  operam no escopo `{ userId, clientId }`.
- Aceitar uma única imagem JPEG, PNG ou WebP de até 5 MiB e 16 megapixels;
  normalizar para WebP 512 × 512 e no máximo 512 KiB. Validar o conteúdo real,
  nunca nome ou extensão do arquivo.
- O JSON expõe somente `photoUrl` relativo e `photoUpdatedAt`; bytes/base64
  jamais entram em JSON, listagens ou sincronização.
- A resposta binária usa cache privado revalidável (`private, max-age=86400,
  must-revalidate`), `ETag` e `X-Content-Type-Options: nosniff`. Suportar
  `If-None-Match` com `304`.
- A persistência atual é PostgreSQL pela fronteira `clientPhotoStorage`. Uma
  troca futura por armazenamento S3-compatible não pode alterar rotas, DTOs ou
  semântica HTTP. Esta entrega não cria bucket, IAM, secrets ou lifecycle, pois
  o app beta ainda não consome foto.
- Escritas e remoções usam transação e lock `FOR UPDATE` na cliente, sempre
  escopados por usuária. Após conflito único, a transação PostgreSQL é abortada:
  fazer rollback e nunca retry dentro da mesma transação.
- O runtime atual usa `sharp@0.34.0`, com alerta HIGH no audit. Enquanto a foto
  está desligada, bloquear em profundidade `VipsForeignLoadNsgif`,
  `VipsForeignLoadTiff` e `VipsForeignLoadVips` no carregamento do processador.
  Esta mitigação não elimina a necessidade de Sharp corrigido.
- A ativação futura exige, conjuntamente, Node.js >= 20.9, Sharp corrigido,
  adaptador S3-compatible provisionado e entrega mobile específica. PostgreSQL
  atual é provisório e não é autorização de lançamento.

## Como revisar uma mudança

1. Confirmar que reduz atrito para a profissional e preserva o escopo do MVP.
2. Verificar autenticação, isolamento por usuário e validação de entrada.
3. Confirmar limites, índices, filtros e tamanho do payload.
4. Adicionar ou ajustar testes ao mudar contrato HTTP, validação ou regra de
   negócio.
5. Não registrar credenciais, tokens, URLs de banco ou outros secrets.
6. Executar migrações somente em ambiente local ou explicitamente descartável;
   nunca assumir autorização para produção.
