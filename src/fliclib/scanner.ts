import { FlicRawClient } from './raw-client';
import { EventEmitter } from 'events';
import { FlicCommandOpcodes, FlicEventOpcodes } from './enum';

let counter = 0;

/*
 * FlicScanner
 *
 * First create a FlicScanner, then add it to the FlicClient.
 * 
 * Constructor: no parameters
 * 
 * Events:
 * advertisementPacket: bdAddr, name, rssi, isPrivate, alreadyVerified
 */
export class FlicScanner extends EventEmitter {
	private _id: number = counter++;

	constructor() {
		super();
	}

	public getId() {
		return this._id;
	}
	
	public attach(rawClient: FlicRawClient) {
		rawClient.sendCommand(FlicCommandOpcodes.CreateScanner, {
			scanId: this._id
		});
	}

	public detach = function(rawClient: FlicRawClient) {
		rawClient.sendCommand(FlicCommandOpcodes.RemoveScanner, {
			scanId: this._id
		});
	}

	public _onEvent = function(opcode: number, event: any) {
		switch (opcode) {
			case FlicEventOpcodes.AdvertisementPacket:
				this.emit("advertisementPacket", event.bdAddr, event.name, event.rssi, event.isPrivate, event.alreadyVerified);
				break;
		}
	}
}
