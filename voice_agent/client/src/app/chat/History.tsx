import { Box, Fade, Stack, Typography } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';

import { dateWithMilliseconds } from '../helpers/transform';
import {
  Actor,
  CHAT_HISTORY_TYPE,
  ChatHistoryItem,
  HistoryItemActor,
  HistoryItemActorWithShopping,
  Product,
} from '../types';
import {
  ProductRecommendationsWidget,
  ProductDetailsWidget,
  CartWidget,
  OrderResultWidget,
} from '../shopping';
import {
  HistoryActor,
  HistoryInner,
  HistoryItemMessageActor,
  HistoryMessageGroup,
  HistoryStyled,
} from './Chat.styled';
import { Typing } from './Typing';

interface HistoryProps {
  history: ChatHistoryItem[];
  connection?: WebSocket;
}

type CombinedHistoryItem = {
  interactionId: string;
  messages: HistoryItemActor[];
  source: Actor;
  type: CHAT_HISTORY_TYPE;
};

export const History = (props: HistoryProps) => {
  const { history, connection } = props;

  const ref = useRef<HTMLDivElement>(null);

  const [combinedChatHistory, setCombinedChatHistory] = useState<
    CombinedHistoryItem[]
  >([]);
  const [isInteractionEnd, setIsInteractionEnd] = useState<boolean>(true);

  useEffect(() => {
    // scroll chat down on history change
    if (ref.current && history) {
      ref.current.scrollTo({
        top: ref.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [history]);

  useEffect(() => {
    let currentRecord: CombinedHistoryItem | undefined;
    const mergedRecords: CombinedHistoryItem[] = [];
    const hasActors = history.find(
      (record: ChatHistoryItem) => record.type === CHAT_HISTORY_TYPE.ACTOR,
    );
    const filteredEvents = history.filter((record: ChatHistoryItem) =>
      [CHAT_HISTORY_TYPE.ACTOR, CHAT_HISTORY_TYPE.INTERACTION_END].includes(
        record.type,
      ),
    );

    for (let i = 0; i < history.length; i++) {
      let item = history[i];
      switch (item.type) {
        case CHAT_HISTORY_TYPE.ACTOR:
          currentRecord = mergedRecords.find(
            (r) =>
              r.interactionId === item.interactionId &&
              [CHAT_HISTORY_TYPE.ACTOR].includes(r.messages?.[0]?.type) &&
              r.type === CHAT_HISTORY_TYPE.ACTOR &&
              r.source.name === item.source.name,
          ) as CombinedHistoryItem;

          if (currentRecord) {
            currentRecord.messages.push(item);
          } else {
            currentRecord = {
              interactionId: item.interactionId,
              messages: [item],
              source: item.source,
              type: CHAT_HISTORY_TYPE.ACTOR,
            } as CombinedHistoryItem;
            mergedRecords.push(currentRecord);
          }
          break;
      }
    }

    // Interaction is considered ended
    // when there is no actor action yet (chat is not started)
    // or last received message is INTERACTION_END.
    const lastInteractionId =
      filteredEvents[filteredEvents.length - 1]?.interactionId;

    const interactionEnd = filteredEvents.find(
      (event) =>
        event.interactionId === lastInteractionId &&
        event.type === CHAT_HISTORY_TYPE.INTERACTION_END,
    );

    setIsInteractionEnd(!hasActors || (!!currentRecord && !!interactionEnd));

    setCombinedChatHistory(mergedRecords);
  }, [history]);

  const getContent = (message: HistoryItemActor) => {
    switch (message.type) {
      case CHAT_HISTORY_TYPE.ACTOR:
        return message.text;
    }
  };

  // Shopping action handlers
  const handleAddToCart = (product: Product) => {
    const message = `Add ${product.name} to cart`;
    console.log('[Client] Shopping action - Add to cart:', {
      productId: product.id,
      productName: product.name,
      message: message,
      timestamp: new Date().toISOString()
    });
    if (connection) {
      connection.send(JSON.stringify({ 
        type: 'text', 
        text: message 
      }));
    }
  };

  const handleViewDetails = (product: Product) => {
    const message = `Show me details for ${product.name}`;
    console.log('[Client] Shopping action - View details:', {
      productId: product.id,
      productName: product.name,
      message: message,
      timestamp: new Date().toISOString()
    });
    if (connection) {
      connection.send(JSON.stringify({ 
        type: 'text', 
        text: message 
      }));
    }
  };

  const handleUpdateQuantity = (product: Product, quantity: number) => {
    const message = `Update ${product.name} quantity to ${quantity}`;
    console.log('[Client] Shopping action - Update quantity:', {
      productId: product.id,
      productName: product.name,
      quantity: quantity,
      message: message,
      timestamp: new Date().toISOString()
    });
    if (connection) {
      connection.send(JSON.stringify({ 
        type: 'text', 
        text: message 
      }));
    }
  };

  const handleRemoveItem = (product: Product) => {
    const message = `Remove ${product.name} from cart`;
    console.log('[Client] Shopping action - Remove item:', {
      productId: product.id,
      productName: product.name,
      message: message,
      timestamp: new Date().toISOString()
    });
    if (connection) {
      connection.send(JSON.stringify({ 
        type: 'text', 
        text: message 
      }));
    }
  };

  const handleContinueShopping = () => {
    const message = 'I want to continue shopping';
    console.log('[Client] Shopping action - Continue shopping:', {
      message: message,
      timestamp: new Date().toISOString()
    });
    if (connection) {
      connection.send(JSON.stringify({ 
        type: 'text', 
        text: message 
      }));
    }
  };

  // Render shopping widgets for a message
  const renderShoppingWidgets = (message: HistoryItemActor) => {
    const shoppingMessage = message as HistoryItemActorWithShopping;
    const shoppingData = shoppingMessage.shopping_data;
    
    if (!shoppingData) return null;

    console.log('[Client] Rendering shopping widgets:', {
      messageId: message.id,
      timestamp: new Date().toISOString(),
      widgetTypes: {
        recommendations: !!shoppingData.recommendations,
        productDetails: !!shoppingData.product_details,
        cartUpdate: !!shoppingData.cart_update,
        cartContents: !!shoppingData.cart_contents,
        orderResult: !!shoppingData.order_result
      },
      shopping_data: shoppingData
    });

    return (
      <Box 
        className="shopping-widget" 
        sx={{ 
          mt: 2, 
          pt: 1, 
          width: '100%',
          borderTop: '1px solid #e0e0e0',
          borderRadius: '0 0 8px 8px'
        }}
      >
        {shoppingData.recommendations && (
          <ProductRecommendationsWidget
            recommendations={shoppingData.recommendations}
            onAddToCart={handleAddToCart}
            onViewDetails={handleViewDetails}
          />
        )}
        
        {shoppingData.product_details && (
          <ProductDetailsWidget
            product={shoppingData.product_details}
            onAddToCart={handleAddToCart}
          />
        )}
        
        {(shoppingData.cart_contents || shoppingData.cart_update) && (
          <CartWidget
            cart={shoppingData.cart_contents}
            cartUpdate={shoppingData.cart_update}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
          />
        )}
        
        {shoppingData.order_result && (
          <OrderResultWidget
            orderResult={shoppingData.order_result}
            onContinueShopping={handleContinueShopping}
          />
        )}
      </Box>
    );
  };

  return (
    <HistoryStyled>
      <HistoryInner ref={ref}>
        <Box className="history--avatar-list">
          {combinedChatHistory.map((item, index) => {
            let messages = item.messages;
            let actorSource = 'AGENT';
            let message = item.messages?.[0];

            const title =
              item.type === CHAT_HISTORY_TYPE.ACTOR
                ? `${dateWithMilliseconds(message.date)} (${
                    item.interactionId
                  })`
                : '';

            if (item.type === CHAT_HISTORY_TYPE.ACTOR) {
              actorSource = item.source.isAgent ? 'AGENT' : 'USER';
            }

            return (
              <HistoryMessageGroup
                key={`PortalSimulatorChatHistoryMessageGroup-${index}`}
                className={`history-message-group history-message-group--${actorSource}`}
              >
                <HistoryActor
                  className="chat__bubble"
                  title={title}
                  key={index}
                  data-id={message.id}
                >
                  <Stack
                    sx={{ maxWidth: ['90%', '85%'] }}
                    flexDirection={'row'}
                    alignItems="center"
                  >
                    <HistoryItemMessageActor
                      className="history-actor"
                      key={`PortalSimulatorChatHistoryActor-${index}`}
                    >
                      <Typography sx={{ mb: 1 }}>
                        {messages.map((m) => (
                          <React.Fragment key={m.id}>
                            {getContent(m)}{' '}
                          </React.Fragment>
                        ))}
                      </Typography>
                      
                      {/* Render shopping widgets below the agent message */}
                      {actorSource === 'AGENT' && messages.length > 0 && (() => {
                        // Find the message with shopping data in this interaction group
                        const messageWithShoppingData = messages.find(msg => (msg as any).shopping_data);
                        return messageWithShoppingData ? renderShoppingWidgets(messageWithShoppingData) : null;
                      })()}
                    </HistoryItemMessageActor>
                  </Stack>
                </HistoryActor>
              </HistoryMessageGroup>
            );
          })}
          <Fade in={!isInteractionEnd} timeout={500}>
            <Box margin="0 0 20px 20px">
              <Typing />
            </Box>
          </Fade>
        </Box>
      </HistoryInner>
    </HistoryStyled>
  );
};
