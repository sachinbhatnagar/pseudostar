import type { Problem } from './types';
import { easy } from './catalog/easy';
import { medium } from './catalog/medium';
import { hard } from './catalog/hard';

export const catalog: Problem[] = [...easy, ...medium, ...hard];
