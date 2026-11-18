#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

if (process.argv.length < 3) {
  console.error('Usage: node scripts/report-build-size.mjs <artifact-path> [--breakdown]');
  process.exit(1);
}

const artifactPath = path.resolve(process.argv[2]);
const breakdown = process.argv.includes('--breakdown');

async function getFileStat(target) {
  try {
    return await fs.promises.stat(target);
  } catch (error) {
    console.error(`[build-size] Unable to read ${target}: ${error.message}`);
    process.exit(1);
  }
}

function formatSize(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function collectBreakdown(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const sizes = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      sizes.push(...(await collectBreakdown(fullPath)));
    } else {
      const stats = await fs.promises.stat(fullPath);
      sizes.push({ path: fullPath, size: stats.size });
    }
  }

  return sizes;
}

const artifactStats = await getFileStat(artifactPath);
console.log(`[build-size] ${path.basename(artifactPath)} => ${formatSize(artifactStats.size)}`);

if (breakdown) {
  const baseDir = path.dirname(artifactPath);
  const files = await collectBreakdown(baseDir);
  const topFiles = files
    .filter((file) => file.path !== artifactPath)
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  if (topFiles.length === 0) {
    console.log('[build-size] No sibling files found for breakdown.');
  } else {
    console.log('[build-size] Top contributors:');
    for (const file of topFiles) {
      console.log(`  - ${path.relative(process.cwd(), file.path)} (${formatSize(file.size)})`);
    }
  }
}
