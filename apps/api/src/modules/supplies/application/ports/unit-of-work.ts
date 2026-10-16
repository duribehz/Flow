declare const executorBrand: unique symbol;

export interface Executor {
  readonly [executorBrand]: never;
}

export interface UnitOfWork {
  execute<T>(work: (executor: Executor) => Promise<T>): Promise<T>;
}
