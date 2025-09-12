Vamos pensar em abstração. A grande vantagem do Next.js é que ele oferece as ferramentas para criar essa arquitetura de forma nativa, elegante e segura, sem a necessidade de um processo de backend completamente separado.
Aqui está uma explicação técnica e conceitual de como arquitetar essa solução no seu projeto Next.js, sem usar código.
Filosofia Central: O Backend Integrado do Next.js
Primeiro, é crucial entender que o Next.js não é apenas um framework de frontend. Ele é um framework full-stack. Isso significa que ele tem um "lado do servidor" e um "lado do cliente" que coexistem no mesmo projeto.
Lado do Cliente (Client-Side): É o que roda no navegador do usuário. Seus componentes React, interações de UI e o acesso ao localStorage vivem aqui.
Lado do Servidor (Server-Side): É o que roda na sua infraestrutura de hospedagem (Vercel, Hostinger, etc.). A conexão com o banco de dados, o uso de credenciais secretas e a lógica de negócio pesada vivem aqui.
Sua ideia de uma pasta /server é substituída, no mundo Next.js, pela pasta pages/api/ (ou app/api/ no App Router). Qualquer arquivo que você coloca ali se torna automaticamente um endpoint de API, um "mini-backend" cujo código é garantidamente executado apenas no servidor.
1. A Camada de Acesso a Dados (A Conexão Segura)
Esta camada é o nível mais baixo e vive exclusivamente no lado do servidor. Sua única responsabilidade é se comunicar com o banco de dados MySQL.
Módulo de Conexão com o Banco: Você criará um módulo de código (um arquivo, por exemplo, em lib/database.js ou server/db.js) que lida com a conexão MySQL.
Gerenciamento de Conexão (Pooling): Este módulo não abrirá uma nova conexão para cada pedido. Em vez disso, ele criará um "pool de conexões". Pense nisso como ter um conjunto de conexões pré-aprovadas prontas para uso. Quando uma requisição chega, ela pega uma conexão do pool, usa e a devolve. Isso é drasticamente mais performático e escalável.
Segurança das Credenciais: Este módulo será o único lugar em todo o seu projeto que lê diretamente as variáveis de ambiente sensíveis (DB_HOST, DB_PASSWORD, etc.). Como ele só roda no servidor, essas credenciais nunca, em hipótese alguma, são expostas ao navegador do usuário.
2. A Camada de Serviço (As API Routes)
Esta camada atua como uma ponte segura entre o cliente e o banco de dados. Ela define as operações de negócio que sua aplicação pode realizar.
Endpoints de API por Recurso: Dentro da pasta pages/api/, você criará endpoints que representam seus dados. Por exemplo, pages/api/clientes.js para lidar com clientes, pages/api/produtos.js para produtos, e assim por diante.
Lógica de Negócio no Servidor: Dentro de pages/api/clientes.js, você importará e usará o seu "Módulo de Conexão com o Banco". Se o navegador do usuário envia uma requisição GET para /api/clientes, este arquivo no servidor executará uma consulta SELECT * FROM clientes e retornará os resultados em formato JSON. Se envia uma requisição POST com os dados de um novo cliente, este arquivo executará um INSERT.
O Contrato de API: Essa camada define um "contrato" claro para o seu frontend. O frontend não precisa saber nada sobre tabelas MySQL ou SQL. Ele só precisa saber que, para obter clientes, deve fazer uma requisição para o endpoint /api/clientes.
3. A Camada de Abstração de Dados no Cliente (O Seletor de Modo)
Esta é a camada mais inteligente e a que realmente implementa o fallback para o localStorage. É um conjunto de funções que seus componentes React usarão para interagir com os dados, sem saber de onde eles vêm.
Módulo de Fonte de Dados (Data Source): Crie um módulo no lado do cliente (por exemplo, em services/dataService.js). Este arquivo exportará funções genéricas como getClientes(), salvarCliente(dadosDoCliente), deletarCliente(id).
O Interruptor de Controle: Dentro de cada uma dessas funções, a primeira coisa a ser feita é verificar a variável de ambiente pública: NEXT_PUBLIC_DATABASE_ENABLED.
Se for true: A função getClientes() fará uma requisição de rede (um fetch) para o seu próprio endpoint de API, /api/clientes. A função salvarCliente() fará uma requisição POST para o mesmo endpoint, e assim por diante. Ela delega todo o trabalho para a Camada de Serviço (API Routes).
Se for false: A função getClientes() irá ignorar a rede e, em vez disso, chamará a API localStorage.getItem('clientes') do navegador. A função salvarCliente() chamará localStorage.setItem('clientes', ...) e assim por diante.
Fluxo de Trabalho Completo de uma Requisição
Vamos imaginar que um componente React precise exibir uma lista de clientes.
Chamada do Componente: O componente React não acessa o localStorage nem faz um fetch diretamente. Em vez disso, ele chama a função getClientes() da sua "Camada de Abstração de Dados no Cliente".
A Decisão: A função getClientes() verifica a flag NEXT_PUBLIC_DATABASE_ENABLED.
Cenário A (Banco de Dados Ativado):
A função faz uma requisição GET para /api/clientes.
O Next.js direciona essa requisição para o arquivo pages/api/clientes.js no servidor.
O código do servidor usa o "Módulo de Conexão" para pegar uma conexão do pool e executar uma consulta SQL.
O banco de dados retorna os dados, o servidor os formata como JSON e os envia de volta como resposta à requisição.
A função getClientes() no cliente recebe o JSON e o retorna ao componente React, que então renderiza os dados.
Cenário B (Banco de Dados Desativado):
A função lê a chave "clientes" do localStorage do navegador.
Ela retorna os dados encontrados (ou um array vazio) diretamente para o componente React, que então renderiza os dados.
Dessa forma, seus componentes React ficam completamente desacoplados da lógica de armazenamento. Para mudar de localStorage para MySQL, você apenas altera uma variável de ambiente, e todo o sistema se adapta sem que você precise reescrever a lógica em nenhum outro lugar.