import {
  CustomNode,
  Graph,
  GraphBuilder,
  GraphTypes,
  ProcessContext,
  ProxyNode,
  RemoteLLMChatNode,
  RemoteSTTNode,
  RemoteTTSNode,
  TextChunkingNode,
} from '@inworld/runtime/graph';
import * as os from 'os';
import * as path from 'path';

import { TEXT_CONFIG, TTS_SAMPLE_RATE } from '../../constants';
import {
  AudioInput,
  CreateGraphPropsInterface,
  State,
  TextInput,
} from '../types';
import { EventFactory } from './event_factory';
import { 
  ShoppingProxyNode,
  ShoppingToolHandlerNode,
  enhanceSystemMessageWithShopping, 
  createShoppingChatRequest, 
  getShoppingGraphName,
  SHOPPING_NODE_IDS 
} from '../shopping';

export class InworldGraphWrapper {
  graph: Graph;

  private constructor({ graph }: { graph: Graph }) {
    this.graph = graph;
  }

  destroy() {
    this.graph.stopExecutor();
    this.graph.cleanupAllExecutions();
    this.graph.destroy();
  }

  static async create(props: CreateGraphPropsInterface) {
    const {
      apiKey,
      llmModelName,
      llmProvider,
      voiceId,
      connections,
      withAudioInput = false,
      ttsModelId,
      toolChoice = 'auto',
    } = props;

    const postfix = withAudioInput ? '-with-audio-input' : '-with-text-input';

    // Custom node to build a LLM chat request from the state
    class DialogPromptBuilderNode extends CustomNode {
      process(
        _context: ProcessContext,
        state: State,
      ): GraphTypes.LLMChatRequest {
        const conversationMessages = state.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        const allMessages = enhanceSystemMessageWithShopping(conversationMessages);
        const requestData = createShoppingChatRequest(allMessages, toolChoice);

        return new GraphTypes.LLMChatRequest(requestData);
      }
    }

    // Custom node to update the state with the user's input this turn
    class UpdateStateNode extends CustomNode {
      process(
        _context: ProcessContext,
        input: { text: string; interactionId: string; key: string },
      ): State {
        const { text, interactionId, key } = input;

        connections[key].state.messages.push({
          role: 'user',
          content: text,
          id: interactionId,
        });
        connections[key].ws.send(
          JSON.stringify(
            EventFactory.text(text, interactionId, {
              isUser: true,
            }),
          ),
        );
        return connections[key].state;
      }
    }

    // Custom node to handle shopping state and send shopping data to client
    class ShoppingStateNode extends CustomNode {
      constructor(options: { id: string }) {
        super(options);
      }

      process(
        _context: ProcessContext,
        userInput: { text: string; interactionId: string; key: string },
        content?: GraphTypes.Content,
      ): string {
        // Process shopping data if we have tool calls
        if (content && content.toolCalls && content.toolCalls.length > 0) {
          const shopping_data: any = {};
          
          content.toolCalls.forEach((toolCall: any) => {
            if (toolCall.result) {
              switch (toolCall.name) {
                case 'recommend_products':
                  shopping_data.recommendations = {
                    products: toolCall.result.recommendations || [],
                    query: toolCall.result.search_query,
                    category: toolCall.result.category
                  };
                  break;
                case 'get_product_info':
                  shopping_data.product_details = toolCall.result;
                  break;
                case 'add_to_cart':
                case 'update_cart':
                  shopping_data.cart_update = toolCall.result;
                  break;
                case 'view_cart':
                  shopping_data.cart_contents = toolCall.result;
                  break;
                case 'checkout_order':
                  shopping_data.order_result = toolCall.result;
                  break;
              }
            }
          });

          // Add tool call summaries to conversation history for LLM context
          if (userInput.key && connections && connections[userInput.key] && connections[userInput.key].state) {
            content.toolCalls.forEach((toolCall: any) => {
              if (toolCall.result) {
                let summaryContent = '';
                switch (toolCall.name) {
                  case 'recommend_products':
                    const products = toolCall.result.recommendations || [];
                    const productNames = products.map((p: any) => p.name).join(', ');
                    summaryContent = `Found ${products.length} product recommendations: ${productNames}`;
                    break;
                  case 'get_product_info':
                    summaryContent = `Retrieved product information for ${toolCall.result.name || 'item'}`;
                    break;
                  case 'add_to_cart':
                  case 'update_cart':
                    const productName = toolCall.result.product_added?.product_name || toolCall.result.product_updated?.product_name || 'item';
                    const finalQuantity = toolCall.result.product_added?.quantity || toolCall.result.product_updated?.quantity;
                    const addedQuantity = toolCall.result.product_added?.added_quantity;
                    const wasUpdated = toolCall.result.product_added?.was_updated || toolCall.result.product_updated;
                    
                    let action = 'Updated';
                    if (toolCall.name === 'add_to_cart') {
                      action = wasUpdated ? 'Updated' : 'Added';
                    }
                    
                    summaryContent = toolCall.result.success 
                      ? `${action} ${productName} in cart${finalQuantity ? ` (total: ${finalQuantity})` : ''}${addedQuantity && wasUpdated ? `, added ${addedQuantity}` : ''}` 
                      : 'Failed to update cart';
                    break;
                  case 'view_cart':
                    const cartItems = toolCall.result.items || [];
                    const cartItemNames = cartItems.map((item: any) => `${item.product?.name || item.product_name} (${item.quantity})`).join(', ');
                    summaryContent = cartItems.length > 0 ? `Cart contains: ${cartItemNames}` : 'Cart is empty';
                    break;
                  case 'checkout_order':
                    summaryContent = toolCall.result.success ? `Order ${toolCall.result.order_id} processed successfully` : 'Order processing failed';
                    break;
                  default:
                    summaryContent = `Tool ${toolCall.name} executed`;
                }
                
                connections[userInput.key].state.messages.push({
                  role: 'system',
                  content: summaryContent,
                  id: `tool-${toolCall.id}`
                });
              }
            });
          }

          // Send shopping data with delay to ensure text message is processed first
          if (userInput.key && connections && connections[userInput.key] && connections[userInput.key].ws) {
            const shoppingEvent = EventFactory.shoppingData(shopping_data, userInput.interactionId);
            
            setTimeout(() => {
              if (connections && connections[userInput.key] && connections[userInput.key].ws) {
                connections[userInput.key].ws.send(JSON.stringify(shoppingEvent));
              }
            }, 100);
          }
        }

        // Generate text content from tool results
        let textContent = content?.content || '';
        
        if (!textContent && content && content.toolCalls && content.toolCalls.length > 0) {
          const responses: string[] = [];
          
          content.toolCalls.forEach((toolCall: any) => {
            if (toolCall.result) {
              switch (toolCall.name) {
                case 'recommend_products':
                  if (toolCall.result.recommendations && toolCall.result.recommendations.length > 0) {
                    const products = toolCall.result.recommendations;
                    responses.push(`I found ${products.length} product(s) for you: ${products.map((p: any) => `${p.name} `).join(', ')}.`);
                  }
                  break;
                case 'get_product_info':
                  if (toolCall.result.name) {
                    responses.push(`Here's information about ${toolCall.result.name}: ${toolCall.result.description || 'Product details available.'}`);
                  }
                  break;
                case 'add_to_cart':
                case 'update_cart':
                  if (toolCall.result.success) {
                    const productName = toolCall.result.product_added?.product_name || toolCall.result.product_updated?.product_name || 'item';
                    const finalQuantity = toolCall.result.product_added?.quantity || toolCall.result.product_updated?.quantity;
                    const wasUpdated = toolCall.result.product_added?.was_updated || toolCall.result.product_updated;
                    const addedQuantity = toolCall.result.product_added?.added_quantity;
                    
                    if (toolCall.name === 'add_to_cart' && wasUpdated) {
                      responses.push(`Updated ${productName} in your cart. You now have ${finalQuantity} total.`);
                    } else if (toolCall.name === 'add_to_cart') {
                      responses.push(`Successfully added ${addedQuantity || finalQuantity} x ${productName} to your cart.`);
                    } else {
                      responses.push(`Successfully updated ${productName} in your cart${finalQuantity ? ` (quantity: ${finalQuantity})` : ''}.`);
                    }
                  } else {
                    const error = toolCall.result.error || 'Unknown error';
                    responses.push(`Sorry, I couldn't update your cart. ${error}.`);
                  }
                  break;
                case 'view_cart':
                  if (toolCall.result.items && toolCall.result.items.length > 0) {
                    responses.push(`Your cart contains ${toolCall.result.total_items} items totaling $${toolCall.result.total_amount}.`);
                  } else {
                    responses.push('Your cart is currently empty.');
                  }
                  break;
                case 'checkout_order':
                  if (toolCall.result.success) {
                    responses.push(`Order confirmed! Your order ID is ${toolCall.result.order_id}.`);
                  } else {
                    responses.push('There was an issue processing your order. Please try again.');
                  }
                  break;
              }
            }
          });
          
          if (responses.length > 0) {
            textContent = responses.join(' ');
          }
        }
        
        return textContent;
      }
    }

    const dialogPromptBuilderNode = new DialogPromptBuilderNode({
      id: `dialog-prompt-builder-node${postfix}`,
    });
    const updateStateNode = new UpdateStateNode();
    
    const shoppingProxyNode = new ShoppingProxyNode({
      id: `shopping-proxy-node${postfix}`,
    });
    
    const shoppingToolHandlerNode = new ShoppingToolHandlerNode({
      id: `${SHOPPING_NODE_IDS.TOOL_HANDLER}${postfix}`,
    });
    
    const shoppingStateNode = new ShoppingStateNode({
      id: `${SHOPPING_NODE_IDS.RESPONSE_FORMATTER}${postfix}`,
    });

    const llmNode = new RemoteLLMChatNode({
      id: `llm-node${postfix}`,
      provider: llmProvider,
      modelName: llmModelName,
      stream: true,
      textGenerationConfig: TEXT_CONFIG,
    });

    const textChunkingNode = new TextChunkingNode({
      id: `text-chunking-node${postfix}`,
    });

    const ttsNode = new RemoteTTSNode({
      id: `tts-node${postfix}`,
      speakerId: voiceId,
      modelId: ttsModelId,
      sampleRate: TTS_SAMPLE_RATE,
      temperature: 0.8,
      speakingRate: 1,
    });

    const graphName = getShoppingGraphName(withAudioInput);
    const graph = new GraphBuilder({ id: graphName, apiKey });

    // Add all nodes
    graph
      .addNode(shoppingProxyNode)
      .addNode(updateStateNode)
      .addNode(dialogPromptBuilderNode)
      .addNode(llmNode)
      .addNode(textChunkingNode)
      .addNode(ttsNode)
      .addNode(shoppingToolHandlerNode)
      .addNode(shoppingStateNode);
    
    // Build graph with shopping proxy architecture
    graph
      .addEdge(shoppingProxyNode, updateStateNode)
      .addEdge(shoppingProxyNode, shoppingStateNode)
      .addEdge(updateStateNode, dialogPromptBuilderNode)
      .addEdge(dialogPromptBuilderNode, llmNode)
      .addEdge(llmNode, shoppingToolHandlerNode)
      .addEdge(shoppingToolHandlerNode, shoppingStateNode)
      .addEdge(shoppingStateNode, textChunkingNode)
      .addEdge(textChunkingNode, ttsNode);

    if (withAudioInput) {
      // Custom node to join the result from STT and the original input metadata
      class TextInputNode extends CustomNode {
        process(
          _context: ProcessContext,
          audioInput: AudioInput,
          text: string,
        ): TextInput {
          const { audio: _audio, ...rest } = audioInput as any;
          return { text, ...(rest as object) } as TextInput;
        }
      }

      // Custom node to extract the audio data from the audio input to pass to the stt node
      class AudioFilterNode extends CustomNode {
        process(_context: ProcessContext, input: AudioInput): GraphTypes.Audio {
          return new GraphTypes.Audio({
            data: input.audio.data,
            sampleRate: input.audio.sampleRate,
          });
        }
      }

      const audioInputNode = new ProxyNode();
      const textInputNode = new TextInputNode();
      const audioFilterNode = new AudioFilterNode();
      const sttNode = new RemoteSTTNode();

      graph
        .addNode(audioInputNode)
        .addNode(audioFilterNode)
        .addNode(sttNode)
        .addNode(textInputNode)
        .addEdge(audioInputNode, textInputNode)
        .addEdge(audioInputNode, audioFilterNode)
        .addEdge(audioFilterNode, sttNode)
        .addEdge(sttNode, textInputNode)
        .addEdge(textInputNode, shoppingProxyNode)
        .setStartNode(audioInputNode);
    } else {
      graph.setStartNode(shoppingProxyNode);
    }

    graph.setEndNode(ttsNode);

    const builtGraph = graph.build();
    if (props.graphVisualizationEnabled) {
      console.log(
        'The Graph visualization has started. If you see any fatal error after this message, pls disable graph visualization.',
      );
      const graphPath = path.join(os.tmpdir(), `${graphName}.png`);
      await builtGraph.visualize(graphPath);
    }

    return new InworldGraphWrapper({
      graph: builtGraph,
    });
  }
}