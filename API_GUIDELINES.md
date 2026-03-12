# Guia de desenvolvimento da API (Express + Postgres)

Este documento orienta decisões técnicas e de produto durante o desenvolvimento da API do **BeautyApp**.

## Visão geral

A API serve um aplicativo mobile de agenda simples para profissionais autônomos (ex.: lash designer, manicure, cabeleireira, esteticista).

Objetivo do produto: reduzir a fricção no dia a dia dessas profissionais, substituindo fluxos manuais com:
- WhatsApp
- Google Calendar
- calculadora
- controle mental de clientes e serviços

Não é um ERP.  
O foco é ser rápida, simples e confiável para fluxos reais do app.

## Filosofia de desenvolvimento

- Implementar apenas o que reduz atrito no uso do app.
- Priorizar respostas previsíveis e rápidas.
- Manter os modelos de domínio pequenos e objetivos.
- Evitar “features enterprise” que não impactam diretamente agendamento, clientes e serviços.

## Princípios de arquitetura

### Endpoints pequenos e específicos

Nunca usar endpoints genéricos e pesados.

- ✅ Preferir:
  - `GET /appointments?from=2026-03-10&to=2026-03-11`
- ❌ Evitar:
  - `GET /appointments` retornando tudo.

### Respostas enxutas

Cada tela do app deve receber apenas os campos necessários.

Exemplo de resposta ideal para appointment:
- `id`
- `start_at`
- `end_at`
- `client_name`
- `service_name`
- `price`
- `deposit_amount`
- `status`

### Performance

Consultas de agenda são frequentes e devem ser rápidas.

Regras obrigatórias:
- Usar índices adequados (ex.: `appointments(user_id, start_at)`).
- Consultar por janela de tempo (`from`, `to`) sempre que possível.
- Evitar `joins` desnecessários.
- Evitar retorno de listas grandes.
- Paginar quando necessário, por padrão.

### Responsividade mobile

O app usa atualização otimista, então:
- respostas devem ser rápidas;
- evitar operações síncronas longas;
- manter o fluxo principal estável mesmo com dependências lentas.

## Modelo de domínio (mínimo viável)

- `users`
- `clients`
- `services`
- `appointments`

Essas entidades devem permanecer simples e focadas em operações de agenda.

## Integrações externas

- Integrações como Google Calendar são complementares, não críticas.
- Se uma integração falhar, o fluxo principal (agenda local) continua funcionando.
- Processar integrações fora do fluxo principal sempre que possível (assíncrono, fila ou job).

## Objetivo final da API

- Rápida
- Simples
- Confiável
- Focada em agendamento

## Como usar este documento

Ao desenvolver ou revisar qualquer feature:
1. Validar se ela reduz fricção da profissional no dia a dia.
2. Verificar se os endpoints seguem o princípio de responsabilidade única e retorno mínimo.
3. Confirmar impacto de performance (índices, filtros por data, payload menor).
4. Garantir que falhas externas não quebram os fluxos centrais do app.
