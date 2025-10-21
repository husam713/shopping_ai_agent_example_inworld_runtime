import {
  CustomNode,
  GraphTypes,
  ProcessContext,
} from '@inworld/runtime/graph';
import { v4 as uuidv4 } from 'uuid';
import { EventFactory } from './event_factory';
import { Connection } from '../types';

interface DialogManagementNodeOptions {
  id: string;
  connections: { [key: string]: Connection };
}

export class DialogManagementNode extends CustomNode {
  private connections: { [key: string]: Connection };

  constructor(options: DialogManagementNodeOptions) {
    super({ id: options.id });
    this.connections = options.connections;
  }

  process(
    _context: ProcessContext,
    input:
      | { text: string; key: string; interactionId: string }
      | GraphTypes.Content,
  ):
    | GraphTypes.LLMChatRequest
    | GraphTypes.Content
    | { text: string; key: string; interactionId: string } {
    if ('content' in input) {
      // Handle LLM response
      const { content, interactionId, key } = this.extractContent(input);
      this.connections[key].state.messages.push({
        role: 'assistant',
        content,
        id: interactionId,
      });
      this.connections[key].ws.send(
        JSON.stringify(EventFactory.text(content, interactionId, {})),
      );
      return new GraphTypes.Content({ content });
    } else {
      // Handle user input
      const { text, key, interactionId } = input;
      this.connections[key].state.messages.push({
        role: 'user',
        content: text,
        id: interactionId,
      });
      this.connections[key].ws.send(
        JSON.stringify(EventFactory.text(text, interactionId, { isUser: true })),
      );

      const conversationMessages = this.connections[key].state.messages.map(
        (msg) => ({
          role: msg.role,
          content: msg.content,
        }),
      );

      return new GraphTypes.LLMChatRequest({
        messages: conversationMessages,
      });
    }
  }

  private extractContent(content: GraphTypes.Content): {
    content: string;
    interactionId: string;
    key: string;
  } {
    // This is a placeholder for content extraction logic
    // In a real implementation, you would have a more robust way to manage this
    const key = Object.keys(this.connections)[0];
    const interactionId = uuidv4();
    return { content: content.content, interactionId, key };
  }
}
