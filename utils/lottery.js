class LotteryUtils {
    /**
     * Calculate winner number based on lottery federal number
     * @param {string} lotteryNumber - Number from federal lottery
     * @param {number} totalNumbers - Total numbers in raffle
     * @returns {number} Winner number
     */
    calculateWinnerNumber(lotteryNumber, totalNumbers) {
        // Remove any non-numeric characters
        const cleanNumber = lotteryNumber.toString().replace(/\D/g, '');
        
        if (!cleanNumber || cleanNumber.length === 0) {
            throw new Error('Número da loteria inválido');
        }

        // Use different methods based on total numbers
        if (totalNumbers <= 100) {
            // For small raffles, use last 2 digits
            const lastTwoDigits = parseInt(cleanNumber.slice(-2));
            return lastTwoDigits === 0 ? 100 : lastTwoDigits > totalNumbers ? lastTwoDigits % totalNumbers : lastTwoDigits;
        } else if (totalNumbers <= 1000) {
            // For medium raffles, use last 3 digits
            const lastThreeDigits = parseInt(cleanNumber.slice(-3));
            return lastThreeDigits === 0 ? 1000 : lastThreeDigits > totalNumbers ? lastThreeDigits % totalNumbers : lastThreeDigits;
        } else {
            // For large raffles, use last 4 digits
            const lastFourDigits = parseInt(cleanNumber.slice(-4));
            return lastFourDigits === 0 ? 10000 : lastFourDigits > totalNumbers ? lastFourDigits % totalNumbers : lastFourDigits;
        }
    }

    /**
     * Validate lottery number format
     * @param {string} lotteryNumber - Number to validate
     * @returns {boolean} Is valid
     */
    validateLotteryNumber(lotteryNumber) {
        const cleanNumber = lotteryNumber.toString().replace(/\D/g, '');
        return cleanNumber.length >= 4 && cleanNumber.length <= 6;
    }

    /**
     * Generate explanation for winner calculation
     * @param {string} lotteryNumber - Original lottery number
     * @param {number} winnerNumber - Calculated winner number
     * @param {number} totalNumbers - Total numbers in raffle
     * @returns {string} Explanation
     */
    getWinnerExplanation(lotteryNumber, winnerNumber, totalNumbers) {
        const cleanNumber = lotteryNumber.toString().replace(/\D/g, '');
        
        if (totalNumbers <= 100) {
            const lastTwoDigits = parseInt(cleanNumber.slice(-2));
            return `Últimos 2 dígitos do número ${cleanNumber}: ${lastTwoDigits.toString().padStart(2, '0')}. Número vencedor: ${winnerNumber}`;
        } else if (totalNumbers <= 1000) {
            const lastThreeDigits = parseInt(cleanNumber.slice(-3));
            return `Últimos 3 dígitos do número ${cleanNumber}: ${lastThreeDigits.toString().padStart(3, '0')}. Número vencedor: ${winnerNumber}`;
        } else {
            const lastFourDigits = parseInt(cleanNumber.slice(-4));
            return `Últimos 4 dígitos do número ${cleanNumber}: ${lastFourDigits.toString().padStart(4, '0')}. Número vencedor: ${winnerNumber}`;
        }
    }

    /**
     * Get next lottery draw date (usually Wednesday and Saturday)
     * @returns {Date} Next draw date
     */
    getNextDrawDate() {
        const today = new Date();
        const nextWednesday = new Date(today);
        const nextSaturday = new Date(today);
        
        // Calculate next Wednesday
        const daysUntilWednesday = (3 - today.getDay() + 7) % 7;
        nextWednesday.setDate(today.getDate() + (daysUntilWednesday || 7));
        
        // Calculate next Saturday
        const daysUntilSaturday = (6 - today.getDay() + 7) % 7;
        nextSaturday.setDate(today.getDate() + (daysUntilSaturday || 7));
        
        // Return the nearest date
        return nextWednesday < nextSaturday ? nextWednesday : nextSaturday;
    }

    /**
     * Format lottery number for display
     * @param {string} lotteryNumber - Raw lottery number
     * @returns {string} Formatted number
     */
    formatLotteryNumber(lotteryNumber) {
        const cleanNumber = lotteryNumber.toString().replace(/\D/g, '');
        
        if (cleanNumber.length === 5) {
            return cleanNumber.replace(/(\d{2})(\d{3})/, '$1.$2');
        } else if (cleanNumber.length === 6) {
            return cleanNumber.replace(/(\d{3})(\d{3})/, '$1.$2');
        }
        
        return cleanNumber;
    }
}

module.exports = new LotteryUtils();
