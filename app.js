const form = document.getElementById('posseForm');
const messageNode = document.getElementById('message');
const formFields = Array.from(form.querySelectorAll('input, select, textarea'));

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
        
        if (field.name === 'docTipo') {
            const docNumeroField = form.querySelector('input[name="docNumero"]');
            if (docNumeroField && docNumeroField.dataset.touched === 'true') {
                validateField(docNumeroField);
            }
        }
    });

    if (field.tagName === 'INPUT' && ['text', 'email', 'tel'].includes(field.type)) {
        field.addEventListener('input', () => {
            if (field.dataset.touched === 'true') {
                validateField(field);
            }
        });
    }
});

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    messageNode.textContent = '';
    messageNode.className = 'message';

    formFields.forEach((field) => {
        field.dataset.touched = 'true';
    });

    const allValid = formFields.every((field) => validateField(field));
    if (!allValid) {
        showMessage('Corrija os campos inválidos ou obrigatórios antes de enviar.', 'error');
        return;
    }

    const formData = new FormData(form);
    const nome = formData.get('nome')?.toString().trim() || '';
    const cpfRaw = formData.get('cpf')?.toString().trim() || '';
    const cpfDigits = cpfRaw.replace(/\D/g, '');
    const email = formData.get('email')?.toString().trim() || '';
    const celularRaw = formData.get('celular')?.toString().trim() || '';
    const celularDigits = celularRaw.replace(/\D/g, '');
    const fileInputs = Array.from(form.querySelectorAll('input[type="file"]'));
    const pdfFiles = fileInputs.flatMap(input => Array.from(input.files || [])).filter(file => file instanceof File && file.size > 0);

    const data = {
        nome: formData.get('nome')?.toString().trim(),
        cpf: cpfRaw,
        cpfDigits,
        email: formData.get('email')?.toString().trim(),
        celular: celularRaw,
        celularDigits,
        whatsappLink: `https://wa.me/${celularDigits}`,
        dataNascimento: formData.get('dataNascimento')?.toString().trim(),
        situacaoCpf: 'Arquivo PDF anexado',
        douNumero: formData.get('douNumero')?.toString().trim(),
        douData: formData.get('douData')?.toString().trim(),
        atoNumero: formData.get('atoNumero')?.toString().trim(),
        atoData: formData.get('atoData')?.toString().trim(),
        docTipo: formData.get('docTipo')?.toString().trim(),
        docNumero: formData.get('docNumero')?.toString().trim(),
        docOrgao: formData.get('docOrgao')?.toString().trim(),
        docUf: formData.get('docUf')?.toString().trim(),
        docEmissao: formData.get('docEmissao')?.toString().trim(),
        servidorCedido: formData.get('servidorCedido')?.toString().trim(),
        atoCessaoPagina: formData.get('atoCessaoPagina')?.toString().trim(),
        encargosFinanceiros: formData.get('encargosFinanceiros')?.toString().trim(),
        geradoEm: new Date().toLocaleString('pt-BR')
    };

    try {
        await gerarZip(data, pdfFiles);
    } catch (error) {
        console.error(error);
        showMessage('Erro ao gerar o ZIP. Verifique os arquivos e tente novamente.', 'error');
    }
});

function validateField(field) {
    const value = field.value?.toString().trim() || '';
    const isRequired = field.required;
    let valid = true;
    let errorMsg = '';

    if (field.type === 'file') {
        const files = Array.from(field.files || []);
        if (isRequired && files.length === 0) {
            valid = false;
            errorMsg = 'Arquivo obrigatório';
        } else if (files.length > 0) {
            const invalidFiles = files.filter(f => !isPdfFile(f));
            if (invalidFiles.length > 0) {
                valid = false;
                errorMsg = 'Apenas arquivos PDF são aceitos';
            }
        }
    } else {
        if (isRequired && value === '') {
            valid = false;
            errorMsg = 'Campo obrigatório';
        }

        if (valid && value !== '') {
            if (field.name === 'nome') {
                if (!/^[A-Za-zÀ-ÿ\s'-]+$/.test(value)) {
                    valid = false;
                    errorMsg = 'Nome não pode conter números ou caracteres especiais';
                }
            } else if (field.name === 'cpf') {
                const digits = value.replace(/\D/g, '');
                if (digits.length < 11) {
                    valid = false;
                    errorMsg = `CPF incompleto (${digits.length}/11 dígitos)`;
                } else if (digits.length > 11) {
                    valid = false;
                    errorMsg = 'CPF não pode ter mais de 11 dígitos';
                }
            } else if (field.name === 'email') {
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    valid = false;
                    errorMsg = 'Formato de e-mail inválido';
                }
            } else if (field.name === 'celular') {
                const digits = value.replace(/\D/g, '');
                if (digits.length < 10) {
                    valid = false;
                    errorMsg = `Celular incompleto (${digits.length}/mínimo 10 dígitos)`;
                } else if (digits.length > 15) {
                    valid = false;
                    errorMsg = 'Celular não pode ter mais de 15 dígitos';
                }
            } else if (field.name === 'docNumero') {
                const docTipo = form.querySelector('select[name="docTipo"]').value;
                if (!docTipo) {
                    valid = false;
                    errorMsg = 'Selecione o tipo de documento primeiro';
                } else {
                    const digits = value.replace(/\D/g, '');
                    if (docTipo === 'RG') {
                        if (digits.length < 7 || digits.length > 9) {
                            valid = false;
                            errorMsg = 'RG deve ter entre 7 e 9 dígitos';
                        }
                    } else if (docTipo === 'CNH') {
                        if (digits.length !== 11) {
                            valid = false;
                            errorMsg = `CNH incompleta (${digits.length}/11 dígitos)`;
                        }
                    } else if (docTipo === 'Carteira Profissional') {
                        if (digits.length < 6 || digits.length > 7) {
                            valid = false;
                            errorMsg = 'Carteira Profissional deve ter entre 6 e 7 dígitos';
                        }
                    }
                }
            } else if (field.name === 'dataNascimento') {
                const date = new Date(value);
                const today = new Date();
                const year = date.getFullYear();
                const minYear = 1900;
                const maxYear = today.getFullYear();

                if (year < minYear) {
                    valid = false;
                    errorMsg = `Ano deve ser a partir de ${minYear}`;
                } else if (year > maxYear) {
                    valid = false;
                    errorMsg = `Data não pode ser no futuro`;
                } else if (date > today) {
                    valid = false;
                    errorMsg = 'Data não pode ser no futuro';
                }
            }
        }
    }

    if (field.dataset.touched === 'true') {
        if (valid && (value !== '' || field.type === 'file')) {
            field.classList.add('field-valid');
            field.classList.remove('field-invalid');
            field.errorSpan.textContent = '';
        } else if (!valid) {
            field.classList.add('field-invalid');
            field.classList.remove('field-valid');
            field.errorSpan.textContent = errorMsg;
        } else {
            field.classList.remove('field-invalid', 'field-valid');
            field.errorSpan.textContent = '';
        }
    }

    return valid;
}

function isPdfFile(file) {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function showMessage(text, type = 'success') {
    messageNode.textContent = text;
    messageNode.className = `message ${type}`;
}

async function gerarZip(data, pdfFiles) {
    const zip = new JSZip();
    const infoLines = [];

    const now = new Date();
    const dataHora = now.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    infoLines.push('===== DOCUMENTAÇÃO DE POSSE DO SERVIDOR =====');
    infoLines.push('');
    infoLines.push(`Data e Hora de Envio: ${dataHora}`);
    infoLines.push('');
    infoLines.push('--- Dados do Servidor ---');
    infoLines.push(`Nome: ${data.nome}`);
    infoLines.push(`CPF: ${data.cpf}`);
    infoLines.push(`WhatsApp: ${data.whatsappLink}`);
    infoLines.push(`E-mail: ${data.email}`);
    infoLines.push(`Data de nascimento: ${data.dataNascimento}`);
    infoLines.push(`Situação cadastral do CPF: Arquivo PDF anexado`);
    infoLines.push('');
    infoLines.push('--- Ato de Nomeação ---');
    infoLines.push(`Número do DOU: ${data.douNumero}`);
    infoLines.push(`Data da publicação: ${data.douData}`);
    infoLines.push(`Número do ato: ${data.atoNumero}`);
    infoLines.push(`Data do ato: ${data.atoData}`);
    infoLines.push(`Página do ato do DOU: Arquivo PDF anexado`);
    infoLines.push('');
    infoLines.push('--- Documento de Identificação ---');
    infoLines.push(`Tipo: ${data.docTipo}`);
    infoLines.push(`Número: ${data.docNumero}`);
    infoLines.push(`Órgão emissor: ${data.docOrgao}`);
    infoLines.push(`UF: ${data.docUf}`);
    infoLines.push(`Data de emissão: ${data.docEmissao}`);
    infoLines.push('');
    infoLines.push('--- Cessão e Observações ---');
    infoLines.push(`Servidor cedido: ${data.servidorCedido}`);
    infoLines.push(`Página do ato de cessão: ${data.atoCessaoPagina}`);
    infoLines.push(`Encargos financeiros: ${data.encargosFinanceiros}`);
    infoLines.push('');
    infoLines.push('--- Documentos Anexados ---');
    infoLines.push('Os arquivos estão organizados em pastas por tipo de documento.');
    infoLines.push('');
    infoLines.push('================================================');

    zip.file('DADOS_POSSE.txt', infoLines.join('\n'));

    const docMapping = {
        situacaoCpf: 'Situação Cadastral CPF',
        certidaoCivil: 'Certidão Civil',
        tituloEleitor: 'Título de Eleitor',
        reservista: 'Reservista',
        comprovanteEscolaridade: 'Comprovante Escolaridade',
        comprovanteBancoBrasil: 'Comprovante Banco Brasil',
        comprovanteEndereco: 'Comprovante Endereço',
        dependentesCpf: 'Documentos Dependentes',
        autodeclaracaoSaude: 'Autodeclaração Saúde',
        quitacaoEleitoral: 'Quitação Eleitoral',
        cndMunicipalPalmas: 'CND Municipal Palmas',
        antecedentesSspTo: 'Antecedentes SSP TO',
        antecedentesPf: 'Antecedentes PF',
        antecedentesJusticaEstadual: 'Antecedentes Justiça Estadual',
        antecedentesJusticaFederal: 'Antecedentes Justiça Federal',
        atoPagina: 'Página Ato DOU'
    };

    const fileInputs = Array.from(form.querySelectorAll('input[type="file"]'));
    fileInputs.forEach((input) => {
        const folderName = docMapping[input.name] || input.name;
        const files = Array.from(input.files || []);
        if (files.length > 0) {
            const folder = zip.folder(folderName);
            files.forEach((file) => {
                folder.file(file.name, file);
            });
        }
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const fileName = `POSSE_${data.cpfDigits}_${timestamp}.zip`;
    
    await enviarParaServidor(blob, fileName, data);
}

async function enviarParaServidor(blob, nomeArquivo, data) {
    const BACKEND_URL = 'http://localhost:3001';
    
    try {
        const formData = new FormData();
        formData.append('file', blob, nomeArquivo);
        formData.append('nomeServidor', data.nome);
        formData.append('cpf', data.cpfDigits);

        const response = await fetch(`${BACKEND_URL}/api/upload-posse`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.details || result.error);
        }

        const dataFormatada = new Date(result.data).toLocaleDateString('pt-BR');
        showMessage(
            `Documentacao enviada com sucesso! Servidor "${result.folder}" foi organizado em ${dataFormatada} no Drive.`,
            'success'
        );
    } catch (error) {
        console.error('Erro ao enviar para servidor:', error);
        
        if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
            showMessage('Servidor indisponível. Verifique se ele está rodando em http://localhost:3001', 'error');
        } else {
            showMessage(`Erro ao enviar: ${error.message}`, 'error');
        }
    }
}
