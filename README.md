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

## Configuration

Refer to the [config docs](https://aliveprotocol.com/docs/alivedb/config) for details.

## HTTP API

Refer to the [REST API docs](https://aliveprotocol.com/docs/alivedb/rest-api) for details.