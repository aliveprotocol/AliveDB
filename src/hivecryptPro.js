// Hivecrypt Pro
const CryptoJS = require('crypto-js')
const bs58 = require('bs58')
const secp256k1 = require('secp256k1')
const hivecrypt = require('hivecrypt')

/**
 * Network id used in WIF-encoding.
 */
const NETWORK_ID = Buffer.from([0x80]);

/**
 * Return ripemd160 hash of input.
 */
function ripemd160(input) {
    if (typeof input !== 'string')
        input = CryptoJS.lib.WordArray.create(input)
    const hash = Buffer.from(CryptoJS.RIPEMD160(input).toString(CryptoJS.enc.Hex),'hex')
    return hash
}

/**
 * Return sha256 hash of input.
 */
function sha256(input) {
    if (typeof input !== 'string')
        input = CryptoJS.lib.WordArray.create(input)
    const hash = Buffer.from(CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex),'hex')
    return hash
}

/**
 * Return 2-round sha256 hash of input.
 */
function doubleSha256(input) {
    return sha256(sha256(input));
}

/**
 * Encode bs58+ripemd160-checksum encoded public key.
 */
function encodePublic(key, prefix) {
    const checksum = ripemd160(key)
    return prefix + bs58.encode(Buffer.concat([key, checksum.slice(0, 4)]))
}

/**
 * Decode bs58+ripemd160-checksum encoded public key.
 */
function decodePublic(encodedKey) {
    const prefix = encodedKey.slice(0, 3);
    encodedKey = encodedKey.slice(3);
    const buffer = bs58.decode(encodedKey);
    const key = buffer.slice(0, -4);
    return { key, prefix };
}

/**
 * Encode bs58+doubleSha256-checksum private key.
 */
function encodePrivate(key) {
    const checksum = doubleSha256(key);
    return bs58.encode(Buffer.concat([key, checksum.slice(0, 4)]));
}

/**
 * Decode bs58+doubleSha256-checksum encoded private key.
 */
function decodePrivate(encodedKey) {
    const buffer = bs58.decode(encodedKey);
    const key = buffer.slice(0, -4);
    return key;
}

/**
 * Crypto-JS AES encrypt
 */
function aesEncrypt(data,key) {
    return CryptoJS.AES.encrypt(data,key).toString()
}

/**
 * Crypto-JS AES decrypt to UTF-8 format
 */
function aesDecrypt(data,key) {
    return CryptoJS.AES.decrypt(data,key).toString(CryptoJS.enc.Utf8)
}

function createHash(ts,username,network,msg,streamNetwork,streamer,streamLink) {
    return sha256(ts+'_'+username+'_'+network+'_'+msg+'_'+streamNetwork+'/'+streamer+'/'+streamLink)
}

function createHashRequest(ts,username,network,streamNetwork,streamer,streamLink) {
    return sha256('alivedb_chat_request'+'_'+ts+'_'+username+'_'+network+'_'+streamNetwork+'/'+streamer+'/'+streamLink)
}

function isCanonicalSignature(signature) {
    return (
      !(signature[0] & 0x80) &&
      !(signature[0] === 0 && !(signature[1] & 0x80)) &&
      !(signature[32] & 0x80) &&
      !(signature[32] === 0 && !(signature[33] & 0x80))
    )
}

/**
 * ECDSA (secp256k1) public key.
 */
 class PublicKey {
    constructor(key, prefix = 'STM') {
        this.key = key;
        this.prefix = prefix;
        this.uncompressed = Buffer.from(secp256k1.publicKeyConvert(key, false));
    }
    /**
     * Create a new instance from a WIF-encoded key.
     */
    static fromString(wif) {
        const { key, prefix } = decodePublic(wif);
        return new PublicKey(key, prefix);
    }

    /**
     * Convert public key buffer to WIF encoding
     */
    toString() {
        return encodePublic(this.key,this.prefix)
    }

    /**
     * Create a new instance.
     */
    static from(value) {
        if (value instanceof PublicKey) {
            return value;
        }
        else {
            return PublicKey.fromString(value);
        }
    }
}

/**
 * ECDSA (secp256k1) private key.
 */
class PrivateKey {
    constructor(key) {
        if (!secp256k1.privateKeyVerify(key))
            throw new Error ("invalid private key")
        this.key = key
    }
    /**
     * Create a new instance from a WIF-encoded key.
     */
    static fromString(wif) {
        return new PrivateKey(decodePrivate(wif).slice(1));
    }

    /**
     * Create a PrivateKey instance from master password.
     * @param {String} name Account name
     * @param {String} password Password
     * @param {String} role Account role. Valid: Owner, Active, Posting, Memo.
     * @returns a new PrivateKey instance
     */
    static fromPassword(name, password, role) {
        let seed = name + role + password
        let brainKey = seed.trim().split(/[\t\n\v\f\r ]+/).join(' ')
        return new PrivateKey(sha256(brainKey))
    }

    /**
     * Derive the public key for this private key.
     */
    createPublic(prefix) {
        return new PublicKey(secp256k1.publicKeyCreate(this.key), prefix);
    }

    /** Return a WIF-encoded representation of the key. */
    toString () {
        return encodePrivate(Buffer.concat([NETWORK_ID, this.key]))
    }
}

/** ECDSA (secp256k1) signature. */
// https://github.com/mahdiyari/hive-tx-js/blob/master/helpers/Signature.js
class Signature {
    constructor(data, recovery) {
        this.data = data
        this.recovery = recovery
    }

    static fromBuffer(buffer) {
        if (buffer.length !== 65)
            throw new Error('invalid signature')
        const recovery = buffer.readUInt8(0) - 31
        const data = buffer.slice(1)
        return new Signature(data, recovery)
    }

    /**
     * Creates a Signature instance from string.
     * @param {String} string graphene signature
     * @returns a new Signature instance
     */
    static fromString(string) {
        return Signature.fromBuffer(Buffer.from(string, 'hex'))
    }

    /**
     * 
     * @param {UInt8Array} message 32-byte message to sign
     * @param {String} wif plaintext wif
     * @returns a new Signature instance
     */
     static create(message,wif) {
        let rv = {}
        let attempts = 0
        do {
            const options = {
                data: sha256(Buffer.concat([message, Buffer.alloc(1, ++attempts)]))
            }
            rv = secp256k1.ecdsaSign(message, PrivateKey.fromString(wif).key, options)
        } while (!isCanonicalSignature(rv.signature))
        return new Signature(rv.signature, rv.recid)
    }

    /**
     * Recover public key from signature by providing original signed message.
     * @param message 32-byte message that was used to create the signature.
     */
    recover(message, prefix = 'STM') {
        return encodePublic(secp256k1.ecdsaRecover(this.data, this.recovery, message),prefix)
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

if (typeof window !== 'undefined')
    window.hivecryptpro = {
        PrivateKey,
        PublicKey,
        Signature,
        aes: {
            encrypt: aesEncrypt,
            decrypt: aesDecrypt
        },
        sha256,
        hivecrypt
    }

module.exports = {
    PrivateKey,
    PublicKey,
    Signature,
    aes: {
        encrypt: aesEncrypt,
        decrypt: aesDecrypt
    },
    sha256,
    createHash,
    createHashRequest,
    hivecrypt
}
