import {
  CustomNode,
  GraphTypes,
  ProcessContext,
} from '@inworld/runtime/graph';
import {
  ShoppingToolHandler,
  SHOPPING_TOOLS,
} from '../shopping';

export class ApiBuilderNode extends CustomNode {
  constructor() {
    super({ id: 'api-builder-node' });
  }

  async process(
    _context: ProcessContext,
    request: GraphTypes.LLMChatRequest,
  ): Promise<GraphTypes.LLMChatRequest> {
    const tools = SHOPPING_TOOLS.map((tool: any) => ({
      ...tool,
      handler: (args: any) => {
        switch (tool.name) {
          case 'recommend_products':
            return ShoppingToolHandler.recommendProducts(args);
          case 'get_product_info':
            return ShoppingToolHandler.getProductInfo(args);
          case 'add_to_cart':
            return ShoppingToolHandler.addToCart(args);
          case 'update_cart':
            return ShoppingToolHandler.updateCart(args);
          case 'view_cart':
            return ShoppingToolHandler.viewCart(args);
          case 'checkout_order':
            return ShoppingToolHandler.checkoutOrder(args);
          default:
            return Promise.resolve({
              error: `Tool ${tool.name} not found`,
            });
        }
      },
    }));

    (request as any).tools = tools;
    return request;
  }
}
