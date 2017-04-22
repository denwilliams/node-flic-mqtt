export const FlicCommandOpcodes = {
	GetInfo: 0,
	CreateScanner: 1,
	RemoveScanner: 2,
	CreateConnectionChannel: 3,
	RemoveConnectionChannel: 4,
	ForceDisconnect: 5,
	ChangeModeParameters: 6,
	Ping: 7,
	GetButtonUUID: 8,
	CreateScanWizard: 9,
	CancelScanWizard: 10
};

export const FlicEventOpcodes = {
	AdvertisementPacket: 0,
	CreateConnectionChannel: 1,
	CreateConnectionChannelResponse: 1,
	ConnectionStatusChanged: 2,
	ConnectionChannelRemoved: 3,
	ButtonUpOrDown: 4,
	ButtonClickOrHold: 5,
	ButtonSingleOrDoubleClick: 6,
	ButtonSingleOrDoubleClickOrHold: 7,
	NewVerifiedButton: 8,
	GetInfoResponse: 9,
	NoSpaceForNewConnection: 10,
	GotSpaceForNewConnection: 11,
	BluetoothControllerStateChange: 12,
	PingResponse: 13,
	GetButtonUUIDResponse: 14,
	ScanWizardFoundPrivateButton: 15,
	ScanWizardFoundPublicButton: 16,
	ScanWizardButtonConnected: 17,
	ScanWizardCompleted: 18
};
