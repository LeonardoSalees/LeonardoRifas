# Configuração do Webhook Mercado Pago

## 1. Configurar URL do Webhook

### No Painel do Mercado Pago:
1. Acesse: https://www.mercadopago.com.br/developers/panel/webhooks
2. Clique em "Criar webhook"
3. Configure:
   - **URL**: https://seu-dominio.com/api/payments/webhook
   - **Eventos**: Selecione "Pagamentos"
   - **Versão da API**: v1

### Eventos Importantes:
- `payment.created` - Pagamento criado
- `payment.updated` - Status do pagamento alterado
- `payment.approved` - Pagamento aprovado
- `payment.cancelled` - Pagamento cancelado
- `payment.rejected` - Pagamento rejeitado

## 2. Configurar Variáveis de Ambiente

Adicione no seu arquivo `.env`:

```env
# Webhook do Mercado Pago
MERCADOPAGO_WEBHOOK_SECRET=seu-secret-do-webhook-aqui
MERCADOPAGO_ACCESS_TOKEN=seu-token-de-producao-aqui
```

## 3. Testando o Webhook

### Localmente (para desenvolvimento):
1. Use ngrok para expor sua aplicação local:
   ```bash
   npm install -g ngrok
   ngrok http 5000
   ```

2. Configure o webhook com a URL do ngrok:
   ```
   https://abc123.ngrok.io/api/payments/webhook
   ```

### Em produção:
Use sua URL real:
```
https://seu-dominio.com/api/payments/webhook
```

## 4. Segurança do Webhook

O sistema já valida:
- Assinatura do webhook (se configurada)
- Rate limiting para evitar spam
- Validação dos dados recebidos

## 5. Fluxo de Pagamento

1. **Usuário** escolhe número e faz reserva
2. **Sistema** cria pagamento PIX no Mercado Pago
3. **Usuário** faz pagamento via PIX
4. **Mercado Pago** envia notificação via webhook
5. **Sistema** atualiza status do participante para "paid"
6. **Admin** pode ver pagamento confirmado no painel

## 6. Logs e Monitoramento

O webhook registra logs para:
- Pagamentos aprovados
- Pagamentos rejeitados
- Erros de processamento
- Tentativas de webhook inválidas

## 7. Testando Pagamentos

### Modo Sandbox (desenvolvimento):
- Use cartões de teste do Mercado Pago
- Valores baixos para teste
- Webhook funcionará normalmente

### Modo Produção:
- Use token de produção
- Configure webhook na conta real
- Teste com valor baixo primeiro

## 8. Solução de Problemas

### Webhook não está chegando:
1. Verifique se a URL está acessível
2. Confirme se o webhook está ativo no painel
3. Verifique logs do servidor
4. Teste manualmente com curl

### Pagamentos não são atualizados:
1. Verifique logs da rota webhook
2. Confirme se o payment_id está correto
3. Verifique se o banco de dados está sendo atualizado

## 9. Exemplo de Teste Manual

```bash
# Testar webhook localmente
curl -X POST http://localhost:5000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "action": "payment.updated",
    "api_version": "v1",
    "data": {
      "payment_id": "123456789"
    },
    "date_created": "2024-01-01T10:00:00Z",
    "id": 123456789,
    "live_mode": false,
    "type": "payment",
    "user_id": "123456789"
  }'
```

## Status: ✅ WEBHOOK IMPLEMENTADO

O sistema já possui toda a infraestrutura de webhook funcionando. Basta configurar a URL no painel do Mercado Pago!