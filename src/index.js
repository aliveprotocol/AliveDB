const Config = require('./config')
const server = require('./server')

server.listen(Config.http_port,() => console.log(`AliveDB API server listening on port ${Config.http_port}`))