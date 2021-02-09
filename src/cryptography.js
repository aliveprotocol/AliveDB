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

function createHash(ts,username,network,msg) {
    return sha256(ts+'_'+username+'_'+network+'_'+msg)
}

function createHashRequest(ts,username,network) {
    return sha256('alivedb_chat_request'+'_'+ts+'_'+username+'_'+network)
}

function grapheneEncodePub(key,prefix = 'STM') {
    const checksum = ripemd160(key)
    return prefix + bs58.encode(Buffer.concat([key,checksum.slice(0,4)]))
}

function grapheneDecodeWif(key) {
    const buffer = bs58.decode(key)
    return buffer.slice(0, -4).slice(1)
}

function avalonEncode(key) {
    return bs58.encode(key)
}

function avalonDecode(key) {
    return bs58.decode(key)
}

function avalonRecoverFromSig(sig,recid,msg) {
    return secp256k1.ecdsaRecover(bs58.decode(sig),recid,msg)
}

function avalonSign(key,hash) {
    let sig = secp256k1.ecdsaSign(hash,key)
    return {
        signature: bs58.encode(sig.signature),
        recid: sig.recid
    }
}

function grapheneSign(key,hash) {
    // https://github.com/mahdiyari/hive-tx-js/blob/master/helpers/PrivateKey.js#L45-L61
    if (typeof key === 'string')
        key = grapheneDecodeWif(key)
    let rv = {}
    let attempts = 0
    do {
        const options = {
            data: sha256(Buffer.concat([hash, Buffer.alloc(1, ++attempts)]))
        }
        rv = secp256k1.ecdsaSign(hash, key, options)
    } while (!isCanonicalSignature(rv.signature))
    return new Signature(rv.signature, rv.recid).customToString()
}

function isCanonicalSignature (signature) {
    return (
        !(signature[0] & 0x80) &&
        !(signature[0] === 0 && !(signature[1] & 0x80)) &&
        !(signature[32] & 0x80) &&
        !(signature[32] === 0 && !(signature[33] & 0x80))
    )
}

/** ECDSA (secp256k1) signature. */
// https://github.com/mahdiyari/hive-tx-js/blob/master/helpers/Signature.js
class Signature {
    constructor (data, recovery) {
        this.data = data
        this.recovery = recovery
    }

    static fromBuffer(buffer) {
        if (buffer.length !== 65) throw new Error('invalid signature')
        const recovery = buffer.readUInt8(0) - 31
        const data = buffer.slice(1)
        return new Signature(data, recovery)
    }
    
    static fromString(string) {
        return Signature.fromBuffer(Buffer.from(string, 'hex'))
    }

    /**
     * Recover public key from signature by providing original signed message.
     * @param message 32-byte message that was used to create the signature.
     */
    recover(message, prefix = 'STM') {
        return grapheneEncodePub(secp256k1.ecdsaRecover(this.data, this.recovery, message),prefix)
    }

    toBuffer () {
        const buffer = Buffer.alloc(65)
        buffer.writeUInt8(this.recovery + 31, 0)
        Buffer.from(this.data,'hex').copy(buffer, 1)
        return buffer
    }
  
    customToString () {
        return this.toBuffer().toString('hex')
    }
}

module.exports = {
    grapheneEncodePub,
    grapheneDecodeWif,
    avalonEncode,
    avalonDecode,
    avalonRecoverFromSig,
    createHash,
    createHashRequest,
    avalonSign,
    grapheneSign,
    Signature
}