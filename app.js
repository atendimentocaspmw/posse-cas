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

// ================================================================
// 3. LÓGICA DE GERAÇÃO DO ZIP
// ================================================================

async function gerarZip(data, pdfFiles) {
    const zip = new JSZip();
    
    // 1. Criando o conteúdo detalhado do arquivo TXT
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

    // Adiciona o arquivo TXT na raiz do ZIP
    zip.file('DADOS_POSSE.txt', conteudoTxt);

    // 2. Criar UMA ÚNICA PASTA para todos os PDFs
    const pastaDocumentos = zip.folder("DOCUMENTOS_ANEXADOS");

    // 3. Adicionar todos os arquivos dos inputs de arquivo nesta pasta única
    const fileInputs = Array.from(form.querySelectorAll('input[type="file"]'));
    fileInputs.forEach((input) => {
        const files = Array.from(input.files || []);
        files.forEach((file) => {
            // Adiciona o arquivo direto na pasta única
            // O nome do arquivo será preservado (ex: rg.pdf, cpf.pdf)
            pastaDocumentos.file(file.name, file);
        });
    });

    // 4. Gerar o BLOB do ZIP
    const blob = await zip.generateAsync({ type: 'blob' });
    
    // Formatação do nome do arquivo ZIP
    const nomeFormatado = data.nome.toUpperCase().trim().replace(/\s+/g, '_');
    const fileName = `POSSE_${nomeFormatado}.zip`;
    
    await enviarParaGoogleDrive(blob, fileName);
}


// ================================================================
// 4. UPLOAD PARA GOOGLE DRIVE (COM ORGANIZAÇÃO POR DATA)
// ================================================================

async function enviarParaGoogleDrive(blob, nomeArquivo) {
    const PARENT_FOLDER_ID = '1nKwFHwJIKE9ilRzuH3pOKuVlnNT_eTli'; 
    showMessage('Solicitando autorização do Google...', 'success');

    tokenClient.callback = async (response) => {
        if (response.error !== undefined) {
            showMessage('Erro na autorização: ' + response.error, 'error');
            return;
        }

        const accessToken = response.access_token;

        try {
            showMessage('Organizando pastas no Drive...', 'success');

            // 1. Obter a data atual no formato DD-MM-AAAA
            const hoje = new Date();
            const pastaDataNome = hoje.toLocaleDateString('pt-BR').replace(/\//g, '-');

            // 2. Procurar se a pasta da data já existe dentro da pasta principal
            let folderId;
            const query = `name = '${pastaDataNome}' and '${PARENT_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
            const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const searchResult = await searchResponse.json();

            if (searchResult.files && searchResult.files.length > 0) {
                folderId = searchResult.files[0].id;
                console.log("Pasta da data já existe:", folderId);
            } else {
                // Criar a pasta da data
                console.log("Criando nova pasta para a data...");
                const createFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: pastaDataNome,
                        mimeType: 'application/vnd.google-apps.folder',
                        parents: [PARENT_FOLDER_ID]
                    })
                });
                const newFolder = await createFolderRes.json();
                folderId = newFolder.id;
            }

            // 3. Fazer o Upload do ZIP para a pasta da data
            showMessage(`Enviando arquivo para a pasta ${pastaDataNome}...`, 'success');

            const metadata = {
                name: nomeArquivo,
                mimeType: 'application/zip',
                parents: [folderId]
            };

            const formUpload = new FormData();
            formUpload.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            formUpload.append('file', blob);

            const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` },
                body: formUpload,
            });

            if (uploadResponse.ok) {
                showMessage(`Sucesso! "${nomeArquivo}" enviado para a pasta ${pastaDataNome}.`, 'success');
                form.reset();
                // Limpar estilos de validação
                formFields.forEach(f => f.classList.remove('field-valid', 'field-invalid'));
            } else {
                const error = await uploadResponse.json();
                throw new Error(error.error.message);
            }
        } catch (error) {
            console.error('Erro completo:', error);
            showMessage('Erro no processo: ' + error.message, 'error');
        }
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
}

// ================================================================
// 5. FUNÇÕES AUXILIARES
// ================================================================

function validateField(field) {
    const value = field.value?.trim() || '';
    if (field.required && value === '' && field.type !== 'file') return false;
    if (field.type === 'file' && field.required && field.files.length === 0) return false;
    return true; 
}

function showMessage(text, type = 'success') {
    messageNode.textContent = text;
    messageNode.className = `message ${type}`;
}

