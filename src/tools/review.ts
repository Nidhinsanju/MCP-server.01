
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from './filesystem.js';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

type PendingAction = 
  | { type: 'file_write'; id: string; path: string; content: string }
  | { type: 'shell_command'; id: string; command: string };

const pendingActions: Map<string, PendingAction> = new Map();

export function requestFileWrite(path: string, content: string): string {
  const id = uuidv4().slice(0, 8); // Short ID for easier typing
  pendingActions.set(id, { type: 'file_write', id, path, content });
  return id;
}

export function requestShellCommand(command: string): string {
  const id = uuidv4().slice(0, 8);
  pendingActions.set(id, { type: 'shell_command', id, command });
  return id;
}

export function getPendingAction(id: string): PendingAction | undefined {
  return pendingActions.get(id);
}

export function listPendingActions(): string {
  if (pendingActions.size === 0) return "No pending actions.";
  
  return Array.from(pendingActions.values()).map(action => {
    if (action.type === 'file_write') {
      return `[${action.id}] Write options to: ${action.path}`;
    } else {
      return `[${action.id}] Run command: ${action.command}`;
    }
  }).join('\n');
}

export async function approveAction(id: string): Promise<string> {
  const action = pendingActions.get(id);
  if (!action) return `Error: No pending action found with ID ${id}`;

  try {
    if (action.type === 'file_write') {
      await writeFile(action.path, action.content);
      pendingActions.delete(id);
      return `Successfully wrote to ${action.path}`;
    } else if (action.type === 'shell_command') {
      const { stdout, stderr } = await execPromise(action.command);
      pendingActions.delete(id);
      return `Command executed.\nStdout: ${stdout}\nStderr: ${stderr}`;
    }
    return "Unknown action type.";
  } catch (error) {
    return `Error executing action: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export function rejectAction(id: string): string {
  if (pendingActions.delete(id)) {
    return `Action ${id} rejected and removed.`;
  }
  return `Error: No pending action found with ID ${id}`;
}
