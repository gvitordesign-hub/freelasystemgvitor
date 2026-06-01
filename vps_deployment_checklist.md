# 🚀 Checklist de Implantação - GVITOR SYSTEM

Este é o roteiro definitivo para colocar o **GVITOR SYSTEM** no ar na sua VPS Hostinger usando contêineres Docker robustos e SSL gratuito via Cloudflare/Certbot.

---

## 📂 Informações do Projeto
* **Repositório Git:** `https://github.com/gvitordesign-hub/freelasystemgvitor.git`
* **Tecnologia:** React + Vite (SPA) + Docker + Nginx
* **Porta Interna do Docker:** `80`
* **Porta Exposta na VPS:** `8080` (Mapeada de forma segura)

---

## ⚡ Passo a Passo de Execução na VPS

### 1. Conectando na VPS via SSH
Abra o seu terminal local (PowerShell no Windows ou Terminal no macOS/Linux) e conecte-se diretamente à sua VPS:
```bash
ssh root@<IP_DA_SUA_VPS>
```

---

### 2. Preparando o Ambiente (Apenas se não tiver o Docker instalado)
Se o Docker já estiver ativo, pule este passo. Caso contrário, execute na VPS:
```bash
# Atualizar pacotes
sudo apt update && sudo apt upgrade -y

# Instalar dependências
sudo apt install apt-transport-https ca-certificates curl software-properties-common -y

# Adicionar chave oficial do Docker e Repositório
curl -fsSL https://download.download.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker e Docker Compose
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin -y
```

---

### 3. Clonando e Configurando o GVITOR SYSTEM
Agora, vamos baixar o código na VPS e configurar as variáveis do Supabase para que a build do Vite ocorra perfeitamente em produção:

```bash
# 1. Navegar até a pasta root da VPS
cd ~

# 2. Clonar o repositório
git clone https://github.com/gvitordesign-hub/freelasystemgvitor.git gvitor-system
cd gvitor-system

# 3. Criar o arquivo de variáveis de ambiente
nano .env
```

**Cole o seguinte bloco dentro do editor `nano` na VPS:**
```env
VITE_SUPABASE_URL=https://yahqqmzmndetzgmtmzwi.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhaHFxbXptbmRldHpnbXRtendpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MzAyODgsImV4cCI6MjA4NjQwNjI4OH0.5FQJxIAU17uCdN-NXbaGzEUn6ulbh_mVa4lGX_ADmxU
```
*(Pressione `Ctrl + O` e `Enter` para salvar, e `Ctrl + X` para sair do editor nano)*

---

### 4. Rodando o Sistema com Docker (Zero Downtime)
Vamos compilar a imagem e colocar o contêiner para rodar em segundo plano:
```bash
sudo docker compose up -d --build
```
> [!TIP]
> Para verificar se o contêiner subiu com sucesso e está escutando na porta **8080**, execute:
> ```bash
> docker ps
> ```

---

### 5. Apontando o Domínio e Ativando SSL (Recomendado via Cloudflare)

Para acessar por um domínio bonito (ex: `sistema.seudominio.com`) com HTTPS seguro:

1. **DNS na Cloudflare:**
   - Adicione o seu domínio na **Cloudflare** (plano gratuito).
   - Adicione um registro do tipo `A` apontando para o **IP da sua VPS** (ative a nuvem laranja: *Proxied*).
2. **Configurando o Nginx como Proxy Reverso na VPS:**
   ```bash
   sudo apt install nginx -y
   sudo nano /etc/nginx/sites-available/sistema.conf
   ```
   **Cole a configuração abaixo (substitua `sistema.seudominio.com` pelo seu subdomínio):**
   ```nginx
   server {
       listen 80;
       server_name sistema.seudominio.com;

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
3. **Ativar a configuração e reiniciar o Nginx:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/sistema.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```
4. **SSL Grátis do Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d sistema.seudominio.com
   ```
   *Siga os passos na tela e escolha a opção de redirecionar automaticamente todo o tráfego de HTTP para HTTPS.*

---

## 🛠️ Comandos Úteis de Manutenção (Rodar na pasta `~/gvitor-system`)
* **Atualizar o sistema após novos pushes no Git:**
  ```bash
  git pull && docker compose up -d --build
  ```
* **Ver logs em tempo real:**
  ```bash
  docker compose logs -f
  ```
* **Parar o contêiner:**
  ```bash
  docker compose down
  ```
