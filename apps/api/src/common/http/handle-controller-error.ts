import { Response } from 'express';
import { ApplicationException } from '../errors/application-exception';
import { Result } from './result';

export const handleControllerError = (res: Response, error: unknown, fallbackMessage: string): void => {
  if (error instanceof ApplicationException) {
    res.status(error.statusCode).json(Result.fail(error.message, error.code, error.details));
    return;
  }

  const detail = error instanceof Error ? error.message : undefined;
  res.status(500).json(Result.fail(fallbackMessage, 'UNEXPECTED_ERROR', detail));
};
