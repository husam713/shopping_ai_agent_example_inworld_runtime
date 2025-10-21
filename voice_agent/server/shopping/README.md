# Shopping AI Agent - Server Implementation

This folder contains the server-side implementation of the Shopping AI Agent with LLM node tool calls support.

## 📁 File Structure

```
shopping/
├── tools.ts                              # Tool definitions and handlers for shopping functionality
├── nodes.ts                              # Shopping-specific graph nodes (ToolHandler, ProxyNode)
├── constants.ts                          # Shopping constants, messages, and configuration
├── utils.ts                              # Shopping utility functions for graph integration
├── products.ts                           # Comprehensive product catalog with electronics and sports
├── example.ts                            # CLI example demonstrating shopping flow with tool execution
├── index.ts                              # Module exports for clean imports
└── README.md                             # This documentation
```

## 🛠️ Core Components

### 1. **tools.ts** - Shopping Tools & Handlers
Contains the tool definitions and execution handlers for:
- `recommend_products` - Product recommendations based on user preferences and search queries
- `get_product_info` - Detailed product information retrieval with reviews and availability
- `add_to_cart` - Add products to shopping cart with quantity management
- `update_cart` - Update cart by modifying quantities or removing items completely
- `view_cart` - View current cart contents with totals and tax calculations
- `checkout_order` - Process checkout for cart items with shipping and payment validation

### 2. **products.ts** - Product Catalog
Comprehensive product catalog with structured data:
- **Electronics**: 20 products including headphones, keyboards, webcams, smart devices
- **Sports**: 20 products including yoga mats, fitness equipment, sports gear
- **Product Interface**: Standardized product structure with reviews, ratings, stock levels
- **Brand Variety**: Multiple brands per category for realistic shopping experience

### 3. **nodes.ts** - Shopping Graph Nodes
Reusable shopping-specific graph nodes:
- `ShoppingProxyNode` - Forwards input to multiple downstream nodes
- `ShoppingToolHandlerNode` - Executes shopping tools with content stream support
- Advanced tool call processing with aggregation and error handling

### 4. **constants.ts** - Shopping Constants
Shopping-specific constants and configuration:
- `SHOPPING_SYSTEM_MESSAGE_ENHANCEMENT` - Detailed system message for shopping AI
- `SHOPPING_NODE_IDS` - Standardized node identifiers
- `SHOPPING_GRAPH_NAMES` - Graph naming conventions for audio/text variants

### 5. **utils.ts** - Shopping Utilities
Helper functions for shopping integration:
- `enhanceSystemMessageWithShopping` - Enhances existing system messages with shopping capabilities
- `createShoppingChatRequest` - Creates LLM requests with shopping tools and tool choice
- `getShoppingGraphName` - Generates appropriate graph names based on input type

### 6. **example.ts** - CLI Shopping Example
Command-line interface demonstrating:
- Complete shopping flow with tool execution
- Streaming and non-streaming response handling
- Tool result processing and display
- Error handling and cleanup
- Usage examples and help documentation

### 7. **index.ts** - Module Exports
Clean export interface for the shopping module:
- All shopping tools and handlers
- Graph nodes and utilities
- Constants and system messages
- Single import point for external usage

## 🚀 Usage

### Running the Shopping Example

From the shopping directory:
```bash
cd core/server/shopping

# Set your API key
export INWORLD_API_KEY="your-api-key-here"

# Product recommendation
yarn ts-node example.ts '{"user_input": "I need wireless headphones under $100"}' --toolChoice="auto"

# Complete shopping flow
yarn ts-node example.ts '{"user_input": "I want to buy wireless headphones, add them to cart, and checkout to 123 Main St, New York"}' --toolChoice="auto"

# Add to cart
yarn ts-node example.ts '{"user_input": "Add product e001 to my cart"}' --toolChoice="auto"

# Update cart quantity
yarn ts-node example.ts '{"user_input": "Change the headphones quantity to 2"}' --toolChoice="auto"

# View cart
yarn ts-node example.ts '{"user_input": "Show me my cart"}' --toolChoice="auto"

# Product details
yarn ts-node example.ts '{"user_input": "Tell me more about the Gaming Mechanical Keyboard"}' --toolChoice="auto"

# Specific tool usage
yarn ts-node example.ts '{"user_input": "Show me electronics"}' --toolChoice="recommend_products"

# Streaming responses
yarn ts-node example.ts '{"user_input": "Recommend sports equipment"}' --toolChoice="auto" --stream=true
```

### Integrating with Your Application

**The shopping functionality is integrated into the main application graph in `core/server/components/graph.ts`.**

```typescript
import { InworldGraph } from '../components/graph';

// Create main application graph with shopping support
const graph = await InworldGraph.create({
  apiKey: process.env.INWORLD_API_KEY,
  llmModelName: 'gpt-4o',
  llmProvider: 'openai',
  voiceId: 'your-voice-id',
  connections: {}, // Your WebSocket connection management
  withAudioInput: false,  // or true for audio support
  ttsModelId: 'your-tts-model-id',
  graphVisualizationEnabled: false
});

// Shopping functionality is automatically included via shopping nodes
// Use in your application
const outputStream = await graph.executor.start(inputData, sessionId);

// Process responses (shopping data is automatically formatted)
for await (const result of outputStream) {
  await result.processResponse({
    Content: async (response) => {
      // Handle AI response with shopping data
      console.log('Response:', response.text);
      if (response.shopping_data) {
        // Update your UI with shopping information
        updateShoppingUI(response.shopping_data);
      }
    }
  });
}

// Clean up
graph.destroy();
```

### Using Shopping Components Individually

```typescript
import { 
  ShoppingToolHandlerNode, 
  enhanceSystemMessageWithShopping,
  createShoppingChatRequest,
  SHOPPING_TOOLS 
} from './shopping';

// Add shopping tools to existing LLM request
const shoppingRequest = createShoppingChatRequest(messages, 'auto');

// Enhance existing system message
const enhancedMessages = enhanceSystemMessageWithShopping(messages);

// Use shopping tool handler in custom graph
const toolHandler = new ShoppingToolHandlerNode({ id: 'shopping-tools' });
```

## 🛍️ Shopping Flow

The shopping experience follows this flow:

1. **Product Discovery**
   ```
   User: "I need wireless headphones"
   → recommend_products tool → Returns product list with details
   ```

2. **Add to Cart**
   ```
   User: "Add the first one to my cart"
   → add_to_cart tool → Adds product to user's cart
   ```

3. **Cart Management**
   ```
   User: "Show me my cart"
   → view_cart tool → Returns cart contents and totals
   ```

4. **Checkout**
   ```
   User: "Checkout to 123 Main St, New York, pay with credit card"
   → checkout_order tool → Processes order and returns confirmation
   ```

## 🔧 Tool Details

### recommend_products
- **Input**: query (required), category (optional), price_range (optional), limit (optional, default: 5)
- **Output**: Array of products with details (name, price, rating, stock, description, brand)
- **Use Case**: Browse products, search by criteria, category filtering
- **Features**: Smart text search, price filtering, rating-based sorting

### get_product_info
- **Input**: product_id (required), include_reviews (optional, default: false), include_availability (optional, default: true)
- **Output**: Detailed product information, reviews, stock status, brand details
- **Use Case**: Deep dive into specific product details, customer reviews
- **Features**: ID or name-based lookup, optional review inclusion

### add_to_cart
- **Input**: product_id (required), quantity (optional, default: 1), user_name (optional)
- **Output**: Success/failure, cart summary, product added details, full cart contents
- **Use Case**: Add items to shopping cart with stock validation
- **Features**: Automatic quantity updates, stock checking, cart totals

### update_cart
- **Input**: product_id (required), action (required: 'set_quantity' or 'remove'), quantity (for set_quantity), user_name (optional)
- **Output**: Success/failure, updated item details, cart summary
- **Use Case**: Modify cart quantities or remove items completely
- **Features**: Quantity updates, item removal, stock validation

### view_cart
- **Input**: user_name (optional)
- **Output**: Cart items with full product details, totals, tax calculations, estimated total
- **Use Case**: Review cart contents before checkout
- **Features**: Client-formatted items, tax calculations, empty cart handling

### checkout_order
- **Input**: user_name (optional), shipping_address (required), payment_method (required)
- **Output**: Order confirmation, order ID, tracking number, delivery estimate
- **Use Case**: Complete purchase transaction with validation
- **Features**: Stock validation, automatic inventory updates, order generation

## 💾 Data Storage

Currently uses in-memory storage for demonstration:
- **Products**: `SAMPLE_PRODUCTS` array with 40 products (20 electronics + 20 sports)
  - **Electronics**: Headphones, keyboards, mice, webcams, smart devices, storage, speakers
  - **Sports**: Yoga equipment, fitness gear, sports balls, training accessories, outdoor gear
- **Carts**: `SHOPPING_CARTS` object keyed by conversation ID
- **Default Conversation**: `current_conversation` for session-based cart management

**Product Data Structure:**
- **Product Interface**: Standardized with ID, name, price, category, brand, description
- **Reviews**: Customer reviews with ratings and comments
- **Stock Management**: Real-time stock levels and availability tracking
- **Rich Metadata**: Images, ratings, detailed descriptions for realistic shopping

**Production Notes:**
- Replace with database connections (PostgreSQL, MongoDB, etc.)
- Implement proper user authentication and session management
- Add persistent cart storage with user accounts
- Integrate with real payment systems (Stripe, PayPal, etc.)
- Connect to inventory management systems
- Add product search indexing (Elasticsearch, etc.)

## 🎯 Key Features

### Cart Management
- Automatic quantity updates for existing items
- Stock validation before adding to cart
- Real-time cart totals and tax calculations
- Cart persistence during session

### Stock Management
- Real-time stock checking
- Automatic stock updates after purchase
- Stock availability messaging

### Order Processing
- Order ID generation
- Tax calculations (8% default)
- Shipping address validation
- Payment method handling
- Tracking number generation

### Error Handling
- Product not found validation
- Insufficient stock warnings
- Empty cart checkout prevention
- Payment validation

## 🔄 Integration Points

### Client Response Format
```typescript
{
  text: "AI conversational response",
  toolCalls?: ToolCall[],          // Original tool calls with results
  shopping_data?: {
    recommendations?: {              // From recommend_products
      recommendations: Product[],
      total_found: number,
      search_query: string
    },
    product_details?: {             // From get_product_info  
      id: string,
      name: string,
      price: number,
      description: string,
      rating: number,
      availability: string,
      reviews?: Review[]
    },
    cart_update?: {                 // From add_to_cart or update_cart
      success: boolean,
      message: string,
      product_added?: ProductInCart,
      cart_summary: CartSummary,
      cart: CartContents
    },
    cart_contents?: {               // From view_cart
      items: ClientCartItem[],
      total_amount: number,
      total_items: number,
      estimated_tax: number,
      estimated_total: number
    },
    order_result?: {                // From checkout_order
      success: boolean,
      order_id?: string,
      total_amount?: number,
      tracking_number?: string,
      estimated_delivery?: string,
      error?: string
    }
  }
}
```

### Graph Integration Notes
Shopping functionality is automatically integrated into the main application graph:
- **Shopping nodes** are automatically included in the main graph (`ShoppingProxyNode`, `ShoppingToolHandlerNode`, `ShoppingStateNode`)
- **System message enhancement** is applied automatically for shopping capabilities
- **Tool execution** happens transparently within the graph flow
- **Response formatting** includes shopping data alongside text responses
- Standard InWorld graph configuration options apply (apiKey, llmModelName, llmProvider, voiceId, etc.)

## 📝 Example Interactions

**Product Search:**
```
User: "Show me wireless headphones under $100"
AI: Uses recommend_products → Returns Wireless Bluetooth Headphones ($79.99) and Portable Bluetooth Speaker ($59.99)
```

**Add to Cart:**
```
User: "Add the Wireless Bluetooth Headphones to my cart"
AI: Uses add_to_cart → "Added 1 x Wireless Bluetooth Headphones to your cart ($79.99)"
```

**Cart Management:**
```
User: "Change the headphones quantity to 2"
AI: Uses update_cart → "Updated Wireless Bluetooth Headphones quantity from 1 to 2 in your cart"
```

**Cart Review:**
```
User: "What's in my cart?"
AI: Uses view_cart → Shows 2 headphones, subtotal $159.98, tax $12.80, total $172.78
```

**Product Details:**
```
User: "Tell me more about the Gaming Mechanical Keyboard"
AI: Uses get_product_info → Returns RGB keyboard details, Cherry MX switches, $129.99, 4.7 rating
```

**Checkout:**
```
User: "Checkout and ship to 123 Main St, NYC, pay with credit card"
AI: Uses checkout_order → Order ORD-1234567890 confirmed, tracking TRK-ABC123XYZ
```

## 🚀 Next Steps

1. **Database Integration**: Replace in-memory storage with persistent database
2. **User Authentication**: Add proper user management and authentication
3. **Payment Integration**: Connect with real payment processors
4. **Inventory Management**: Real-time inventory tracking
5. **Order Fulfillment**: Integration with shipping and logistics
6. **Analytics**: Track user behavior and shopping patterns

---

**Ready to build your shopping experience? Start with the example.ts and customize for your needs!** 🛍️
