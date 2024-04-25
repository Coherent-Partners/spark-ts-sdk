import { StringUtils, NumberUtils, type Maybe } from './utils';
import { SparkError } from './error';

export abstract class Validator<T> {
  readonly errors: SparkError[] = [];

  abstract validate(value: T): void;

  isValid(value: T): boolean {
    try {
      this.validate(value);
      return true;
    } catch (error) {
      this.errors.push(error as SparkError);
      return false;
    }
  }

  reset(): void {
    this.errors.length = 0;
  }
}

export class ArrayValidator<T> extends Validator<T> {
  validate(...values: T[]): void {
    if (!values || values.length === 0) {
      throw SparkError.sdk({
        message: `must be a non-empty array`,
        cause: values?.map((n) => n?.toString()).join(', '),
      });
    }
  }
}

export class EmptyStringValidator extends Validator<Maybe<string> | unknown> {
  static #validator: EmptyStringValidator;

  static getInstance(): EmptyStringValidator {
    const validator = this.#validator || (this.#validator = new this());
    validator.reset();
    return validator;
  }

  validate(value: Maybe<string> | unknown, message?: string): void {
    if (StringUtils.isEmpty(value)) {
      throw SparkError.sdk({ message: message ?? 'must be non-empty string value', cause: value });
    }
  }

  isValid(value: Maybe<string> | unknown, message?: string): value is string {
    try {
      this.validate(value, message);
      return true;
    } catch (error) {
      this.errors.push(error as SparkError);
      return false;
    }
  }
}

export class ArrayStringValidator extends ArrayValidator<Maybe<string>> {
  readonly #stringValidator = EmptyStringValidator.getInstance();
  static #validator: ArrayStringValidator;

  static getInstance(): ArrayStringValidator {
    const validator = this.#validator || (this.#validator = new this());
    validator.reset();
    return validator;
  }

  validate(...values: Maybe<string>[]): void {
    super.validate(...values);
    values.forEach((v) => this.#stringValidator.validate(v));
  }

  isValid(...values: Maybe<string>[]): boolean {
    try {
      this.validate(...values);
      return true;
    } catch (error) {
      this.errors.push(error as SparkError);
      return false;
    }
  }
}

export class PositiveIntegerValidator extends Validator<number | unknown> {
  static #validator: PositiveIntegerValidator;

  static getInstance(): PositiveIntegerValidator {
    const validator = this.#validator || (this.#validator = new this());
    validator.reset();
    return validator;
  }

  validate(value: number | unknown): void {
    if (!NumberUtils.isPositive(value)) {
      throw SparkError.sdk({ message: 'must be a positive integer', cause: value });
    }
  }
}

export class BaseUrlValidator extends Validator<Maybe<string>> {
  readonly #wildcard = /^https?:\/\/(?:[^./]+\.)+coherent\.global(?:\/[^/?#]+)*(?:[?#].*)?$/i;
  static #validator: BaseUrlValidator;

  static getInstance(): BaseUrlValidator {
    const validator = this.#validator || (this.#validator = new this());
    validator.reset();
    return validator;
  }

  validate(value: Maybe<string>): void {
    if (!value) throw SparkError.sdk({ message: 'base URL is required', cause: value });

    if (!this.#wildcard.test(value!)) {
      throw SparkError.sdk({ message: 'must be a Spark base URL <*.coherent.global>', cause: value });
    }

    try {
      new URL(value!);
    } catch (cause) {
      throw SparkError.sdk({ message: `<${value}> must be a valid URL`, cause });
    }
  }
}

export default {
  baseUrl: BaseUrlValidator,
  emptyString: EmptyStringValidator,
  arrayString: ArrayStringValidator,
  positiveInteger: PositiveIntegerValidator,
};
