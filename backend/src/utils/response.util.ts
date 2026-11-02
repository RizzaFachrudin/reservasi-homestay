export interface SuccessResponse<T = any> {
  success: true;
  message: string;
  data?: T;
  meta?: any;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: any;
}

export const sendSuccess = <T>(
  res: any,
  message: string,
  data?: T,
  statusCode: number = 200,
  meta?: any
): void => {
  const response: SuccessResponse<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
    ...(meta && { meta })
  };
  res.status(statusCode).json(response);
};

export const sendError = (
  res: any,
  message: string,
  statusCode: number = 500,
  errors?: any
): void => {
  const response: ErrorResponse = {
    success: false,
    message,
    ...(errors && { errors })
  };
  res.status(statusCode).json(response);
};

export const formatSuccessResponse = <T>(data: T, message: string): SuccessResponse<T> => ({
  success: true,
  message,
  data
});

export const formatErrorResponse = (message: string, errors?: any): ErrorResponse => ({
  success: false,
  message,
  errors
});
