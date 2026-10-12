import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { Packer } from 'docx';
import { diffDocuments } from './diffDocuments';
import { buildRedlineDocument } from './exportRedline';

describe('buildRedlineDocument', () => {
  it('writes differences as Word tracked insertions and deletions', async () => {
    const { rows } = diffDocuments(
      ['1. Term. Three years.', '2. Fee. The fee is 0.25 per cent.', '3. Notices. In writing.'],
      ['1. Term. Three years.', '2. Fee. The fee is 0.15 per cent.', '4. Survival. Clause 2 survives.'],
    );
    const zip = await JSZip.loadAsync(await Packer.toBuffer(buildRedlineDocument(rows, 'Tester', '2026-10-13T00:00:00Z')));
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toMatch(/<w:del [^>]*w:author="Tester"[\s\S]*?<w:delText[^>]*>25<\/w:delText>/);
    expect(xml).toMatch(/<w:ins [^>]*w:author="Tester"[\s\S]*?<w:t[^>]*>15<\/w:t>/);
    expect(xml).toContain('Three years.');
    expect(xml).toMatch(/<w:delText[^>]*>3\. Notices\. In writing\.<\/w:delText>/);
  });
});
