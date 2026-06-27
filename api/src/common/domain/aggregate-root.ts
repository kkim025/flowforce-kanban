import { Entity } from './entity';

export abstract class AggregateRoot<T> extends Entity<T> {
  // Domain events can be added here later
}
