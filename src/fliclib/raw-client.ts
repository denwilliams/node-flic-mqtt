import { Socket } from 'net';
import { FlicEventOpcodes, FlicCommandOpcodes } from './enum';

const enumValues = {
    CreateConnectionChannelError: {
        NoError: 0,
        MaxPendingConnectionsReached: 1
    },
    ConnectionStatus: {
        Disconnected: 0,
        Connected: 1,
        Ready: 2
    },

    DisconnectReason: {
        Unspecified: 0,
        ConnectionEstablishmentFailed: 1,
        TimedOut: 2,
        BondingKeysMismatch: 3
    },

    RemovedReason: {
        RemovedByThisClient: 0,
        ForceDisconnectedByThisClient: 1,
        ForceDisconnectedByOtherClient: 2,
        
        ButtonIsPrivate: 3,
        VerifyTimeout: 4,
        InternetBackendError: 5,
        InvalidData: 6,
        
        CouldntLoadDevice: 7
    },

    ClickType: {
        ButtonDown: 0,
        ButtonUp: 1,
        ButtonClick: 2,
        ButtonSingleClick: 3,
        ButtonDoubleClick: 4,
        ButtonHold: 5
    },

    BdAddrType: {
        PublicBdAddrType: 0,
        RandomBdAddrType: 1
    },

    LatencyMode: {
        NormalLatency: 0,
        LowLatency: 1,
        HighLatency: 2
    },

    ScanWizardResult: {
        WizardSuccess: 0,
        WizardCancelledByUser: 1,
        WizardFailedTimeout: 2,
        WizardButtonIsPrivate: 3,
        WizardBluetoothUnavailable: 4,
        WizardInternetBackendError: 5,
        WizardInvalidData: 6
    },

    BluetoothControllerState: {
        Detached: 0,
        Resetting: 1,
        Attached: 2
    }
};

/**
 * FlicRawClient
 *
 * This is a low level client that is used by the high level FlicClient below.
 *
 */
export class FlicRawClient {
    public onOpen = function(event) {};
    public onClose = function(hadError) {};
    public onEvent = function(opcode, evt) {};
    public onError = function(error) {};

    private _socket: any;
    private _connecting: boolean;

    constructor(private _inetAddress: string, private _port: number) {
        this._socket = new Socket();

        const self = this;
        this._socket.on("close", onClose);
        this._socket.on("error", onError);
        this._socket.on("data", onData);
        this._socket.on("connect", (event) => {
            this._connecting = false;
            this.onOpen(event);
        });


        function onClose(had_error) {
            self._connecting = false;
            self.onClose(had_error);
        }
        
        function onError(error) {
            self._connecting = false;
            self.onError(error);
        }
        
        var currentPacketData = null;
        
        function onData(data) {
            currentPacketData = currentPacketData == null ? data : Buffer.concat([currentPacketData, data], currentPacketData.length + data.length);
            while (currentPacketData.length >= 2) {
                var len = currentPacketData[0] | (currentPacketData[1] << 8);
                if (currentPacketData.length >= 2 + len) {
                    var packet = currentPacketData.slice(2, 2 + len);
                    currentPacketData = currentPacketData.slice(2 + len);
                    if (packet.length > 0) {
                        self._onMessage(packet);
                    }
                } else {
                    break;
                }
            }
        }

        this.reconnect();
    }

    reconnect() {
        if (this._connecting) return;

        this._connecting = true;
        this._socket = this._socket.connect({host: this._inetAddress, port: this._port});
    }

    sendCommand(opcode: number, obj: any) {
        var arrayBuffer = new ArrayBuffer(100);
        var arr = new Uint8Array(arrayBuffer);
        var pos = 2;
        function writeUInt8(v) {
            arr[pos++] = v;
        }
        function writeInt16(v) {
            arr[pos++] = v;
            arr[pos++] = v >> 8;
        }
        function writeInt32(v) {
            writeInt16(v);
            writeInt16(v >> 16);
        }
        function writeBdAddr(v) {
            for (var i = 15; i >= 0; i -= 3) {
                writeUInt8(parseInt(v.substr(i, 2), 16));
            }
        }
        function writeEnum(type, v) {
            writeUInt8(enumValues[type][v]);
        }
        
        writeUInt8(opcode);
        switch (opcode) {
            case FlicCommandOpcodes.GetInfo: {
                break;
            }
            case FlicCommandOpcodes.CreateScanner:
            case FlicCommandOpcodes.RemoveScanner: {
                writeInt32(obj.scanId);
                break;
            }
            case FlicCommandOpcodes.CreateConnectionChannel: {
                writeInt32(obj.connId);
                writeBdAddr(obj.bdAddr);
                writeEnum("LatencyMode", obj.latencyMode);
                writeInt16(obj.autoDisconnectTime);
                break;
            }
            case FlicCommandOpcodes.RemoveConnectionChannel: {
                writeInt32(obj.connId);
                break;
            }
            case FlicCommandOpcodes.ForceDisconnect:
            case FlicCommandOpcodes.GetButtonUUID: {
                writeBdAddr(obj.bdAddr);
                break;
            }
            case FlicCommandOpcodes.ChangeModeParameters: {
                writeInt32(obj.connId);
                writeEnum("LatencyMode", obj.latencyMode);
                writeInt16(obj.autoDisconnectTime);
                break;
            }
            case FlicCommandOpcodes.Ping: {
                writeInt32(obj.pingId);
                break;
            }
            case FlicCommandOpcodes.CreateScanWizard:
            case FlicCommandOpcodes.CancelScanWizard: {
                writeInt32(obj.scanWizardId);
                break;
            }
            default:
                return;
        }
        arr[0] = (pos - 2) & 0xff;
        arr[1] = (pos - 2) >> 8;
        var buffer = createBuffer(arrayBuffer, 0, pos);
        this._socket.write(buffer);
    };   

    close() {
        this._socket.destroy();
    };

    private _onMessage(pkt) {
        var pos = 0;
        function readUInt8() {
            return pkt[pos++];
        }
        function readInt8() {
            return (readUInt8() << 24) >> 24;
        }
        function readUInt16() {
            return pkt[pos++] | (pkt[pos++] << 8);
        }
        function readInt16() {
            return (readUInt16() << 16) >> 16;
        }
        function readInt32() {
            return readUInt16() | (readUInt16() << 16);
        }
        function readBdAddr() {
            var str = "";
            for (var i = 5; i >= 0; i--) {
                str += (0x100 + pkt[pos + i]).toString(16).substr(-2);
                if (i != 0) {
                    str += ":";
                }
            }
            pos += 6;
            return str;
        }
        function readName() {
            var len = readUInt8();
            var nameString = pkt.slice(pos, pos + len).toString();
            pos += 16;
            return nameString;
        }
        function readBoolean() {
            return readUInt8() != 0;
        }
        function readEnum(type) {
            var value = readUInt8();
            var values = enumValues[type];
            for (var key in values) {
                if (values.hasOwnProperty(key)) {
                    if (values[key] == value) {
                        return key;
                    }
                }
            }
        }
        function readUuid() {
            var str = "";
            for (var i = 0; i < 16; i++) {
                str += (0x100 + pkt[pos + i]).toString(16).substr(-2);
            }
            pos += 16;
            if (str == "00000000000000000000000000000000") {
                str = null;
            }
            return str;
        }
        
        var opcode = readUInt8();
        var evt: any;
        switch (opcode) {
            case FlicEventOpcodes.AdvertisementPacket: {
                evt = {
                    scanId: readInt32(),
                    bdAddr: readBdAddr(),
                    name: readName(),
                    rssi: readInt8(),
                    isPrivate: readBoolean(),
                    alreadyVerified: readBoolean()
                };
                this.onEvent(opcode, evt);
                break;
            }
            case FlicEventOpcodes.CreateConnectionChannelResponse: {
                evt = {
                    connId: readInt32(),
                    error: readEnum("CreateConnectionChannelError"),
                    connectionStatus: readEnum("ConnectionStatus")
                };
                this.onEvent(opcode, evt);
                break;
            }
            case FlicEventOpcodes.ConnectionStatusChanged: {
                evt = {
                    connId: readInt32(),
                    connectionStatus: readEnum("ConnectionStatus"),
                    disconnectReason: readEnum("DisconnectReason")
                };
                this.onEvent(opcode, evt);
                break;
            }
            case FlicEventOpcodes.ConnectionChannelRemoved: {
                evt = {
                    connId: readInt32(),
                    removedReason: readEnum("RemovedReason")
                };
                this.onEvent(opcode, evt);
                break;
            }
            case FlicEventOpcodes.ButtonUpOrDown:
            case FlicEventOpcodes.ButtonClickOrHold:
            case FlicEventOpcodes.ButtonSingleOrDoubleClick:
            case FlicEventOpcodes.ButtonSingleOrDoubleClickOrHold: {
                evt = {
                    connId: readInt32(),
                    clickType: readEnum("ClickType"),
                    wasQueued: readBoolean(),
                    timeDiff: readInt32()
                }
                this.onEvent(opcode, evt);
                break;
            }
            case FlicEventOpcodes.NewVerifiedButton: {
                evt = {
                    bdAddr: readBdAddr()
                };
                this.onEvent(opcode, evt);
                break;
            }
            case FlicEventOpcodes.GetInfoResponse: {
                evt = {
                    bluetoothControllerState: readEnum("BluetoothControllerState"),
                    myBdAddr: readBdAddr(),
                    myBdAddrType: readEnum("BdAddrType"),
                    maxPendingConnections: readUInt8(),
                    maxConcurrentlyConnectedButtons: readInt16(),
                    currentPendingConnections: readUInt8(),
                    currentlyNoSpaceForNewConnection: readBoolean(),
                    bdAddrOfVerifiedButtons: new Array(readUInt16())
                };
                for (var i = 0; i < evt.bdAddrOfVerifiedButtons.length; i++) {
                    evt.bdAddrOfVerifiedButtons[i] = readBdAddr();
                }
                this.onEvent(opcode, evt);
                break;
            }
            case FlicEventOpcodes.NoSpaceForNewConnection:
            case FlicEventOpcodes.GotSpaceForNewConnection: {
                evt = {
                    maxConcurrentlyConnectedButtons: readUInt8()
                };
                this.onEvent(opcode, evt);
                break;
            }
            case FlicEventOpcodes.BluetoothControllerStateChange: {
                evt = {
                    state: readEnum("BluetoothControllerState")
                };
                this.onEvent(opcode, evt);
                break;
            }
            case FlicEventOpcodes.PingResponse: {
                evt = {
                    pingId: readInt32()
                }
                this.onEvent(opcode, evt);
                break;
            }
            case FlicEventOpcodes.GetButtonUUIDResponse: {
                evt = {
                    bdAddr: readBdAddr(),
                    uuid: readUuid()
                };
                this.onEvent(opcode, evt);
                break;
            }
            case FlicEventOpcodes.ScanWizardFoundPrivateButton:
            case FlicEventOpcodes.ScanWizardButtonConnected: {
                evt = {
                    scanWizardId: readInt32()
                };
                this.onEvent(opcode, evt);
                break;
            }
            case FlicEventOpcodes.ScanWizardFoundPublicButton: {
                evt = {
                    scanWizardId: readInt32(),
                    bdAddr: readBdAddr(),
                    name: readName()
                };
                this.onEvent(opcode, evt);
                break;
            }
            case FlicEventOpcodes.ScanWizardCompleted: {
                evt = {
                    scanWizardId: readInt32(),
                    result: readEnum("ScanWizardResult")
                };
                this.onEvent(opcode, evt);
                break;
            }
        }
    }
}

function createBuffer(arr, offset, len) {
	arr = new Uint8Array(arr, offset, len);
	return new Buffer(arr);
}
