/* ===== Fontes de dados: abas publicadas da planilha do Google (Arquivo > Compartilhar > Publicar na Web > CSV) ===== */
// cópia da planilha na conta do Renan (desde 18/11/2026; a original era do Leonardo)
var CA_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR5Q6RsLsvQ5AMgdhXw8By5e4ZFTnmQyLHeLIodjO0hWKNceExtSJ6f02wiErsCVyRjlvLisgsEXlZf/pub?single=true&output=csv&gid=';
var CA_FONTES = [
  {id: 'atividades', nome: 'ATIVIDADES 2026', gid: '1267231826', dev: 'atividades.csv'},
  {id: 'especificacao', nome: 'ESPECIFICAÇÃO', gid: '812110065', dev: 'especificacao.csv'},
  {id: 'condicao', nome: 'Condição atual', gid: '1114046089', dev: 'condicao.csv'},
  {id: 'equipamento', tag: '220TP003', nome: '220TP003', gid: '69770680', dev: '220TP003.csv'},
  {id: 'equipamento', tag: '150TP004', nome: '150TP004', gid: '875471775', dev: '150TP004.csv'},
  // abas criadas pela página de lançamentos (publicar como CSV e colar o gid aqui)
  {id: 'lanc_ativ', nome: 'LANÇ ATIVIDADES', gid: '751093016', dev: 'lanc_ativ.csv', opcional: true},
  {id: 'lanc_insp', nome: 'LANÇ INSPEÇÕES', gid: '676100646', dev: 'lanc_insp.csv', opcional: true},
  {id: 'lanc_trechos', nome: 'LANÇ TRECHOS', gid: '1882084482', dev: 'lanc_trechos.csv', opcional: true}
];
// endereço do App da Web do Apps Script que grava os lançamentos na planilha
var CA_GRAVACAO = 'https://script.google.com/macros/s/AKfycbz3VlL0IuWyhmPPkfgQZUcd92Ju6XRmTfKM1I4VhRVAKEpaBuERygFyAmiwIUKsdxzYkA/exec';

/* ===== Leitura e limpeza (as planilhas são lidas pelo nome das colunas, não pela posição) ===== */
var CA = window.CA = {};
CA.csv = function (t) {
  var out = [], row = [], f = '', q = false;
  t = String(t || '');
  for (var i = 0; i < t.length; i++) {
    var c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); out.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); out.push(row); }
  return out;
};
CA.semAcento = function (s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim(); };
CA.txt = function (v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().toUpperCase(); };
CA.num = function (s) {
  s = String(s == null ? '' : s).trim().replace(/\s/g, '').replace(/MM$|M$/i, '');
  if (!s) return null;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(',', '.');
  var n = Number(s);
  return isNaN(n) ? null : n;
};
CA.data = function (s) {
  s = String(s || '').trim().replace(/\/+/g, '/');
  var m = s.match(/^(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?$/);
  if (!m) return null;
  var d = Number(m[1]), mo = Number(m[2]);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  var y = !m[3] ? 2026 : m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  return y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
};
CA.semAno = function (s) { return /^\d{1,2}[\/-]\d{1,2}$/.test(String(s || '').trim()); };
CA.dias = function (a, b) { return Math.round((Date.parse(a) - Date.parse(b)) / 86400000); };
CA.tag = function (s) {
  var t = CA.txt(s).replace(/\s+/g, '');
  var m = t.match(/^E89[A-Z]-0?(\d{3})-TP-(\d{3})$/);
  if (m) return m[1] + 'TP' + m[2];
  m = t.match(/^(\d{3})(TP|FLE)(\d+)([A-Z]?)$/);
  return m ? m[1] + m[2] + m[3].padStart(3, '0') + m[4] : t;
};
CA.tagValida = function (t) { return /^\d{3}(TP|FLE)\d{3}[A-Z]?$/.test(t); };
CA.planta = function (tag) { var a = String(tag).charAt(0); return a === '1' || a === '2' ? 'MINERAL' : a === '3' ? 'ÁCIDOS' : a === '4' ? 'FERTILIZANTES' : ''; };
CA.tipoCarcaca = function (c) {
  c = CA.semAcento(c);
  if (/(^|[^A-Z])ST\s*\d/.test(c)) return 'CABO DE AÇO';
  if (/EP|PN|PL\s*\d|NN\s*\d|MB\s*\d|POLIESTER|NYLON/.test(c)) return 'LONA';
  return '';
};
CA.cabecalho = function (rows, testa) {
  for (var i = 0; i < rows.length; i++) {
    var h = rows[i].map(CA.semAcento);
    if (testa(h)) {
      return {i: i, h: h, col: function () {
        var nomes = Array.prototype.slice.call(arguments), j, k;
        for (k = 0; k < nomes.length; k++) { j = this.h.indexOf(nomes[k]); if (j >= 0) return j; }
        for (k = 0; k < nomes.length; k++) { for (j = 0; j < this.h.length; j++) if (this.h[j].indexOf(nomes[k]) === 0) return j; }
        return -1;
      }};
    }
  }
  return null;
};
CA.cel = function (r, j) { return j >= 0 && r[j] != null ? String(r[j]) : ''; };

CA.lerAtividades = function (rows, origem) {
  var c = CA.cabecalho(rows, function (h) { return h.indexOf('EQUIPAMENTO') >= 0 && h.indexOf('ATIVIDADE') >= 0; });
  if (!c) return [];
  var j = {eq: c.col('EQUIPAMENTO'), pl: c.col('PLANTA'), at: c.col('ATIVIDADE'), tp: c.col('TIPO DE EMENDA OU REPARO', 'TIPO DE EMENDA'),
    dt: c.col('DATA'), h: c.col('DURACAO EM HORAS', 'DURACAO'), pg: c.col('PROGRAMACAO'), si: c.col('SITUACAO'), mo: c.col('MOTIVO'), ob: c.col('OBS', 'OBSERVACAO'),
    id: c.h.indexOf('ID'), lp: c.h.indexOf('LANCADO POR'), bo: c.h.indexOf('BOBINAS'), mi: c.h.indexOf('METROS IMPLEMENTADOS'), ef: c.h.indexOf('EMENDAS FEITAS'),
    fa: c.h.indexOf('FABRICANTE'), eqp: c.h.indexOf('EQUIPE'), os: c.h.indexOf('OS')};
  var out = [];
  for (var i = c.i + 1; i < rows.length; i++) {
    var r = rows[i], bruto = CA.cel(r, j.eq).trim();
    if (!bruto) continue;
    var tag = CA.tag(bruto);
    if (!CA.tagValida(tag)) continue;
    var dtx = CA.cel(r, j.dt).trim(), data = CA.data(dtx), h = CA.txt(CA.cel(r, j.h));
    out.push({
      id: origem + ':' + (i + 1), origem: origem, linha: i + 1, equipamento: tag, tag_original: bruto,
      planta: CA.txt(CA.cel(r, j.pl)) || CA.planta(tag), atividade: CA.txt(CA.cel(r, j.at)), tipo_reparo: CA.txt(CA.cel(r, j.tp)),
      data: data, data_texto: dtx, mes: data ? data.slice(0, 7) : '', horas: h === '' ? null : CA.num(h), parada_anual: h === 'PARADA ANUAL',
      programacao: CA.txt(CA.cel(r, j.pg)), situacao: CA.txt(CA.cel(r, j.si)), motivo: CA.txt(CA.cel(r, j.mo)), obs: CA.cel(r, j.ob).trim(),
      // colunas que só existem nos lançamentos feitos pela página
      lanc_id: CA.cel(r, j.id).trim(), lancado_por: CA.cel(r, j.lp).trim(), bobinas_inf: CA.num(CA.cel(r, j.bo)), metros_inf: CA.num(CA.cel(r, j.mi)),
      emendas_inf: CA.num(CA.cel(r, j.ef)), fabricante: CA.txt(CA.cel(r, j.fa)), equipe: CA.cel(r, j.eqp).trim(), os: CA.cel(r, j.os).trim()
    });
  }
  return out;
};

CA.lerEspecificacao = function (rows) {
  var c = CA.cabecalho(rows, function (h) { return h.indexOf('EQUIPAMENTO') >= 0 && h.some(function (x) { return x.indexOf('CODIGO SAP') === 0; }); });
  if (!c) return [];
  var j = {eq: c.col('EQUIPAMENTO'), mat: c.col('MATERIAL TRANSPORTADO'), ca: c.col('TIPO DE CARCACA'), lo: c.col('LONAS'), co: c.col('TIPO DA COBERTURA'), po: c.col('POLEGADA'), m: c.col('METROS'), sap: c.col('CODIGO SAP')};
  var out = [];
  for (var i = c.i + 1; i < rows.length; i++) {
    var r = rows[i], tagL = CA.txt(CA.cel(r, j.eq)), m = tagL.match(/^E89([A-Z])-0?(\d{3})-TP-(\d{3})$/);
    if (!m) continue;
    var pol = CA.cel(r, j.po).trim(), pm = pol.match(/^(\d+)/);
    out.push({equipamento: m[2] + 'TP' + m[3], tag_spec: tagL, material: CA.cel(r, j.mat).trim(), carcaca: CA.cel(r, j.ca).trim(),
      lonas: CA.cel(r, j.lo).trim(), cobertura: CA.cel(r, j.co).trim(), largura_pol: pm ? Number(pm[1]) : null, metros: CA.num(CA.cel(r, j.m)),
      sap: CA.cel(r, j.sap).trim(), desativada: /DESATIVADA/i.test(pol)});
  }
  return out;
};

CA.lerCondicao = function (rows) {
  var c = CA.cabecalho(rows, function (h) { return h.some(function (x) { return x.indexOf('EQUIPAMENTO') === 0; }) && h.indexOf('SITUACAO') >= 0; });
  if (!c) return [];
  var j = {eq: c.col('EQUIPAMENTO'), re: c.col('RESPONSAVEL EUROCHEM', 'RESPONSAVEL'), pp: c.col('CORREIA PREPARADA'), rc: c.col('RECURSO NECESSARIO', 'RECURSO'),
    la: c.col('LARGURA'), co: c.col('COMPRIMENTO'), de: c.col('DETALHES'), cb: c.col('COBERTURA'), es: c.col('ESPECIFICACAO'), si: c.col('SITUACAO'),
    ob: c.col('OBS'), us: c.col('ULT. SUBSTITUICAO', 'ULT SUBSTITUICAO'), em: c.col('EMENDA')};
  var out = [];
  for (var i = c.i + 1; i < rows.length; i++) {
    var r = rows[i], tag = CA.tag(CA.cel(r, j.eq));
    if (!CA.tagValida(tag)) continue;
    var si = CA.semAcento(CA.cel(r, j.si));
    var situacao = si === 'CRITICO' ? 'CRÍTICO' : si === 'REGULAR' ? 'REGULAR' : (si === 'BOM' || si === 'OK') ? 'BOM' : 'SEM AVALIAÇÃO';
    var es = CA.cel(r, j.es).trim();
    out.push({equipamento: tag, planta: CA.planta(tag), responsavel: CA.cel(r, j.re).trim(), preparada: CA.txt(CA.cel(r, j.pp)), recursos: CA.cel(r, j.rc).trim(),
      largura_pol: CA.num(CA.cel(r, j.la)), comprimento: CA.num(CA.cel(r, j.co)), medida: CA.txt(CA.cel(r, j.de)), cobertura: CA.cel(r, j.cb).trim(),
      carcaca: es === '-' ? '' : es, situacao: situacao, obs: CA.cel(r, j.ob).trim(), ult_subst: CA.data(CA.cel(r, j.us)), emenda: CA.txt(CA.cel(r, j.em))});
  }
  return out;
};

CA.FABRICANTES = ['MERCURIO', 'METSO', 'BORPAC', 'FAGUNDES', 'CONTINENTAL', 'GOODYEAR', 'FENNER', 'SEMPERTRANS', 'FLEXSTEEL'];
CA.colunasTrecho = function (c) {
  return {dt: c.col('DATA TRECHO'), tr: c.col('TRECHO'), pol: c.col('POL', 'LARGURA MEDIDA'), no: c.col('NOMECLATURA', 'NOMENCLATURA'), m: c.col('COMPRIMENTO(M)', 'COMPRIMENTO (M)', 'M', 'COMPRIMENTO'),
    es: c.col('ESPESSURA'), em: c.col('EMENDAS'), ce: c.col('CENTRO DA CORREIA'), re: c.col('REPAROS'), sr: c.col('SITUACAO REPAROS'), bo: c.col('BORDAS'), sb: c.col('SITUACAO DAS BORDAS'),
    eq: c.h.indexOf('EQUIPAMENTO'), di: c.h.indexOf('DATA INSPECAO'), or: c.h.indexOf('ORDEM'), id: c.h.indexOf('ID')};
};
CA.trechoDaLinha = function (r, j, tag, ordem) {
  var ok = function (v) { return /^(OK|N\/?A|NA|)$/.test(CA.semAcento(v)); };
  var nome = CA.cel(r, j.tr).replace(/\s+/g, ' ').trim();
  if (nome.indexOf('/') < 0) return null;
  var partes = nome.split(/\/+/).map(function (s) { return s.trim(); });
  var dts = partes.map(function (p) { var m = p.match(/(\d{1,2})-(\d{1,2})-(\d{2})(?!\d)/); return m ? CA.data(m[1] + '/' + m[2] + '/' + m[3]) : null; });
  var dInst = CA.data(CA.cel(r, j.dt));
  if (!dInst && dts[0] && dts[1] && Math.abs(CA.dias(dts[0], dts[1])) <= 3) dInst = dts[0] > dts[1] ? dts[0] : dts[1];
  var no = CA.semAcento(CA.cel(r, j.no)), fab = '';
  CA.FABRICANTES.forEach(function (f) { if (!fab && no.indexOf(f) >= 0) fab = f; });
  if (!fab) fab = (no.split(' ')[0] || '').replace(/[^A-Z]/g, '');
  var cl = no.match(/ST\s*\d+/), cab = no.match(/(\d+)\s*CABOS/);
  var t = {equipamento: tag, ordem: ordem, nome: nome, inicio: partes[0], fim: partes[partes.length - 1], data_instalacao: dInst,
    comprimento: CA.num(CA.cel(r, j.m)), espessura: CA.num(CA.cel(r, j.es)), largura_medida: CA.num(CA.cel(r, j.pol)), fabricante: fab || 'NÃO INFORMADO',
    nomenclatura: CA.cel(r, j.no).trim(), classe: cl ? cl[0].replace(/\s/g, '') : '', cabos: cab ? Number(cab[1]) : null,
    centro: CA.cel(r, j.ce).trim(), emendas: CA.cel(r, j.em).trim(), bordas: CA.cel(r, j.bo).trim(), reparos: CA.cel(r, j.re).trim(),
    situacao_reparos: CA.cel(r, j.sr).trim(), situacao_bordas: CA.cel(r, j.sb).trim()};
  t.problema = !ok(t.centro) || !ok(t.emendas) || !ok(t.bordas) || /NOK|REALIZAR|PRECISA|DANIFICAD/.test(CA.semAcento(t.situacao_reparos + ' ' + t.situacao_bordas));
  return t;
};
CA.lerEquipamento = function (rows, tag) {
  var trechos = [];
  var c = CA.cabecalho(rows, function (h) { return h.indexOf('TRECHO') >= 0 && h.indexOf('EMENDAS') >= 0; });
  if (c) {
    var j = CA.colunasTrecho(c);
    for (var i = c.i + 1; i < rows.length; i++) {
      var t = CA.trechoDaLinha(rows[i], j, tag, trechos.length + 1);
      if (!t) { if (trechos.length) break; continue; }
      t.data_inspecao = null;
      trechos.push(t);
    }
  }
  return {trechos: trechos, atividades: CA.lerAtividades(rows, 'aba ' + tag)};
};

/* Lançamentos de trechos: vale o mapa da inspeção mais recente de cada correia */
CA.lerLancTrechos = function (rows) {
  var c = CA.cabecalho(rows, function (h) { return h.indexOf('TRECHO') >= 0 && h.indexOf('EQUIPAMENTO') >= 0; });
  if (!c) return [];
  var j = CA.colunasTrecho(c), out = [];
  for (var i = c.i + 1; i < rows.length; i++) {
    var r = rows[i], tag = CA.tag(CA.cel(r, j.eq));
    if (!CA.tagValida(tag)) continue;
    var t = CA.trechoDaLinha(r, j, tag, CA.num(CA.cel(r, j.or)) || i);
    if (!t) continue;
    t.data_inspecao = CA.data(CA.cel(r, j.di));
    t.lanc_id = CA.cel(r, j.id).trim();
    out.push(t);
  }
  return out;
};
CA.ultimoMapa = function (trechos) {
  // por correia, só o lote (ID) mais recente: maior data de inspeção; empate, o último lançado
  var porTag = {};
  trechos.forEach(function (t, i) {
    var k = t.equipamento, chave = (t.data_inspecao || '') + '|' + String(i).padStart(6, '0');
    if (!porTag[k] || chave > porTag[k].chave) porTag[k] = {chave: chave, id: t.lanc_id};
  });
  return trechos.filter(function (t) { return porTag[t.equipamento].id === t.lanc_id; })
    .sort(function (a, b) { return a.equipamento.localeCompare(b.equipamento) || a.ordem - b.ordem; });
};

/* Lançamentos de inspeção: a mais recente de cada correia atualiza a condição atual */
CA.lerLancInspecoes = function (rows) {
  var c = CA.cabecalho(rows, function (h) { return h.indexOf('EQUIPAMENTO') >= 0 && h.indexOf('SITUACAO') >= 0 && h.some(function (x) { return x.indexOf('O QUE FOI VISTO') === 0; }); });
  if (!c) return [];
  var j = {eq: c.col('EQUIPAMENTO'), dt: c.col('DATA'), si: c.col('SITUACAO'), vi: c.col('O QUE FOI VISTO'), ac: c.col('ACAO RECOMENDADA'), pp: c.col('CORREIA PREPARADA'),
    rc: c.col('RECURSOS NECESSARIOS', 'RECURSOS'), la: c.col('LARGURA MEDIDA'), in: c.col('INSPETOR'), lp: c.col('LANCADO POR')};
  var out = [];
  for (var i = c.i + 1; i < rows.length; i++) {
    var r = rows[i], tag = CA.tag(CA.cel(r, j.eq));
    if (!CA.tagValida(tag)) continue;
    var si = CA.semAcento(CA.cel(r, j.si));
    out.push({equipamento: tag, data: CA.data(CA.cel(r, j.dt)), linha: i,
      situacao: si === 'CRITICO' ? 'CRÍTICO' : si === 'REGULAR' ? 'REGULAR' : si === 'BOM' ? 'BOM' : 'SEM AVALIAÇÃO',
      visto: CA.cel(r, j.vi).trim(), acao: CA.cel(r, j.ac).trim(), preparada: CA.txt(CA.cel(r, j.pp)), recursos: CA.cel(r, j.rc).trim(),
      largura_medida: CA.num(CA.cel(r, j.la)), inspetor: CA.cel(r, j.in).trim() || CA.cel(r, j.lp).trim()});
  }
  return out;
};
CA.aplicarInspecoes = function (condicao, inspecoes) {
  var ult = {};
  inspecoes.forEach(function (x) {
    var k = x.equipamento, chave = (x.data || '') + '|' + String(x.linha).padStart(6, '0');
    if (!ult[k] || chave > ult[k].chave) ult[k] = {chave: chave, x: x};
  });
  var porTag = {};
  var out = condicao.map(function (c) { var o = Object.assign({}, c); porTag[c.equipamento] = o; return o; });
  Object.keys(ult).forEach(function (k) {
    var x = ult[k].x, o = porTag[k];
    if (!o) { o = {equipamento: k, planta: CA.planta(k), responsavel: '', preparada: '', recursos: '', largura_pol: null, comprimento: null, medida: '', cobertura: '', carcaca: '', situacao: 'SEM AVALIAÇÃO', obs: '', ult_subst: null, emenda: ''}; out.push(o); porTag[k] = o; }
    o.situacao = x.situacao;
    o.obs = [x.data ? x.data.slice(8, 10) + '/' + x.data.slice(5, 7) + ': ' : ''].join('') + [x.visto, x.acao ? 'Ação: ' + x.acao : ''].filter(Boolean).join(' · ');
    if (x.preparada) o.preparada = x.preparada;
    if (x.recursos) o.recursos = x.recursos;
    o.data_inspecao = x.data;
    o.inspetor = x.inspetor;
  });
  return out;
};

/* Relatórios de emendas (PDFs na pasta do Drive). Nome do arquivo: TAG_AAAA-MM-DD_assunto.pdf */
CA.lerRelatorio = function (f) {
  var base = String(f.nome || '').replace(/\.pdf$/i, '');
  var m = base.match(/^([^_]+)_(\d{4}-\d{2}-\d{2})_?(.*)$/);
  var tag = m ? CA.tag(m[1]) : '';
  var assunto = m ? m[3] : base;
  assunto = assunto.replace(/[-_]+/g, ' ').trim()
    .replace(/\brelatorio\b/gi, 'relatório').replace(/\binspecao\b/gi, 'inspeção').replace(/\bmanutencao\b/gi, 'manutenção').replace(/\bvulcanizacao\b/gi, 'vulcanização');
  return {id: f.id, nome: f.nome, tamanho: f.tamanho || 0, enviado: f.enviado || '', por: f.por || '',
    tag: CA.tagValida(tag) ? tag : '', data: m ? m[2] : '', planta: CA.tagValida(tag) ? CA.planta(tag) : '',
    titulo: assunto ? assunto.charAt(0).toUpperCase() + assunto.slice(1) : 'Relatório'};
};
CA.baixarRelatorio = function (id) {
  return fetch(CA_GRAVACAO + '?acao=baixar&id=' + encodeURIComponent(id), {cache: 'no-store'})
    .then(function (r) { if (!r.ok) throw new Error('o servidor respondeu ' + r.status + '.'); return r.json(); })
    .then(function (r) {
      if (!r.ok) throw new Error(r.erro || 'não foi possível baixar.');
      var bin = atob(r.base64), u8 = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      return {nome: r.nome, blob: new Blob([u8], {type: 'application/pdf'})};
    });
};
