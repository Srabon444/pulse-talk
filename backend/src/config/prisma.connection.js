import "dotenv/config";
import {PrismaClient} from "@prisma/client";
import logger from './logger';

export const prisma = new PrismaClient();

async function connectPrisma() {
  try {
    await prisma.$connect();
    logger.info("Prisma database connected successfully");
  } catch (error) {
    logger.error({error}, "Prisma connection failed");
    throw new Error("Prisma connection failed");
  }
}

export {connectPrisma}