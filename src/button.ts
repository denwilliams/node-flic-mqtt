import { EventEmitter } from "events";

export class FlicButton extends EventEmitter {
  constructor(private channelFactory: Function) {
    super();
  }

  updateChannel() {
    const channel = this.channelFactory();
    channel.on(
      "buttonSingleOrDoubleClickOrHold",
      (clickType, wasQueued, timeDiff) => {
        // console.log(bdAddr + " " + clickType + " " + (wasQueued ? "wasQueued" : "notQueued") + " " + timeDiff + " seconds ago");
        switch (clickType) {
          case "ButtonSingleClick":
            this.emit("click");
            break;
          case "ButtonDoubleClick":
            this.emit("doubleclick");
            break;
          case "ButtonHold":
            this.emit("hold");
            break;
        }
      }
    );
    // channel.on("buttonUpOrDown", function(clickType, wasQueued, timeDiff) {
    //   console.log(bdAddr + " " + clickType + " " + (wasQueued ? "wasQueued" : "notQueued") + " " + timeDiff + " seconds ago");
    // });
    // channel.on("connectionStatusChanged", function(connectionStatus, disconnectReason) {
    //   console.log(bdAddr + " " + connectionStatus + (connectionStatus == "Disconnected" ? " " + disconnectReason : ""));
    // });
  }

  onClick(cb: Function) {
    this.on("click", cb);
  }

  onDoubleClick(cb: Function) {
    this.on("doubleclick", cb);
  }

  onHold(cb: Function) {
    this.on("hold", cb);
  }
}
