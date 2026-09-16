import type { ParsedPackage } from '../types';
import { parseText } from '../parser/engine';

export interface ParserService {
  parseText(text: string): Promise<ParsedPackage>;
}

export function createParserService(): ParserService {
  return {
    parseText: async (text: string) => parseText(text),
  };
}
