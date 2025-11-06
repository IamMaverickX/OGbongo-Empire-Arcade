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

// Solana connection - MAINNET
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
        const casinoSOL = await tokenService.checkCasinoSOLBalance();
        
        res.json({ 
            status: 'Server is running!', 
            timestamp: new Date().toISOString(),
            network: 'Solana Mainnet',
            token: 'OGB',
            tokenAddress: OGB_TOKEN_MINT.toString(),
            casinoWallet: casinoWallet.getPublicKey(),
            casinoBalance: casinoBalance + ' OGB',
            casinoSOL: casinoSOL + ' SOL',
            buyUrl: 'https://pump.fun/coin/6tVWyzNZDJNwi4Lkb5JSknLYPa9TbjJpzTcGHndBpump',
            mode: 'LIVE - Real blockchain transactions'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/casino-info', async (req, res) => {
    try {
        const casinoBalance = await tokenService.getCasinoBalance();
        const casinoSOL = await tokenService.checkCasinoSOLBalance();
        
        res.json({
            casinoWallet: casinoWallet.getPublicKey(),
            casinoBalance: casinoBalance,
            casinoSOL: casinoSOL,
            tokenAddress: OGB_TOKEN_MINT.toString(),
            network: 'mainnet-beta',
            mode: 'LIVE'
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

        console.log(`🎯 REAL SPIN: ${playerId}, bet: ${betAmount} OGB`);

        // Verify user has sufficient balance
        const userBalance = await tokenService.getBalance(playerId);
        if (userBalance < betAmount) {
            return res.status(400).json({ 
                error: 'Insufficient OGB tokens',
                currentBalance: userBalance,
                required: betAmount
            });
        }

        // Check casino SOL balance for transaction fees
        const casinoSOL = await tokenService.checkCasinoSOLBalance();
        if (casinoSOL < 0.01) {
            return res.status(400).json({ 
                error: 'Casino low on SOL for transaction fees',
                currentSOL: casinoSOL,
                required: '0.01 SOL'
            });
        }

        // REAL TRANSACTION: Process the bet
        const betResult = await tokenService.placeBet(playerId, betAmount);
        
        if (!betResult.success) {
            return res.status(400).json({ 
                error: 'Bet transaction failed: ' + betResult.error
            });
        }

        // Generate game result
        const gameResult = generateGameResult(betAmount);
        
        // REAL TRANSACTION: Pay winnings if player won
        let winResult = null;
        if (gameResult.winAmount > 0) {
            winResult = await tokenService.payWinnings(playerId, gameResult.winAmount);
            
            if (!winResult.success) {
                console.error('❌ Win payment failed:', winResult.error);
                // Continue anyway, but log the error
            }
        }

        // Update game statistics
        updateGameStats(playerId, betAmount, gameResult.winAmount);

        // Get REAL updated balances from blockchain
        const newUserBalance = await tokenService.getBalance(playerId);
        const casinoBalance = await tokenService.getCasinoBalance();

        res.json({
            success: true,
            symbols: gameResult.symbols,
            betAmount: betAmount,
            winAmount: gameResult.winAmount,
            betTransaction: {
                signature: betResult.signature,
                explorerUrl: betResult.explorerUrl,
                success: true
            },
            winTransaction: winResult ? {
                signature: winResult.signature,
                explorerUrl: winResult.explorerUrl,
                success: winResult.success
            } : null,
            userBalance: newUserBalance,
            casinoBalance: casinoBalance,
            message: gameResult.winAmount > 0 ? 
                `🎉 You won ${gameResult.winAmount} OGB! (Real transaction)` : 
                'Better luck next time! (Real transaction)',
            mode: 'LIVE - Real blockchain transactions'
        });
        
    } catch (error) {
        console.error('❌ REAL Spin processing failed:', error);
        res.status(500).json({ 
            error: error.message,
            tokenAddress: OGB_TOKEN_MINT.toString()
        });
    }
});

// Add transaction history endpoint
app.get('/api/transaction/:signature', async (req, res) => {
    try {
        const signature = req.params.signature;
        const transaction = await connection.getTransaction(signature);
        
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json({
            signature: signature,
            status: transaction.meta?.err ? 'failed' : 'success',
            slot: transaction.slot,
            timestamp: transaction.blockTime ? new Date(transaction.blockTime * 1000).toISOString() : null,
            explorerUrl: `https://solscan.io/tx/${signature}?cluster=mainnet-beta`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper functions (keep the same)
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
    console.log(`🚀 MODE: LIVE - Real blockchain transactions`);
    
    // Display casino balances
    try {
        const casinoBalance = await tokenService.getCasinoBalance();
        const casinoSOL = await tokenService.checkCasinoSOLBalance();
        console.log(`🏦 Casino OGB Balance: ${casinoBalance} OGB`);
        console.log(`⛽ Casino SOL Balance: ${casinoSOL} SOL`);
        
        if (casinoSOL < 0.1) {
            console.log(`⚠️  WARNING: Casino needs more SOL for transaction fees!`);
            console.log(`💡 Send SOL to: ${casinoWallet.getPublicKey()}`);
        }
        
    } catch (error) {
        console.log('⚠️  Could not fetch casino balances');
    }
});
