const yargs = require('yargs')
const argv = yargs(process.argv).argv

// Default config
let config = {
    peers: [],
    http_port: 3006,
    gun_port: 3007
}

// Config overwrites through CLI args or environment vars
for (let c in config)
    config[c] = argv[c] || process.env['ALIVEDB_' + c.toUpperCase()] || config[c]

module.exports = config