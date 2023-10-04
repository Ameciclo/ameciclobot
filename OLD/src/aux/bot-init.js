// Inicializa o bot

const Telegraf = require('telegraf')
const botToken = require('../credentials/bot.json').token

const bot = new Telegraf(botToken);
const telegram = new Telegraf.Telegram(botToken)

function getBot() {
    return bot;
}

function setCommands(commands) {
    console.log("SETTING COMMANDS")
    const commandsSet = telegram.setMyCommands(commands)
    if (commandsSet) {
        console.log("SUCCESS !!! COMMANDS SETTED")
    } else {
        console.log("FAILED TO INSERT COMMANDS")
    }
}

module.exports = {
    getBot: getBot,
    setCommands: setCommands
}