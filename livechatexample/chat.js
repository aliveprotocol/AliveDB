let gundb = new Gun(['http://localhost:3007/gun'])
let gundbMod = gundb.user()
let participants = {
    dtc: {},
    hive: {},
    blurt: {}
}
let msgs = {}
let ev = false
let authEvs = {
    dtc: false,
    hive: false,
    blurt: false
}
let authorized = false
let lastAccess = new Date().getTime()

async function requestAccess() {
    let ts = new Date().getTime()
    let network = document.getElementById('usernetworkselect').value
    let user = document.getElementById('usernameinput').value
    let key = document.getElementById('keyinput').value
    let streamNetwork = document.getElementById('streamnetworkselect').value
    let streamer = document.getElementById('streamerinput').value
    let link = document.getElementById('linkinput').value
    if (!user || (network === 'dtc' && !key) || (network === 'blurt' && !key && !window.blurt_keychain) || (network === 'hive' && !key && !window.hive_keychain)) return alert('username and key is required')
    if (await refreshAccess(true,user,network)) return
    let hash = cg.createHashRequest(ts,user,network,streamNetwork,streamer,link)
    let sign
    if (network === 'dtc')
        sign = cg.avalonSign(key,hash)
    else if (!key)
        try {
            sign = await keychainSign(ts,user,network,null,streamNetwork,streamer,link)
        } catch (e) { return alert(e) }
    else
        sign = cg.grapheneSign(key,hash)
    let signed = {
        s: network === 'dtc' ? sign.signature : sign,
        r: network === 'dtc' ? sign.recid : undefined,
        t: ts
    }
    getGunChatRequestPath().put(signed,(ack) => {
        if (ack.err) return
        let resp = setInterval(async () => {
            if (await refreshAccess(true,user,network))
                clearInterval(resp)
        },1000)
    })
}

function refreshAccess(alrt,user,network) {
    return new Promise((rs) => {
        if (!user) {
            document.getElementById('chataccessbtn').style.display = 'inline-block'
            return rs(false)
        }
        getGunChatAuthPath().get(network).get(user).once((data) => {
            if (data) {
                authorized = true
                if (alrt) alert('successfully obtained authorization')
                document.getElementById('chataccessbtn').style.display = 'none'
            } else { 
                authorized = false
                document.getElementById('chataccessbtn').style.display = 'inline-block'
            }
            rs(authorized)
        })
    })
}

function fetchParticipants() {
    return new Promise((rs) => {
        let toFetch = {
            dtc: [],
            hive: [],
            blurt: []
        }
        getGunChatAuthPath().once(async (nets) => {
            if (!nets) rs(participants)
            for (let n in nets) if (n !== '_' && toFetch[n]) {
                let netusers = await getGunItem(nets[n]['#'])
                if (netusers && netusers._) delete netusers._
                for (let u in netusers) if (netusers[u] !== 0)
                    toFetch[n].push(u)
            }
            let keys = await getAccountKeysMulti(toFetch,true)
            rs(keys)
        })
    })
}

function streamParticipants() {
    getGunChatAuthPath().get('dtc').on(async (nets,nk,at,currentEv) => streamParticipantsHandler(nets,'dtc',currentEv))
    getGunChatAuthPath().get('hive').on(async (nets,nk,at,currentEv) => streamParticipantsHandler(nets,'hive',currentEv))
    getGunChatAuthPath().get('blurt').on(async (nets,nk,at,currentEv) => streamParticipantsHandler(nets,'blurt',currentEv))
    if (document.getElementById('streamnetworkselect').value === 'hive' && document.getElementById('streamerinput').value)
        streamHiveBlacklistedUsers(document.getElementById('streamerinput').value)
}

async function streamParticipantsHandler(nets,network,currentEv) {
    console.log('STREAM PARTICIPANTS',network,nets)
    authEvs[network] = currentEv
    let newParticipants = []
    for (let u in nets) {
        if (u !== '_' && nets[u] !== 0 && !participants[network][u]) {
            newParticipants.push(u)
            if (network === document.getElementById('usernetworkselect').value && u === document.getElementById('usernameinput').value) {
                document.getElementById('chatmsginput').disabled = false
                document.getElementById('sendMsgBtn').disabled = false
            }
        } else if (u !== '_' && nets[u] === 0 && participants[network][u]) {
            // a user got banned
            delete participants[network][u]
            if (network === document.getElementById('usernetworkselect').value && u === document.getElementById('usernameinput').value) {
                document.getElementById('chatmsginput').disabled = true
                document.getElementById('sendMsgBtn').disabled = true
            }
        }
    }
    let req = {}
    req[network] = newParticipants
    let newKeys = await getAccountKeysMulti(req,false)
    Object.assign(participants[network],newKeys[network])
}

function getAccountKeysMulti(users,fetchAll) {
    return new Promise(async (rs,rj) => {
        // todo blockchain api config
        let results = {
            dtc: {},
            hive: {},
            blurt: {}
        }
        for (let nets in users) {
            if (!Array.isArray(users[nets]) || users[nets].length === 0) continue
            if (fetchAll) for (let u in users[nets]) if (participants[nets][users[nets][u]]) users[nets].splice(u,1)
            let d
            if (nets === 'dtc') {
                try {
                    d = await axios.get('https://avalon.oneloved.tube/accounts/'+users.dtc.join(','))
                } catch { continue }
                // Allow master key and type 4 and 13 custom keys
                for (let i = 0; i < d.data.length; i++) {
                    let allowedKeys = [d.data[i].pub]
                    for (let j in d.data[i].keys)
                        if (d.data[i].keys[j].types.includes(4) || d.data[i].keys[j].types.includes(13))
                            allowedKeys.push(d.data[i].keys[j].pub)
                    results.dtc[d.data[i].name] = allowedKeys
                }
            } else {
                let rpc = nets === 'hive' ? 'https://techcoderx.com' : 'https://blurt-rpc.saboin.com'
                try {
                    d = await axios.post(rpc,{
                        id: 1,
                        jsonrpc: '2.0',
                        method: 'condenser_api.get_accounts',
                        params: [users[nets]]
                    })
                } catch { continue }
                if (d.data.error) { continue }
                for (let u = 0; u < d.data.result.length; u++) {
                    // Allow posting, active and owner keys
                    let allowedKeys = []
                    for (let i in d.data.result[u].posting.key_auths)
                        allowedKeys.push(d.data.result[u].posting.key_auths[i][0])
                    for (let i in d.data.result[u].active.key_auths)
                        allowedKeys.push(d.data.result[u].active.key_auths[i][0])
                    for (let i in d.data.result[u].owner.key_auths)
                        allowedKeys.push(d.data.result[u].owner.key_auths[i][0])
                    results[nets][d.data.result[u].name] = allowedKeys
                }
            }
        }
        rs(results)
    })
}

async function loadChat() {
    if (!document.getElementById('streamerinput').value)
        return alert('Streamer username is required')
    else if (!document.getElementById('linkinput').value)
        return alert('Link is required') 
    else if (!document.getElementById('streameralivedbpub').value)
        return alert('AliveDB public key is required')
    msgs = {}
    participants = {
        dtc: {},
        hive: {},
        blurt: {}
    }
    document.getElementById('messages').innerText = ''
    document.getElementById('chatmsginput').disabled = false
    document.getElementById('sendMsgBtn').disabled = false
    stopStreamHiveBlacklistedUsers()
    if (ev && ev.off && typeof ev.off === 'function') ev.off()
    for (let i in authEvs) if (authEvs[i] && authEvs[i].off && typeof authEvs[i].off === 'function') authEvs[i].off()
    await refreshAccess(false,document.getElementById('usernameinput').value,document.getElementById('usernetworkselect').value)
    participants = await fetchParticipants()
    console.log('FETCH PARTICIPANTS',participants)
    getGunChatPath().on(async (newMsgHead,newKey,at,currentEv) => {
        ev = currentEv
        if (!newMsgHead) return
        let keyObjs = JSON.parse(JSON.stringify(newMsgHead._['>']))
        for (let k in keyObjs) if (msgs[k]) delete keyObjs[k]
        let newSortedKeys = Object.keys(keyObjs).sort((a,b) => newMsgHead._['>'][a] - newMsgHead._['>'][b])
        await loadMessages(newMsgHead,newSortedKeys)
        displayMessages(newSortedKeys)
    })
    streamParticipants()
}

async function loadMessages(msgHead,sortedKeys) {
    for (let i in sortedKeys) {
        let getMsg = await getGunItem(msgHead[sortedKeys[i]]['#'])
        if (!getMsg) continue
        if (getMsg._) delete getMsg._
        msgs[sortedKeys[i]] = getMsg
        console.log('MSG',sortedKeys[i],getMsg)
    }
}

function displayMessages(sortedKeys) {
    for (let k in sortedKeys) if (msgs[sortedKeys[k]])
        document.getElementById('messages').innerText = '['+msgs[sortedKeys[k]].u+'@'+msgs[sortedKeys[k]].n+'] '+msgs[sortedKeys[k]].m+'\n'+document.getElementById('messages').innerText
}

function chatEnter() {
    let keycode = window.event.keyCode
    if (keycode === 13 || keycode === 10)
        sendChatMessage()
}

async function sendChatMessage() {
    let ts = new Date().getTime()
    let message = document.getElementById('chatmsginput').value
    let network = document.getElementById('usernetworkselect').value
    let user = document.getElementById('usernameinput').value
    let key = document.getElementById('keyinput').value
    let streamNetwork = document.getElementById('streamnetworkselect').value
    let streamer = document.getElementById('streamerinput').value
    let link = document.getElementById('linkinput').value
    if (!message) return
    if (!user || (network === 'dtc' && !key) || (network === 'blurt' && !key && !window.blurt_keychain) || (network === 'hive' && !key && !window.hive_keychain)) return alert('username and key is required')
    let hash = cg.createHash(ts,user,network,message,streamNetwork,streamer,link)
    let sign
    if (network === 'dtc')
        sign = cg.avalonSign(key,hash)
    else if (!key)
        try {
            sign = await keychainSign(ts,user,network,message,streamNetwork,streamer,link)
        } catch (e) { return alert(e) }
    else
        sign = cg.grapheneSign(key,hash)
    let signed = {
        u: user,
        n: network,
        s: network === 'dtc' ? sign.signature : sign,
        r: network === 'dtc' ? sign.recid : undefined,
        m: message,
        t: ts
    }
    getGunChatPath().set(signed,(ack) => {
        if (ack.ok)
            document.getElementById('chatmsginput').value = ''
    })
}

function keychainSign(ts,username,network,msg,streamNetwork,streamer,streamLink) {
    let stringified = ''
    if (msg)
        stringified = ts+'_'+username+'_'+network+'_'+msg+'_'+streamNetwork+'/'+streamer+'/'+streamLink
    else
        stringified = 'alivedb_chat_request'+'_'+ts+'_'+username+'_'+network+'_'+streamNetwork+'/'+streamer+'/'+streamLink
    return new Promise((rs,rj) => {
        if (network === 'blurt' && !window.blurt_keychain) return rj('Blurt Keychain is not installed')
        if (network === 'hive' && !window.hive_keychain) return rj('Hive Keychain is not installed')
        let kcext = network === 'hive' ? window.hive_keychain : window.blurt_keychain
        kcext.requestSignBuffer(username,stringified,'Posting',(result) => {
            console.log('KC SIGN',result)
            if (!result.success) return rj(result.error)
            rs(result.result)
        })
    })
}

async function modLogin() {
    let id = await getIdFromPub()
    if (!id)
        return alert('Account for AliveDB public key does not exist')
    gundbMod.auth(id,document.getElementById('moderatorpsw').value,(r) => {
        if (r.err)
            return alert(r.err)
        document.getElementById('moderatorpsw').style.display = 'none'
        document.getElementById('moderatorloginbtn').style.display = 'none'
        document.getElementById('modZone').style.display = 'block'
        subRequests('dtc')
        subRequests('hive')
        subRequests('blurt')
    })
}

async function approveUserBtn() {
    if (!document.getElementById('modApprUser').value) return alert('Target username is required')
    let keys = await getAccountKeys(document.getElementById('modApprUser').value,document.getElementById('modApprNetwork').value)
    approveParticipant(document.getElementById('modApprNetwork').value,document.getElementById('modApprUser').value,keys,true)
}

async function blacklistUserBtn() {
    if (!document.getElementById('modApprUser').value) return alert('Target username is required')
    blacklistParticipant(document.getElementById('modApprNetwork').value,document.getElementById('modApprUser').value,true)
}

function subRequests(network) {
    gundb.get('alivedb_chat_request/'+getLinkPath()+'/'+network).on((d) => {
        let k = Object.keys(d._['>'])
        for (let l in k) gundb.get(d[k[l]]['#']).on(()=>{})
    })
}

function getIdFromPub() {
    return new Promise((rs,rj) => {
        gundb.user(document.getElementById('streameralivedbpub').value).once((u) => {
            if (u && u.alias)
                rs(u.alias)
            else
                rs(null)
        })
    })
}

function getLinkPath() {
    return document.getElementById('streamnetworkselect').value+'/'+document.getElementById('streamerinput').value+'/'+document.getElementById('linkinput').value
}

function getGunChatPath() {
    return gundb
        .get('alivedb_chat')
        .get(document.getElementById('streamnetworkselect').value)
        .get(document.getElementById('streamerinput').value)
        .get(document.getElementById('linkinput').value)
}

function getGunChatRequestPath() {
    return gundb
        .get('alivedb_chat_request')
        .get(document.getElementById('streamnetworkselect').value)
        .get(document.getElementById('streamerinput').value)
        .get(document.getElementById('linkinput').value)
        .get(document.getElementById('usernetworkselect').value)
        .get(document.getElementById('usernameinput').value)
}

function getGunChatAuthPath() {
    return gundb
        .user(document.getElementById('streameralivedbpub').value)
        .get(getLinkPath()+'/participants')
}

function getGunItem(itemId) {
    return new Promise((rs,rj) => {
        gundb.get(itemId,(data) => {
            rs(data.put)
        })
    })
}