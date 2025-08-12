import fetch from "node-fetch";
import * as cheerio from "cheerio";
import * as https from "https";

const agent = new https.Agent({ rejectUnauthorized: false });

const baseUrl = "http://transparencia.recife.pe.gov.br/codigos/web/lai/";
const targetUrl = baseUrl + "historicoPedidoInformacao.php?id=1";

interface Credencial {
  protocolo: string;
  senha: string;
}

interface PedidoInformacao {
  protocolo: string;
  recurso: string;
  dataPedido: string;
  motivo: string;
  descricao: string;
  historicoRespostas: Array<{
    situacao: string;
    data: string;
    resposta: string;
    links: Array<{
      title: string;
      type: string;
      url: string;
    }>;
  }>;
  mensagemFinal: string;
}

// function extractFieldFromHtml(html: string, keyword: string): string {
//   const regex = new RegExp("<b>\\s*" + keyword + "\\s*<\\/b>\\s*-\\s*(.*?)<br\\s*\\/?>", "i");
//   const match = html.match(regex);
//   return match ? match[1].trim() : "";
// }

async function processCredential(cred: Credencial): Promise<PedidoInformacao | { error: string }> {
  try {
    // Primeiro GET para pegar cookies
    const getRes = await fetch(targetUrl.replace('http:', 'https:'), { 
      method: "GET",
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
      }
    });
    if (!getRes.ok) throw new Error("GET request error: " + getRes.status);
    
    const cookies = getRes.headers.get('set-cookie') || '';

    // POST com dados do formulário
    const postBody = `processo=${cred.protocolo}&senha=${cred.senha}&enviar=T&id=1&critica=1`;
    
    const postRes = await fetch(targetUrl.replace('http:', 'https:'), {
      method: "POST",
      body: postBody,
      headers: { 
        "Content-Type": "application/x-www-form-urlencoded",
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        'Referer': targetUrl.replace('http:', 'https:'),
        'Cookie': cookies,
        'Content-Length': postBody.length.toString()
      },
      agent
    });
    if (!postRes.ok) throw new Error("POST request error: " + postRes.status);

    const body = await postRes.text();
    const $ = cheerio.load(body);

    // Buscar protocolo
    let protocoloExtracted = $('.label').first().text().trim();
    if (!protocoloExtracted) {
      const protocoloMatch = body.match(/Protocolo[^\d]*(\d+)/i);
      protocoloExtracted = protocoloMatch ? protocoloMatch[1] : '';
    }

    // Buscar dados básicos usando regex no HTML
    const recursoMatch = body.match(/Recurso[^>]*>\s*-\s*([^<]+)/i);
    const dataMatch = body.match(/Data do pedido[^>]*>\s*-\s*([^<]+)/i);
    const motivoMatch = body.match(/Motivo[^>]*>\s*-\s*([^<]+)/i);
    
    const recurso = recursoMatch ? recursoMatch[1].trim() : '';
    const dataPedido = dataMatch ? dataMatch[1].trim() : '';
    const motivo = motivoMatch ? motivoMatch[1].trim() : '';

    // Buscar descrição
    let descricao = "";
    const descMatch = body.match(/Descrição do pedido[\s\S]*?<br[^>]*>([\s\S]*?)(?:<b>|$)/i);
    if (descMatch) {
      descricao = descMatch[1]
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/?[^>]+(>|$)/g, "")
        .trim();
    }

    // Buscar tabela de respostas
    const responses: any[] = [];
    const tableMatch = body.match(/<table[^>]*DataTables_Table_0[^>]*>([\s\S]*?)<\/table>/i);
    
    if (tableMatch) {
      const tableContent = tableMatch[1];
      const rowMatches = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      
      if (rowMatches) {
        rowMatches.forEach((row, i) => {
          if (i === 0) return; // Pular header
          
          const cellMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
          if (cellMatches && cellMatches.length >= 4) {
            const situacao = cellMatches[0].replace(/<[^>]*>/g, '').trim();
            const data = cellMatches[2].replace(/<[^>]*>/g, '').trim();
            const respostaHtml = cellMatches[3];
            const resposta = respostaHtml.replace(/<[^>]*>/g, '').trim();
            
            // Buscar links na célula de resposta
            const links: any[] = [];
            const linkMatches = respostaHtml.match(/<a[^>]*href="([^"]*?)"[^>]*>([^<]*?)<\/a>/gi);
            if (linkMatches) {
              linkMatches.forEach(linkMatch => {
                const hrefMatch = linkMatch.match(/href="([^"]*?)"/i);
                const textMatch = linkMatch.match(/>([^<]*?)</i);
                
                if (hrefMatch && textMatch) {
                  let href = hrefMatch[1];
                  const linkText = textMatch[1].trim();
                  
                  let type = "outro";
                  if (linkText.toLowerCase().includes("baixar")) type = "baixar";
                  else if (linkText.toLowerCase().includes("visualizar")) type = "visualizar";
                  
                  if (href && !href.startsWith("http")) {
                    href = baseUrl + href.replace(/^\//, "");
                  }
                  
                  links.push({ title: linkText, type, url: href });
                }
              });
            }
            
            responses.push({
              situacao,
              data,
              resposta,
              links
            });
          }
        });
      }
    }

    // Buscar mensagem final
    const finalMsgMatch = body.match(/Caro usuário:\s*(.+?)(?:<|$)/im);
    const mensagemFinal = finalMsgMatch ? finalMsgMatch[1].trim() : "";

    return {
      protocolo: protocoloExtracted,
      recurso,
      dataPedido,
      motivo,
      descricao,
      historicoRespostas: responses,
      mensagemFinal
    };

  } catch (err: any) {
    return { error: err.message };
  }
}

export async function verificarPedidosInformacao(credenciais: Credencial[]): Promise<PedidoInformacao[]> {
  const results: PedidoInformacao[] = [];
  
  for (const cred of credenciais) {
    const result = await processCredential(cred);
    if (!('error' in result)) {
      results.push(result);
    }
  }
  
  return results;
}