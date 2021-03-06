let S3 = require('aws-sdk/clients/s3')

class S3Driver {

  constructor (config) {
    this.s3 = new S3(config.awsCredentials)
    this.bucket = config.bucket
    this.logger = config.logger
    this.readURL = config.readURL

    this.createIfNeeded()
  }

  static isPathValid(path){
    // for now, only disallow double dots.
    return (path.indexOf("..") === -1)
  }

  getReadURLPrefix () {
    if (this.readURL) {
      return `https://${this.readURL}/`
    }
    return `https://${this.bucket}.s3.amazonaws.com/`
  }

  createIfNeeded () {
    this.s3.headBucket( {Bucket: this.bucket}, (error, data) => {
      if (error && error.code === "NotFound") { // try to create
        let params = {
          Bucket: this.bucket,
          ACL: "public-read",
        }
        this.s3.createBucket(params, (error, data) => {
          if (error) {
            this.logger.error(`failed to initialize s3 bucket: ${error}`)
            process.exit()
          }else{
            this.logger.info(`initialized s3 bucket: ${this.bucket}`)
          }
        })
      } else if (error) {
        this.logger.error(`failed to connect to s3 bucket: ${error}`)
        process.exit()
      } else {
        this.logger.info(`connected to s3 bucket: ${this.bucket}`)
      }
    })
  }

  performWrite (args) {
    let s3key = `${args.storageToplevel}/${args.path}`
    let s3params = {
      Bucket: this.bucket,
      Key: s3key,
      Body: args.stream,
      ContentType: args.contentType,
      ACL: "public-read"
    }

    if (!S3Driver.isPathValid(args.path)){
      logger.error(`failed to store ${s3key} in bucket ${this.bucket}, invalid path`)
      args.sr.callback( {"message": "Invalid path"}, null, 402)
      return
    }

    // Upload stream to s3
    this.s3.upload(s3params, (err, data) => {
      if (err) {
        this.logger.error(`failed to store ${s3key} in bucket ${this.bucket}`)
        args.sr.callback(err, data, 500)
        return
      }
      let publicURL = `${this.getReadURLPrefix()}${s3key}`
      this.logger.info(`storing ${s3key} in bucket ${this.bucket}`)
      args.sr.callback(err, { publicURL }, 202)
    })
  }

}

module.exports = S3Driver
