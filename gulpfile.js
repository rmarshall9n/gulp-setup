/**
 * Include plugins
 */
var gulp            = require('gulp')
    plumber         = require('gulp-plumber')
    rename          = require('gulp-rename')
    cache           = require('gulp-cache')
    sourcemaps      = require('gulp-sourcemaps')
    runSequence     = require('run-sequence')
    del             = require('del')
    // useref          = require('gulp-useref')

    // js
    uglify          = require('gulp-uglify')
    bower           = require('main-bower-files')

    // scss
    sass            = require('gulp-sass')
    sassLint        = require('gulp-sass-lint')
    postcss         = require('gulp-postcss')
    cssnano         = require('cssnano')
    autoprefixer    = require('autoprefixer')
    mqpacker        = require('css-mqpacker')

    // images
    imagemin        = require('gulp-imagemin')

    // browser sync
    browserSync     = require('browser-sync')
    reload          = browserSync.reload
;

var config = {
    url: 'foo-client.dev',
    paths: {
        app: 'app',

        srcScripts: 'assets/js',
        srcStyles: 'assets/scss',
        srcImages: 'assets/images',
        srcFonts: 'assets/fonts',

        destScripts: 'app/js',
        destStyles: 'app/css',
        destImages: 'app/images',
        destFonts: 'app/fonts',
    },
};

/**
 * Html
 */
gulp.task('html:reload', function(){
    gulp.src(config.paths.app+'/**/*.html')
    .pipe(reload({stream:true}));
});


/**
 * Scripts
 */
gulp.task('js:compile', function(){

    gulp.src([config.paths.srcScripts+'/**/*.js', '!'+config.paths.srcScripts+'/**/*.min.js'])
        .pipe(plumber())
        .pipe(rename({suffix: '.min'}))
        .pipe(sourcemaps.init())
        .pipe(uglify())
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(config.paths.destScripts))
        .pipe(reload({stream:true}));
});

/** Copy bower assets across to dist */
gulp.task('js:copy-bower', function(){

    gulp.src(
        bower({
            filter: '**/*.js'
        }))
        .pipe(gulp.dest(config.paths.destScripts));

    gulp.src(
        bower({
            filter: '**/*.css'
        }))
        .pipe(gulp.dest(config.paths.destStyles));

    gulp.src(
        bower({
            filter: '**/*.+(eot|svg|ttf|woff|woff2)'
        }))
        .pipe(gulp.dest(config.paths.destFonts));
});


/**
 * SASS
 */
/** Run through linter */
gulp.task('sass:lint', function() {
    gulp.src([
        config.paths.srcStyles+'/**/*.scss',
        '!'+config.paths.srcStyles+'/base/_normalize.scss',
        '!'+config.paths.srcStyles+'/utilities/animate/**/*.*',
        '!'+config.paths.srcStyles+'/base/_sprites.scss'
    ])
    .pipe(sassLint())
    .pipe(sassLint.format())
    .pipe(sassLint.failOnError());
});

/** Compile down to css */
gulp.task('sass:compile', function(){
    return gulp.src(config.paths.srcStyles+'/**/*.scss')
        .pipe(plumber())
        .pipe(rename({suffix: '.min'}))
        .pipe(sourcemaps.init())
        .pipe(sass({
            outputStyle: 'expanded',
            errLogToConsole: true,
        }))
        .pipe(postcss([
           autoprefixer({ browsers: ['last 2 version'] }),
           mqpacker({ sort: true }),
           cssnano({save: true}),
        ]))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(config.paths.destStyles))
        .pipe(reload({stream:true}));
});


/**
 * Images
 */
gulp.task('images:optimise', function(){
    return gulp.src(config.paths.srcImages+'/**/*.+(png|jpg|gif|svg)')
        .pipe(
            cache(
                imagemin([
                    imagemin.gifsicle({interlaced: true}),
                    imagemin.jpegtran({progressive: true}),
                    imagemin.optipng({optimizationLevel: 5}),
                    imagemin.svgo({
                        plugins: [
                            {removeViewBox: true},
                            {cleanupIDs: false}
                        ]
                    })
                ])
            )
        )
        .pipe(gulp.dest(config.paths.destImages))
        .pipe(reload({stream: true}))
});


/**
 * Fonts
 */
gulp.task('fonts:copy', function() {
    return gulp.src(config.paths.srcFonts+'/**/*')
        .pipe(gulp.dest(config.paths.destFonts))
});


/**
 * Browser Sync
 */
gulp.task('browser-sync', function(){
    browserSync({
        server: {
            baseDir: config.paths.app,
            proxy: config.url
        }
    });
});



// gulp.task('useref', function(){
//   return gulp.src(config.paths.app+'/*.html')
//     .pipe(useref())
//     //.pipe(gulpIf('*.js', uglify()))
//     // Minifies only if it's a CSS file
//     // .pipe(gulpIf('*.css', cssnano()))
//     .pipe(gulp.dest('dist'))
// });


/**
 * WATCHER
 */
gulp.task('watch', function(){
    gulp.watch(config.paths.app+'/**/*.html', ['html:reload']);
    gulp.watch(config.paths.srcScripts+'/**/*.js', ['js:compile']);
    gulp.watch(config.paths.srcStyles+'/**/*.scss', ['sass:compile']);
    gulp.watch(config.paths.srcImages+'/**/*', ['images:optimise']);
    gulp.watch(config.paths.fonts+'/**/*', ['fonts']);
});


/**
 * build
 */
gulp.task('build:all', ['js:compile', 'js:copy-bower', 'sass:compile', 'images:optimise', 'fonts:copy'])

gulp.task('build:serve', ['browser-sync', 'watch'])

gulp.task('build:clean', function(){
    del([
        config.paths.destScripts+'/*',
        config.paths.destStyles+'/*',
        config.paths.destFonts+'/*',
    ]);
});

gulp.task('build:clear-cache', function(){
    del(config.paths.destImages+'/**/*');
    return cache.clearAll();
});

/**
 * Default task
 */
gulp.task('default', function(callback) {
  runSequence('build:clean', 'build:all', 'build:serve', callback);
});