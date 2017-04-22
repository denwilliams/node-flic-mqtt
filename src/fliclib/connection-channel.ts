import { FlicRawClient } from './raw-client';
import { EventEmitter } from 'events';
import { FlicCommandOpcodes, FlicEventOpcodes } from './enum';

let counter = 0;

/**
 * FlicConnectionChannel
 *
 * A logical connection to a Flic button.
 * First create a connection channel, then add it to a FlicClient.
 * 
 * Constructor: bdAddr, options
 *   options is a dictionary containing the optional parameters latencyMode and autoDisconnectTime
 * 
 * Properties:
 * latencyMode
 * autoDisconnectTime
 * 
 * Events:
 * 
 * createResponse: error, connectionStatus
 * removed: removedReason
 * connectionStatusChanged: connectionStatus, disconnectReason
 * 
 * buttonUpOrDown: clickType, wasQueued, timeDiff
 * buttonClickOrHold: clickType, wasQueued, timeDiff
 * buttonSingleOrDoubleClick: clickType, wasQueued, timeDiff
 * buttonSingleOrDoubleClickOrHold: clickType, wasQueued, timeDiff
 */
export class FlicConnectionChannel extends EventEmitter {
    private _client: any = null;
    private _id: any = counter++;
    private _latencyMode: string;
    private _autoDisconnectTime: number;
	
	constructor(private _bdAddr: string, options?: any) {
        super();
		options = options || {};
		this._latencyMode = options.latencyMode || "NormalLatency";
        this._autoDisconnectTime = options.autoDisconnectTime || 511;
	};

    get latencyMode() {
		return this._latencyMode;
    }

    set latencyMode(value) {
		this._latencyMode = value;
        if (this._client != null) {
            this._client.sendCommand(FlicCommandOpcodes.ChangeModeParameters, {
                connId: this._id,
                latencyMode: this._latencyMode,
                autoDisconnectTime: this._autoDisconnectTime
            });
        }
    }

    get autoDisconnectTime() {
		return this._autoDisconnectTime;
    }
    
    set autoDisconnectTime(value) {
		this._autoDisconnectTime = value;
        if (this._client != null) {
            this._client.sendCommand(FlicCommandOpcodes.ChangeModeParameters, {
                connId: this._id,
                latencyMode: this._latencyMode,
                autoDisconnectTime: this._autoDisconnectTime
            });
        }
    }
	
    public getId = function() {
        return this._id;
    };
    
    public attach = function(rawClient: FlicRawClient) {
        this._client = rawClient;
        rawClient.sendCommand(FlicCommandOpcodes.CreateConnectionChannel, {
            connId: this._id,
            bdAddr: this._bdAddr,
            latencyMode: this._latencyMode,
            autoDisconnectTime: this._autoDisconnectTime
        });
    }

    public detach = function(rawClient: FlicRawClient) {
        rawClient.sendCommand(FlicCommandOpcodes.RemoveConnectionChannel, {
            connId: this._id
        });
    }

    public _detached = function() {
        this._client = null;
    }

    public _onEvent = function(opcode: number, event: any) {
        switch (opcode) {
            case FlicEventOpcodes.CreateConnectionChannelResponse:
                this.emit("createResponse", event.error, event.connectionStatus);
                break;
            case FlicEventOpcodes.ConnectionStatusChanged:
                this.emit("connectionStatusChanged", event.connectionStatus, event.disconnectReason);
                break;
            case FlicEventOpcodes.ConnectionChannelRemoved:
                this.emit("removed", event.removedReason);
                break;
            case FlicEventOpcodes.ButtonUpOrDown:
                this.emit("buttonUpOrDown", event.clickType, event.wasQueued, event.timeDiff);
                break;
            case FlicEventOpcodes.ButtonClickOrHold:
                this.emit("buttonClickOrHold", event.clickType, event.wasQueued, event.timeDiff);
                break;
            case FlicEventOpcodes.ButtonSingleOrDoubleClick:
                this.emit("buttonSingleOrDoubleClick", event.clickType, event.wasQueued, event.timeDiff);
                break;
            case FlicEventOpcodes.ButtonSingleOrDoubleClickOrHold:
                this.emit("buttonSingleOrDoubleClickOrHold", event.clickType, event.wasQueued, event.timeDiff);
                break;
        }
    }
}
