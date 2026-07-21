import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const CONTRACT_DOCUMENT_LOGO_PATH = '/brand/norm8-logo-black.png';
export const CONTRACT_DOCUMENT_LOGO_FILE = 'public/brand/norm8-logo-black.png';

export async function getPublicAssetDataUri(relativePath: string, mimeType: string): Promise<string> {
  const normalizedPath = relativePath.replace(/^[\\/]+/, '').replace(/\\/g, '/');
  const absolutePath = path.join(process.cwd(), ...normalizedPath.split('/'));
  const file = await readFile(absolutePath);
  if (process.env.NODE_ENV !== 'production') {
    console.info('Contract logo loaded for PDF', { path: normalizedPath, bytes: file.byteLength });
  }
  return `data:${mimeType};base64,${file.toString('base64')}`;
}

export async function getContractLogoDataUri(): Promise<string> {
  try {
    return await getPublicAssetDataUri(CONTRACT_DOCUMENT_LOGO_FILE, 'image/png');
  } catch (error) {
    const message = `Logótipo de contrato não encontrado em ${CONTRACT_DOCUMENT_LOGO_FILE}.`;
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(message, { cause: error });
    }
    throw new Error(message);
  }
}
