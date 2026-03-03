declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        destination: string;
        filename: string;
        path: string;
        size: number;
      }
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    file?: Express.Multer.File;
  }
}

export {};
