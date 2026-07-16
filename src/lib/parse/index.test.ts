import { describe, it, expect } from 'vitest';
import { documentFromText, parseFile, ParseError } from './index';

describe('parseFile — plain text', () => {
  it('parses a .txt file into paragraphs', async () => {
    const file = new File(['First paragraph.\n\nSecond   paragraph.\n'], 'draft.txt', {
      type: 'text/plain',
    });
    const doc = await parseFile(file);
    expect(doc.name).toBe('draft.txt');
    expect(doc.paragraphs).toEqual(['First paragraph.', 'Second paragraph.']);
  });

  it('rejects unsupported extensions with a friendly message', async () => {
    const file = new File(['x'], 'notes.xlsx');
    await expect(parseFile(file)).rejects.toThrow(/\.docx, \.pdf or \.txt/);
  });
});

describe('documentFromText', () => {
  it('builds a document from pasted text', () => {
    const doc = documentFromText('Pasted text', '1. One.\n2. Two.');
    expect(doc.paragraphs).toEqual(['1. One.', '2. Two.']);
  });

  it('rejects empty pastes', () => {
    expect(() => documentFromText('Pasted text', '   \n \n')).toThrow(ParseError);
  });
});
