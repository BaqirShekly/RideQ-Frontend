import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PaymentForm from './PaymentForm';
import RealTimeTracking from './RealTimeTracking';
import RatingModal from './RatingModal';
import './CustomerDashboard.css';

function CustomerDashboard() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  
  // Demo user ID (in production, this would come from authentication)
  const userId = 'customer-demo-123';
  
  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    pickup: '',
    dropoff: '',
    distance: '',
    scheduledTime: ''
  });

  // Store coordinates for distance calculation
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);

  const [showManualDistance, setShowManualDistance] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);
  
  // Surge pricing state
  const [priceInfo, setPriceInfo] = useState(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  
  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoValid, setPromoValid] = useState(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [applyingPromo, setApplyingPromo] = useState(false);
  
  // Rating modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rideToRate, setRideToRate] = useState(null);
  
  // Messaging state
  const [showMessaging, setShowMessaging] = useState(false);
  const [selectedRideForChat, setSelectedRideForChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    loadRides();
  }, []);

  // Auto-detect location when booking modal opens
  useEffect(() => {
    if (showBooking && !bookingForm.pickup) {
      autoDetectCurrentLocation();
    }
  }, [showBooking]);

  // Poll for new messages when chat is open
  useEffect(() => {
    let interval;
    if (showMessaging && selectedRideForChat) {
      loadMessages(selectedRideForChat.id);
      interval = setInterval(() => {
        loadMessages(selectedRideForChat.id);
      }, 3000); // Poll every 3 seconds
    }
    return () => clearInterval(interval);
  }, [showMessaging, selectedRideForChat]);

  // Auto-detect current location on modal open
  const autoDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocode to get address
          const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
            params: {
              lat: latitude,
              lon: longitude,
              format: 'json'
            }
          });
          
          const address = response.data.display_name;
          setBookingForm({...bookingForm, pickup: address});
        } catch (error) {
          console.error('Error reverse geocoding:', error);
          const locationString = `Current Location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
          setBookingForm({...bookingForm, pickup: locationString});
        }
        
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  // Manual location button
  const getCurrentLocation = (field) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocode to get address
          const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
            params: {
              lat: latitude,
              lon: longitude,
              format: 'json'
            }
          });
          
          const address = response.data.display_name;
          
          if (field === 'pickup') {
            setBookingForm({...bookingForm, pickup: address});
          } else {
            setBookingForm({...bookingForm, dropoff: address});
          }
        } catch (error) {
          console.error('Error reverse geocoding:', error);
          const locationString = `Current Location (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
          
          if (field === 'pickup') {
            setBookingForm({...bookingForm, pickup: locationString});
          } else {
            setBookingForm({...bookingForm, dropoff: locationString});
          }
        }
        
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to retrieve your location. Please enter the address manually.');
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  // Search for address suggestions using Nominatim (FREE)
  const searchAddressSuggestions = async (query, isPickup) => {
    if (query.length < 3) {
      if (isPickup) {
        setPickupSuggestions([]);
      } else {
        setDropoffSuggestions([]);
      }
      return;
    }

    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: {
          q: query,
          format: 'json',
          limit: 5,
          addressdetails: 1
        }
      });
      
      const suggestions = response.data.map(item => ({
        label: item.display_name,
        lat: item.lat,
        lon: item.lon
      }));
      
      if (isPickup) {
        setPickupSuggestions(suggestions);
      } else {
        setDropoffSuggestions(suggestions);
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
    }
  };

  // Debounce function
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const debouncedSearchAddress = debounce(searchAddressSuggestions, 500);

  const handlePickupChange = (e) => {
    const value = e.target.value;
    setBookingForm({...bookingForm, pickup: value});
    setShowPickupSuggestions(true);
    debouncedSearchAddress(value, true);
  };

  const handleDropoffChange = (e) => {
    const value = e.target.value;
    setBookingForm({...bookingForm, dropoff: value});
    setShowDropoffSuggestions(true);
    debouncedSearchAddress(value, false);
  };

  // Haversine formula to calculate distance between two coordinates
  const calculateDistanceFromCoords = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  };

  const selectPickupSuggestion = (suggestion) => {
    setBookingForm({...bookingForm, pickup: suggestion.label});
    setPickupCoords({ lat: parseFloat(suggestion.lat), lon: parseFloat(suggestion.lon) });
    setPickupSuggestions([]);
    setShowPickupSuggestions(false);
  };

  const selectDropoffSuggestion = (suggestion) => {
    setBookingForm({...bookingForm, dropoff: suggestion.label});
    setDropoffCoords({ lat: parseFloat(suggestion.lat), lon: parseFloat(suggestion.lon) });
    setDropoffSuggestions([]);
    setShowDropoffSuggestions(false);
  };

  // Auto-calculate distance when both coordinates are available
  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      const calculatedDistance = calculateDistanceFromCoords(
        pickupCoords.lat,
        pickupCoords.lon,
        dropoffCoords.lat,
        dropoffCoords.lon
      );
      setBookingForm(prev => ({...prev, distance: calculatedDistance}));
    }
  }, [pickupCoords, dropoffCoords]);

  const loadRides = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/rides/${userId}`);
      setRides(response.data);
    } catch (error) {
      console.error('Error loading rides:', error);
    }
    setLoading(false);
  };

  const handleBookRide = async (e) => {
    e.preventDefault();
    
    if (!bookingForm.distance) {
      alert('Please select both pickup and dropoff locations to calculate distance');
      return;
    }

    if (!bookingForm.pickup || !bookingForm.dropoff) {
      alert('Please enter both pickup and dropoff locations');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('Booking ride with data:', {
        userId,
        pickup: bookingForm.pickup,
        dropoff: bookingForm.dropoff,
        distance: Number(bookingForm.distance),
        scheduledTime: bookingForm.scheduledTime || null
      });

      const response = await axios.post('/api/rides', {
        userId,
        pickup: bookingForm.pickup,
        dropoff: bookingForm.dropoff,
        distance: Number(bookingForm.distance),
        scheduledTime: bookingForm.scheduledTime || null
      });
      
      console.log('Booking response:', response.data);
      
      setSelectedRide(response.data);
      setShowBooking(false);
      setShowPayment(true);
      loadRides();
    } catch (error) {
      console.error('Error booking ride:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Failed to book ride. ';
      if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
      } else if (error.response?.status === 500) {
        errorMessage += 'Server error. Please check if the database is set up correctly.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      alert(errorMessage);
    }
    
    setLoading(false);
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    setSelectedRide(null);
    setBookingForm({
      pickup: '',
      dropoff: '',
      distance: '',
      scheduledTime: ''
    });
    setShowManualDistance(false);
    loadRides();
    alert('Payment successful! Your ride has been confirmed.');
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-pending',
      scheduled: 'badge-scheduled',
      active: 'badge-active',
      completed: 'badge-completed'
    };
    return `badge ${badges[status] || 'badge-pending'}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const isHolidayToday = () => {
    const today = new Date();
    const holidays = [
      { month: 0, day: 1 },
      { month: 6, day: 4 },
      { month: 10, day: 25 },
      { month: 11, day: 25 }
    ];
    return holidays.some(h => 
      today.getMonth() === h.month && today.getDate() === h.day
    );
  };

  // Fetch dynamic pricing with surge
  const fetchPriceEstimate = async (distance, scheduledTime = '') => {
    if (!distance) {
      setPriceInfo(null);
      return;
    }

    setLoadingPrice(true);
    try {
      const response = await axios.post('/api/calculate-price', {
        distance: Number(distance),
        scheduledTime: scheduledTime || null
      });
      setPriceInfo(response.data);
    } catch (error) {
      console.error('Error fetching price:', error);
      setPriceInfo(null);
    }
    setLoadingPrice(false);
  };

  // Update price when distance or scheduled time changes
  useEffect(() => {
    if (bookingForm.distance) {
      fetchPriceEstimate(bookingForm.distance, bookingForm.scheduledTime);
    }
  }, [bookingForm.distance, bookingForm.scheduledTime]);

  const calculatePrice = (distance) => {
    if (!distance) return 0;
    return (2.50 + (distance * 1.75) * 0.85 * (isHolidayToday() ? 0.90 : 1)).toFixed(2);
  };

  const loadMessages = async (rideId) => {
    try {
      const response = await axios.get(`/api/messages/${rideId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await axios.post('/api/messages', {
        rideId: selectedRideForChat.id,
        senderId: userId,
        senderType: 'customer',
        message: newMessage.trim()
      });
      
      setNewMessage('');
      loadMessages(selectedRideForChat.id);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const openChat = (ride) => {
    setSelectedRideForChat(ride);
    setShowMessaging(true);
    setMessages([]);
  };

  const closeChat = () => {
    setShowMessaging(false);
    setSelectedRideForChat(null);
    setMessages([]);
    setNewMessage('');
  };


  return (
    <div className="container">
      <div className="dashboard-header">
        <div>
          <h2 className="gradient-text">Customer Dashboard</h2>
          <p className="subtitle">Book rides at prices 15% cheaper than competitors</p>
          {isHolidayToday() && (
            <div className="holiday-banner">
              🎉 Holiday Special: Extra 10% discount on all rides today!
            </div>
          )}
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowBooking(true)}
        >
          📍 Book a Ride
        </button>
      </div>

      {/* Booking Modal */}
      {showBooking && (
        <div className="modal-overlay" onClick={() => setShowBooking(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Book Your Ride</h3>
              <button 
                className="close-btn"
                onClick={() => setShowBooking(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleBookRide} className="booking-form">
              <div className="form-group" style={{position: 'relative'}}>
                <label>Pickup Location {gettingLocation && <span style={{fontSize: '0.85em', color: '#3b82f6'}}>⏳ Detecting...</span>}</label>
                <div style={{display: 'flex', gap: '10px'}}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Current location auto-detected..."
                    value={bookingForm.pickup}
                    onChange={handlePickupChange}
                    onFocus={() => setShowPickupSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowPickupSuggestions(false), 200)}
                    required
                    style={{flex: 1}}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => getCurrentLocation('pickup')}
                    disabled={gettingLocation}
                    title="Refresh current location"
                    style={{padding: '0 15px'}}
                  >
                    🔄
                  </button>
                </div>
                
                {showPickupSuggestions && pickupSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    marginTop: '4px',
                    maxHeight: '250px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}>
                    {pickupSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => selectPickupSuggestion(suggestion)}
                        style={{
                          padding: '12px',
                          cursor: 'pointer',
                          borderBottom: index < pickupSuggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                      >
                        <div style={{fontSize: '0.95em', color: '#1f2937'}}>
                          📍 {suggestion.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group" style={{position: 'relative'}}>
                <label>Dropoff Location</label>
                <div style={{display: 'flex', gap: '10px'}}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Type to search destination..."
                    value={bookingForm.dropoff}
                    onChange={handleDropoffChange}
                    onFocus={() => setShowDropoffSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowDropoffSuggestions(false), 200)}
                    required
                    style={{flex: 1}}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => getCurrentLocation('dropoff')}
                    disabled={gettingLocation}
                    title="Use current location"
                    style={{padding: '0 15px'}}
                  >
                    📍
                  </button>
                </div>
                
                {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    marginTop: '4px',
                    maxHeight: '250px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}>
                    {dropoffSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => selectDropoffSuggestion(suggestion)}
                        style={{
                          padding: '12px',
                          cursor: 'pointer',
                          borderBottom: index < dropoffSuggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                      >
                        <div style={{fontSize: '0.95em', color: '#1f2937'}}>
                          🎯 {suggestion.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Distance</label>
                
                {bookingForm.distance > 0 ? (
                  <div style={{
                    padding: '20px',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '12px',
                    border: '2px solid #86efac',
                    textAlign: 'center'
                  }}>
                    <div style={{fontSize: '0.85em', color: '#6b7280', marginBottom: '8px'}}>
                      Calculated Distance
                    </div>
                    <div style={{fontSize: '2.5em', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px'}}>
                      📏 {bookingForm.distance} miles
                    </div>
                    <div style={{fontSize: '0.9em', color: '#10b981', fontWeight: '500'}}>
                      ✓ Auto-calculated from locations
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '20px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '12px',
                    border: '2px dashed #e5e7eb',
                    textAlign: 'center'
                  }}>
                    <div style={{fontSize: '1.5em', marginBottom: '10px'}}>📍</div>
                    <div style={{fontSize: '0.95em', color: '#6b7280'}}>
                      Select both pickup and dropoff locations
                    </div>
                    <div style={{fontSize: '0.85em', color: '#9ca3af', marginTop: '5px'}}>
                      Distance will be calculated automatically
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Schedule for Later (Optional)</label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={bookingForm.scheduledTime}
                  onChange={(e) => setBookingForm({...bookingForm, scheduledTime: e.target.value})}
                />
              </div>

              {bookingForm.distance && (
                <>
                  {(priceInfo || loadingPrice) && (
                    <div style={{
                      padding: '20px',
                      backgroundColor: priceInfo && priceInfo.surgeMultiplier > 1.0 ? '#fef3c7' : '#f0fdf4',
                      borderRadius: '12px',
                      marginTop: '15px',
                      border: `2px solid ${priceInfo && priceInfo.surgeMultiplier > 1.0 ? '#fbbf24' : '#86efac'}`
                    }}>
                      {loadingPrice ? (
                        <div style={{textAlign: 'center'}}>
                          <div className="spinner" style={{margin: '0 auto'}}></div>
                          <div style={{marginTop: '10px', color: '#6b7280'}}>Calculating price...</div>
                        </div>
                      ) : priceInfo ? (
                        <>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <div>
                      <div style={{fontSize: '0.85em', color: '#6b7280', marginBottom: '4px'}}>
                        Total Price
                      </div>
                      <div style={{fontSize: '2em', fontWeight: 'bold', color: '#1f2937'}}>
                        ${priceInfo.price}
                      </div>
                    </div>
                    <div style={{textAlign: 'right'}}>
                      <div style={{fontSize: '0.85em', color: '#6b7280', marginBottom: '4px'}}>
                        Est. Time
                      </div>
                      <div style={{fontSize: '1.3em', fontWeight: '600', color: '#3b82f6'}}>
                        {priceInfo.estimatedTime} min
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(0,0,0,0.1)',
                    fontSize: '0.9em'
                  }}>
                    <div>
                      <div style={{color: '#6b7280'}}>Distance:</div>
                      <div style={{fontWeight: '600', color: '#1f2937'}}>{priceInfo.distance} miles</div>
                    </div>
                    <div>
                      <div style={{color: '#6b7280'}}>Base Fare:</div>
                      <div style={{fontWeight: '600', color: '#1f2937'}}>${priceInfo.baseFare}</div>
                    </div>
                    <div>
                      <div style={{color: '#6b7280'}}>Per Mile:</div>
                      <div style={{fontWeight: '600', color: '#1f2937'}}>${priceInfo.perMile}</div>
                    </div>
                    <div>
                      <div style={{color: '#6b7280'}}>Demand:</div>
                      <div style={{fontWeight: '600', color: priceInfo.demandLevel === 'High' ? '#ef4444' : priceInfo.demandLevel === 'Moderate' ? '#f59e0b' : '#10b981'}}>
                        {priceInfo.demandLevel}
                      </div>
                    </div>
                  </div>

                  {priceInfo.surgeMultiplier > 1.0 && (
                    <div style={{
                      marginTop: '12px',
                      padding: '10px',
                      backgroundColor: '#fffbeb',
                      borderRadius: '8px',
                      border: '1px solid #fcd34d',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{fontSize: '1.2em'}}>⚡</span>
                      <div style={{fontSize: '0.9em'}}>
                        <span style={{fontWeight: '600', color: '#92400e'}}>
                          {priceInfo.surgeMultiplier}x Surge Pricing
                        </span>
                        <div style={{fontSize: '0.85em', color: '#78350f', marginTop: '2px'}}>
                          High demand in your area
                        </div>
                      </div>
                    </div>
                  )}

                  {priceInfo.isHoliday && (
                    <div style={{
                      marginTop: '12px',
                      padding: '10px',
                      backgroundColor: '#dcfce7',
                      borderRadius: '8px',
                      border: '1px solid #86efac',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{fontSize: '1.2em'}}>🎉</span>
                      <div style={{fontSize: '0.9em', fontWeight: '600', color: '#166534'}}>
                        Holiday Discount Applied! (10% off)
                      </div>
                    </div>
                  )}

                          <div style={{
                            marginTop: '12px',
                            fontSize: '0.85em',
                            color: '#6b7280',
                            textAlign: 'center'
                          }}>
                            15% cheaper than competitors • RideQ
                          </div>
                        </>
                      ) : null}
                    </div>
                  )}

                  {!priceInfo && !loadingPrice && (
                    <div style={{
                      padding: '15px',
                      backgroundColor: '#f0fdf4',
                      borderRadius: '12px',
                      marginTop: '15px',
                      textAlign: 'center',
                      border: '2px solid #86efac'
                    }}>
                      <div style={{fontSize: '0.85em', color: '#6b7280', marginBottom: '4px'}}>
                        Estimated Price
                      </div>
                      <div style={{fontSize: '1.5em', fontWeight: 'bold', color: '#1f2937'}}>
                        ${calculatePrice(bookingForm.distance)}
                      </div>
                      <div style={{fontSize: '0.85em', color: '#6b7280', marginTop: '8px'}}>
                        15% cheaper than competitors
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading || !bookingForm.distance}
                    style={{marginTop: '15px'}}
                  >
                    {loading ? 'Booking...' : 'Confirm Booking'}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && selectedRide && (
        <PaymentForm 
          ride={selectedRide}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}

      {/* Messaging Modal */}
      {showMessaging && selectedRideForChat && (
        <div className="modal-overlay" onClick={closeChat}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '600px'}}>
            <div className="modal-header">
              <h3>💬 Chat with Driver</h3>
              <button className="close-btn" onClick={closeChat}>✕</button>
            </div>
            
            <div style={{
              padding: '20px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              <div style={{fontSize: '0.9em', color: '#6b7280', marginBottom: '5px'}}>
                Ride Details
              </div>
              <div style={{fontWeight: '600', marginBottom: '5px'}}>
                {selectedRideForChat.pickup_location} → {selectedRideForChat.dropoff_location}
              </div>
              <div style={{fontSize: '0.9em', color: '#6b7280'}}>
                Status: <span className={getStatusBadge(selectedRideForChat.status)} style={{marginLeft: '5px'}}>
                  {selectedRideForChat.status}
                </span>
              </div>
            </div>

            <div style={{
              height: '400px',
              overflowY: 'auto',
              padding: '15px',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              {messages.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: '#9ca3af',
                  padding: '40px 20px'
                }}>
                  <div style={{fontSize: '2em', marginBottom: '10px'}}>💬</div>
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      marginBottom: '15px',
                      display: 'flex',
                      justifyContent: msg.sender_type === 'customer' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{
                      maxWidth: '70%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      backgroundColor: msg.sender_type === 'customer' ? '#3b82f6' : '#f3f4f6',
                      color: msg.sender_type === 'customer' ? '#ffffff' : '#1f2937'
                    }}>
                      <div style={{
                        fontSize: '0.75em',
                        opacity: 0.8,
                        marginBottom: '4px'
                      }}>
                        {msg.sender_type === 'customer' ? 'You' : 'Driver'}
                      </div>
                      <div>{msg.message}</div>
                      <div style={{
                        fontSize: '0.7em',
                        opacity: 0.7,
                        marginTop: '4px'
                      }}>
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} style={{display: 'flex', gap: '10px'}}>
              <input
                type="text"
                className="input-field"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                style={{flex: 1}}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!newMessage.trim()}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Rides List */}
      <div className="rides-section">
        <h3>Your Rides</h3>
        
        {loading && !rides.length ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : rides.length === 0 ? (
          <div className="empty-state">
            <p>No rides yet. Book your first ride to get started!</p>
          </div>
        ) : (
          <div className="rides-grid">
            {rides.map((ride) => (
              <div key={ride.id} className="card ride-card">
                <div className="ride-header">
                  <span className={getStatusBadge(ride.status)}>
                    {ride.status}
                  </span>
                  <span className="ride-price">${ride.price}</span>
                </div>
                
                <div className="ride-details">
                  <div className="location-row">
                    <span className="location-icon">📍</span>
                    <div>
                      <div className="location-label">Pickup</div>
                      <div className="location-text">{ride.pickup_location}</div>
                    </div>
                  </div>
                  
                  <div className="location-row">
                    <span className="location-icon">🎯</span>
                    <div>
                      <div className="location-label">Dropoff</div>
                      <div className="location-text">{ride.dropoff_location}</div>
                    </div>
                  </div>
                </div>

                <div className="ride-footer">
                  <span className="ride-distance">{ride.distance} miles</span>
                  {ride.scheduled_time && (
                    <span className="ride-time">⏰ {formatDate(ride.scheduled_time)}</span>
                  )}
                  {ride.is_holiday && (
                    <span className="holiday-tag">🎉 Holiday Discount Applied</span>
                  )}
                </div>

                {(ride.status === 'active' || ride.status === 'scheduled') && ride.driver_id && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => openChat(ride)}
                    style={{width: '100%', marginTop: '10px'}}
                  >
                    💬 Chat with Driver
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerDashboard;
