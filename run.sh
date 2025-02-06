#!/bin/bash
clear

#####################################
# Extração de variáveis de configuração
#####################################

# Extrair a porta do Firebase Functions a partir do arquivo firebase.json
FB_FUNCTIONS_PORT=$(grep -o '"port": [0-9]*' firebase.json | head -n 1 | awk -F': ' '{print $2}')
if [ -z "$FB_FUNCTIONS_PORT" ]; then
    echo "Não foi possível extrair a porta do Firebase Functions do arquivo firebase.json. Utilizando valor padrão 5001."
    FB_FUNCTIONS_PORT=5001
fi

# Extrair variáveis dos arquivos de credenciais
BOT_TOKEN=$(grep -oP '"BOT_TOKEN":\s*"\K[^"]+' functions/src/credentials/telegram.json)
FB_PROJECT_ID=$(grep -oP '"project_id":\s*"\K[^"]+' functions/src/credentials/firebaseServiceKey.json)
FB_BOTFUNCTION_URL=$(grep -oP '"FB_BOTFUNCTION_URL":\s*"\K[^"]+' functions/src/credentials/firebaseUrl.json)

# Exibir os valores extraídos
echo "-------------------------------------"
echo "BOT_TOKEN:          $BOT_TOKEN"
echo "FB_FUNCTIONS_PORT:  $FB_FUNCTIONS_PORT"
echo "FB_PROJECT_ID:      $FB_PROJECT_ID"
echo "FB_BOTFUNCTION_URL: $FB_BOTFUNCTION_URL"
echo "-------------------------------------"

#####################################
# Funções do script
#####################################

# 1. Iniciar NGROK e configurar o webhook (URL gerada manualmente)
start_ngrok() {
    echo "Iniciando NGROK..."
    # Abre o ngrok em um terminal separado (ajuste conforme seu ambiente)
    gnome-terminal -- ngrok http --host-header=rewrite localhost:$FB_FUNCTIONS_PORT
    echo "Após o ngrok iniciar, informe a URL HTTPS exibida (ex.: https://xxxx.ngrok.io):"
    read -r NGROK_URL
    if [ -z "$NGROK_URL" ]; then
        echo "Nenhuma URL fornecida. Abortando a configuração do webhook."
        return 1
    fi
    # Concatena a URL com o caminho padrão do endpoint
    WEBHOOK_URL="$NGROK_URL/$FB_PROJECT_ID/us-central1/botFunction"
    echo "Configurando webhook no Telegram com a URL: $WEBHOOK_URL"
    response=$(curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
        -H "Content-Type: application/json" \
        -d "{\"url\": \"$WEBHOOK_URL\"}")
    echo "Resposta do Telegram:"
    echo "$response"
    if echo "$response" | grep -q '"ok":true'; then
      echo "Webhook configurado com sucesso!"
    else
      echo "Falha ao configurar o webhook."
    fi
}

# 2. Configurar webhook utilizando a URL definida no arquivo firebaseUrl.json
set_webhook_from_file() {
    if [ -z "$FB_BOTFUNCTION_URL" ]; then
        echo "FB_BOTFUNCTION_URL não está definida no arquivo firebaseUrl.json. Não é possível configurar o webhook automaticamente."
        return 1
    fi
    echo "Configurando webhook utilizando $FB_BOTFUNCTION_URL"
    response=$(curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
      -H "Content-Type: application/json" \
      -d "{\"url\": \"$FB_BOTFUNCTION_URL\"}")
    echo "Resposta do Telegram:"
    echo "$response"
    if echo "$response" | grep -q '"ok":true'; then
      echo "Webhook configurado com sucesso!"
    else
      echo "Falha ao configurar o webhook."
    fi
}

# 3. Iniciar o Firebase Emulador
start_firebase() {
    echo "Iniciando o Firebase Emulador..."
    (cd functions && firebase emulators:start --inspect-functions --project "$FB_PROJECT_ID")
}

# 4. Reiniciar o Firebase (encerrar o processo na porta definida)
restart_firebase() {
    echo "Listando processos na porta $FB_FUNCTIONS_PORT:"
    sudo lsof -i :"$FB_FUNCTIONS_PORT"
    echo "Informe o PID do processo a ser encerrado:"
    read -r PPID
    if [ -z "$PPID" ]; then
        echo "Nenhum PID informado. Abortando."
        return 1
    fi
    sudo kill -9 "$PPID"
    echo "Processo $PPID encerrado."
}

# 5. Iniciar o bot Node.js (executa build e inicia o emulador com dados importados)
start_bot() {
    echo "Iniciando o bot Node.js..."
    (cd functions && npm install && npm run build && firebase emulators:start --project "$FB_PROJECT_ID" --import ./emulator_data)
}

# 6. Trocar para a versão Node v22.11.0 utilizando o nvm
change_node() {
    echo "Trocando para Node v22.11.0..."
    export NVM_DIR="$HOME/.nvm"
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        . "$NVM_DIR/nvm.sh"
        nvm use v22.11.0
    else
        echo "nvm não encontrado. Certifique-se de que o nvm está instalado."
    fi
}

# 7. Realizar deploy para produção
deploy_production() {
    echo "Realizando deploy para produção..."
    (cd functions && npm install && npm run build && firebase deploy --only functions)
}

#####################################
# Menu interativo de opções
#####################################
while true; do
    echo ""
    echo "========================================"
    echo "Escolha uma opção:"
    echo "1. Iniciar NGROK e configurar webhook em DEVELOPMENT"
    echo "2. Configurar webhook em PRODUCTION"
    echo "3. Iniciar Firebase Emulador"
    echo "4. Reiniciar Firebase"
    echo "5. Iniciar o bot em DEVELOPMENT"
    echo "6. Trocar para Node v22.11.0"
    echo "7. Deploy para produção"
    echo "x. Sair"
    echo "========================================"
    read -r choice

    case $choice in
        1) start_ngrok ;;
        2) set_webhook_from_file ;;
        3) start_firebase ;;
        4) restart_firebase ;;
        5) start_bot ;;
        6) change_node ;;
        7) deploy_production ;;
        x|X) echo "Saindo..."; exit 0 ;;
        *) echo "Opção inválida. Tente novamente." ;;
    esac
done
