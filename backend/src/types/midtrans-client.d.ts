declare module 'midtrans-client' {
  export interface MidtransConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey?: string;
  }

  export interface SnapTransactionResponse {
    token: string;
    redirect_url: string;
  }

  export class Snap {
    constructor(config: MidtransConfig);
    createTransaction(parameter: Record<string, any>): Promise<SnapTransactionResponse>;
    createTransactionToken(parameter: Record<string, any>): Promise<string>;
    createTransactionRedirectUrl(parameter: Record<string, any>): Promise<string>;
  }

  export class CoreApi {
    constructor(config: MidtransConfig);
    transaction: {
      status(orderIdOrTransactionId: string): Promise<Record<string, any>>;
      notification(notificationObj: Record<string, any>): Promise<Record<string, any>>;
    };
  }

  const midtransClient: {
    Snap: typeof Snap;
    CoreApi: typeof CoreApi;
  };

  export default midtransClient;
}
