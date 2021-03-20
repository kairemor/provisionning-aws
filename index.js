const express = require('express')
const cors = require('cors')
const fs = require('fs')
const util = require('util')
const process = require('process')
// const exec = util.promisify(require('child_process').exec)
const PORT = process.env.PORT || 4000
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
      'modules/springboot/dev/init-spring-boot.sh',
    ],
    prod: [
      'terraform/aws/prod/frontend.tf',
      'terraform/aws/prod/backend.tf',
      'terraform/aws/prod/variables.tf',
      'terraform/aws/prod/launch-conf.tf',
      'terraform/aws/prod/main.tf',
      'terraform/aws/prod/outputs.tf',
      'terraform/aws/prod/terraform.tfvars',
      'modules/angular/prod/deploy_angular.tpl',
      'modules/springboot/prod/deploy_spring.tpl',
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
      'terdeploy_spring.tplraform/aws/prod/terraform.tfvars',
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

    let instance = {
      number_of_vm: numberOfVm,
      vm_group_name: instanceGroupName,
      cpu: cpu,
      memory: memory,
      disk_size_gb: disk,
      image_project: osType,
      image_family: osImage,
      application_type: applicationType,
    }

    const variable = {
      backend_bash_path: 'init-nodejs.sh',
      frontend_bash_path: 'init-react,sh',
      database_bash_path: 'init-mongodb.sh',
    }

    let resourceName = instanceGroupName.replace(/-/g, '_').trim().toLowerCase()

    // Imports the Google Cloud client library
    const { Storage } = require('@google-cloud/storage')

    // Creates a client
    const storage = new Storage()

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
    })

    // Create variable file
    fs.writeFileSync(
      `./terraform/${resourceName}.auto.tfvars.json`,
      JSON.stringify(variable),
    )
    console.log(`Created file ${resourceName}.auto.tfvars.json from request...`)
    let responseData
    // // Execute Terraform
    setTimeout(async () => {
      exec(
        `make terraform-apply RESOURCE_NAME=${resourceName}`,
        (error, out, err) => {
          if (error) {
            console.log(`error: ${error.message}`)
            return
          }
          console.log(out)
          console.log(err)
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
                  fs.readdir('./terraform/', (err, files) => {
                    if (err) {
                      console.error(err)
                      return
                    }

                    let timestamp = Date.now()

                    // Import and remove each file one by one
                    // files.forEach((file) => {
                    //   if (!fs.statSync(`terraform/${file}`).isDirectory()) {
                    //     let destination = `${instanceGroupName}-${projectName
                    //       .replace(/ /g, '-')
                    //       .trim()
                    //       .toLowerCase()}-${timestamp}/${file}`
                    //     storage
                    //       .bucket(templateRegistry)
                    //       .upload(`terraform/${file}`, { destination })
                    //       .then((uploadedFile) => {
                    //         console.log(`${file} uploaded successfuly`)
                    //         // exec(`rm -rf terraform/${file}`)
                    //       })
                    //       .catch(console.error)
                    //   }
                    // })
                    // await exec(`rm -rf terraform/.terraform`)
                  })
                  return res.send(responseData)
                },
              )
            },
          )
        },
      )
    }, 3000)
  } catch (error) {
    console.error(error.message)
  }
})

app.listen(PORT, () => {
  console.log('Listenning on port: ', PORT)
})
