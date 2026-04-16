import { defineRoute } from '../defineRoute';
import { BackendError } from '../errors';

type SayInput = { message: string };
type SayOutput = { echoed: string; length: number };

export const echo = {
  say: defineRoute<SayInput, SayOutput>({
    validate: (input) => {
      if (
        !input ||
        typeof input !== 'object' ||
        typeof (input as { message?: unknown }).message !== 'string'
      ) {
        throw new BackendError(400, 'message must be a string');
      }
      return input as SayInput;
    },
    handler: ({ input }) => ({
      echoed: input.message,
      length: input.message.length,
    }),
  }),
};
