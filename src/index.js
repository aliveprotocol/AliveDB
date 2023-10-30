const Config = require('./config')
const server = require('./server')

server.listen(Config.http_port,Config.http_host,() => console.log(`AliveDB API server listening on host ${Config.http_host} and port ${Config.http_port}`))

// called by docker stop
process.on('SIGTERM', () => process.exit(0))