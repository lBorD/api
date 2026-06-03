# Changelog

## 1.1.0 - 2026-06-03

- Adiciona integração Google Calendar mão única BeautyApp -> Google Calendar.
- Adiciona tabela `calendar_connections` e campo `appointments.googleCalendarId`.
- Adiciona endpoints protegidos para status, conexão e desconexão Google Calendar.
- Adiciona criptografia de tokens Google e sync complementar em criação, edição e cancelamento de agendamentos.
- Mantém agendamentos locais como fonte de verdade quando o Google Calendar falha.
