const fs = require('fs');
const path = require('path');

function stripJSComments(code) {
  return code.replace(
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|(?:\/\*[\s\S]*?\*\/))|(\/\/.*)/g,
    (match, g1, g2) => {
      if (g1) {
        if (g1.startsWith('/*')) return '';
        return g1;
      }
      return '';
    }
  );
}

function stripEJSComments(code) {
  let cleaned = code.replace(/<%#[\s\S]*?%>/g, '');
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  cleaned = cleaned.replace(/(<%-?=?)([\s\S]*?)(%>)/g, (match, open, content, close) => {
    return open + stripJSComments(content) + close;
  });

  cleaned = cleaned.replace(/(<script[\s\S]*?>)([\s\S]*?)(<\/script>)/gi, (match, open, content, close) => {
    return open + stripJSComments(content) + close;
  });

  cleaned = cleaned.replace(/(<style[\s\S]*?>)([\s\S]*?)(<\/style>)/gi, (match, open, content, close) => {
    return open + stripJSComments(content) + close;
  });

  return cleaned;
}

function processFile(filePath) {
  const ext = path.extname(filePath);
  if (filePath.endsWith('clean-code.js')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  if (ext === '.js') {
    content = stripJSComments(content);
  } else if (ext === '.ejs') {
    content = stripEJSComments(content);
  }

  content = content
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n');
  content = content.replace(/\n\s*\n\s*\n+/g, '\n\n');
  content = content.trim() + '\n';

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Processed: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        walkDir(filePath);
      }
    } else {
      const ext = path.extname(file);
      if (ext === '.js' || ext === '.ejs') {
        processFile(filePath);
      }
    }
  }
}

const targetDir = process.cwd();
console.log(`Starting comment removal in ${targetDir}...`);
walkDir(targetDir);
console.log('Finished processing all files.');
