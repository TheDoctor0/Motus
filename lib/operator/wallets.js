const R = require('ramda');
const Wallet = require('./wallet');

class Wallets extends Array {
    static fromJson(data) {
        let wallets = new Wallets();

        R.forEach((wallet) => { wallets.push(Wallet.fromJson(wallet)); }, data);

        return wallets;
    }
}

module.exports = Wallets;