const axios = require('axios')
const JWT = require('jsonwebtoken')
const fs = require('fs')
const config = require('./config')
const cg = require('./hivecryptPro')

let Keys = {
    tokenKey: ''
}

let tokenAuth = {
    loadKeys: () => {
        if (fs.existsSync(config.data_dir+'/tokenAuth.json'))
            Keys = JSON.parse(fs.readFileSync(config.data_dir+'/tokenAuth.json'))
        else
            tokenAuth.refreshKeys()
    },
    refreshKeys: () => {
        Keys = {
            tokenKey: cg.hivecrypt.randomWif().slice(3,35)
        }
        if (!fs.existsSync(config.data_dir)) fs.mkdirSync(config.data_dir)
        fs.writeFileSync(config.data_dir+'/tokenAuth.json',JSON.stringify(Keys,null,4))
    },
    verifyAuthSigPromise: (message) => new Promise((rs,rj) => tokenAuth.verifyAuthSignature(message,(success,error) => !success ? rj(error) : rs(success))),
    verifyAuthSignature: (message,cb) => {
        /*
        0. Username
        1. Link
        2. config.auth_identifier
        3. Network
        4. Recent block number
        5. Block ID/hash of recent block number
        6. Signature of above
        */
        let split = message.split(':')
        if (split.length !== 7 ||
            split[2] !== config.auth_identifier ||
            split[3] !== 'hive' || // networks
            isNaN(parseInt(split[4])))
            return cb(false,'Invalid auth message format')
        // todo: link check and verify that username/link stream has not ended
        let original = split.slice(0,6).join(':')
        let hash = cg.sha256(original)
        switch (split[3]) {
            case 'hive':
                axios.post(config.hive_api,{
                    id: 1,
                    jsonrpc: '2.0',
                    method: 'database_api.verify_signatures',
                    params: {
                        hash: hash.toString('hex'),
                        signatures: [split[6]],
                        required_owner: [],
                        required_active: [],
                        required_posting: [split[0]],
                        required_other: []
                    }
                }).then((r) => {
                    if (r.data && r.data.result && r.data.result.valid)
                        tokenAuth.verifyBlockInfo('hive',split[4],split[5],cb)
                    else
                        cb(false,'Invalid signature')
                }).catch(() => cb(false,'Failed to verify signature'))
                break
            default:
                break
        }
    },
    verifyBlockInfo: (network,number,id,cb) => {
        switch (network) {
            case 'hive':
                axios.post(config.hive_api,{
                    id: 1,
                    jsonrpc: '2.0',
                    method: 'condenser_api.get_block',
                    params: [parseInt(number)]
                }).then(r => {
                    if (r.data && r.data.result && r.data.result.block_id === id)
                        return tokenAuth.verifyBlockExpiry(network,number,cb)
                    else
                        return cb(false,'Invalid block ID for block')
                }).catch(() => cb(false,'Could not verify block ID'))
                break
            default:
                break
        }
    },
    verifyBlockExpiry: (network,number,cb) => {
        switch (network) {
            case 'hive':
                axios.post(config.hive_api,{
                    id: 1,
                    jsonrpc: '2.0',
                    method: 'condenser_api.get_dynamic_global_properties',
                    params: []
                }).then(r => {
                    if (r.data && r.data.result && r.data.result.head_block_number <= parseInt(number) + config.auth_timeout_blocks)
                        return cb(true)
                    else
                        return cb(false,'Block info specified timed out')
                }).catch(() => cb(false,'Could not verify block expiry'))
                break
            default:
                break
        }
    },
    generateJWT: (user,link,network) => {
        let timeNow = Date.now()
        return JWT.sign({
            user: user,
            link: link,
            app: config.auth_identifier,
            network: network,
            iat: timeNow / 1000,
            exp: (timeNow / 1000) + config.auth_token_expiry
        },Keys.tokenKey)
    },
    verifyAccessToken: (access_token) => {
        return JWT.verify(access_token,Keys.tokenKey)
    },
}

module.exports = tokenAuth