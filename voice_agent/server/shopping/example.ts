import 'dotenv/config';

import { GraphTypes } from '@inworld/runtime/common';
import {
  GraphBuilder,
  RemoteLLMChatNode,
  LLMChatRequestBuilderNode,
  RequestBuilderToolChoice,
} from '@inworld/runtime/graph';
import { v4 } from 'uuid';
import { SHOPPING_TOOLS, ShoppingToolHandler } from './tools';
import { CLI_SHOPPING_SYSTEM_MESSAGE } from './constants';

const minimist = require('minimist');

const DEFAULT_LLM_MODEL_NAME = 'gpt-4o';

const usage = `
Usage:
    yarn shopping-llm-node '{"user_input": "I want to buy wireless headphones under $100"}'
    --modelName=<model-name>[optional, default=${DEFAULT_LLM_MODEL_NAME}] 
    --provider=<service-provider>[optional, default=openai]
    --toolChoice[optional, tool choice strategy: auto/required/none/function_name]
    --stream[optional, enable streaming responses]

Examples:
    # Product recommendation
    yarn shopping-llm-node '{"user_input": "I need wireless headphones under $100"}' --toolChoice="auto"
    
    # Add to cart flow
    yarn shopping-llm-node '{"user_input": "Add product p001 to my cart"}' --toolChoice="auto"
    
    # View cart
    yarn shopping-llm-node '{"user_input": "Show me my cart"}' --toolChoice="auto"
    
    # Complete shopping flow
    yarn shopping-llm-node '{"user_input": "I want to buy wireless headphones, add them to cart, and checkout to 123 Main St, New York"}' --toolChoice="auto"
    
    # Specific tool
    yarn shopping-llm-node '{"user_input": "Show me electronics"}' --toolChoice="recommend_products"
`;

run();

function getRequestBuilderToolChoice(
  toolChoice: string,
): RequestBuilderToolChoice {
  switch (toolChoice) {
    case 'auto':
    case 'required':
    case 'none':
      return {
        type: 'string',
        value: toolChoice,
      };
    default:
      return {
        type: 'function',
        function: {
          type: 'function',
          name: toolChoice,
        },
      };
  }
}

async function run() {
  const {
    jsonData,
    modelName,
    provider,
    apiKey,
    toolChoice,
    stream,
  } = parseArgs();

  const userMessage = {
    role: 'user' as const,
    content: {
      type: 'template' as const,
      template: '{{user_input}}',
    },
  };

  const llmRequestBuilderNode = new LLMChatRequestBuilderNode({
    id: 'shopping_llm_request_builder_node',
    tools: SHOPPING_TOOLS,
    toolChoice: toolChoice
      ? getRequestBuilderToolChoice(toolChoice)
      : undefined,
    responseFormat: 'json',
    messages: [
      {
        role: 'system' as const,
        content: {
          type: 'template' as const,
          template: CLI_SHOPPING_SYSTEM_MESSAGE,
        },
      },
      userMessage,
    ],
  });

  const llmChatNode = new RemoteLLMChatNode({
    id: 'shopping_llm_chat_node',
    provider: provider,
    modelName: modelName,
    stream: stream,
    reportToClient: true,
  });

  const builder = new GraphBuilder({
    id: 'shopping_llm_chat_graph',
    apiKey,
  })
    .addNode(llmRequestBuilderNode)
    .addNode(llmChatNode)
    .addEdge(llmRequestBuilderNode, llmChatNode)
    .setStartNode(llmRequestBuilderNode)
    .setEndNode(llmChatNode);

  const executor = builder.build();
  const outputStream = await executor.start(jsonData, v4());

  let allToolCalls: any[] = [];
  let finalResponse = '';

  for await (const result of outputStream) {
    await result.processResponse({
      Content: async (response: any) => {
        console.log('🛍️  Shopping AI Response:');
        console.log('  Content:', response.content);
        
        if (response.toolCalls && response.toolCalls.length > 0) {
          console.log('  Tool Calls:');
          
          for (const toolCall of response.toolCalls) {
            console.log(`    🔧 ${toolCall.name}(${toolCall.args})`);
            console.log(`       ID: ${toolCall.id}`);
            
            // Execute the tool call
            let toolResult;
            try {
              switch (toolCall.name) {
                case 'recommend_products':
                  toolResult = await ShoppingToolHandler.recommendProducts(toolCall.args);
                  break;
                case 'get_product_info':
                  toolResult = await ShoppingToolHandler.getProductInfo(toolCall.args);
                  break;
                case 'add_to_cart':
                  toolResult = await ShoppingToolHandler.addToCart(toolCall.args);
                  break;
                case 'view_cart':
                  toolResult = await ShoppingToolHandler.viewCart(toolCall.args);
                  break;
                case 'checkout_order':
                  toolResult = await ShoppingToolHandler.checkoutOrder(toolCall.args);
                  break;
                default:
                  toolResult = { error: `Unknown tool: ${toolCall.name}` };
              }
              
              console.log(`       ✅ Result:`, JSON.stringify(toolResult, null, 2));
              
              // Store for final summary
              allToolCalls.push({
                name: toolCall.name,
                args: toolCall.args,
                result: toolResult
              });
              
            } catch (error) {
              console.log(`       ❌ Error:`, error.message);
            }
          }
        }
        
        finalResponse = response.content;
      },
      ContentStream: async (contentStream: any) => {
        console.log('📡 Shopping AI Response Stream:');
        let streamContent = '';
        const toolCalls: { [id: string]: any } = {};
        let chunkCount = 0;
        
        for await (const chunk of contentStream) {
          chunkCount++;
          if (chunk.text) {
            console.log(`  Chunk ${chunkCount}: ${chunk.text}`);
            // Simply concatenate chunks as-is, clean up at the end
            streamContent += chunk.text;
          }
          if (chunk.toolCalls && chunk.toolCalls.length > 0) {
            for (const toolCall of chunk.toolCalls) {
              if (toolCalls[toolCall.id]) {
                toolCalls[toolCall.id].args += toolCall.args;
              } else {
                toolCalls[toolCall.id] = { ...toolCall };
              }
            }
          }
        }
        
        console.log(`\n📊 Stream Summary:`);
        console.log(`  Total chunks: ${chunkCount}`);
        console.log(`  Content length: ${streamContent.length} characters`);
        
        const finalToolCalls = Object.values(toolCalls);
        if (finalToolCalls.length > 0) {
          console.log('\n🔧 Tool Calls from Stream:');
          
          for (const toolCall of finalToolCalls) {
            console.log(`  ${toolCall.name}(${toolCall.args})`);
            console.log(`    ID: ${toolCall.id}`);
            
            // Execute the tool call
            let toolResult;
            try {
              switch (toolCall.name) {
                case 'recommend_products':
                  toolResult = await ShoppingToolHandler.recommendProducts(toolCall.args);
                  break;
                case 'get_product_info':
                  toolResult = await ShoppingToolHandler.getProductInfo(toolCall.args);
                  break;
                case 'add_to_cart':
                  toolResult = await ShoppingToolHandler.addToCart(toolCall.args);
                  break;
                case 'view_cart':
                  toolResult = await ShoppingToolHandler.viewCart(toolCall.args);
                  break;
                case 'checkout_order':
                  toolResult = await ShoppingToolHandler.checkoutOrder(toolCall.args);
                  break;
                default:
                  toolResult = { error: `Unknown tool: ${toolCall.name}` };
              }
              
              console.log(`    ✅ Result:`, JSON.stringify(toolResult, null, 2));
              
              // Store for final summary
              allToolCalls.push({
                name: toolCall.name,
                args: toolCall.args,
                result: toolResult
              });
              
            } catch (error) {
              console.log(`    ❌ Error:`, error.message);
            }
          }
        }
        
        // Clean up the final stream content: remove multiple spaces but preserve single spaces
        streamContent = streamContent.replace(/\s+/g, ' ').trim();
        finalResponse = streamContent;
      },
    });
  }

  // Final summary
  console.log('\n🎯 Final Shopping Summary:');
  console.log('📝 Response:', finalResponse);
  
  if (allToolCalls.length > 0) {
    console.log('\n🛠️  Shopping Actions Performed:');
    allToolCalls.forEach((tool, index) => {
      console.log(`  ${index + 1}. ${tool.name}`);
      if (tool.result.recommendations) {
        console.log(`     📦 Found ${tool.result.recommendations.length} products`);
      }
      if (tool.result.success && tool.result.product_added) {
        console.log(`     ➕ Added to cart: ${tool.result.product_added.product_name}`);
      }
      if (tool.result.cart_items) {
        console.log(`     🛒 Cart: ${tool.result.total_items} items, $${tool.result.total_amount}`);
      }
      if (tool.result.order_id) {
        console.log(`     🎉 Order confirmed: ${tool.result.order_id}`);
      }
      if (tool.result.id && tool.result.name) {
        console.log(`     📦 Product: ${tool.result.name} - $${tool.result.price}`);
      }
    });
  }

  cleanup(executor, outputStream);
}

function parseArgs(): {
  jsonData: { user_input: string };
  modelName: string;
  provider: string;
  apiKey: string;
  toolChoice: string;
  stream: boolean;
} {
  const argv = minimist(process.argv.slice(2));

  if (argv.help) {
    console.log(usage);
    process.exit(0);
  }

  const jsonString = argv._?.join(' ') || '';
  const modelName = argv.modelName || DEFAULT_LLM_MODEL_NAME;
  const provider = argv.provider || 'openai';
  const apiKey = process.env.INWORLD_API_KEY || '';
  const toolChoice = argv.toolChoice || '';
  const stream = argv.stream !== 'false';

  if (!jsonString) {
    throw new Error(
      `You need to provide a JSON string with user data.\n${usage}`,
    );
  }

  if (!apiKey) {
    throw new Error(
      `You need to set INWORLD_API_KEY environment variable.\n${usage}`,
    );
  }

  let jsonData;
  try {
    jsonData = JSON.parse(jsonString);
  } catch (error) {
    throw new Error(`Invalid JSON string provided: ${error.message}\n${usage}`);
  }

  if (!jsonData.user_input) {
    throw new Error(`JSON data must include 'user_input' field.\n${usage}`);
  }

  return {
    jsonData,
    modelName,
    provider,
    apiKey,
    toolChoice,
    stream,
  };
}

function cleanup(executor: any, outputStream: any) {
  if (outputStream && typeof outputStream.close === 'function') {
    outputStream.close();
  }
  if (executor) {
    executor.stopExecutor();
    executor.cleanupAllExecutions();
    executor.destroy();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Shopping AI shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shopping AI shutting down...');
  process.exit(0);
});
