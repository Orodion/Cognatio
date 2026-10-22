import { ApolloLink, type Operation } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';

type Listener = () => void;

const listeners = new Set<Listener>();

/** Calls the listener after every change of data through the API; returns the function that ends it */
export function onDataChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Tells the listeners that data may have changed (also used for changes outside GraphQL, e.g. uploads) */
export function notifyDataChange() {
  for (const listener of listeners) {
    listener();
  }
}

const isMutation = (operation: Operation) => {
  const definition = getMainDefinition(operation.query);
  return definition.kind === 'OperationDefinition' && definition.operation === 'mutation';
};

/** Reports every finished mutation, so that numbers like the open possible errors are counted again */
export const dataChangeLink = new ApolloLink((operation, forward) => {
  const result = forward(operation);
  return isMutation(operation)
    ? result.map((response) => {
        notifyDataChange();
        return response;
      })
    : result;
});
