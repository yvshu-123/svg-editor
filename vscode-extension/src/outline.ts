import { DOMParser, type Element } from '@xmldom/xmldom';

export interface OutlineElement {
  name: string;
  start: number;
  openingEnd: number;
  end: number;
  children: OutlineElement[];
}

// xmldom locates the start of an element. Find the end of its opening tag,
// allowing quoted attribute values such as title="a > b".
function openingTagEnd(source: string, start: number): number {
  let quote = '';
  for (let i = start + 1; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === quote) quote = '';
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return i + 1;
    }
  }
  throw new Error('Incomplete opening tag');
}

// After the last element child, only text, comments, CDATA or processing
// instructions can precede the closing tag. Any of them may contain "</".
function closingTagEnd(source: string, from: number): number {
  let pos = source.indexOf('<', from);
  while (pos !== -1) {
    if (source.startsWith('</', pos)) {
      const end = source.indexOf('>', pos + 2);
      if (end !== -1) return end + 1;
      break;
    }
    let terminator: string;
    if (source.startsWith('<!--', pos)) terminator = '-->';
    else if (source.startsWith('<![CDATA[', pos)) terminator = ']]>';
    else if (source.startsWith('<?', pos)) terminator = '?>';
    else break;
    const end = source.indexOf(terminator, pos + 2);
    if (end === -1) break;
    pos = source.indexOf('<', end + terminator.length);
  }
  throw new Error('Missing closing tag');
}

export function parseOutline(source: string): OutlineElement[] {
  if (!source || source.length > 2 * 1024 * 1024) return [];
  try {
    const parser = new DOMParser({
      // Preserve the original UTF-16 offsets used by VS Code, including CRLF.
      normalizeLineEndings: text => text,
      onError: (_level, message) => { throw new Error(message); },
    });
    const root = parser.parseFromString(source, 'image/svg+xml').documentElement;
    if (!root || root.localName !== 'svg') return [];

    const lineStarts = [0];
    for (const match of source.matchAll(/\r\n|\r|\n/g)) {
      lineStarts.push(match.index + match[0].length);
    }

    function visit(element: Element): OutlineElement {
      if (element.localName === 'parsererror') throw new Error('Invalid XML');
      const start = lineStarts[element.lineNumber! - 1] + element.columnNumber! - 1;
      const openingEnd = openingTagEnd(source, start);
      const children: OutlineElement[] = [];
      for (let child = element.firstChild; child; child = child.nextSibling) {
        if (child.nodeType === 1) children.push(visit(child as Element));
      }
      const end = source[openingEnd - 2] === '/'
        ? openingEnd
        : closingTagEnd(source, children.at(-1)?.end ?? openingEnd);
      const id = element.getAttribute('id');
      const name = id ? element.tagName + '#' + id : element.tagName;
      return { name, start, openingEnd, end, children };
    }
    return [visit(root)];
  } catch {
    // Incomplete XML is a normal intermediate state while typing.
    return [];
  }
}
