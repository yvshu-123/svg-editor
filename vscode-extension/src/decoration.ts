import * as vscode from 'vscode';

export class SvgDecorationProvider implements vscode.FileDecorationProvider {
  async provideFileDecoration(uri: vscode.Uri): Promise<vscode.FileDecoration | undefined> {
    if (!uri.path.toLowerCase().endsWith('.svg')) return undefined;

    try {
      const { type } = await vscode.workspace.fs.stat(uri);
      if (type & vscode.FileType.File) {
        return { badge: '[]', tooltip: 'SVG 文件' };
      }
    } catch {
      // Explorer may request a decoration while a file is being renamed or deleted.
    }
    return undefined;
  }
}
