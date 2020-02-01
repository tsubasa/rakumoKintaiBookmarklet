/* eslint-disable no-console, @typescript-eslint/no-var-requires */

const fs = require('fs');

const gulp = require('gulp');
const insert = require('gulp-insert');
const rename = require('gulp-rename');
const replace = require('gulp-replace');
const terser = require('gulp-terser');

const tmpTsPath = './src/tmp.ts';
const tmpJsPath = './build/tmp.js';

gulp.task('build', async () => {
  return new Promise(resolve => {
    gulp
      .src(tmpJsPath)
      .pipe(replace(/export\s/g, ''))
      .pipe(
        terser({
          compress: true,
          toplevel: true,
          mangle: {
            properties: {
              regex: /^_/
            }
          }
        })
      )
      .pipe(replace(/%60/g, '% 60')) // Chromeでブックマークレットを登録するときに ` に変換されるための対策
      .pipe(insert.wrap('javascript:(()=>{', '})();')) // eslint-disable-line no-script-url
      .pipe(rename('bookmarklet.js'))
      .pipe(gulp.dest('build'))
      .on('end', () => {
        [tmpTsPath, 'build/classes.js', 'build/index.js', 'build/tmp.js'].forEach(file =>
          fs.unlink(file, err => {
            if (err) throw err;
          })
        );
        resolve();
      });
  });
});

gulp.task('setup', async () => {
  const readFile = filePath => {
    return new Promise(resolve => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) throw err;
        resolve(data);
      });
    });
  };

  const writeFile = (filePath, data) => {
    return new Promise(resolve => {
      fs.writeFile(filePath, data, err => {
        if (err) throw err;
        resolve();
      });
    });
  };

  let data = await readFile('./src/classes.ts');
  data += await readFile('./src/index.ts');
  data = data.replace(/^(import|export|declare)\s/gm, '// $1 ');
  data = data.replace(/^interface MyWindow extends /gm, 'interface ');
  await writeFile(tmpTsPath, data);
});
