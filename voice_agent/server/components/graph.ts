import {
  Graph,
  GraphBuilder,
  GraphTypes,
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
import { ApiBuilderNode } from './api_builder';
import { DialogManagementNode } from './dialog_management';
import { KnowledgeNode } from './knowledge';

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

    const dialogManagementNode = new DialogManagementNode({
      id: `dialog-management-node${postfix}`,
      connections,
    });
    const knowledgeNode = new KnowledgeNode({
      id: `knowledge-node${postfix}`,
    });
    const apiBuilderNode = new ApiBuilderNode();
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

    const endNode = new ProxyNode();
    const graphName = `adaptive-graph${postfix}`;
    const graph = new GraphBuilder({ id: graphName, apiKey });

    graph
      .addNode(dialogManagementNode)
      .addNode(knowledgeNode)
      .addNode(apiBuilderNode)
      .addNode(llmNode)
      .addNode(textChunkingNode)
      .addNode(ttsNode)
      .addNode(endNode);

    graph
      .addEdge(dialogManagementNode, knowledgeNode)
      .addEdge(knowledgeNode, llmNode)
      .addEdge(dialogManagementNode, apiBuilderNode)
      .addEdge(apiBuilderNode, llmNode)
      .addEdge(llmNode, dialogManagementNode)
      .addEdge(dialogManagementNode, ttsNode)
      .addEdge(ttsNode, endNode);

    if (withAudioInput) {
      const audioInputNode = new ProxyNode();
      const sttNode = new RemoteSTTNode();
      graph
        .addNode(audioInputNode)
        .addNode(sttNode)
        .addEdge(audioInputNode, sttNode)
        .addEdge(sttNode, dialogManagementNode)
        .setStartNode(audioInputNode);
    } else {
      const textInputNode = new ProxyNode();
      graph
        .addNode(textInputNode)
        .addEdge(textInputNode, dialogManagementNode)
        .setStartNode(textInputNode);
    }

    graph.setEndNode(endNode);

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
