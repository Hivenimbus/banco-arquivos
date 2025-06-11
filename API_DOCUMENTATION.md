# 📚 Hive Storage API Documentation

## 🚀 Visão Geral

A **Hive Storage API** é uma API RESTful para gerenciamento de arquivos de mídia. Ela permite upload, listagem, busca, atualização e exclusão de arquivos com suporte a diferentes tipos de mídia.

**Base URL:** `http://localhost:3000/api`

---

## 🔐 Autenticação

Todos os endpoints da API (exceto `/api/health`) requerem autenticação via **API Key**.

### Como usar a API Key

Você pode fornecer a API Key de duas formas:

1. **Header HTTP** (recomendado):
   ```
   x-api-key: sua-api-key-aqui
   ```

2. **Query Parameter**:
   ```
   GET /api/stats?apikey=sua-api-key-aqui
   ```

### Configuração

A API Key é configurada através da variável de ambiente `API_KEY` no arquivo `.env`:

```env
API_KEY=sua-api-key-segura
```

Se não configurada, a API usará a chave padrão: `hive-storage-default-key`

### Respostas de Erro de Autenticação

**401 - API Key não fornecida:**
```json
{
  "status": "error",
  "message": "API Key é obrigatória. Forneça a chave via header 'x-api-key' ou query parameter 'apikey'.",
  "error": "MISSING_API_KEY"
}
```

**403 - API Key inválida:**
```json
{
  "status": "error",
  "message": "API Key inválida.",
  "error": "INVALID_API_KEY"
}
```

---

## 📋 Índice

- [Autenticação](#autenticação)
- [Status e Saúde](#status-e-saúde)
- [Estatísticas](#estatísticas)
- [Gerenciamento de Mídia](#gerenciamento-de-mídia)
- [Códigos de Resposta](#códigos-de-resposta)
- [Exemplos de Uso](#exemplos-de-uso)

---

## 🔍 Status e Saúde

### GET /api/health
Verifica se a API está funcionando.

**Resposta:**
```json
{
  "status": "success",
  "message": "Hive Storage API is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

---

## 📊 Estatísticas

### GET /api/stats
Retorna estatísticas do armazenamento.

**Resposta:**
```json
{
  "status": "success",
  "data": {
    "totalFiles": 25,
    "totalSize": 52428800,
    "totalSizeFormatted": "50 MB",
    "fileTypes": {
      "image": 15,
      "video": 8,
      "audio": 2
    },
    "lastUpload": "2024-01-15T10:25:00.000Z"
  }
}
```

---

## 👥 Gerenciamento de Usuários

### GET /api/users
Lista todos os usuários/pastas com estatísticas.

**Resposta (200):**
```json
{
  "status": "success",
  "data": [
    {
      "username": "joao",
      "mediaCount": 15,
      "totalSize": 52428800,
      "totalSizeFormatted": "50 MB",
      "lastUpload": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### GET /api/users/:username/media
Lista todas as mídias de um usuário específico com opções de filtro.

**Parâmetros:**
- `username` (string): Nome do usuário

**Query Parameters:**
- `type` (string): Filtrar por tipo (image, video, audio, application)
- `page` (number): Número da página (padrão: 1)
- `limit` (number): Itens por página (padrão: 20, máximo: 100)
- `search` (string): Buscar nos nomes dos arquivos
- `sort` (string): Ordenar por campo (createdAt, name, size) (padrão: createdAt)
- `order` (string): Ordem de classificação (asc, desc) (padrão: desc)

**Resposta (200):**
```json
{
  "status": "success",
  "data": [...],
  "pagination": {...},
  "user": "joao"
}
```

## 🎯 Gerenciamento de Mídia

### POST /api/media
Faz upload de um novo arquivo de mídia.

**Content-Type:** `multipart/form-data`

**Parâmetros:**
- `mediaFile` (file, obrigatório): O arquivo a ser enviado
- `username` (string, obrigatório): Nome do usuário/pasta
- `displayName` (string, opcional): Nome personalizado para exibição

**Exemplo de requisição:**
```bash
curl -X POST \
  http://localhost:3000/api/media \
  -F "mediaFile=@imagem.jpg" \
  -F "username=joao" \
  -F "displayName=Minha Foto Especial"
```

**Resposta (201):**
```json
{
  "status": "success",
  "message": "Arquivo enviado com sucesso.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user": "joao",
    "originalName": "imagem.jpg",
    "displayName": "Minha Foto Especial",
    "filename": "550e8400-e29b-41d4-a716-446655440000.jpg",
    "mimetype": "image/jpeg",
    "size": 1048576,
    "sizeFormatted": "1 MB",
    "url": "/media/550e8400-e29b-41d4-a716-446655440000/Minha%20Foto%20Especial.jpg",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### GET /api/media
Lista todos os arquivos de mídia com opções de filtro, busca e paginação.

**Query Parameters:**
- `type` (string): Filtrar por tipo (image, video, audio, application)
- `user` (string): Filtrar por usuário
- `page` (number): Número da página (padrão: 1)
- `limit` (number): Itens por página (padrão: 20, máximo: 100)
- `search` (string): Buscar nos nomes dos arquivos
- `sort` (string): Ordenar por campo (createdAt, name, size) (padrão: createdAt)
- `order` (string): Ordem de classificação (asc, desc) (padrão: desc)

**Exemplos:**
```bash
# Listar todas as mídias
GET /api/media

# Filtrar apenas imagens
GET /api/media?type=image

# Buscar por nome
GET /api/media?search=foto

# Paginação
GET /api/media?page=2&limit=10

# Ordenar por tamanho (crescente)
GET /api/media?sort=size&order=asc
```

**Resposta (200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "originalName": "imagem.jpg",
      "displayName": "Minha Foto Especial",
      "mimetype": "image/jpeg",
      "size": 1048576,
      "sizeFormatted": "1 MB",
      "url": "/media/550e8400-e29b-41d4-a716-446655440000/Minha%20Foto%20Especial.jpg",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 25,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### GET /api/media/:id
Obtém informações de um arquivo específico.

**Parâmetros:**
- `id` (UUID): ID único do arquivo

**Exemplo:**
```bash
GET /api/media/550e8400-e29b-41d4-a716-446655440000
```

**Resposta (200):**
```json
{
  "status": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "originalName": "imagem.jpg",
    "displayName": "Minha Foto Especial",
    "mimetype": "image/jpeg",
    "size": 1048576,
    "sizeFormatted": "1 MB",
    "url": "/media/550e8400-e29b-41d4-a716-446655440000/Minha%20Foto%20Especial.jpg",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### PUT /api/media/:id
Atualiza o nome de exibição de um arquivo.

**Content-Type:** `application/json`

**Parâmetros:**
- `id` (UUID): ID único do arquivo
- `displayName` (string): Novo nome de exibição

**Exemplo:**
```bash
curl -X PUT \
  http://localhost:3000/api/media/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{"displayName": "Novo Nome da Foto"}'
```

**Resposta (200):**
```json
{
  "status": "success",
  "message": "Mídia atualizada com sucesso.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "displayName": "Novo Nome da Foto",
    "url": "/media/550e8400-e29b-41d4-a716-446655440000/Novo%20Nome%20da%20Foto.jpg",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

### DELETE /api/media/:id
Exclui um arquivo de mídia.

**Parâmetros:**
- `id` (UUID): ID único do arquivo

**Exemplo:**
```bash
curl -X DELETE \
  http://localhost:3000/api/media/550e8400-e29b-41d4-a716-446655440000
```

**Resposta (200):**
```json
{
  "status": "success",
  "message": "Mídia removida com sucesso.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### GET /api/media/:id/url
Gera uma URL assinada para acesso ao arquivo.

**Parâmetros:**
- `id` (UUID): ID único do arquivo

**Query Parameters:**
- `expires` (number): Tempo de expiração em segundos (padrão: 3600)

**Exemplo:**
```bash
GET /api/media/550e8400-e29b-41d4-a716-446655440000/url?expires=7200
```

**Resposta (200):**
```json
{
  "status": "success",
  "data": {
    "signedUrl": "http://localhost:3000/media/550e8400-e29b-41d4-a716-446655440000/Minha%20Foto%20Especial.jpg",
    "expiresAt": "2024-01-15T12:30:00.000Z",
    "expiresIn": 7200
  }
}
```

### GET /api/media/:id/download
Baixa um arquivo de mídia com headers apropriados.

**Parâmetros:**
- `id` (UUID): ID único do arquivo

**Exemplo:**
```bash
curl -O -J \
  http://localhost:3000/api/media/550e8400-e29b-41d4-a716-446655440000/download
```

**Resposta:** Arquivo binário com headers:
- `Content-Disposition: attachment; filename="Nome do Arquivo"`
- `Content-Type: [tipo MIME do arquivo]`
- `Content-Length: [tamanho em bytes]`

---

## 📊 Códigos de Resposta

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Requisição inválida |
| 404 | Não encontrado |
| 500 | Erro interno do servidor |

## ❌ Formato de Erro

Todas as respostas de erro seguem o formato:

```json
{
  "status": "error",
  "message": "Descrição do erro",
  "error": "CODIGO_DO_ERRO"
}
```

**Códigos de Erro Comuns:**
- `NO_FILE_UPLOADED`: Nenhum arquivo foi enviado
- `INVALID_UUID`: ID de mídia inválido
- `MEDIA_NOT_FOUND`: Mídia não encontrada
- `FILE_NOT_FOUND`: Arquivo físico não encontrado
- `INVALID_DISPLAY_NAME`: Nome de exibição inválido
- `FILE_DELETE_ERROR`: Erro ao deletar arquivo físico

---

## 🔧 Exemplos de Uso

### Upload de Arquivo com JavaScript

```javascript
const formData = new FormData();
formData.append('mediaFile', fileInput.files[0]);
formData.append('displayName', 'Meu Arquivo');

fetch('/api/media', {
    method: 'POST',
    body: formData
})
.then(response => response.json())
.then(data => {
    console.log('Upload realizado:', data);
})
.catch(error => {
    console.error('Erro no upload:', error);
});
```

### Busca de Arquivos com Filtros

```javascript
const params = new URLSearchParams({
    type: 'image',
    search: 'foto',
    page: 1,
    limit: 10,
    sort: 'createdAt',
    order: 'desc'
});

fetch(`/api/media?${params}`)
.then(response => response.json())
.then(data => {
    console.log('Arquivos encontrados:', data.data);
    console.log('Paginação:', data.pagination);
});
```

### Atualização de Nome

```javascript
fetch(`/api/media/${mediaId}`, {
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        displayName: 'Novo Nome do Arquivo'
    })
})
.then(response => response.json())
.then(data => {
    console.log('Arquivo atualizado:', data);
});
```

---

## 🔒 Limitações e Configurações

- **Tamanho máximo de arquivo:** 100MB
- **Tipos de arquivo:** Todos os tipos são aceitos
- **Paginação máxima:** 100 itens por página
- **Armazenamento:** Sistema de arquivos local (pasta `data/`)
- **Persistência:** Em memória (dados perdidos ao reiniciar o servidor)

---

## 🚀 Próximos Passos

Para um ambiente de produção, considere:

1. **Banco de dados persistente** (PostgreSQL, MongoDB)
2. **Autenticação e autorização** (JWT, OAuth)
3. **Cloud storage** (AWS S3, Google Cloud Storage)
4. **Rate limiting** para prevenir abuso
5. **Compressão de imagens** automática
6. **Antivírus scanning** para uploads
7. **CDN** para entrega de conteúdo

---

*Documentação gerada automaticamente para Hive Storage API v1.0.0*