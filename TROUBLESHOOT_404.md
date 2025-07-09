# Solução para Erro 404: NOT_FOUND na Vercel

## ⚠️ ERRO ATUAL
```
404: NOT_FOUND
Code: NOT_FOUND
ID: gru1::5lrqc-1752091038684-b48aed8cc4b2
```

## 🔍 DIAGNÓSTICO COMPLETO

### 1. Verificar Variáveis de Ambiente (CRÍTICO)

No painel Vercel → Settings → Environment Variables, adicionar:

```
VERCEL=1
NODE_ENV=production
SESSION_SECRET=minhaChaveSecretaMuitoForte123!
ADMIN_PASSWORD=minhaSenhaAdminSegura456!
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxx (opcional)
```

### 2. URLs Corretas para Testar

❌ **ERRADO**: `https://seu-app.vercel.app/admin/login`
✅ **CORRETO**: `https://seu-app.vercel.app/admin-login.html`

**Sequência de teste:**
1. `https://seu-app.vercel.app/` (página inicial)
2. `https://seu-app.vercel.app/admin-login.html` (tela de login)
3. Login com: usuário=`admin`, senha=`ADMIN_PASSWORD`
4. `https://seu-app.vercel.app/admin` (painel admin)

### 3. Verificar Logs da Vercel

1. Painel Vercel → Functions tab
2. Clicar em "View Function Logs"
3. Procurar por erros de inicialização

### 4. Testar API Diretamente

```bash
# Testar API básica
curl https://seu-app.vercel.app/api/raffles

# Testar com verbose
curl -v https://seu-app.vercel.app/api/raffles
```

### 5. Arquivos Verificados ✅

- `vercel.json` - Configuração correta
- `api/index.js` - Entry point correto
- `server.js` - Middleware Vercel configurado
- `config/database-vercel.js` - Banco adaptado

### 6. Processo de Deploy

1. **Fazer novo deploy** com arquivos atualizados
2. **Aguardar 2-3 minutos** para propagação
3. **Primeira requisição** pode demorar 30s (cold start)
4. **Testar URLs** na ordem correta

### 7. Cold Start Esperado

**Primeira requisição:**
- Timeout: 10-30 segundos
- Logs: "Inicializando banco de dados para Vercel..."
- Status: 200 após inicialização

**Requisições seguintes:**
- Resposta rápida (<1s)
- Banco já inicializado

### 8. Alternativas se 404 Persistir

#### Opção A: Railway (Recomendado)
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login e deploy
railway login
railway deploy

# Adicionar PostgreSQL
railway add postgresql
```

#### Opção B: Render
1. Conectar repositório GitHub
2. Configurar variáveis de ambiente
3. Deploy automático

### 9. Checklist de Verificação

Antes de reportar problema, verificar:

- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Deploy feito com arquivos atualizados
- [ ] Aguardado 2-3 minutos após deploy
- [ ] Testado URL correto (`/admin-login.html`)
- [ ] Verificado logs da function
- [ ] Testado API diretamente (`/api/raffles`)

### 10. Solução de Último Recurso

Se o erro persistir após todas as verificações:

1. **Deletar** o projeto na Vercel
2. **Criar novo** projeto
3. **Configurar** variáveis de ambiente
4. **Deploy** novamente

## 🎯 PRÓXIMOS PASSOS IMEDIATOS

1. **Configurar variáveis de ambiente** no painel Vercel
2. **Fazer novo deploy** (git push ou manual)
3. **Aguardar 3 minutos** para propagação
4. **Testar**: `https://seu-app.vercel.app/admin-login.html`
5. **Verificar logs** se ainda der erro

## 📞 SUPORTE

Se após seguir todos os passos o erro persistir, o problema pode ser:
- Limite de conta Vercel atingido
- Problema temporário da Vercel
- Configuração específica da conta

**Recomendação**: Migrar para Railway ou Render para melhor estabilidade com banco de dados.