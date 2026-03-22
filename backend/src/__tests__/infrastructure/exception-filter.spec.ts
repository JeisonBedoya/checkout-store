import { GlobalExceptionFilter } from '../../infrastructure/http/filters/http-exception.filter';
import { HttpException, HttpStatus } from '@nestjs/common';

const mockJson = jest.fn();
const mockStatus = jest.fn(() => ({ json: mockJson }));
const mockGetResponse = jest.fn(() => ({ status: mockStatus }));
const mockGetRequest = jest.fn(() => ({ url: '/test' }));

const mockHost = {
  switchToHttp: jest.fn(() => ({
    getResponse: mockGetResponse,
    getRequest: mockGetRequest,
  })),
};

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    jest.clearAllMocks();
    filter = new GlobalExceptionFilter();
  });

  it('handles HttpException correctly', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
    filter.catch(exception, mockHost as any);
    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 404,
      message: 'Not Found',
    }));
  });

  it('handles unknown errors as 500', () => {
    const exception = new Error('DB crashed');
    filter.catch(exception, mockHost as any);
    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 500,
    }));
  });
});
