/* istanbul ignore file */
import type { OutboxRecord } from './outbox';

export async function pushOutbox(_records: OutboxRecord[]) {
  // Placeholder push implementation. Replace with Supabase RPC call when wiring sync.
}

export async function pullUpdates() {
  // Placeholder pull implementation. Replace with Supabase fetch when wiring sync.
}
