// Game Configuration
const SYMBOLS = ['🍒', '🍋', '🍊', '⭐', '💎'];
const SYMBOL_MULTIPLIERS = {
    '💎💎💎': 50,
    '⭐⭐⭐': 20,
    '🍒🍒🍒': 10,
    '🍋🍋🍋': 5,
    '🍊🍊🍊': 3
};

// Game State
let gameState = {
    isConnected: false,
    balance: 0,
    spinning: false,
    stats: {
        totalSpins: 0,
        totalWins: 0,
        biggestWin: 0
    }
};

// DOM Elements
const connectWalletBtn = document.getElementById('connectWallet');
const walletInfo = document.getElementById('walletInfo');
const walletAddress = document.getElementById('walletAddress');
const tokenBalance = document.getElementById('tokenBalance');
const gameInterface = document.getElementById('gameInterface');
const spinButton = document.getElementById('spinButton');
const betAmount = document.getElementById('betAmount');
const gameResult = document.getElementById('gameResult');
const totalSpinsEl = document.getElementById('totalSpins');
const winRateEl = document.getElementById('winRate');
const biggestWinEl = document.getElementById('biggestWin');

// Initialize Game
function initGame() {
    // Check if Phantom is installed
    if (window.solana && window.solana.isPhantom) {
        setupWalletListeners();
    } else {
        connectWalletBtn.textContent = 'Install Phantom Wallet';
        connectWalletBtn.onclick = () => window.open('https://phantom.app/', '_blank');
    }

    // Set up event listeners
    spinButton.addEventListener('click', spinSlots);
    betAmount.addEventListener('input', validateBetAmount);
    
    // Load saved stats from localStorage
    loadGameStats();
}

// Phantom Wallet Integration
function setupWalletListeners() {
    window.solana.on('connect', () => {
        gameState.isConnected = true;
        updateWalletUI();
    });

    window.solana.on('disconnect', () => {
        gameState.isConnected = false;
        resetWalletUI();
    });
}

async function connectWallet() {
    try {
        const response = await window.solana.connect();
        const publicKey = response.publicKey.toString();
        
        gameState.isConnected = true;
        gameState.publicKey = publicKey;
        
        updateWalletUI();
        simulateBalanceLoad(); // In real app, this would fetch actual balance
        
    } catch (err) {
        console.error('Wallet connection failed:', err);
        gameResult.textContent = 'Wallet connection failed!';
        gameResult.className = 'text-red-400';
    }
}

function updateWalletUI() {
    const shortAddress = gameState.publicKey.substring(0, 4) + '...' + 
                         gameState.publicKey.substring(gameState.publicKey.length - 4);
    
    walletAddress.textContent = shortAddress;
    tokenBalance.textContent = gameState.balance.toFixed(2);
    
    walletInfo.classList.remove('hidden');
    gameInterface.classList.remove('hidden');
    connectWalletBtn.classList.add('hidden');
}

function resetWalletUI() {
    walletInfo.classList.add('hidden');
    gameInterface.classList.add('hidden');
    connectWalletBtn.classList.remove('hidden');
    connectWalletBtn.textContent = 'Connect Phantom Wallet';
}

// Game Logic
async function spinSlots() {
    if (gameState.spinning) return;
    
    const bet = parseInt(betAmount.value);
    
    if (!validateBet(bet)) return;
    
    gameState.spinning = true;
    spinButton.disabled = true;
    gameResult.textContent = 'Spinning...';
    gameResult.className = 'text-blue-400';
    
    // Deduct bet from balance
    gameState.balance -= bet;
    updateBalanceDisplay();
    
    // Animate reels
    await animateReels();
    
    // Generate result
    const result = generateResult();
    const winAmount = calculateWinAmount(bet, result);
    
    // Update game state
    updateGameStats(winAmount);
    
    // Show result
    if (winAmount > 0) {
        gameState.balance += winAmount;
        gameResult.textContent = `You won ${winAmount} OGB! 🎉`;
        gameResult.className = 'text-green-400 win-glow';
        
        // Add win animation to reels
        document.querySelectorAll('.reel').forEach(reel => {
            reel.classList.add('win-glow');
            setTimeout(() => reel.classList.remove('win-glow'), 2000);
        });
    } else {
        gameResult.textContent = 'No win this time. Try again!';
        gameResult.className = 'text-red-400';
    }
    
    updateBalanceDisplay();
    gameState.spinning = false;
    spinButton.disabled = false;
}

function validateBet(bet) {
    if (bet < 10) {
        gameResult.textContent = 'Minimum bet is 10 OGB!';
        gameResult.className = 'text-red-400';
        return false;
    }
    
    if (bet > gameState.balance) {
        gameResult.textContent = 'Insufficient balance!';
        gameResult.className = 'text-red-400';
        return false;
    }
    
    return true;
}

function validateBetAmount() {
    const bet = parseInt(betAmount.value);
    if (bet < 10) betAmount.value = 10;
    if (bet > 1000) betAmount.value = 1000;
}

async function animateReels() {
    const reels = [
        document.getElementById('reel1'),
        document.getElementById('reel2'),
        document.getElementById('reel3')
    ];
    
    // Add spinning animation
    reels.forEach(reel => reel.classList.add('spinning'));
    
    // Stop reels sequentially
    await stopReel(reels[0], 1000);
    await stopReel(reels[1], 1500);
    await stopReel(reels[2], 2000);
}

async function stopReel(reel, delay) {
    return new Promise(resolve => {
        setTimeout(() => {
            const randomSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            reel.textContent = randomSymbol;
            reel.classList.remove('spinning');
            resolve();
        }, delay);
    });
}

function generateResult() {
    return [
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
    ];
}

function calculateWinAmount(bet, result) {
    const resultString = result.join('');
    
    // Check for three of a kind
    if (result[0] === result[1] && result[1] === result[2]) {
        return bet * (SYMBOL_MULTIPLIERS[resultString] || 3);
    }
    
    // Check for two of a kind
    if (result[0] === result[1] || result[1] === result[2] || result[0] === result[2]) {
        return bet * 2;
    }
    
    return 0;
}

// Game Statistics
function updateGameStats(winAmount) {
    gameState.stats.totalSpins++;
    
    if (winAmount > 0) {
        gameState.stats.totalWins++;
    }
    
    if (winAmount > gameState.stats.biggestWin) {
        gameState.stats.biggestWin = winAmount;
    }
    
    updateStatsDisplay();
    saveGameStats();
}

function updateStatsDisplay() {
    totalSpinsEl.textContent = gameState.stats.totalSpins;
    
    const winRate = gameState.stats.totalSpins > 0 ? 
        Math.round((gameState.stats.totalWins / gameState.stats.totalSpins) * 100) : 0;
    winRateEl.textContent = `${winRate}%`;
    
    biggestWinEl.textContent = gameState.stats.biggestWin;
}

function loadGameStats() {
    const savedStats = localStorage.getItem('bongoCasinoStats');
    if (savedStats) {
        gameState.stats = JSON.parse(savedStats);
        updateStatsDisplay();
    }
}

function saveGameStats() {
    localStorage.setItem('bongoCasinoStats', JSON.stringify(gameState.stats));
}

function updateBalanceDisplay() {
    tokenBalance.textContent = gameState.balance.toFixed(2);
}

function simulateBalanceLoad() {
    // Simulate loading balance (replace with actual blockchain call)
    gameState.balance = 1000;
    updateBalanceDisplay();
}

// Connect wallet button handler
connectWalletBtn.addEventListener('click', connectWallet);

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', initGame);
