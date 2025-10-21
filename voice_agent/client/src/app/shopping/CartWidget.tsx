import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar,
  Avatar,
  Divider,
  Chip
} from '@mui/material';
import { 
  ShoppingCart, 
  CheckCircle 
} from '@mui/icons-material';
import React from 'react';

import { Cart, CartItem, Product } from '../types';

interface CartWidgetProps {
  cart?: Cart;
  cartUpdate?: {
    success: boolean;
    message: string;
    cart?: Cart;
  };
  onUpdateQuantity?: (product: Product, quantity: number) => void;
  onRemoveItem?: (product: Product) => void;
}

export const CartWidget: React.FC<CartWidgetProps> = ({
  cart,
  cartUpdate,
  onUpdateQuantity,
  onRemoveItem,
}) => {
  console.log('[CartWidget] Received props:', {
    cart,
    cartUpdate,
    hasCart: !!cart,
    hasCartUpdate: !!cartUpdate,
    cartItems: cart?.items,
    cartItemsLength: cart?.items?.length
  });
  // Show cart update message if available
  if (cartUpdate && !cart) {
    return (
      <Paper 
        elevation={2} 
        sx={{ 
          p: 2, 
          mb: 2, 
          backgroundColor: cartUpdate.success ? '#e8f5e8' : '#ffebee',
          border: `1px solid ${cartUpdate.success ? '#4caf50' : '#f44336'}`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <CheckCircle 
            color={cartUpdate.success ? 'success' : 'error'} 
            sx={{ mr: 1 }} 
          />
          <Typography variant="h6" component="h3">
            Cart Update
          </Typography>
        </Box>
        <Typography variant="body1">
          {cartUpdate.message}
        </Typography>
      </Paper>
    );
  }

  // Show cart contents
  const displayCart = cartUpdate?.cart || cart;
  
  if (!displayCart || !displayCart.items || displayCart.items.length === 0) {
    return (
      <Paper 
        elevation={2} 
        sx={{ 
          p: 2, 
          mb: 2, 
          backgroundColor: '#f8f9fa',
          border: '1px solid #e9ecef'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <ShoppingCart color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" component="h3">
            Shopping Cart
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Your cart is empty
        </Typography>
      </Paper>
    );
  }



  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 2, 
        mb: 2, 
        backgroundColor: '#f8f9fa',
        border: '1px solid #e9ecef'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ShoppingCart color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" component="h3">
            Shopping Cart
          </Typography>
        </Box>
        <Chip 
          label={`${displayCart.itemCount} products`} 
          color="primary" 
          size="small"
        />
      </Box>
      
      {cartUpdate && (
        <Box sx={{ mb: 2 }}>
          <Typography 
            variant="body2" 
            color={cartUpdate.success ? 'success.main' : 'error.main'}
          >
            {cartUpdate.message}
          </Typography>
        </Box>
      )}
      
      <List sx={{ width: '100%' }}>
        {displayCart.items.map((item, index) => (
          <React.Fragment key={item.product.id}>
            <ListItem
              sx={{ px: 0 }}
              secondaryAction={
                <Typography variant="body1" sx={{ minWidth: 24, textAlign: 'center' }}>
                  Qty: {item.quantity}
                </Typography>
              }
            >
              <ListItemAvatar>
                <Avatar 
                  src={item.product.image_url} 
                  alt={item.product.name}
                  sx={{ width: 48, height: 48 }}
                >
                  {item.product.name.charAt(0)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box>
                    <Typography variant="h6" component="div">
                      {item.product.name}
                    </Typography>
                    {item.product.brand && (
                      <Typography variant="body2" color="text.secondary">
                        by {item.product.brand}
                      </Typography>
                    )}
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      ${item.product.price.toFixed(2)} each
                    </Typography>
                    <Typography variant="body1" color="primary" sx={{ fontWeight: 'bold' }}>
                      Subtotal: ${(item.product.price * item.quantity).toFixed(2)}
                    </Typography>
                    {item.product.category && (
                      <Chip 
                        label={item.product.category} 
                        size="small" 
                        variant="outlined" 
                        sx={{ mt: 0.5 }}
                      />
                    )}
                  </Box>
                }
                sx={{ mr: 2 }}
              />
            </ListItem>
            {index < displayCart.items.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
      
      <Divider sx={{ my: 2 }} />
      
      {/* Cart Summary */}
      <Box sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 1, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Cart Summary
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body1">
            Items ({(displayCart as any).total_items || displayCart.itemCount} total):
          </Typography>
          <Typography variant="body1">
            ${displayCart.total.toFixed(2)}
          </Typography>
        </Box>
        
        {(displayCart as any).estimated_tax && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body1" color="text.secondary">
              Estimated Tax:
            </Typography>
            <Typography variant="body1" color="text.secondary">
              ${(displayCart as any).estimated_tax.toFixed(2)}
            </Typography>
          </Box>
        )}
        
        <Divider sx={{ my: 1 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {(displayCart as any).estimated_total ? 'Estimated Total:' : 'Subtotal:'}
          </Typography>
          <Typography variant="h6" color="primary">
            ${((displayCart as any).estimated_total || displayCart.total).toFixed(2)}
          </Typography>
        </Box>
        
        {(displayCart as any).estimated_total && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Tax and shipping calculated at checkout
          </Typography>
        )}
      </Box>
      

    </Paper>
  );
};
