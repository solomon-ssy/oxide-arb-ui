import { describe, expect, it } from 'vitest';

import { centerTableColumns } from './center-columns';

describe('centerTableColumns', () => {
  it('forces center alignment on every column', () => {
    const columns = centerTableColumns([
      { align: 'right', field: 'amount' },
      { field: 'name', headerAlign: 'left' },
    ]);
    expect(columns).toEqual([
      { align: 'center', field: 'amount', headerAlign: 'center' },
      { align: 'center', field: 'name', headerAlign: 'center' },
    ]);
  });

  it('returns undefined when columns are omitted', () => {
    expect(centerTableColumns(undefined)).toBeUndefined();
  });
});
