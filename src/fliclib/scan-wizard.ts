import { FlicRawClient } from './raw-client';
import { EventEmitter } from 'events';
import { FlicCommandOpcodes, FlicEventOpcodes } from './enum';

let counter = 0;

/*
 * FlicScanWizard
 *
 * First create a FlicScanWizard, then add it to the FlicClient.
 * 
 * Constructor: no parameters
 * 
 * Events:
 * foundPrivateButton: (no parameters)
 * foundPublicButton: bdAddr, name
 * buttonConnected: bdAddr, name
 * completed: result, bdAddr, name
 */
export class FlicScanWizard extends EventEmitter {
    private _id: number = counter++;
    private _bdaddr: string = null;
    private _name: string = null;

    constructor() {
        super();
    }

    public getId(): number {
        return this._id;
    };
		
    public attach(rawClient: FlicRawClient): void {
        rawClient.sendCommand(FlicCommandOpcodes.CreateScanWizard, {
            scanWizardId: this._id
        });
    }

    public detach(rawClient: FlicRawClient): void {
        rawClient.sendCommand(FlicCommandOpcodes.CancelScanWizard, {
            scanWizardId: this._id
        });
    }

    public _onEvent(opcode: number, event) {
        switch (opcode) {
            case FlicEventOpcodes.ScanWizardFoundPrivateButton:
                this.emit("foundPrivateButton");
                break;
            case FlicEventOpcodes.ScanWizardFoundPublicButton:
                this._bdaddr = event.bdAddr;
                this._name = event.name;
                this.emit("foundPublicButton", this._bdaddr, this._name);
                break;
            case FlicEventOpcodes.ScanWizardButtonConnected:
                this.emit("buttonConnected", this._bdaddr, this._name);
                break;
            case FlicEventOpcodes.ScanWizardCompleted:
                var bdaddr = this._bdaddr;
                var name = this._name;
                this._bdaddr = null;
                this._name = null;
                this.emit("completed", event.result, bdaddr, name);
                break;
        }
    }
}
