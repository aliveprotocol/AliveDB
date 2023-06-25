const GunDB = require('gun')
const Gun = GunDB({ peers: ['http://localhost:3007/gun'], file: 'radata2' })
// const cg = require('./hivecryptPro')

let alivedb_pk = ''

// let network = 'blurt'
// let user = 'techcoderx'
// let wif = ''
let streamNetwork = 'avalon'
let streamer = 'techcoderx'
let link = 'teststreamchat'
// let ts = new Date().getTime()
// let hash = cg.createHashRequest(ts,user,network,streamNetwork,streamer,link)
// let sign = cg.grapheneSign(wif,hash)
// let sign = cg.avalonSign(wif,hash)
// let signed = {
//     s: sign,
//     t: ts
// }

// Gun.get('alivedb_chat_request').get(streamNetwork).get(streamer).get(link).get(network).get(user).put(signed,(ack) => {
//     console.log(signed,ack.ok)
//     Gun.user(alivedb_pk).get(`${streamNetwork}/${streamer}/${link}/participants`).get(network).get(user).on((data) => console.log('response',data))
// })

// Gun.get('alivedb_chat_request').get('avalon').get('techcoderx').get('teststreamchat').put(5003,(ack) => {
//     console.log('ack ok',ack.ok)
//     Gun.get('alivedb_chat_request').get('avalon').get('techcoderx').get('teststreamchat2').once((data) => {
//         console.log('data',data)
//     })
// })

/*
0: Banned/Muted
1: Approved
*/

Gun.user(alivedb_pk).get('avalon/techcoderx/teststreamchat/participants').get('hive').get('randomvlogs').once((val) => console.log('VAL',val))