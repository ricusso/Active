const fs = require('fs');
const path = require('path');
const prettier = require('prettier');
const { glob } = require('glob');

async function formatFiles() {
  const files = await glob('**/*.{ejs,js,css}', {
    ignore: ['node_modules/**', '.git/**'],
    absolute: true,
  });

  for (const filePath of files) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const ext = path.extname(filePath);

      if (ext === '.ejs') {
        // 1. Remove EJS comments
        content = content.replace(/<%#[\s\S]*?%>/g, '');
        // 2. Remove HTML comments
        content = content.replace(/<!--[\s\S]*?-->/g, '');

        // Prettier with prettier-plugin-ejs should handle the rest
        try {
          const ejsPlugin = require('prettier-plugin-ejs');
          const formatted = await prettier.format(content, {
            parser: 'ejs',
            plugins: [ejsPlugin],
            printWidth: 120,
            tabWidth: 2,
            singleQuote: true,
          });
          fs.writeFileSync(filePath, formatted);
        } catch (e) {
          console.error(`Error formatting ${filePath}:`, e.message);
          // Fallback to html parser if ejs parser fails
          try {
            const formatted = await prettier.format(content, {
              parser: 'html',
              printWidth: 120,
              tabWidth: 2,
            });
            fs.writeFileSync(filePath, formatted);
          } catch (e2) {
            console.error(`Error formatting ${filePath} as HTML:`, e2.message);
          }
        }
      } else if (ext === '.js') {
        const formatted = await prettier.format(content, {
          parser: 'babel',
          printWidth: 120,
          tabWidth: 2,
          singleQuote: true,
          trailingComma: 'es5',
        });
        fs.writeFileSync(filePath, formatted);
      } else if (ext === '.css') {
        const formatted = await prettier.format(content, {
          parser: 'css',
          printWidth: 120,
          tabWidth: 2,
        });
        fs.writeFileSync(filePath, formatted);
      }
    } catch (err) {
      console.error(`Failed to process ${filePath}:`, err);
    }
  }
}

formatFiles().then(() => console.log('Formatting complete!'));
