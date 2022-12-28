const cg = require('../src/cryptography')
const GunDB = require('gun')
const Gun = GunDB({ peers: ['http://localhost:3007/gun'], file: 'radata2' })

let message = 'hello from randomvlogs blurt 2'
let username = 'randomvlogs'
let network = 'hive'
let key = ''
let ts = new Date().getTime()

let streamNetwork = 'dtc'
let streamer = 'techcoderx'
let link = 'teststreamchat'

let hash = cg.createHash(ts,username,network,message,streamNetwork,streamer,link)
// let signature = cg.avalonSign(key,hash)
let signature = cg.grapheneSign(key,hash)

let signedObj = {
    u: username,
    n: network,
    s: signature,
    t: ts,
    m: message
}

Gun.get('alivedb_chat').get(streamNetwork).get(streamer).get(link).set(signedObj,(ack) => {
    console.log(ack.ok,signedObj)
})