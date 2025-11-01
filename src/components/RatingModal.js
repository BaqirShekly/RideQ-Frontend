import React, { useState } from 'react';
import axios from 'axios';
import './RatingModal.css';

function RatingModal({ ride, userId, userType, onClose, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const ratingData = {
        rideId: ride.id,
        userId: userType === 'customer' ? userId : ride.driver_id,
        driverId: userType === 'customer' ? ride.driver_id : userId,
        ratingBy: userType,
        rating: rating,
        comment: comment
      };

      await axios.post('/api/ratings', ratingData);
      
      if (onSubmit) {
        onSubmit();
      }
      onClose();
    } catch (error) {
      console.error('Error submitting rating:', error);
      setError('Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    return [1, 2, 3, 4, 5].map((star) => (
      <span
        key={star}
        className={`star ${star <= (hoverRating || rating) ? 'filled' : ''}`}
        onClick={() => setRating(star)}
        onMouseEnter={() => setHoverRating(star)}
        onMouseLeave={() => setHoverRating(0)}
      >
        ★
      </span>
    ));
  };

  const getRatingLabel = (value) => {
    switch (value) {
      case 1: return '😞 Poor';
      case 2: return '😕 Fair';
      case 3: return '😐 Good';
      case 4: return '😊 Very Good';
      case 5: return '😍 Excellent';
      default: return 'Select Rating';
    }
  };

  return (
    <div className="rating-modal-overlay" onClick={onClose}>
      <div className="rating-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        
        <h2>Rate Your {userType === 'customer' ? 'Driver' : 'Passenger'}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="rating-section">
            <div className="stars-container">
              {renderStars()}
            </div>
            <div className="rating-label">
              {getRatingLabel(hoverRating || rating)}
            </div>
          </div>

          <div className="form-group">
            <label>Comment (Optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              rows="4"
              maxLength="500"
            />
            <div className="char-count">
              {comment.length}/500
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || rating === 0}
            >
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>

        <div className="ride-info">
          <div className="ride-detail">
            <span>📍 From:</span> {ride.pickup_location}
          </div>
          <div className="ride-detail">
            <span>📍 To:</span> {ride.dropoff_location}
          </div>
          <div className="ride-detail">
            <span>💵 Fare:</span> ${ride.price}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RatingModal;
