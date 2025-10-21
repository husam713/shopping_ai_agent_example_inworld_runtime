import { 
  Box, 
  Typography, 
  Paper, 
  Divider
} from '@mui/material';
import { 
  CheckCircle, 
  Error,
  Receipt 
} from '@mui/icons-material';
import React from 'react';

interface OrderResultProps {
  orderResult: {
    success: boolean;
    message: string;
    orderId?: string;
    order_id?: string;  // Alternative field name
    total?: number;
    total_amount?: number;  // Alternative field name
    subtotal?: number;
    tax?: number;
    items?: any[];
    item_count?: number;
    total_items?: number;
    shipping_address?: {
      street: string;
      city: string;
      state: string;
      zip_code: string;
      country: string;
    };
    payment_method?: {
      type: string;
    };
    estimated_delivery?: string;
    tracking_number?: string;
    order_status?: string;
    order_date?: string;
  };
  onContinueShopping?: () => void;
}

export const OrderResultWidget: React.FC<OrderResultProps> = ({
  orderResult,
  onContinueShopping,
}) => {
  console.log('[OrderResultWidget] Received orderResult:', orderResult);
  
  const { 
    success, 
    message, 
    orderId,
    order_id,
    total,
    total_amount,
    subtotal,
    tax,
    items,
    item_count,
    total_items,
    shipping_address,
    payment_method,
    estimated_delivery,
    tracking_number,
    order_status,
    order_date
  } = orderResult;
  
  // Use order_id if orderId is not available (data structure mismatch)
  const displayOrderId = orderId || order_id;
  const displayTotal = total || total_amount;

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        mb: 2, 
        backgroundColor: success ? '#e8f5e8' : '#ffebee',
        border: `1px solid ${success ? '#4caf50' : '#f44336'}`
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {success ? (
          <CheckCircle color="success" sx={{ mr: 1, fontSize: 32 }} />
        ) : (
          <Error color="error" sx={{ mr: 1, fontSize: 32 }} />
        )}
        <Typography variant="h5" component="h3">
          {success ? 'Order Confirmed!' : 'Order Failed'}
        </Typography>
      </Box>
      
      <Typography variant="body1" paragraph>
        {message}
      </Typography>
      
      {success && displayOrderId && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Receipt sx={{ mr: 1 }} />
            <Typography variant="h6">
              Order Details
            </Typography>
          </Box>
          
          {/* Order Information */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              <strong>Order ID:</strong> {displayOrderId}
            </Typography>
            {order_date && (
              <Typography variant="body1" gutterBottom>
                <strong>Order Date:</strong> {new Date(order_date).toLocaleDateString()}
              </Typography>
            )}
            {order_status && (
              <Typography variant="body1" gutterBottom>
                <strong>Status:</strong> {order_status}
              </Typography>
            )}
            {tracking_number && (
              <Typography variant="body1" gutterBottom>
                <strong>Tracking Number:</strong> {tracking_number}
              </Typography>
            )}
            {estimated_delivery && (
              <Typography variant="body1" gutterBottom>
                <strong>Estimated Delivery:</strong> {estimated_delivery}
              </Typography>
            )}
          </Box>

          {/* Items Summary */}
          {(item_count || total_items) && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Items:</strong> {total_items || item_count} item(s) in {item_count || 1} product(s)
              </Typography>
            </Box>
          )}

          {/* Financial Details */}
          <Box sx={{ mb: 2 }}>
            {subtotal !== undefined && (
              <Typography variant="body1" gutterBottom>
                <strong>Subtotal:</strong> ${subtotal.toFixed(2)}
              </Typography>
            )}
            {tax !== undefined && (
              <Typography variant="body1" gutterBottom>
                <strong>Tax:</strong> ${tax.toFixed(2)}
              </Typography>
            )}
            {displayTotal !== undefined && (
              <Typography variant="body1" gutterBottom>
                <strong>Total Amount:</strong> ${displayTotal.toFixed(2)}
              </Typography>
            )}
          </Box>

          {/* Shipping Address */}
          {shipping_address && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Shipping Address:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {shipping_address.street}<br/>
                {shipping_address.city}, {shipping_address.state} {shipping_address.zip_code}<br/>
                {shipping_address.country}
              </Typography>
            </Box>
          )}

          {/* Payment Method */}
          {payment_method && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Payment Method:</strong> {payment_method.type.replace('_', ' ').toUpperCase()}
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            You will receive a confirmation email shortly with your order details and tracking information.
          </Typography>
        </>
      )}
      
      {!success && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Please try again or contact support if the problem persists.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
