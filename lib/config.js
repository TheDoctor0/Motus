module.exports = {
    MINING_REWARD: 1000,
    FEE_PER_TRANSACTION: 1,
    TRANSACTIONS_PER_BLOCK: 3000,
    GENESIS_BLOCK: {
        index: 0,
        previousHash: '0',
        timestamp: 1465154705,
        nonce: 0,
        transactions: []
    },
    POW: {
        getDifficulty: (blocks, index) => {
            const BASE_DIFFICULTY = Number.MAX_SAFE_INTEGER;
            const EVERY_X_BLOCKS = 5;
            const POW_CURVE = 5;

            return Math.max(
                Math.floor(
                    BASE_DIFFICULTY / Math.pow(
                        Math.floor(((index || blocks.length) + 1) / EVERY_X_BLOCKS) + 1
                        , POW_CURVE)
                )
                , 0);
        }
    }
};