#!/bin/bash
BOT_TOKEN=$(grep -oP '"BOT_TOKEN":\s*"\K[^"]+' functions/src/credentials/dev/telegram.json)

# Carregar variáveis do arquivo .env
if [ -f .env ]; then
  export $(cat .env | xargs)
else
  echo "Arquivo .env não encontrado!"
  exit 1
fi

# Verificar se TOKEN e WEBHOOK_URL estão definidos
if [[ -z "$BOT_TOKEN" || -z "$FB_BOTFUNCTION_URL" ]]; then
  echo "As variáveis BOT_TOKEN ou FB_BOTFUNCTION_URL não estão definidas no .env"
  exit 1
fi

# Configurar o webhook no Telegram
response=$(curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$FB_DEVBOTFUNCTION_URL\"}")

# Mostrar resposta da API do Telegram
echo "Resposta do Telegram:"
echo "$response"

# Verificar sucesso
if echo "$response" | grep -q '"ok":true'; then
  echo "Webhook configurado com sucesso!"
else
  echo "Falha ao configurar o webhook."
fi
