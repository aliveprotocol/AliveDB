module.exports = {
    randomId: (len) => {
        let permlink = ""
        let possible = "abcdefghijklmnopqrstuvwxyz0123456789"
        for (let i = 0; i < len; i++)
            permlink += possible.charAt(Math.floor(Math.random() * possible.length))
        return permlink
    },
    cbHandler: (e,res) => {
        if (e)
            res.status(400).send({success: false, error: e})
        else
            res.send({success: true})
    }
}