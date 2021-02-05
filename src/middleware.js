// This is where peers can hand pick streams and live chat content
// that they wish to propogate throughout the p2p network. If enough
// peers have chosen not to store certain contents, it may become
// unretrievable. Hence, on-chain direct streams should be used if
// immutability is very important.

// By default, we reject live chat messages that are not signed
// with a valid key, and perhaps messages from those who are banned
// by moderators which are only approved by streamers themselves.

// To use this middleware, import this file right after importing gundb.
const GunDB = require('gun/gun')

GunDB.on('opt',function (ctx) {
    if (ctx.once) return
    this.to.next(ctx)

    ctx.on('in',function (msg) {
        if (msg.put) {
            let key = Object.keys(msg.put)
            if (key.length > 0 && !key[0].startsWith('~')) {
                // when screening data outside of Gun.user() namespace,
                // the first key should not start with '~'
                // for live chat, root key would be 'alivedb_chat'
                // usually implemented in browsers and backends such as HAlive
                // console.log('inmsg',JSON.stringify(msg.put))
            }
        }
        // valid data received, proceed to next middleware
        this.to.next(msg)
    })
})