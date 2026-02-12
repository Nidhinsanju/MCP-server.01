
import fs from 'fs/promises';
import path from 'path';

export async function readFile(filePath: string): Promise<string> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return data;
  } catch (error) {
    return `Error reading file: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export async function writeFile(filePath: string, content: string): Promise<string> {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(filePath, content, 'utf-8');
    return `Successfully wrote to ${filePath}`;
  } catch (error) {
    return `Error writing file: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export async function listDirectory(dirPath: string): Promise<string> {
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    const formatted = files.map(file => {
      return `${file.isDirectory() ? '[DIR] ' : '[FILE]'} ${file.name}`;
    }).join('\n');
    return formatted || "Empty directory";
  } catch (error) {
    return `Error listing directory: ${error instanceof Error ? error.message : String(error)}`;
  }
}
