import { useEffect, useRef } from 'react';
import { supabase } from '@/auth/client';
import { useSessionStore } from '@/auth/session';
import { clearBroadcastMessage, setBroadcastMessage } from './store';

type MessageRow = {
  id: string;
  title: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  published_at: string;
  expires_at: string | null;
};

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function mapRow(row: MessageRow) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    ctaLabel: row.cta_label ?? undefined,
    ctaUrl: row.cta_url ?? undefined,
    publishedAt: row.published_at,
    expiresAt: row.expires_at ?? undefined,
  };
}

async function fetchLatestMessage() {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .lte('published_at', nowIso)
    .order('published_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('[Messaging] Failed to load announcements:', error);
    return null;
  }

  const rows = (data ?? []) as MessageRow[];
  const active = rows.find((row) => {
    if (!row.expires_at) return true;
    return row.expires_at > nowIso;
  });

  return active ? mapRow(active) : null;
}

export function useMessagesSync() {
  const status = useSessionStore((state) => state.status);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const message = await fetchLatestMessage();
      if (cancelled) return;

      if (message) {
        setBroadcastMessage(message);
      } else {
        clearBroadcastMessage();
      }
    };

    load();

    timerRef.current = setInterval(load, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);
}
