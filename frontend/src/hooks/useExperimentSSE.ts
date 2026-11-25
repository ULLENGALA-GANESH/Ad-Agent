import { useEffect, useState } from "react";
import { connectToExperimentLogs } from "../api/client";

export function useExperimentSSE(runId?: string) {
  const [messages, setMessages] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;
    setMessages([]);
    setIsDone(false);
    setIsFailed(false);
    setError(null);
    setConnected(false);

    const cleanup = connectToExperimentLogs(
      runId,
      (message) => {
        setConnected(true);
        setMessages((current) => [...current, message]);
      },
      () => {
        setConnected(false);
        setIsDone(true);
      },
      (err) => {
        setConnected(false);
        setIsFailed(true);
        if (err instanceof Error) {
          setError(err.message);
        }
      }
    );

    return () => cleanup();
  }, [runId]);

  return { messages, connected, isDone, isFailed, error };
}