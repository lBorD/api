# API para o BeautyApp

Esta é a API para o **BeautyApp**, um sistema de gerenciamento de salão de beleza. Ela fornece endpoints para autenticação, cadastro de clientes, agendamentos e outras funcionalidades.

---

## Pré-requisitos

Antes de começar, certifique-se de que você tem os seguintes itens instalados e configurados:

1. **Node.js**: Versão 18.20.6 ou superior.
   - [Download do Node.js](https://nodejs.org/)

2. **MySQL**: Banco de dados utilizado pela API.
   - [Download do MySQL](https://dev.mysql.com/downloads/mysql/)

3. **Git** (opcional): Para clonar o repositório.
   - [Download do Git](https://git-scm.com/)

---

## Instalação

Siga os passos abaixo para configurar e rodar o projeto:

### 1. Clone o Repositório

Se você estiver usando Git, clone o repositório:

```bash
git clone https://github.com/seu-usuario/beautyapp-api.git
cd beautyapp-api
```

### 2. Instale as Dependências

Instale as dependências do projeto usando o npm:

```bash
npm install
```

### 3. Configure o Banco de Dados

Crie um banco de dados MySQL e configure as credenciais no arquivo `.env`:
Acesse o MySQL e crie o banco de dados:

```sql
mysql -u root -p
```

```sql
CREATE DATABASE beautyapp;
exit;
```

```env
DB_NAME=beautyapp
DB_USER=seu-usuario
DB_PASSWORD=sua-senha
DB_HOST=localhost
DB_DIALECT=mysql
```

### 4. Execute as Migrações

Execute as migrações para criar as tabelas no banco de dados:

```bash
npx sequelize db:migrate
```

### 5. Inicie o Servidor

Inicie o servidor da API:

```bash
npm run start
```

A API estará disponível em `http://localhost:3000`.

---

## Contribuição

Se você deseja contribuir com o projeto, por favor, siga as diretrizes de contribuição e envie um pull request.

---

## Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.