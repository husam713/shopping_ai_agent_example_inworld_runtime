import { 
  Box, 
  Typography, 
  Paper, 
  Chip, 
  Rating, 
  Divider,
  Grid
} from '@mui/material';
import { Info } from '@mui/icons-material';
import React from 'react';

import { Product } from '../types';

interface ProductDetailsProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export const ProductDetailsWidget: React.FC<ProductDetailsProps> = ({
  product,
  onAddToCart,
}) => {

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        mb: 2, 
        backgroundColor: '#f8f9fa',
        border: '1px solid #e9ecef'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Info color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6" component="h3">
          Product Details
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        {product.image_url && (
          <Grid item xs={12} md={4}>
            <Box
              component="img"
              src={product.image_url}
              alt={product.name}
              sx={{
                width: '100%',
                height: 'auto',
                maxHeight: 300,
                objectFit: 'cover',
                borderRadius: 1,
                border: '1px solid #e0e0e0'
              }}
            />
          </Grid>
        )}
        
        <Grid item xs={12} md={product.image_url ? 8 : 12}>
          <Typography variant="h5" component="h4" gutterBottom>
            {product.name}
          </Typography>
          
          {product.brand && (
            <Typography variant="h6" color="text.secondary" gutterBottom>
              by {product.brand}
            </Typography>
          )}
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="h4" color="primary">
              ${product.price.toFixed(2)}
            </Typography>
            
            {product.availability === false && (
              <Chip 
                label="Out of Stock" 
                color="error" 
                size="small"
              />
            )}
            
            {product.availability !== false && (
              <Chip 
                label="In Stock" 
                color="success" 
                size="small"
              />
            )}
          </Box>
          
          {product.category && (
            <Box sx={{ mb: 2 }}>
              <Chip 
                label={product.category} 
                variant="outlined" 
                size="medium"
              />
            </Box>
          )}
          
          {product.rating && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Rating value={product.rating} readOnly />
              <Typography variant="body1" sx={{ ml: 1 }}>
                {product.rating} out of 5
              </Typography>
            </Box>
          )}
          
          {product.description && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Description
              </Typography>
              <Typography variant="body1" paragraph>
                {product.description}
              </Typography>
            </>
          )}
          

        </Grid>
      </Grid>
    </Paper>
  );
};
