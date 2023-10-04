
// BOTÃO EU VOU

bot.action('confirmAttendee', (ctx) => {
  let oldButtonText = ctx.update.callback_query.message.reply_markup.inline_keyboard[0][0].text
  let newButtonText = ""

  
  if (oldButtonText.charAt(oldButtonText.length-1) === "u") { // Ninguém confirmou ainda
    newButtonText = oldButtonText.concat(` [1] (${ctx.from.first_name})`);
  } else {
    let confirmCount = parseInt(oldButtonText.split("[")[1].charAt(0))

    if (confirmCount === 1) {
      newButtonText = `Eu vou [2] (${ctx.from.first_name}, `.concat(oldButtonText.split("(")[1]);
    } else if (confirmCount === 2) {
      newButtonText = `Eu vou [3] (${oldButtonText.split("(")[1].split(")")[0]} e +1)`
    } else {
      let newCount = confirmCount+1;
      let rest = newCount - 2;
      newButtonText = `Eu vou [${newCount}] (${oldButtonText.split("(")[1].split(")")[0].split("+")[0]}+${rest})`      
    }

  }

  let confirmButton = Markup.callbackButton(newButtonText, `confirmAttendee`);
  let menu = Markup.inlineKeyboard([confirmButton]);

  bot.telegram.editMessageText(
    ctx.update.callback_query.message.chat.id, 
    ctx.update.callback_query.message.message_id,  
    ctx.update.callback_query.message.message_id,
    ctx.update.callback_query.message.text,
    Extra.markup(menu)
  )

  return firebase.addIdToContact(ctx.from);
});
