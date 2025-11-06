import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress, getAccount, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

class TokenService {
    constructor(connection, tokenMint, casinoWallet) {
        this.connection = connection;
        this.tokenMint = new PublicKey(tokenMint);
        this.casinoWallet = casinoWallet;
    }

    async getOrCreateAssociatedTokenAccount(owner, payer) {
        const associatedToken = await getAssociatedTokenAddress(this.tokenMint, owner);

        try {
            await getAccount(this.connection, associatedToken);
            return associatedToken;
        } catch (error) {
            console.log('Creating associated token account for:', owner.toString());
            const transaction = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    payer.publicKey,
                    associatedToken,
                    owner,
                    this.tokenMint
                )
            );

            // For now, we'll just return the address without creating
            // In production, you'd need SOL for transaction fees
            return associatedToken;
        }
    }

    async transferTokens(fromOwner, toOwner, amount) {
        try {
            console.log(`💸 Simulating transfer: ${amount} OGB from ${fromOwner.toString()} to ${toOwner.toString()}`);
            
            // In a real implementation, this would create and send an actual transaction
            // For now, we'll simulate it and return a fake signature
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const fakeSignature = 'sim_' + Date.now() + Math.random().toString(36).substr(2, 9);
            
            console.log('✅ Transfer simulated successfully');
            return fakeSignature;
        } catch (error) {
            console.error('❌ Transfer failed:', error);
            throw error;
        }
    }

    async placeBet(playerPublicKey, amount) {
        const playerKey = new PublicKey(playerPublicKey);
        const casinoKey = this.casinoWallet.getKeypair();

        console.log(`🎯 Player ${playerPublicKey} placing bet: ${amount} OGB`);

        const signature = await this.transferTokens(
            playerKey,
            casinoKey.publicKey,
            amount
        );

        return {
            success: true,
            signature: signature,
            amount: amount,
            from: playerPublicKey,
            to: casinoKey.publicKey.toString(),
            note: 'SIMULATION MODE - No real tokens moved'
        };
    }

    async payWinnings(playerPublicKey, amount) {
        const playerKey = new PublicKey(playerPublicKey);
        const casinoKey = this.casinoWallet.getKeypair();

        console.log(`💰 Paying winnings to ${playerPublicKey}: ${amount} OGB`);

        const signature = await this.transferTokens(
            casinoKey.publicKey,
            playerKey,
            amount
        );

        return {
            success: true,
            signature: signature,
            amount: amount,
            from: casinoKey.publicKey.toString(),
            to: playerPublicKey,
            note: 'SIMULATION MODE - No real tokens moved'
        };
    }

    async getBalance(publicKey) {
        try {
            const tokenAccount = await getAssociatedTokenAddress(this.tokenMint, new PublicKey(publicKey));
            const accountInfo = await getAccount(this.connection, tokenAccount);
            return Number(accountInfo.amount) / Math.pow(10, 6);
        } catch (error) {
            return 0;
        }
    }

    async getCasinoBalance() {
        return await this.getBalance(this.casinoWallet.getPublicKey());
    }
}

export default TokenService;
