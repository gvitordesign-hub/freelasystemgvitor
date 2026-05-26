# 🚀 Guia Completo de Implantação em VPS Hostinger (Ubuntu + Docker)

Este guia orienta passo a passo sobre como implantar o **GVITOR SYSTEM 2** em sua VPS Ubuntu da Hostinger dentro de um contêiner Docker otimizado.

---

## 🛠️ Arquivos de Configuração Criados
Já criei e configurei todos os arquivos necessários na raiz do seu projeto:
1. **Dockerfile:** Configura a compilação multi-estágio da aplicação (Node 20 para compilar e Nginx Alpine para servir).
2. **nginx.conf:** Configuração Nginx customizada para suportar rotas de SPA (Vite/React Router), compressão gzip de alta velocidade e cache.
3. **docker-compose.yml:** Facilita a compilação e execução do contêiner, expondo a aplicação na porta `8080` de forma segura.

---

## 📋 Passo a Passo de Configuração na VPS

### Passo 1: Preparar o Ubuntu na VPS
Conecte-se à sua VPS via SSH e atualize os pacotes do sistema:
```bash
sudo apt update && sudo apt upgrade -y
```

### Passo 2: Instalar o Docker e Docker Compose
Se você ainda não tiver o Docker instalado na sua VPS Ubuntu, instale-o com estes comandos oficiais rápidos:
```bash
# Instalar dependências necessárias
sudo apt install apt-transport-https ca-certificates curl software-properties-common -y

# Adicionar a chave GPG oficial do Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Adicionar repositório do Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker Engine
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io -y

# Ativar e iniciar o serviço Docker
sudo systemctl enable docker
sudo systemctl start docker

# Instalar Docker Compose V2
sudo apt install docker-compose-plugin -y
```

---

### Passo 3: Clonar seu Projeto e Configurar as Variáveis de Ambiente
1. Clone o seu repositório Git dentro da VPS:
   ```bash
   git clone <URL_DO_SEU_REPOSITORIO> gvitor-system
   cd gvitor-system
   ```

2. Crie um arquivo `.env` na raiz do projeto dentro da VPS com os mesmos valores de conexão do seu Supabase:
   ```bash
   nano .env
   ```
   Cole o seguinte conteúdo (substitua pelos seus dados reais se necessário):
   ```env
   VITE_SUPABASE_URL=https://yahqqmzmndetzgmtmzwi.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhaHFxbXptbmRldHpnbXRtendpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MzAyODgsImV4cCI6MjA4NjQwNjI4OH0.5FQJxIAU17uCdN-NXbaGzEUn6ulbh_mVa4lGX_ADmxU
   ```
   > [!IMPORTANT]
   > No Vite, as variáveis de ambiente com o prefixo `VITE_` precisam ser injetadas durante o processo de **compilação (build time)**. O nosso `Dockerfile` e `docker-compose.yml` já cuidam disso automaticamente lendo este arquivo `.env` da VPS ao rodar a montagem da imagem!

---

### Passo 4: Executar o Contêiner Docker
Compile a imagem e suba o contêiner em segundo plano (`-d` para detached mode):
```bash
sudo docker compose up --build -d
```

Verifique se o contêiner está rodando com sucesso:
```bash
sudo docker ps
```
A aplicação estará rodando na porta **8080** da sua VPS!

---

### Passo 5: Configurar Domínio e SSL Grátis (Nginx como Proxy Reverso)
Para acessar seu sistema usando seu domínio personalizado (ex: `sistema.seu-dominio.com`) de forma segura com `HTTPS` (SSL):

1. Instale o Nginx na máquina host da VPS (para atuar como roteador externo):
   ```bash
   sudo apt install nginx -y
   ```

2. Crie uma configuração para o seu domínio:
   ```bash
   sudo nano /etc/nginx/sites-available/sistema.conf
   ```
   Cole o bloco abaixo (substituindo `sistema.seu-dominio.com` pelo seu domínio):
   ```nginx
   server {
       listen 80;
       server_name sistema.seu-dominio.com;

       location / {
           proxy_pass http://localhost:8080;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. Habilite o site e reinicie o Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/sistema.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. Adicione SSL Grátis com Let's Encrypt (Certbot):
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d sistema.seu-dominio.com
   ```
   Siga as instruções rápidas na tela e escolha a opção de redirecionar automaticamente todo o tráfego HTTP para HTTPS.

---

## 🎯 Conclusão
Pronto! Seu sistema de gestão estará disponível de forma extremamente performática, segura, encapsulada em Docker e rodando com HTTPS em seu domínio pessoal na VPS Hostinger!
