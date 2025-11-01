import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './RealTimeTracking.css';

function RealTimeTracking({ rideId, userId }) {
  const [driverLocation, setDriverLocation] = useState(null);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Connect to Socket.io
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Join the ride room
    newSocket.emit('customer:join', rideId);

    // Listen for driver location updates
    newSocket.on(`ride:${rideId}:location`, (location) => {
      setDriverLocation(location);
    });

    // Fetch initial location
    fetchInitialLocation();

    return () => {
      newSocket.disconnect();
    };
  }, [rideId]);

  const fetchInitialLocation = async () => {
    try {
      const response = await fetch(`/api/location/${rideId}`);
      if (response.ok) {
        const data = await response.json();
        setDriverLocation({
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
          speed: data.speed
        });
      }
    } catch (error) {
      console.error('Error fetching initial location:', error);
    }
  };

  const getDirectionArrow = (heading) => {
    if (!heading) return '🚗';
    if (heading >= 337.5 || heading < 22.5) return '⬆️';
    if (heading >= 22.5 && heading < 67.5) return '↗️';
    if (heading >= 67.5 && heading < 112.5) return '➡️';
    if (heading >= 112.5 && heading < 157.5) return '↘️';
    if (heading >= 157.5 && heading < 202.5) return '⬇️';
    if (heading >= 202.5 && heading < 247.5) return '↙️';
    if (heading >= 247.5 && heading < 292.5) return '⬅️';
    if (heading >= 292.5 && heading < 337.5) return '↖️';
    return '🚗';
  };

  return (
    <div className="real-time-tracking">
      <h3>🚗 Driver Tracking</h3>
      
      {driverLocation ? (
        <div className="tracking-info">
          <div className="tracking-map">
            <div className="driver-icon">
              <span className="direction-arrow">
                {getDirectionArrow(driverLocation.heading)}
              </span>
              <div className="driver-label">Your Driver</div>
            </div>
          </div>
          
          <div className="tracking-details">
            <div className="detail-item">
              <span className="detail-label">Location:</span>
              <span className="detail-value">
                {driverLocation.latitude?.toFixed(6)}, {driverLocation.longitude?.toFixed(6)}
              </span>
            </div>
            
            {driverLocation.speed !== null && driverLocation.speed !== undefined && (
              <div className="detail-item">
                <span className="detail-label">Speed:</span>
                <span className="detail-value">
                  {Math.round(driverLocation.speed)} mph
                </span>
              </div>
            )}
            
            <div className="detail-item">
              <span className="detail-label">Status:</span>
              <span className="detail-value status-active">
                🟢 En Route
              </span>
            </div>
            
            <div className="tracking-note">
              📍 Real-time location updates every few seconds
            </div>
          </div>
        </div>
      ) : (
        <div className="tracking-placeholder">
          <div className="loading-spinner">⏳</div>
          <p>Waiting for driver location...</p>
          <p className="tracking-note">Location will appear once driver starts trip</p>
        </div>
      )}
      
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default RealTimeTracking;
