#!/bin/bash
clear


## depois adicionar: firebase login e firebase init functions
## https://console.cloud.google.com/apis/credentials?hl=pt-br&pli=1&project=tangential-span-210120

# Extrair a porta do Firebase Functions do arquivo firebase.json
FIREBASE_FUNCTIONS_PORT=$(cat firebase.json | grep -o '"port": [0-9]*' | head -n 1 | awk -F': ' '{print $2}')

# Carregar variáveis de ambiente do arquivo .env
if [ -f .env ]; then
    export $(cat .env | sed 's/#.*//g' | xargs)
fi

# Verificar as variáveis de ambiente carregadas
echo "BOT_TOKEN: $BOT_TOKEN"
echo "FIREBASE_FUNCTIONS_PORT: $FIREBASE_FUNCTIONS_PORT"
echo "FIREBASE_PROJECT_ID: $FIREBASE_PROJECT_ID"

# Função para iniciar o NGROK e estabelecer o webhook
start_ngrok() {
    echo "Iniciando NGROK"

    gnome-terminal -e "ngrok http --host-header=rewrite localhost:$FIREBASE_FUNCTIONS_PORT"
    
    echo "Retorne o endereço HTTPS do NGROK:"
    read NGROK 
    
    echo "Abrindo Firefox para estabelecer o Webhook"
    firefox --new-tab "https://api.telegram.org/bot$BOT_TOKEN/setWebhook?url=$NGROK/$FIREBASE_PROJECT_ID/us-central1/bot"
    
    # Aguarde a confirmação do webhook aqui antes de continuar (pode adicionar um loop para verificar)
    
    echo "Finalizando script NGROK"
}

# Função para iniciar o Firebase emulador
start_firebase() {
    echo "Iniciando Firebase Emulador"
    cd functions
    firebase emulators:start --inspect-functions --project @FIREBASE_PROJECT_ID
}

# Função para reiniciar o Firebase
restart_firebase() {
    echo "Reiniciando Firebase"
    sudo lsof -i :$FIREBASE_FUNCTIONS_PORT
    echo "Insira o número do PID para encerrar o Firebase:"
    read PPID
    sudo kill -9 $PPID
}

# Função para iniciar o bot Node.js
start_bot() {
    echo "Iniciando o bot Node.js"
    cd functions
    npm run build
    firebase emulators:start --project $FIREBASE_PROJECT_ID --import ./emulator_data
}

# Função para iniciar o bot Node.js
install_and_start_bot() {
    echo "Iniciando o bot Node.js"
    cd functions
    npm install
    npm run build
    firebase emulators:start --inspect-functions --project $FIREBASE_PROJECT_ID --import ./emulator_data
}

change_node(){
    echo "Trocando Node"

    # Assegurar que o script nvm.sh seja carregado
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

    # Agora o nvm deve estar disponível para uso
    nvm use v20.12.2
}

# Menu de opções
while true; do
    echo "Escolha uma opção:"
    echo "1. Iniciar NGROK e estabelecer o Webhook"
    echo "2. Iniciar o Firebase Emulador"
    echo "3. Reiniciar o Firebase"
    echo "4. Iniciar o bot Node.js"
    echo "5. Instalar e iniciar o bot Node.js"
    echo "6. Trocar para Node 20.12.2"
    echo "x. Sair"

    read choice

    case $choice in
        1) start_ngrok;;
        2) start_firebase;;
        3) restart_firebase;;
        4) start_bot;;
        5) install_and_start_bot;;
        6) change_node;;
        x) exit 0;;
        *) echo "Opção inválida";;
    esac
done
