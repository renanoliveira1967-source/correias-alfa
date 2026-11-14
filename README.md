# Correias Alfa 2026

Painel de acompanhamento das intervenções em correias transportadoras (Alfa Transportadores · cliente EuroChem, unidade Serra do Salitre).

## Como os dados chegam

A página não guarda dados. Toda vez que alguém abre o painel (ou clica em **Atualizar dados**), ela lê as abas publicadas da planilha do Google:

- **ATIVIDADES 2026** (`gid=1267231826`): intervenções; é a fonte dos números.
- **ESPECIFICAÇÃO** (`gid=812110065`): cadastro de projeto (comprimento, largura, carcaça, SAP).
- **Condição atual** (`gid=1114046089`): situação da última inspeção, carcaça instalada, largura, comprimento, responsável EuroChem.
- **220TP003** (`gid=69770680`) e **150TP004** (`gid=875471775`): mapa de trechos emenda a emenda e atividades do equipamento.

Para incluir outra aba de equipamento, publique-a como CSV e acrescente uma linha em `CA_FONTES`, no início do `index.html`.

Basta a equipe preencher a planilha. O Google pode levar alguns minutos para refletir uma edição no link publicado.

## Regras principais

- **Empalmo** é a troca de um ou mais trechos. Conta 2 emendas para ligar o trecho novo à correia velha, mais 1 por bobina emendada a outra (3 bobinas = 4 emendas). Sem o mapa de trechos, conta 2 (mínimo).
- **Metros aplicados** = comprimento da correia inteira em cada substituição + metros que entraram em cada empalmo ("implementar ... m" ou soma dos trechos novos do mapa).
- A aba ATIVIDADES 2026 manda nos números. As abas por equipamento completam observações e metragens; quando discordam, aparece em **Pontos a conferir**.

## Cuidados com a planilha

- O painel lê as colunas pelo nome do cabeçalho. Não renomeie as colunas; colunas novas podem ser acrescentadas.
- TAGs abreviadas (ex.: `435TP04`) são aceitas e lidas como a TAG completa (`435TP004`).
- Datas no formato `dd/mm/aaaa`. Datas sem ano são lidas como 2026.

## Privacidade

O site no GitHub Pages e a planilha publicada podem ser abertos por qualquer pessoa que tiver o link. A página pede aos buscadores que não a indexem, mas isso não é uma senha.

## Arquivos

- `index.html`: a página inteira (estilo, regras de cálculo e gráficos).
- `assets/logo-alfa.png` e `assets/logo-eurochem.svg`: logotipos em versão para fundo escuro.

Painel: Renan · Eng. Mecânico
