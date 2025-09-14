PS F:\SATIVAR\sistema_gestao_sativar_firebase\sativar-fin-firebasestudio> npm start

> nextn@0.1.0 start
> next start

   ▲ Next.js 15.3.3
   - Local:        http://localhost:3000
   - Network:      http://192.168.0.101:3000

 ✓ Starting...
 ✓ Ready in 4.4s
Successfully created MySQL connection pool.
[API] clients.ts loaded
Successfully created MySQL connection pool.
[TASKS_FLOW] Fetching all tasks from database...
Executing query: SELECT * FROM tasks ORDER BY due_date ASC with params: []
Query executed successfully.
Database connection released.
[TASKS_FLOW] Fetching notification tasks...
Executing query:
        SELECT * FROM tasks
        WHERE status != 'Concluída' AND DATE(due_date) <= ?
        ORDER BY due_date ASC
     with params: ["2025-09-14"]
Query executed successfully.
Database connection released.
[SETTINGS_FLOW] Fetching company settings from database...
Executing query: SELECT * FROM company_settings WHERE id = ? with params: ["single-settings"]
Query executed successfully.
Database connection released.
[CLIENTS_FLOW] Fetching all clients from database...
Executing query: SELECT * FROM clients ORDER BY created_at DESC with params: []
Query executed successfully.
Database connection released.
[INVOICES_FLOW] Fetching all invoices from database...
Executing query: SELECT * FROM invoices ORDER BY issue_date DESC with params: []
Query executed successfully.
Database connection released.
[EXPENSES_FLOW] Fetching all expenses from database...
Executing query: SELECT * FROM expenses ORDER BY due_date DESC with params: []
Query executed successfully.
Database connection released.
[KB_FLOW] Fetching all articles from database...
Executing query: SELECT id, title, metadata, authorId, createdAt, updatedAt FROM knowledge_base_articles ORDER BY updatedAt DESC with params: []
Query executed successfully.
Database connection released.
[TASKS_FLOW] Fetching all tasks from database...
Executing query: SELECT * FROM tasks ORDER BY due_date ASC with params: []
Query executed successfully.
Database connection released.
[TASKS_FLOW] Fetching notification tasks...
Executing query:
        SELECT * FROM tasks
        WHERE status != 'Concluída' AND DATE(due_date) <= ?
        ORDER BY due_date ASC
     with params: ["2025-09-14"]
Query executed successfully.
Database connection released.
[SETTINGS_FLOW] Fetching company settings from database...
Executing query: SELECT * FROM company_settings WHERE id = ? with params: ["single-settings"]
Query executed successfully.
Database connection released.
[KB_FLOW] Fetching all articles from database...
Executing query: SELECT id, title, metadata, authorId, createdAt, updatedAt FROM knowledge_base_articles ORDER BY updatedAt DESC with params: []
Query executed successfully.
Database connection released.
[KB_FLOW] Adding new article to database...
Executing query: INSERT INTO knowledge_base_articles (id, title, content, metadata, authorId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?) with params: ["bb90084c-4a14-4d3d-8d38-21298853908e","Artigo sem Título","[]","{}","sunrise.henrique@gmail.com","2025-09-14 12:25:44","2025-09-14 12:25:44"]
Query executed successfully.
Database connection released.
[KB_FLOW] Fetching all articles from database...
Executing query: SELECT id, title, metadata, authorId, createdAt, updatedAt FROM knowledge_base_articles ORDER BY updatedAt DESC with params: []
Query executed successfully.
Database connection released.

ApiService: Fetching collection sativar-users...
1637-bb08f0c4d66ab6c3.js:1 ApiService: No getCollection handler for sativar-users
getCollection @ 1637-bb08f0c4d66ab6c3.js:1
1637-bb08f0c4d66ab6c3.js:1 ApiService: Fetching collection tasks...
1637-bb08f0c4d66ab6c3.js:1 ApiService: Fetching item single-settings from company-settings...
1637-bb08f0c4d66ab6c3.js:1 ApiService: Fetching collection knowledge-base-articles...
6989-5056d2382a4fd268.js:1 Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'ReactCurrentOwner')
    at 6989-5056d2382a4fd268.js:1:187630
    at 30343 (6989-5056d2382a4fd268.js:1:188041)
    at r (webpack-89b4be593f855436.js:1:143)
    at 47366 (page-2b21b24ad0742324.js:1:1381)
    at r (webpack-89b4be593f855436.js:1:143)
6989-5056d2382a4fd268.js:1 Uncaught TypeError: Cannot read properties of undefined (reading 'ReactCurrentOwner')
    at 6989-5056d2382a4fd268.js:1:187630
    at 30343 (6989-5056d2382a4fd268.js:1:188041)
    at r (webpack-89b4be593f855436.js:1:143)
    at 47366 (page-2b21b24ad0742324.js:1:1381)
    at r (webpack-89b4be593f855436.js:1:143)
    at c (1684-2fe0e0bbf1a5e226.js:1:155308)
    at D (1684-2fe0e0bbf1a5e226.js:1:157993)
    at x (1684-2fe0e0bbf1a5e226.js:1:157186)
    at 1684-2fe0e0bbf1a5e226.js:1:167781