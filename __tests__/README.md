# Testes da API BeautyApp

Este diretório contém todos os testes da API, organizados por tipo e funcionalidade.

## Estrutura dos Testes

```
__tests__/
├── controllers/           # Testes unitários dos controladores
│   ├── userRegister.test.js
│   ├── login.test.js
│   └── client.test.js
├── middlewares/          # Testes unitários dos middlewares
│   └── validateClient.test.js
├── utils/               # Testes unitários dos utilitários
│   ├── phoneValidator.test.js
│   └── emailValidator.test.js
├── routes/              # Testes de integração das rotas
│   ├── authRoutes.test.js
│   └── clientRoutes.test.js
├── integration/         # Testes de integração do servidor
│   └── server.test.js
├── run-tests.js         # Script para executar testes
└── README.md           # Esta documentação
```

## Tipos de Testes

### 1. Testes Unitários
- **Controladores**: Testam a lógica de negócio dos controladores
- **Middlewares**: Testam a validação e processamento de requisições
- **Utilitários**: Testam funções auxiliares como validação de email e telefone

### 2. Testes de Integração
- **Rotas**: Testam o comportamento das rotas HTTP
- **Servidor**: Testam a integração completa do servidor

## Como Executar os Testes

### Comandos Disponíveis

```bash
# Executar todos os testes
npm test

# Executar apenas testes unitários
npm run test:unit

# Executar apenas testes de integração
npm run test:integration

# Executar testes com cobertura
npm run test:coverage

# Executar testes em modo watch
npm run test:watch

# Executar testes para CI/CD
npm run test:ci
```

### Usando o Script Personalizado

```bash
# Executar todos os testes
node __tests__/run-tests.js

# Executar apenas testes unitários
node __tests__/run-tests.js --unit

# Executar apenas testes de integração
node __tests__/run-tests.js --integration

# Executar testes com cobertura
node __tests__/run-tests.js --coverage

# Executar testes em modo watch
node __tests__/run-tests.js --watch
```

## Cobertura de Testes

O projeto está configurado para exigir uma cobertura mínima de 70% para:
- Branches (ramificações de código)
- Functions (funções)
- Lines (linhas de código)
- Statements (declarações)

### Visualizar Cobertura

Após executar `npm run test:coverage`, você pode visualizar o relatório de cobertura em:
- Terminal: Resumo no console
- HTML: Abrir `coverage/lcov-report/index.html` no navegador

## Configuração dos Testes

### Jest Configuration
- **Ambiente**: Node.js
- **Transformações**: Nenhuma (ES modules)
- **Cobertura**: Ativada com relatórios HTML e LCOV
- **Setup**: `jest.setup.js` para configuração de ambiente

### Mocks
- **Sequelize**: Mockado para evitar conexões com banco de dados
- **Bibliotecas externas**: bcrypt, jsonwebtoken, libphonenumber-js
- **Modelos**: User e Client mockados

## Padrões de Teste

### Estrutura dos Testes
```javascript
describe('Nome do Módulo', () => {
  beforeEach(() => {
    // Setup antes de cada teste
    jest.clearAllMocks();
  });

  describe('Nome da Função', () => {
    it('deve fazer algo específico', async () => {
      // Arrange
      const input = 'dados de teste';
      
      // Act
      const result = await functionToTest(input);
      
      // Assert
      expect(result).toEqual(expectedOutput);
    });
  });
});
```

### Convenções de Nomenclatura
- **Arquivos**: `nomeDoModulo.test.js`
- **Describes**: Nome do módulo ou funcionalidade
- **Tests**: Descrição do comportamento esperado em português
- **Variáveis**: Nomes descritivos em português

### Assertions Comuns
```javascript
// Verificar igualdade
expect(result).toEqual(expected);

// Verificar propriedades
expect(response.body).toHaveProperty('token');

// Verificar chamadas de mock
expect(mockFunction).toHaveBeenCalledWith(expectedArgs);

// Verificar status HTTP
expect(response.status).toBe(200);

// Verificar erros
expect(response.body).toEqual({ error: 'Mensagem de erro' });
```

## Debugging de Testes

### Modo Debug
```bash
# Executar teste específico com debug
node --inspect-brk node_modules/.bin/jest --runInBand nomeDoTeste.test.js
```

### Logs de Debug
```javascript
// Adicionar logs temporários
console.log('Debug:', response.body);
```

### Testes Focados
```javascript
// Executar apenas um teste
it.only('deve fazer algo específico', () => {
  // teste
});

// Pular um teste
it.skip('deve fazer algo específico', () => {
  // teste
});
```

## Boas Práticas

1. **Isolamento**: Cada teste deve ser independente
2. **Limpeza**: Sempre limpar mocks entre testes
3. **Descrições**: Usar descrições claras e em português
4. **Arrange-Act-Assert**: Seguir o padrão AAA
5. **Mocks**: Mockar dependências externas
6. **Cobertura**: Manter cobertura acima de 70%

## Troubleshooting

### Problemas Comuns

1. **Erro de módulo não encontrado**
   - Verificar se o caminho do import está correto
   - Verificar se o arquivo existe

2. **Erro de mock não funcionando**
   - Verificar se o mock está sendo importado corretamente
   - Verificar se `jest.clearAllMocks()` está sendo chamado

3. **Erro de timeout**
   - Verificar se async/await está sendo usado corretamente
   - Verificar se promises estão sendo resolvidas

4. **Erro de cobertura baixa**
   - Verificar se todos os caminhos de código estão sendo testados
   - Adicionar testes para casos edge

### Logs Úteis
```bash
# Executar com logs detalhados
npm test -- --verbose

# Executar teste específico
npm test -- nomeDoArquivo.test.js

# Executar com logs de Jest
DEBUG=jest* npm test
``` 