const isIPFS = require('is-ipfs')

let validator = {
    lists: {
        network: ['dtc','hive'],
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
    dtcUsername: (username) => {
        if (typeof username !== 'string') return 'username must be a string'
        if (username.length < 1 || username.length > 50) return 'username nust be between 1 and 50 characters long'
        let allowedUsernameChars = 'abcdefghijklmnopqrstuvwxyz0123456789'
        let allowedUsernameCharsOnlyMiddle = '-.'
        username = username.toLowerCase()
        for (let i = 0; i < username.length; i++) {
            const c = username[i]
            // allowed username chars
            if (allowedUsernameChars.indexOf(c) === -1) 
                if (allowedUsernameCharsOnlyMiddle.indexOf(c) === -1)
                    return 'invalid character ' + c
                else if (i === 0 || i === username.length-1)
                    return 'character ' + c + ' can only be in the middle'
        }
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
            if (/--/.test(label))
                return suffix + "have only one dash in a row."
            if (!/[a-z0-9]$/.test(label))
                return suffix + "end with a letter or digit."
            if (!(label.length >= 3))
                return suffix + "be longer"
        }
        return null
    },
    link: (val) => {
        if (typeof val !== 'string')
            return 'Link must be a string'
        else if (val.length < 1 || val.length > 50)
            return 'Link must be between 1 and 50 characters long'
        else if (!/^[A-Za-z0-9-_]*$/.test(val))
            return 'Link must only contain letters, digits, dashes and underscores'
        return null
    },
    aliveDbId: (val) => {
        if (!val)
            return 'User ID is required'
        if (typeof val !== 'string')
            return 'User ID must be a string'
        else if (val.length < 3 || val.length > 50)
            return 'User ID must be between 3 and 50 characters long'
        return validator.dtcUsername(val)
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
        let resolutions = Object.keys(info)
        for (let i in resolutions) if (resolutions[i] !== 'len') {
            if (!validator.lists.resolutions.includes(resolutions[i]))
                return 'Invalid resolution ' + resolutions[i]
            else if (typeof info[resolutions[i]] !== 'string')
                return resolutions[i] + ' hash must be a string'
            else if (!isIPFS.cid(info[resolutions[i]]) && validator.skylink(info[resolutions[i]]) !== null)
                return 'Invalid ' + resolutions[i] + ' hash'
        }
        return null
    },
    skylink: (skylink) => {
        if (typeof skylink !== 'string')
            return 'Skylinks must be a string'
        else if (skylink.length !== 46)
            return 'Skylinks must be 46 characters long'
        let skyAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
        for (let i = 0; i < skylink.length; i++)
            if (skyAlphabet.indexOf(skylink[i]) === -1)
                return 'Invalid character found in Skylink'
        return null
    }
}

module.exports = validator