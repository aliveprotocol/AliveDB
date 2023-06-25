const tokenAuth = require('../src/tokenAuth')
const hivecryptPro = require('../src/hivecryptPro')
const config = require('../src/config')
const axios = require('axios')

function generateMessageToSign (username,link,network,cb) {
    // Generate text for user to sign
    // using latest block id
    let message = username+':'+link+':'+config.auth_identifier+':'+network+':'
    switch (network) {
        case 'hive':
            axios.post(config.hive_api,{
                id: 1,
                jsonrpc: '2.0',
                method: 'condenser_api.get_dynamic_global_properties',
                params: []
            }).then((r) => {
                if (r.data && r.data.result) {
                    message += r.data.result.head_block_number+':'+r.data.result.head_block_id
                    cb(null,message)
                } else if (r.data && r.data.error)
                    cb(r.data.error.message)
            }).catch(e => cb(e.toString()))
            break
    }
}

const wif = ''

generateMessageToSign('aliveprotocol','link1','hive', async (e,msg) => {
    console.log(msg)
    msg = msg + ':'+hivecryptPro.Signature.create(hivecryptPro.sha256(msg),wif).customToString()
    tokenAuth.loadKeys()
    console.log('Valid signature:',await tokenAuth.verifyAuthSigPromise(msg))

    let jwt = tokenAuth.generateJWT(msg.split(':')[0],msg.split(':')[1],msg.split(':')[3])
    console.log('JWT:',jwt)
    console.log(tokenAuth.verifyAccessToken(jwt))
})