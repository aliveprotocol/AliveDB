const yargs = require('yargs')
const dotenv = require('dotenv')

dotenv.config()
const argv = yargs(process.argv).argv

// Default config
let config = {
    data_dir: __dirname+'/../radata',
    peers: [],
    http_host: '127.0.0.1',
    http_port: 3006,
    gun_host: '0.0.0.0',
    gun_port: 3007,

    // login on startup
    login_id: '',
    login_pub: '',
    login_password: '',

    // access token generation
    require_access_token: false,
    auth_timeout_blocks: 20,
    auth_identifier: 'alivedb_login',
    auth_token_expiry: 86400,

    // used for live chat only
    chat_listener: '',
    chat_middleware_enabled: false,
    hive_api: 'https://techcoderx.com',
    blurt_api: ''
}

// Config overwrites through CLI args or environment vars
for (let c in config)
    config[c] = argv[c] || process.env['ALIVEDB_' + c.toUpperCase()] || config[c]

// Comma separated peers list
if (typeof config.peers === 'string')
    config.peers = config.peers.split(',')

// Booleans
if (typeof config.require_access_token === 'string' && (config.require_access_token === '1' || config.require_access_token.toLowerCase() === 'true'))
    config.require_access_token = true

module.exports = config