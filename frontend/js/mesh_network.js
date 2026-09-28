/**
 * Frontend BLE Mesh & BroadcastChannel Peer-to-Peer Sync Engine
 */

class ClientMeshNetwork {
    constructor(onPacketReceived) {
        this.onPacketReceived = onPacketReceived;
        this.channel = new BroadcastChannel('ndrf_mesh_network');
        this.ws = null;
        this.initBroadcastChannel();
        this.initWebSocket();
    }

    initBroadcastChannel() {
        this.channel.onmessage = (event) => {
            console.log("📡 Peer Mesh Broadcast Received:", event.data);
            if (this.onPacketReceived) {
                this.onPacketReceived(event.data);
            }
        };
    }

    initWebSocket() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'SOS_BROADCAST' && this.onPacketReceived) {
                        this.onPacketReceived(data.payload);
                    }
                } catch (e) {}
            };

            this.ws.onerror = () => {
                console.warn("WebSocket fallback: Mesh running on Local BroadcastChannel");
            };
        } catch (e) {
            console.warn("WebSocket not available");
        }
    }

    broadcastSOS(sosPacket) {
        const payload = {
            ...sosPacket,
            hops: (sosPacket.hops || 0) + 1,
            meshRelayedAt: Date.now()
        };

        // Broadcast locally to all browser tabs / peer windows
        this.channel.postMessage(payload);

        // Send via WebSocket if connected
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'SOS_BROADCAST', payload }));
        }

        return payload;
    }
}
