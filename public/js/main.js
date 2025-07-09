// Main JavaScript for the public site

class RaffleApp {
    constructor() {
        this.raffles = [];
        this.init();
    }

    init() {
        this.loadRaffles();
    }

    async loadRaffles() {
        try {
            this.showLoading();
            const response = await fetch('/api/raffles');
            
            if (!response.ok) {
                throw new Error('Erro ao carregar rifas');
            }
            
            this.raffles = await response.json();
            this.displayRaffles();
        } catch (error) {
            console.error('Erro ao carregar rifas:', error);
            this.showError('Erro ao carregar rifas. Tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    displayRaffles() {
        const container = document.getElementById('raffles-container');
        
        if (this.raffles.length === 0) {
            document.getElementById('no-raffles').classList.remove('d-none');
            return;
        }

        const rafflesHTML = this.raffles.map(raffle => this.createRaffleCard(raffle)).join('');
        container.innerHTML = rafflesHTML;
    }

    createRaffleCard(raffle) {
        const drawDate = new Date(raffle.draw_date).toLocaleDateString('pt-BR');
        const progress = raffle.total_numbers > 0 ? 
            Math.round((raffle.sold_numbers / raffle.total_numbers) * 100) : 0;
        
        const statusClass = raffle.status === 'active' ? 'success' : 'secondary';
        const statusText = raffle.status === 'active' ? 'Ativa' : 'Finalizada';
        
        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card raffle-card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">${raffle.title}</h5>
                        <span class="badge bg-${statusClass}">${statusText}</span>
                    </div>
                    <div class="card-body">
                        <p class="card-text">${raffle.description || 'Sem descrição'}</p>
                        <div class="mb-3">
                            <div class="d-flex justify-content-between mb-1">
                                <span>Progresso:</span>
                                <span>${raffle.sold_numbers}/${raffle.total_numbers}</span>
                            </div>
                            <div class="progress">
                                <div class="progress-bar" style="width: ${progress}%"></div>
                            </div>
                        </div>
                        <div class="row text-center">
                            <div class="col-6">
                                <small class="text-muted">Preço</small>
                                <div class="text-currency">R$ ${parseFloat(raffle.price_per_number).toFixed(2)}</div>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Sorteio</small>
                                <div>${drawDate}</div>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-primary w-100" onclick="viewRaffle(${raffle.id})">
                            <i class="fas fa-eye me-2"></i>Ver Rifa
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    showLoading() {
        document.getElementById('loading').classList.remove('d-none');
        document.getElementById('raffles-container').classList.add('d-none');
        document.getElementById('no-raffles').classList.add('d-none');
    }

    hideLoading() {
        document.getElementById('loading').classList.add('d-none');
        document.getElementById('raffles-container').classList.remove('d-none');
    }

    showError(message) {
        const container = document.getElementById('raffles-container');
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    ${message}
                </div>
            </div>
        `;
    }
}

// Global functions
function viewRaffle(raffleId) {
    window.location.href = `/raffle.html?id=${raffleId}`;
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RaffleApp();
});
