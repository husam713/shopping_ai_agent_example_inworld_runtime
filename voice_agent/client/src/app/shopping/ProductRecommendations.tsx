import { Box, Typography, Grid, Paper } from '@mui/material';
import { Storefront } from '@mui/icons-material';
import React from 'react';

import { Product, ShoppingRecommendations } from '../types';
import { ProductCard } from './ProductCard';

interface ProductRecommendationsProps {
  recommendations: ShoppingRecommendations;
  onAddToCart?: (product: Product) => void;
  onViewDetails?: (product: Product) => void;
}

export const ProductRecommendationsWidget: React.FC<ProductRecommendationsProps> = ({
  recommendations,
  onAddToCart,
  onViewDetails,
}) => {
  if (!recommendations.products || recommendations.products.length === 0) {
    return null;
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
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Storefront color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6" component="h3">
          Product Recommendations
        </Typography>
      </Box>
      
      {recommendations.query && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Based on your search: "{recommendations.query}"
        </Typography>
      )}
      
      {recommendations.category && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Category: {recommendations.category}
        </Typography>
      )}
      
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          pb: 1,
          '&::-webkit-scrollbar': {
            height: 8,
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#f1f1f1',
            borderRadius: 4,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#c1c1c1',
            borderRadius: 4,
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#a8a8a8',
          },
        }}
      >
        {recommendations.products.map((product) => (
          <Box key={product.id} sx={{ flex: '0 0 auto' }}>
            <ProductCard
              product={product}
              onAddToCart={onAddToCart}
              onViewDetails={onViewDetails}
            />
          </Box>
        ))}
      </Box>
    </Paper>
  );
};
