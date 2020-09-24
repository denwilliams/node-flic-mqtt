import { EventEmitter } from "events";
import { FlicEventOpcodes, FlicCommandOpcodes } from "./enum";

let counter = 0;

/*
 * FlicBatteryStatusListener
 *
 * First create a FlicBatteryStatusListener, then add it to the FlicClient.
 *
 * Constructor: bdAddr
 *
 * Events:
 * batteryStatus: batteryPercentage, timestamp (JS Date object)
 */
export class FlicBatteryStatusListener extends EventEmitter {
  private _id: number = counter++;

  constructor(private _bdAddr: string) {
    super();
  }

  public getId(): number {
    return this._id;
  }

  public attach(rawClient) {
    rawClient.sendCommand(FlicCommandOpcodes.CreateBatteryStatusListener, {
      listenerId: this._id,
      bdAddr: this._bdAddr,
    });
  }
  public detach(rawClient) {
    rawClient.sendCommand(FlicCommandOpcodes.RemoveBatteryStatusListener, {
      listenerId: this._id,
    });
  }
  public onEvent(opcode, event) {
    switch (opcode) {
      case FlicEventOpcodes.BatteryStatus:
        this.emit("batteryStatus", event.batteryPercentage, event.timestamp);
        break;
    }
  }
}
