import type { AnyTool } from '../tool.js';
import { PERSON_READ_TOOLS } from './persons.js';
import { PERSON_CHANGE_TOOLS } from './changes.js';
import { SOURCE_TOOLS } from './sources.js';
import { MEDIA_TOOLS } from './media.js';
import { TRASH_TOOLS } from './trash.js';
import { TRANSFER_TOOLS } from './transfer.js';
import { SYSTEM_TOOLS } from './system.js';

/** All tools; which of them an assistant sees depends on the permissions (settings → MCP) */
export const ALL_TOOLS: AnyTool[] = [
  ...PERSON_READ_TOOLS,
  ...PERSON_CHANGE_TOOLS,
  ...SOURCE_TOOLS,
  ...MEDIA_TOOLS,
  ...TRASH_TOOLS,
  ...TRANSFER_TOOLS,
  ...SYSTEM_TOOLS,
];
