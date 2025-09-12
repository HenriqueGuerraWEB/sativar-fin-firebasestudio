# Guia de Instalação e Configuração Local

Este guia descreve os passos necessários para configurar e executar a aplicação Sativar Manager em seu ambiente de desenvolvimento local.

## Pré-requisitos

1.  **Node.js**: Certifique-se de que você tem o Node.js instalado (versão 18 ou superior).
2.  **npm** (ou **yarn**): Gerenciador de pacotes do Node.js.
3.  **Ambiente de Banco de Dados**: Você precisará de uma instância do MySQL. Escolha uma das opções abaixo.

---

## Opção 1: Configuração do Banco de Dados com Docker (Recomendado)

Esta é a abordagem mais simples e recomendada, pois isola o ambiente e gerencia o MySQL e uma interface gráfica (phpMyAdmin) automaticamente.

### 1. Pré-requisitos do Docker

*   **Docker** e **Docker Compose**: Certifique-se de que ambos estejam instalados em sua máquina.

### 2. Crie o arquivo `docker-compose.yml`

Na raiz do seu projeto, crie um arquivo chamado `docker-compose.yml` e cole o seguinte conteúdo:

```yaml
version: '3.8'

services:
  mysql-db:
    image: mysql:8.0
    container_name: sativar-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: sativar_db
      MYSQL_USER: sativar_user
      MYSQL_PASSWORD: sativar_password
    ports:
      - "3306:3306"
    volumes:
      - sativar_db_data:/var/lib/mysql

  phpmyadmin:
    image: phpmyadmin/phpmyadmin
    container_name: sativar-phpmyadmin
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      PMA_HOST: mysql-db
      PMA_PORT: 3306
      MYSQL_ROOT_PASSWORD: root_password
    depends_on:
      - mysql-db

volumes:
  sativar_db_data:
```

### 3. Inicie os Contêineres

Abra um terminal na raiz do projeto (onde você criou o `docker-compose.yml`) e execute:

```bash
docker-compose up -d
```

Este comando fará o download das imagens e iniciará os contêineres do MySQL e do phpMyAdmin em segundo plano.

### 4. Conecte-se ao Banco de Dados

*   **phpMyAdmin**: Para gerenciar o banco de dados visualmente, acesse `http://localhost:8080` no seu navegador. Use as seguintes credenciais:
    *   **Servidor**: `mysql-db`
    *   **Usuário**: `root`
    *   **Senha**: `root_password`
*   **Credenciais para a Aplicação**: Use os dados do `docker-compose.yml` para configurar seu arquivo `.env.local`.

---

## Opção 2: Configuração Manual do Banco de Dados MySQL

Use esta opção se você prefere instalar e gerenciar o MySQL diretamente em sua máquina.

1.  **Instalação do MySQL**: Instale o MySQL Server em seu sistema operacional.
2.  **Crie o Banco de Dados e as Tabelas**: Conecte-se à sua instância do MySQL e execute os scripts SQL fornecidos na seção "Configuração do Banco de Dados".

---

## 1. Instalação das Dependências da Aplicação

Independentemente da sua escolha de banco de dados, instale as dependências do projeto:

```bash
npm install
```

## 2. Configuração do Ambiente

Crie um arquivo chamado `.env.local` na raiz do projeto. Adicione as seguintes variáveis e preencha com as credenciais correspondentes ao seu ambiente (Docker ou Manual).

**Se estiver usando a configuração do Docker Compose acima, use estes valores:**
```env
# Configuração do Banco de Dados MySQL
DB_HOST=localhost
DB_USER=sativar_user
DB_PASSWORD=sativar_password
DB_NAME=sativar_db
DB_PORT=3306

# Habilita a conexão com o banco de dados.
# Mude para "true" para usar o MySQL ou "false" para usar o localStorage.
NEXT_PUBLIC_DATABASE_ENABLED=false
```

**Observação:** Se estiver usando uma instalação manual, substitua os valores pelas suas próprias credenciais.

## 3. Configuração da Estrutura do Banco de Dados (Passo Obrigatório)

**Importante:** A aplicação **não** cria as tabelas do banco de dados automaticamente. Você deve criá-las manualmente antes de executar a aplicação no modo MySQL.

Conecte-se à sua instância do MySQL (seja via phpMyAdmin em `http://localhost:8080` ou outra ferramenta) e execute os seguintes comandos SQL.

### 3.1. Criar o Banco de Dados

Se você não usou o Docker, crie o banco de dados primeiro:
```sql
CREATE DATABASE IF NOT EXISTS sativar_db;
USE sativar_db;
```
*(Se usou Docker, o banco `sativar_db` já foi criado).*

### 3.2. Criar as Tabelas

Execute os scripts abaixo para criar todas as tabelas necessárias para a aplicação.

```sql
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
  `name` VARCHAR(255) NOT NULL UNIQUE
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

## 5. Fluxo de Uso e Migração

1.  **Modo `localStorage`**: Com `NEXT_PUBLIC_DATABASE_ENABLED=false`, a aplicação usará o armazenamento local do navegador. Você pode adicionar clientes, planos, etc., e tudo funcionará normalmente. Os dados ficam salvos no seu navegador.
2.  **Migração para MySQL**:
    *   Quando estiver pronto para usar o banco de dados, certifique-se de que você já executou os scripts SQL da **Etapa 3**.
    *   Configure corretamente o arquivo `.env.local` com as credenciais do seu banco.
    *   Mude a variável `NEXT_PUBLIC_DATABASE_ENABLED` para `true`.
    *   Reinicie os servidores da aplicação (`dev` e `genkit:dev`).
    *   Acesse a aplicação e vá para a página **Configurações**.
    *   Clique no botão **"Testar Conexão"** para verificar se o backend consegue se comunicar com o banco de dados.
    *   Se o teste for bem-sucedido, o botão **"Iniciar Migração de Dados"** será habilitado. Clique nele para **transferir** os dados do `localStorage` para o MySQL. Se não houver dados, o processo apenas verificará a conexão e as tabelas.
    *   A partir deste ponto, a aplicação usará o MySQL como sua fonte de dados principal.

    