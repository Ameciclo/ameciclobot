import { Groq } from "groq-sdk";
import * as groqCredentials from "../credentials/groq.json";

const groq = new Groq({
  apiKey: groqCredentials.apiKey,
});

export async function sendChatCompletion(messages: Array<{ role: string; content: string }>) {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: messages as any,
      model: "llama-3.1-8b-instant",
      temperature: 1,
      max_tokens: 1024,
      top_p: 1,
      stream: false,
      stop: null
    });

    return {
      choices: [{
        message: {
          content: chatCompletion.choices[0]?.message?.content || null
        }
      }]
    };
  } catch (error) {
    console.error("[Groq] Erro na API:", error);
    throw error;
  }
}