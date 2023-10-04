// ///////////////////////////////////////
// ///////////////////////////////////////
// ///////// FUNÇÕES DA AGENDA ///////////
// ///////////////////////////////////////
// ///////////////////////////////////////

// function returnTelegramId(emailAddress) {
  
  
//     //var emailAddress = "tag-secretaria@ameciclo.org";
//     var telegramIdReturn = [];
//     var contact = ContactsApp.getContact(emailAddress); 
//     var telegramId = contact.getCustomFields("Telegram");
//     if (telegramId[0]) {   /// CASO TENHA TELEGRAM, PROSSIGA
//       if (Number(telegramId[0].getValue()) < 0) {  /// VERIFICA SE É UM GRUPO - IDS DE GRUPOS SÃO NÚMEROS NEGATIVOS
//       telegramIdReturn.push(telegramId[0].getValue());
//       }
//     }
//     return telegramIdReturn;
  
//   }
  
  
//   ////////////////////////////////////////////
//   ////////// AGENDA PARA CONFERÊNCIA /////////
//   ////////////////////////////////////////////
  
//   function calendarCheck () { 
//     var gtSecretaria = returnTelegramId("tag-secretaria@ameciclo.org");
  
//     //var gtSecretaria = ["-386173744"]; // GT TESTE
//     var preText = "⚠️️Conferência da Agenda de de Amanhã⚠️\n\nConfira se estão todos e com os nomes, horários, e locais corretos. Às 20h será enviado a todas pessoas inscritas.\n\n";
//     sendTomorrowEvents(gtSecretaria, preText);
  
//   }
//   //////////////////////////////////////////
//   ////////// AGENDA PARA INSCRITAS /////////
//   //////////////////////////////////////////
  
//   function calendarToSubscribers () {
//     // Pegar inscritos pelo Firebase
//     var token = "JD0bmBumnFVBXaSwOjkDi2hkTrTsAGUlzCQ3NJFB";
//     var subscribersReference = "https://ameciclo-admin-bot.firebaseio.com/subscribers";
//     var database = FirebaseApp.getDatabaseByUrl(subscribersReference, token);
    
//     var data = database.getData();
    
//     var users = [];
//     for(var i in data) {
//       users.push(data[i].id);
//     }
    
//     sendTomorrowEvents(users,"");
  
//   }
  
  
//   ////////////////////////////////////
//   ////////// AGENDA PARA GTS /////////
//   ////////////////////////////////////
  
//   function calendarToGTs () {
  
//     var tomorrow =  new Date(new Date().getTime() + 24 * 60 * 60 * 1000);  /// PEGA O DIA
    
//     var preText = "";
  
//     var events = getEvents(tomorrow); // RETORNA OS GTS DE AMANHÃ
    
//     for (var j in events) {
//       var event = events[j][1]; // É UM DOS EVENTOS DE TODOS OS DE AMANHÃ
//       var gtEvent = []; // É UM ÚNICO EVENTO DE UM GT, MAS A FUNÇÃO SUPORTA ARRAY
//       var users = []; // LISTA OS GTS ENCONTRADOS
      
//       var guestList = event.getGuestList(); /// LISTA CONVIDADOS DO EVENTO
      
//       var emailAddress;
//       var deuCerto = true;//// GAMBIARRA
//       for (var k in guestList) {
//         if(deuCerto) { //// GAMBIARRA
//           emailAddress = guestList[k].getEmail(); /// PEGA O EMAIL DO CONVIDADO
//           var contact = ContactsApp.getContact(emailAddress); /// RETORNA O CONTATO REFERENTE A ESTE E-MAIL
//           if (contact) {
//             var telegramId = contact.getCustomFields("Telegram"); /// VERIFICA O CAMPO TELEGRAM DELE
//             if (telegramId[0]) {   /// CASO TENHA TELEGRAM, PROSSIGA
//               if (Number(telegramId[0].getValue()) < 0) {  /// VERIFICA SE É UM GRUPO - IDS DE GRUPOS SÃO NÚMEROS NEGATIVOS
//                 preText = "*" + contact.getGivenName() + "*%0A%0A"  /// COLOCA O NOME DO GT NO CABEÇALHO
//                 users.push(telegramId[0].getValue());  /// COLOCA TODOS OS GTS COM TAGS EM UM CAMPO DE USUÁRIO
//                 gtEvent.push(events[j]); /// SELECIONA APENAS OS GTS
//                 deuCerto = false;//// GAMBIARRA
//               }
//             }
//           }
//         }
//       }
      
//       /// ENVIA TEXTO COMPLETO PARA O BOT PUBLICAR NOS GTS ///    
//       var text = getEventsDescriptions (gtEvent);   
      
//       if (text) {      
//         text = preText + "*EVENTO DO DIA " + tomorrow.getDate() +"/" + (tomorrow.getMonth() + 1) + "*%0A%0A" + text;
//         text += "%0APara que esse grupo seja notificado, convide " + emailAddress + " na agenda da Ameciclo.%0AQuer saber mais eventos? Fala comigo, @ameciclobot, no inbox!";
//         text = text.replace(/\n/g,'%0A'); /// CORREÇÃO PARA PUBLICAÇÃO
//         for (var i in users) {
//           sendText(users[i], text);
//         }       
//       }
      
//     }
    
//   }
  
//   ///////////////////////////////////////////
//   ////////// RETORNA EVENTOS DO DIA /////////
//   ///////////////////////////////////////////
  
//   function getEvents(day) {
    
//     var allEvents = [];
    
//     /// AGENDAS DA AMECICLO ////
//     var calendars = [CalendarApp.getDefaultCalendar()];
    
//     ///var agendaExterna = 
//     calendars.push(CalendarApp.getCalendarById("oj4bkgv1g6cmcbtsap4obgi9vc@group.calendar.google.com"));
//     // var agendaDivulgacao
//     calendars.push(CalendarApp.getCalendarById("k0gbrljrh0e4l2v8cuc05nsljc@group.calendar.google.com"));
//     //var agendaOrganizacional = 
//     calendars.push(CalendarApp.getCalendarById("an6nh96auj9n3jtj28qno1limg@group.calendar.google.com"))
    
//     /// BUSCA DE EVENTOS ////
    
//     for (var i in calendars) {
//       var calendarText = "";
//       var calendarTemp = calendars[i]; // SELECIONA AGENDA
//       var calendarName = calendarTemp.getName();
      
//       calendarText = "*" + calendarName + "*%0A%0A"; // PEGA O NOME DA AGENDA
      
//       var events = calendarTemp.getEventsForDay(day); // SELECIONA EVENTOS DE AMANHÃ
    
//       for (var j in events) {
//         var event = events[j];
//         allEvents.push([calendarName, event]);
//       }
    
//     }
//     return allEvents;
  
//   }
  
//   ////////////////////////////////////////////////
//   ////////// ENVIO DOS EVENTOS DA AGENDA /////////
//   ////////////////////////////////////////////////
  
//   function sendTomorrowEvents(users, preText) {
    
//     /// DATA DE AMANHÃ ////
//     var tomorrow =  new Date(new Date().getTime() + 24 * 60 * 60 * 1000);  
    
//     var events =  getEvents(tomorrow);
  
//     /// VARIÁVEIS DE CONFIGURAÇÕES ////
    
//     var text = "";  
    
//     text = getEventsDescriptions(events);
      
//     /// ENVIA TEXTO COMPLETO PARA O BOT PUBLICAR NO INBOX ///
    
//     if (text) {      
//       text = preText + "*EVENTOS DO DIA " + tomorrow.getDate() +"/" + (tomorrow.getMonth() + 1) + "* %0A%0A" + text;
//       text = text.replace(/\n/g,'%0A'); /// CORREÇÃO PARA PUBLICAÇÃO
//       for (var i in users) {
//         sendText(users[i], text);
//       }       
//     }
    
//   }
  
  
//   /////////////////////////////////////////////
//   ////// PEGA AS INFORMAÇÕES INTERNAS DOS /////
//   ////// EVENTOS E FAZ O TEXTO PARA ENVIO /////
//   /////////////////////////////////////////////
  
//   ///getOriginalCalendarId()
  
//   function getEventsDescriptions (calendarEvents) {
//     var calendarText = "";
//     var calendarNameTemp = "";
    
//     for (var j in calendarEvents) {
//       var calendarName = calendarEvents[j][0];
      
//       /// VERIFICA SE É O PRIMEIRO DE TERMINADO CALENDÁRIO ///
      
//       if (calendarName != calendarNameTemp) {
//         calendarText += "*" + calendarName + "*%0A%0A";
//         calendarNameTemp = calendarName;
//       }
//       var events = calendarEvents[j][1];
      
//       var time = events.getStartTime(); // PEGA A HORA DE INÍCIO
//       var location = events.getLocation();
      
//       /// FORMATA TEXTO DO EVENTO ///
//       calendarText += "" + events.getTitle() + "" 
//       + "%0A⏰Horário: " + time.getHours() + ":" + addZero(time.getMinutes());
//       if (location) {  // Não deixa a localização em branco se não tiver
//         calendarText += "%0A📍Local: [" + location + "]("+ "https://www.google.com/maps/search/" + location  +")%0A%0A";
//       } else {    
//         calendarText += "%0A📍Local: NÃO INFORMADO (provável que online ou na Ameciclo)%0A%0A";
//       }
      
//     }
    
//     return calendarText;
    
//   }
  
  
//   //////////////////////////////////////////
//   //////////////////////////////////////////
//   ///////// CONFIGURAÇÕES DO BOT ///////////
//   //////////////////////////////////////////
//   //////////////////////////////////////////
  
  
//   // Cria o bot
//   // Cria o script dentro da planilha
//   // Coloca o token no local específico
//   // Coloca o id da planilha
//   // roda o getMe
  
//   // var token = "217096876:AAG6EqDBxrZeaBVbB6T8uMVJZTq4HOtL65I";
//   var token = "938558702:AAEwcq1mt2VYglbBy_7yRfHS3PnkNyLROcQ";
//   var telegramUrl = "https://api.telegram.org/bot" + token;
//   var webAppUrl = "https://script.google.com/macros/s/AKfycbw8Qy-K3dcdb2RcR4vpbwNcHC8xepcEMR7hQZePugEOJ5KsDvy_/exec";
//   var ssId = "1WNwcr8I15iS44_yLwNoRVY1MOxWSjY8OCs-7-1qK-Ow";
  
//   function getMe() {
//     var url = telegramUrl + "/getMe"; 
//     var response = UrlFetchApp.fetch(url); 
//     Logger.log(response.getContentText()); 
    
//   } 
  
//   //function setWebhook() { 
//   //  var url = telegramUrl + "/setWebhook?url=" + webAppUrl; 
//   //  var response = UrlFetchApp.fetch(url); 
//   //  Logger.log(response.getContentText()); 
//   //}
  
  
//   function sendText(id,text) {
    
//     //var id = -386173744;
  
//     var url = telegramUrl + "/sendMessage?chat_id=" + id + "&text=" + text + "&parse_mode=markdown&disable_web_page_preview=true";
//     var response = UrlFetchApp.fetch(url); 
//     Logger.log(response.getContentText()); 
//   } 
  
  
//   function sendTextWithButton (id, text) {
    
//     var text = text.replace(/%0A/g,'\n'); /// CORREÇÃO PARA PUBLICAÇÃO
  
//     var token = "938558702:AAEwcq1mt2VYglbBy_7yRfHS3PnkNyLROcQ";
//     var telegramUrl = "https://api.telegram.org/bot" + token;
//     var id = -386173744;
//     var url = telegramUrl + "/sendMessage";
//     var payload =
//         {
//           "chat_id": id,
//           "text": text,
//           "parse_mode": 'markdown',
//           "disable_web_page_preview": true,
//           "reply_markup": {
//             "inline_keyboard": [
//               [
//                 {
//                   "text": "Eu vou",
//                   "callback_data": "confirmAttendee"
//                 }
//               ]
//             ]
//           }
//         }
    
//     var options =
//         {
//       "method": "POST",
//       "payload": JSON.stringify(payload),
//       "contentType": "application/json"
//       };
    
//     var result = UrlFetchApp.fetch(url, options);
//     var aaaa = 1;
    
    
  
//   }
  
  
//   function doGet(e) { 
//     return HtmlService.createHtmlOutput(JSON.stringify(e,null,4)); 
//   } 
  
//   //function doPost(e) { 
//   //  // this is where telegram works 
//   //  var data = JSON.parse(e.postData.contents); 
//   //  var text = data.message.text; 
//   //  var id = data.message.chat.id; 
//   //  var name = data.message.chat.first_name + " " + data.message.chat.last_name; 
//   //  //SpreadsheetApp.openById(ssId).getSheets()[0].appendRow([new Date(),name,text]);
//   //  
//   //  var sheetName = "Geral"; 
//   //  var primeiraLetra = text[0];
//   //  switch (primeiraLetra) {
//   //    case "@":
//   //      var answer = "Oi " + name + ", você enviou um @. Seu id é " + id + ". Peça para o adm te adicionar na lista de recebimento."; 
//   //      break;
//   //    case "/":
//   //      var answer = "Oi " + name + ", você enviou um /. Não estamos funcionando no momento. Por favor, não me mande / de novo."; 
//   //      break;
//   //    default:
//   //      answer = "Comando não identificado.";
//   //      break;
//   //  }
//   //  sendText(id,answer);
//   //  sendText("157783985", answer);
//   //  
//   //  Logger.log(id);
//   //
//   //
//   //  //GmailApp.sendEmail(Session.getEffectiveUser().getEmail(), "Teste Telegram", JSON.stringify(data,null,4));  
//   //}
  
//   function addZero(i) {
//     if (i < 10) {
//       i = "0" + i;
//     }
//     return i;
//   }
  