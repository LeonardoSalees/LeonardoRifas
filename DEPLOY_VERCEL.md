# Deploy na Vercel - Guia Completo

## Configuração Atual

✅ **Arquivos configurados:**
- `vercel.json` - Configuração de rotas e builds
- `api/index.js` - Entry point para Vercel
- `config/database-vercel.js` - Banco adaptado para Vercel
- `server.js` - Servidor adaptado para serverless

## Passos para Deploy

### 1. Configurar Variáveis de Ambiente na Vercel

No painel da Vercel, adicione essas variáveis:

```env
# Essenciais
NODE_ENV=production
SESSION_SECRET=sua-chave-secreta-forte-aqui
ADMIN_PASSWORD=sua-senha-admin-segura
MERCADOPAGO_ACCESS_TOKEN=seu-token-producao-mercadopago
VERCEL=1

# Webhook (opcional)
WEBHOOK_URL=https://seu-app.vercel.app/api/payments/webhook
```

### 2. Estrutura do Projeto

```
projeto/
├── api/
│   └── index.js          # Entry point Vercel
├── config/
│   ├── database.js       # Banco local
│   └── database-vercel.js # Banco Vercel
├── public/              # Arquivos estáticos
├── routes/              # Rotas da API
├── server.js            # Servidor principal
└── vercel.json          # Configuração Vercel
```

### 3. Limitações da Vercel

#### Banco de Dados
- SQLite em `/tmp` (temporário)
- Dados são perdidos entre deployments
- **Recomendação**: Use PostgreSQL ou MySQL

#### Sessões
- Sessões podem ser perdidas
- **Recomendação**: Use Redis ou database sessions

### 4. Solução de Problemas

#### Erro 404: NOT_FOUND
**Causa**: Rotas não configuradas corretamente
**Solução**: Verificar `vercel.json` e deploy novamente

#### Erro ao carregar rifas
**Causa**: Banco de dados não inicializado
**Solução**: Aguardar primeira requisição inicializar o banco

#### Sessões perdidas
**Causa**: Serverless functions são stateless
**Solução**: Usar banco de dados para sessões

### 5. Deploy Recomendado para Produção

Para um ambiente de produção estável, recomendo:

#### Railway (Recomendado)
```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Deploy
railway deploy

# 4. Adicionar PostgreSQL
railway add postgresql
```

#### Render
```bash
# 1. Conectar repositório GitHub
# 2. Configurar variáveis de ambiente
# 3. Deploy automático
```

### 6. Configuração Alternativa - PostgreSQL

Se quiser usar PostgreSQL na Vercel:

```bash
# Instalar dependências
npm install pg

# Configurar variável
DATABASE_URL=postgresql://user:pass@host:port/db
```

### 7. Testando o Deploy

Após deploy, teste:

1. **Página inicial**: `https://seu-app.vercel.app`
2. **Admin login**: `https://seu-app.vercel.app/admin/login`
3. **API rifas**: `https://seu-app.vercel.app/api/raffles`

### 8. Monitoramento

- Logs: Painel Vercel > Functions > Logs
- Métricas: Painel Vercel > Analytics
- Erros: Painel Vercel > Functions > Errors

## Alternativas Recomendadas

### Railway (Melhor para este projeto)
- Banco PostgreSQL persistente
- Fácil configuração
- Logs detalhados
- Domínio personalizado

### Render
- Banco PostgreSQL gratuito
- SSL automático
- Deploy automático do GitHub

### Heroku
- Addon PostgreSQL
- Logs robustos
- Escalabilidade

## Status Atual

✅ **Configurado para Vercel**
⚠️ **Limitações**: Banco temporário, sessões instáveis
🔄 **Recomendação**: Use Railway ou Render para produção

## Próximos Passos

1. **Testar na Vercel** com as configurações atuais
2. **Migrar para Railway** se precisar de estabilidade
3. **Configurar PostgreSQL** se permanecer na Vercel
4. **Configurar webhook** do Mercado Pago