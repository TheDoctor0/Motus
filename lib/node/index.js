const superagent = require('superagent');
const Block = require('../blockchain/block');
const Blocks = require('../blockchain/blocks');
const Transactions = require('../blockchain/transactions');
const R = require('ramda');

class Node {
    constructor(host, port, peers, blockchain) {
        this.host = host;
        this.port = port;
        this.peers = [];
        this.blockchain = blockchain;

        this.hookBlockchain();
        this.connectToPeers(peers);
    }

    hookBlockchain() {
        this.blockchain.emitter.on('blockAdded', (block) => {
            this.broadcast(this.sendLatestBlock, block);
        });

        this.blockchain.emitter.on('transactionAdded', (newTransaction) => {
            this.broadcast(this.sendTransaction, newTransaction);
        });

        this.blockchain.emitter.on('blockchainReplaced', (blocks) => {
            this.broadcast(this.sendLatestBlock, R.last(blocks));
        });
    }

    connectToPeer(newPeer) {
        this.connectToPeers([newPeer]);

        return newPeer;
    }

    connectToPeers(newPeers) {
        let node = `http://${this.host}:${this.port}`;

        newPeers.forEach((peer) => {
            if (!this.peers.find((element) => { return element.url == peer.url; }) && peer.url != node) {
                this.sendPeer(peer, { url: node });
                this.peers.push(peer);
                this.initConnection(peer);
                this.broadcast(this.sendPeer, peer);

                console.info(`Peer ${peer.url} added to connections.`);
            }
        }, this);

    }

    initConnection(peer) {
        this.getLatestBlock(peer);
        this.getTransactions(peer);
    }

    sendPeer(peer, peerToSend) {
        const URL = `${peer.url}/node/peers`;

        console.info(`Sending ${peerToSend.url} to peer ${URL}.`);

        return superagent
            .post(URL)
            .send(peerToSend)
            .catch((err) => {
                console.warn(`Unable to send me to peer ${URL}: ${err.message}`);
            });
    }

    getLatestBlock(peer) {
        let self = this;
        const URL = `${peer.url}/blockchain/blocks/latest`;

        console.info(`Getting latest block from: ${URL}`);

        return superagent
            .get(URL)
            .then((res) => {
                self.checkReceivedBlock(Block.fromJson(res.body));
            })
            .catch((err) => {
                console.warn(`Unable to get latest block from ${URL}: ${err.message}`);
            });
    }

    sendLatestBlock(peer, block) {
        const URL = `${peer.url}/blockchain/blocks/latest`;

        console.info(`Posting latest block to: ${URL}`);

        return superagent
            .put(URL)
            .send(block)
            .catch((err) => {
                console.log(JSON.stringify(err));
                console.warn(`Unable to post latest block to ${URL}: ${err.message}`);
            });
    }

    getBlocks(peer) {
        let self = this;
        const URL = `${peer.url}/blockchain/blocks`;

        console.info(`Getting blocks from: ${URL}`);

        return superagent
            .get(URL)
            .then((res) => {
                self.checkReceivedBlocks(Blocks.fromJson(res.body));
            })
            .catch((err) => {
                console.warn(`Unable to get blocks from ${URL}: ${err.message}`);
            });
    }

    sendTransaction(peer, transaction) {
        const URL = `${peer.url}/blockchain/transactions`;

        console.info(`Sending transaction '${transaction.id}' to: '${URL}'`);

        return superagent
            .post(URL)
            .send(transaction)
            .catch((err) => {
                console.warn(`Unable to put transaction to ${URL}: ${err.message}`);
            });
    }

    getTransactions(peer) {
        let self = this;
        const URL = `${peer.url}/blockchain/transactions`;

        console.info(`Getting transactions from: ${URL}`);

        return superagent
            .get(URL)
            .then((res) => {
                self.syncTransactions(Transactions.fromJson(res.body));
            })
            .catch((err) => {
                console.warn(`Unable to get transations from ${URL}: ${err.message}`);
            });
    }

    getConfirmation(peer, transactionId) {
        const URL = `${peer.url}/blockchain/blocks/transactions/${transactionId}`;

        console.info(`Getting transactions from: ${URL}`);

        return superagent
            .get(URL)
            .then(() => {
                return true;
            })
            .catch(() => {
                return false;
            });
    }

    getConfirmations(transactionId) {
        let foundLocally = this.blockchain.getTransactionFromBlocks(transactionId) != null ? true : false;

        return Promise.all(R.map((peer) => {
            return this.getConfirmation(peer, transactionId);
        }, this.peers))
            .then((values) => {
                return R.sum([foundLocally, ...values]);
            }
        );
    }

    broadcast(fn, ...args) {
        console.info('Broadcasting');

        this.peers.map((peer) => {
            fn.apply(this, [peer, ...args]);
        }, this);
    }

    syncTransactions(transactions) {
        R.forEach((transaction) => {
            let transactionFound = this.blockchain.getTransactionById(transaction.id);

            if (transactionFound == null) {
                console.info(`Syncing transaction '${transaction.id}'`);
                this.blockchain.addTransaction(transaction);
            }
        }, transactions);
    }

    checkReceivedBlock(block) {
        return this.checkReceivedBlocks([block]);
    }

    checkReceivedBlocks(blocks) {
        const receivedBlocks = blocks.sort((b1, b2) => (b1.index - b2.index));
        const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
        const latestBlockHeld = this.blockchain.getLastBlock();

        if (latestBlockReceived.index > latestBlockHeld.index) {
            console.info(`Received new blockchain. We got: ${latestBlockHeld.index} blocks, Peer got: ${latestBlockReceived.index} blocks`);

            if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
                console.info('Appending last block from received blockchain to ours');

                this.blockchain.addBlock(latestBlockReceived);

                return true;
            } else if (receivedBlocks.length === 1) {
                console.info('Querying blockchain from our peers');

                this.broadcast(this.getBlocks);

                return null;
            } else {
                console.info('New blockchain is longer than current blockchain. Attempting to replace');

                this.blockchain.replaceBlockchain(receivedBlocks);

                return true;
            }
        }

        return false;
    }
}

module.exports = Node;
