// Configuration using VITE_ environment variables
const PORT = import.meta.env.VITE_APP_PORT || '4000';

// Cloud URL
const BASE_URL = `https://${PORT}-01k0ctbv043p7fwm28bh5mfve4.cloudspaces.litng.ai`;
const WS_BASE_URL = `wss://${PORT}-01k0ctbv043p7fwm28bh5mfve4.cloudspaces.litng.ai`;

// Local URL
// const BASE_URL = `http://localhost:${PORT}`;
// const WS_BASE_URL = `ws://localhost:${PORT}`;

export const config = {
  BASE_URL,
  LOAD_URL: `${BASE_URL}/load`,
  UNLOAD_URL: `${BASE_URL}/unload`,
  SESSION_URL: `${WS_BASE_URL}/session`
};
