import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Connection, PublicKey } from '@solana/web3.js';
import CasinoWallet from './casino-wallet.js';
import TokenService from './token-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const OGB_TOKEN_MINT = new PublicKey('6tVWyzNZDJNwi4Lkb5JSknLYPa9TbjJpzTcGHndBpump');

// Initialize casino wallet and token service
const casinoWallet = new CasinoWallet();
const tokenService = new TokenService(connection, OGB_TOKEN_MINT, casinoWallet);

console.log('🎰 Casino Wallet Address:', casinoWallet.getPublicKey());

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Game statistics storage
const gameStats = new Map();

// API Routes
app.get('/api/health', async (req, res) => {
    try {
        const casinoBalance = await tokenService.getCasinoBalance();
        
        res.json({ 
            status: 'Server is running!', 
            timestamp: new Date().toISOString(),
            network: 'Solana Mainnet',
            token: 'OGB',
            tokenAddress: OGB_TOKEN_MINT.toString(),
            casinoWallet: casinoWallet.getPublicKey(),
            casinoBalance: casinoBalance + ' OGB',
            buyUrl: 'https://pump.fun/coin/6tVWyzNZDJNwi4Lkb5JSknLYPa9TbjJpzTcGHndBpump',
            mode: 'SIMULATION - No real transactions yet'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/casino-info', async (req, res) => {
    try {
        const casinoBalance = await tokenService.getCasinoBalance();
        
        res.json({
            casinoWallet: casinoWallet.getPublicKey(),
            casinoBalance: casinoBalance,
            tokenAddress: OGB_TOKEN_MINT.toString(),
            network: 'mainnet-beta',
            mode: 'SIMULATION'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/spin', async (req, res) => {
    try {
        const { playerId, betAmount } = req.body;
        
        if (!playerId || !betAmount) {
            return res.status(400).json({ 
                error: 'Player ID and bet amount required' 
            });
        }

        console.log(`🎯 Processing spin for ${playerId}, bet: ${betAmount} OGB`);

        // Verify user has sufficient balance
        const userBalance = await tokenService.getBalance(playerId);
        if (userBalance < betAmount) {
            return res.status(400).json({ 
                error: 'Insufficient OGB tokens',
                currentBalance: userBalance,
                required: betAmount
            });
        }

        // Process the bet (SIMULATION MODE)
        const betResult = await tokenService.placeBet(playerId, betAmount);
        
        // Generate game result
        const gameResult = generateGameResult(betAmount);
        
        // Pay winnings if player won (SIMULATION MODE)
        let winResult = null;
        if (gameResult.winAmount > 0) {
            winResult = await tokenService.payWinnings(playerId, gameResult.winAmount);
        }

        // Update game statistics
        updateGameStats(playerId, betAmount, gameResult.winAmount);

        // Get updated balances
        const newUserBalance = userBalance - betAmount + gameResult.winAmount; // Simulated balance change
        const casinoBalance = await tokenService.getCasinoBalance();

        res.json({
            success: true,
            symbols: gameResult.symbols,
            betAmount: betAmount,
            winAmount: gameResult.winAmount,
            betTransaction: betResult.signature,
            winTransaction: winResult?.signature || null,
            userBalance: newUserBalance,
            casinoBalance: casinoBalance,
            message: gameResult.winAmount > 0 ? 
                `You won ${gameResult.winAmount} OGB! 🎉 (SIMULATION)` : 
                'Better luck next time! (SIMULATION)',
            mode: 'SIMULATION - No real tokens moved'
        });
        
    } catch (error) {
        console.error('❌ Spin processing failed:', error);
        res.status(500).json({ 
            error: error.message,
            tokenAddress: OGB_TOKEN_MINT.toString()
        });
    }
});

// Helper functions
function generateGameResult(betAmount) {
    const symbols = generateSlotResult();
    const winAmount = calculateWinAmount(betAmount, symbols);
    
    return {
        symbols: symbols,
        winAmount: winAmount
    };
}

function generateSlotResult() {
    const symbols = ['🍒', '🍋', '🍊', '⭐', '💎'];
    return [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
    ];
}

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

function updateGameStats(playerId, betAmount, winAmount) {
    const stats = gameStats.get(playerId) || {
        totalSpins: 0,
        totalWagered: 0,
        totalWon: 0,
        biggestWin: 0
    };
    
    stats.totalSpins++;
    stats.totalWagered += betAmount;
    stats.totalWon += winAmount;
    
    if (winAmount > stats.biggestWin) {
        stats.biggestWin = winAmount;
    }
    
    gameStats.set(playerId, stats);
    console.log(`📊 Updated stats for ${playerId}: ${stats.totalSpins} spins, ${stats.totalWon} OGB won`);
}

// Start server
app.listen(PORT, async () => {
    console.log(`🎰 Bongo Empire Arcade Server running!`);
    console.log(`📍 Frontend: http://localhost:${PORT}`);
    console.log(`🔧 Backend API: http://localhost:${PORT}/api`);
    console.log(`💰 Casino Wallet: ${casinoWallet.getPublicKey()}`);
    console.log(`🎯 OGB Token: ${OGB_TOKEN_MINT.toString()}`);
    console.log(`🛒 Buy OGB: https://pump.fun/coin/6tVWyzNZDJNwi4Lkb5JSknLYPa9TbjJpzTcGHndBpump`);
    console.log(`🌐 Network: Solana Mainnet`);
    console.log(`⚠️  MODE: SIMULATION - No real transactions`);
    
    // Display casino balance
    try {
        const casinoBalance = await tokenService.getCasinoBalance();
        console.log(`🏦 Casino Balance: ${casinoBalance} OGB`);
    } catch (error) {
        console.log('⚠️  Could not fetch casino balance');
    }
    
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Fund your casino wallet with OGB tokens for real transactions');
    console.log('2. Update token-service.js with real transaction logic');
    console.log('3. Add proper transaction signing');
});
