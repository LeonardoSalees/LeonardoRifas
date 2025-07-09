// Script para configurar webhook do Mercado Pago automaticamente
const https = require('https');
const { URL } = require('url');
require('dotenv').config();

class WebhookSetup {
    constructor() {
        this.accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        this.webhookUrl = process.env.WEBHOOK_URL;
        this.baseUrl = 'https://api.mercadopago.com';
    }

    async createWebhook() {
        if (!this.accessToken) {
            console.error('❌ MERCADOPAGO_ACCESS_TOKEN não configurado');
            return;
        }

        if (!this.webhookUrl) {
            console.error('❌ WEBHOOK_URL não configurado');
            console.log('Exemplo: WEBHOOK_URL=https://seu-dominio.com/api/payments/webhook');
            return;
        }

        const webhookData = {
            url: this.webhookUrl,
            events: [
                {
                    topic: 'payment'
                }
            ]
        };

        try {
            console.log('🔄 Configurando webhook do Mercado Pago...');
            console.log(`📡 URL: ${this.webhookUrl}`);
            
            const result = await this.makeRequest('POST', '/v1/webhooks', webhookData);
            
            if (result.id) {
                console.log('✅ Webhook configurado com sucesso!');
                console.log(`📋 ID: ${result.id}`);
                console.log(`🌐 URL: ${result.url}`);
                console.log('📝 Eventos: payment');
                
                // Salvar ID do webhook no .env
                this.saveWebhookId(result.id);
            } else {
                console.error('❌ Erro ao configurar webhook:', result);
            }
        } catch (error) {
            console.error('❌ Erro ao configurar webhook:', error.message);
        }
    }

    async listWebhooks() {
        try {
            console.log('📋 Listando webhooks existentes...');
            const result = await this.makeRequest('GET', '/v1/webhooks');
            
            if (result && result.length > 0) {
                console.log(`📊 Encontrados ${result.length} webhooks:`);
                result.forEach((webhook, index) => {
                    console.log(`${index + 1}. ID: ${webhook.id} | URL: ${webhook.url} | Status: ${webhook.status}`);
                });
            } else {
                console.log('ℹ️  Nenhum webhook encontrado');
            }
        } catch (error) {
            console.error('❌ Erro ao listar webhooks:', error.message);
        }
    }

    async deleteWebhook(webhookId) {
        try {
            console.log(`🗑️  Deletando webhook ${webhookId}...`);
            await this.makeRequest('DELETE', `/v1/webhooks/${webhookId}`);
            console.log('✅ Webhook deletado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao deletar webhook:', error.message);
        }
    }

    async testWebhook() {
        if (!this.webhookUrl) {
            console.error('❌ WEBHOOK_URL não configurado');
            return;
        }

        try {
            console.log('🧪 Testando webhook...');
            const testPayload = {
                action: 'payment.updated',
                api_version: 'v1',
                data: {
                    id: 'test-payment-id'
                },
                date_created: new Date().toISOString(),
                id: Date.now(),
                live_mode: false,
                type: 'payment',
                user_id: 'test-user'
            };

            const url = new URL(this.webhookUrl);
            const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(JSON.stringify(testPayload))
                }
            };

            const response = await this.makeHttpRequest(options, testPayload);
            console.log('✅ Webhook testado com sucesso!');
            console.log(`📝 Resposta: ${response}`);
        } catch (error) {
            console.error('❌ Erro ao testar webhook:', error.message);
        }
    }

    async makeRequest(method, endpoint, data = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.mercadopago.com',
                port: 443,
                path: endpoint,
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    try {
                        const jsonBody = JSON.parse(body);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(jsonBody);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${jsonBody.message || body}`));
                        }
                    } catch (error) {
                        reject(new Error(`Erro ao processar resposta: ${error.message}`));
                    }
                });
            });

            req.on('error', reject);
            
            if (data) {
                req.write(JSON.stringify(data));
            }
            
            req.end();
        });
    }

    async makeHttpRequest(options, data) {
        return new Promise((resolve, reject) => {
            const protocol = options.port === 443 ? https : require('http');
            const req = protocol.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => resolve(body));
            });

            req.on('error', reject);
            
            if (data) {
                req.write(JSON.stringify(data));
            }
            
            req.end();
        });
    }

    saveWebhookId(webhookId) {
        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(__dirname, '..', '.env');
        
        try {
            let envContent = '';
            if (fs.existsSync(envPath)) {
                envContent = fs.readFileSync(envPath, 'utf8');
            }
            
            if (envContent.includes('MERCADOPAGO_WEBHOOK_ID=')) {
                envContent = envContent.replace(/MERCADOPAGO_WEBHOOK_ID=.*/, `MERCADOPAGO_WEBHOOK_ID=${webhookId}`);
            } else {
                envContent += `\nMERCADOPAGO_WEBHOOK_ID=${webhookId}\n`;
            }
            
            fs.writeFileSync(envPath, envContent);
            console.log('💾 ID do webhook salvo no .env');
        } catch (error) {
            console.error('⚠️  Erro ao salvar ID do webhook:', error.message);
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const webhook = new WebhookSetup();
    
    if (args.length === 0) {
        console.log(`
🎯 Configurador de Webhook Mercado Pago

Comandos disponíveis:
  node setup-webhook.js create    - Criar novo webhook
  node setup-webhook.js list      - Listar webhooks existentes
  node setup-webhook.js delete ID - Deletar webhook específico
  node setup-webhook.js test      - Testar webhook

Variáveis necessárias no .env:
  MERCADOPAGO_ACCESS_TOKEN=seu-token-aqui
  WEBHOOK_URL=https://seu-dominio.com/api/payments/webhook
        `);
        return;
    }

    switch (args[0]) {
        case 'create':
            await webhook.createWebhook();
            break;
        case 'list':
            await webhook.listWebhooks();
            break;
        case 'delete':
            if (args[1]) {
                await webhook.deleteWebhook(args[1]);
            } else {
                console.error('❌ ID do webhook é obrigatório');
            }
            break;
        case 'test':
            await webhook.testWebhook();
            break;
        default:
            console.error('❌ Comando inválido');
    }
}

if (require.main === module) {
    main();
}

module.exports = WebhookSetup;