## Sistema de Posse CAS - Instruções de Uso

### Frontend + Backend

O sistema agora funciona com um backend Node.js que envia os arquivos diretamente para o Google Drive.

### Quick Start

#### 1. Configurar o Backend

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure as credenciais do Google Drive:**
   - Siga as instruções em `BACKEND_SETUP.md`
   - Coloque o arquivo `credentials.json` na raiz do projeto
   - Edite `.env` com o ID da pasta do Google Drive

3. **Inicie o servidor:**
   ```bash
   npm start
   ```
   
   O servidor estará em `http://localhost:3001`

#### 2. Usar o Frontend

1. Abra `index.html` em um navegador
2. Preencha todos os campos obrigatórios
3. Anexe os PDFs necessários
4. Clique em "Enviar documentação de posse"

#### 3. Resultado

- Uma pasta com o **nome do servidor** é criada automaticamente no Google Drive
- O arquivo ZIP é salvo dentro dessa pasta
- A pasta fica organizada por tipo de documento

### Estrutura do Projeto

```
posse-cas/
├── index.html              # Frontend
├── app.js                  # Lógica do frontend
├── style.css               # Estilos
├── server.js               # Backend (Node.js)
├── package.json            # Dependências
├── .env                    # Configurações
├── credentials.json        # Chaves do Google Drive
├── BACKEND_SETUP.md        # Instruções detalhadas
└── README.md               # Este arquivo
```

### Características

✅ Validação completa de dados
✅ Upload para Google Drive automático
✅ Pastas organizadas por servidor
✅ Estrutura de documentos padronizada
✅ Data e hora de envio registrada
✅ Mensagens de erro específicas

### Troubleshooting

**Erro: "Servidor indisponível"**
- Certifique-se de que `npm start` está rodando
- Verifique se não há erro no console do servidor

**Erro: "Credenciais inválidas"**
- Verifique se `credentials.json` está correto
- Regenere se necessário seguindo `BACKEND_SETUP.md`

**Erro: "Pasta não encontrada"**
- Confirme o `GOOGLE_DRIVE_FOLDER_ID` em `.env`
- A pasta deve ser compartilhada com a conta de serviço

### Deploy em Produção

Para usar em produção:
1. Mude a URL em `app.js` de `http://localhost:3001` para a URL do servidor
2. Use um serviço de hospedagem (Heroku, Railway, etc.)
3. Configure variáveis de ambiente no serviço
4. Use HTTPS obrigatoriamente
