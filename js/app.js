// Real Solana Web3 Integration
import { Connection, PublicKey, LAMPORTS_PER_SOL } from 'https://cdn.jsdelivr.net/npm/@solana/web3.js@1.87.6/+esm';
import { getAssociatedTokenAddress, getAccount } from 'https://cdn.jsdelivr.net/npm/@solana/spl-token@0.3.9/+esm';

// Configuration - USING YOUR ACTUAL TOKEN ADDRESS
const CONFIG = {
    RPC_URL: 'https://api.mainnet-beta.solana.com', // Mainnet since it's on Pump.fun
    OGB_TOKEN_MINT: '6tVWyzNZDJNwi4Lkb5JSknLYPa9TbjJpzTcGHndBpump',
    NETWORK: 'mainnet-beta',
    PUMP_FUN_URL: 'https://pump.fun/coin/6tVWyzNZDJNwi4Lkb5JSknLYPa9TbjJpzTcGHndBpump'
};

// Game State
let gameState = {
    isConnected: false,
    publicKey: null,
    balance: 0,
    tokenBalance: 0,
    spinning: false,
    connection: null,
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
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');

// Initialize Game
async function initGame() {
    console.log('🎰 Initializing Bongo Empire Arcade...');
    console.log('💰 Using OGB Token:', CONFIG.OGB_TOKEN_MINT);
    
    // Initialize Solana connection
    await initializeSolanaConnection();
    
    // Check server connection
    await checkServerStatus();
    
    // Setup wallet listeners
    setupWalletListeners();
    
    // Set up event listeners
    spinButton.addEventListener('click', spinSlots);
    betAmount.addEventListener('input', validateBetAmount);
    
    // Load saved stats from localStorage
    loadGameStats();
    
    console.log('✅ Game initialized successfully');
}

// Initialize Solana Connection
async function initializeSolanaConnection() {
    try {
        gameState.connection = new Connection(CONFIG.RPC_URL, 'confirmed');
        console.log('✅ Connected to Solana', CONFIG.NETWORK);
    } catch (error) {
        console.error('❌ Failed to connect to Solana:', error);
    }
}

// Real Phantom Wallet Integration
function setupWalletListeners() {
    // Check if Phantom is installed
    if (window.solana && window.solana.isPhantom) {
        console.log('✅ Phantom Wallet detected');
        
        // Listen for account changes
        window.solana.on('accountChanged', (publicKey) => {
            if (publicKey) {
                gameState.publicKey = new PublicKey(publicKey);
                updateWalletUI();
                loadTokenBalance();
            } else {
                disconnectWallet();
            }
        });
        
        // Listen for disconnect
        window.solana.on('disconnect', () => {
            disconnectWallet();
        });
        
        // Check if already connected
        if (window.solana.isConnected) {
            connectWallet();
        }
        
    } else {
        connectWalletBtn.textContent = 'Install Phantom Wallet';
        connectWalletBtn.onclick = () => window.open('https://phantom.app/', '_blank');
        console.log('❌ Phantom Wallet not installed');
    }
}

// Real Wallet Connection
async function connectWallet() {
    try {
        // Request connection from Phantom
        const response = await window.solana.connect();
        gameState.publicKey = response.publicKey;
        gameState.isConnected = true;
        
        await updateWalletUI();
        await loadTokenBalance();
        
        console.log('✅ Wallet connected:', gameState.publicKey.toString());
        
    } catch (err) {
        console.error('❌ Wallet connection failed:', err);
        gameResult.textContent = 'Wallet connection failed! Please try again.';
        gameResult.className = 'text-red-400';
    }
}

// Disconnect Wallet
function disconnectWallet() {
    gameState.isConnected = false;
    gameState.publicKey = null;
    gameState.tokenBalance = 0;
    resetWalletUI();
    console.log('🔌 Wallet disconnected');
}

// Load Real Token Balance
async function loadTokenBalance() {
    if (!gameState.publicKey || !gameState.connection) {
        console.log('❌ Cannot load balance: Wallet not connected');
        return;
    }

    try {
        console.log('🔄 Loading OGB token balance...');
        
        // Get associated token account
        const tokenAccount = await getAssociatedTokenAddress(
            new PublicKey(CONFIG.OGB_TOKEN_MINT),
            gameState.publicKey
        );

        try {
            // Get token account info
            const accountInfo = await getAccount(gameState.connection, tokenAccount);
            // Pump.fun tokens typically use 6 decimals
            gameState.tokenBalance = Number(accountInfo.amount) / Math.pow(10, 6);
            
            console.log('✅ OGB Token balance loaded:', gameState.tokenBalance, 'OGB');
        } catch (error) {
            // Token account doesn't exist (user has 0 tokens)
            gameState.tokenBalance = 0;
            console.log('ℹ️ No OGB tokens found. Buy on Pump.fun to play!');
        }
        
        updateBalanceDisplay();
        
    } catch (error) {
        console.error('❌ Error loading OGB token balance:', error);
        gameState.tokenBalance = 0;
        updateBalanceDisplay();
    }
}

// Update Wallet UI
async function updateWalletUI() {
    if (!gameState.publicKey) return;
    
    const shortAddress = gameState.publicKey.toString().substring(0, 4) + '...' + 
                         gameState.publicKey.toString().substring(gameState.publicKey.toString().length - 4);
    
    walletAddress.textContent = shortAddress;
    
    walletInfo.classList.remove('hidden');
    gameInterface.classList.remove('hidden');
    connectWalletBtn.classList.add('hidden');
    
    // Add disconnect button
    if (!document.getElementById('disconnectWallet')) {
        const disconnectBtn = document.createElement('button');
        disconnectBtn.id = 'disconnectWallet';
        disconnectBtn.className = 'bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-bold text-sm ml-4 transition-colors';
        disconnectBtn.textContent = 'Disconnect';
        disconnectBtn.onclick = disconnectWallet;
        walletInfo.appendChild(disconnectBtn);
    }
}

function resetWalletUI() {
    walletInfo.classList.add('hidden');
    gameInterface.classList.add('hidden');
    connectWalletBtn.classList.remove('hidden');
    connectWalletBtn.textContent = 'Connect Phantom Wallet';
    
    // Remove disconnect button
    const disconnectBtn = document.getElementById('disconnectWallet');
    if (disconnectBtn) {
        disconnectBtn.remove();
    }
    
    // Reset display
    tokenBalance.textContent = '0';
    gameState.tokenBalance = 0;
}

// Real Game Logic with Token Deduction
async function spinSlots() {
    if (gameState.spinning) return;
    
    const bet = parseInt(betAmount.value);
    
    if (!validateBet(bet)) return;
    
    gameState.spinning = true;
    spinButton.disabled = true;
    gameResult.textContent = 'Processing transaction...';
    gameResult.className = 'text-blue-400';
    
    try {
        // Simulate token transfer (in real implementation, this would be a blockchain transaction)
        await simulateTokenTransfer(bet);
        
        // Animate the slot machine
        await animateReels();
        
        // Calculate win
        const winAmount = calculateWin(bet);
        
        // Process the result
        await processGameResult(bet, winAmount);
        
    } catch (error) {
        console.error('❌ Spin failed:', error);
        gameResult.textContent = 'Transaction failed! Please try again.';
        gameResult.className = 'text-red-400';
        gameState.spinning = false;
        spinButton.disabled = false;
    }
}

// Simulate Token Transfer (Replace with actual blockchain transaction)
async function simulateTokenTransfer(betAmount) {
    console.log(`💸 Deducting ${betAmount} OGB tokens...`);
    
    // In a real implementation, this would be:
    // 1. Create transaction to transfer tokens to casino vault
    // 2. Sign transaction with user's wallet
    // 3. Send transaction to blockchain
    
    // For now, we simulate the deduction
    if (gameState.tokenBalance >= betAmount) {
        gameState.tokenBalance -= betAmount;
        updateBalanceDisplay();
        
        // Simulate blockchain delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return true;
    } else {
        throw new Error('Insufficient OGB token balance');
    }
}

// Simulate Token Win (Replace with actual blockchain transaction)
async function simulateTokenWin(winAmount) {
    if (winAmount > 0) {
        console.log(`🎁 Adding ${winAmount} OGB tokens as winnings...`);
        
        // In a real implementation, this would be:
        // 1. Create transaction to transfer tokens from casino vault to user
        // 2. Sign transaction with casino wallet
        // 3. Send transaction to blockchain
        
        // For now, we simulate the addition
        gameState.tokenBalance += winAmount;
        updateBalanceDisplay();
        
        // Simulate blockchain delay
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

// Calculate Win Based on Slot Result
function calculateWin(betAmount) {
    const symbols = [
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
    ];
    
    // Display the actual symbols that were "rolled"
    setTimeout(() => {
        document.getElementById('reel1').textContent = symbols[0];
        document.getElementById('reel2').textContent = symbols[1];
        document.getElementById('reel3').textContent = symbols[2];
    }, 2000);
    
    // Calculate win based on symbols
    let winMultiplier = 0;
    
    // Three of a kind
    if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
        const multipliers = { '💎': 50, '⭐': 20, '🍒': 10, '🍋': 5, '🍊': 3 };
        winMultiplier = multipliers[symbols[0]] || 3;
    }
    // Two of a kind
    else if (symbols[0] === symbols[1] || symbols[1] === symbols[2] || symbols[0] === symbols[2]) {
        winMultiplier = 2;
    }
    
    return betAmount * winMultiplier;
}

// Process Game Result
async function processGameResult(betAmount, winAmount) {
    // Add winnings if any
    await simulateTokenWin(winAmount);
    
    // Update game statistics
    updateGameStats(winAmount);
    
    // Show result to user
    if (winAmount > 0) {
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
    
    gameState.spinning = false;
    spinButton.disabled = false;
    
    // Refresh balance display
    updateBalanceDisplay();
}

// Slot Machine Animation
async function animateReels() {
    const reels = [
        document.getElementById('reel1'),
        document.getElementById('reel2'),
        document.getElementById('reel3')
    ];
    
    // Add spinning animation
    reels.forEach(reel => reel.classList.add('spinning'));
    
    // Show random symbols during spin
    const spinInterval = setInterval(() => {
        reels.forEach(reel => {
            reel.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        });
    }, 100);
    
    // Stop animation after 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    clearInterval(spinInterval);
    reels.forEach(reel => reel.classList.remove('spinning'));
}

// Validation Functions
function validateBet(bet) {
    if (bet < 10) {
        gameResult.textContent = 'Minimum bet is 10 OGB!';
        gameResult.className = 'text-red-400';
        return false;
    }
    
    if (bet > gameState.tokenBalance) {
        gameResult.textContent = 'Insufficient OGB tokens! Buy more to play.';
        gameResult.className = 'text-red-400';
        return false;
    }
    
    if (bet > 1000) {
        gameResult.textContent = 'Maximum bet is 1000 OGB!';
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
    tokenBalance.textContent = gameState.tokenBalance.toFixed(2);
}

// Check server status
async function checkServerStatus() {
    try {
        const response = await fetch('/api/health');
        if (response.ok) {
            statusIndicator.className = 'w-3 h-3 bg-green-500 rounded-full mr-2 status-connected';
            statusText.textContent = 'Server connected - Ready to play!';
        } else {
            throw new Error('Server not responding');
        }
    } catch (error) {
        statusIndicator.className = 'w-3 h-3 bg-red-500 rounded-full mr-2 status-disconnected';
        statusText.textContent = 'Server disconnected - running in standalone mode';
    }
}

// Add buy tokens section to the UI
function addBuyTokensSection() {
    const buyTokensHtml = `
        <div class="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 mt-6 text-center">
            <h3 class="text-xl font-bold mb-4">🚀 Get OGB Tokens on Pump.fun</h3>
            <p class="text-gray-200 mb-4">You need OGB tokens to play. Buy them now!</p>
            <a href="${CONFIG.PUMP_FUN_URL}" target="_blank" 
               class="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg font-bold text-lg transition-colors inline-block">
               💰 Buy OGB on Pump.fun
            </a>
            <p class="text-sm text-gray-200 mt-4">After buying, refresh and your tokens will appear automatically</p>
            <div class="mt-4 text-xs bg-black bg-opacity-30 p-3 rounded">
                <div class="font-mono">Token Address: ${CONFIG.OGB_TOKEN_MINT}</div>
            </div>
        </div>
    `;
    
    const gameContainer = document.querySelector('.container');
    gameContainer.insertAdjacentHTML('beforeend', buyTokensHtml);
}

// Connect wallet button handler
connectWalletBtn.addEventListener('click', connectWallet);

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', function() {
    initGame();
    addBuyTokensSection();
});

// Symbol constants
const SYMBOLS = ['🍒', '🍋', '🍊', '⭐', '💎'];
