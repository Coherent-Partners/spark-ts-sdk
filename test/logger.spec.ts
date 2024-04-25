import { Log, Logger, LoggerOptions, DEFAULT_LOGGER_OPTIONS } from '@cspark/sdk/logger';

describe('Logger', () => {
  const CUSTOM_OPTIONS: LoggerOptions = {
    context: 'test',
    logLevels: ['warn'],
    timestamp: false,
    colorful: false,
  };

  it('can be created with default options', () => {
    const logger = Logger.of();
    expect(logger).toBeInstanceOf(Logger);
    expect(logger.options).toEqual(DEFAULT_LOGGER_OPTIONS);
    expect(logger.options.colorful).toBe(true);
    expect(logger.options.timestamp).toBe(true);
  });

  it('can be created with custom options', () => {
    const logger = Logger.of(CUSTOM_OPTIONS);
    expect(logger).toBeInstanceOf(Logger);
    expect(logger.options).toEqual(CUSTOM_OPTIONS);
    expect(logger.options.colorful).toBe(false);
    expect(logger.options.timestamp).toBe(false);
  });
});

describe('Log', () => {
  it('should return enabled levels', () => {
    expect(Log.verbose.levels).toEqual(['verbose', 'debug', 'log', 'warn', 'error', 'fatal', 'none']);
    expect(Log.debug.levels).toEqual(['debug', 'log', 'warn', 'error', 'fatal', 'none']);
    expect(Log.log.levels).toEqual(['log', 'warn', 'error', 'fatal', 'none']);
    expect(Log.warn.levels).toEqual(['warn', 'error', 'fatal', 'none']);
    expect(Log.error.levels).toEqual(['error', 'fatal', 'none']);
    expect(Log.fatal.levels).toEqual(['fatal', 'none']);
    expect(Log.none.levels).toEqual(['none']);
  });

  it('should be enabled based on levels', () => {
    expect(Log.verbose.isEnabled(['verbose'])).toBe(true);
    expect(Log.verbose.isEnabled(['debug'])).toBe(false);
    expect(Log.verbose.isEnabled(['log'])).toBe(false);
    expect(Log.verbose.isEnabled(['warn'])).toBe(false);
    expect(Log.verbose.isEnabled(['error'])).toBe(false);
    expect(Log.verbose.isEnabled(['fatal'])).toBe(false);
    expect(Log.verbose.isEnabled(['none'])).toBe(false);

    expect(Log.debug.isEnabled(['verbose'])).toBe(true);
    expect(Log.debug.isEnabled(['debug'])).toBe(true);
    expect(Log.debug.isEnabled(['log'])).toBe(false);
    expect(Log.debug.isEnabled(['warn'])).toBe(false);
    expect(Log.debug.isEnabled(['error'])).toBe(false);
    expect(Log.debug.isEnabled(['fatal'])).toBe(false);
    expect(Log.debug.isEnabled(['none'])).toBe(false);

    expect(Log.log.isEnabled(['verbose'])).toBe(true);
    expect(Log.log.isEnabled(['debug'])).toBe(true);
    expect(Log.log.isEnabled(['log'])).toBe(true);
    expect(Log.log.isEnabled(['warn'])).toBe(false);
    expect(Log.log.isEnabled(['error'])).toBe(false);
    expect(Log.log.isEnabled(['fatal'])).toBe(false);
    expect(Log.log.isEnabled(['none'])).toBe(false);

    expect(Log.warn.isEnabled(['verbose'])).toBe(true);
    expect(Log.warn.isEnabled(['debug'])).toBe(true);
    expect(Log.warn.isEnabled(['log'])).toBe(true);
    expect(Log.warn.isEnabled(['warn'])).toBe(true);
    expect(Log.warn.isEnabled(['error'])).toBe(false);
    expect(Log.warn.isEnabled(['fatal'])).toBe(false);
    expect(Log.warn.isEnabled(['none'])).toBe(false);

    expect(Log.error.isEnabled(['verbose'])).toBe(true);
    expect(Log.error.isEnabled(['debug'])).toBe(true);
    expect(Log.error.isEnabled(['log'])).toBe(true);
    expect(Log.error.isEnabled(['warn'])).toBe(true);
    expect(Log.error.isEnabled(['error'])).toBe(true);
    expect(Log.error.isEnabled(['fatal'])).toBe(false);
    expect(Log.error.isEnabled(['none'])).toBe(false);

    expect(Log.fatal.isEnabled(['verbose'])).toBe(true);
    expect(Log.fatal.isEnabled(['debug'])).toBe(true);
    expect(Log.fatal.isEnabled(['log'])).toBe(true);
    expect(Log.fatal.isEnabled(['warn'])).toBe(true);
    expect(Log.fatal.isEnabled(['error'])).toBe(true);
    expect(Log.fatal.isEnabled(['fatal'])).toBe(true);
    expect(Log.fatal.isEnabled(['none'])).toBe(false);
  });
});
