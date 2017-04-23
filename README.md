# node-flic-mqtt
Publishes Flic button presses to MQTT.

Requires a [Flic server](https://github.com/50ButtonsEach/fliclib-linux-hci) to connect to.

Intended to be run on the same Linux host as the Flic server.

[![Build Status](https://travis-ci.org/denwilliams/node-flic-mqtt.svg?branch=master)](https://travis-ci.org/denwilliams/node-flic-mqtt)

# Usage

Install globally: `npm i -g flic-mqtt`.

Place a config.yml file at `/etc/flicmqtt/config.yml`.

Eg:
```yml
---

mqtt:
  host: '192.168.0.123'
buttons:
  - id: 'one'
    address: '80:e0:d0:70:e0:50'
    topic: 'button/one'
  - id: 'two'
    address: '80:e0:d0:60:30:20'
    topic: 'button/two'
```

Run: `flic-mqtt`.
