const R = require('ramda');
const CryptoUtil = require('../util/cryptoUtil');
const CryptoEdDSAUtil = require('../util/cryptoEdDSAUtil');
const ArgumentError = require('../util/argumentError');
const Transaction = require('../blockchain/transaction');

class TransactionBuilder {
    constructor() {
        this.listOfUTXO = null;
        this.outputAddresses = null;
        this.totalAmount = null;
        this.changeAddress = null;
        this.feeAmount = 0;
        this.secretKey = null;
        this.type = 'regular';
    }

    from(listOfUTXO) {
        this.listOfUTXO = listOfUTXO;

        return this;
    }

    to(address, amount) {
        this.outputAddress = address;
        this.totalAmount = amount;

        return this;
    }

    change(changeAddress) {
        this.changeAddress = changeAddress;

        return this;
    }

    fee(amount) {
        this.feeAmount = amount;

        return this;
    }

    sign(secretKey) {
        this.secretKey = secretKey;

        return this;
    }

    type(type) {
        this.type = type;
    }

    build() {
        if (this.listOfUTXO == null) throw new ArgumentError('It\'s necessary to inform a list of unspent output transactions.');
        if (this.outputAddress == null) throw new ArgumentError('It\'s necessary to inform the destination address.');
        if (this.totalAmount == null) throw new ArgumentError('It\'s necessary to inform the transaction value.');

        let self = this;
        let totalAmountOfUTXO = R.sum(R.pluck('amount', this.listOfUTXO));
        let changeAmount = totalAmountOfUTXO - this.totalAmount - this.feeAmount;
        let inputs = R.map((utxo) => {
            let txiHash = CryptoUtil.hash({
                transaction: utxo.transaction,
                index: utxo.index,
                address: utxo.address
            });
            utxo.signature = CryptoEdDSAUtil.signHash(CryptoEdDSAUtil.generateKeyPairFromSecret(self.secretKey), txiHash);

            return utxo;
        }, this.listOfUTXO);

        let outputs = [];

        outputs.push({
            amount: this.totalAmount,
            address: this.outputAddress
        });

        if (changeAmount > 0) {
            outputs.push({
                amount: changeAmount,
                address: this.changeAddress
            });
        } else {
            throw new ArgumentError('The sender does not have enough to pay for the transaction.');
        }

        return Transaction.fromJson({
            id: CryptoUtil.randomId(64),
            hash: null,
            type: this.type,
            data: {
                inputs: inputs,
                outputs: outputs
            }
        });
    }
}

module.exports = TransactionBuilder;