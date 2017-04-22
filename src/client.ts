import { EventEmitter } from 'events';
import { FlicConnectionChannel, FlicClient as FlicLibClient } from './fliclib/index';
import { FlicButton } from './button';

export class FlicClient extends EventEmitter {
  private _client: any;
  private _online: boolean = false;
  private _buttons: any = [];

  constructor(public id: string = 'default', host: string = 'localhost', port: number = 5551) {
    super();
    this._init(host, port); // probably should move this to a start method
  }

  public getButton(id: string, address: string) : FlicButton {
    const channelFactory = () => {
      const channel = new FlicConnectionChannel(address);
      this._client.addConnectionChannel(channel);
      return channel;
    };
    const button = new FlicButton(channelFactory);
    this._buttons.push(button);
    return button;
  }

  public start() : void {

  }

  private _init(host: string, port: number) {
    const client = new FlicLibClient(host, port);
    let interval;

    client.on('ready', () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      if (this._online) return;
      this._online = true;
      this.emit('online');
      this._buttons.forEach((button: FlicButton) => {
        button.updateChannel();
      });
    });

    client.on('error', error => {
      this.emit('error', error);
    });

    client.on('close', hadError => {
      if (!interval) {
        interval = setInterval(() => {
          client.reconnect();
        }, 30000);
      }
      if (!this._online) return;
      this._online = false;
      this.emit('offline');
    });

    // client.on('bluetoothControllerStateChange', state => {
    //   console.log("Bluetooth controller state change: " + state);
    // });

    // client.on("newVerifiedButton", bdAddr => {
    //   console.log("A new button was added: " + bdAddr);
    //   listenToButton(bdAddr);
    // });

    this._client = client;
  }
}
