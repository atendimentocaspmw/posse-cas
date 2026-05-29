// ================================================================
// 1. CONFIGURAÇÃO (Substitua pelos seus dados reais)
// ================================================================
const CLIENT_ID = 'SEU_CLIENT_ID_AQUI.apps.googleusercontent.com';
const API_KEY = 'SUA_CHAVE_API_AQUI'; 
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file'; 

let tokenClient;
let gapiInited = false;
let gsiInited = false;

console.log("Script app.js carregado. Aguardando APIs...");

// ================================================================
// 2. INICIALIZAÇÃO DAS APIs
// ================================================================

// Chamado quando o script https://apis.google.com/js/api.js carrega
function gapiLoaded() {
    console.log("GAPI carregando...");
    gapi.load('client', async () => {
        try {
            await gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: [DISCOVERY_DOC],
            });
            gapiInited = true;
            console.log("GAPI pronto.");
        } catch (err) {
            console.error("Erro GAPI:", err);
        }
    });
}

// Chamado quando o script https://accounts.google.com/gsi/client carrega
function gsiLoaded() {
    console.log("GSI carregando...");
    try {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', // Definido no momento do upload
        });
        gsiInited = true;
        console.log("GSI pronto.");
    } catch (err) {
        console.error("Erro GSI:", err);
    }
}

// Fail-safe: Caso o onload falhe, tenta inicializar a cada 2 segundos
setInterval(() => {
    if (!gapiInited && typeof gapi !== 'undefined' && gapi.load) gapiLoaded();
    if (!gsiInited && typeof google !== 'undefined' && google.accounts) gsiLoaded();
}, 2000);

// ================================================================
// 3. LÓGICA DO FORMULÁRIO
// ================================================================

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
    
    if (!gapiInited || !gsiInited) {
        showMessage('Aguarde o carregamento das APIs do Google (Verifique o console F12)...', 'error');
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
    
    await enviarParaGoogleDrive(blob, fileName);
}

// ================================================================
// 4. UPLOAD PARA GOOGLE DRIVE
// ================================================================

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
                showMessage(`Sucesso! Arquivo enviado para o seu Drive.`, 'success');
                form.reset();
            } else {
                const error = await uploadResponse.json();
                throw new Error(error.error.message);
            }
        } catch (error) {
            showMessage('Erro no upload: ' + error.message, 'error');
        }
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
}

function validateField(field) {
    const value = field.value?.trim() || '';
    if (field.required && value === '' && field.type !== 'file') return false;
    return true; 
}

function showMessage(text, type = 'success') {
    messageNode.textContent = text;
    messageNode.className = `message ${type}`;
}
