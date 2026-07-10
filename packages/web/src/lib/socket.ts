import { io, type Socket } from "socket.io-client";
import { API_URL } from "./config";

let socket: Socket | null = null;

/** One shared connection for the whole app, authenticated with the current access token. */
export function getSocket(accessToken: string): Socket {
  if (socket && socket.connected) return socket;

  if (socket) {
    socket.disconnect();
  }

  socket = io(API_URL, {
    auth: { token: accessToken },
    withCredentials: true,
    transports: ["websocket", "polling"],
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
