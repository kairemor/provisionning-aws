const express = require('express')
const cors = require('cors')
const fs = require('fs')
const process = require('process')
const PORT = process.env.http_port || 3000
const { exec } = require('child_process')
const app = express()

const templateRepository = 'template_repository'
const templateRegistry = 'template_registry'

const files = {
  sbam: {
    dev: [
      'terraform/aws/dev/main.tf',
      'terraform/aws/dev/terraform.tfvars',
      'terraform/aws/dev/outputs.tf',
      'terraform/aws/dev/variables.tf',
      'modules/mysql/init-mysql.sh',
      'modules/angular/dev/init-angular.sh',
      'modules/springboot/dev/init-springboot.sh',
    ],
    prod: [
      'terraform/aws/prod/frontend.tf',
      'terraform/aws/prod/backend.tf',
      'terraform/aws/prod/variables.tf',
      'terraform/aws/prod/launch-conf.tf',
      'terraform/aws/prod/main.tf',
      'terraform/aws/prod/outputs.tf',
      'terraform/aws/prod/terraform.tfvars',
      'modules/angular/prod/init-angular.tpl',
      'modules/springboot/prod/init-springboot.tpl',
    ],
  },
  mern: {
    dev: [
      'terraform/aws/dev/main.tf',
      'terraform/aws/dev/terraform.tfvars',
      'terraform/aws/dev/outputs.tf',
      'terraform/aws/dev/variables.tf',
      'modules/mongodb/init-mongodb.sh',
      'modules/react/dev/init-react.sh',
      'modules/nodejs/dev/init-nodejs.sh',
    ],
    prod: [
      'terraform/aws/prod/frontend.tf',
      'terraform/aws/prod/backend.tf',
      'terraform/aws/prod/variables.tf',
      'terraform/aws/prod/launch-conf.tf',
      'terraform/aws/prod/main.tf',
      'terraform/aws/prod/outputs.tf',
      'terraform/aws/prod/terraform.tfvars',
      'modules/react/prod/init-react.tpl',
      'modules/nodejs/prod/init-nodejs.tpl',
    ],
  },
}

app.use(cors())
app.use(express.json())

app.post('/', async (req, res) => {
  try {
    const {
      projectName,
      projectArchitecture,
      applicationType,
      environment,
      stack,
      SLA,
      dataSize,
      dependencies,
      connectedApplications,
      costEstimation,
      provider,
      instanceGroupName,
      numberOfVm,
      cpu,
      memory,
      disk,
      osType,
      osImage,
    } = req.body
    const {
      frontendOptions: { frontend_project_repository },
    } = req.body
    const {
      backendOptions: {
        backend_db_uri,
        backend_port,
        backend_main_file,
        backend_project_repository,
      },
    } = req.body

    let variable = {
      project_repository: frontend_project_repository,
      front_project_name: parseGithubUrl(frontend_project_repository).repo,
      jar_file_url: backend_project_repository,
      main_file: backend_main_file,
      db_uri: backend_db_uri,
      backend_port,
    }

    let resourceName = instanceGroupName.replace(/-/g, '_').trim().toLowerCase()

    // Imports the Google Cloud client library
    const { Storage } = require('@google-cloud/storage')

    // Creates a client
    const storage = new Storage()

    Promise.all(
      // Download the files
      files[stack][environment].map(async (file) => {
        let destination = `./terraform/${file.substring(
          file.lastIndexOf('/') + 1,
          file.length,
        )}`
        try {
          await storage
            .bucket(templateRepository)
            .file(file)
            .download({ destination })
          console.log(
            `gs://${templateRepository}/${file} downloaded to ${destination}.`,
          )
        } catch (error) {
          console.error(error)
        }
      }),
    ).then(() => {
      // Create variable file
      if (stack === 'mern') {
        variable.backend_bash_path = 'init-nodejs.tpl'
        variable.frontend_bash_path = 'init-react.tpl'
        variable.back_project_name = parseGithubUrl(
          backend_project_repository,
        ).repo
        if (environment === 'dev') {
          variable.database_bash_path = 'init-mongodb.sh'
        }
      }
      fs.writeFileSync(
        `./terraform/${resourceName}.auto.tfvars.json`,
        JSON.stringify(variable),
      )
      console.log(
        `Created file ${resourceName}.auto.tfvars.json from request...`,
      )
      let responseData
      // Execute Terraform
      exec(
        `make terraform-apply RESOURCE_NAME=${resourceName}`,
        (error) => {
          if (error) {
            console.log(`error: ${error.message}`)
            return
          }
          process.chdir('terraform')
          // Printing current directory
          console.log('current working directory: ' + process.cwd())
          exec(
            `terraform show -json ${resourceName}.tfstate | jq -r '.values.outputs' > ip_address`,
            () => {
              fs.readFile(
                __dirname + '/terraform/ip_address',
                'utf8',
                (err, data) => {
                  if (err) {
                    return console.log(err)
                  }
                  responseData = JSON.parse(data.toString())
                  process.chdir('..')
                  // Export the generated terraform directory to template registry
                  fs.readdir('./terraform/', (error$, files$) => {
                    if (err) {
                      console.error(error$)
                      return
                    }

                    let timestamp = Date.now()

                    // Import and remove each file one by one
                    files.forEach((file) => {
                      if (!fs.statSync(`terraform/${file}`).isDirectory()) {
                        let destination = `${instanceGroupName}-${projectName
                          .replace(/ /g, '-')
                          .trim()
                          .toLowerCase()}-${timestamp}/${file}`
                        storage
                          .bucket(templateRegistry)
                          .upload(`terraform/${file}`, { destination })
                          .then((uploadedFile) => {
                            console.log(`${file} uploaded successfully`)
                            // exec(`rm -rf terraform/${file}`)
                          })
                          .catch(console.error)
                      }
                    })
                    exec(`rm -rf terraform/.terraform`)
                  })
                  return res.send(responseData)
                },
              )
            },
          )
        },
      )
    })
  } catch (error) {
    console.error(error.message)
  }
})

const parseGithubUrl = (url) => {
  var matches = url.match(/.*?github.com\/([\w]+)\/([\w-]+)/)
  if (matches && matches.length == 3) {
    return {
      owner: matches[1],
      repo: matches[2],
    }
  } else {
    throw new Error("Bad URL")
  }
}



app.listen(PORT, () => {
  console.log('Listening on port: ', PORT)
})
