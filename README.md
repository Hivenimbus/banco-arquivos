# 🗂️ Hive Storage - Sistema de Armazenamento de Arquivos

Um sistema completo de gerenciamento de arquivos de mídia com API RESTful e interface web moderna.

## 🚀 Características

- ✅ Upload de arquivos com suporte a múltiplos formatos
- 🔐 **Autenticação por API Key**
- 👥 Organização por usuários
- 🔍 Busca e filtros avançados
- 📊 Estatísticas de armazenamento
- 🎨 Interface web moderna e responsiva
- 📱 Suporte a drag & drop
- 🔗 URLs amigáveis para arquivos
- 🛡️ CORS configurável

## 🔧 Instalação

1. **Clone o repositório:**
   ```bash
   git clone <url-do-repositorio>
   cd banco-arquivos
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```
   
   Edite o arquivo `.env` e configure sua API Key:
   ```env
   API_KEY=sua-api-key-segura-aqui
   ```

4. **Inicie o servidor:**
   ```bash
   npm start
   ```

5. **Acesse a aplicação:**
   - Interface Web: http://localhost:3000
   - API: http://localhost:3000/api

## 🔐 Autenticação

**IMPORTANTE:** Todos os endpoints da API (exceto `/api/health`) requerem autenticação via API Key.

### Configuração da API Key

1. Defina a variável `API_KEY` no arquivo `.env`
2. Use a API Key em suas requisições:

**Header HTTP (recomendado):**
```bash
curl -H "x-api-key: sua-api-key" http://localhost:3000/api/stats
```

**Query Parameter:**
```bash
curl "http://localhost:3000/api/stats?apikey=sua-api-key"
```

## 📚 Documentação

- [📖 Documentação da API](./API_DOCUMENTATION.md)
- [💡 Exemplos de Uso](./API_EXAMPLES.md)

## 🛠️ Tecnologias

- **Backend:** Node.js, Express.js
- **Upload:** Multer
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Armazenamento:** Sistema de arquivos + JSON
- **Autenticação:** API Key

## 📁 Estrutura do Projeto

```
banco-arquivos/
├── data/                 # Arquivos de mídia organizados por usuário
├── public/              # Interface web
│   ├── index.html
│   ├── script.js
│   └── style.css
├── routes/
│   └── api.js           # Rotas da API
├── index.js             # Servidor principal
├── .env                 # Configurações (não versionado)
├── .env.example         # Exemplo de configurações
└── README.md
```

## 🔒 Segurança

- ✅ Autenticação obrigatória via API Key
- ✅ Validação de tipos de arquivo
- ✅ Limite de tamanho de upload (100MB)
- ✅ Validação de UUID para IDs
- ✅ CORS configurável

## 🚀 Deploy

1. Configure as variáveis de ambiente em produção
2. Use uma API Key forte e segura
3. Configure CORS para suas origens específicas
4. Considere usar HTTPS em produção

## 📄 Licença

Este projeto está sob a licença MIT.