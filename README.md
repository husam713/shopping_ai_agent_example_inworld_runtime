
# Inworld Runtime SDK Examples and Voice Agent

This repository contains examples and templates demonstrating how to use the Inworld Runtime SDK, including simple CLI examples and a complete voice agent application.

These templates showcase the capabilities of the Inworld Runtime SDK across different use cases - from basic command-line interactions to a full-stack voice agent with text and voice inputs.

### What’s inside

- `cli/primitives/`: Runnable command-line examples that showcase primitives work (LLM/STT/TTS clients and some more).
- `cli/graphs/`: Runnable command-line examples that showcase Inworld Runtime graphs.
- `voice_agent/`: A complete app with a Node server and React client for a text/voice agent. See `templates/ts/voice_agent/README.md`.
- `prompts/`: Example Jinja prompt templates and props.
- `models/`: Sample model assets used by some examples (e.g., `silero_vad.onnx`).

## Prerequisites

- Node.js 18 or higher
- Check https://docs.inworld.ai/docs/node/installation if needed.

## Project Structure

This repository is organized into several components:

- **cli/**: Command-line examples and utilities
  - `primitives/`: Basic examples showcasing individual SDK components (LLM, STT, TTS)
  - `graphs/`: Examples demonstrating Inworld Runtime graphs

- **voice_agent/**: Complete voice agent application
  - **server**: Handles communication with Inworld's LLM, STT, and TTS services
  - **client**: Provides a user interface for interacting with the AI agent

- **prompts/**: Example Jinja prompt templates and props
- **models/**: Sample model assets (e.g., `silero_vad.onnx`)

## Getting Started

### CLI Examples

Run CLI examples directly from the `cli/` directory using yarn scripts:

```bash
cd cli
yarn install

# Provide your Inworld API key or copy .env-example to .env with the key.
export INWORLD_API_KEY="<your_api_key>"

# Example: basic LLM chat with tools and streaming
yarn node-llm-chat "Tell me the weather in Vancouver and evaluate 2 + 2" \
  --provider=openai --modelName=gpt-4o-mini --tools --toolChoice=auto
```

### Voice Agent Application

To run the complete voice agent application:

#### Environment Variables

Copy `voice_agent/server/.env-sample` to `voice_agent/server/.env` and fill all required variables. Some variables are optional and can be left empty. In this case default values will be used.

To get the required API key:

1. Visit https://platform.inworld.ai/
2. Create an account or log in
3. Click Get API Key to get your `INWORLD_API_KEY`

#### Install Dependencies and Run the Application

Install dependencies for both server and client:

```bash
# Install server dependencies
cd voice_agent/server
npm install

# Make sure to manually install the Inworld Runtime for the server application. It is not included by default

# Start the server
npm start
```

The server will start on port 4000. Note that, for lightning ai studio use case, we can leverage the API builder to serve the server with public url:
(1) build the docker image: 
```
docker build -f server.dockerfile -t voice-agent-server .
```
(2) serve the server in API builder
Create a new API endpoint, set the port as 4000, and enable auto start with:
```
docker run --rm -it -p 4000:4000 voice-agent-server:latest
```



```bash
# Install client dependencies
cd ../client
npm install
npm start
```

The client will start on port 3000 and should automatically open in your default browser. It's possible that port 3000 is already in use, so the next available port will be used.
With lightining ai studio, we can further leverage the port viewer to share the application with public url.

## Using the Voice Agent Application

1. Configure the agent on the UI:

   - Enter your name.

   - Set the agent's name.

   - Provide a description for the agent.

   - Define the agent's motivation.

   - Define the agent's knowledges.

2. Click "Start" to begin the conversation.

3. Interact with the agent:

   - Type text in the input field and press Enter or click the send button.

   - Click the microphone icon to use voice input. You need to click the microphone icon again to stop the recording. Then you will receive a response from the agent.

   - Click the copy icon to copy the conversation to the clipboard.

## Troubleshooting

- If you encounter connection issues, ensure both server and client are running. Server should be running on port 4000 and client can be running on port 3000 or any other port.

- Don't forget to install the Inworld Runtime from the package or using link to local package for server application. Client application doesn't need to install the framework.

- Check that your API key is valid and properly set in the .env file.

- For voice input issues, ensure your browser has microphone permissions.
