import { SHOPPING_TOOLS } from './tools';
import { 
  SHOPPING_SYSTEM_MESSAGE_ENHANCEMENT, 
  FALLBACK_SHOPPING_SYSTEM_MESSAGE, 
  SHOPPING_GRAPH_NAMES 
} from './constants';

/**
 * Utility functions for shopping integration
 */

/**
 * Enhances existing system message with shopping capabilities
 */
export function enhanceSystemMessageWithShopping(
  conversationMessages: any[]
): any[] {

  // Find existing system message (which contains the agent configuration)
  const systemMessageIndex = conversationMessages.findIndex(msg => msg.role === 'system');
  
  if (systemMessageIndex >= 0) {
    // Enhance the existing system message with shopping capabilities
    const existingSystemMessage = conversationMessages[systemMessageIndex];
    const enhancedSystemMessage = {
      ...existingSystemMessage,
      content: `${existingSystemMessage.content}${SHOPPING_SYSTEM_MESSAGE_ENHANCEMENT}`,
    };
    
    return [
      ...conversationMessages.slice(0, systemMessageIndex),
      enhancedSystemMessage,
      ...conversationMessages.slice(systemMessageIndex + 1)
    ];
  } else {
    // If no system message exists, add a basic shopping-enabled one
    const shoppingSystemMessage = {
      role: 'system',
      content: FALLBACK_SHOPPING_SYSTEM_MESSAGE,
    };
    return [shoppingSystemMessage, ...conversationMessages];
  }
}

/**
 * Creates shopping-enabled LLM chat request data
 */
export function createShoppingChatRequest(
  allMessages: any[],
  toolChoice: string
): any {
  const requestData: any = {
    messages: allMessages,
    tools: SHOPPING_TOOLS,
  };

  // Set tool choice
  if (toolChoice === 'auto' || toolChoice === 'required' || toolChoice === 'none') {
    requestData.toolChoice = {
      choice: toolChoice,
    };
  } else {
    // Specific function name
    requestData.toolChoice = {
      choice: {
        name: toolChoice,
      },
    };
  }

  return requestData;
}

/**
 * Gets appropriate graph name based on audio settings
 */
export function getShoppingGraphName(
  withAudioInput: boolean
): string {
  return withAudioInput 
    ? SHOPPING_GRAPH_NAMES.WITH_AUDIO 
    : SHOPPING_GRAPH_NAMES.WITH_TEXT;
}
