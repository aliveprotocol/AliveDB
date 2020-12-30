let validator = {
    lists: {
        network: ['dtc','hive'],
    },
    network: (val) => {
        if (!val)
            return 'missing network'
        if (typeof val !== 'string')
            return 'invalid type'
        else if (validator.lists.network.includes(val))
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
    aliveDbKey: (val) => {
        if (!val)
            return 'Key is required'
        if (typeof val !== 'string')
            return 'Key must be a string'
        return null
    },
    streamMetadata: (metadata) => {
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
    }
}

module.exports = validator