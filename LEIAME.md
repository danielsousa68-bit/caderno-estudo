# Caderno de Estudo 10.º T5

App web instalável (PWA), em pt-PT, para portátil e telemóvel, que funciona sem internet. Os dados ficam no aparelho onde é usada e há cópia de segurança exportável (menu **Mais**).

## Ficheiros

| Ficheiro | Conteúdo |
|---|---|
| `dados.js` | Testes, eventos, interrupções, disciplinas, cores e plano de estudo do ano 2026/2027 |
| `logica.js` | Regras: dias bloqueados, recuperação de sessões, revisão espaçada, relatório |
| `app.js`, `ecras.js` | Ecrãs |
| `sw.js` | Guarda a app para funcionar offline |
| `test/regras.test.js` | Testes das regras (`node test/regras.test.js`) |

## Regras

- Horas de estudo: segunda e quarta 18:00–18:45, quinta 14:00–14:45.
- Sem sessões nas interrupções letivas (16/12–3/1, 20/3–4/4), nos feriados nem nos eventos escolares. Início e fim de período contam como dias de aulas normais.
- Uma disciplina nunca tem sessão no dia do próprio teste.
- Sessão falhada: a app propõe recuperá-la na hora de estudo seguinte que ainda não tenha essa disciplina, desde que seja antes do teste. Se houver várias falhadas, a do teste mais próximo fica com a primeira hora livre.
- Revisões de cada tema: 1, 3 e 7 dias depois da primeira vez, e nos 3 dias antes do teste.

## Publicar

A app tem de ser servida por HTTPS para se poder instalar (GitHub Pages, Netlify, etc.). Basta publicar esta pasta tal como está.
Quando mudar algum ficheiro, subir `VERSAO` em `sw.js` (por exemplo de `caderno-v2` para `caderno-v3`).

## Experimentar no computador

```bash
python3 -m http.server 5175
```
