const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Configurar autenticação Google Drive
const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_DRIVE_KEY_FILE || './credentials.json',
    scopes: ['https://www.googleapis.com/auth/drive']
});

const drive = google.drive({
    version: 'v3',
    auth: auth
});

const PARENT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

// Rota para upload de ZIP
app.post('/api/upload-posse', upload.single('file'), async (req, res) => {
    try {
        const { nomeServidor, cpf } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
        }

        if (!nomeServidor || !cpf) {
            return res.status(400).json({ error: 'Nome do servidor e CPF são obrigatórios' });
        }

        console.log(`Iniciando upload para: ${nomeServidor}`);

        // 1. Obter data atual (YYYY-MM-DD)
        const hoje = new Date().toISOString().split('T')[0];
        console.log(`Data: ${hoje}`);

        // 2. Criar ou encontrar pasta da data
        let dataFolderId = await findOrCreateFolder(hoje, PARENT_FOLDER_ID);

        // 3. Criar ou encontrar pasta do servidor dentro da pasta da data
        let serverFolderId = await findOrCreateFolder(nomeServidor, dataFolderId);

        // 4. Upload do arquivo ZIP
        const fileMetadata = {
            name: `${nomeServidor}_${cpf}_${hoje}.zip`,
            parents: [serverFolderId],
            mimeType: 'application/zip'
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            media: {
                mimeType: 'application/zip',
                body: require('stream').Readable.from([file.buffer])
            },
            fields: 'id, webViewLink'
        });

        console.log(`Upload concluído: ${response.data.id}`);

        res.json({
            success: true,
            message: 'Documentação enviada com sucesso!',
            fileId: response.data.id,
            fileLink: response.data.webViewLink,
            folder: nomeServidor,
            data: hoje
        });

    } catch (error) {
        console.error('Erro ao fazer upload:', error);
        res.status(500).json({
            error: 'Erro ao enviar documentação',
            details: error.message
        });
    }
});

// Função para encontrar ou criar pasta
async function findOrCreateFolder(folderName, parentId) {
    try {
        // Procurar por pasta com esse nome
        const searchResponse = await drive.files.list({
            q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`,
            spaces: 'drive',
            fields: 'files(id, name)',
            pageSize: 1
        });

        if (searchResponse.data.files.length > 0) {
            console.log(`Pasta encontrada: ${folderName}`);
            return searchResponse.data.files[0].id;
        }

        // Criar nova pasta
        console.log(`Criando nova pasta: ${folderName}`);
        const createResponse = await drive.files.create({
            resource: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId]
            },
            fields: 'id'
        });

        return createResponse.data.id;

    } catch (error) {
        console.error('Erro ao gerenciar pasta:', error);
        throw error;
    }
}

// Rota de teste
app.get('/api/health', (req, res) => {
    res.json({ status: 'Servidor de posse ativo' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
