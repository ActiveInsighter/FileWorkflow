import { MESSAGE_TYPES } from '../shared/constants';

export type RuntimeMessage =
  | { type: typeof MESSAGE_TYPES.OPEN_CHATGPT }
  | { type: typeof MESSAGE_TYPES.TOGGLE_PANEL };

export interface RuntimeMessageResponse {
  ok: boolean;
  error?: string;
}
