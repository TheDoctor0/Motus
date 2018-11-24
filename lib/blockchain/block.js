const R = require('ramda');
const CryptoUtil = require('../util/cryptoUtil');
const Transactions = require('./transactions');
const Config = require('../config');

class Block {
    toHash() {
        return CryptoUtil.hash(this.index + this.previousHash + this.timestamp + JSON.stringify(this.transactions) + this.nonce);
    }

    getDifficulty() {
        return parseInt(this.hash.substring(0, 14), 16);
    }

    static get genesis() {
        return Block.fromJson(Config.GENESIS_BLOCK);
    }

    static fromJson(data) {
        let block = new Block();

        R.forEachObjIndexed((value, key) => {
            block[key] = (key == 'transactions' && value) ? Transactions.fromJson(value) : value;
        }, data);

        block.hash = block.toHash();

        return block;
    }

}

module.exports = Block;