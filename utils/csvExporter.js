const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');

class CSVExporter {
    async exportParticipants(participants, raffleTitle) {
        const csvData = participants.map(participant => ({
            numero: participant.number,
            nome: participant.name,
            email: participant.email,
            whatsapp: participant.phone || '',
            cidade: participant.city || '',
            status: participant.status === 'paid' ? 'Pago' : 'Reservado',
            status_pagamento: participant.payment_status === 'approved' ? 'Aprovado' : 'Pendente',
            data_participacao: new Date(participant.created_at).toLocaleDateString('pt-BR')
        }));

        // Create CSV string manually for better control
        const headers = ['Número', 'Nome', 'Email', 'WhatsApp', 'Cidade', 'Status', 'Status Pagamento', 'Data Participação'];
        let csvString = headers.join(',') + '\n';

        csvData.forEach(row => {
            const values = [
                row.numero,
                `"${row.nome}"`,
                `"${row.email}"`,
                `"${row.whatsapp}"`,
                `"${row.cidade}"`,
                `"${row.status}"`,
                `"${row.status_pagamento}"`,
                `"${row.data_participacao}"`
            ];
            csvString += values.join(',') + '\n';
        });

        return csvString;
    }

    async exportRaffleStats(raffle, participants) {
        const paidParticipants = participants.filter(p => p.status === 'paid');
        const reservedParticipants = participants.filter(p => p.status === 'reserved');
        const totalRevenue = paidParticipants.length * raffle.price_per_number;

        const statsData = [
            { campo: 'Título da Rifa', valor: raffle.title },
            { campo: 'Total de Números', valor: raffle.total_numbers },
            { campo: 'Preço por Número', valor: `R$ ${raffle.price_per_number.toFixed(2)}` },
            { campo: 'Números Vendidos', valor: paidParticipants.length },
            { campo: 'Números Reservados', valor: reservedParticipants.length },
            { campo: 'Números Disponíveis', valor: raffle.total_numbers - participants.length },
            { campo: 'Receita Total', valor: `R$ ${totalRevenue.toFixed(2)}` },
            { campo: 'Data do Sorteio', valor: new Date(raffle.draw_date).toLocaleDateString('pt-BR') },
            { campo: 'Status', valor: raffle.status === 'active' ? 'Ativa' : 'Finalizada' }
        ];

        if (raffle.winner_number) {
            statsData.push({ campo: 'Número Vencedor', valor: raffle.winner_number });
            statsData.push({ campo: 'Número da Loteria', valor: raffle.lottery_number });
        }

        const headers = ['Campo', 'Valor'];
        let csvString = headers.join(',') + '\n';

        statsData.forEach(row => {
            csvString += `"${row.campo}","${row.valor}"\n`;
        });

        return csvString;
    }
}

module.exports = new CSVExporter();
