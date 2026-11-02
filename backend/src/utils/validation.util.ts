import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from './response.util';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        sendError(res, 'Validation failed', 400, errors);
        return;
      }
      sendError(res, 'Invalid request', 400);
    }
  };
};

export const validateRequest = (schema: ZodSchema, data: any) => {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.reduce((acc, err) => {
        const key = err.path[0];
        if (key) {
          acc[key] = err.message;
        }
        return acc;
      }, {} as Record<string, string>);
      return { success: false, errors };
    }
    return { success: false, errors: { general: 'Invalid request' } };
  }
};
