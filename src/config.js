const homedir = require('os').homedir()
const yargs = require('yargs')
const argv = yargs(process.argv).argv

// Default config
let config = {
    db_path: homedir + '/.alivedb',
    mode: 0, // 0 = peer, 1 = streamer
    peers: [],
    port: 3006
}

// Config overwrites through CLI args or environment vars
for (let c in config)
    config[c] = argv[c] || process.env['ALIVEDB_' + c.toUpperCase()] || config[c]

// db_path home directory
if (config.db_path.startsWith('~/')) config.db_path.replace('~',homedir)

module.exports = config