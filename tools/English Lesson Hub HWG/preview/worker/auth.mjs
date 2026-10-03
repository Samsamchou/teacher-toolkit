export async function authenticateWorker({
  authorization,
  audience,
  caller,
  verifyIdToken,
}) {
  if (!audience || !caller)
    throw new Error("Worker identity configuration required");
  const token = authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) throw new Error("Worker authorization required");
  const ticket = await verifyIdToken({ idToken: token, audience }),
    claims = ticket.getPayload();
  if (!claims || claims.email !== caller || claims.email_verified !== true)
    throw new Error("Worker caller denied");
  return true;
}
