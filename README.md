# Correias Alfa 2026

Painel de acompanhamento das intervenções em correias transportadoras (Alfa Transportadores · cliente EuroChem, unidade Serra do Salitre).

## Como os dados chegam

A página não guarda dados. Toda vez que alguém abre o painel (ou clica em **Atualizar dados**), ela lê as duas abas publicadas da planilha do Google:

- **Atividades**: aba `gid=1267231826`
- **Especificação**: aba `gid=812110065`

Basta a equipe preencher a planilha. O Google pode levar alguns minutos para refletir uma edição no link publicado.

## Cuidados com a planilha

- Não renomear, apagar nem mudar a ordem das colunas do cabeçalho. O painel lê as colunas pela posição.
- TAGs abreviadas (ex.: `435TP04`) são aceitas e lidas como a TAG completa (`435TP004`).
- Datas no formato `dd/mm/aaaa`. Datas sem ano são lidas como 2026.

## Privacidade

O site no GitHub Pages e a planilha publicada podem ser abertos por qualquer pessoa que tiver o link. A página pede aos buscadores que não a indexem, mas isso não é uma senha.

## Arquivos

- `index.html`: a página inteira (estilo, regras de cálculo e gráficos).
- `assets/logo-alfa.png` e `assets/logo-eurochem.svg`: logotipos em versão para fundo escuro.

Painel: Renan · Eng. Mecânico
