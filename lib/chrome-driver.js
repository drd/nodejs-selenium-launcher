var fs = require('fs')
  , path = require('path')
  , request = require('request')
  , hashFile = require('hash_file')
  , Zip = require('adm-zip')

var platform
  , arch = '32'
  , version = '2.2'

switch(process.platform){
  case 'darwin':
    platform = 'mac'
    break
  case 'win32':
    platform = 'win'
    break
  case 'linux':
    platform = 'linux'
    arch = process.arch === 'x64' ? '64' : '32'
    break
  default:
    platform = false
    break
}

var expectedSha = {
  'linux32': '9f6bad3a1004cd983731a7b68c0a03f9c6b45696',
  'linux64': 'c737452bacba963a36d32b3bc0fdb87cb6cb25a6',
  'mac32': '8328d845afb2e5e124f38a2d72dbfc659c0936b0',
  'win32': '7723028c78074144065d07566d77a4c2f19c390a'
}

var filename = 'chromedriver_'+ platform + arch +'_'+ version +'.zip'
  , url = 'https://chromedriver.googlecode.com/files/'+ filename
  , outfile = path.join(path.dirname(__filename), '..', 'tmp', filename)
  , driver = path.join(path.dirname(__filename), '..', 'tmp', 'chromedriver')

module.exports = function(options, cb){
  if( !cb && typeof options === 'function' ){
    cb = options
    options = {}
  }

  if( !options.chrome ){
    return cb()
  }

  if( !platform ){
    return cb('No Chromedriver support for platform: '+ process.platform)
  }

  function download() {
    console.log('Downloading Chromedriver '+ version)
    var i = 0
    request({ url: url })
      .on('end', function() {
        process.stdout.write('\n')
        extractFile();
      })
      .on('data', function() {
        if (i == 8000) {
          process.stdout.write('\n')
          i = 0
        }
        if (i % 100 === 0) process.stdout.write('.')
        i++
      })
      .pipe(fs.createWriteStream(outfile))
  }

  var retry = 5;

  function extractFile(){
    try {
      var zip = new Zip(outfile)
      zip.extractAllTo(path.join(path.dirname(__filename), '..', 'tmp'))
      fs.chmod(driver, '0111', function(err){
        if(err) return cb(err)
        cb(null, driver)
      })
    } catch(err) {
      if( --retry ){
        setTimeout(extractFile, 100);
      } else {
        fs.unlink(outfile, function(){
          throw new Error(err);
        })
      }
    }
  }

  fs.stat(outfile, function(er, stat) {
    if (er) return download()
    hashFile(outfile, 'sha1', function(er, actualSha) {
      if (er) return cb(er)
      if (actualSha != expectedSha[platform + arch]) return download()
      cb(null, driver)
    })
  })

};
