// Cryptographic functions for signature verification
const secp256k1 = require('secp256k1')
const CryptoJS = require('crypto-js')
const bs58 = require('base58')

function ripemd160(input) {
    if (typeof input !== 'string')
        input = CryptoJS.lib.WordArray.create(input)
    const hash = Buffer.from(CryptoJS.RIPEMD160(input).toString(CryptoJS.enc.Hex),'hex')
    return hash
}

function sha256(input) {
    if (typeof input !== 'string')
        input = CryptoJS.lib.WordArray.create(input)
    const hash = Buffer.from(CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex),'hex')
    return hash
}

function grapheneEncodePub(key,prefix = 'STM') {
    const checksum = ripemd160(key)
    return prefix + bs58.encode(Buffer.concat([key,checksum.slice(0,4)]))
}

function avalonEncode(key) {
    return bs58.encode(key)
}

function recoverFromSig(sig,recid,msg) {
    return secp256k1.ecdsaRecover(bs58.decode(sig),recid,msg)
}

function createHash(username,network,msg) {
    return sha256(username+network+msg)
}

module.exports = {
    grapheneEncodePub,
    avalonEncode,
    recoverFromSig,
    createHash
}