// Raffle page JavaScript

class RafflePage {
    constructor() {
        this.raffleId = null;
        this.raffle = null;
        this.participants = [];
        this.currentPage = 1;
        this.numbersPerPage = 100;
        this.selectedNumber = null;
        this.currentPaymentId = null;
        this.init();
    }

    init() {
        this.raffleId = this.getRaffleIdFromUrl();
        if (!this.raffleId) {
            this.showError('ID da rifa não encontrado');
            return;
        }
        
        this.loadRaffle();
        this.setupEventListeners();
    }

    getRaffleIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    setupEventListeners() {
        // Purchase form
        document.getElementById('purchaseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.purchaseNumber();
        });

        // Search number
        document.getElementById('searchNumber').addEventListener('input', (e) => {
            this.searchNumber(e.target.value);
        });

        // Status filter
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filterNumbers(e.target.value);
        });
    }

    async loadRaffle() {
        try {
            this.showLoading();
            
            const response = await fetch(`/api/raffles/${this.raffleId}`);
            
            if (!response.ok) {
                throw new Error('Rifa não encontrada');
            }
            
            this.raffle = await response.json();
            this.displayRaffle();
            this.loadNumbers();
        } catch (error) {
            console.error('Erro ao carregar rifa:', error);
            this.showError('Erro ao carregar rifa. Verifique se o ID está correto.');
        } finally {
            this.hideLoading();
        }
    }

    displayRaffle() {
        document.getElementById('raffleTitle').textContent = this.raffle.title;
        document.getElementById('raffleDescription').textContent = this.raffle.description || 'Sem descrição';
        document.getElementById('rafflePrice').textContent = `R$ ${parseFloat(this.raffle.price_per_number).toFixed(2)}`;
        document.getElementById('totalNumbers').textContent = this.raffle.total_numbers;
        document.getElementById('drawDate').textContent = new Date(this.raffle.draw_date).toLocaleDateString('pt-BR');
        
        const soldCount = this.raffle.sold_numbers ? this.raffle.sold_numbers.length : 0;
        const availableCount = this.raffle.total_numbers - soldCount;
        const progress = Math.round((soldCount / this.raffle.total_numbers) * 100);
        
        document.getElementById('soldCount').textContent = soldCount;
        document.getElementById('availableCount').textContent = availableCount;
        document.getElementById('progressBar').style.width = `${progress}%`;
        
        // Check if raffle is completed
        if (this.raffle.status === 'completed' && this.raffle.winner_number) {
            this.showWinner();
        }
        
        document.getElementById('raffleContent').classList.remove('d-none');
    }

    showWinner() {
        const winnerSection = document.getElementById('winnerSection');
        const winnerInfo = document.getElementById('winnerInfo');
        
        winnerInfo.innerHTML = `
            <div class="text-center">
                <h3>Número Vencedor: <span class="winner-number">${this.raffle.winner_number}</span></h3>
                <p>Baseado no número da Loteria Federal: <strong>${this.raffle.lottery_number}</strong></p>
                ${this.raffle.winner_name ? `
                    <div class="mt-3">
                        <h5>Parabéns!</h5>
                        <p>Vencedor: <strong>${this.raffle.winner_name}</strong></p>
                    </div>
                ` : `
                    <div class="alert alert-warning">
                        <i class="fas fa-info-circle me-2"></i>
                        Número vencedor não foi comprado por nenhum participante.
                    </div>
                `}
            </div>
        `;
        
        winnerSection.classList.remove('d-none');
    }

    loadNumbers() {
        const container = document.getElementById('numbersGrid');
        const startNumber = ((this.currentPage - 1) * this.numbersPerPage) + 1;
        const endNumber = Math.min(startNumber + this.numbersPerPage - 1, this.raffle.total_numbers);
        
        let numbersHTML = '';
        for (let i = startNumber; i <= endNumber; i++) {
            const isSold = this.raffle.sold_numbers && this.raffle.sold_numbers.includes(i);
            const numberClass = isSold ? 'sold' : 'available';
            
            numbersHTML += `
                <div class="number-cell ${numberClass}" 
                     data-number="${i}" 
                     ${!isSold ? `onclick="raffleApp.selectNumber(${i})"` : ''}>
                    ${i}
                </div>
            `;
        }
        
        if (this.currentPage === 1) {
            container.innerHTML = numbersHTML;
        } else {
            container.innerHTML += numbersHTML;
        }
    }

    selectNumber(number) {
        // Remove previous selection
        document.querySelectorAll('.number-cell').forEach(cell => {
            cell.classList.remove('selected');
        });
        
        // Add selection to clicked number
        const numberCell = document.querySelector(`[data-number="${number}"]`);
        numberCell.classList.add('selected');
        
        this.selectedNumber = number;
        
        // Open purchase modal
        this.openPurchaseModal(number);
    }

    openPurchaseModal(number) {
        document.getElementById('selectedNumber').value = number;
        document.getElementById('paymentAmount').textContent = `R$ ${parseFloat(this.raffle.price_per_number).toFixed(2)}`;
        document.getElementById('buyerName').value = '';
        document.getElementById('buyerEmail').value = '';
        document.getElementById('buyerPhone').value = '';
        document.getElementById('buyerCity').value = '';
        
        new bootstrap.Modal(document.getElementById('purchaseModal')).show();
    }

    async purchaseNumber() {
        try {
            const formData = {
                number: parseInt(document.getElementById('selectedNumber').value),
                name: document.getElementById('buyerName').value,
                email: document.getElementById('buyerEmail').value,
                phone: document.getElementById('buyerPhone').value,
                city: document.getElementById('buyerCity').value
            };

            // Reserve number
            const reserveResponse = await fetch(`/api/raffles/${this.raffleId}/reserve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!reserveResponse.ok) {
                const error = await reserveResponse.json();
                throw new Error(error.error || 'Erro ao reservar número');
            }

            const reserveResult = await reserveResponse.json();
            
            // Close purchase modal
            bootstrap.Modal.getInstance(document.getElementById('purchaseModal')).hide();
            
            // Create payment
            await this.createPayment(reserveResult.participant_id);
            
        } catch (error) {
            console.error('Erro ao comprar número:', error);
            this.showError(error.message);
        }
    }

    async createPayment(participantId) {
        try {
            const response = await fetch('/api/payments/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ participant_id: participantId })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao criar pagamento');
            }

            const paymentResult = await response.json();
            this.currentPaymentId = paymentResult.payment_id;
            
            // Show payment modal
            this.showPaymentModal(paymentResult);
            
        } catch (error) {
            console.error('Erro ao criar pagamento:', error);
            this.showError(error.message);
        }
    }

    showPaymentModal(paymentData) {
        const qrContainer = document.getElementById('qrCodeContainer');
        
        if (paymentData.qr_code) {
            qrContainer.innerHTML = `
                <div class="qr-code-container">
                    <img src="${paymentData.qr_code}" alt="QR Code PIX" class="img-fluid">
                </div>
                <p class="text-muted">Ou copie o código PIX abaixo:</p>
                <div class="input-group">
                    <input type="text" class="form-control" value="${paymentData.qr_code}" readonly>
                    <button class="btn btn-outline-secondary" onclick="copyToClipboard('${paymentData.qr_code}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            `;
        } else {
            qrContainer.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    QR Code será gerado em breve...
                </div>
            `;
        }
        
        new bootstrap.Modal(document.getElementById('paymentModal')).show();
    }

    async checkPaymentStatus() {
        if (!this.currentPaymentId) {
            return;
        }

        try {
            const response = await fetch(`/api/payments/${this.currentPaymentId}/status`);
            
            if (!response.ok) {
                throw new Error('Erro ao verificar pagamento');
            }
            
            const result = await response.json();
            
            if (result.approved) {
                this.showPaymentSuccess();
                this.loadRaffle(); // Reload to update numbers
            } else {
                this.showPaymentPending();
            }
        } catch (error) {
            console.error('Erro ao verificar pagamento:', error);
            this.showError('Erro ao verificar pagamento');
        }
    }

    async simulatePayment() {
        if (!this.currentPaymentId) {
            return;
        }

        try {
            const response = await fetch('/api/payments/simulate-approval', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ payment_id: this.currentPaymentId })
            });

            if (!response.ok) {
                throw new Error('Erro ao simular pagamento');
            }

            this.showPaymentSuccess();
            this.loadRaffle(); // Reload to update numbers
        } catch (error) {
            console.error('Erro ao simular pagamento:', error);
            this.showError('Erro ao simular pagamento');
        }
    }

    showPaymentSuccess() {
        const statusDiv = document.getElementById('paymentStatus');
        statusDiv.innerHTML = `
            <div class="alert alert-success">
                <i class="fas fa-check-circle me-2"></i>
                Pagamento aprovado! Seu número foi confirmado.
            </div>
        `;
        
        setTimeout(() => {
            bootstrap.Modal.getInstance(document.getElementById('paymentModal')).hide();
        }, 3000);
    }

    showPaymentPending() {
        const statusDiv = document.getElementById('paymentStatus');
        statusDiv.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-clock me-2"></i>
                Pagamento ainda pendente. Aguarde alguns minutos e tente novamente.
            </div>
        `;
    }

    searchNumber(numberStr) {
        const number = parseInt(numberStr);
        if (!number || number < 1 || number > this.raffle.total_numbers) {
            this.loadNumbers();
            return;
        }

        const container = document.getElementById('numbersGrid');
        const isSold = this.raffle.sold_numbers && this.raffle.sold_numbers.includes(number);
        const numberClass = isSold ? 'sold' : 'available';
        
        container.innerHTML = `
            <div class="number-cell ${numberClass}" 
                 data-number="${number}" 
                 ${!isSold ? `onclick="raffleApp.selectNumber(${number})"` : ''}>
                ${number}
            </div>
        `;
    }

    filterNumbers(status) {
        // This is a simplified filter - in a real app, you'd want server-side filtering
        const cells = document.querySelectorAll('.number-cell');
        cells.forEach(cell => {
            const isSold = cell.classList.contains('sold');
            const isAvailable = cell.classList.contains('available');
            
            switch (status) {
                case 'available':
                    cell.style.display = isAvailable ? 'flex' : 'none';
                    break;
                case 'sold':
                    cell.style.display = isSold ? 'flex' : 'none';
                    break;
                default:
                    cell.style.display = 'flex';
                    break;
            }
        });
    }

    showLoading() {
        document.getElementById('loading').classList.remove('d-none');
        document.getElementById('raffleContent').classList.add('d-none');
    }

    hideLoading() {
        document.getElementById('loading').classList.add('d-none');
    }

    showError(message) {
        document.getElementById('loading').classList.add('d-none');
        document.getElementById('raffleContent').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                ${message}
            </div>
        `;
        document.getElementById('raffleContent').classList.remove('d-none');
    }
}

// Global functions
function loadMoreNumbers() {
    raffleApp.currentPage++;
    raffleApp.loadNumbers();
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Código PIX copiado para a área de transferência!');
    });
}

// Initialize raffle app
let raffleApp;
document.addEventListener('DOMContentLoaded', () => {
    raffleApp = new RafflePage();
});
