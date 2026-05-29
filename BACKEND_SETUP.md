# Setup do Backend - Posse CAS

## Pré-requisitos
- Node.js 16+ instalado
- Conta Google com acesso ao Google Drive
- Google Cloud Project criado com Google Drive API habilitada

## 1. Configurar Google Drive API

### 1.1 Criar projeto no Google Cloud Console
1. Acesse https://console.cloud.google.com
2. Crie um novo projeto
3. Ative a API do Google Drive

### 1.2 Criar credenciais
1. Vá para "Credenciais" no console
2. Clique em "Criar credenciais" → "Conta de serviço"
3. Preencha os dados e crie a conta
4. Na seção "Chaves", crie uma chave JSON
5. Salve o arquivo como `credentials.json` na raiz do projeto

### 1.3 Compartilhar pasta com a conta de serviço
1. Crie uma pasta no Google Drive para receber os uploads
2. Pegue o ID da pasta (na URL: `/folders/[ID]`)
3. Abra `credentials.json` e copie o email da conta de serviço
4. Compartilhe a pasta do Google Drive com esse email

## 2. Instalar dependências

```bash
npm install
```

## 3. Configurar variáveis de ambiente

Edite o arquivo `.env`:

```
GOOGLE_DRIVE_KEY_FILE=./credentials.json
GOOGLE_DRIVE_FOLDER_ID=seu_id_da_pasta_aqui
PORT=3001
```

## 4. Iniciar o servidor

```bash
npm start
```

O servidor estará rodando em `http://localhost:3001`

## 5. Testar a saúde do servidor

```bash
curl http://localhost:3001/api/health
```

Resposta esperada:
```json
{ "status": "Servidor de posse ativo" }
```

## 6. Atualizar frontend

O `app.js` deve fazer POST para o endpoint `/api/upload-posse` em vez de fazer download.

Exemplo de requisição:
```javascript
const formData = new FormData();
formData.append('file', blob, 'POSSE_[CPF].zip');
formData.append('nomeServidor', data.nome);
formData.append('cpf', data.cpfDigits);

await fetch('http://localhost:3001/api/upload-posse', {
    method: 'POST',
    body: formData
});
```

## Estrutura criada no Google Drive

Após o envio, a estrutura será:

```
📁 [Pasta Pai configurada]
  └─ 📁 [Nome do Servidor]
     └─ POSSE_[CPF]_[data].zip
        ├─ DADOS_POSSE.txt
        ├─ 📁 Situação Cadastral CPF/
        ├─ 📁 Certidão Civil/
        ├─ 📁 Título de Eleitor/
        └─ ... [outros documentos]
```

## Troubleshooting

- **Erro de autenticação**: Verifique se `credentials.json` está no lugar correto
- **Pasta não encontrada**: Confirme o `GOOGLE_DRIVE_FOLDER_ID` está correto
- **Permissão negada**: A conta de serviço deve ter acesso compartilhado à pasta

## Deploy em produção

Para deploy em produção, considere:
- Usar variáveis de ambiente no servidor de hospedagem
- Implementar autenticação no endpoint
- Usar HTTPS
- Considerar rate limiting
