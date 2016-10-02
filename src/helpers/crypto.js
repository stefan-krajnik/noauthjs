'use strict';

const crypto = require('crypto');
const globalSalt = "3jkh#KJds";

class Crypto {
    constructor(){

    }

    static createSHA512(stringToHash, salt = ''){
        let finalStringToHash = globalSalt + salt + stringToHash + salt + globalSalt;
        let hash = crypto.createHash('sha256');

        hash.update(finalStringToHash);

        return hash.digest('hex');
    }

    static generateToken(bytes = 32){
        return crypto.randomBytes(bytes).toString('hex');
    }
}

module.exports = Crypto;