// // Imports the Google Cloud client library.
// const { Storage } = require('@google-cloud/storage')

// // Instantiates a client. If you don't specify credentials when constructing
// // the client, the client library will look for credentials in the
// // environment.
// const storage = new Storage()
// // Makes an authenticated API request.
// async function listBuckets() {
//   try {
//     const results = await storage.getBuckets()

//     const [buckets] = results

//     console.log('Buckets:')
//     buckets.forEach((bucket) => {
//       console.log(bucket.name)
//     })

//     try {
//       await storage
//         .bucket('template_repository')
//         .file('terraform/aws/dev/main.tf')
//         .download({ destination: 'main.tf' })
//       console.log(
//         `gs://template_repository/terraform/aws/dev/main.tf downloaded to main.tf.`,
//       )
//     } catch (error) {
//       console.error(error)
//     }
//   } catch (err) {
//     console.error('ERROR:', err)
//   }
// }
// listBuckets()

const fs = require('fs')
fs.readFile(__dirname + '/ip_address', 'utf8', (err, data) => {
  if (err) {
    return console.log(err)
  }
  responseData = JSON.parse(data.toString())
  console.log('data: ', responseData.backend.value)
})
