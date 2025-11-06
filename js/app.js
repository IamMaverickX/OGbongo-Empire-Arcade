// Configuration
const CONFIG = {
    RPC_URL: 'https://api.mainnet-beta.solana.com',
    OGB_TOKEN_MINT: '6tVWyzNZDJNwi4Lkb5JSknLYPa9TbjJpzTcGHndBpump',
    NETWORK: 'mainnet-beta',
    PUMP_FUN_URL: 'https://pump.fun/coin/6tVWyzNZDJNwi4Lkb5JSknLYPa9TbjJpzTcGHndBpump'
};

// Game State
let gameState = {
    isConnected: false,
    publicKey: null,
    balance: 1000, // Demo balance
    tokenBalance: 0,
    spinning: false,
    connection: null,
    gameMode: 'demo', // 'demo' or 'real'
    stats: {
        totalSpins: 0,
        totalWins: 0,
        biggestWin: 0
    }
};

// Symbol constants
const SYMBOLS = ['🍒', '🍋', '🍊', '⭐', '💎'];

// DOM Elements
let connectWalletBtn, walletInfo, walletAddress, tokenBalanceEl, gameInterface;
let spinButton, betAmount, gameResult, totalSpinsEl, winRateEl, biggestWinEl;
let statusIndicator, statusText, gameModeDiv, disconnectWalletBtn;

// Initialize Game
function initGame() {
    console.log('🎰 Initializing Bongo Empire Arcade...');
    
    // Get DOM elements
    connectWalletBtn = document.getElementById('connectWallet');
    walletInfo = document.getElementById('walletInfo');
    walletAddress = document.getElementById('walletAddress');
    tokenBalanceEl = document.getElementById('tokenBalance');
    gameInterface = document.getElementById('gameInterface');
    spinButton = document.getElementById('spinButton');
    betAmount = document.getElementById('betAmount');
    gameResult = document.getElementById('gameResult');
    totalSpinsEl = document.getElementById('totalSpins');
    winRateEl = document.getElementById('winRate');
    biggestWinEl = document.getElementById('biggestWin');
    statusIndicator = document.getElementById('statusIndicator');
    statusText = document.getElementById('statusText');
    gameModeDiv = document.getElementById('gameMode');
    disconnectWalletBtn = document.getElementById('disconnectWallet');

    // Check server connection
    checkServerStatus();
    
    // Setup wallet listeners
    setupWalletListeners();
    
    // Set up event listeners
    spinButton.addEventListener('click', spinSlots);
    betAmount.addEventListener('input', validateBetAmount);
    
    if (disconnectWalletBtn) {
        disconnectWalletBtn.addEventListener('click', disconnectWallet);
    }
    
    // Load saved stats from localStorage
    loadGameStats();
    
    // Update game mode display
    updateGameModeDisplay();
    
    console.log('✅ Game initialized successfully - Starting in DEMO mode');
    
    // Show that buttons are working
    gameResult.textContent = 'Ready to play! Click SPIN to start.';
    gameResult.className = 'text-green-400';
}

// Phantom Wallet Integration
function setupWalletListeners() {
    // Check if Phantom is installed
    if (window.solana && window.solana.isPhantom) {
        console.log('✅ Phantom Wallet detected');
        
        // Listen for account changes
        window.solana.on('accountChanged', (publicKey) => {
            if (publicKey) {
                gameState.publicKey = new solanaWeb3.PublicKey(publicKey);
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
        gameState.gameMode = 'real';
        
        updateWalletUI();
        updateGameModeDisplay();
        
        console.log('✅ Wallet connected:', gameState.publicKey.toString());
        console.log('🎯 Game mode switched to: REAL');
        
        gameResult.textContent = '🚀 Connected - REAL blockchain mode active!';
        gameResult.className = 'text-green-400';
        
    } catch (err) {
        console.error('❌ Wallet connection failed:', err);
        gameResult.textContent = 'Wallet connection failed! Please try again.';
        gameResult.className = 'text-red-400';
    }
}

// Disconnect Wallet
async function disconnectWallet() {
    try {
        await window.solana.disconnect();
    } catch (error) {
        console.log('Phantom disconnect error:', error);
    }
    
    gameState.isConnected = false;
    gameState.publicKey = null;
    gameState.tokenBalance = 0;
    gameState.gameMode = 'demo';
    
    resetWalletUI();
    updateGameModeDisplay();
    
    console.log('🔌 Wallet disconnected');
    console.log('🎮 Game mode switched to: DEMO');
    
    gameResult.textContent = 'Switched to DEMO mode. Connect wallet to play with real OGB.';
    gameResult.className = 'text-blue-400';
}

// Update Game Mode Display
function updateGameModeDisplay() {
    if (gameState.gameMode === 'real') {
        gameModeDiv.className = 'text-center mb-6';
        gameModeDiv.innerHTML = `
            <div class="inline-flex items-center real-mode px-4 py-2 rounded-lg">
                <span class="mr-2">🚀</span>
                <span>REAL MODE - Playing with real OGB tokens on blockchain</span>
            </div>
        `;
    } else {
        gameModeDiv.className = 'text-center mb-6';
        gameModeDiv.innerHTML = `
            <div class="inline-flex items-center demo-mode px-4 py-2 rounded-lg">
                <span class="mr-2">🎮</span>
                <span>DEMO MODE - Connect wallet to play with real OGB tokens</span>
            </div>
        `;
    }
}

// Load Real Token Balance
async function loadTokenBalance() {
    if (!gameState.publicKey) {
        console.log('❌ Cannot load balance: Wallet not connected');
        return;
    }

    try {
        console.log('🔄 Loading OGB token balance...');
        
        if (!gameState.connection) {
            gameState.connection = new solanaWeb3.Connection(CONFIG.RPC_URL, 'confirmed');
        }
        
        // Get associated token account
        const tokenAccount = await solanaSplToken.getAssociatedTokenAddress(
            new solanaWeb3.PublicKey(CONFIG.OGB_TOKEN_MINT),
            gameState.publicKey
        );

        try {
            // Get token account info
            const accountInfo = await solanaSplToken.getAccount(gameState.connection, tokenAccount);
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
function updateWalletUI() {
    if (!gameState.publicKey) return;
    
    const shortAddress = gameState.publicKey.toString().substring(0, 4) + '...' + 
                         gameState.publicKey.toString().substring(gameState.publicKey.toString().length - 4);
    
    walletAddress.textContent = shortAddress;
    
    walletInfo.classList.remove('hidden');
    gameInterface.classList.remove('hidden');
    connectWalletBtn.classList.add('hidden');
    
    // Load token balance
    loadTokenBalance();
}

function resetWalletUI() {
    walletInfo.classList.add('hidden');
    gameInterface.classList.add('hidden');
    connectWalletBtn.classList.remove('hidden');
    connectWalletBtn.textContent = 'Connect Phantom Wallet';
    
    // Reset display
    tokenBalanceEl.textContent = '1000';
    gameState.balance = 1000;
    gameState.tokenBalance = 0;
}

// Main Spin Function
async function spinSlots() {
    if (gameState.spinning) {
        console.log('⚠️ Already spinning...');
        return;
    }
    
    const bet = parseInt(betAmount.value);
    
    if (!validateBet(bet)) return;
    
    gameState.spinning = true;
    spinButton.disabled = true;
    
    console.log('🎯 Starting spin with bet:', bet);
    
    try {
        if (gameState.gameMode === 'real') {
            await realSpinSlots(bet);
        } else {
            await demoSpinSlots(bet);
        }
    } catch (error) {
        console.error('❌ Spin error:', error);
        gameResult.textContent = '❌ Spin failed: ' + error.message;
        gameResult.className = 'text-red-400';
    }
    
    gameState.spinning = false;
    spinButton.disabled = false;
}

// Real Spin with Blockchain Transactions
async function realSpinSlots(bet) {
    gameResult.textContent = '🔄 Processing blockchain transaction...';
    gameResult.className = 'text-blue-400';

    try {
        // Send REAL spin request to backend
        const response = await fetch('/api/spin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerId: gameState.publicKey.toString(),
                betAmount: bet,
                mode: 'real'
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Blockchain transaction failed');
        }

        if (result.success) {
            // Animate the slot machine with the actual result
            await animateReelsWithResult(result.symbols);
            
            // Update REAL token balance from blockchain
            gameState.tokenBalance = result.userBalance;
            updateBalanceDisplay();
            
            // Show REAL transaction result
            if (result.winAmount > 0) {
                let winHtml = `🎉 You won ${result.winAmount} OGB! `;
                
                if (result.winTransaction && result.winTransaction.success) {
                    winHtml += `<br><a href="${result.winTransaction.explorerUrl}" target="_blank" class="text-yellow-300 underline">View win transaction</a>`;
                }
                
                if (result.betTransaction && result.betTransaction.success) {
                    winHtml += `<br><a href="${result.betTransaction.explorerUrl}" target="_blank" class="text-blue-300 underline">View bet transaction</a>`;
                }
                
                gameResult.innerHTML = winHtml;
                gameResult.className = 'text-green-400 win-glow';
                
                // Add win animation
                document.querySelectorAll('.reel').forEach(reel => {
                    reel.classList.add('win-glow');
                    setTimeout(() => reel.classList.remove('win-glow'), 3000);
                });
            } else {
                let loseHtml = 'Better luck next time!';
                if (result.betTransaction && result.betTransaction.success) {
                    loseHtml += `<br><a href="${result.betTransaction.explorerUrl}" target="_blank" class="text-blue-300 underline">View transaction</a>`;
                }
                gameResult.innerHTML = loseHtml;
                gameResult.className = 'text-red-400';
            }
            
            // Update game statistics
            updateGameStats(result.winAmount);
            
            console.log('✅ REAL Spin completed successfully');
            
        } else {
            throw new Error(result.error || 'Spin failed');
        }
        
    } catch (error) {
        console.error('❌ REAL spin failed:', error);
        gameResult.innerHTML = `❌ ${error.message}`;
        gameResult.className = 'text-red-400';
    }
}

// Demo Spin (No Blockchain)
async function demoSpinSlots(bet) {
    gameResult.textContent = '🎮 Spinning in demo mode...';
    gameResult.className = 'text-blue-400';

    try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Generate random result
        const symbols = generateSlotResult();
        const winAmount = calculateWinAmount(bet, symbols);
        
        // Update demo balance
        gameState.balance = gameState.balance - bet + winAmount;
        updateBalanceDisplay();
        
        // Animate the reels
        await animateReelsWithResult(symbols);
        
        // Show result
        if (winAmount > 0) {
            gameResult.textContent = `🎉 Demo: You won ${winAmount} OGB!`;
            gameResult.className = 'text-green-400 win-glow';
            
            // Add win animation
            document.querySelectorAll('.reel').forEach(reel => {
                reel.classList.add('win-glow');
                setTimeout(() => reel.classList.remove('win-glow'), 2000);
            });
        } else {
            gameResult.textContent = 'Demo: Better luck next time!';
            gameResult.className = 'text-red-400';
        }
        
        // Update game statistics
        updateGameStats(winAmount);
        
        console.log('✅ DEMO Spin completed successfully');
        
    } catch (error) {
        console.error('❌ DEMO spin failed:', error);
        gameResult.textContent = `❌ ${error.message}`;
        gameResult.className = 'text-red-400';
    }
}

// Generate random slot result
function generateSlotResult() {
    return [
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
    ];
}

// Calculate win amount
function calculateWinAmount(betAmount, symbols) {
    if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
        const multipliers = { '💎': 50, '⭐': 20, '🍒': 10, '🍋': 5, '🍊': 3 };
        return betAmount * (multipliers[symbols[0]] || 3);
    }
    
    if (symbols[0] === symbols[1] || symbols[1] === symbols[2] || symbols[0] === symbols[2]) {
        return betAmount * 2;
    }
    
    return 0;
}

// Animate Reels with Result
async function animateReelsWithResult(finalSymbols) {
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
    
    // Stop animation after 2 seconds and show final result
    await new Promise(resolve => setTimeout(resolve, 2000));
    clearInterval(spinInterval);
    
    // Show final symbols
    reels[0].textContent = finalSymbols[0];
    reels[1].textContent = finalSymbols[1];
    reels[2].textContent = finalSymbols[2];
    
    reels.forEach(reel => reel.classList.remove('spinning'));
}

// Validation Functions
function validateBet(bet) {
    if (isNaN(bet) || bet < 10) {
        gameResult.textContent = 'Minimum bet is 10 OGB!';
        gameResult.className = 'text-red-400';
        return false;
    }
    
    if (gameState.gameMode === 'real') {
        if (bet > gameState.tokenBalance) {
            gameResult.textContent = 'Insufficient OGB tokens! Buy more to play.';
            gameResult.className = 'text-red-400';
            return false;
        }
    } else {
        if (bet > gameState.balance) {
            gameResult.textContent = 'Insufficient demo balance!';
            gameResult.className = 'text-red-400';
            return false;
        }
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
    if (isNaN(bet) || bet < 10) betAmount.value = 10;
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
    if (gameState.gameMode === 'real') {
        tokenBalanceEl.textContent = gameState.tokenBalance.toFixed(2);
    } else {
        tokenBalanceEl.textContent = gameState.balance.toFixed(2);
    }
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

// Connect wallet button handler
connectWalletBtn.addEventListener('click', connectWallet);

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', initGame);
