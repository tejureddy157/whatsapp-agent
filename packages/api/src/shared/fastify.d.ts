import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    // Raw request body bytes, captured by the custom JSON content-type
    // parser in server.ts so webhook signature verification can HMAC the
    // exact bytes Meta sent (a re-serialized body would not match).
    rawBody?: Buffer;
  }
}
