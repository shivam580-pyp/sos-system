/**
 * NDRF 16-Byte Compact BLE Mesh Packet Encoder / Decoder
 * Enables peer-to-peer Emergency SOS transmission without cellular coverage.
 */

class MeshService {
    /**
     * Encodes SOS payload into a 16-Byte ArrayBuffer
     */
    static encodePacket(data) {
        const buffer = new ArrayBuffer(16);
        const view = new DataView(buffer);

        // Byte 0: Magic Header (0xA5 = NDRF)
        view.setUint8(0, 0xA5);

        // Byte 1: Emergency Condition Code Map
        const conditionMap = {
            'FLOOD_TRAPPED': 1,
            'CYCLONE_CRITICAL': 2,
            'EARTHQUAKE_COLLAPSE': 3,
            'MEDICAL_CRITICAL': 4,
            'INFANT_ELDERLY': 5,
            'NEED_FOOD_WATER': 6,
            'SAFE_RELOCATED': 7
        };
        view.setUint8(1, conditionMap[data.condition] || 1);

        // Bytes 2-5: Latitude (Float32)
        view.setFloat32(2, parseFloat(data.lat) || 0.0);

        // Bytes 6-9: Longitude (Float32)
        view.setFloat32(6, parseFloat(data.lng) || 0.0);

        // Byte 10: Floor Level (-128 to 127)
        view.setInt8(10, parseInt(data.floor) || 0);

        // Byte 11: Hop Counter (BLE mesh TTL)
        view.setUint8(11, parseInt(data.hops) || 1);

        // Bytes 12-15: Timestamp (Epoch seconds modulo uint32)
        const timestampSec = Math.floor((data.timestamp || Date.now()) / 1000);
        view.setUint32(12, timestampSec);

        return buffer;
    }

    /**
     * Decodes 16-Byte ArrayBuffer back into JSON SOS Object
     */
    static decodePacket(buffer) {
        const view = new DataView(buffer);

        const magic = view.getUint8(0);
        if (magic !== 0xA5) {
            throw new Error("Invalid NDRF Mesh Packet Magic Byte");
        }

        const conditionCodeMap = {
            1: 'FLOOD_TRAPPED',
            2: 'CYCLONE_CRITICAL',
            3: 'EARTHQUAKE_COLLAPSE',
            4: 'MEDICAL_CRITICAL',
            5: 'INFANT_ELDERLY',
            6: 'NEED_FOOD_WATER',
            7: 'SAFE_RELOCATED'
        };

        const conditionCode = view.getUint8(1);
        const lat = view.getFloat32(2);
        const lng = view.getFloat32(6);
        const floor = view.getInt8(10);
        const hops = view.getUint8(11);
        const timestampSec = view.getUint32(12);

        return {
            id: `mesh-${timestampSec}-${Math.floor(Math.random()*1000)}`,
            condition: conditionCodeMap[conditionCode] || 'FLOOD_TRAPPED',
            lat: Number(lat.toFixed(6)),
            lng: Number(lng.toFixed(6)),
            floor,
            hops,
            timestamp: timestampSec * 1000,
            source: 'BLE_P2P_MESH'
        };
    }
}

module.exports = MeshService;
