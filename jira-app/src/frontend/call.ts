import { invoke } from "@forge/bridge";

/** invoke() without metadata returns the resolver's value as is. */
export const call = async <T>(key: string, payload?: Record<string, unknown>): Promise<T> =>
  (await invoke(key, payload)) as T;
