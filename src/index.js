const Config = require('./config')
const Express = require('express')
const BodyParser = require('body-parser')
const app = Express()
const http = require('http').Server(app)
const GunDB = require('gun')
const Gun = GunDB({ file: Config.db_path, web: http, peers: Config.peers })

let user = Gun.user()

http.listen(Config.port,()=>console.log(`AliveDB listening on port ${Config.port}`))