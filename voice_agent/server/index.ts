import 'dotenv/config';

import { InworldError } from '@inworld/runtime/common';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { parse } from 'url';
import { RawData, WebSocketServer } from 'ws';

const { query } = require('express-validator');

import { body } from 'express-validator';

import { WS_APP_PORT } from '../constants';
import { InworldApp } from './components/app';
import { MessageHandler } from './components/message_handler';

const app = express();
const server = createServer(app);
const webSocket = new WebSocketServer({ noServer: true });

app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: WS_APP_PORT 
  });
});

const inworldApp = new InworldApp();

webSocket.on('connection', (ws, request) => {
  const { query } = parse(request.url!, true);
  const key = query.key?.toString();

  if (!inworldApp.connections?.[key]) {
    throw new Error('Session not found!');
  }

  inworldApp.connections[key].ws = inworldApp.connections[key].ws ?? ws;

  ws.on('error', console.error);

  const messageHandler = new MessageHandler(inworldApp, (data: any) =>
    ws.send(JSON.stringify(data)),
  );

  ws.on('message', (data: RawData) => messageHandler.handleMessage(data, key));
});

app.post(
  '/load',
  (req, res, next) => {
    console.log('📥 Load request received:', {
      timestamp: new Date().toISOString(),
      key: req.query.key,
      userName: req.body?.userName,
      agent: req.body?.agent ? 'Present' : 'Missing',
      headers: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
      }
    });
    next();
  },
  query('key').trim().isLength({ min: 1 }),
  body('agent').isObject(),
  body('userName').trim().isLength({ min: 1 }),
  (req, res, next) => {
    console.log('✅ Load request validation passed, calling inworldApp.load');
    next();
  },
  inworldApp.load.bind(inworldApp),
);

app.post(
  '/unload',
  (req, res, next) => {
    console.log('📤 Unload request received:', {
      timestamp: new Date().toISOString(),
      key: req.query.key
    });
    next();
  },
  query('key').trim().isLength({ min: 1 }),
  inworldApp.unload.bind(inworldApp),
);

server.on('upgrade', async (request, socket, head) => {
  const { pathname } = parse(request.url!);

  if (pathname === '/session') {
    webSocket.handleUpgrade(request, socket, head, (ws) => {
      webSocket.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(WS_APP_PORT, async () => {
  console.log('🚀 Starting server initialization...');
  console.log(`📡 Server listening on port ${WS_APP_PORT}`);
  console.log(`🌐 Health check available at: http://localhost:${WS_APP_PORT}/health`);
  
  try {
    console.log('🔄 Initializing InworldApp...');
    await inworldApp.initialize();
    console.log('✅ InworldApp initialized successfully');
  } catch (error) {
    console.error('❌ InworldApp initialization failed:', error);
    return;
  }

  console.log(`🎉 Server is fully running on port ${WS_APP_PORT}`);
  console.log('📋 Available endpoints:');
  console.log('  - GET  /health');
  console.log('  - POST /load');
  console.log('  - POST /unload');
  console.log('  - WS   /session');
});

function done() {
  console.log('Server is closing');

  inworldApp.shutdown();

  process.exit(0);
}

process.on('SIGINT', done);
process.on('SIGTERM', done);
process.on('SIGUSR2', done);
process.on('unhandledRejection', (err: Error) => {
  if (err instanceof InworldError) {
    console.error('Inworld Error: ', {
      message: err.message,
      context: err.context,
    });
  } else {
    console.error(err.message);
  }
  process.exit(1);
});
