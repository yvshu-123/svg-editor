import * as vscode from 'vscode';
import { parseOutline, type OutlineElement } from './outline';

export class SvgSymbolProvider implements vscode.DocumentSymbolProvider {
  provideDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
    function toSymbol(element: OutlineElement): vscode.DocumentSymbol {
      const start = document.positionAt(element.start);
      const symbol = new vscode.DocumentSymbol(
        element.name, '', vscode.SymbolKind.Object,
        new vscode.Range(start, document.positionAt(element.end)),
        new vscode.Range(start, document.positionAt(element.openingEnd)),
      );
      symbol.children = element.children.map(toSymbol);
      return symbol;
    }
    return parseOutline(document.getText()).map(toSymbol);
  }
}
