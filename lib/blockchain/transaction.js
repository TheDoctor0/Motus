const R = require('ramda');
const CryptoUtil = require('../util/cryptoUtil');
const CryptoEdDSAUtil = require('../util/cryptoEdDSAUtil');
const TransactionAssertionError = require('./error/transactionAssertionError');
const Config = require('../config');

class Transaction {
    construct() {
        this.id = null;
        this.hash = null;
        this.type = null;
        this.data = {
            inputs: [],
            outputs: []
        };
    }

    toHash() {
        return CryptoUtil.hash(this.id + this.type + JSON.stringify(this.data));
    }

    check() {
        let isTransactionHashValid = this.hash == this.toHash();

        if (!isTransactionHashValid) {
            console.error(`Invalid transaction hash '${this.hash}'`);

            throw new TransactionAssertionError(`Invalid transaction hash '${this.hash}'`, this);
        }

        R.map((txInput) => {
            let txInputHash = CryptoUtil.hash({
                transaction: txInput.transaction,
                index: txInput.index,
                address: txInput.address
            });
            let isValidSignature = CryptoEdDSAUtil.verifySignature(txInput.address, txInput.signature, txInputHash);

            if (!isValidSignature) {
                console.error(`Invalid transaction input signature '${JSON.stringify(txInput)}'`);

                throw new TransactionAssertionError(`Invalid transaction input signature '${JSON.stringify(txInput)}'`, txInput);
            }
        }, this.data.inputs);


        if (this.type == 'regular') {
            let sumOfInputsAmount = R.sum(R.map(R.prop('amount'), this.data.inputs));
            let sumOfOutputsAmount = R.sum(R.map(R.prop('amount'), this.data.outputs));
            let isInputsAmountGreaterOrEqualThanOutputsAmount = R.gte(sumOfInputsAmount, sumOfOutputsAmount);

            if (!isInputsAmountGreaterOrEqualThanOutputsAmount) {
                console.error(`Invalid transaction balance: inputs sum '${sumOfInputsAmount}', outputs sum '${sumOfOutputsAmount}'`);

                throw new TransactionAssertionError(`Invalid transaction balance: inputs sum '${sumOfInputsAmount}', outputs sum '${sumOfOutputsAmount}'`, { sumOfInputsAmount, sumOfOutputsAmount });
            }

            let isEnoughFee = (sumOfInputsAmount - sumOfOutputsAmount) >= Config.FEE_PER_TRANSACTION;

            if (!isEnoughFee) {
                console.error(`Not enough fee: expected '${Config.FEE_PER_TRANSACTION}' got '${(sumOfInputsAmount - sumOfOutputsAmount)}'`);

                throw new TransactionAssertionError(`Not enough fee: expected '${Config.FEE_PER_TRANSACTION}' got '${(sumOfInputsAmount - sumOfOutputsAmount)}'`, { sumOfInputsAmount, sumOfOutputsAmount, FEE_PER_TRANSACTION: Config.FEE_PER_TRANSACTION });
            }
        }

        return true;
    }

    static fromJson(data) {
        let transaction = new Transaction();

        R.forEachObjIndexed((value, key) => { transaction[key] = value; }, data);

        transaction.hash = transaction.toHash();

        return transaction;
    }
}

module.exports = Transaction;