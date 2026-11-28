export interface TreeNodeSummary {
  readonly id: string;
  readonly kind: string;
  readonly summary: string;
}

export interface TreeDecorator {
  /** 返回追加到图形行末尾的标签，无标签时返回 undefined。 */
  decorate(node: TreeNodeSummary): string | undefined;
}
