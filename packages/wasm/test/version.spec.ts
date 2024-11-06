import { version } from '../src';
import { VERSION } from '@cspark/sdk';

describe('version', () => {
  it('should be defined', () => {
    expect(version).toBe('0.1.0-beta.1');
  });

  it('should depend on SDK version ^0.2.7', () => {
    expect(+VERSION.minor).toBeGreaterThanOrEqual(2);
    expect(+VERSION.patch).toBeGreaterThanOrEqual(7);
  });
});
