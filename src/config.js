const yargs = require('yargs')
const dotenv = require('dotenv')

dotenv.config()
const argv = yargs(process.argv).argv

// Default config
let config = {
    data_dir: '',
    peers: [],
    http_host: '127.0.0.1',
    http_port: 3006,
    gun_host: '0.0.0.0',
    gun_port: 3007,

    // login on startup
    login_id: '',
    login_pub: '',
    login_password: '',

    // used for live chat only
    chat_listener: '',
    hive_api: '',
    blurt_api: ''
}

// Config overwrites through CLI args or environment vars
for (let c in config)
    config[c] = argv[c] || process.env['ALIVEDB_' + c.toUpperCase()] || config[c]

// Comma separated peers list
if (typeof config.peers === 'string')
    config.peers = config.peers.split(',')

module.exports = config