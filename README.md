# EcoPonto Colaborativo - Mapa de Pontos de Reciclagem (APS 8 UNIP)

## 📖 Descrição

Este projeto é uma Atividade Prática Supervisionada (APS) do curso de Ciência da Computação da UNIP. Consiste em um aplicativo móvel (Android) que permite aos usuários mapear, visualizar e gerenciar colaborativamente pontos de coleta seletiva de lixo (Ecopontos). O objetivo é facilitar a localização de locais adequados para o descarte correto de materiais recicláveis, incentivando a prática da reciclagem na comunidade.

O sistema utiliza uma arquitetura distribuída com um frontend em React Native e um backend serverless utilizando Firebase Cloud Functions e Firestore como banco de dados.

## 📲 Instalação Rápida (APK via Releases)

A maneira mais fácil de testar o aplicativo em um dispositivo Android é instalando o arquivo `.apk` pré-compilado:

1.  **Acesse a Página de Releases:** Vá para a seção [**Releases**](https://github.com/kahsale94/aps8/releases) deste repositório no GitHub.
2.  **Baixe o APK:** Encontre a versão mais recente e baixe o arquivo `Ecoponto-Colab.apk`.
3.  **Transfira para o Celular:** Copie o arquivo `.apk` baixado para o seu celular Android (via cabo USB, Google Drive, etc.).
4.  **Habilite Fontes Desconhecidas:** No seu celular, vá em **Configurações > Segurança** (ou **Aplicativos > Acesso especial a apps**) e habilite a opção **"Instalar apps desconhecidos"** para o seu gerenciador de arquivos ou navegador (o app que você usará para abrir o APK). *Este passo pode variar dependendo da versão do Android.*
5.  **Instale o App:** Usando um gerenciador de arquivos no seu celular, encontre o arquivo `.apk` e toque nele para iniciar a instalação. Siga as instruções na tela.

Pronto! O aplicativo EcoPonto Colaborativo estará instalado.

## ✨ Funcionalidades Principais

* **Visualização no Mapa:** Exibe os ecopontos cadastrados em um mapa interativo, centralizado na localização atual do usuário.
* **Lista de Pontos Próximos:** Apresenta uma lista dos ecopontos ordenados por distância em relação ao usuário.
* **Navegação Lista -> Mapa:** Permite clicar em um item da lista para visualizar sua localização exata no mapa.
* **Cadastro de Novos Pontos:** Usuários podem adicionar novos pontos de coleta diretamente pelo mapa, informando nome e tipos de materiais aceitos.
* **Edição de Pontos:** Permite modificar o nome e os materiais aceitos de um ponto já existente.
* **Deleção de Pontos:** Usuários podem remover pontos de coleta do mapa.
* **CRUD Completo:** Implementa as operações de Criar, Ler, Atualizar e Deletar (CRUD) para os ecopontos.
* **Backend na Nuvem:** Utiliza Firebase (Firestore e Cloud Functions) para persistência de dados e lógica de negócio, permitindo que o app seja acessado por múltiplos usuários.

## 🚀 Tecnologias Utilizadas

* **Frontend (Mobile App):**
    * React Native
    * TypeScript
    * `react-native-maps`
    * `react-native-geolocation-service`
* **Backend (Serverless):**
    * Firebase Cloud Functions (Node.js + TypeScript)
    * Express.js
    * `haversine-distance`
* **Banco de Dados:**
    * Google Cloud Firestore
* **Ferramentas:**
    * Firebase CLI
    * Node.js / NPM
    * Android Studio
    * Git / GitHub
    * VS Code

## ⚙️ Configuração e Instalação (Ambiente de Desenvolvimento)

Siga os passos abaixo para rodar o projeto localmente.

### Pré-requisitos

* Node.js (versão LTS recomendada)
* NPM
* Firebase CLI (`npm install -g firebase-tools` e `firebase login`)
* Android Studio (com um Emulador configurado ou um dispositivo físico)
* Git

### Configuração do Firebase

1.  Crie um projeto no [Console do Firebase](https://console.firebase.google.com/).
2.  Ative o **Firestore Database** (modo de teste).
3.  Vá em "Configurações do Projeto" > "Contas de Serviço".
4.  Clique em "Gerar nova chave privada" e baixe o arquivo JSON.
5.  Renomeie o arquivo para `serviceAccountKey.json` e coloque-o dentro da pasta `backend/functions/`.
6.  **Importante:** Adicione `backend/functions/serviceAccountKey.json` ao seu arquivo `.gitignore` principal.
7.  Faça o upgrade do seu projeto para o plano **Blaze (Pay-as-you-go)** para poder usar as Cloud Functions.

### Backend (Firebase Functions)

1.  Navegue até a pasta `backend/functions`: `cd backend/functions`
2.  Instale as dependências: `npm install`
3.  Compile o TypeScript: `npm run build`
4.  **Deploy para a Nuvem:** `firebase deploy --only functions`
5.  Copie a **Function URL (api)** gerada pelo deploy.

### Frontend (React Native App)

1.  Navegue até a pasta `frontend`: `cd ../../frontend` (ou caminho correto)
2.  Instale as dependências: `npm install`
3.  **Configure a `API_URL`:** Abra `App.tsx` e substitua o valor da constante `API_URL` pela **Function URL** copiada.
4.  **Configure a Chave da API do Google Maps:** Abra `android/app/src/main/AndroidManifest.xml`, encontre a tag `<meta-data android:name="com.google.android.geo.API_KEY" ... />` e insira sua chave do Maps SDK for Android.
5.  **Configure as Permissões Android:** Verifique se as permissões `INTERNET`, `ACCESS_FINE_LOCATION` e `FOREGROUND_SERVICE` estão no `AndroidManifest.xml`.
6.  **Rode o App no Emulador/Dispositivo:**
    * Inicie o Emulador/Conecte o Dispositivo.
    * Inicie o Metro: `npx react-native start`
    * Em **outro terminal**, instale e rode: `adb reverse tcp:8081 tcp:8081 && npx react-native run-android`

## 📱 Uso Básico

1.  Ao abrir, o app pedirá permissão de localização e tentará centralizar o mapa.
2.  Os pontos de coleta existentes serão exibidos no mapa.
3.  Clique em um **marcador** para ver o nome e os materiais.
4.  Clique no **balão de informações** para abrir o menu de opções ("Editar", "Deletar").
5.  Clique em uma **área vazia do mapa** para abrir o modal de criação de um novo ponto.
6.  Use o botão **"Ver Lista" / "Fechar Lista"** para alternar entre o mapa e a lista de pontos próximos.
7.  Clique em um **item da lista** para ser levado à localização dele no mapa.

## 📝 Próximos Passos (Sugestões)

* Implementar **Firebase Authentication** para login/cadastro de usuários.
* Associar os ecopontos criados aos usuários.
* Permitir o upload de **fotos** dos pontos de coleta usando **Firebase Cloud Storage**.
* Melhorar a interface e a experiência do usuário (UX/UI).
* Adicionar filtros mais avançados.
* Criar um sistema de avaliação/validação dos pontos.

---
Feito com ❤️ para a APS 8 da UNIP.