import './App.css';

import { ArrowBackRounded } from '@mui/icons-material';
import { Button } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import toast, { Toaster } from 'react-hot-toast';
import { v4 } from 'uuid';

import { Chat } from './app/chat/Chat';
import { Layout } from './app/components/Layout';
import {
  ChatWrapper,
  MainWrapper,
  SimulatorHeader,
} from './app/components/Simulator';
import { ConfigView } from './app/configuration/ConfigView';
import {
  get as getConfiguration,
  save as saveConfiguration,
} from './app/helpers/configuration';
import { Player } from './app/sound/Player';
import {
  Agent,
  CHAT_HISTORY_TYPE,
  ChatHistoryItem,
  Configuration,
  ShoppingData,
} from './app/types';
import { config } from './config';
import * as defaults from './defaults';

interface CurrentContext {
  agent?: Agent;
  chatting: boolean;
  connection?: WebSocket;
  userName?: string;
}

interface PendingShoppingData {
  interactionId: string;
  shoppingData: ShoppingData;
  timestamp: number;
}

const sound = new Audio();
const player = new Player();
let key = '';

function App() {
  const formMethods = useForm<Configuration>();

  const [open, setOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [connection, setConnection] = useState<WebSocket>();
  const [agent, setAgent] = useState<Agent>();
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [chatting, setChatting] = useState(false);
  const [userName, setUserName] = useState('');
  const [pendingShoppingData, setPendingShoppingData] = useState<PendingShoppingData[]>([]);

  const stateRef = useRef<CurrentContext>({
    chatting: false,
  });
  stateRef.current = {
    agent,
    chatting,
    connection,
    userName,
  };

  const attachPendingShoppingData = useCallback((interactionId: string) => {
    setPendingShoppingData((currentPending) => {
      const matchingPending = currentPending.find(p => p.interactionId === interactionId);
      if (!matchingPending) return currentPending;


      
      // Attach the shopping data to the message
      setChatHistory((currentState) => {
        const newState = [...currentState];
        
                    // Find the message with this interactionId
            for (let i = newState.length - 1; i >= 0; i--) {
              const item = newState[i];
              if (item.type === CHAT_HISTORY_TYPE.ACTOR && 
                  item.source?.isAgent && 
                  item.interactionId === interactionId) {
                (item as any).shopping_data = matchingPending.shoppingData;

                break;
              }
            }
        
        return newState;
      });

      // Remove the attached pending data
      return currentPending.filter(p => p.interactionId !== interactionId);
    });
  }, []);

  // Clean up old pending shopping data (timeout after 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setPendingShoppingData((currentPending) => {
        const stillPending: PendingShoppingData[] = [];
        const expired: PendingShoppingData[] = [];
        
        currentPending.forEach(pending => {
          if (now - pending.timestamp > 5000) { // 5 second timeout
            expired.push(pending);
          } else {
            stillPending.push(pending);
          }
        });

        // Try to attach expired shopping data to the most recent agent message as fallback
        expired.forEach(pending => {

          setChatHistory((currentState) => {
            const newState = [...currentState];
            
            // Find the most recent agent message
            for (let i = newState.length - 1; i >= 0; i--) {
              const item = newState[i];
              if (item.type === CHAT_HISTORY_TYPE.ACTOR && item.source?.isAgent) {
                (item as any).shopping_data = pending.shoppingData;

                break;
              }
            }
            
            return newState;
          });
        });

        return stillPending;
      });
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, []);

  const onOpen = useCallback(() => {
    setOpen(true);
  }, []);

  const onDisconnect = useCallback(() => {
    setOpen(true);
  }, []);

  const onMessage = useCallback((message: MessageEvent) => {
    const packet = JSON.parse(message.data);
    


    let chatItem: ChatHistoryItem | undefined = undefined;

    if (packet?.type === 'AUDIO') {
      player.addToQueue({ audio: packet.audio });
    } else if (packet?.type === 'INTERRUPT') {
      player.interrupt();
    } else if (packet?.type === 'SHOPPING_DATA') {
      // Handle shopping data as a separate event
      
      const interactionId = packet.packetId?.interactionId;
      if (interactionId) {
        // Check if we already have a finalized message with this interactionId
        const existingMessage = chatHistory.find(item => 
          item.type === CHAT_HISTORY_TYPE.ACTOR && 
          item.source?.isAgent && 
          item.interactionId === interactionId &&
          !(item as any).isRecognizing // Message is finalized
        );

        if (existingMessage) {
          // Immediately attach to existing finalized message
          setChatHistory((currentState) => {
            const newState = [...currentState];
            const targetIndex = newState.findIndex(item => item.id === existingMessage.id);
            if (targetIndex >= 0) {
              (newState[targetIndex] as any).shopping_data = packet.shopping_data;
            }
            return newState;
          });
        } else {
          // Store as pending shopping data for later attachment
          setPendingShoppingData((current) => [
            ...current.filter(p => p.interactionId !== interactionId), // Remove any existing pending for same interaction
            {
              interactionId,
              shoppingData: packet.shopping_data,
              timestamp: Date.now()
            }
          ]);
        }
      }
      
      // Don't create a new chat item for shopping data events
      return;
    } else if (packet?.type === 'TEXT') {
      const { agent, userName } = stateRef.current || {};

      chatItem = {
        id: packet.packetId?.utteranceId,
        type: CHAT_HISTORY_TYPE.ACTOR,
        date: new Date(packet.date!),
        source: packet.routing?.source,
        text: packet.text.text,
        interactionId: packet.packetId?.interactionId,
        isRecognizing: !packet.text.final,
        author: packet.routing!.source!.isAgent ? agent?.name : userName,
      };

      // Add shopping data if present in the TEXT packet (immediate attachment)
      if (packet.shopping_data) {
        (chatItem as any).shopping_data = packet.shopping_data;
      }

      // If this is a finalized agent message, check for pending shopping data and resume audio
      if (packet.text.final && 
          packet.routing?.source?.isAgent && 
          packet.packetId?.interactionId) {
        const interactionId = packet.packetId.interactionId;
        
        // Resume audio playback for new agent responses
        player.resumeAfterInterruption();
        
        // Use setTimeout to allow the chatItem to be added to state first, then attach pending data
        setTimeout(() => {
          attachPendingShoppingData(interactionId);
        }, 100);
      }
    } else if (packet?.type === 'INTERACTION_END') {
      chatItem = {
        id: v4(),
        type: CHAT_HISTORY_TYPE.INTERACTION_END,
        date: new Date(packet.date!),
        source: packet.routing?.source,
        interactionId: packet.packetId?.interactionId,
      };
    } else if (packet?.type === 'ERROR') {
      toast.error(packet?.error ?? 'Something went wrong');
    }

    if (chatItem) {
      setChatHistory((currentState) => {
        let newState = undefined;
        let currentHistoryIndex = currentState.findIndex((item) => {
          return item.id === chatItem?.id;
        });

        if (currentHistoryIndex >= 0 && chatItem) {
          newState = [...currentState];
          const existingItem = newState[currentHistoryIndex];
          
          // Preserve existing shopping data when updating the message
          if ((existingItem as any).shopping_data && !(chatItem as any).shopping_data) {
            (chatItem as any).shopping_data = (existingItem as any).shopping_data;
          }
          
          newState[currentHistoryIndex] = chatItem;
        } else {
          newState = [...currentState, chatItem!];
        }
        return newState;
      });
    }
  }, [attachPendingShoppingData]);

  const openConnection = useCallback(async () => {
    key = v4();
    const { agent, user } = formMethods.getValues();

    setChatting(true);
    setUserName(user?.name!);

    const response = await fetch(`${config.LOAD_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: user?.name,
        agent,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      return console.log(response.statusText, ': ', data.errors);
    }

    if (data.agent) {
      setAgent(data.agent as Agent);
    }

    const ws = new WebSocket(`${config.SESSION_URL}?key=${key}`);

    setConnection(ws);

    ws.addEventListener('open', onOpen);
    ws.addEventListener('message', onMessage);
    ws.addEventListener('disconnect', onDisconnect);
  }, [formMethods, onDisconnect, onMessage, onOpen]);

  const stopChatting = useCallback(async () => {
    // Disable flags
    setChatting(false);
    setOpen(false);

    // Stop audio playing
    player.stop();

    // Clear collections
    setChatHistory([]);
    setPendingShoppingData([]);

    // Close connection and clear connection data
    connection?.close();
    connection?.removeEventListener('open', onOpen);
    connection?.removeEventListener('message', onMessage);
    connection?.removeEventListener('disconnect', onDisconnect);

    setConnection(undefined);
    setAgent(undefined);

    await fetch(`${config.UNLOAD_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    key = '';
  }, [connection, onDisconnect, onMessage, onOpen]);

  const resetForm = useCallback(() => {
    formMethods.reset({
      ...defaults.configuration,
    });
    saveConfiguration(formMethods.getValues());
  }, [formMethods]);

  useEffect(() => {
    const configuration = getConfiguration();
    const parsedConfiguration = configuration
      ? JSON.parse(configuration)
      : defaults.configuration;

    formMethods.reset({
      ...parsedConfiguration,
    });

    setInitialized(true);
  }, [formMethods]);

  useEffect(() => {
    player.preparePlayer({ audio: sound });
  }, []);

  const content = chatting ? (
    <>
      {open && agent ? (
        <MainWrapper>
          <Toaster
            toastOptions={{
              style: {
                maxWidth: 'fit-content',
                wordBreak: 'break-word',
              },
            }}
          />
          <ChatWrapper>
            <SimulatorHeader>
              <Button
                startIcon={<ArrowBackRounded />}
                onClick={stopChatting}
                variant="outlined"
              >
                Back to settings
              </Button>
            </SimulatorHeader>
            <Chat
              chatHistory={chatHistory}
              connection={connection!}
              onStopChatting={stopChatting}
              userName={userName}
              player={player}
            />
          </ChatWrapper>
        </MainWrapper>
      ) : (
        'Loading...'
      )}
    </>
  ) : (
    <ConfigView
      canStart={formMethods.formState.isValid}
      onStart={() => openConnection()}
      onResetForm={resetForm}
    />
  );

  return (
    <FormProvider {...formMethods}>
      <Layout>{initialized ? content : ''}</Layout>
    </FormProvider>
  );
}

export default App;
