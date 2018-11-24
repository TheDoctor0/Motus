const crypto = require('crypto');
const elliptic = require('elliptic');
const EdDSA = elliptic.eddsa;
const ec = new EdDSA('ed25519');
const SALT = '0ffaa74a206ad0aaece253f090c88dbe7785b9e67ec49ad988d84fd7dff240d1';

class CryptoEdDSAUtil {
    static generateSecret(password) {
        let secret = crypto.pbkdf2Sync(password, SALT, 10000, 512, 'sha512').toString('hex');

        console.debug(`Secret: \n${secret}`);

        return secret;
    }

    static generateKeyPairFromSecret(secret) {
        let keyPair = ec.keyFromSecret(secret);

        console.debug(`Public key: \n${elliptic.utils.toHex(keyPair.getPublic())}`);

        return keyPair;
    }

    static signHash(keyPair, messageHash) {
        let signature = keyPair.sign(messageHash).toHex().toLowerCase();

        console.debug(`Signature: \n${signature}`);

        return signature;
    }

    static verifySignature(publicKey, signature, messageHash) {
        let key = ec.keyFromPublic(publicKey, 'hex');
        let verified = key.verify(messageHash, signature);

        console.debug(`Verified: ${verified}`);

        return verified;
    }

    static toHex(data) {
        return elliptic.utils.toHex(data);
    }
}

module.exports = CryptoEdDSAUtil;