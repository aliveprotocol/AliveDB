// Same middleware file as in AliveDB but striped down for browsers.

// To use this middleware, import this file right after importing gundb.
const allowedMsgFields = ['_','u','n','s','r','t','m']
const allowedReqFields = ['_','s','r','t']

let blacklistedUsersHiveInterval = null
let blacklistedUsersHive = []

Gun.on('opt',function (ctx) {
    if (ctx.once) return
    this.to.next(ctx)

    ctx.on('in',async function (msg) {
        if (msg.put) {
            let key = Object.keys(msg.put)
            let keydet = key[0].split('/')
            let received = msg.put[key[0]]
            if (key.length > 0 && keydet[0] === 'alivedb_chat' && keydet.length === 5) {
                // when screening data outside of Gun.user() namespace,
                // the first (root) key should not start with '~'
                // for live chat, keys would be 'alivedb_chat' -> network -> streamer -> link -> messageId
                // message content template:
                /*
                {
                    u: 'username',
                    n: 'network (avalon, hive, blurt etc)',
                    s: 'signature',
                    r: recid,
                    t: timestamp,
                    m: 'my chat message goes here'
                }
                */
                if (!received.u || !received.n || !received.s || (received.n === 'avalon' && !received.r && received.r !== 0) || !received.t || !received.m) return
                if (typeof received.u !== 'string' || typeof received.s !== 'string' || (received.r && typeof received.r !== 'number') || typeof received.t !== 'number' || typeof received.m !== 'string') return
                if (!participants[received.n]) return
                if (Math.abs(received.t - received._['>'].t) > 30000) return

                // Unknown fields are rejected
                for (let fields in received) if (!allowedMsgFields.includes(fields)) return

                // Exclude blacklisted users on Hive (if any)
                if (received.n === 'hive' && blacklistedUsersHive.includes(received.u)) return

                // Recover public key from message signature
                let pubkeystr = ''
                try {
                    let hash = cg.createHash(received.t,received.u,received.n,received.m,keydet[1],keydet[2],keydet[3])
                    if (received.n === 'avalon')
                        pubkeystr = cg.avalonRecoverFromSig(received.s,received.r,hash)
                    else
                        pubkeystr = cg.Signature.fromString(received.s).recover(hash)
                } catch { return }

                // Verify public key in account
                if (!participants[received.n][received.u] || !participants[received.n][received.u].includes(pubkeystr)) return
            } else if (gundbMod && gundbMod.is && key.length > 0 && key[0].startsWith('alivedb_chat_request/'+getLinkPath()) && keydet.length === 6) {
                if (!received.s || !received.t) return
                if (typeof received.s !== 'string' || typeof received.t !== 'number' || (received.r && typeof received.r !== 'number')) return
                if (!participants[keydet[4]]) return
                if (keydet[4] === 'avalon' && !received.r && received.r !== 0 && typeof received.r !== 'number') return
                if (Math.abs(received.t - received._['>'].t) > 30000) return
                if (Math.abs(received.t - new Date().getTime() > 10000)) return
                for (let fields in received) if (!allowedReqFields.includes(fields)) return
                if (keydet[4] === 'hive' && blacklistedUsersHive.includes(keydet[5])) return
                gundbMod.get(getLinkPath()+'/participants').get(keydet[4]).get(keydet[5]).once(async (val) => {
                    if (!val && val !== 0) {
                        // Verify signature
                        let validKeys = []
                        try {
                            let hash = cg.createHashRequest(received.t,keydet[5],keydet[4],keydet[1],keydet[2],keydet[3])
                            let pubkeystr = ''
                            if (keydet[4] === 'avalon')
                                pubkeystr = cg.avalonRecoverFromSig(received.s,received.r,hash)
                            else
                                pubkeystr = cg.Signature.fromString(received.s).recover(hash)
                            validKeys = await getAccountKeys(keydet[5],keydet[4])
                            if (!validKeys.includes(pubkeystr)) return
                        } catch (e) { return }
                        approveParticipant(keydet[4],keydet[5],validKeys,false)
                    } else if (val === 0) {
                        // Banned user
                        if (participants[keydet[4]][keydet[5]])
                            delete participants[keydet[4]][keydet[5]]
                        return
                    }
                })
            }
        }
        // valid data received, proceed to next middleware
        this.to.next(msg)
    })
})

function approveParticipant(network,user,validKeys,alrt) {
    gundbMod.get(getLinkPath()+'/participants').get(network).get(user).put(1,(ack) => {
        if (ack.ok) {
            if (alrt)
                alert('Successfully approved',user,network)
            else
                console.log('Successfully approved',user,network)
            participants[network][user] = validKeys
        }
    })
}

function blacklistParticipant(network,user,alrt) {
    gundbMod.get(getLinkPath()+'/participants').get(network).get(user).put(0,(ack) => {
        if (ack.ok) {
            if (alrt)
                alert('Successfully blacklisted',user,network)
            else
                console.log('Successfully blacklisted',user,network)
        }
        delete participants[network][user]
    })
}

function getAccountKeys(user,network) {
    return new Promise(async (rs,rj) => {
        if (participants[network][user]) return rs(participants[network][user])
        // todo blockchain api config
        if (network === 'avalon')
            axios.get('https://avalon.oneloved.tube/account/'+user).then((d) => {
                let allowedKeys = [d.data.pub]
                for (let i in d.data.keys)
                    allowedKeys.push(d.data.keys[i].pub)
                participants.avalon[user] = allowedKeys
                rs(allowedKeys)
            }).catch(rj)
        else {
            let rpc = network === 'hive' ? 'https://techcoderx.com' : 'https://blurt-rpc.saboin.com'
            axios.post(rpc,{
                id: 1,
                jsonrpc: '2.0',
                method: 'condenser_api.get_accounts',
                params: [[user]]
            }).then((d) => {
                if (d.data.result && d.data.result.length > 0) {
                    // Allow posting, active and owner keys
                    let allowedKeys = []
                    for (let i in d.data.result[0].posting.key_auths)
                        allowedKeys.push(d.data.result[0].posting.key_auths[i][0])
                    for (let i in d.data.result[0].active.key_auths)
                        allowedKeys.push(d.data.result[0].active.key_auths[i][0])
                    for (let i in d.data.result[0].owner.key_auths)
                        allowedKeys.push(d.data.result[0].owner.key_auths[i][0])
                    participants[network][user] = allowedKeys
                    rs(allowedKeys)
                } else rj(d.data.error)
            }).catch(rj)
        }
    })
}

function getHiveBlacklistedUsers(hiveUser) {
    return new Promise((rs,rj) => {
        axios.post('https://techcoderx.com',{
            id: 1,
            jsonrpc: '2.0',
            method: 'bridge.get_follow_list',
            params: {
                observer: hiveUser,
                follow_type: 'blacklisted'
            }
        }).then((d) => {
            if (d.data.error) return rj(d.data.error)
            let result = []
            for (let i in d.data.result) result.push(d.data.result[i].name)
            rs(result)
        }).catch(rj)
    })
}

async function streamHiveBlacklistedUsers(hiveUser) {
    blacklistedUsersHive = await getHiveBlacklistedUsers(hiveUser)
    blacklistedUsersHiveInterval = setInterval(async () => blacklistedUsersHive = await getHiveBlacklistedUsers(hiveUser),15000)
}

function stopStreamHiveBlacklistedUsers() {
    clearInterval(blacklistedUsersHiveInterval)
    blacklistedUsersHive = []
}