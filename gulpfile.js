var gulp         = require('gulp'),
    $            = require('gulp-load-plugins')();

gulp.task('lint', function () {
    return gulp.src([
        'api/**/*.js',
        'modules/**/*.js',
        'app.js',
        'app_bot.js',
        'command.js',
        'module.js',
    ])
        .pipe($.jshint())
        .pipe($.jshint.reporter(require('jshint-stylish')))
        .pipe($.jshint.reporter('fail'))
        .pipe($.jscs());
});