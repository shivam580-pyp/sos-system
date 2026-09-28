/**
 * Geo-spatial Calculations & Nearest NDRF Rescue Team Finder
 * Uses Haversine Formula to compute real-world spherical distance in kilometers.
 */

class GeoService {
    /**
     * Calculate Haversine distance between two points (lat1, lng1) and (lat2, lng2) in KM
     */
    static calculateDistanceKm(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of Earth in KM
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);

        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return Number(d.toFixed(2));
    }

    static deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    /**
     * Find nearest available NDRF team from a list of teams for a given incident location
     */
    static findNearestTeam(incidentLat, incidentLng, teams) {
        if (!teams || !teams.length) return null;

        let nearest = null;
        let minDistance = Infinity;

        teams.forEach(team => {
            if (team.lat && team.lng) {
                const dist = this.calculateDistanceKm(incidentLat, incidentLng, team.lat, team.lng);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearest = { ...team, distanceKm: dist };
                }
            }
        });

        return nearest;
    }
}

module.exports = GeoService;
