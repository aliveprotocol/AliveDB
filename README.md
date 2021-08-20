# AliveDB

Off-chain GunDB database for Alive streams and live chat messages.

## Overview

This package provides the core implementation of the database schematics of AliveDB along with the APIs to interact with it. It is used in [Alive-CLI](https://github.com/aliveprotocol/Alive-CLI) to perform authenticated tasks such as publishing .ts segment hashes to off-chain cache. It can also act as a standalone AliveDB GUN relay peer, although this is usually bundled with Avalon and [HAlive](https://github.com/aliveprotocol/HAlive).

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

## Configuration

AliveDB can be configured using command line args or env vars. Command line args takes precedence over env vars.

|Argument|Env Var|Description|Default|
|-|-|-|-|
|`--data_dir`|`ALIVEDB_DATA_DIR`|Directory for GunDB database|.radata|
|`--peers`|`ALIVEDB_PEERS`|List of bootstrap peers *(comma-seperated)*||
|`--http_port`|`ALIVEDB_HTTP_PORT`|HTTP port|3006|
|`--gun_port`|`ALIVEDB_GUN_PORT`|Gun P2P port|3007|
|`--chat_listener`|`ALIVEDB_CHAT_LISTENER`|Stream link for participant auto-authorization. Format: `network/username/link`||

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
    "dtc": {
        "techcoderx": [
            "2A2No4SzEG1k3YyKnQ2CBtrDXoMmeSqsfjs6AvDVMV8TA",
            "g1mUHD7s8U7yvAoJPT5xpG5VXg1zqFKBiLU6PGm6T3Ee",
            "2AoapLZKcoCP9etJndt3TxaEW4EbMuJ8D4AtBrGDKKjjY"
        ]
    },
    "hive": {},
    "steem": {}
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
curl -s --header "Content-Type: application/json" --data '{"network":"dtc","streamer":"techcoderx","link":"stream1","stream":{"src":"QmNoa96v5gCfnzsdEbzZtrJvuXH14hS8k8DPPUQbdJMy7i","len":10}}' http://localhost:3006/pushStream | jq

{
    "success": true
}
```

### Get stream with public key
```
curl -s 'http://localhost:3006/getStream?pub=a4DAmyHA23xjuLc3XRcb5JdTrhH1HKJ5cqZhzkHO4kA.gGMwrIavPWOl07XVyQnGpGuNZAe3UbDC4bWvaulbsaA&network=dtc&streamer=techcoderx&link=stream1' | jq

[
    {
        "src": "QmNoa96v5gCfnzsdEbzZtrJvuXH14hS8k8DPPUQbdJMy7i",
        "len": 10
    }
]
```
