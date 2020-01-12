/* eslint-disable no-console, @typescript-eslint/no-var-requires */

const fs = require('fs');

const gulp = require('gulp');
const insert = require('gulp-insert');
const rename = require('gulp-rename');
const replace = require('gulp-replace');
const terser = require('gulp-terser');

const tmpJsPath = './build/index.js';

gulp.task('build', async () => {
  return new Promise(resolve => {
    gulp
      .src(tmpJsPath)
      .pipe(replace(/export\s/g, ''))
      .pipe(
        terser({
          module: true
        })
      )
      .pipe(replace(/%60/g, '% 60')) // Chromeでブックマークレットを登録するときに ` に変換されるための対策
      .pipe(insert.wrap('javascript:(()=>{', '})();')) // eslint-disable-line no-script-url
      .pipe(rename('bookmarklet.js'))
      .pipe(gulp.dest('build'))
      .on('end', () => {
        fs.unlink(tmpJsPath, err => {
          if (err && err.code === 'ENOENT') {
            console.info("File doesn't exist, won't remove it.");
          } else if (err) {
            console.error('Error occurred while trying to remove file');
          }
        });
        resolve();
      });
  });
});
