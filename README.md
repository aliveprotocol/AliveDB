# AliveDB

Off-chain GunDB database for Alive streams and optionally live chat messages.

## Overview

This package provides the core implementation of the database schematics of AliveDB within GunDB along with the APIs to interact with it. It is used in [Alive-CLI](https://github.com/aliveprotocol/Alive-CLI) to perform authenticated tasks such as publishing .ts segment hashes to off-chain cache. It also acts as a standalone AliveDB GUN relay peer.

Most applications should only use a reduced implementation of [alivedb.js](https://github.com/aliveprotocol/AliveDB/blob/master/src/alivedb.js).

## Installation

### Standalone installation
```
git clone https://github.com/aliveprotocol/AliveDB
cd AliveDB
npm i
```

### Using as submodule
```
git submodule add https://github.com/aliveprotocol/AliveDB [submodule_dir]
```

### Starting AliveDB server
```
npm start
```

### Compile as self-contained executable
```
npm run build
```

## Configuration

AliveDB can be configured using command line args or env vars. Command line args takes precedence over env vars.

|Argument|Env Var|Description|Default|
|-|-|-|-|
|`--data_dir`|`ALIVEDB_DATA_DIR`|Directory for GunDB database|.radata|
|`--peers`|`ALIVEDB_PEERS`|List of bootstrap peers *(comma-seperated)*||
|`--http_port`|`ALIVEDB_HTTP_PORT`|HTTP port|3006|
|`--gun_port`|`ALIVEDB_GUN_PORT`|Gun P2P port|3007|
|`--chat_listener`|`ALIVEDB_CHAT_LISTENER`|Stream link for participant auto-authorization. Format: `network/username/link`||
|`--login_id`|`ALIVEDB_LOGIN_ID`|User ID for login on startup||
|`--login_pub`|`ALIVEDB_LOGIN_PUB`|Public key for login on startup||
|`--login_password`|`ALIVEDB_LOGIN_PASSWORD`|Password for login on startup||

## HTTP API

### Create user
```
curl -s --header "Content-Type: application/json" --data '{"key":"unsafePassword"}' http://localhost:3006/createUser | jq

{
    "id": "g6xic80hkpi79p9b",
    "pub": "a4DAmyHA23xjuLc3XRcb5JdTrhH1HKJ5cqZhzkHO4kA.gGMwrIavPWOl07XVyQnGpGuNZAe3UbDC4bWvaulbsaA"
}
```

You will need either the ID or public key to login to your newly created account.

### User ID login
```
curl -s --header "Content-Type: application/json" --data '{"id":"g6xic80hkpi79p9b","key":"unsafePassword"}' http://localhost:3006/loginUser | jq

{
    "success": true
}
```

### Public key login
```
curl -s --header "Content-Type: application/json" --data '{"pub":"a4DAmyHA23xjuLc3XRcb5JdTrhH1HKJ5cqZhzkHO4kA.gGMwrIavPWOl07XVyQnGpGuNZAe3UbDC4bWvaulbsaA","key":"unsafePassword"}' http://localhost:3006/loginUser | jq

{
    "success": true
}
```

### Fetch stream participants
```
curl -s http://localhost:3006/fetchParticipantsKeys | jq

{
    "avalon": {},
    "hive": {
        "aliveprotocol": [
            "STM8FXZ5eGEGmQbDLG6vf97Qd76vpwSH9ydFn8wPu37cA68HkGgrX"
        ]
    },
    "blurt": {
        "aliveprotocol": [
            "BLT5CoRk4kfR8Ggs4m2V3RxioQRy5eeBtcYBJCq7zLEczZjkfDXQQ"
        ]
    }
}
```

### Get current user
```
curl -s http://localhost:3006/currentUser | jq

{
    "pub": "a4DAmyHA23xjuLc3XRcb5JdTrhH1HKJ5cqZhzkHO4kA.gGMwrIavPWOl07XVyQnGpGuNZAe3UbDC4bWvaulbsaA",
    "epub": "JWTzFN-8L6iPS-3CTgXhVYLbWfaYWMSVi-ZRiqXEozs.8SYPKKZcg4REu87ElMWPZ3OGNoQCOFju1q9YgCzQgnA",
    "alias": "g6xic80hkpi79p9b",
    "loggedIn": true
}
```

### Push new stream
```
curl -s --header "Content-Type: application/json" --data '{"network":"hive","streamer":"techcoderx","link":"stream1","stream":{"src":"QmNoa96v5gCfnzsdEbzZtrJvuXH14hS8k8DPPUQbdJMy7i","len":10}}' http://localhost:3006/pushStream | jq

{
    "success": true
}
```

### Get stream with public key
```
curl -s 'http://localhost:3006/getStream?pub=a4DAmyHA23xjuLc3XRcb5JdTrhH1HKJ5cqZhzkHO4kA.gGMwrIavPWOl07XVyQnGpGuNZAe3UbDC4bWvaulbsaA&network=hive&streamer=techcoderx&link=stream1&ts=189394384393' | jq

[
    {
        "src": "QmNoa96v5gCfnzsdEbzZtrJvuXH14hS8k8DPPUQbdJMy7i",
        "len": 10
    }
]
```
