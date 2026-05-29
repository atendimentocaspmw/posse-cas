// ================================================================
// 1. CONFIGURAÇÃO
// ================================================================
// URL que você gerou ao publicar o Google Apps Script
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzBG5SKOx65i095llkC_7ROKGJ_wpbkgCDArSGDypBbUN9gkWq6RQUWUndoSNQKSwPzCQ/exec"; 

const form = document.getElementById('posseForm');
const messageNode = document.getElementById('message');
const formFields = Array.from(form.querySelectorAll('input, select, textarea'));

console.log("Script app.js carregado pronto para envio direto.");

// ================================================================
// 2. LÓGICA DO FORMULÁRIO (Validação)
// ================================================================

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
    
    let conteudoTxt = `===== DOCUMENTAÇÃO DE POSSE DO SERVIDOR =====\n\n`;
    conteudoTxt += `Data e Hora de Envio: ${data.geradoEm}\n\n`;
    conteudoTxt += `Nome: ${data.nome}\nCPF: ${data.cpf}\nE-mail: ${data.email}\nCelular: ${data.celular}\n`;
    conteudoTxt += `Data Nascimento: ${data.dataNascimento}\n\n`;
    conteudoTxt += `--- Nomeação ---\nDOU: ${data.douNumero} (${data.douData})\nAto: ${data.atoNumero} (${data.atoData})\n\n`;
    conteudoTxt += `--- Documento ---\nTipo: ${data.docTipo}\nNúmero: ${data.docNumero}\nEmissor: ${data.docOrgao} / ${data.docUf}\n\n`;
    conteudoTxt += `--- Obs ---\nCedido: ${data.servidorCedido}\nEncargos: ${data.encargosFinanceiros}\n`;

    zip.file('DADOS_POSSE.txt', conteudoTxt);

    const pastaDocumentos = zip.folder("DOCUMENTOS_ANEXADOS");
    const fileInputs = Array.from(form.querySelectorAll('input[type="file"]'));
    fileInputs.forEach((input) => {
        const files = Array.from(input.files || []);
        files.forEach((file) => {
            pastaDocumentos.file(file.name, file);
        });
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const nomeFormatado = data.nome.toUpperCase().trim().replace(/\s+/g, '_');
    const fileName = `POSSE_${nomeFormatado}.zip`;
    
    await enviarParaGoogleDrive(blob, fileName);
}

// ================================================================
// 4. ENVIO PARA O GOOGLE APPS SCRIPT
// ================================================================

async function enviarParaGoogleDrive(blob, nomeArquivo) {
    showMessage('Preparando envio seguro...', 'success');

    try {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async function() {
            const base64data = reader.result.split(',')[1];
            
            // Envia para o Google Apps Script
            const response = await fetch(SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify({
                    contents: base64data,
                    filename: nomeArquivo
                }),
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                }
            });

            const result = await response.json();

            if (result.result === "success") {
                showMessage(`Sucesso! Documentação enviada e organizada na pasta "${result.folder}" do Drive.`, 'success');
                form.reset();
                formFields.forEach(f => f.classList.remove('field-valid', 'field-invalid'));
            } else {
                throw new Error(result.error);
            }
        };
    } catch (error) {
        console.error(error);
        showMessage('Erro ao enviar: ' + error.message, 'error');
    }
}

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
