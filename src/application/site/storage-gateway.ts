export interface StorageGateway {
  uploadFile(path: string, data: Uint8Array, mimeType: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  getUrl(path: string): string;
}

export class StorageGatewayError extends Error {
  constructor(message = "Storage service is temporarily unavailable.") {
    super(message);
    this.name = "StorageGatewayError";
  }
}
