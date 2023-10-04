// /// USUÁRIO
// // SCRIPT
// /// 

// function doGet(e) { 
  
  
//     //https://script.google.com/macros/s/AKfycbw8Qy-K3dcdb2RcR4vpbwNcHC8xepcEMR7hQZePugEOJ5KsDvy_/exec
    
//     return HtmlService.createHtmlOutput(JSON.stringify(e,null,4)); 
//   } 
  
//   function boletimTeste() { 
//     //boletim("ramosdasilva.wilton@gmail.com", true); 
//     boletim("vanessantana3@gmail.com", true);
//     //boletim("com-ameciclo@googlegroups.com", true); 
//   } 
  
//   function boletimFinal() { 
//     boletim("ramosdasilva.wilton@gmail.com", false);
//     //boletim("dvalenca@gmail.com", false); 
//     //boletim("ameciclo@googlegroups.com", false); 
//   } 
  
//   function boletim(email, ehteste) {
//     ///// EMAIL A SER ENVIADO /////
//     //const emailEnviar = "dvalenca@gmail.com";
//   ///  const emailEnviar = "com-ameciclo@googlegroups.com";
//     /// const emailEnviar - "comunicacao@ameciclo.org";
    
//     var emailEnviar = email;
    
//     ///// DETERMINA AS DATAS /////
    
//     //Determina datas chave (mês passado)
//     // Que mês estamos?
//     var hoje = new Date();
//     var ano = hoje.getFullYear();  
//     var mesatual  = hoje.getMonth();
    
//     //Se for janeiro...  
//     // Quando é o mês e ano passado?  
//     var anomespassado = ano;
//     var mespassado = mesatual-1;
//     if (mespassado == -1) {
//       anomespassado = anomespassado - 1;
//       mespassado = 11;
//     }
    
//     // Determina a data intervalo para procurar na agenda
//     var dia1mespassado = new Date(anomespassado,mespassado, 1, 0, 0, 0, 0);
//     var dia1mesatual = new Date(ano,mesatual, 1, 0, 0, 0, 0);
    
    
//     // Determina o nome do mês
//     var nomemes = "";
    
//     switch (mespassado){
//       case 0:
//         nomemes = "Janeiro";
//         break;
//       case 1:
//         nomemes = "Fevereiro";
//         break;
//       case 2:
//         nomemes = "Março";
//         break;
//       case 3:
//         nomemes = "Abril";
//         break;
//       case 4:
//         nomemes = "Maio";
//         break;
//       case 5:
//         nomemes = "Junho";
//         break;
//       case 6:
//         nomemes = "Julho";
//         break;
//       case 7:
//         nomemes = "Agosto";
//         break;
//       case 8:
//         nomemes = "Setembro";
//         break;
//       case 9:
//         nomemes = "Outubro";
//         break;
//       case 10:
//         nomemes = "Novembro";
//         break;
//       case 11:
//         nomemes = "Dezembro";
//         break;
//       default:
//         nomemes = "";
        
//     }
    
//     // Boletim Informativo - 2020.07 - Julho de 2020.pdf
    
//     // Escreve o mês e o ano num formato para salvar em arquivos
//     var mesAno = anomespassado + "." + addZero(mespassado + 1);
    
//     var mesAnoEspaco = nomemes + " " + anomespassado;
//     var quantosChar = mesAnoEspaco.length;
    
//     mesAnoEspaco += "</td><td align=\"left\" style=\"color: #008080; font-family: Ubuntu, sans-serif; font-size: 24px; font-weight: 100; \">";
        
//     while (quantosChar < 15) {
//       mesAnoEspaco += ".";
//       quantosChar+=1;
//     }
    
//     /////// DETERMINA AS AGENDAS ////////
  
//     //Ameciclo institucional
//     //var agendaInstitucional = CalendarApp.getDefaultCalendar();
//     //var IDagenda = agendaInstitucional.getId();
//     var IDagenda = "ameciclo@gmail.com";
//     var agendaInstitucional = CalendarApp.getCalendarById(IDagenda);
  
//     //Ameciclo eventos externos
//     //var agendaExterna = (CalendarApp.getCalendarsByName("Ameciclo Eventos Externos"))[0];
//     //var IDagendaExt = agendaExterna.getId();
//     var IDagendaExt = "oj4bkgv1g6cmcbtsap4obgi9vc@group.calendar.google.com";
//     var agendaExterna = CalendarApp.getCalendarById(IDagendaExt);
  
    
//     //Pega os eventos do mês passado
//     var eventoInstitucional = agendaInstitucional.getEvents(dia1mespassado, dia1mesatual);
//     var eventoExterno = agendaExterna.getEvents(dia1mespassado, dia1mesatual);
   
//     ///// OUTRAS VARIÁVEIS A SEREM DETERMINADAS /////
    
//     //Inicia a variável com o texto
//     var textoFinal = "";
//     // Conta quantos eventos foram
//     var eventcount = 0;
//     // Determina se o evento foi recorrente
//     var ehrecorrente = false;
//     // Variável de evento para padronização do código
//     var eventoTemp;
//     var agendaTemp;
    
    
//     ///// ROTINA DE CRIAÇÃO DO BOLETIM ////
//     //Rotina dos eventos para determinar quais vão pra BOLETIM
//     var i = 0;
//     var j = 0;
//     var totalEventos = eventoInstitucional.length + eventoExterno.length;
//     while (eventcount < totalEventos) {
      
//       // se o evento externo aconteceu antes, inclui, senão, insere o interno
//       if (i < eventoInstitucional.length)
//         var eventoInternoInicio = eventoInstitucional[i].getStartTime().getTime();
//       if (j < eventoExterno.length)
//         var eventoExternoInicio = eventoExterno[j].getStartTime().getTime();
      
//       // se o evento externo é anterior ao interno, roda
//       // exceção, se acabou os eventos internos
      
//       if (eventoExternoInicio < eventoInternoInicio || i == eventoInstitucional.length){
        
//         // bloco de configuração da seleção de evento
//         // se ainda existe evento externo
//         if (j < eventoExterno.length) {
//           eventoTemp = eventoExterno[j];
//           agendaTemp = IDagendaExt;
//           var tituloEXT = eventoTemp.getTitle();
//           j += 1;
//         }      
        
//       } else {
        
//         // bloco de configuração da seleção de evento
//         // se ainda existe evento interno
//         if (i < eventoInstitucional.length) {
//           //Rotinas eventos institucionais
//           eventoTemp = eventoInstitucional[i];
//           agendaTemp = IDagenda;     
//           var tituloINT = eventoTemp.getTitle();
//           i += 1; 
//         }
//       }
      
//       var nomeArquivo = mesAno + "." + ConvertJsonDateStringDataDia(eventoTemp.getStartTime()) + " - " + eventoTemp.getTitle();
//       ehrecorrente = (eventoTemp.getDescription()).indexOf("RECORRENTE") < 0;
//       var imagem = getImageFromEvent(eventoTemp.getId(),agendaTemp, nomeArquivo);
//       if (ehrecorrente) {
//         textoFinal += adicionaLinhaTabela(
//           imagem,
//           ConvertJsonDateStringDataDia(eventoTemp.getStartTime()), 
//           eventoTemp.getTitle(), 
//           eventoTemp.getDescription() 
//   //        eventoTemp.getId(), 
//   //        agendaTemp
//         );
//       }
      
//       eventcount += 1;
  
//     }
    
//     // NÃO FUNCIONA AINDA (TODO)
    
//     if(ehteste) {
//       var imagemEnvia = "14YQ_-vuku_wxN_Q2saSl87VJ6yEKs89Z";
//       var imagemRefaz = "14YQ_-vuku_wxN_Q2saSl87VJ6yEKs89Z";
  
//       textoFinal += adicionaLinhaTabela(
//         imagemRefaz,
//         "REFAZ", 
//         "Reenviar teste", 
//         "Se deseja reenviar um teste para ajustes e verificar se está correto, <a href=\"https://www.ameciclo.org\">clique aqui</a>"
//       );
      
//       textoFinal += adicionaLinhaTabela(
//         imagemEnvia,
//         "ENVIA", 
//         "Enviar versão final para a lista", 
//         "Se as edições terminaram, pode enviar o final, <a href=\"https://dim.ameciclo.org\">clique aqui</a>"
//       );
      
//     }
    
    
//   //  var amecicloLogoUrl = "https://drive.google.com/uc?export=view&id=1A7n-fyr8Kkm8Qq7_DQ_1sMcsAkfTTrsU";
//   //  var instagramLogoUrl = "https://drive.google.com/uc?export=view&id=19TMxXzaC0jxgknGDmY1cX1waEt5YcGpV";
//   //  var facebookLogoUrl = "https://drive.google.com/uc?export=view&id=1UpQATR-GoJS3m-koGpkgE-EQf-jjV9Ec";
//   //  var twitterLogoUrl = "https://drive.google.com/uc?export=view&id=1Cm9h4i5Ca_qYMKD52jVyX1msngiGlr25";
//   //  var telegramLogoUrl = "https://drive.google.com/uc?export=view&id=1EjxoFQvr9XfEQR6_3STCz-no0P1_3t_w";
//   //  var whatsappLogoUrl = "https://drive.google.com/uc?export=view&id=1pAbtMiIlH_PqXCV46CRBQeO7d4oDEkEB";
//   //
//   //  var amecicloUrl = "http://www.ameciclo.org/";
//   //  var instagramUrl = "http://www.instagram.com/Ameciclo";
//   //  var facebookUrl = "http://www.facebook.com/AMEciclo";
//   //  var twitterUrl = "http://www.twitter.com/Ameciclo";
//   //  var telegramUrl = "https://t.me/ameciclo";
//   //  var whatsappUrl = "https://wa.me/558194586830?text=Olá,%20Ameciclo!";
//   //
//   //  var instagramLogoBlob = UrlFetchApp.fetch(instagramLogoUrl).getBlob().setName("instagramLogoBlob");  
//   //  var facebookLogoBlob = UrlFetchApp.fetch(facebookLogoUrl).getBlob().setName("facebookLogoBlob");
//   //  var twitterLogoBlob = UrlFetchApp.fetch(twitterLogoUrl).getBlob().setName("twitterLogoBlob");
//   //  var telegramLogoBlob = UrlFetchApp.fetch(telegramLogoUrl).getBlob().setName("twitterLogoBlob");
//   //  var whatsappLogoBlob = UrlFetchApp.fetch(whatsappLogoUrl).getBlob().setName("twitterLogoBlob");
  
//     MailApp.sendEmail({
//       to: emailEnviar,
//       subject: "Boletim informativo " + nomemes + " de " + (anomespassado),
//       htmlBody: criaCorpoDoBoletim (textoFinal, mesAnoEspaco)//nomemes + " " + anomespassado)
//   //    inlineImages:
//   //     {
//   //     instagramLogo: instagramLogoBlob,
//   //     facebookLogo: facebookLogoBlob,
//   //     twitterLogo: twitterLogoBlob,  
//   //     telegramLogo: telegramLogoBlob,
//   //    whatsappLogo: whatsappLogoBlob  
//   //     }
//                       }); 
//   }
  
//   //function adicionaLinhaTabela(imagem, data, nome, descricao, eventId, calendarId) {
//   function adicionaLinhaTabela(imagem, data, nome, descricao) {
  
//     //var totalCaracteres = descricao.length;
    
//     var novaDescricao = descricao.replace(/\n/g, "<br>");
//     //var ondeCortar =  novaDescricao.indexOf("<br />");
//     var ondeCortar =  novaDescricao.indexOf("<br>");
  
//   //  Logger.log(novaDescricao);
    
//     if (ondeCortar > 0) { 
//           novaDescricao = descricao.substring(0, ondeCortar);
//     }
    
//     var titulo = "Dia " + data + " - " + nome;
//     titulo = titulo.toUpperCase();
      
//     var textoFinal = "" +
//     "<table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\">" +
//      "<tr>" +
//        "<td align=\"justify\" style=\"color: #ff0000; font-family: Ubuntu, sans-serif; font-size: 18px; font-weight: 400; padding:25px 0px 5px 0px\">" +
//        titulo + 
//       "</td>" +
//      "</tr>" +
//      "<tr>" +
//       "<td \"width=\"260\" valign=\"top\" style=\"color: #153643; font-family: Ubuntu, sans-serif; font-size: 14px;\">" +
//        "<table>" +
//         "<tr style=\"padding: 20px 0 20px 0;\">" +
//          "<td valign=\"top\">" +
//           "<img src=\"https://drive.google.com/uc?export=view&id="+ imagem + "\" alt=\"Imagem do Evento\" style=\"float:left; width:260px; padding-right:20px\">" +
//          "</td>" +
//          "<td align=\"justify\" valign=\"top\" style=\"font-family: Ubuntu, sans-serif;\">" +
//           novaDescricao +
//          "</td>" +
//         "</tr>" +
//        "</table>" +
//       "</td>" +
//      "</tr>" +
//      "<tr>" +
//       "<td style=\"font-size: 0; line-height: 0;\" width=\"20\">" +
//        "&nbsp;" +
//       "</td>" +
//      "</tr>" +
//     "</table>" +
//       "";
    
//     return textoFinal;
    
//   }
  
//   function ConvertJsonDateStringDataDia(jsonDate) {
//     var shortDate = null;
//     if (jsonDate) {
//       var dt = jsonDate;
//       var day = addZero(dt.getDate());
//     }
//     return day;
//   }
  
//   function addZero(i) {
//     if (i < 10) {
//       i = "0" + i;
//     }
//     return i;
//   }
  
//   function getImageFromEvent(idEvento, calendarId, nomeArquivo) {
  
//     var idImagemPadrao = "14YQ_-vuku_wxN_Q2saSl87VJ6yEKs89Z";
    
//     //var calendarId = 'primary';
//     var eventId = idEvento.replace("@google.com","");
//     var res = Calendar.Events.get(calendarId, eventId, {fields: "attachments/fileId"});
//     if (res.attachments == undefined) {
//       return idImagemPadrao;
//     } else {
//       var idArquivo = res.attachments.map(function(e){return e.fileId});
//       renameAndMove(idArquivo, nomeArquivo);
//       return idArquivo;
//     }
//   }
  
//   function renameAndMove(idArquivo, nomeArquivo) {
    
//     var idPastaPadrao = "1f1raA2S5hvzn8vw_EWciBaDq6ZGBd2NH";
    
//     var mesAno = nomeArquivo.substring(0, 7);
//     console.log(idArquivo);
//     var arquivo = DriveApp.getFileById(idArquivo);
//     var pasta = DriveApp.getFolderById(idPastaPadrao);
//     var pastaMesI = pasta.getFoldersByName(mesAno);
//     var pastaMes
//     if (pastaMesI.hasNext()){
//       pastaMes = pastaMesI.next();
//     } else {
//       pastaMes = pasta.createFolder(mesAno);
//     }
  
//     arquivo.setName("Boletim Informativo - " + nomeArquivo);
//     pastaMes.addFile(arquivo);
//     var pastasArquivo = arquivo.getParents();
//     var pastaEstudada;
//     while (pastasArquivo.hasNext()) {
//       pastaEstudada = pastasArquivo.next();
//       if (pastaEstudada.getId() != pastaMes.getId())
//         pastaEstudada.removeFile(arquivo)
//         }
    
//   }
  
//   // textoFinal na verdade é o corpo da tabela com os eventos
//   function criaCorpoDoBoletim (textoFinal, mesPassado) {
  
//     var imgBackGroundId = "1xR9ZY0zWOb9bdW4hpqFWF3JBYeAvxGRt";
    
//     var enderecoAmeciclo = "R. da Aurora, 529, loja 2 - Santo Amaro Recife/PE<br />CEP:50050-145 - Fone: +55 81 9 9458 6830"
    
//     var amecicloLogoUrl = "https://drive.google.com/uc?export=view&id=1A7n-fyr8Kkm8Qq7_DQ_1sMcsAkfTTrsU";
//     var instagramLogoUrl = "https://drive.google.com/uc?export=view&id=19TMxXzaC0jxgknGDmY1cX1waEt5YcGpV";
//     var facebookLogoUrl = "https://drive.google.com/uc?export=view&id=1UpQATR-GoJS3m-koGpkgE-EQf-jjV9Ec";
//     var twitterLogoUrl = "https://drive.google.com/uc?export=view&id=1Cm9h4i5Ca_qYMKD52jVyX1msngiGlr25";
//     var telegramLogoUrl = "https://drive.google.com/uc?export=view&id=1EjxoFQvr9XfEQR6_3STCz-no0P1_3t_w";
//     var whatsappLogoUrl = "https://drive.google.com/uc?export=view&id=1pAbtMiIlH_PqXCV46CRBQeO7d4oDEkEB";
  
//     var amecicloUrl = "http://www.ameciclo.org/";
//     var instagramUrl = "http://www.instagram.com/Ameciclo";
//     var facebookUrl = "http://www.facebook.com/AMEciclo";
//     var twitterUrl = "http://www.twitter.com/Ameciclo";
//     var telegramUrl = "https://t.me/s/ameciclo";
//     var whatsappUrl = "https://wa.me/558194586830?text=Olá,%20Ameciclo!";
   
    
//   return "" +
//   "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">" +
//    "<html xmlns=\"http://www.w3.org/1999/xhtml\">" +
//     "<head>" +
//      "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\" />" +
//      "<title>Demystifying Email Design</title>" + 
//      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"/>" +
//     "</head>" +
//    "</html>" +
      
//   "<body style=\"margin: 0; padding: 0;\">" +
//    "<table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" background=\"https://drive.google.com/uc?export=view&id=" + imgBackGroundId + "\">" +
    
//     "<tr>" +
//      "<td bgcolor=\"#008080\" style=\"padding: 40px 0 30px 0;\">" +
  
//   //    "<table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"border-collapse: collapse;\">" +
//   //     "<tr>" +
//   //     "<td>" +
//   //      "</td>" +
      
//       "<table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"border-collapse: collapse;\"  width=\"100%\">" +
//        "<tr>" +
//         "<td style=\"color: #ffffff; font-family: Ubuntu, sans-serif; font-size: 24px; font-weight: 100; \" align=\"right\" >" +
//          "BOLETIM<br />INFORMATIVO " +
//         "</td>" +
//         "<td align=\"center\" width=\"200\">" +
//          "<img src=\"" + amecicloLogoUrl + "\" alt=\"Marca da Ameciclo\" width=\"100\" style=\"display: block;\" />" +
//         "</td>" +
//         "<td align=\"left\" style=\"color: #ffffff; font-family: Ubuntu, sans-serif; font-size: 24px; font-weight: 100; \">" +
//          mesPassado +
//         "</td>" +
//        "</tr>" +
//       "</table>" + 
      
//   //     "<td>" +    
//   //      "</td>" +
//   //     "</tr>" +
//   //    "</table>" + 
  
      
//      "</td>" +
//     "</tr>" +
  
//     "<tr>" +
//      "<td>" +
  
//       "<table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"720\" style=\"border-collapse: collapse;\">" +
//        "<tr>" +
//         "<td bgcolor=\"#ffffff\" style=\"padding: 40px 30px 40px 30px;\">" +
//          textoFinal +
//         "</td>" +
//        "</tr>" +
//       "</table>" +
  
//      "</tr>" +
//     "</td>" +
  
//     "<tr>" +
//       "<td bgcolor=\"#008080\" style=\"padding: 40px 40px 40px 40px;\">" +
        
//       "<table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\">" +
      
//        "<tr>" +
//       "<td style=\"padding-right:15px\" >" +
//          "<a href=\"" + amecicloUrl + "\">" +
//           "<img src=\"" + amecicloLogoUrl + "\" alt=\"Ameciclo\" height=\"50\" style=\"display: block;\" border=\"0\" />" +
//          "</a>" +
//         "</td>" +
      
//         "<td style=\"font-size: 0; line-height: 0;\" width=\"20\">" +
//          "&nbsp;" + 
//         "</td>" +
      
//         "<td width=\"75%\">" +  
      
//          "<table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\">" +
//           "<tr>" +
//            "<td style=\"color: #ffffff; font-family: Ubuntu, sans-serif; font-size: 18px; font-weight: 100;\">" +
//             "Associação Metropolitana de Ciclistas do Recife" +
//            "</td>" +
//           "</tr>" +
//           "<tr>" +
//            "<td style=\"color: #ffffff; font-family: Ubuntu, sans-serif; font-size: 14px; font-weight: 100;\">" +
//             enderecoAmeciclo +
//            "</td>" +
//           "</tr>" +
//          "</table>" +   
      
//         "</td>" +
        
//         "<td align=\"right\" style=\"padding:20px 0px 0px 0px\">" +
  
//          "<table border=\"0\" cellpadding=\"0\" cellspacing=\"0\">" +
//           "<tr>" +
      
//            "<td>" +
//             "<a href=\"" + instagramUrl + "\">" +
//              "<img src=\"" + instagramLogoUrl + "\" alt=\"Instagram\" height=\"30\" style=\"display: block;\" border=\"0\" />" +
//             "</a>" +
//            "</td>" +
      
//   //        "<td style=\"font-size: 0; line-height: 0; padding-right:15px\" width=\"20\">" +
//           "<td style=\"font-size: 0; line-height: 0\">" +
//             "&nbsp;" + 
//            "</td>" +
      
//            "<td>" +
//             "<a href=\"" + facebookUrl +"\">" +
//              "<img src=\"" + facebookLogoUrl + "\" alt=\"Facebook\" height=\"30\" style=\"display: block;\" border=\"0\" />" +
//             "</a>" +
//            "</td>" +
      
//           "<td style=\"font-size: 0; line-height: 0\">" +
//             "&nbsp;" + 
//            "</td>" +
      
//            "<td>" +
//             "<a href=\"" + twitterUrl + "\">" +
//              "<img src=\"" + twitterLogoUrl + "\" alt=\"Twitter\" height=\"30\" style=\"display: block;\" border=\"0\" />" +
//             "</a>" +    
//            "</td>" +
      
//           "<td style=\"font-size: 0; line-height: 0\">" +
//             "&nbsp;" + 
//            "</td>" +
      
//            "<td>" +
//             "<a href=\"" + telegramUrl + "\">" +
//              "<img src=\"" + telegramLogoUrl + "\" alt=\"Telegram\" height=\"30\" height=\"38\" style=\"display: block;\" border=\"0\" />" +
//             "</a>" +
//            "</td>" +
      
//           "<td style=\"font-size: 0; line-height: 0\">" +
//             "&nbsp;" + 
//            "</td>" +
      
//            "<td>" +
//             "<a href=\"" + whatsappUrl + "\">" +
//              "<img src=\"" + whatsappLogoUrl + "\" alt=\"Whatsapp\" height=\"30\" style=\"display: block;\" border=\"0\" />" +
//             "</a>" +
//            "</td>" +
      
//           "<td style=\"font-size: 0; line-height: 0\">" +
//            "&nbsp;" + 
//            "</td>" +
  
//           "</tr>" +
//          "</table>" +
  
//         "</td>" +
//        "</tr>" +    
//       "</table>" +
      
//      "</td>" +
//     "</tr>" +
  
//    "</table>" +
  
//   "</body>"
  
//   }