import * as mqtt from 'mqtt';
import { FlicButton } from './button';
import { FlicClient } from './client';

const logger = console;

const config = require('loke-config').create('flicmqtt');

const mqttClient  = mqtt.connect('mqtt://' + config.get('mqtt.host'));
let mqttConnected = false;

const client = new FlicClient();
client.on('error', (err) => {
  logger.warn(`Unable to connect to Flic daemon: ${err.message}`);
});

const buttons = [
  { id: 'one', address: '', topic: 'homenet/button/one/input' }
];

const buttonConnections: Array<FlicButton> = buttons.map(b => {
  const connection = client.getButton(b.id, b.address);
  connection.onClick(callback(b, '/click'));
  connection.onDoubleClick(callback(b, '/dblclick'));
  connection.onHold(callback(b, '/hold'));
  return connection;
});

function callback(buttonConfig: { topic: string }, suffix: string) {
  return () => {
    emit(buttonConfig.topic + suffix);
  };
}

function emit(topic) {
  mqttClient.publish(topic, JSON.stringify({ timestamp: new Date() }));
}

client.on('connect', function () {
  mqttConnected = true;
  // client.subscribe('presence')
  // client.publish('presence', 'Hello mqtt')
});

client.on('close', console.log);
client.on('offline', console.log);
// client.on('error', console.error);
// client.on('message', console.log);
 
// client.on('message', function (topic, message) {
//   // message is Buffer 
//   console.log(message.toString())
//   client.end()
// })
