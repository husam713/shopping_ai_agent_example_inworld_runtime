import { Box, Card, CardContent, CardMedia, Chip, Rating, Typography } from '@mui/material';
import React from 'react';

import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onViewDetails?: (product: Product) => void;
  showActions?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onAddToCart, 
  onViewDetails,
  showActions = true 
}) => {


  return (
    <Card 
      sx={{ 
        maxWidth: 280, 
        minWidth: 250,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)',
          transition: 'all 0.2s ease-in-out'
        }
      }}
    >
      {product.image_url && (
        <CardMedia
          component="img"
          height="140"
          image={product.image_url}
          alt={product.name}
          sx={{ objectFit: 'cover' }}
        />
      )}
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography gutterBottom variant="h6" component="div" noWrap>
          {product.name}
        </Typography>
        
        {product.brand && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {product.brand}
          </Typography>
        )}
        
        {product.category && (
          <Chip 
            label={product.category} 
            size="small" 
            variant="outlined" 
            sx={{ alignSelf: 'flex-start', mb: 1 }}
          />
        )}
        
        {product.description && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: 1, 
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {product.description}
          </Typography>
        )}
        
        {product.rating && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Rating value={product.rating} readOnly size="small" />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              ({product.rating})
            </Typography>
          </Box>
        )}
        
        <Box sx={{ mt: 'auto' }}>
          <Typography variant="h6" color="primary" gutterBottom>
            ${product.price.toFixed(2)}
          </Typography>
          
          {product.availability === false && (
            <Chip 
              label="Out of Stock" 
              color="error" 
              size="small" 
              sx={{ mb: 1 }}
            />
          )}
          

        </Box>
      </CardContent>
    </Card>
  );
};
