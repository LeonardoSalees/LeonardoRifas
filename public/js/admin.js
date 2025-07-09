// Admin JavaScript

class AdminApp {
    constructor() {
        this.currentRaffleId = null;
        this.currentNotificationRaffleId = null;
        this.init();
    }

    init() {
        this.loadRaffles();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // New raffle form
        document.getElementById('newRaffleForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createRaffle();
        });

        // Draw form
        document.getElementById('drawForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.performDraw();
        });

        // Notification type change
        document.getElementById('notification_type').addEventListener('change', (e) => {
            this.loadPresetMessage();
        });
    }

    async loadRaffles() {
        try {
            this.showRafflesLoading();
            const response = await fetch('/admin/raffles');
            
            if (!response.ok) {
                throw new Error('Erro ao carregar rifas');
            }
            
            const raffles = await response.json();
            this.displayRaffles(raffles);
        } catch (error) {
            console.error('Erro ao carregar rifas:', error);
            this.showError('Erro ao carregar rifas');
        } finally {
            this.hideRafflesLoading();
        }
    }

    displayRaffles(raffles) {
        const container = document.getElementById('rafflesList');
        
        if (raffles.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    Nenhuma rifa encontrada. Crie sua primeira rifa!
                </div>
            `;
            return;
        }

        const rafflesHTML = raffles.map(raffle => this.createAdminRaffleCard(raffle)).join('');
        container.innerHTML = rafflesHTML;
    }

    createAdminRaffleCard(raffle) {
        const drawDate = new Date(raffle.draw_date).toLocaleDateString('pt-BR');
        const progress = raffle.total_numbers > 0 ? 
            Math.round((raffle.sold_numbers / raffle.total_numbers) * 100) : 0;
        
        const statusClass = raffle.status === 'active' ? 'success' : 'secondary';
        const statusText = raffle.status === 'active' ? 'Ativa' : 'Finalizada';
        
        return `
            <div class="card mb-3">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">${raffle.title}</h5>
                    <span class="badge bg-${statusClass}">${statusText}</span>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <p class="card-text">${raffle.description || 'Sem descrição'}</p>
                            <div class="row">
                                <div class="col-sm-6">
                                    <small class="text-muted">Total de números:</small>
                                    <div>${raffle.total_numbers}</div>
                                </div>
                                <div class="col-sm-6">
                                    <small class="text-muted">Preço por número:</small>
                                    <div class="text-currency">R$ ${parseFloat(raffle.price_per_number).toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="mb-2">
                                <small class="text-muted">Vendidos:</small>
                                <span class="badge bg-success">${raffle.sold_numbers}</span>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">Receita:</small>
                                <div class="text-currency">R$ ${parseFloat(raffle.total_revenue || 0).toFixed(2)}</div>
                            </div>
                            <div class="progress">
                                <div class="progress-bar" style="width: ${progress}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="btn-group w-100" role="group">
                        <button class="btn btn-outline-primary" onclick="adminApp.viewRaffleDetails(${raffle.id})">
                            <i class="fas fa-eye me-1"></i>Detalhes
                        </button>
                        <button class="btn btn-outline-info" onclick="adminApp.exportParticipants(${raffle.id})">
                            <i class="fas fa-download me-1"></i>Exportar
                        </button>
                        <button class="btn btn-outline-success" onclick="adminApp.openNotificationModal(${raffle.id})">
                            <i class="fab fa-whatsapp me-1"></i>WhatsApp
                        </button>
                        ${raffle.status === 'active' ? `
                            <button class="btn btn-outline-warning" onclick="adminApp.openDrawModal(${raffle.id})">
                                <i class="fas fa-random me-1"></i>Sortear
                            </button>
                        ` : ''}
                        <button class="btn btn-outline-danger" onclick="adminApp.deleteRaffle(${raffle.id})">
                            <i class="fas fa-trash me-1"></i>Deletar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async createRaffle() {
        try {
            const formData = {
                title: document.getElementById('title').value,
                description: document.getElementById('description').value,
                total_numbers: parseInt(document.getElementById('total_numbers').value),
                price_per_number: parseFloat(document.getElementById('price_per_number').value),
                draw_date: document.getElementById('draw_date').value
            };

            const response = await fetch('/admin/raffles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao criar rifa');
            }

            // Reset form
            document.getElementById('newRaffleForm').reset();
            
            // Switch to raffles tab
            document.getElementById('raffles-tab').click();
            
            // Reload raffles
            this.loadRaffles();
            
            this.showSuccess('Rifa criada com sucesso!');
        } catch (error) {
            console.error('Erro ao criar rifa:', error);
            this.showError(error.message);
        }
    }

    async viewRaffleDetails(raffleId) {
        try {
            const response = await fetch(`/admin/raffles/${raffleId}/participants`);
            
            if (!response.ok) {
                throw new Error('Erro ao carregar participantes');
            }
            
            const participants = await response.json();
            this.displayRaffleDetails(participants);
            
            new bootstrap.Modal(document.getElementById('raffleModal')).show();
        } catch (error) {
            console.error('Erro ao carregar detalhes:', error);
            this.showError('Erro ao carregar detalhes da rifa');
        }
    }

    displayRaffleDetails(participants) {
        const container = document.getElementById('raffleDetails');
        
        if (participants.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    Nenhum participante encontrado.
                </div>
            `;
            return;
        }

        const tableHTML = `
            <div class="table-responsive">
                <table class="table table-striped participant-table">
                    <thead>
                        <tr>
                            <th>Número</th>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>WhatsApp</th>
                            <th>Cidade</th>
                            <th>Status</th>
                            <th>Data</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${participants.map(p => `
                            <tr>
                                <td><span class="badge bg-primary">${p.number}</span></td>
                                <td>${p.name}</td>
                                <td>${p.email}</td>
                                <td>${p.phone || '-'}</td>
                                <td>${p.city || '-'}</td>
                                <td>
                                    <span class="status-badge ${p.status}">
                                        ${p.status === 'paid' ? 'Pago' : 'Reservado'}
                                    </span>
                                </td>
                                <td>${new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = tableHTML;
    }

    async exportParticipants(raffleId) {
        try {
            const response = await fetch(`/admin/raffles/${raffleId}/export`);
            
            if (!response.ok) {
                throw new Error('Erro ao exportar dados');
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rifa_${raffleId}_participantes.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.showSuccess('Dados exportados com sucesso!');
        } catch (error) {
            console.error('Erro ao exportar:', error);
            this.showError('Erro ao exportar dados');
        }
    }

    openDrawModal(raffleId) {
        this.currentRaffleId = raffleId;
        document.getElementById('lottery_number').value = '';
        new bootstrap.Modal(document.getElementById('drawModal')).show();
    }

    async performDraw() {
        try {
            const lotteryNumber = document.getElementById('lottery_number').value;
            
            const response = await fetch(`/admin/raffles/${this.currentRaffleId}/draw`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ lottery_number: lotteryNumber })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao realizar sorteio');
            }

            const result = await response.json();
            
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('drawModal')).hide();
            
            // Show result
            this.showDrawResult(result);
            
            // Reload raffles
            this.loadRaffles();
        } catch (error) {
            console.error('Erro ao realizar sorteio:', error);
            this.showError(error.message);
        }
    }

    showDrawResult(result) {
        const message = result.winner ? 
            `Sorteio realizado! Número vencedor: ${result.winner_number}. Vencedor: ${result.winner.name}` :
            `Sorteio realizado! Número vencedor: ${result.winner_number}. Nenhum comprador para este número.`;
        
        this.showSuccess(message);
    }

    async deleteRaffle(raffleId) {
        if (!confirm('Tem certeza que deseja deletar esta rifa?')) {
            return;
        }

        try {
            const response = await fetch(`/admin/raffles/${raffleId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao deletar rifa');
            }

            this.loadRaffles();
            this.showSuccess('Rifa deletada com sucesso!');
        } catch (error) {
            console.error('Erro ao deletar rifa:', error);
            this.showError(error.message);
        }
    }

    // Notification methods
    openNotificationModal(raffleId) {
        this.currentNotificationRaffleId = raffleId;
        document.getElementById('notification_filter').value = 'all';
        document.getElementById('notification_type').value = 'custom';
        document.getElementById('notification_message').value = '';
        document.getElementById('notificationResults').innerHTML = '';
        new bootstrap.Modal(document.getElementById('notificationModal')).show();
    }

    loadPresetMessage() {
        const type = document.getElementById('notification_type').value;
        const messageTextarea = document.getElementById('notification_message');
        
        const messages = {
            payment_reminder: `Olá! Você reservou um número na nossa rifa, mas ainda não finalizou o pagamento.\n\nNão perca sua chance! Complete o pagamento e garante sua participação no sorteio.\n\nQualquer dúvida, estamos aqui para ajudar!`,
            draw_reminder: `🎲 O sorteio da nossa rifa está chegando!\n\nFique atento ao resultado que será divulgado em breve.\n\nBoa sorte! 🍀`,
            winner: `🎉 Resultado da Rifa já disponível!\n\nConfira se você foi o sortudo vencedor.\n\nObrigado por participar!`
        };
        
        if (messages[type]) {
            messageTextarea.value = messages[type];
        } else {
            messageTextarea.value = '';
        }
    }

    async generateNotifications() {
        try {
            const filter = document.getElementById('notification_filter').value;
            const message = document.getElementById('notification_message').value;
            const type = document.getElementById('notification_type').value;
            
            if (!message.trim()) {
                this.showError('Por favor, digite uma mensagem');
                return;
            }
            
            let endpoint = `/api/notifications/whatsapp/bulk/${this.currentNotificationRaffleId}`;
            
            // Special handling for winner notification
            if (type === 'winner') {
                const response = await fetch(`/api/notifications/winner-message/${this.currentNotificationRaffleId}`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.winner) {
                        this.showSingleNotification(result.winner, result.message);
                        return;
                    } else {
                        this.showError('Rifa ainda não foi sorteada ou não há vencedor');
                        return;
                    }
                }
            }
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    filter: filter
                })
            });
            
            if (!response.ok) {
                throw new Error('Erro ao gerar notificações');
            }
            
            const result = await response.json();
            this.showNotificationResults(result.notifications);
            
        } catch (error) {
            console.error('Erro ao gerar notificações:', error);
            this.showError('Erro ao gerar notificações');
        }
    }

    showNotificationResults(notifications) {
        const container = document.getElementById('notificationResults');
        
        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-info-circle me-2"></i>
                    Nenhum participante com WhatsApp encontrado.
                </div>
            `;
            return;
        }
        
        const notificationsHTML = `
            <div class="alert alert-success">
                <i class="fas fa-check-circle me-2"></i>
                ${notifications.length} links de WhatsApp gerados com sucesso!
            </div>
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Número</th>
                            <th>Nome</th>
                            <th>WhatsApp</th>
                            <th>Ação</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${notifications.map(notification => `
                            <tr>
                                <td><span class="badge bg-primary">${notification.number}</span></td>
                                <td>${notification.name}</td>
                                <td>${notification.phone}</td>
                                <td>
                                    <a href="${notification.whatsapp_url}" target="_blank" class="btn btn-success btn-sm">
                                        <i class="fab fa-whatsapp me-1"></i>Enviar
                                    </a>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="mt-3">
                <button class="btn btn-primary" onclick="adminApp.openAllWhatsApp()">
                    <i class="fab fa-whatsapp me-2"></i>Abrir Todos os WhatsApp
                </button>
            </div>
        `;
        
        container.innerHTML = notificationsHTML;
        this.currentNotifications = notifications;
    }

    showSingleNotification(winner, message) {
        const container = document.getElementById('notificationResults');
        
        const phoneFormatted = winner.phone?.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/55${phoneFormatted}?text=${encodeURIComponent(message)}`;
        
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-trophy me-2"></i>
                Mensagem do vencedor gerada!
            </div>
            <div class="card">
                <div class="card-body">
                    <h6>Vencedor: ${winner.name}</h6>
                    <p><strong>Número:</strong> ${winner.number}</p>
                    <p><strong>WhatsApp:</strong> ${winner.phone}</p>
                    <div class="mt-3">
                        <a href="${whatsappUrl}" target="_blank" class="btn btn-success">
                            <i class="fab fa-whatsapp me-2"></i>Enviar Mensagem de Parabéns
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    openAllWhatsApp() {
        if (this.currentNotifications) {
            this.currentNotifications.forEach((notification, index) => {
                setTimeout(() => {
                    window.open(notification.whatsapp_url, '_blank');
                }, index * 1000); // Delay para evitar bloqueio do navegador
            });
        }
    }

    showRafflesLoading() {
        document.getElementById('rafflesLoading').classList.remove('d-none');
        document.getElementById('rafflesList').classList.add('d-none');
    }

    hideRafflesLoading() {
        document.getElementById('rafflesLoading').classList.add('d-none');
        document.getElementById('rafflesList').classList.remove('d-none');
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showAlert(message, type) {
        const alertHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // Add to top of container
        const container = document.querySelector('.container');
        container.insertAdjacentHTML('afterbegin', alertHTML);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }
}

// Global functions
async function logout() {
    try {
        const response = await fetch('/admin/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            window.location.href = '/admin/login';
        }
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    }
}

// Initialize admin app
let adminApp;
document.addEventListener('DOMContentLoaded', () => {
    adminApp = new AdminApp();
});
