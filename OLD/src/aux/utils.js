const database = require('./database');
const constants = require('./constants');

////////////////////////
// FUNÇÕES AUXILIARES //
////////////////////////

// Substitui uma parte de um string (achava que tinha uma função pŕopria do JS)

// String.prototype.replaceAt = function(index, end, replacement) {
//   return this.substr(0, index) + replacement + this.substr(end);
// }


////////////////////////////
// FUNÇÕES PARA MENSAGENS //
////////////////////////////

export function getNumberIntoSymbol (x) {
  let y = x+1
  let quotient = Math.floor(y/10);
  let symbol = ""
  if (quotient === 0) {
      return symbol += constants.symbols.numbers[y]
  } else {
      return getNumberIntoSymbol (quotient)
  }
}

export function clearCommandFromUserInput(userText) {
  let command = userText.split(' ', 1)[0];
  if (command[0] === '/') { 
    return userText.replace(command,'').trim();
  } else {
    return userText;
  }
}

export function extractCommand(userText) {
  let command = userText.split(' ')[0];
  if (command[0] === '/') { 
    return command.split('@')[0].trim();
  } else {
    return userText;
  }
}

export function getSSLink(id){
  return `https://docs.google.com/spreadsheets/d/${id}/`
}

// Remove caracteres proibidos no markdown

export function removeCharToMarkdown(str) {
  const forbidenChar = ['(', ')', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!']
  
  forbidenChar.forEach(element => {
    str = str.split(element).join("\\" + element)
  });

  return str
}

// Remove caracteres proibidos no markdown

export function removeCharToMarkdownExtras(str) {
  const forbidenChar = ['[', ']', '_', '*', '`', '~']
  
  forbidenChar.forEach(element => {
    str = str.split(element).join("\\" + element)
  });

  return str
}

// Transforma em hash para fazer callbacks

export function getHashCode(input) {
  let hash = 0, i, chr;
    for (i = 0; i < input.length; i++) {
      chr   = input.charCodeAt(i);
      hash  = (hash * 31 + chr) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

// MEIO ESTRANHO TÁ AQUI ISSO, NÃO?
export function getStartActionFor(flow) {
  return `${startFlowPrefix}-${flow}`
}

// // Pega as tags de emails - interação com o google agenda

// export function getTagFromGroupId(id) {
//   if (id >= 0) {
//     return "";
//   }

//   return database.getGTs().then(gts => {
//     gts = gts.filter(gt => {
//       return `${gt.GTTelegramID}` === `${id}`
//     });

//     if (gts.length !== 0) {
//       return gts[0].tag1;
//     } else {
//       return "";
//     }
//   });
// }

////////////////////////
// FUNÇÕES PARA HORAS //
////////////////////////

// converte minutos em horas

export function minsToHour(totalMins) {
  if (!totalMins) {
      return undefined;
  }

  let hour = Math.floor(totalMins/60);
  let mins = totalMins % 60;
  
  if (mins.toString().length === 1) {
      mins = "0".concat(mins.toString());
  }

  return `${hour}h${mins}`
}

// Incrementa os minutos

export function minsToIncrement(totalMins) {
  const totalMinsNumber = parseInt(totalMins);

  let hour = Math.floor(totalMinsNumber/60);
  let mins = totalMinsNumber % 60;
    
  return {
      hour: hour,
      mins: mins
  }
}

export function addMinutes (startTime, minutesToAdd) {
  const oldTime = new Date(startTime)
  const newTime = new Date(oldTime.getTime() + (minutesToAdd*60*1000))
  return newTime
}

export function getEndTime(startTime, duration) {
  const startDate = new Date(startTime)
  return addMinutes(startTime, duration)
}

export function uniqueConfirmed(array) {
  return array.reduce((unique, item) => {
    const found = unique.find(element => element.id === item.id);
    return found ? unique : [...unique, item];
  }, []);
}

/// VERIFICAR PARA DELETAR

// Limpeza das entradas e erros

// export function clearInputsAndErrors(ctx) {
//   var errors = ctx.session.errors ? ctx.session.errors : []
//   var inputs = ctx.session.inputs ? ctx.session.inputs : []
  
//   if (ctx.chat.id < 0) {
//     return;
//   }

//   errors.forEach(error => {
//     return bot.telegram.deleteMessage(error.chatId, error.messageId).then(res => {
//       ctx.session.errors = ctx.session.errors.filter(it => {
//         return it !== error;
//       });
      
//       errors = ctx.session.errors;
//       return;
//     });
//   }); // Fim da iteração pelos erros

//   inputs.forEach(input => {
//     return bot.telegram.deleteMessage(input.chatId, input.messageId).then(res => {
//       ctx.session.inputs = ctx.session.inputs.filter(it => {
//         return it !== input;
//       });
      
//       inputs = ctx.session.inputs;
//       return;
//     });
//   }); // Fim da iteração pelos inputs
// }

// // Limpa o comando da string do usuário.

//const Markup = require('telegraf/markup');

// var flowMenu = Markup.inlineKeyboard([
//   Markup.callbackButton('Enviar solicitação', 'enviarSolicitacao'),
//   Markup.callbackButton('Limpar', 'reiniciarFluxo')
// ]);

export const excerptFromRequest = function(request) {
  return `💰💰💰 PAGAMENTO 💰💰💰\n` +
    `👉 ${request.from.first_name} solicitou um pagamento.\n\n` +
    `🗂 Projeto: ${request.project.name}\n` +
    `📂 Item Orçamentário: ${request.budgetItem}\n` +
    `🗒 Descrição: ${request.description}\n\n` +
    `📈 Conta saída: ${request.project.account}\n\n` +
    `📉 DADOS BANCÁRIOS\n` +
    `${recipientToReadableLine(request.recipientInformation)}\n\n` +
    `💵 Valor: ${request.value}`
}

// Transforma segundos para dias
// todo: jogar para util
export const toDays = function() {
  const oneDay = 24 * 60 * 60 * 1000;
  const firstDate = new Date(1899, 11, 31);
  const secondDate = new Date();

  return Math.round(Math.abs((firstDate - secondDate) / oneDay));
}

export const initDateFrom = function(startTime, dateString) {
  const timeArray = startTime.split(':');
  let date = new Date();
  const dateArray = dateString.split('/');
  date.setDate(dateArray[0]);
  date.setMonth(dateArray[1]-1)
  date.setFullYear(dateArray[2] ? dateArray[2] : new Date().getFullYear());
  date.setHours(timeArray[0]);
  date.setMinutes(timeArray[1]);
  return date;
}