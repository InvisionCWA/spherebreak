'use strict';

let prisma = null;

function getPrismaClient() {
  if (prisma) return prisma;

  try {
    // eslint-disable-next-line global-require
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
    return prisma;
  } catch (error) {
    return null;
  }
}

module.exports = { getPrismaClient };
