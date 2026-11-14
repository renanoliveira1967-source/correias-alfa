/**
 * Correias Alfa · gravação dos lançamentos na planilha
 *
 * Como instalar (uma vez só):
 *  1. Na planilha do Google: Extensões > Apps Script.
 *  2. Apague o que estiver no editor e cole este arquivo inteiro.
 *  3. Troque os PINs de exemplo abaixo (um por pessoa, só números) e clique em Salvar.
 *  4. No menu de funções lá em cima, escolha "configurar" e clique em Executar. Autorize quando o Google pedir.
 *     Isso cria as abas LANÇ ATIVIDADES, LANÇ INSPEÇÕES e LANÇ TRECHOS.
 *  5. Implantar > Nova implantação > tipo "App da Web".
 *     Executar como: Eu. Quem pode acessar: Qualquer pessoa. Clique em Implantar e copie a URL do App da Web.
 *
 * Para trocar um PIN depois: edite, salve e faça Implantar > Gerenciar implantações > editar > Nova versão.
 * Os PINs ficam só aqui, dentro da planilha. Não coloque PINs no GitHub.
 */
const PINS = {
  '0000': 'Leonardo Caetano',
  '1111': 'Gustavo Luiz'
};

const ABAS = {
  atividade: {
    nome: 'LANÇ ATIVIDADES',
    colunas: ['ID', 'CRIADO EM', 'LANÇADO POR', 'EQUIPAMENTO', 'PLANTA', 'DATA', 'ATIVIDADE', 'TIPO DE EMENDA OU REPARO', 'PROGRAMAÇÃO', 'MOTIVO',
      'DURAÇÃO EM HORAS', 'SITUAÇÃO', 'BOBINAS', 'METROS IMPLEMENTADOS', 'EMENDAS FEITAS', 'FABRICANTE', 'EQUIPE', 'OS', 'OBS']
  },
  inspecao: {
    nome: 'LANÇ INSPEÇÕES',
    colunas: ['ID', 'CRIADO EM', 'LANÇADO POR', 'EQUIPAMENTO', 'DATA', 'SITUAÇÃO', 'O QUE FOI VISTO', 'AÇÃO RECOMENDADA', 'CORREIA PREPARADA?',
      'RECURSOS NECESSÁRIOS', 'LARGURA MEDIDA (POL)', 'INSPETOR']
  },
  trecho: {
    nome: 'LANÇ TRECHOS',
    colunas: ['ID', 'CRIADO EM', 'LANÇADO POR', 'EQUIPAMENTO', 'DATA INSPEÇÃO', 'ORDEM', 'TRECHO', 'DATA TRECHO', 'COMPRIMENTO (M)', 'ESPESSURA (MM)',
      'NOMECLATURA', 'POL', 'CENTRO DA CORREIA', 'EMENDAS', 'BORDAS', 'REPAROS', 'SITUAÇÃO REPAROS']
  }
};

// planilha do relatório: funciona tanto colado pela planilha (Extensões > Apps Script) quanto num projeto avulso
const PLANILHA_ID = '1qj79sFW3A26g6i3JTXBzoodn8_RlhRPN51GLrrQn0_g';
function planilha_() {
  return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(PLANILHA_ID);
}

function configurar() {
  const ss = planilha_();
  Object.keys(ABAS).forEach(function (k) { aba_(ss, ABAS[k]); });
}

function aba_(ss, def) {
  let sh = ss.getSheetByName(def.nome);
  if (!sh) {
    sh = ss.insertSheet(def.nome);
    sh.getRange(1, 1, 1, def.colunas.length).setValues([def.colunas]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange(1, 1, sh.getMaxRows(), def.colunas.length).setNumberFormat('@');
  }
  return sh;
}

function resposta_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return resposta_({ok: true, servico: 'correias-alfa'});
}

function doPost(e) {
  let dados;
  try { dados = JSON.parse(e.postData.contents); } catch (err) { return resposta_({ok: false, erro: 'Envio ilegível.'}); }
  const nome = PINS[String(dados.pin || '')];
  if (!nome) return resposta_({ok: false, erro: 'PIN não reconhecido.'});
  if (dados.acao === 'quem') return resposta_({ok: true, nome: nome});

  const def = ABAS[dados.tipo];
  if (!def) return resposta_({ok: false, erro: 'Tipo de lançamento desconhecido.'});
  const regs = Array.isArray(dados.registros) ? dados.registros : [];
  if (!regs.length || regs.length > 300) return resposta_({ok: false, erro: 'Nada para gravar.'});

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = aba_(planilha_(), def);
    const agora = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');
    const id = Utilities.getUuid().slice(0, 8).toUpperCase();
    const linhas = regs.map(function (r) {
      return def.colunas.map(function (c) {
        if (c === 'ID') return id;
        if (c === 'CRIADO EM') return agora;
        if (c === 'LANÇADO POR') return nome;
        return limpar_(r[c]);
      });
    });
    sh.getRange(sh.getLastRow() + 1, 1, linhas.length, def.colunas.length).setNumberFormat('@').setValues(linhas);
    return resposta_({ok: true, id: id, linhas: linhas.length, por: nome});
  } finally {
    lock.releaseLock();
  }
}

function limpar_(v) {
  if (v == null) return '';
  v = String(v).replace(/\r/g, '').slice(0, 3000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}
