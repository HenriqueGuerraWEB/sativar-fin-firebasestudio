
# Guia de Instalação e Configuração Local

Este guia descreve os passos necessários para configurar e executar a aplicação Sativar Manager em seu ambiente de desenvolvimento local.

## Pré-requisitos

1.  **Node.js**: Certifique-se de que você tem o Node.js instalado (versão 18 ou superior).
2.  **npm** (ou **yarn**): Gerenciador de pacotes do Node.js.
3.  **Banco de Dados MySQL**: Uma instância do MySQL rodando localmente ou em um servidor acessível.

## 1. Instalação das Dependências

Clone o repositório do projeto e instale as dependências necessárias executando o seguinte comando no terminal, na raiz do projeto:

```bash
npm install
```

## 2. Configuração do Ambiente

Crie um arquivo chamado `.env.local` na raiz do projeto, copiando o conteúdo do arquivo `.env` (que está vazio). Este arquivo armazenará suas variáveis de ambiente locais.

Adicione as seguintes variáveis ao `.env.local`:

```env
# Configuração do Banco de Dados MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha_aqui
DB_NAME=sativar_db
DB_PORT=3306

# Habilita a conexão com o banco de dados.
# Mude para "true" para usar o MySQL ou "false" para usar o localStorage.
NEXT_PUBLIC_DATABASE_ENABLED=false
```

**Observações:**
*   Substitua `sua_senha_aqui` pela senha do seu usuário `root` do MySQL ou por um usuário que você tenha criado.
*   O `DB_NAME` deve ser o nome do banco de dados que você criará na próxima etapa.

## 3. Configuração do Banco de Dados MySQL

Conecte-se à sua instância do MySQL e execute os seguintes comandos SQL para criar o banco de dados e as tabelas necessárias para a aplicação.

### 3.1. Criar o Banco de Dados

```sql
CREATE DATABASE IF NOT EXISTS sativar_db;
USE sativar_db;
```

### 3.2. Criar as Tabelas

Execute os scripts abaixo para criar as tabelas do sistema.

```sql
-- Tabela de Usuários (para autenticação)
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(255) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL
);

-- Tabela de Planos
CREATE TABLE IF NOT EXISTS `plans` (
  `id` VARCHAR(255) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `price` DECIMAL(10, 2) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `recurrenceValue` INT,
  `recurrencePeriod` VARCHAR(50)
);

-- Tabela de Categorias de Despesas
CREATE TABLE IF NOT EXISTS `expense_categories` (
  `id` VARCHAR(255) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL
);

-- Tabela de Despesas
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` VARCHAR(255) PRIMARY KEY,
  `description` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `due_date` DATETIME,
  `status` VARCHAR(50) NOT NULL,
  `category_id` VARCHAR(255),
  FOREIGN KEY (`category_id`) REFERENCES `expense_categories`(`id`) ON DELETE SET NULL
);

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS `clients` (
  `id` VARCHAR(255) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `tax_id` VARCHAR(50),
  `contact_name` VARCHAR(255),
  `email` VARCHAR(255),
  `phone` VARCHAR(50),
  `whatsapp` VARCHAR(50),
  `notes` TEXT,
  `status` VARCHAR(50),
  `created_at` DATETIME,
  `plans` JSON
);

-- Tabela de Faturas
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` VARCHAR(255) PRIMARY KEY,
  `client_id` VARCHAR(255),
  `plan_id` VARCHAR(255),
  `client_name` VARCHAR(255),
  `plan_name` VARCHAR(255),
  `amount` DECIMAL(10, 2) NOT NULL,
  `issue_date` DATETIME,
  `due_date` DATETIME,
  `status` VARCHAR(50),
  `payment_date` DATETIME,
  `payment_method` VARCHAR(50),
  `payment_notes` TEXT,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE SET NULL
);

-- Tabela de Configurações da Empresa
CREATE TABLE IF NOT EXISTS `company_settings` (
  `id` VARCHAR(255) PRIMARY KEY,
  `name` VARCHAR(255),
  `cpf` VARCHAR(50),
  `cnpj` VARCHAR(50),
  `address` TEXT,
  `phone` VARCHAR(50),
  `email` VARCHAR(255),
  `website` VARCHAR(255),
  `logo` LONGTEXT
);

-- Tabela de Tarefas
CREATE TABLE IF NOT EXISTS `tasks` (
    `id` VARCHAR(255) PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `due_date` DATETIME NOT NULL,
    `status` VARCHAR(50) NOT NULL,
    `user_id` VARCHAR(255),
    `related_client_id` VARCHAR(255),
    `parent_id` VARCHAR(255),
    FOREIGN KEY (`related_client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`parent_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE
);

-- Tabela da Base de Conhecimento
CREATE TABLE IF NOT EXISTS `knowledge_base_articles` (
    `id` VARCHAR(255) PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `category` VARCHAR(255),
    `icon` VARCHAR(255),
    `content` JSON,
    `metadata` JSON,
    `authorId` VARCHAR(255),
    `createdAt` DATETIME,
    `updatedAt` DATETIME
);
```

## 4. Executando a Aplicação

Para iniciar o servidor de desenvolvimento do Next.js, use o comando:

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:9002`.

Para rodar o servidor de desenvolvimento do Genkit (necessário para os fluxos de API), abra um novo terminal e execute:

```bash
npm run genkit:dev
```

## 5. Fluxo de Uso

1.  **Modo `localStorage`**: Com `NEXT_PUBLIC_DATABASE_ENABLED=false`, a aplicação usará o armazenamento local do navegador. Você poderá adicionar clientes, planos, etc., e tudo funcionará normalmente.
2.  **Migração para MySQL**:
    *   Quando estiver pronto para usar o banco de dados, preencha as credenciais do MySQL no arquivo `.env.local`.
    *   Mude a variável `NEXT_PUBLIC_DATABASE_ENABLED` para `true`.
    *   Reinicie a aplicação.
    *   Vá para a página **Configurações**.
    *   Clique no botão **"Testar Conexão"** para verificar se o backend consegue se comunicar com o banco.
    *   Se o teste for bem-sucedido, o botão **"Iniciar Migração de Dados"** será habilitado.
    *   Clique nele para enviar todos os dados que estavam no `localStorage` para o seu banco de dados MySQL.
    *   A partir deste ponto, a aplicação usará o MySQL como sua fonte de dados principal.
