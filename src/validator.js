const isIPFS = require('is-ipfs')

let validator = {
    lists: {
        network: ['blurt','hive'],
        resolutions: ['src','240','480','720','1080']
    },
    network: (val) => {
        if (!val)
            return 'missing network'
        if (typeof val !== 'string')
            return 'invalid network data type'
        else if (!validator.lists.network.includes(val))
            return 'invalid network'
        return null
    },
    hiveUsername: (value) => {
        let suffix = "Hive username must "
        if (!value)
            return suffix + "not be empty."
        let length = value.length
        if (length < 3 || length > 16)
            return suffix + "be between 3 and 16 characters."
        if (/\./.test(value))
            suffix = "Each account segment much "
        let ref = value.split(".")
        let label
        for (let i = 0, len = ref.length; i < len; i++) {
            label = ref[i]
            if (!/^[a-z]/.test(label))
                return suffix + "start with a letter."
            if (!/^[a-z0-9-]*$/.test(label))
                return suffix + "have only letters, digits, or dashes."
            if (!/[a-z0-9]$/.test(label))
                return suffix + "end with a letter or digit."
            if (!(label.length >= 3))
                return suffix + "be longer"
        }
        return null
    },
    blurtUsername: (val) => validator.hiveUsername(val),
    link: (val) => {
        if (typeof val !== 'string')
            return 'Link must be a string'
        else if (val.length < 1 || val.length > 50)
            return 'Link must be between 1 and 50 characters long'
        else if (!/^[A-Za-z0-9-_]*$/.test(val))
            return 'Link must only contain letters, digits, dashes and underscores'
        return null
    },
    aliveDbId: (val = '') => {
        if (!val)
            return 'User ID is required'
        if (typeof val !== 'string')
            return 'User ID must be a string'
        else if (val.length < 3 || val.length > 50)
            return 'User ID must be between 3 and 50 characters long'
        let allowedChars = 'abcdefghijklmnopqrstuvwxyz0123456789'
        val = val.toLowerCase()
        for (let i = 0; i < val.length; i++) {
            const c = val[i]
            if (allowedChars.indexOf(c) === -1) 
                return 'invalid character ' + c
        }
        return null
    },
    aliveDbKey: (val) => {
        if (!val)
            return 'Key is required'
        if (typeof val !== 'string')
            return 'Key must be a string'
        return null
    },
    stream: (metadata) => {
        let metaValidate = validator.streamLink(metadata)
        if (metaValidate !== null)
            return metaValidate

        let streamValidate = validator.streamChunk(metadata.stream)
        if (streamValidate !== null)
            return streamValidate

        return null
    },
    streamLink: (metadata) => {
        let networkValidate = validator.network(metadata.network)
        if (networkValidate !== null)
            return networkValidate
        
        let streamerValidate = validator[metadata.network + 'Username'](metadata.streamer)
        if (streamerValidate !== null)
            return streamerValidate

        let linkValidate = validator.link(metadata.link)
        if (linkValidate !== null)
            return linkValidate

        return null
    },
    streamChunk: (info) => {
        if (!info)
            return 'Missing stream chunk'
        if (typeof info.len !== 'number')
            return 'Stream chunk length must be a number'
        if (typeof info.src !== 'string' || !isIPFS.cid(info.src))
            return 'Valid src hash is required'
        let resolutions = Object.keys(info)
        for (let i in resolutions) if (resolutions[i] !== 'len') {
            if (!validator.lists.resolutions.includes(resolutions[i]))
                return 'Invalid resolution ' + resolutions[i]
            else if (typeof info[resolutions[i]] !== 'string')
                return resolutions[i] + ' hash must be a string'
            else if (!isIPFS.cid(info[resolutions[i]]))
                return 'Invalid ' + resolutions[i] + ' hash'
        }
        return null
    }
}

module.exports = validator