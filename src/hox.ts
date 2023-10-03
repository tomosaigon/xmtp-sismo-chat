export enum HOXStatusCode {
  Continue = 100,
  OK = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  NoPong = 420,
}

export class HOXResponse {
  private statusCode: HOXStatusCode;
  private body: string;

  constructor(code: HOXStatusCode, body?: string) {
    this.statusCode = code;
    this.body = body || '';
  }

  toString(): string {
    return `HTTP/1.1 ${this.statusCode} ${this.getStatusText()}\n\n${this.body}`;
  }

  private getStatusText(): string {
    switch (this.statusCode) {
      case HOXStatusCode.OK:
        return 'OK';
      case HOXStatusCode.Unauthorized:
        return 'Unauthorized';
      case HOXStatusCode.NotFound:
        return 'Not Found';
      case HOXStatusCode.BadRequest:
        return 'Bad Request';
      default:
        return '';
    }
  }
}

export class HOXRequest {
    method: string;
    path: string;
    parameters: Record<string, string>;
    headers: Record<string, string>;
    body: string;
  
    constructor() {
      this.method = '';
      this.path = '';
      this.parameters = {};
      this.headers = {};
      this.body = '';
    }
  }
  
 export function parseHOXRequest(text: string): HOXRequest {
    const lines = text.split('\n');
    const requestLine = lines[0].trim().split(' ');
    if (requestLine.length < 2) {
      throw new Error('Invalid request line');
    }
  
    const method = requestLine[0].toUpperCase();
    const pathWithParams = requestLine[1].split('?');
    const path = pathWithParams[0];
    const parameters = pathWithParams[1] || '';
  
    if (method !== 'GET' && method !== 'POST' && method !== 'CONNECT') {
      throw new Error('Invalid method: Must be GET, POST, or CONNECT');
    }
    
    if (method !== 'CONNECT' && !path.startsWith('/')) {
      throw new Error('Invalid path: Must start with a slash');
    }
    
    if (method === 'CONNECT' && !/^[\w.-]+:6667$/.test(path)) {
      throw new Error('Invalid path format for CONNECT: Must be "hostname:6667"');
    }
  
    const request = new HOXRequest();
    request.method = method;
    request.path = path;
  
    if (parameters) {
      const parameterPairs = parameters.split('&');
      parameterPairs.forEach((pair) => {
        const [name, value] = pair.split('=');
        request.parameters[name] = decodeURIComponent(value);
      });
    }
  
    let i = 1;
  
    for (; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '') {
        break;
      }
  
      const headerParts = line.split(':');
      if (headerParts.length === 2) {
        const headerName = headerParts[0].trim();
        const headerValue = headerParts[1].trim();
        request.headers[headerName] = headerValue;
      } else {
        throw new Error('Invalid header format');
      }
    }
  
    request.body = lines.slice(i + 1).join('\n').trim();
  
    return request;
  }
  