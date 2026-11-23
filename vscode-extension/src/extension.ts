import * as vscode from 'vscode';
import { SvgDecorationProvider } from './decoration';
import { SvgSymbolProvider } from './symbols';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(new SvgDecorationProvider()),
    vscode.languages.registerDocumentSymbolProvider(
      { pattern: '**/*.[sS][vV][gG]' },
      new SvgSymbolProvider(),
    ),
  );
}
