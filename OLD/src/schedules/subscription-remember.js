// function myFunction() {
//     try{
      
//       var grupoAssociados = ContactsApp.getContactGroup('Associados');
//       var associados = grupoAssociados.getContacts();
//       var nomeGrupo = grupoAssociados.getName();
//       //var googleGroup = GroupsApp.getGroupByEmail("ameciclo@googlegroups.com");
//       //var usuarios = googleGroup.getUsers();
//       var email;
//       var contato;
//       var grupos;
//       var sheet = SpreadsheetApp.openById("0AhR5Ri6g5X_ZdEMyUUpLMGNJNWg4RmpGaHpjN1ZYbWc");  
//       //var doc = sheet.getRange("A800");
//       //var inicio = doc.getValue();
//       var cell = sheet.getRange("A1:D320");
//       //var cell2 = sheet.getRange("C1:D320");
//       var inicio = 290;//cell2.getLastRow();
//       var fim = cell.getNumRows();
//       var column;
      
//       //if(inicio == 0)
//       //  Logger.clear();
      
//       //  Logger.log("LISTA ASSOCIADOS e VERIFICA SE ESTÁ NO AMECICLO@GOOGLEGROUPS.COM");
//       //  
//       //  for (var i=0;i<associados.length;i++) {
//       //    Logger.log(associados[i].getFullName());
//       //    email = associados[i].getEmailAddresses()[0];
//       //    Logger.log(email);
//       //    if(email) {
//       //      email = email.toString();
//       //      if(!googleGroup.hasUser(email))
//       //        Logger.log("NÃO ESTÁ NO GRUPO");
//       //    }
//       //    Utilities.sleep(1000);
//       //  }
      
//       //if(inicio == 0)
//       //  Logger.log("LISTA USUÁRIOS e VERIFICA QUEM NÃO É ASSOCIADO");
      
      
//       for (var i=inicio;i<=fim;i++)  {
//         column = 1;
//         email = cell.getCell(i, column).getValue().toString();
//         contato = ContactsApp.getContact(email);
//         //column = 1;
//         //cell.getCell(i, column).setValue(email);
//         if(contato){
//           column = 3;
//   //        cell.getCell(i, column).setValue(contato.getFullName());
//   //        column = 3;
//           cell.getCell(i, column).setValue("CADASTRADO");        
//   //        Logger.log("É CADASTRADO");
//   //        Logger.log(contato.getFullName());
//           grupos = contato.getContactGroups();
//           column = 4;
//   //        cell.getCell(i, column).setValue("NÃO ASSOCIADO");
//           for (var ii=0;ii<grupos.length;ii++) {
//             if(grupos[ii].getName() == "Associados") {
//               cell.getCell(i, column).setValue("ASSOCIADO");
//               ii = grupos.length;
//             }
//   //          Logger.log(grupos[ii].getName());
//           }
//         } else {
//           column = 3;
//           cell.getCell(i, column).setValue("NÃO CADASTRADO");  
//         }
//   //       Logger.log("NÃO É ASSOCIADO");
//   //      Logger.log(email);
//         //Utilities.sleep(1000);
//   //      if (i == usuarios.length - 1){
//   //        var recipient = "dvalenca@gmail.com";//Session.getActiveUser().getEmail();
//   //        var subject = 'Análise dos Associados e Usuários do Google Groups';
//   //        var body = Logger.getLog();
//   //        MailApp.sendEmail(recipient, subject, body);
//   //      }
//         //doc.setValue(i);
//       }
      
      
      
//     } catch (e) {
//       MailApp.sendEmail("dvalenca@gmail.com", "Error report", e.message);
//     }
//   }