const helper = require('./helper')
const validator = require('./validator')
const db = require('./alivedb')
const tokenAuth = require('./tokenAuth')
const config = require('./config')
const Express = require('express')
const bodyParser = require('body-parser')
const app = Express()

db.init()

if (config.require_access_token)
    tokenAuth.loadKeys()

// parse application/json
app.use(bodyParser.json())
app.use(bodyParser.text())

// Create AliveDB user account
app.post('/createUser',(req,res) => {
    let id = req.body.id || helper.randomId(16)
    let key = req.body.key
    let idValidate = validator.aliveDbId(id)
    let keyValidate = validator.aliveDbKey(key)

    if (keyValidate !== null)
        return res.status(400).send({error: keyValidate})

    if (idValidate !== null)
        return res.status(400).send({error: idValidate})

    db.createUser(id,key,(e,pub) => {
        if (e)
            return res.status(500).send({error: e})
        res.send({id: id, pub: pub})
    })
})

// User login
// Use id or public key
app.post('/loginUser',async (req,res) => {
    if (!req.body.id && !req.body.pub)
        return res.status(400).send({error: 'User ID or public key is required'})
    else if (!req.body.key)
        return res.status(400).send({error: 'Key is required'})

    let id = req.body.id

    if (!id && req.body.pub)
        id = await db.getIdFromPub(req.body.pub)
    if (!id)
        return res.status(404).send({error: 'Public key does not exist'})
    db.login(id,req.body.key,(e) => helper.cbHandler(e,res))
})

// Change user key
app.post('/changeKey',(req,res) => {
    if (!req.body.id && !req.body.pub)
        return res.status(400).send({error: 'User ID or public key is required'})
    else if (!req.body.key)
        return res.status(400).send({error: 'Old key is required'})
    else if (!req.body.newkey)
        return res.status(400).send({error: 'New key is required'})

    if (!req.body.id && req.body.pub) db.getIdFromPub(req.body.pub,(id) => {
        if (!id)
            return res.status(404).send({error: 'Public key does not exist'})
        db.changeKey(id,req.body.key,req.body.newkey,(e) => helper.cbHandler(e,res))
    })
    else
        db.changeKey(req.body.id,req.body.key,req.body.newkey,(e) => helper.cbHandler(e,res))
})

// Current logged in user (if any)
app.get('/currentUser',(req,res) => {
    let currentUser = db.currentUser()
    if (!currentUser)
        res.send({loggedIn: false})
    else {
        currentUser.loggedIn = true
        currentUser.requiresAccessToken = config.require_access_token
        if (config.require_access_token)
            currentUser.authId = config.auth_identifier
        res.send(currentUser)
    }
})

app.get('/fetchParticipantsKeys',async (req,res) => {
    if (!config.chat_middleware_enabled)
        return res.status(500).send({error: 'Live chat functionality not enabled'})
    if (!db.currentUser())
        return res.status(401).send({error: 'Not logged in'})
    let authorizedKeys = await db.fetchStreamParticipants(db.currentUser().pub,config.chat_listener)
    res.send(authorizedKeys)
})

// Get access token
app.post('/getToken',(request,response) => {
    if (!config.require_access_token)
        return response.status(500).send({error: 'Access tokens are not enabled'})
    tokenAuth.verifyAuthSignature(request.body,(valid,error) => {
        if (!valid)
            return response.status(400).send({error: 'Could not verify signature and/or recent block info: '+error})
        let split = request.body.split(':')
        let token = tokenAuth.generateJWT(split[0],split[1],split[3])
        response.send({access_token: token, error: null})
    })
})

// Push new stream chunk as current logged in user
app.post('/pushStream', async (req,res) => {
    if (typeof req.body !== 'object')
        return res.status(400).send({error: 'Request body must be an object containing stream details'})
    if (config.require_access_token) {
        let authHeader = req.header('Authorization')
        let authDetails = {}
        if (!authHeader)
            return res.status(401).send({error: 'Missing authentication header'})
        try {
            let authTk = authHeader.split(' ')
            if (authTk.length < 2)
                return res.status(401).send({error: 'Invalid bearer auth token'})
            authDetails = tokenAuth.verifyAccessToken(authTk[1])
        } catch (e) {
            return res.status(401).send({error: e})
        }
        // override metadata
        req.body.streamer = authDetails.user
        req.body.network = authDetails.network
        req.body.link = authDetails.link
    }
    let currentUser = db.currentUser()
    if (!currentUser)
        return res.status(401).send({error: 'Not logged in'})
    let streamValidator = validator.stream(req.body)
    if (streamValidator !== null)
        return res.status(400).send({error: streamValidator})
    db.pushStream(req.body,(e) => helper.cbHandler(e,res))
})

// Get stream by public key and link
app.get('/getStream',async (req,res) => {
    if (!req.query.pub)
        return res.status(400).send({error: 'Missing streamer public key'})
    let reqValidate = validator.streamLink(req.query)
    if (reqValidate !== null)
        return res.status(400).send({error: reqValidate})
    let minTs = parseInt(req.query.ts)
    if (isNaN(req.query.ts) || minTs < 0)
        minTs = 0
    res.send(await db.getListFromUser(req.query.pub,req.query.network + '/' + req.query.streamer + '/' + req.query.link,minTs))
})

module.exports = app