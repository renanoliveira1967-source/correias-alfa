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
 *
 * Ao atualizar para a versão com relatórios: cole o arquivo inteiro MAS mantenha os seus PINs,
 * salve, rode "testarRelatorios" uma vez (autoriza o Drive) e faça Gerenciar implantações > lápis > Nova versão.
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
const PLANILHA_ID = '1Qv5s_TZQswhsn_b0k-lCsrawaVbc1Jvx0vNkwa2NOjc';
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

// pasta do Drive com os relatórios de emendas em PDF. Nome dos arquivos: TAG_AAAA-MM-DD_assunto.pdf
// a pasta pode ficar "Restrito": o painel lista e baixa os arquivos por este script
const PASTA_RELATORIOS = '1lK9iipM_WpDfzDXvg4sVOxGQu6X6_Uea';
const RELATORIO_MAX_MB = 20;

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.acao === 'relatorios') return resposta_({ok: true, arquivos: listarRelatorios_()});
  if (p.acao === 'baixar') return baixarRelatorio_(p.id);
  return resposta_({ok: true, servico: 'correias-alfa'});
}

// rode uma vez no editor depois de colar esta versão: o Google pede a autorização do Drive
function testarRelatorios() {
  Logger.log(listarRelatorios_().length + ' relatórios na pasta.');
}

function listarRelatorios_() {
  const it = DriveApp.getFolderById(PASTA_RELATORIOS).getFiles();
  const out = [];
  while (it.hasNext()) {
    const f = it.next();
    if (f.isTrashed() || f.getMimeType() !== MimeType.PDF) continue;
    out.push({id: f.getId(), nome: f.getName(), tamanho: f.getSize(),
      enviado: Utilities.formatDate(f.getDateCreated(), 'America/Sao_Paulo', 'yyyy-MM-dd'), por: f.getDescription() || ''});
  }
  return out;
}

function naPasta_(f) {
  const pais = f.getParents();
  while (pais.hasNext()) if (pais.next().getId() === PASTA_RELATORIOS) return true;
  return false;
}

function baixarRelatorio_(id) {
  let f = null;
  try { f = DriveApp.getFileById(String(id || '')); } catch (err) { f = null; }
  if (!f || f.isTrashed() || !naPasta_(f)) return resposta_({ok: false, erro: 'Relatório não encontrado.'});
  return resposta_({ok: true, nome: f.getName(), base64: Utilities.base64Encode(f.getBlob().getBytes())});
}

function salvarRelatorio_(d, nome) {
  const tag = String(d.tag || '').toUpperCase();
  const data = String(d.data || '');
  if (!/^\d{3}(TP|FLE)\d{3}[A-Z]?$/.test(tag)) return resposta_({ok: false, erro: 'TAG fora do padrão.'});
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return resposta_({ok: false, erro: 'Data inválida.'});
  const assunto = String(d.assunto || 'relatorio').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'relatorio';
  let bytes;
  try { bytes = Utilities.base64Decode(String(d.base64 || '')); } catch (err) { return resposta_({ok: false, erro: 'Arquivo ilegível.'}); }
  if (bytes.length < 5 || bytes.length > RELATORIO_MAX_MB * 1024 * 1024) return resposta_({ok: false, erro: 'O arquivo precisa ter até ' + RELATORIO_MAX_MB + ' MB.'});
  if (String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== '%PDF') return resposta_({ok: false, erro: 'Só é aceito arquivo PDF.'});
  const pasta = DriveApp.getFolderById(PASTA_RELATORIOS);
  let arq = tag + '_' + data + '_' + assunto, final = arq + '.pdf', n = 2;
  while (pasta.getFilesByName(final).hasNext()) final = arq + '-' + (n++) + '.pdf';
  const f = pasta.createFile(Utilities.newBlob(bytes, MimeType.PDF, final));
  f.setDescription('Enviado por ' + nome + ' em ' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'));
  return resposta_({ok: true, id: f.getId().slice(-8).toUpperCase(), nome: final, por: nome});
}

function doPost(e) {
  let dados;
  try { dados = JSON.parse(e.postData.contents); } catch (err) { return resposta_({ok: false, erro: 'Envio ilegível.'}); }
  const nome = PINS[String(dados.pin || '')];
  if (!nome) return resposta_({ok: false, erro: 'PIN não reconhecido.'});
  if (dados.acao === 'quem') return resposta_({ok: true, nome: nome});
  if (dados.acao === 'relatorio') return salvarRelatorio_(dados, nome);

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
