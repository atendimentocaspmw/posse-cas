// ================================================================
// 1. CONFIGURAÇÃO (Substitua pelos seus dados reais)
// ================================================================
const CLIENT_ID = '759968073070-hall018n8q5pj7661j33j6amoncd4j9e.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAdpISaVK2B48vec3wq78OT3uzKNIqP4NM'; 
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file'; 

let tokenClient;
let gapiInited = false;
let gsiInited = false;

console.log("Script app.js carregado. Aguardando APIs...");

// ================================================================
// 2. INICIALIZAÇÃO DAS APIs
// ================================================================
// MODIFIED INITIALIZATION
function gapiLoaded() {
    // We will skip GAPI initialization for now since it's failing
    // and use a direct fetch for the upload instead.
    gapiInited = true; 
    console.log("GAPI bypass enabled.");
}

function gsiLoaded() {
    console.log("GSI carregando...");
    try {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', 
        });
        gsiInited = true;
        console.log("GSI pronto.");
    } catch (err) {
        console.error("Erro GSI:", err);
    }
}


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
        nome: formData.get('nome'),
        cpf: formData.get('cpf'),
        cpfDigits: cpfDigits,
        email: formData.get('email'),
        celular: formData.get('celular'),
        dataNascimento: formData.get('dataNascimento'),
        douNumero: formData.get('douNumero'),
        douData: formData.get('douData'),
        atoNumero: formData.get('atoNumero'),
        atoData: formData.get('atoData'),
        docTipo: formData.get('docTipo'),
        docNumero: formData.get('docNumero'),
        docOrgao: formData.get('docOrgao'),
        docUf: formData.get('docUf'),
        docEmissao: formData.get('docEmissao'),
        servidorCedido: formData.get('servidorCedido'),
        atoCessaoPagina: formData.get('atoCessaoPagina'),
        encargosFinanceiros: formData.get('encargosFinanceiros'),
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
    
    // Criando o conteúdo detalhado do arquivo TXT
    let conteudoTxt = `===== DOCUMENTAÇÃO DE POSSE DO SERVIDOR =====\n\n`;
    conteudoTxt += `Data e Hora de Envio: ${data.geradoEm}\n\n`;
    
    conteudoTxt += `--- Dados Pessoais ---\n`;
    conteudoTxt += `Nome: ${data.nome}\n`;
    conteudoTxt += `CPF: ${data.cpf}\n`;
    conteudoTxt += `E-mail: ${data.email}\n`;
    conteudoTxt += `Celular: ${data.celular}\n`;
    conteudoTxt += `Data de Nascimento: ${data.dataNascimento}\n\n`;
    
    conteudoTxt += `--- Ato de Nomeação ---\n`;
    conteudoTxt += `Número do DOU: ${data.douNumero}\n`;
    conteudoTxt += `Data da Publicação: ${data.douData}\n`;
    conteudoTxt += `Número do Ato: ${data.atoNumero}\n`;
    conteudoTxt += `Data do Ato: ${data.atoData}\n\n`;
    
    conteudoTxt += `--- Documento de Identificação ---\n`;
    conteudoTxt += `Tipo: ${data.docTipo}\n`;
    conteudoTxt += `Número: ${data.docNumero}\n`;
    conteudoTxt += `Órgão Emissor: ${data.docOrgao}\n`;
    conteudoTxt += `UF: ${data.docUf}\n`;
    conteudoTxt += `Data de Emissão: ${data.docEmissao}\n\n`;

    conteudoTxt += `--- Cessão e Observações ---\n`;
    conteudoTxt += `Servidor Cedido: ${data.servidorCedido}\n`;
    conteudoTxt += `Página Cessão: ${data.atoCessaoPagina}\n`;
    conteudoTxt += `Encargos: ${data.encargosFinanceiros}\n`;

    // Adiciona o arquivo TXT ao ZIP
    zip.file('DADOS_POSSE.txt', conteudoTxt);

    // Adiciona os PDFs organizados em pastas
    const fileInputs = Array.from(form.querySelectorAll('input[type="file"]'));
    fileInputs.forEach((input) => {
        const files = Array.from(input.files || []);
        if (files.length > 0) {
            const folder = zip.folder(input.name);
            files.forEach((file) => {
                folder.file(file.name, file);
            });
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
