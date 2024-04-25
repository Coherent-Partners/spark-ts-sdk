import { SparkError } from '@cspark/sdk';
import Validators from '@cspark/sdk/validators';

describe('Validators', () => {
  it('should validate empty string', () => {
    const validator = Validators.arrayString.getInstance();
    expect(validator.isValid('', undefined)).toBeFalsy();
    expect(validator.isValid('array', 'of', 'string')).toBeTruthy();
  });

  it('should contain errors when invalid', () => {
    const validator = Validators.emptyString.getInstance();
    expect(validator.isValid('')).toBeFalsy();
    expect(validator.isValid(undefined)).toBeFalsy();
    expect(validator.isValid(null)).toBeFalsy();
    expect(validator.errors.length).toBe(3);
    validator.errors.forEach((error) => expect(error).toBeInstanceOf(SparkError));
  });

  it('should be able to reset errors', () => {
    const validator = Validators.positiveInteger.getInstance();
    expect(validator.isValid(-1)).toBeFalsy();
    expect(validator.isValid(0)).toBeFalsy();
    expect(validator.errors.length).toBe(2);

    validator.reset();
    expect(validator.errors.length).toBe(0);
  });

  it('should auto reset errors upon new instances', () => {
    let validator = Validators.baseUrl.getInstance();
    expect(validator.isValid('http://incorrect-url')).toBeFalsy();
    expect(validator.errors.length).toBe(1);

    validator = Validators.baseUrl.getInstance();
    expect(validator.errors.length).toBe(0);
  });
});
