// ================================================================
// 1. CONFIGURAÇÃO
// ================================================================
const SCRIPT_URL = "SUA_URL_DO_APPS_SCRIPT_AQUI"; 

const form = document.getElementById('posseForm');
const messageNode = document.getElementById('message');
const formFields = Array.from(form.querySelectorAll('input, select, textarea'));

// ================================================================
// 2. LOGICA DE SUBMISSÃO
// ================================================================

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    messageNode.textContent = '';
    
    // Validar campos
    const allValid = formFields.every((field) => {
        field.dataset.touched = 'true';
        const value = field.value?.trim() || '';
        if (field.required && value === '' && field.type !== 'file') return false;
        if (field.type === 'file' && field.required && field.files.length === 0) return false;
        return true;
    });

    if (!allValid) {
        showMessage('Por favor, preencha todos os campos obrigatórios.', 'error');
        return;
    }

    const formData = new FormData(form);
    const cpfRaw = formData.get('cpf')?.toString().trim() || '';
    const cpfDigits = cpfRaw.replace(/\D/g, '');
    
    // Captura TODOS os dados para a planilha e para o TXT
    const data = {
        nome: formData.get('nome'),
        cpf: cpfRaw,
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
        servidorCedido: formData.get('servidorCedido') || "Não",
        atoCessaoPagina: formData.get('atoCessaoPagina') || "N/A",
        encargosFinanceiros: formData.get('encargosFinanceiros') || "N/A",
        geradoEm: new Date().toLocaleString('pt-BR')
    };

    try {
        await gerarZip(data);
    } catch (error) {
        showMessage('Erro ao processar arquivos.', 'error');
    }
});

// ================================================================
// 3. GERAÇÃO DO ZIP (Com TXT completo)
// ================================================================

async function gerarZip(data) {
    const zip = new JSZip();
    
    let txt = `===== DADOS DE POSSE =====\n\nNome: ${data.nome}\nCPF: ${data.cpf}\nEmail: ${data.email}\n`;
    txt += `DOU: ${data.douNumero} de ${data.douData}\nAto: ${data.atoNumero}\n`;
    txt += `Documento: ${data.docTipo} nº ${data.docNumero}\n`;
    zip.file('DADOS_POSSE.txt', txt);

    const pastaDocumentos = zip.folder("DOCUMENTOS_ANEXADOS");
    const fileInputs = Array.from(form.querySelectorAll('input[type="file"]'));
    
    fileInputs.forEach((input) => {
        Array.from(input.files || []).forEach((file) => {
            pastaDocumentos.file(file.name, file);
        });
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const fileName = `POSSE_${data.nome.toUpperCase().replace(/\s+/g, '_')}.zip`;
    
    await enviarParaGoogleDrive(blob, fileName, data);
}

// ================================================================
// 4. ENVIO DUPLO (PLANILHA + DRIVE)
// ================================================================

async function enviarParaGoogleDrive(blob, nomeArquivo, data) {
    showMessage('Iniciando envio seguro (Drive + Planilha)...', 'success');

    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async function() {
        const base64data = reader.result.split(',')[1];
        
        try {
            const response = await fetch(SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify({
                    contents: base64data,
                    filename: nomeArquivo,
                    data: data // Aqui enviamos os textos para a Planilha
                }),
                headers: { "Content-Type": "text/plain;charset=utf-8" }
            });

            const result = await response.json();

            if (result.result === "success") {
                showMessage(`Sucesso! Registrado na planilha e salvo no Drive (${result.folder}).`, 'success');
                form.reset();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            showMessage('Erro no envio: ' + error.message, 'error');
        }
    };
}

function showMessage(text, type) {
    messageNode.textContent = text;
    messageNode.className = `message ${type}`;
}
