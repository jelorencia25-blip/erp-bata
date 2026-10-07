import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.PORTAL_JWT_SECRET!);

export type PortalSessionPayload = {
  portalUserId: string;
  customerId: string;
  customerName: string;
  username: string;
};

export async function signPortalSession(payload: PortalSessionPayload): Promise<string> {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyPortalSession(token: string): Promise<PortalSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as PortalSessionPayload;
  } catch {
    return null;
  }
}

export const PORTAL_COOKIE_NAME = 'portal_session';