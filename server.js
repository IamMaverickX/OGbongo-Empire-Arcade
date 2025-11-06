import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress, getAccount, createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';

class TokenService {
    constructor(connection, tokenMint, casinoWallet) {
        this.connection = connection;
        this.tokenMint = new PublicKey(tokenMint);
        this.casinoWallet = casinoWallet;
    }

    // Get or create associated token account
    async getOrCreateAssociatedTokenAccount(owner, payer) {
        const associatedToken = getAssociatedTokenAddressSync(this.tokenMint, owner);

        try {
            await getAccount(this.connection, associatedToken);
            return associatedToken;
        } catch (error) {
            console.log('🆕 Creating associated token account for:', owner.toString());
            const transaction = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    payer.publicKey,
                    associatedToken,
                    owner,
                    this.tokenMint
                )
            );

            const signature = await sendAndConfirmTransaction(this.connection, transaction, [payer]);
            console.log('✅ Token account created:', signature);
            return associatedToken;
        }
    }

    // REAL TRANSFER: Transfer tokens between accounts
    async transferTokens(fromOwner, toOwner, amount, payer) {
        try {
            console.log(`💸 REAL TRANSFER: ${amount} OGB from ${fromOwner.toString()} to ${toOwner.toString()}`);
            
            const fromTokenAccount = await this.getOrCreateAssociatedTokenAccount(fromOwner, payer);
            const toTokenAccount = await this.getOrCreateAssociatedTokenAccount(toOwner, payer);

            // Convert amount to lamports (6 decimals for Pump.fun tokens)
            const amountInLamports = Math.round(amount * Math.pow(10, 6));

            const transaction = new Transaction().add(
                createTransferInstruction(
                    fromTokenAccount,
                    toTokenAccount,
                    fromOwner,
                    amountInLamports
                )
            );

            const signature = await sendAndConfirmTransaction(this.connection, transaction, [payer]);
            console.log('✅ REAL Transfer successful:', signature);
            
            return signature;
        } catch (error) {
            console.error('❌ REAL Transfer failed:', error);
            throw new Error(`Transfer failed: ${error.message}`);
        }
    }

    // REAL BET: Player transfers tokens to casino
    async placeBet(playerPublicKey, amount) {
        const playerKey = new PublicKey(playerPublicKey);
        const casinoKey = this.casinoWallet.getKeypair();

        console.log(`🎯 REAL BET: Player ${playerPublicKey} betting ${amount} OGB`);

        try {
            const signature = await this.transferTokens(
                playerKey,
                casinoKey.publicKey,
                amount,
                casinoKey // Casino pays transaction fee
            );

            return {
                success: true,
                signature: signature,
                amount: amount,
                from: playerPublicKey,
                to: casinoKey.publicKey.toString(),
                explorerUrl: `https://solscan.io/tx/${signature}?cluster=mainnet-beta`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                amount: amount
            };
        }
    }

    // REAL WIN: Casino pays winnings to player
    async payWinnings(playerPublicKey, amount) {
        const playerKey = new PublicKey(playerPublicKey);
        const casinoKey = this.casinoWallet.getKeypair();

        console.log(`💰 REAL WIN: Paying ${amount} OGB to ${playerPublicKey}`);

        try {
            const signature = await this.transferTokens(
                casinoKey.publicKey,
                playerKey,
                amount,
                casinoKey
            );

            return {
                success: true,
                signature: signature,
                amount: amount,
                from: casinoKey.publicKey.toString(),
                to: playerPublicKey,
                explorerUrl: `https://solscan.io/tx/${signature}?cluster=mainnet-beta`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                amount: amount
            };
        }
    }

    // Get REAL token balance from blockchain
    async getBalance(publicKey) {
        try {
            const tokenAccount = await getAssociatedTokenAddress(this.tokenMint, new PublicKey(publicKey));
            const accountInfo = await getAccount(this.connection, tokenAccount);
            const balance = Number(accountInfo.amount) / Math.pow(10, 6);
            console.log(`💰 REAL Balance for ${publicKey}: ${balance} OGB`);
            return balance;
        } catch (error) {
            console.log(`💰 REAL Balance for ${publicKey}: 0 OGB (no token account)`);
            return 0;
        }
    }

    // Get REAL casino balance
    async getCasinoBalance() {
        return await this.getBalance(this.casinoWallet.getPublicKey());
    }

    // Check if casino has enough SOL for transaction fees
    async checkCasinoSOLBalance() {
        try {
            const balance = await this.connection.getBalance(this.casinoWallet.getKeypair().publicKey);
            const solBalance = balance / 1e9;
            console.log(`⛽ Casino SOL balance: ${solBalance} SOL`);
            return solBalance;
        } catch (error) {
            console.error('❌ Error checking SOL balance:', error);
            return 0;
        }
    }
}

export default TokenService;
