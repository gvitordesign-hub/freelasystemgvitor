# 🛠️ Resolução de Domínio & Roteamento - GVITOR SYSTEM

Este guia detalha o motivo pelo qual o portfólio (`gvitor.com.br`) está aparecendo ao acessar o painel de gestão (`sistema.gvitor.com.br`) e como corrigir isso em poucos minutos na sua VPS Hostinger.

---

## 🔍 O Diagnóstico (O que está acontecendo?)

Ambos os domínios (`gvitor.com.br` e `sistema.gvitor.com.br`) estão apontando corretamente para o mesmo IP da sua VPS através da Cloudflare. Isso está 100% correto!

O problema ocorre no **recebimento desse tráfego na VPS**:
1. **Se o Portfólio estiver rodando diretamente na porta 80 do Host:** O contêiner do portfólio está capturando todas as conexões vindas da porta `80` (HTTP) da VPS. Como ele não sabe distinguir subdomínios, ele exibe o portfólio para qualquer endereço acessado.
2. **Se você estiver usando o Nginx no Host:** O Nginx está escutando na porta `80/443`, mas não tem uma configuração ativa/válida para `sistema.gvitor.com.br`. Por conta disso, ele direciona as requisições para o bloco padrão (*default_server*), que é o portfólio.

---

## 🛠️ Passo a Passo para Corrigir (SSH na VPS)

Conecte-se à sua VPS usando o terminal local (PowerShell ou Command Prompt) para realizar as verificações e correções abaixo:

```bash
ssh root@<IP_DA_SUA_VPS>
```

---

### Cenário A: Você está usando o Nginx no Host (Recomendado)

Neste cenário, o Nginx na VPS gerencia as conexões e encaminha para os respectivos contêineres Docker.

#### 1. Criar o arquivo de configuração para o Sistema
Crie a configuração do subdomínio executando na VPS:
```bash
sudo nano /etc/nginx/sites-available/sistema.gvitor.com.br.conf
```

**Cole este bloco de configuração:**
```nginx
server {
    listen 80;
    server_name sistema.gvitor.com.br;

    location / {
        proxy_pass http://127.0.0.1:8080; # Porta interna onde o GVITOR SYSTEM está rodando
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Headers de encaminhamento de IP reais
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
*(Para salvar no nano: `Ctrl + O`, `Enter` e depois `Ctrl + X`)*

#### 2. Ativar o subdomínio e reiniciar o Nginx
Crie o link simbólico para ativar o site e recarregue o Nginx:
```bash
# Criar link simbólico
sudo ln -sf /etc/nginx/sites-available/sistema.gvitor.com.br.conf /etc/nginx/sites-enabled/

# Testar sintaxe do Nginx
sudo nginx -t

# Se o teste acima passar com sucesso, reinicie o serviço:
sudo systemctl restart nginx
```

#### 3. Gerar o Certificado SSL (HTTPS) Seguro
Com o Certbot, gere o certificado SSL gratuito para o novo subdomínio:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d sistema.gvitor.com.br
```
*Selecione a opção de redirecionar automaticamente todo o tráfego de HTTP para HTTPS se perguntado.*

---

### Cenário B: Conflito de Portas no Docker (Sem Nginx no Host)

Se você não instalou o Nginx diretamente no sistema operacional da VPS e colocou o contêiner do Portfólio rodando diretamente na porta `80:80`, você precisará alterar a estrutura para que o Nginx gerencie ambos:

1. **Alterar a porta do Portfólio no Docker:**
   Mude a porta externa do portfólio no `docker-compose.yml` do portfólio para `8081:80` (liberando a porta 80 da VPS para o Nginx).
2. **Subir os contêineres:**
   - Portfólio rodando em: `http://localhost:8081`
   - Sistema rodando em: `http://localhost:8080` (definido no seu `docker-compose.yml` atual)
3. **Instalar o Nginx na VPS:**
   ```bash
   sudo apt update
   sudo apt install nginx -y
   ```
4. **Criar as duas configurações de Proxy Reverso no Nginx:**

   *   **Para o Portfólio (`/etc/nginx/sites-available/gvitor.com.br.conf`):**
       ```nginx
       server {
           listen 80;
           server_name gvitor.com.br www.gvitor.com.br;
           location / {
               proxy_pass http://127.0.0.1:8081;
               proxy_set_header Host $host;
               proxy_set_header X-Real-IP $remote_addr;
           }
       }
       ```
   *   **Para o Sistema (`/etc/nginx/sites-available/sistema.gvitor.com.br.conf`):**
       *(Use a mesma configuração descrita no Cenário A, apontando para `http://127.0.0.1:8080`)*

5. **Habilitar ambos e rodar o Certbot:**
   ```bash
   sudo ln -sf /etc/nginx/sites-available/gvitor.com.br.conf /etc/nginx/sites-enabled/
   sudo ln -sf /etc/nginx/sites-available/sistema.gvitor.com.br.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   sudo certbot --nginx -d gvitor.com.br -d www.gvitor.com.br -d sistema.gvitor.com.br
   ```

---

## 🔒 Dica Extra: Configuração no Painel Cloudflare

No painel da Cloudflare (onde está o seu domínio `gvitor.com.br`):
1. Garanta que o registro `A` de `sistema` está com a nuvem laranja ativa (**Proxied**).
2. Na aba **SSL/TLS**, certifique-se de que a configuração está definida como **Full** ou **Full (Strict)** se você configurou o SSL com Certbot na VPS, ou **Flexible** se estiver rodando apenas via HTTP interno.

Seguindo estes passos, as conexões de cada domínio serão roteadas perfeitamente para as portas corretas dos seus respectivos contêineres!
