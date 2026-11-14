export type WasiFdHandle = {
  path: string;
  position?: number;
};

export type WasiFdEntry = {
  type: string;
  preopenPath?: string;
  handle?: WasiFdHandle;
};
