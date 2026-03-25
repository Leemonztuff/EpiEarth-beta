import log from 'loglevel';

const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

log.setLevel(isDev ? log.levels.DEBUG : log.levels.WARN);

const LOG_PREFIX = '[EpiEarth]';

const createLogger = (prefix: string) => {
  return {
    debug: (message: string, ...args: unknown[]) => log.debug(`${LOG_PREFIX} ${prefix}`, message, ...args),
    info: (message: string, ...args: unknown[]) => log.info(`${LOG_PREFIX} ${prefix}`, message, ...args),
    warn: (message: string, ...args: unknown[]) => log.warn(`${LOG_PREFIX} ${prefix}`, message, ...args),
    error: (message: string, ...args: unknown[]) => log.error(`${LOG_PREFIX} ${prefix}`, message, ...args),
  };
};

export const logger = {
  game: createLogger('[Game]'),
  battle: createLogger('[Battle]'),
  store: createLogger('[Store]'),
  network: createLogger('[Network]'),
  audio: createLogger('[Audio]'),
  asset: createLogger('[Asset]'),
  ai: createLogger('[AI]'),
  ui: createLogger('[UI]'),
  general: createLogger('[General]'),
};

export default logger;
