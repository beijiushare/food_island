import { db } from '../db';
import { DEFAULT_TARGETS, type Targets } from '../types';

const TARGETS_KEY = 'targets';

export async function getTargets(): Promise<Targets> {
  const row = await db.settings.get(TARGETS_KEY);
  const value = row?.value as Partial<Targets> | undefined;
  return { ...DEFAULT_TARGETS, ...(value ?? {}) };
}

export async function setTargets(targets: Targets): Promise<void> {
  await db.settings.put({ key: TARGETS_KEY, value: targets });
}
