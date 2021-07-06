FROM node:alpine

COPY --from=hashicorp/terraform:light /bin/terraform /bin/

WORKDIR /app

COPY package.json index.js ./

RUN npm install

#EXPOSE 3000

USER node

CMD ["node","index.js"]
