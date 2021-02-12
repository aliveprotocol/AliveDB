// Same middleware file as in AliveDB but striped down for browsers.

// To use this middleware, import this file right after importing gundb.
const allowedMsgFields = ['_','u','n','s','r','t','m']

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
                    n: 'network (dtc, hive, steem etc)',
                    s: 'signature',
                    r: recid,
                    t: timestamp,
                    m: 'my chat message goes here'
                }
                */
                if (!received.u || !received.n || !received.s || (received.n === 'dtc' && !received.r && received.r !== 0) || !received.t || !received.m) return
                if (typeof received.u !== 'string' || typeof received.s !== 'string' || (received.r && typeof received.r !== 'number') || typeof received.t !== 'number' || typeof received.m !== 'string') return
                if (!participants[received.n]) return
                if (Math.abs(received.t - received._['>'].t) > 30000) return

                // Unknown fields are rejected
                for (let fields in received) if (!allowedMsgFields.includes(fields)) return

                // Recover public key from message signature
                let pubkeystr = ''
                try {
                    let hash = cg.createHash(received.t,received.u,received.n,received.m,keydet[1],keydet[2],keydet[3])
                    if (received.n === 'dtc')
                        pubkeystr = cg.avalonRecoverFromSig(received.s,received.r,hash)
                    else
                        pubkeystr = cg.Signature.fromString(received.s).recover(hash)
                } catch { return }

                // Verify public key in account
                if (!participants[received.n][received.u] || !participants[received.n][received.u].includes(pubkeystr)) return
            }
        }
        // valid data received, proceed to next middleware
        this.to.next(msg)
    })
})