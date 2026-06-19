"use client";

import { useEffect, useRef, useState } from "react";
import { svcUrl } from "@/lib/runtimeHost";

const DEFAULT_SSE_STREAM_URL =
  process.env.NEXT_PUBLIC_SSE_STREAM_URL || svcUrl("http", 8077, "/stream");

const useSse = ({
  clientId,
  withCredentials = false,
  enabled = true,
  streamUrl,
  onMessage,
  storeMessages = true,
}) => {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState({ connected: false, error: null });
  const sourceRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  const storeMessagesRef = useRef(storeMessages);
  const baseUrl = streamUrl || process.env.NEXT_PUBLIC_SSE_STREAM_URL || DEFAULT_SSE_STREAM_URL;
  const resolvedUrl = clientId ? `${baseUrl}?clientId=${encodeURIComponent(clientId)}` : null;

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    storeMessagesRef.current = storeMessages;
  }, [storeMessages]);

  useEffect(() => {
    if (!enabled || !resolvedUrl) return;

    const source = new EventSource(resolvedUrl, { withCredentials });
    sourceRef.current = source;

    source.onopen = () => {
      setStatus({ connected: true, error: null });
    };

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (storeMessagesRef.current) {
          setMessages((prev) => [...prev, data]);
        }
        if (typeof onMessageRef.current === "function") {
          try {
            onMessageRef.current(data, event);
          } catch (callbackError) {
            console.error("SSE onMessage callback error:", callbackError);
          }
        }
      } catch {
        if (storeMessagesRef.current) {
          setMessages((prev) => [...prev, event.data]);
        }
        if (typeof onMessageRef.current === "function") {
          try {
            onMessageRef.current(event.data, event);
          } catch (callbackError) {
            console.error("SSE onMessage callback error:", callbackError);
          }
        }
      }
    };

    source.onerror = (error) => {
      setStatus({ connected: false, error: error?.message || "SSE connection error" });
    };

    return () => {
      source.close();
      sourceRef.current = null;
      setStatus((prev) => ({ ...prev, connected: false }));
    };
  }, [enabled, resolvedUrl, withCredentials]);

  const clearMessages = () => setMessages([]);

  const close = () => {
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
      setStatus((prev) => ({ ...prev, connected: false }));
    }
  };

  return {
    messages,
    status,
    clearMessages,
    close,
  };
};

export default useSse;