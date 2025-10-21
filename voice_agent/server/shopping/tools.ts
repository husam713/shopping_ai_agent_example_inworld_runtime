// Shopping AI Agent Tool Definitions
export const SHOPPING_TOOLS = [
  {
    name: 'recommend_products',
    description: 'Recommend products based on user preferences and existing product catalog',
    properties: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The user search query or preferences (e.g., "wireless headphones under $100")',
        },
        category: {
          type: 'string',
          description: 'Product category to search in (optional)',
        },
        price_range: {
          type: 'object',
          properties: {
            min: {
              type: 'number',
              description: 'Minimum price'
            },
            max: {
              type: 'number', 
              description: 'Maximum price'
            }
          },
          description: 'Price range filter (optional)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of products to recommend (default: 5)',
          default: 5
        }
      },
      required: ['query'],
    },
  },
  {
    name: 'get_product_info',
    description: 'Get detailed information about a specific product',
    properties: {
      type: 'object',
      properties: {
        product_id: {
          type: 'string',
          description: 'The unique identifier or exact name of the product (e.g., "p001" or "Wireless Bluetooth Headphones")',
        },
        include_reviews: {
          type: 'boolean',
          description: 'Whether to include customer reviews (default: false)',
          default: false
        },
        include_availability: {
          type: 'boolean',
          description: 'Whether to include stock availability (default: true)',
          default: true
        }
      },
      required: ['product_id'],
    },
  },
  {
    name: 'add_to_cart',
    description: 'Add products to the shopping cart',
    properties: {
      type: 'object',
      properties: {
        product_id: {
          type: 'string',
          description: 'The unique identifier or exact name of the product to add (e.g., "p001" or "Wireless Bluetooth Headphones")',
        },
        quantity: {
          type: 'number',
          description: 'Number of items to add to cart (default: 1)',
          default: 1,
          minimum: 1
        },
        user_name: {
          type: 'string',
          description: 'Customer name for personalized response',
        }
      },
      required: ['product_id'],
    },
  },
  {
    name: 'update_cart',
    description: 'Update cart by modifying item quantities or removing items completely',
    properties: {
      type: 'object',
      properties: {
        product_id: {
          type: 'string',
          description: 'The unique identifier or exact name of the product to update (e.g., "p001" or "Wireless Bluetooth Headphones")',
        },
        quantity: {
          type: 'number',
          description: 'New quantity for the item. Set to 0 to remove item completely',
          minimum: 0
        },
        action: {
          type: 'string',
          enum: ['set_quantity', 'remove'],
          description: 'Action to perform: set_quantity to update quantity, remove to delete item'
        },
        user_name: {
          type: 'string',
          description: 'Customer name for personalized response',
        }
      },
      required: ['product_id', 'action'],
    },
  },
  {
    name: 'view_cart',
    description: 'View current items in the shopping cart',
    properties: {
      type: 'object',
      properties: {
        user_name: {
          type: 'string',
          description: 'Customer name for personalized response',
        }
      },
      required: [],
    },
  },
  {
    name: 'checkout_order',
    description: 'Process checkout for items currently in the shopping cart',
    properties: {
      type: 'object',
      properties: {
        user_name: {
          type: 'string',
          description: 'Customer name for personalized response',
        },
        shipping_address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            zip_code: { type: 'string' },
            country: { type: 'string' }
          },
          required: ['street', 'city', 'state', 'zip_code', 'country'],
          description: 'Shipping address for the order'
        },
        payment_method: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['credit_card', 'debit_card', 'paypal', 'apple_pay'],
              description: 'Payment method type'
            },
            card_token: {
              type: 'string',
              description: 'Tokenized card information (for card payments)'
            }
          },
          required: ['type'],
          description: 'Payment method information'
        }
      },
      required: ['shipping_address', 'payment_method'],
    },
  },
] as any;

// Import products from separate catalog file
import { SAMPLE_PRODUCTS } from './products';

// Cart item interface (internal storage)
interface CartItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  category: string;
  added_at: string;
}

// Client-side cart item interface
interface ClientCartItem {
  product: {
    id: string;
    name: string;
    price: number;
    description: string;
    category: string;
    image_url: string;
    brand: string;
    rating: number;
    availability: boolean;
  };
  quantity: number;
}

// Simple in-memory cart storage (in production, use database or session storage)
const SHOPPING_CARTS: { [conversationId: string]: CartItem[] } = {};
const DEFAULT_CONVERSATION_ID = 'current_conversation';

// Tool execution functions
export class ShoppingToolHandler {
  
  static async recommendProducts(args: any) {
    const { query, category, price_range, limit = 5 } = JSON.parse(args);
    
    let products = [...SAMPLE_PRODUCTS];
    
    // Filter by category if specified
    if (category) {
      products = products.filter(p => 
        p.category.toLowerCase().includes(category.toLowerCase())
      );
    }
    
    // Filter by price range if specified
    if (price_range) {
      products = products.filter(p => {
        const price = p.price;
        return (!price_range.min || price >= price_range.min) &&
               (!price_range.max || price <= price_range.max);
      });
    }
    
    // Improved text search in name and description
    if (query) {
      const searchTerm = query.toLowerCase();
      // Split search term into individual words for better matching
      const searchWords = searchTerm.split(/\s+/).filter((word: string) => word.length > 2);
      
      products = products.filter(p => {
        const productText = `${p.name} ${p.description} ${p.category}`.toLowerCase();
        
        // If no meaningful search words, return all products in the category
        if (searchWords.length === 0) {
          return true;
        }
        
        // Match if any search word is found in product text
        return searchWords.some((word: string) => productText.includes(word)) ||
               productText.includes(searchTerm); // Also try full phrase
      });
    }
    
    // Sort by rating and limit results
    products = products
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
    
    return {
      recommendations: products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category,
        rating: p.rating,
        stock: p.stock,
        description: p.description,
        image_url: p.image_url,
        brand: p.brand,
        availability: p.stock > 0
      })),
      total_found: products.length,
      search_query: query
    };
  }
  
  static async getProductInfo(args: any) {
    const { product_id, include_reviews = false, include_availability = true } = JSON.parse(args);
    
    // Find the product by ID or name
    const product = SAMPLE_PRODUCTS.find(p => 
      p.id === product_id || 
      p.name.toLowerCase() === product_id.toLowerCase()
    );
    
    if (!product) {
      return {
        error: `Product not found: ${product_id}. Please use product ID or exact product name.`,
        product_id,
        available_products: SAMPLE_PRODUCTS.map(p => ({ id: p.id, name: p.name }))
      };
    }
    
    const result: any = {
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      description: product.description,
      rating: product.rating,
      image_url: product.image_url,
      brand: product.brand
    };
    
    if (include_availability) {
      result.stock = product.stock;
      result.availability = product.stock > 0 ? 'In Stock' : 'Out of Stock';
    }
    
    if (include_reviews) {
      result.reviews = product.reviews;
      result.review_count = product.reviews.length;
    }
    
    return result;
  }
  
  static async addToCart(args: any) {
    const { product_id, quantity = 1, user_name = 'customer' } = JSON.parse(args);
    const conversationId = DEFAULT_CONVERSATION_ID; // One cart per conversation
    
    // Find the product by ID or name
    const product = SAMPLE_PRODUCTS.find(p => 
      p.id === product_id || 
      p.name.toLowerCase() === product_id.toLowerCase()
    );
    if (!product) {
      return {
        success: false,
        error: `Product not found: ${product_id}. Please use product ID or exact product name.`,
        product_id,
        available_products: SAMPLE_PRODUCTS.map(p => ({ id: p.id, name: p.name }))
      };
    }
    
    // Check stock availability
    if (product.stock < quantity) {
      return {
        success: false,
        error: `Insufficient stock. Available: ${product.stock}, Requested: ${quantity}`,
        product_id,
        available_stock: product.stock
      };
    }
    
    // Initialize cart if it doesn't exist
    if (!SHOPPING_CARTS[conversationId]) {
      SHOPPING_CARTS[conversationId] = [];
    }
    
    // Check if product already exists in cart (search by both ID and name)
    const existingItemIndex = SHOPPING_CARTS[conversationId].findIndex(item => 
      item.product_id === product.id || 
      item.product_name.toLowerCase() === product.name.toLowerCase()
    );
    
    let finalQuantity = quantity;
    let isUpdate = false;
    
    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      const currentQuantity = SHOPPING_CARTS[conversationId][existingItemIndex].quantity;
      finalQuantity = currentQuantity + quantity;
      isUpdate = true;
      
      if (finalQuantity > product.stock) {
        return {
          success: false,
          error: `Cannot add ${quantity} more items. Cart has ${currentQuantity}, stock is ${product.stock}`,
          product_id,
          current_cart_quantity: currentQuantity,
          available_stock: product.stock
        };
      }
      
      SHOPPING_CARTS[conversationId][existingItemIndex].quantity = finalQuantity;
      SHOPPING_CARTS[conversationId][existingItemIndex].total_price = finalQuantity * product.price;
    } else {
      // Add new item to cart
      SHOPPING_CARTS[conversationId].push({
        product_id: product.id,
        product_name: product.name,
        unit_price: product.price,
        quantity: quantity,
        total_price: quantity * product.price,
        category: product.category,
        added_at: new Date().toISOString()
      });
    }
    
    // Calculate cart totals
    const cartTotal = SHOPPING_CARTS[conversationId].reduce((sum, item) => sum + item.total_price, 0);
    const totalItems = SHOPPING_CARTS[conversationId].reduce((sum, item) => sum + item.quantity, 0);
    
    // Create appropriate message based on whether it's an update or new item
    const message = isUpdate 
      ? `Updated ${product.name} in cart (now ${finalQuantity} total)`
      : `Added ${quantity} x ${product.name} to ${user_name}'s cart`;
    
    // Get full cart contents to include in response
    const fullCartContents = await this.viewCart(JSON.stringify({ user_name }));
    
    return {
      success: true,
      message: message,
      product_added: {
        product_id: product.id,
        product_name: product.name,
        quantity: finalQuantity, // Show final quantity, not just what was added
        unit_price: product.price,
        total_price: finalQuantity * product.price,
        added_quantity: quantity, // Also show how much was added this time
        was_updated: isUpdate
      },
      cart_summary: {
        total_items: totalItems,
        total_amount: parseFloat(cartTotal.toFixed(2)),
        item_count: SHOPPING_CARTS[conversationId].length
      },
      cart: fullCartContents // Include full cart contents
    };
  }
  
  static async updateCart(args: any) {
    const { product_id, quantity, action, user_name = 'customer' } = JSON.parse(args);
    const conversationId = DEFAULT_CONVERSATION_ID;
    
    // Check if cart exists
    if (!SHOPPING_CARTS[conversationId] || SHOPPING_CARTS[conversationId].length === 0) {
      return {
        success: false,
        error: 'Cart is empty. Cannot update items in an empty cart.',
        cart_status: 'empty'
      };
    }
    
    // Find the item in cart by ID or name
    const itemIndex = SHOPPING_CARTS[conversationId].findIndex(item => 
      item.product_id === product_id || 
      item.product_name.toLowerCase() === product_id.toLowerCase()
    );
    
    if (itemIndex === -1) {
      return {
        success: false,
        error: `Product not found in cart: ${product_id}. Available items: ${SHOPPING_CARTS[conversationId].map(item => item.product_name).join(', ')}`,
        product_id,
        cart_items: SHOPPING_CARTS[conversationId].map(item => ({ id: item.product_id, name: item.product_name }))
      };
    }
    
    const cartItem = SHOPPING_CARTS[conversationId][itemIndex];
    const product = SAMPLE_PRODUCTS.find(p => 
      p.id === cartItem.product_id || 
      p.name.toLowerCase() === cartItem.product_name.toLowerCase()
    );
    
    if (!product) {
      return {
        success: false,
        error: 'Product no longer available',
        product_id
      };
    }
    
    let resultMessage = '';
    let updatedItem = null;
    
    if (action === 'remove' || quantity === 0) {
      // Remove item completely
      SHOPPING_CARTS[conversationId].splice(itemIndex, 1);
      resultMessage = `Removed ${cartItem.product_name} from ${user_name}'s cart`;
    } else if (action === 'set_quantity') {
      // Update quantity
      if (quantity > product.stock) {
        return {
          success: false,
          error: `Cannot set quantity to ${quantity}. Only ${product.stock} available in stock.`,
          product_id,
          requested_quantity: quantity,
          available_stock: product.stock,
          current_cart_quantity: cartItem.quantity
        };
      }
      
      const oldQuantity = cartItem.quantity;
      cartItem.quantity = quantity;
      cartItem.total_price = quantity * cartItem.unit_price;
      
      updatedItem = {
        product_id: cartItem.product_id,
        product_name: cartItem.product_name,
        quantity: quantity,
        unit_price: cartItem.unit_price,
        total_price: cartItem.total_price,
        previous_quantity: oldQuantity
      };
      
      resultMessage = `Updated ${cartItem.product_name} quantity from ${oldQuantity} to ${quantity} in ${user_name}'s cart`;
    } else {
      return {
        success: false,
        error: 'Invalid action. Use "set_quantity" or "remove"',
        action
      };
    }
    
    // Calculate new cart totals
    const cartTotal = SHOPPING_CARTS[conversationId].reduce((sum, item) => sum + item.total_price, 0);
    const totalItems = SHOPPING_CARTS[conversationId].reduce((sum, item) => sum + item.quantity, 0);
    
    return {
      success: true,
      message: resultMessage,
      action: action,
      product_updated: updatedItem,
      cart_summary: {
        total_items: totalItems,
        total_amount: parseFloat(cartTotal.toFixed(2)),
        item_count: SHOPPING_CARTS[conversationId].length
      }
    };
  }
  
  static async viewCart(args: any) {
    const { user_name = 'customer' } = args ? JSON.parse(args) : {};
    const conversationId = DEFAULT_CONVERSATION_ID;
    
    if (!SHOPPING_CARTS[conversationId] || SHOPPING_CARTS[conversationId].length === 0) {
      return {
        items: [] as ClientCartItem[],
        total: 0,
        itemCount: 0,
        total_items: 0,
        total_amount: 0,
        item_count: 0,
        estimated_tax: 0,
        estimated_total: 0,
        message: `${user_name}'s cart is empty`
      };
    }
    
    const cart = SHOPPING_CARTS[conversationId];
    const totalAmount = cart.reduce((sum, item) => sum + item.total_price, 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Convert cart items to match client interface
    const formattedItems = cart.map(item => {
      const product = SAMPLE_PRODUCTS.find(p => p.id === item.product_id);
      return {
        product: {
          id: item.product_id,
          name: item.product_name,
          price: item.unit_price,
          category: item.category,
          description: product?.description || '',
          image_url: product?.image_url || '',
          brand: product?.brand || '',
          rating: product?.rating || 0,
          availability: product ? product.stock > 0 : true
        },
        quantity: item.quantity
      };
    });

    return {
      items: formattedItems,
      total: parseFloat(totalAmount.toFixed(2)),
      itemCount: cart.length,
      total_items: totalItems,
      total_amount: parseFloat(totalAmount.toFixed(2)),
      item_count: cart.length,
      estimated_tax: parseFloat((totalAmount * 0.08).toFixed(2)), // 8% tax
      estimated_total: parseFloat((totalAmount * 1.08).toFixed(2))
    };
  }
  
  static async checkoutOrder(args: any) {
    const { 
      user_name = 'customer',
      shipping_address, 
      payment_method, 
      agent_context 
    } = JSON.parse(args);
    const conversationId = DEFAULT_CONVERSATION_ID;
    
    // Try to extract shipping info from agent knowledge if not provided
    let finalShippingAddress = shipping_address;
    let finalPaymentMethod = payment_method;
    
    if (agent_context?.knowledge && (!shipping_address || !payment_method)) {
      const knowledge = agent_context.knowledge;
      
      // Extract shipping address from knowledge if not provided
      if (!shipping_address && knowledge.includes('shipping address')) {
        const addressMatch = knowledge.match(/shipping address: ([^,\n]+(?:,[^,\n]+)*)/i);
        if (addressMatch) {
          const addressParts = addressMatch[1].split(',').map((s: string) => s.trim());
          if (addressParts.length >= 3) {
            finalShippingAddress = {
              street: addressParts[0],
              city: addressParts[1],
              state: addressParts[2].split(' ')[0],
              zip_code: addressParts[2].split(' ')[1] || '94043',
              country: 'USA'
            };
          }
        }
      }
      
      // Extract payment method from knowledge if not provided
      if (!payment_method && knowledge.includes('payment card')) {
        const cardMatch = knowledge.match(/payment card ending with (\d+)/i);
        if (cardMatch) {
          finalPaymentMethod = {
            type: 'credit_card',
            card_token: `****-****-****-${cardMatch[1]}`
          };
        }
      }
    }
    
    // Validate that we have necessary information for checkout
    if (!finalShippingAddress || !finalPaymentMethod) {
      return {
        success: false,
        error: 'Missing required checkout information. Please provide shipping address and payment method.',
        missing_info: {
          shipping_address: !finalShippingAddress,
          payment_method: !finalPaymentMethod
        }
      };
    }
    
    // Check if cart exists and has items
    if (!SHOPPING_CARTS[conversationId] || SHOPPING_CARTS[conversationId].length === 0) {
      return {
        success: false,
        error: 'Cannot checkout with an empty cart. Please add items to your cart first.',
        cart_status: 'empty'
      };
    }
    
    const cartItems = SHOPPING_CARTS[conversationId];
    const orderItems: any[] = [];
    let totalAmount = 0;
    
    // Validate cart items and check stock
    for (const cartItem of cartItems) {
      const product = SAMPLE_PRODUCTS.find(p => p.id === cartItem.product_id);
      if (!product) {
        return {
          success: false,
          error: `Product not found: ${cartItem.product_id}`,
          product_id: cartItem.product_id
        };
      }
      
      // Check current stock availability
      if (product.stock < cartItem.quantity) {
        return {
          success: false,
          error: `Insufficient stock for ${product.name}. Available: ${product.stock}, In cart: ${cartItem.quantity}`,
          product_id: cartItem.product_id,
          available_stock: product.stock,
          requested_quantity: cartItem.quantity
        };
      }
      
      totalAmount += cartItem.total_price;
      orderItems.push({
        product_id: cartItem.product_id,
        product_name: cartItem.product_name,
        quantity: cartItem.quantity,
        unit_price: cartItem.unit_price,
        total_price: cartItem.total_price,
        category: cartItem.category
      });
    }
    
    // Calculate tax and final total
    const taxAmount = totalAmount * 0.08; // 8% tax
    const finalTotal = totalAmount + taxAmount;
    
    // Generate order ID
    const orderId = `ORD-${Date.now()}`;
    
    // Simulate updating stock (in real app, this would update database)
    cartItems.forEach((cartItem: any) => {
      const product = SAMPLE_PRODUCTS.find(p => p.id === cartItem.product_id);
      if (product) {
        product.stock -= cartItem.quantity;
      }
    });
    
    // Clear the cart after successful checkout
    SHOPPING_CARTS[conversationId] = [];
    
    return {
      success: true,
      order_id: orderId,
      subtotal: parseFloat(totalAmount.toFixed(2)),
      tax: parseFloat(taxAmount.toFixed(2)),
      total_amount: parseFloat(finalTotal.toFixed(2)),
      items: orderItems,
      item_count: orderItems.length,
      total_items: orderItems.reduce((sum, item) => sum + item.quantity, 0),
      shipping_address: finalShippingAddress,
      payment_method: { type: finalPaymentMethod.type },
      estimated_delivery: '3-5 business days',
      order_status: 'confirmed',
      order_date: new Date().toISOString(),
      tracking_number: `TRK-${Math.random().toString(36).substr(2, 12).toUpperCase()}`,
      message: `Order confirmed for ${user_name}! Your items will be delivered in 3-5 business days.`
    };
  }
}
