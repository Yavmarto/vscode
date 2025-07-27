import * as vscode from 'vscode';
import * as path from 'path';

export interface FileNode {
  name: string;
  isDirectory: boolean;
  path: string;
}

export async function listFiles(relativePath: string): Promise<FileNode[]> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return [];
  }

  const rootPath = workspaceFolders[0].uri;
  const absolutePath = vscode.Uri.joinPath(rootPath, relativePath);

  try {
    const entries = await vscode.workspace.fs.readDirectory(absolutePath);
    const fileNodes: FileNode[] = [];

    for (const [name, type] of entries) {
      const filePath = path.join(relativePath, name);
      fileNodes.push({
        name,
        isDirectory: type === vscode.FileType.Directory,
        path: filePath,
      });
    }

    return fileNodes;
  } catch (error) {
    console.error(`Error reading directory ${absolutePath.fsPath}:`, error);
    return [];
  }
}

export async function getFileContent(relativePath: string): Promise<string | null> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return null;
  }

  const rootPath = workspaceFolders[0].uri;
  const absolutePath = vscode.Uri.joinPath(rootPath, relativePath);

  try {
    const content = await vscode.workspace.fs.readFile(absolutePath);
    return Buffer.from(content).toString('utf-8');
  } catch (error) {
    console.error(`Error reading file ${absolutePath.fsPath}:`, error);
    return null;
  }
}