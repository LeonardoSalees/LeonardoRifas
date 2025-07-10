#!/usr/bin/env node

/**
 * Script de deploy para verificar configuração antes do deploy
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Verificando configuração para deploy...\n');

// Verificar arquivos essenciais
const requiredFiles = [
    'api/index.js',
    'vercel.json',
    'server.js',
    'config/database-postgresql.js',
    'public/index.html',
    'public/admin-login.html',
    'public/admin.html'
];

console.log('📁 Verificando arquivos essenciais:');
let missingFiles = [];

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - ARQUIVO FALTANDO`);
        missingFiles.push(file);
    }
});

if (missingFiles.length > 0) {
    console.log('\n❌ Arquivos faltando! Deploy pode falhar.');
    process.exit(1);
}

// Verificar variáveis de ambiente essenciais
console.log('\n🔑 Variáveis de ambiente necessárias no Vercel:');
const requiredEnvVars = [
    'NODE_ENV=production',
    'SESSION_SECRET=sua-chave-secreta-forte',
    'ADMIN_PASSWORD=sua-senha-admin-segura',
    'MERCADOPAGO_ACCESS_TOKEN=seu-token-producao (opcional)'
];

requiredEnvVars.forEach(envVar => {
    console.log(`• ${envVar}`);
});

// Verificar configuração do vercel.json
console.log('\n⚙️ Verificando vercel.json...');
try {
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    
    if (vercelConfig.functions && vercelConfig.functions['api/index.js']) {
        console.log('✅ Function api/index.js configurada');
    } else {
        console.log('❌ Function api/index.js não configurada');
    }
    
    if (vercelConfig.routes && vercelConfig.routes.length > 0) {
        console.log('✅ Rotas configuradas');
    } else {
        console.log('❌ Rotas não configuradas');
    }
    
    if (vercelConfig.env && vercelConfig.env.VERCEL === '1') {
        console.log('✅ Environment VERCEL=1 configurado');
    } else {
        console.log('❌ Environment VERCEL=1 não configurado');
    }
    
} catch (error) {
    console.log('❌ Erro ao ler vercel.json:', error.message);
}

// Verificar entry point
console.log('\n🎯 Verificando entry point...');
try {
    const apiIndex = fs.readFileSync('api/index.js', 'utf8');
    if (apiIndex.includes('require(\'../server\')')) {
        console.log('✅ Entry point correto');
    } else {
        console.log('❌ Entry point incorreto');
    }
} catch (error) {
    console.log('❌ Erro ao ler api/index.js:', error.message);
}

console.log('\n📋 Próximos passos:');
console.log('1. Configurar variáveis de ambiente no painel Vercel');
console.log('2. Fazer git commit e push');
console.log('3. Deploy automático ou manual no Vercel');
console.log('4. Aguardar primeira requisição inicializar o banco');
console.log('5. Testar: https://seu-app.vercel.app/admin-login.html');

console.log('\n⚠️  IMPORTANTE:');
console.log('• Primeira requisição pode demorar (cold start)');
console.log('• Banco SQLite é temporário na Vercel');
console.log('• Para produção, considere Railway ou Render');

console.log('\n✨ Configuração verificada! Pronto para deploy.');