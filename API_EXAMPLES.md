# 🧪 Exemplos Práticos de Uso da Hive Storage API

## 📝 Como Testar a API

### 1️⃣ **Health Check**
```bash
curl http://localhost:3000/api/health
```

### 2️⃣ **Estatísticas**
```bash
curl http://localhost:3000/api/stats
```

### 3️⃣ **Upload de Arquivo**
```bash
# Upload simples
curl -X POST \
  http://localhost:3000/api/media \
  -F "mediaFile=@exemplo.jpg"

# Upload com nome personalizado
curl -X POST \
  http://localhost:3000/api/media \
  -F "mediaFile=@exemplo.jpg" \
  -F "displayName=Minha Foto Especial"
```

### 4️⃣ **Listar Todas as Mídias**
```bash
# Listar todas
curl http://localhost:3000/api/media

# Com paginação
curl "http://localhost:3000/api/media?page=1&limit=5"

# Filtrar por tipo
curl "http://localhost:3000/api/media?type=image"

# Buscar por nome
curl "http://localhost:3000/api/media?search=foto"

# Ordenar por tamanho (crescente)
curl "http://localhost:3000/api/media?sort=size&order=asc"
```

### 5️⃣ **Obter Mídia Específica**
```bash
curl http://localhost:3000/api/media/SEU_UUID_AQUI
```

### 6️⃣ **Atualizar Nome da Mídia**
```bash
curl -X PUT \
  http://localhost:3000/api/media/SEU_UUID_AQUI \
  -H "Content-Type: application/json" \
  -d '{"displayName": "Novo Nome do Arquivo"}'
```

### 7️⃣ **Obter URL Assinada**
```bash
# URL padrão (expira em 1 hora)
curl http://localhost:3000/api/media/SEU_UUID_AQUI/url

# URL com expiração personalizada (2 horas)
curl "http://localhost:3000/api/media/SEU_UUID_AQUI/url?expires=7200"
```

### 8️⃣ **Download Direto**
```bash
curl -O -J http://localhost:3000/api/media/SEU_UUID_AQUI/download
```

### 9️⃣ **Deletar Mídia**
```bash
curl -X DELETE http://localhost:3000/api/media/SEU_UUID_AQUI
```

---

## 🔍 **JavaScript Examples (Frontend)**

### Upload com Progress
```javascript
async function uploadFile(file, displayName) {
    const formData = new FormData();
    formData.append('mediaFile', file);
    if (displayName) {
        formData.append('displayName', displayName);
    }

    try {
        const response = await fetch('/api/media', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.status === 'success') {
            console.log('Upload success:', result.data);
            return result.data;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Upload failed:', error);
        throw error;
    }
}
```

### Buscar com Filtros
```javascript
async function searchMedia(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.type) params.append('type', filters.type);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.order) params.append('order', filters.order);

    try {
        const response = await fetch(`/api/media?${params}`);
        const result = await response.json();
        
        if (result.status === 'success') {
            return {
                media: result.data,
                pagination: result.pagination
            };
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Search failed:', error);
        throw error;
    }
}

// Exemplo de uso
searchMedia({
    type: 'image',
    search: 'foto',
    page: 1,
    limit: 10,
    sort: 'createdAt',
    order: 'desc'
}).then(result => {
    console.log('Found media:', result.media);
    console.log('Pagination:', result.pagination);
});
```

### Gerenciar Mídia
```javascript
// Obter mídia específica
async function getMedia(id) {
    const response = await fetch(`/api/media/${id}`);
    const result = await response.json();
    return result.status === 'success' ? result.data : null;
}

// Atualizar nome
async function updateMediaName(id, newName) {
    const response = await fetch(`/api/media/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: newName })
    });
    
    const result = await response.json();
    return result.status === 'success' ? result.data : null;
}

// Deletar mídia
async function deleteMedia(id) {
    const response = await fetch(`/api/media/${id}`, {
        method: 'DELETE'
    });
    
    const result = await response.json();
    return result.status === 'success';
}

// Obter URL de download
async function getDownloadUrl(id, expires = 3600) {
    const response = await fetch(`/api/media/${id}/url?expires=${expires}`);
    const result = await response.json();
    return result.status === 'success' ? result.data.signedUrl : null;
}
```

---

## 🐍 **Python Examples**

### Upload de Arquivo
```python
import requests

def upload_file(file_path, display_name=None):
    url = "http://localhost:3000/api/media"
    
    files = {'mediaFile': open(file_path, 'rb')}
    data = {}
    
    if display_name:
        data['displayName'] = display_name
    
    response = requests.post(url, files=files, data=data)
    result = response.json()
    
    if result['status'] == 'success':
        print(f"Upload successful: {result['data']['id']}")
        return result['data']
    else:
        print(f"Upload failed: {result['message']}")
        return None

# Uso
upload_file('exemplo.jpg', 'Minha Foto')
```

### Listar e Filtrar
```python
import requests

def list_media(filters=None):
    url = "http://localhost:3000/api/media"
    
    params = filters or {}
    response = requests.get(url, params=params)
    result = response.json()
    
    if result['status'] == 'success':
        return result['data'], result.get('pagination')
    else:
        print(f"Error: {result['message']}")
        return [], None

# Exemplos de uso
media, pagination = list_media({'type': 'image', 'limit': 5})
print(f"Found {len(media)} images")

media, pagination = list_media({'search': 'foto', 'sort': 'size'})
print(f"Search results: {len(media)} files")
```

---

## 🛠️ **Postman Collection**

### Configuração de Ambiente
```json
{
  "name": "Hive Storage",
  "values": [
    {
      "key": "base_url",
      "value": "http://localhost:3000/api",
      "type": "default"
    },
    {
      "key": "media_id",
      "value": "UUID_WILL_BE_SET_AFTER_UPLOAD",
      "type": "default"
    }
  ]
}
```

### Requisições Principais
1. **Health Check**: `GET {{base_url}}/health`
2. **Upload**: `POST {{base_url}}/media` (Body: form-data)
3. **List All**: `GET {{base_url}}/media`
4. **Get One**: `GET {{base_url}}/media/{{media_id}}`
5. **Update**: `PUT {{base_url}}/media/{{media_id}}` (Body: JSON)
6. **Delete**: `DELETE {{base_url}}/media/{{media_id}}`
7. **Get URL**: `GET {{base_url}}/media/{{media_id}}/url`

---

## 📊 **Respostas Esperadas**

### Sucesso (Upload)
```json
{
  "status": "success",
  "message": "Arquivo enviado com sucesso.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "originalName": "exemplo.jpg",
    "displayName": "Minha Foto",
    "mimetype": "image/jpeg",
    "size": 1048576,
    "sizeFormatted": "1 MB",
    "url": "/media/550e8400-e29b-41d4-a716-446655440000/Minha%20Foto.jpg",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Erro
```json
{
  "status": "error",
  "message": "Nenhum arquivo foi enviado.",
  "error": "NO_FILE_UPLOADED"
}
```

---

## 🔧 **Dicas de Teste**

1. **Use UUIDs reais** obtidos após upload para testar outras rotas
2. **Teste paginação** com diferentes valores de `page` e `limit`
3. **Teste filtros** combinados: `?type=image&search=foto&sort=size`
4. **Teste arquivos grandes** para verificar o limite de 100MB
5. **Teste tipos diferentes** de arquivo (imagem, vídeo, áudio, documentos)

---

*Guia de testes para Hive Storage API v1.0.0* 