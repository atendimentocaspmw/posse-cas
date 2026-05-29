// CONFIGURAÇÃO GOOGLE DRIVE (Substitua pelos seus dados do Console Google Cloud)
const CLIENT_ID = 'SEU_CLIENT_ID_AQUI.apps.googleusercontent.com';
const API_KEY = 'SUA_CHAVE_API_AQUI'; 
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file'; 

let tokenClient;
let gapiInited = false;
let gsiInited = false;

// Inicialização das APIs do Google
function gapiLoaded() {
    gapi.load('client', async () => {
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInited = true;
    });
}

function gsiLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // Definido no momento do upload
    });
    gsiInited = true;
}

const form = document.getElementById('posseForm');
const messageNode = document.getElementById('message');
const formFields = Array.from(form.querySelectorAll('input, select, textarea'));

// Setup de validação visual
formFields.forEach((field) => {
    const errorSpan = document.createElement('span');
    errorSpan.className = 'field-error';
    field.parentElement.appendChild(errorSpan);
    field.errorSpan = errorSpan;
});

formFields.forEach((field) => {
    field.addEventListener('focus', () => {
        field.classList.remove('field-invalid', 'field-valid');
        field.errorSpan.textContent = '';
    });

    const eventType = field.tagName === 'SELECT' || field.type === 'file' ? 'change' : 'blur';
    field.addEventListener(eventType, () => {
        field.dataset.touched = 'true';
        validateField(field);
    });
});

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    messageNode.textContent = '';
    
    // Verificação de APIs
    if (!gapiInited || !gsiInited) {
        showMessage('Aguarde o carregamento das APIs do Google...', 'error');
        return;
    }

    formFields.forEach((field) => { field.dataset.touched = 'true'; });

    const allValid = formFields.every((field) => validateField(field));
    if (!allValid) {
        showMessage('Corrija os campos inválidos antes de enviar.', 'error');
        return;
    }

    const formData = new FormData(form);
    const cpfRaw = formData.get('cpf')?.toString().trim() || '';
    const cpfDigits = cpfRaw.replace(/\D/g, '');
    const fileInputs = Array.from(form.querySelectorAll('input[type="file"]'));
    const pdfFiles = fileInputs.flatMap(input => Array.from(input.files || [])).filter(file => file instanceof File && file.size > 0);

    const data = {
        nome: formData.get('nome')?.toString().trim(),
        cpf: cpfRaw,
        cpfDigits: cpfDigits,
        email: formData.get('email')?.toString().trim(),
        celular: formData.get('celular')?.toString().trim(),
        whatsappLink: `https://wa.me/${cpfDigits}`,
        dataNascimento: formData.get('dataNascimento')?.toString().trim(),
        geradoEm: new Date().toLocaleString('pt-BR')
    };

    try {
        await gerarZip(data, pdfFiles);
    } catch (error) {
        console.error(error);
        showMessage('Erro ao processar o arquivo.', 'error');
    }
});

async function gerarZip(data, pdfFiles) {
    const zip = new JSZip();
    zip.file('DADOS_POSSE.txt', `Nome: ${data.nome}\nCPF: ${data.cpf}\nGerado em: ${data.geradoEm}`);

    const fileInputs = Array.from(form.querySelectorAll('input[type="file"]'));
    fileInputs.forEach((input) => {
        const files = Array.from(input.files || []);
        if (files.length > 0) {
            const folder = zip.folder(input.name);
            files.forEach((file) => { folder.file(file.name, file); });
        }
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const fileName = `POSSE_${data.cpfDigits}_${timestamp}.zip`;
    
    // CHAMADA PARA O GOOGLE DRIVE
    await enviarParaGoogleDrive(blob, fileName);
}

async function enviarParaGoogleDrive(blob, nomeArquivo) {
    showMessage('Solicitando autorização do Google...', 'success');

    tokenClient.callback = async (response) => {
        if (response.error !== undefined) {
            showMessage('Erro na autorização: ' + response.error, 'error');
            return;
        }

        try {
            showMessage('Enviando arquivo para o Drive...', 'success');

            const metadata = {
                name: nomeArquivo,
                mimeType: 'application/zip',
            };

            const formUpload = new FormData();
            formUpload.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            formUpload.append('file', blob);

            const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: new Headers({ 'Authorization': 'Bearer ' + response.access_token }),
                body: formUpload,
            });

            if (uploadResponse.ok) {
                showMessage(`Sucesso! Arquivo "${nomeArquivo}" enviado para o seu Google Drive.`, 'success');
                form.reset();
            } else {
                const error = await uploadResponse.json();
                throw new Error(error.error.message);
            }
        } catch (error) {
            showMessage('Erro no upload: ' + error.message, 'error');
        }
    };

    // Abre o popup de login do Google
    tokenClient.requestAccessToken({ prompt: 'consent' });
}

// Funções auxiliares mantidas
function validateField(field) {
    const value = field.value?.trim() || '';
    if (field.required && value === '' && field.type !== 'file') return false;
    return true; // Simplificado para o exemplo, mantenha sua lógica original aqui se desejar
}

function showMessage(text, type = 'success') {
    messageNode.textContent = text;
    messageNode.className = `message ${type}`;
}
