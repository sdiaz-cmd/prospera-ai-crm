import { Response } from 'express';
import { ApiResponse } from '../types';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Operación exitosa',
  statusCode = 200,
  meta?: ApiResponse['meta']
): Response => {
  const response: ApiResponse<T> = { success: true, data, message };
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  errors?: Record<string, string[]>
): Response => {
  const response: ApiResponse = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

export const getPagination = (page = 1, limit = 20) => {
  const take = Math.min(limit, 100);
  const skip = (page - 1) * take;
  return { take, skip };
};

export const buildPaginationMeta = (total: number, page: number, limit: number) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});
