import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
import './PaymentForm.css';

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe('pk_test_51SK7zC07dVidOoSk4irVILZtEYdMIhvBSqTKWTI5EHJOrengUoPZO8ny3y2uOQ7ul2f9tZeJRXD7cABrcusAcMNp005Jy6GWpN');

function CheckoutForm({ ride, onSuccess, onClose }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Create payment intent
      const { data } = await axios.post('/api/create-payment-intent', {
        amount: ride.price,
        rideId: ride.id
      });

      // Confirm card payment
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        }
      });

      if (result.error) {
        setError(result.error.message);
      } else {
        // Payment successful
        await axios.patch(`/api/rides/${ride.id}`, {
          status: 'active'
        });
        onSuccess();
      }
    } catch (err) {
      setError('Payment failed. Please try again.');
      console.error('Payment error:', err);
    }

    setProcessing(false);
  };

  const cardStyle = {
    style: {
      base: {
        fontSize: '16px',
        color: '#1f2937',
        '::placeholder': {
          color: '#9ca3af',
        },
      },
      invalid: {
        color: '#ef4444',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="payment-summary">
        <h4>Payment Summary</h4>
        <div className="summary-row">
          <span>Ride from:</span>
          <span>{ride.pickup_location}</span>
        </div>
        <div className="summary-row">
          <span>To:</span>
          <span>{ride.dropoff_location}</span>
        </div>
        <div className="summary-row">
          <span>Distance:</span>
          <span>{ride.distance} miles</span>
        </div>
        {ride.is_holiday && (
          <div className="summary-row holiday-discount">
            <span>🎉 Holiday Discount:</span>
            <span>-10%</span>
          </div>
        )}
        <div className="summary-total">
          <span>Total Amount:</span>
          <span>${ride.price}</span>
        </div>
      </div>

      <div className="card-element-container">
        <label>Card Details</label>
        <CardElement options={cardStyle} />
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="payment-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
          disabled={processing}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!stripe || processing}
        >
          {processing ? 'Processing...' : `Pay $${ride.price}`}
        </button>
      </div>

      <div className="secure-badge">
        🔒 Secure payment powered by Stripe
      </div>
    </form>
  );
}

function PaymentForm({ ride, onSuccess, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Complete Payment</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <Elements stripe={stripePromise}>
          <CheckoutForm ride={ride} onSuccess={onSuccess} onClose={onClose} />
        </Elements>
      </div>
    </div>
  );
}

export default PaymentForm;
