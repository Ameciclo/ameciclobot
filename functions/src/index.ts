// src/index.ts

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { bot } from "./bot";
import { sendPaymentRequestHandler } from "./handlers/paymentRequestHandler";

admin.initializeApp();

// Função HTTP para o bot (webhook)
exports.bot = functions.https.onRequest((req, res) => {
  bot.handleUpdate(req.body, res);
});

// Função disparada ao criar um novo request no Firebase Realtime Database
exports.sendPaymentRequest = functions.database
  .ref("/requests/{requestId}")
  .onCreate((snapshot, context) =>
    sendPaymentRequestHandler(snapshot, context, bot)
  );

// Parada graciosa do bot (opcional, principalmente em ambientes serverless)
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
