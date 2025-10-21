import {
  CustomNode,
  GraphTypes,
  ProcessContext,
} from '@inworld/runtime/graph';

export class KnowledgeNode extends CustomNode {
  constructor(options: { id: string }) {
    super(options);
  }

  process(
    _context: ProcessContext,
    request: GraphTypes.LLMChatRequest,
  ): GraphTypes.LLMChatRequest {
    // For now, this node is a pass-through.
    // In a real implementation, you would add logic to check for and respond to FAQs.
    return request;
  }
}
