import { NextFunction, Request, Response } from "express";
import { firebaseAuth } from "../lib/firebaseAdmin";
import { prisma } from "../lib/prisma";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      firebaseUid?: string;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }
  const idToken = header.slice("Bearer ".length);

  try {
    const decoded = await firebaseAuth.verifyIdToken(idToken);
    const user = await prisma.user.upsert({
      where: { firebaseUid: decoded.uid },
      update: {
        email: decoded.email ?? "",
        displayName: decoded.name ?? null,
        photoUrl: decoded.picture ?? null,
      },
      create: {
        firebaseUid: decoded.uid,
        email: decoded.email ?? "",
        displayName: decoded.name ?? null,
        photoUrl: decoded.picture ?? null,
      },
    });
    req.userId = user.id;
    req.firebaseUid = decoded.uid;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export async function verifyIdToken(idToken: string) {
  const decoded = await firebaseAuth.verifyIdToken(idToken);
  const user = await prisma.user.upsert({
    where: { firebaseUid: decoded.uid },
    update: {
      email: decoded.email ?? "",
      displayName: decoded.name ?? null,
      photoUrl: decoded.picture ?? null,
    },
    create: {
      firebaseUid: decoded.uid,
      email: decoded.email ?? "",
      displayName: decoded.name ?? null,
      photoUrl: decoded.picture ?? null,
    },
  });
  return { userId: user.id, firebaseUid: decoded.uid };
}
