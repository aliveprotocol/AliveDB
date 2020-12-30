const Config = require('./config')
const http = require('http').createServer()
const GunDB = require('gun')
const Gun = GunDB({ web: http, peers: Config.peers })

let user = Gun.user()

let db = {
    init: () => {
        http.listen(Config.gun_port,() => console.log(`AliveDB GUN P2P server listening on port ${Config.gun_port}`))
    },
    createUser: (streamerID,aliveDbKey,cb) => {
        user.create(streamerID,aliveDbKey,(res) => {
            if (res.err)
                cb(res.err)
            else
                cb(null,res.pub)
        })
    },
    getIdFromPub: (pub,cb) => {
        Gun.user(pub).once((user) => {
            if (user && user.alias)
                cb(user.alias)
            else
                cb(null)
        })
    },
    login: (id,key,cb) => {
        user.auth(id,key,(result) => {
            if (result.err)
                cb(result.err)
            else
                cb()
        })
    },
    currentUser: () => user.is
}

module.exports = db