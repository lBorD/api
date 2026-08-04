# Changelog

## 1.3.0 - 2026-08-03

- Adiciona o contrato autenticado de perfil operacional da cliente, com
  preferências internas, próximos atendimentos e histórico paginado por cursor.
- Adiciona foto privada de cliente com normalização WebP, cache privado por
  `ETag` e persistência atual em PostgreSQL atrás de uma fronteira preparada
  para armazenamento S3-compatible futuro.
- Mantém cancelados e arquivados fora do perfil e documenta limites, DTOs,
  isolamento por usuária, transação e lock das operações de foto.
- Documenta que não há bucket, IAM ou secrets provisionados e que o app beta
  ainda não consome as rotas de foto.

## 1.1.1 - 2026-07-16

- Adiciona `GET /health` público e sem dependências externas para monitoramento da API.
- Documenta a configuração de keep-alive no UptimeRobot para o deploy no Render.

## 1.1.0 - 2026-06-03

- Adiciona integração Google Calendar mão única BeautyApp -> Google Calendar.
- Adiciona tabela `calendar_connections` e campo `appointments.googleCalendarId`.
- Adiciona endpoints protegidos para status, conexão e desconexão Google Calendar.
- Adiciona criptografia de tokens Google e sync complementar em criação, edição e cancelamento de agendamentos.
- Mantém agendamentos locais como fonte de verdade quando o Google Calendar falha.
