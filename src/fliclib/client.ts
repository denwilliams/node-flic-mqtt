import { FlicBatteryStatusListener } from "./battery-status-listener";
import { FlicConnectionChannel } from "./connection-channel";
import { FlicScanWizard } from "./scan-wizard";
import { FlicScanner } from "./scanner";
import { EventEmitter } from "events";
import { FlicRawClient } from "./raw-client";
import { FlicEventOpcodes, FlicCommandOpcodes } from "./enum";

interface Dict<T> {
  [index: string]: T;
}

/**
 * FlicClient
 *
 * High level class for communicating with flicd through a WebSocket proxy.
 *
 * Constructor: host, [port]
 *
 * Methods:
 * addScanner: FlicScanner
 * removeScanner: FlicScanner
 * addScanWizard: FlicScanWizard
 * cancelScanWizard: FlicScanWizard
 * addConnectionChannel: FlicConnectionChannel
 * removeConnectionChannel: FlicConnectionChannel
 * addBatteryStatusListener: FlicBatteryStatusListener
 * removeBatteryStatusListener: FlicBatteryStatusListener
 * getInfo: a callback function with one parameter "info", where info is a dictionary containing:
 *   bluetoothControllerState,
 *   myBdAddr,
 *   myBdAddrType,
 *   maxPendingConnections,
 *   maxConcurrentlyConnectedButtons,
 *   currentPendingConnections,
 *   bdAddrOfVerifiedButtons
 * getButtonInfo: bdAddr, callback
 *   Callback parameters: bdAddr, uuid, color, serialNumber
 * deleteButton: bdAddr
 * close
 *
 *
 * Events:
 * ready: (no parameters)
 * close: hadError
 * error: error
 * newVerifiedButton: bdAddr
 * noSpaceForNewConnection: maxConcurrentlyConnectedButtons
 * gotSpaceForNewConnection: maxConcurrentlyConnectedButtons
 * bluetoothControllerState: state
 * buttonDeleted: bdAddr, deletedByThisClient
 */
export class FlicClient extends EventEmitter {
  private _rawClient: FlicRawClient;
  private _scanners: Dict<FlicScanner> = {};
  private _scanWizards: Dict<FlicScanWizard> = {};
  private _connectionChannels: Dict<FlicConnectionChannel> = {};
  private _batteryStatusListeners: Dict<FlicBatteryStatusListener> = {};

  private _getInfoResponseCallbackQueue: Array<Function> = [];
  private _getButtonInfoCallbackQueue: Array<Function> = [];

  constructor(host, port) {
    super();
    this._rawClient = new FlicRawClient(host, port || 5551);

    this._rawClient.onOpen = () => {
      this.emit("ready");
    };

    this._rawClient.onClose = (hadError) => {
      for (var connId in this._connectionChannels) {
        if (this._connectionChannels.hasOwnProperty(connId)) {
          this._connectionChannels[connId]._detached();
        }
      }
      this.emit("close", hadError);
    };

    this._rawClient.onEvent = (opcode, event) => {
      switch (opcode) {
        case FlicEventOpcodes.AdvertisementPacket: {
          if (this._scanners[event.scanId]) {
            this._scanners[event.scanId]._onEvent(opcode, event);
          }
          break;
        }
        case FlicEventOpcodes.CreateConnectionChannelResponse:
        case FlicEventOpcodes.ConnectionStatusChanged:
        case FlicEventOpcodes.ConnectionChannelRemoved:
        case FlicEventOpcodes.ButtonUpOrDown:
        case FlicEventOpcodes.ButtonClickOrHold:
        case FlicEventOpcodes.ButtonSingleOrDoubleClick:
        case FlicEventOpcodes.ButtonSingleOrDoubleClickOrHold: {
          if (this._connectionChannels[event.connId]) {
            var cc: FlicConnectionChannel = this._connectionChannels[
              event.connId
            ];
            if (
              (opcode == FlicEventOpcodes.CreateConnectionChannel &&
                event.error != "NoError") ||
              opcode == FlicEventOpcodes.ConnectionChannelRemoved
            ) {
              delete this._connectionChannels[event.connId];
              cc._detached();
            }
            cc._onEvent(opcode, event);
          }
          break;
        }
        case FlicEventOpcodes.NewVerifiedButton: {
          this.emit("newVerifiedButton", event.bdAddr);
          break;
        }
        case FlicEventOpcodes.GetInfoResponse: {
          var callback = this._getInfoResponseCallbackQueue.shift();
          callback(event);
          break;
        }
        case FlicEventOpcodes.NoSpaceForNewConnection: {
          this.emit(
            "noSpaceForNewConnection",
            event.maxConcurrentlyConnectedButtons
          );
          break;
        }
        case FlicEventOpcodes.GotSpaceForNewConnection: {
          this.emit(
            "gotSpaceForNewConnection",
            event.maxConcurrentlyConnectedButtons
          );
          break;
        }
        case FlicEventOpcodes.BluetoothControllerStateChange: {
          this.emit("bluetoothControllerStateChange", event.state);
          break;
        }
        case FlicEventOpcodes.GetButtonInfoResponse: {
          var callback = this._getButtonInfoCallbackQueue.shift();
          callback(event.bdAddr, event.uuid, event.color, event.serialNumber);
          break;
        }
        case FlicEventOpcodes.ScanWizardFoundPrivateButton:
        case FlicEventOpcodes.ScanWizardFoundPublicButton:
        case FlicEventOpcodes.ScanWizardButtonConnected:
        case FlicEventOpcodes.ScanWizardCompleted: {
          if (this._scanWizards[event.scanWizardId]) {
            var scanWizard: FlicScanWizard = this._scanWizards[
              event.scanWizardId
            ];
            if (opcode == FlicEventOpcodes.ScanWizardCompleted) {
              delete this._scanWizards[event.scanWizardId];
            }
            scanWizard._onEvent(opcode, event);
          }
          break;
        }
        case FlicEventOpcodes.ButtonDeleted: {
          this.emit("buttonDeleted", event.bdAddr, event.deletedByThisClient);
          break;
        }
        case FlicEventOpcodes.BatteryStatus: {
          if (this._batteryStatusListeners[event.listenerId]) {
            this._batteryStatusListeners[event.listenerId].onEvent(
              opcode,
              event
            );
          }
          break;
        }
      }
    };

    this._rawClient.onError = (error) => {
      this.emit("error", error);
    };
  }

  reconnect() {
    this._rawClient.reconnect();
  }

  addScanner(flicScanner: FlicScanner) {
    if (flicScanner.getId() in this._scanners) {
      return;
    }
    this._scanners[flicScanner.getId()] = flicScanner;
    flicScanner.attach(this._rawClient);
  }

  removeScanner(flicScanner: FlicScanner) {
    if (!(flicScanner.getId() in this._scanners)) {
      return;
    }
    delete this._scanners[flicScanner.getId()];
    flicScanner.detach(this._rawClient);
  }

  addScanWizard(flicScanWizard: FlicScanWizard) {
    if (flicScanWizard.getId() in this._scanWizards) {
      return;
    }
    this._scanWizards[flicScanWizard.getId()] = flicScanWizard;
    flicScanWizard.attach(this._rawClient);
  }

  cancelScanWizard = function (flicScanWizard: FlicScanWizard) {
    if (!(flicScanWizard.getId() in this._scanWizards)) {
      return;
    }
    flicScanWizard.detach(this._rawClient);
  };

  addConnectionChannel(connectionChannel: FlicConnectionChannel) {
    if (connectionChannel.getId() in this._connectionChannels) {
      return;
    }
    this._connectionChannels[connectionChannel.getId()] = connectionChannel;
    connectionChannel.attach(this._rawClient);
  }

  removeConnectionChannel(connectionChannel: FlicConnectionChannel) {
    if (!(connectionChannel.getId() in this._connectionChannels)) {
      return;
    }
    connectionChannel.detach(this._rawClient);
  }

  addBatteryStatusListener(listener) {
    if (listener._getId() in this._batteryStatusListeners) {
      return;
    }
    this._batteryStatusListeners[listener._getId()] = listener;
    listener._attach(this._rawClient);
  }

  removeBatteryStatusListener(listener) {
    if (!(listener._getId() in this._batteryStatusListeners)) {
      return;
    }
    listener._detach(this._rawClient);
  }

  getInfo(callback: Function) {
    this._getInfoResponseCallbackQueue.push(callback);
    this._rawClient.sendCommand(FlicCommandOpcodes.GetInfo, {});
  }

  getButtonInfo(bdAddr: string, callback: Function) {
    this._getButtonInfoCallbackQueue.push(callback);
    this._rawClient.sendCommand(FlicCommandOpcodes.GetButtonInfo, {
      bdAddr: bdAddr,
    });
  }

  deleteButton(bdAddr) {
    this._rawClient.sendCommand(FlicCommandOpcodes.DeleteButton, {
      bdAddr: bdAddr,
    });
  }

  close() {
    this._rawClient.close();
  }
}
