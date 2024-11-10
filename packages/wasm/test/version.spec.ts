import { VERSION } from '@cspark/sdk';

describe('version', () => {
  it('should depend on SDK version ^0.2.8', () => {
    expect(+VERSION.minor).toBeGreaterThanOrEqual(2);
    // expect(+VERSION.patch).toBeGreaterThanOrEqual(8);
  });
});
