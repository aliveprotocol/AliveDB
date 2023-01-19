const yargs = require('yargs')
const argv = yargs(process.argv).argv

// Default config
let config = {
    data_dir: '',
    peers: [],
    http_port: 3006,
    gun_port: 3007,

    // used for live chat only
    chat_listener: '',
    hive_api: '',
    blurt_api: '',
    avalon_api: ''
}

// Config overwrites through CLI args or environment vars
for (let c in config)
    config[c] = argv[c] || process.env['ALIVEDB_' + c.toUpperCase()] || config[c]

// Comma separated peers list
if (typeof config.peers === 'string')
    config.peers = config.peers.split(',')

module.exports = config