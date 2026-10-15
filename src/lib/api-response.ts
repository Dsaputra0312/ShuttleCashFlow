import { NextResponse } from 'next/server';

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface SuccessBody<T> {
  data: T;
  meta: { pagination: null };
  message: string;
}

export interface PaginatedBody<T> {
  data: T[];
  meta: { pagination: PaginationMeta };
  message: string;
}

export interface ErrorBody {
  message: string;
  errors?: Record<string, string[]>;
}

export function successResponse<T>(
  data: T,
  message = 'OK',
  status = 200
): NextResponse<SuccessBody<T>> {
  return NextResponse.json(
    { data, meta: { pagination: null }, message },
    { status }
  );
}

export function paginatedResponse<T>(
  data: T[],
  meta: PaginationMeta,
  message = 'OK'
): NextResponse<PaginatedBody<T>> {
  return NextResponse.json({ data, meta: { pagination: meta }, message });
}

export function errorResponse(
  message: string,
  errors?: Record<string, string[]>,
  status = 400
): NextResponse<ErrorBody> {
  return NextResponse.json({ message, errors }, { status });
}
