const Config = require('./config')
const http = require('http').createServer()
const GunDB = require('gun')
const  middleware = Config.chat_middleware_enabled ? require('./middleware') : null
const Gun = GunDB({ web: http, peers: Config.peers, file: Config.data_dir })

console.log('Peers:',Config.peers)

let user = Gun.user()

// Global var clones required for middleware
gunInstance = Gun
gunUser = user

let db = {
    init: async () => {
        if (Config.gun_port)
            http.listen(Config.gun_port,Config.gun_host,() => console.log(`AliveDB GUN P2P server listening on port ${Config.gun_port}`))
        
        if ((Config.login_id || Config.login_pub) && Config.login_password) {
            let id = Config.login_id
            if (!id && Config.login_pub)
                id = await db.getIdFromPub(req.body.pub)
            if (!id)
                console.log('Public key does not exist, skipping startup login')
            else
                db.login(id,Config.login_password,(e) => {
                    if (e)
                        console.log(`Failed to login on startup, user id: ${id}`)
                    else
                        console.log(`Logged in successfully on startup, user id: ${id}`)
                })
        }
    },
    createUser: (streamerID,aliveDbKey,cb) => {
        user.create(streamerID,aliveDbKey,(res) => {
            if (res.err)
                cb(res.err)
            else
                cb(null,res.pub)
        })
    },
    getIdFromPub: (pub) => {
        return new Promise((rs,rj) => {
            Gun.user(pub).once((user) => {
                if (user && user.alias)
                    rs(user.alias)
                else
                    rs(null)
            })
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
    fetchStreamParticipants: (pub,listId) => {
        return new Promise((rs,rj) => {
            if (!Config.chat_listener || !middleware) return
            let result = {
                hive: [],
                blurt: []
            }
            let listenerArr = Config.chat_listener.split('/')
            if (listenerArr.length === 3)
                Gun.user(pub).get(listId+'/participants').get(listenerArr[0]).get(listenerArr[1]).put(1)
            Gun.user(pub).get(listId+'/participants').once(async (nets) => {
                if (!nets) rs(result)
                for (let n in nets) if (n !== '_' && result[n] && Config[n+'_api']) {
                    let netusers = await db.getItem(nets[n]['#'])
                    if (netusers && netusers._) delete netusers._
                    for (let u in netusers) if (netusers[u] !== 0)
                        result[n].push(u)
                }
                middleware.participants = await middleware.getAccountKeysMulti(result)
                rs(middleware.participants)
                // Subscribe to requests
                if (Config.hive_api) db.subRequests('hive')
                if (Config.blurt_api) db.subRequests('blurt')
                // Subscribe to Hive decentralized blacklists if network is 'hive'
                if (listenerArr[0] === 'hive')
                    middleware.streamHiveBlacklistedUsers(listenerArr[1])
            })
        })
    },
    subRequests: (network) => {
        Gun.get('alivedb_chat_request/'+Config.chat_listener+'/'+network).on((d) => {
            let k = Object.keys(d._['>'])
            for (let l in k)
                Gun.get(d[k[l]]['#']).on(()=>{})
        })
    },
    getListFromUser: (pub,listId,minTs) => {
        return new Promise((rs,rj) => {
            let list = []
            Gun.user(pub).get(listId+'<?600').once(async (data) => {
                if (!data)
                    return rs([])
                let itemIds = Object.keys(data).sort((a,b) => data._['>'][a] - data._['>'][b])
                for (let i = 1; i < itemIds.length; i++) if (new Date().getTime() - data._['>'][itemIds[i]] < 600000 && data._['>'][itemIds[i]] >= minTs) {
                    let itm = await db.getItem(data[itemIds[i]]['#'])
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