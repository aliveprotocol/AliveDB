const Config = require('./config')
const http = require('http').createServer()
const GunDB = require('gun')
require('./middleware')
const Gun = GunDB({ web: http, peers: Config.peers, file: Config.data_dir })

let user = Gun.user()

// Global var clones required for middleware
gunInstance = Gun
gunUser = user

let db = {
    init: () => {
        if (Config.gun_port)
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
    changeKey: (id,oldkey,newkey,cb) => {
        user.auth(id,oldkey,(result) => {
            if (result.err)
                cb(result.err)
            else
                cb()
        },{ change: newkey })
    },
    currentUser: () => user.is,
    pushStream: (metadata,cb) => {
        user.get(metadata.network + '/' + metadata.streamer + '/' + metadata.link + '<?600').set(metadata.stream,(ack) => {
            if (ack.err) return cb(ack.err)
            else cb()
        })
    },
    getListFromUser: (pub,listId,retainGunInfo,minTs) => {
        return new Promise((rs,rj) => {
            let list = []
            Gun.user(pub).get(listId+'<?600').once(async (data) => {
                let itemIds = Object.keys(data)
                for (let i = 1; i < itemIds.length; i++) if (new Date().getTime() - data._['>'][itemIds[i]] < 600000 && data._['>'][itemIds[i]] > minTs) {
                    let itm = await db.getItem(data[itemIds[i]]['#'])
                    if (!retainGunInfo && itm && itm._)
                        delete itm._
                    if (itm)
                        list.push(itm)
                }
                rs(list)
            })
        })
    },
    getItem: (itemId) => {
        return new Promise((rs,rj) => {
            Gun.get(itemId,(data) => {
                rs(data.put)
            })
        })
    },
    getSetLength: (pub,listId) => {
        return new Promise((rs,rj) => {
            Gun.user(pub).get(listId).once((data) => {
                rs(Object.keys(data).length - 1)
            })
        })
    }
}

module.exports = db