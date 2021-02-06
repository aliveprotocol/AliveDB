// Cryptographic functions for signature verification
const secp256k1 = require('secp256k1')
const CryptoJS = require('crypto-js')
const bs58 = require('bs58')

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

function grapheneDecodeWif() {
    const buffer = bs58.decode(encodedKey)
    return buffer.slice(0, -4)
}

function avalonEncode(key) {
    return bs58.encode(key)
}

function avalonDecode(key) {
    return bs58.decode(key)
}

function recoverFromSig(sig,recid,msg) {
    return secp256k1.ecdsaRecover(bs58.decode(sig),recid,msg)
}

function createHash(ts,username,network,msg) {
    return sha256(ts+'_'+username+'_'+network+'_'+msg)
}

function sign(key,hash) {
    let sig = secp256k1.ecdsaSign(hash,key)
    return {
        signature: bs58.encode(sig.signature),
        recid: sig.recid
    }
}

module.exports = {
    grapheneEncodePub,
    grapheneDecodeWif,
    avalonEncode,
    avalonDecode,
    recoverFromSig,
    createHash,
    sign
}