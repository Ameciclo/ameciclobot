// /atualizar

// atualiza gts e outras informações

// Toda vez que alguém entra ele coloca dentro da base de dados de GTs
// Toda vez que alguém sai, ele move a pessoa para a base de ex do GTs
// Ele verifica quem é adm do GT e coloca como coordenador (acessa infos especiais do bot)


// FUNCIONAMENTO 
// Usuário digita: /menu
// bot envia para Secretaria para confirmar GT
// confirmado, será criada pasta
// o bot pega todos os usuários que entram e saem
// o bot pega os adm para dar poderes para eles
// 

// // TODO - REMOVER PARA SER MEMBROS ADMIN DO GTS
// // UPDATE - Atualiza os membros da Administração

// bot.command('update', (ctx) => {

//     var workgroups = firebase.getGTs();
  
//     workgroups.forEach(workgroup => {
      
//       let chatId = workgroup.GTTelegramID;
//       let chat = telegram.getChat(chatId);
  
//       let name = chat.title;
//       name = name.replace("GT - ", "")
//       name = name.replace("- Ameciclo", "")
  
//       let admin = telegram.getChatAdministrators(chatId)
//       let membersCount = telegram.getChatMembersCount(chatId)
  
//       // status 	String 	The member's status in the chat. Can be “creator”, “administrator”, “member”, “restricted”, “left” or “kicked”
  
//       let wg = {
//         id: chatId,
//         name: name,
//         description: chat.description,
//         driveFolder: workgroup.driveFolder,
//         email: workgroup.tag1,
//         telegram: {
//           id: chat.id,
//           title: chat.title,
//           invite_link: chat.title.invite_link,
//           description: chat.description,
//           admins: admin,
//           membersCount: membersCount
//         },
//       }
      
//       firebase.addToWorkGroup(wg);
  
//     })
  
//     return ctx.reply("Atualizado com successo! 🚲");
  
//   })