#FROM node:alpine

#COPY --from=hashicorp/terraform:light /bin/terraform /bin/

#WORKDIR /app

#COPY package.json index.js ./

#RUN npm install

#EXPOSE 3000

#USER node

#CMD ["node","index.js"]
FROM node:10.12.0-alpine as ship

# Copyright (c) Alex Ellis 2019. All rights reserved.
# Licensed under the MIT license. See LICENSE file in the project root for full license information.

RUN addgroup -S app && adduser -S -g app app

RUN apk --no-cache add ca-certificates
COPY --from=hashicorp/terraform:light /bin/terraform /bin/
WORKDIR /root/

# Turn down the verbosity to default level.
ENV NPM_CONFIG_LOGLEVEL warn
 
RUN mkdir -p /home/app

# Wrapper/boot-strapper
WORKDIR /home/app
COPY package.json ./

# This ordering means the npm installation is cached for the outer function handler.
RUN npm i

# Copy outer function handler
COPY index.js ./

# Set correct permissions to use non root user
WORKDIR /home/app/

# chmod for tmp is for a buildkit issue (@alexellis)
RUN chown app:app -R /home/app \
    && chmod 777 /tmp

USER app

RUN touch /tmp/.lock

CMD ["node", "index.js"]
