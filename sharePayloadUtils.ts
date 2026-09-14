import { AISimulationItem } from '../types';

/**
 * Utility functions to encode and decode AI Simulation payloads for sharing URLs or data transfer.
 */

export const encodeSimulationPayload = (payload: AISimulationItem | Record<string, any>): string => {
  try {
    const jsonStr = JSON.stringify(payload);
    return btoa(encodeURIComponent(jsonStr));
  } catch (err) {
    console.error('Failed to encode simulation payload:', err);
    return '';
  }
};

export const decodeSimulationPayload = (encoded: string): AISimulationItem | Record<string, any> | null => {
  try {
    if (!encoded) return null;
    const jsonStr = decodeURIComponent(atob(encoded));
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Failed to decode simulation payload:', err);
    return null;
  }
};
