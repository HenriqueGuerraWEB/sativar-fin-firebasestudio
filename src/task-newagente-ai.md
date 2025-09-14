# Guia de Handover e Documentação do Projeto Sativar

## 1. Visão Geral do Projeto

**Objetivo:** Sativar é uma aplicação de gerenciamento para pequenos negócios, permitindo o controle de clientes, planos de serviço, faturas e despesas.

**Tech Stack:**
*   **Frontend:** Next.js (App Router), React, TypeScript
*   **Backend (Server Actions):** Genkit (para orquestração de fluxos de API)
*   **Banco de Dados:** MySQL

---

## 2. Arquitetura Principal: Dual Storage (localStorage e MySQL)

A característica central da aplicação é seu sistema de armazenamento duplo, orquestrado pelo `StorageService` (`src/lib/storage-service.ts`).

*   **Como funciona:** Uma variável de ambiente, `NEXT_PUBLIC_DATABASE_ENABLED`, atua como um interruptor.
    *   **`false` (padrão):** Todas as operações de dados (criar, ler, atualizar, deletar) são direcionadas para o `LocalStorageService`, que usa o `localStorage` do navegador. Isso permite que a aplicação funcione de forma autônoma para demonstrações ou uso offline.
    *   **`true`:** As operações são direcionadas para o `ApiService`, que por sua vez chama os fluxos do Genkit (Server Actions) no backend, que interagem com o banco de dados MySQL.

*   **Fluxo de Migração:** A página de **Configurações** contém a lógica para migrar os dados do `localStorage` para o MySQL.
    1.  O usuário primeiro testa a conexão com o banco de dados.
    2.  Se o teste for bem-sucedido, o botão "Iniciar Migração de Dados" é habilitado.
    3.  Ao clicar, a aplicação coleta todos os dados do `localStorage`, os envia para o fluxo `migrateDataFlow` no backend, que então os insere no banco de dados.

---

## 3. Estado Atual e Problemas Conhecidos

A base do sistema está implementada, mas a funcionalidade de persistência de dados (salvar no banco de dados) está incompleta.

*   **Entidades Funcionais com MySQL:** `Clients` e `Plans` estão 100% funcionais. Suas páginas podem ler e escrever no banco de dados quando `NEXT_PUBLIC_DATABASE_ENABLED=true`.
*   **Entidades Não Funcionais com MySQL:** As páginas `Financeiro` e `Faturas` **não estão** conectadas ao banco de dados. Elas ainda operam exclusivamente com `localStorage`, mesmo quando o modo MySQL está ativo. Isso ocorre porque os fluxos de API (backend) para `Invoices`, `Expenses` e `ExpenseCategories` ainda não foram criados.
*   **Migração Incompleta:** O fluxo `migrateDataFlow` atualmente só processa `clients`, `plans` e `company_settings`. Ele precisa ser atualizado para também migrar `invoices`, `expenses` e `expense_categories`.

---

## 4. Roteiro para Finalização do Projeto

Para que a aplicação se torne totalmente funcional, o novo engenheiro precisa seguir estes passos:

### Passo 1: Implementar os Fluxos de API para as Entidades Restantes

Assim como foi feito para `plans-flow.ts` e `clients-flow.ts`, é necessário criar os fluxos de backend para as entidades que faltam.

*   **`invoices-flow.ts`:**
    *   `getInvoices`, `addInvoice`, `updateInvoice`, `deleteInvoice`.
    *   As funções devem executar as consultas SQL correspondentes na tabela `invoices`.
*   **`expenses-flow.ts`:**
    *   `getExpenses`, `addExpense`, `updateExpense`, `deleteExpense`.
*   **`expense-categories-flow.ts`:**
    *   `getExpenseCategories`, `addExpenseCategory`, `updateExpenseCategory`, `deleteExpenseCategory`.

### Passo 2: Atualizar o `api-service.ts`

O arquivo `src/lib/api-service.ts` precisa ser atualizado para chamar os novos fluxos criados no Passo 1. Adicione os `case` para `invoices`, `expenses`, e `expenseCategories` dentro de cada função (`getCollection`, `addItem`, etc.).

### Passo 3: Atualizar o Fluxo de Migração (`data-migration-flow.ts`)

Adicione a lógica SQL dentro de `migrateDataFlow` para inserir `invoices`, `expenses`, e `expense_categories` no banco de dados, seguindo o mesmo padrão `INSERT ... ON DUPLICATE KEY UPDATE` já usado para `clients` e `plans`.

### Passo 4: Refatorar as Páginas do Frontend

As páginas `Financeiro` e `Faturas` e os hooks associados (`useInvoices`, `useExpenses`) precisam ser refatorados para se tornarem assíncronos e consumirem os dados do `StorageService`, assim como já foi feito para `useClients` e `usePlans`.

---

## 5. Guia de Instalação e Configuração Local

### Opção 1: Usar Docker (Recomendado)

1.  **Pré-requisitos:** Docker e Docker Compose instalados.
2.  **Crie o `docker-compose.yml`:** Na raiz do projeto, crie um arquivo `docker-compose.yml` com o conteúdo abaixo:
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
3.  **Inicie os Contêineres:** `docker-compose up -d`
4.  **Acesse o phpMyAdmin:** `http://localhost:8080` (Usuário: `root`, Senha: `root_password`, Servidor: `mysql-db`).

### Opção 2: Usar uma Instalação Manual do MySQL

1.  Instale e execute o MySQL Server na sua máquina.
2.  Crie um banco de dados (ex: `sativar_db`) e um usuário com as devidas permissões.

### Configuração da Aplicação

1.  **Instale as dependências:** `npm install`
2.  **Configure o `.env.local`:** Crie o arquivo `.env.local` na raiz do projeto.
    ```env
    # Use as credenciais do seu ambiente (Docker ou manual)
    DB_HOST=localhost
    DB_USER=sativar_user
    DB_PASSWORD=sativar_password
    DB_NAME=sativar_db
    DB_PORT=3306

    # Mude para "true" para usar o MySQL ou "false" para usar o localStorage.
    NEXT_PUBLIC_DATABASE_ENABLED=false
    ```
3.  **Crie as Tabelas do Banco de Dados (Passo Obrigatório):** Conecte-se ao seu banco de dados (via phpMyAdmin ou outra ferramenta) e execute o script SQL abaixo. **A aplicação não cria as tabelas automaticamente.**
    ```sql
    CREATE DATABASE IF NOT EXISTS sativar_db;
    USE sativar_db;

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
    
    -- Tabela de Tarefas
    CREATE TABLE IF NOT EXISTS `tasks` (
        `id` VARCHAR(255) PRIMARY KEY,
        `title` VARCHAR(255) NOT NULL,
        `description` TEXT,
        `due_date` DATETIME NOT NULL,
        `status` VARCHAR(50) NOT NULL,
        `user_id` VARCHAR(255),
        `related_client_id` VARCHAR(255),
        FOREIGN KEY (`related_client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL
    );

    ```
4.  **Execute a Aplicação:**
    *   Terminal 1 (Frontend): `npm run dev` (acessível em `http://localhost:9002`)
    *   Terminal 2 (Backend): `npm run genkit:dev`

Com esta documentação, um novo desenvolvedor terá uma visão clara do projeto, dos problemas e de como resolvê-los.
