const { promisePool } = require('../config/database');

// Mental health facilities database
const facilities = [
    // On-campus facilities
    { name: 'UJ APK Wellness Centre', type: 'on-campus', address: 'Auckland Park Kingsway Campus', 
      lat: -26.1765, lng: 28.0003, free: true, online: false, studentSpecific: true,
      phone: '011 559 3324', hours: 'Mon-Fri 8am-5pm', distance: 0 },
    { name: 'UJ APB Health Clinic', type: 'on-campus', address: 'Auckland Park Bunting Road Campus',
      lat: -26.1790, lng: 28.0030, free: true, online: false, studentSpecific: true,
      phone: '011 559 6521', hours: 'Mon-Fri 8am-4pm', distance: 1.2 },
    { name: 'UJ DFC Student Support', type: 'on-campus', address: 'Doornfontein Campus',
      lat: -26.1887, lng: 28.0333, free: true, online: false, studentSpecific: true,
      phone: '011 559 7027', hours: 'Mon-Fri 8am-5pm', distance: 3.5 },
    
    // Off-campus facilities
    { name: 'SADAG Mental Health Line', type: 'online', address: 'National Helpline',
      free: true, online: true, studentSpecific: false, phone: '0800 567 567',
      hours: '24/7', website: 'www.sadag.org' },
    { name: 'Therapy Route', type: 'paid', address: 'Johannesburg CBD',
      lat: -26.1958, lng: 28.0344, free: false, online: true, studentSpecific: false,
      phone: '011 123 4567', hours: 'Mon-Sat 9am-6pm', cost: 'R500-R800/session', distance: 2.5 },
    { name: 'SADAG Online Counseling', type: 'online', address: 'Virtual',
      free: true, online: true, studentSpecific: true, phone: '0800 567 567',
      hours: '24/7', website: 'www.sadag.org' }
];

// Get nearby facilities with filters
const getNearbyFacilities = async (req, res) => {
    try {
        const { lat, lng, type, freeOnly, onlineOnly, studentOnly } = req.query;
        
        let filtered = [...facilities];
        
        // Apply filters
        if (type && type !== 'all') {
            filtered = filtered.filter(f => f.type === type);
        }
        if (freeOnly === 'true') {
            filtered = filtered.filter(f => f.free === true);
        }
        if (onlineOnly === 'true') {
            filtered = filtered.filter(f => f.online === true);
        }
        if (studentOnly === 'true') {
            filtered = filtered.filter(f => f.studentSpecific === true);
        }
        
        // Calculate distances if lat/lng provided
        if (lat && lng) {
            filtered = filtered.filter(f => f.lat && f.lng).map(f => ({
                ...f,
                distance: calculateDistance(lat, lng, f.lat, f.lng)
            })).sort((a, b) => a.distance - b.distance);
        }
        
        res.json({ success: true, facilities: filtered });
    } catch (error) {
        console.error('Get facilities error:', error);
        res.json({ success: false, message: 'Failed to get facilities' });
    }
};

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 10) / 10;
}

// Request anonymous help
const requestAnonymousHelp = async (req, res) => {
    try {
        const { message, shareLocation } = req.body;
        const userId = req.session.user_id || null;
        
        await promisePool.execute(
            'INSERT INTO help_requests (user_id, message, share_location, status) VALUES (?, ?, ?, ?)',
            [userId, message, shareLocation ? 1 : 0, 'pending']
        );
        
        // Notify wellness centre (in production, send email/SMS)
        console.log('📞 Anonymous help request received');
        console.log('Message:', message);
        console.log('Share location:', shareLocation);
        
        res.json({ 
            success: true, 
            message: 'Help request sent. A wellness counsellor will contact you shortly.'
        });
    } catch (error) {
        console.error('Help request error:', error);
        res.json({ success: false, message: 'Failed to send request' });
    }
};

module.exports = { getNearbyFacilities, requestAnonymousHelp };