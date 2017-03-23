module.exports = function (grunt) {
    grunt.initConfig({
     uglify: {
      
      build: {
        files: [{
            expand: true,
            src: '*.js',
            dest: 'build/',
        }]
      }
  }


});

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default', [  'uglify' ]);
};

