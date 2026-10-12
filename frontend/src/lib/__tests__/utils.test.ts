import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('utils', () => {
  describe('cn', () => {
    it('merges tailwind classes correctly', () => {
      expect(cn('px-2 py-1', 'bg-red-500')).toBe('px-2 py-1 bg-red-500');
    });

    it('resolves tailwind conflicts', () => {
      expect(cn('p-4 p-2')).toBe('p-2');
      expect(cn('bg-red-500 bg-blue-500')).toBe('bg-blue-500');
    });

    it('handles conditional classes', () => {
      const active = true;
      const danger = false;
      expect(cn('px-2', active && 'py-2', danger && 'bg-red-500')).toBe('px-2 py-2');
    });

    it('handles arrays and objects', () => {
      expect(cn(['px-2', 'py-1'], { 'bg-red-500': true, 'text-white': false })).toBe('px-2 py-1 bg-red-500');
    });
  });
});
